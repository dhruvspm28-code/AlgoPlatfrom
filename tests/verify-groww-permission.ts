import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function loadEnv() {
  const envPath = path.resolve(".env");
  if (!fs.existsSync(envPath)) {
    console.error(".env file not found");
    return { apiKey: "", apiSecret: "" };
  }
  const content = fs.readFileSync(envPath, "utf8");
  let apiKey = "";
  let apiSecret = "";
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("GROWW_API_KEY=")) {
      apiKey = trimmed
        .slice("GROWW_API_KEY=".length)
        .replace(/^["']|["']$/g, "")
        .trim();
    }
    if (trimmed.startsWith("GROWW_API_SECRET=")) {
      apiSecret = trimmed
        .slice("GROWW_API_SECRET=".length)
        .replace(/^["']|["']$/g, "")
        .trim();
    }
  }
  return { apiKey, apiSecret };
}

// CRC16-CCITT / XMODEM / LE calculation for NKeys
function crc16LE(data: Buffer): number {
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    const b = data[i];
    for (let j = 0; j < 8; j++) {
      const bit = ((b >> (7 - j)) & 1) === 1;
      const c15 = ((crc >> 15) & 1) === 1;
      crc = (crc << 1) & 0xffff;
      if (c15 !== bit) {
        crc ^= 0x1021;
      }
    }
  }
  return crc;
}

// Base32 RFC 4648 encoding without padding
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

async function verifyPermissions() {
  const { apiKey, apiSecret } = loadEnv();
  console.log("1. Loaded credentials from .env:");
  console.log(
    `   API Key length: ${apiKey ? apiKey.length : 0} chars (starts with ${apiKey ? apiKey.slice(0, 10) : "N/A"}...)`,
  );
  console.log(
    `   API Secret length: ${apiSecret ? apiSecret.length : 0} chars (starts with ${apiSecret ? apiSecret.slice(0, 4) : "N/A"}...)`,
  );

  if (!apiKey || !apiSecret) {
    console.error("Missing GROWW_API_KEY or GROWW_API_SECRET");
    return;
  }

  // 2. Test Token Exchange
  const timestamp = Math.floor(Date.now() / 1000);
  const checksum = crypto
    .createHash("sha256")
    .update(apiSecret + timestamp)
    .digest("hex");

  console.log("\n2. Testing Token Exchange (POST https://api.groww.in/v1/token/api/access)...");
  const tokenRes = await fetch("https://api.groww.in/v1/token/api/access", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "x-client-id": "growwapi",
      "x-client-platform": "growwapi-web-client",
      "x-client-platform-version": "1.5.0",
      "x-api-version": "1.0",
    },
    body: JSON.stringify({
      key_type: "approval",
      checksum,
      timestamp,
    }),
  });

  console.log(`   HTTP Status: ${tokenRes.status} ${tokenRes.statusText}`);
  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenData.token) {
    console.error("   Token exchange failed:", JSON.stringify(tokenData));
    return;
  }
  console.log("   Session Token acquired successfully!");
  const sessionToken = tokenData.token;

  // 3. Inspect User Profile / Account Details
  console.log("\n3. Inspecting User Profile & Developer Permissions...");
  for (const endpoint of ["/v1/user/profile", "/v1/user/details", "/v1/user/holdings"]) {
    try {
      const res = await fetch(`https://api.groww.in${endpoint}`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "x-client-id": "growwapi",
          "x-api-version": "1.0",
        },
      });
      const data = await res.json().catch(() => ({}));
      console.log(
        `   GET ${endpoint} -> Status ${res.status}:`,
        JSON.stringify(data).slice(0, 160),
      );
    } catch (e) {
      console.log(`   GET ${endpoint} error:`, (e as Error).message);
    }
  }

  // 4. Test REST Live Data LTP Endpoint
  console.log("\n4. Testing REST Live Market Data endpoint (GET /v1/live-data/ltp)...");
  const restRes = await fetch(
    "https://api.groww.in/v1/live-data/ltp?segment=CASH&exchange_symbols=2885",
    {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "x-client-id": "growwapi",
        "x-api-version": "1.0",
      },
    },
  );
  console.log(`   HTTP Status: ${restRes.status} ${restRes.statusText}`);
  const restData = await restRes.json().catch(() => ({}));
  console.log("   REST LTP Response:", JSON.stringify(restData));

  // 5. Test Official Socket Token Creation
  console.log(
    "\n5. Testing Official Groww Socket Token Creation (POST /v1/api/apex/v1/socket/token/create/)...",
  );
  // Generate Ed25519 keypair
  const keyPair = crypto.generateKeyPairSync("ed25519");
  // Raw 32-byte public key
  const rawPub = keyPair.publicKey.export({ type: "spki", format: "der" }).subarray(-32);
  // NKeys User prefix: 0xA0 (160)
  const nkeyPayload = Buffer.concat([Buffer.from([0xa0]), rawPub]);
  const crc = crc16LE(nkeyPayload);
  const crcBuf = Buffer.alloc(2);
  crcBuf.writeUInt16LE(crc, 0);
  const nkeysUserKey = base32Encode(Buffer.concat([nkeyPayload, crcBuf]));

  console.log(
    `   Generated NKeys Public Key: ${nkeysUserKey.slice(0, 8)}...${nkeysUserKey.slice(-8)} (Prefix: ${nkeysUserKey[0]}, Len: ${nkeysUserKey.length})`,
  );

  const socketTokenRes = await fetch("https://api.groww.in/v1/api/apex/v1/socket/token/create/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
      "x-client-id": "growwapi",
      "x-api-version": "1.0",
    },
    body: JSON.stringify({
      socketKey: nkeysUserKey,
    }),
  });

  console.log(`   HTTP Status: ${socketTokenRes.status} ${socketTokenRes.statusText}`);
  const socketTokenData = await socketTokenRes.json().catch(() => ({}));
  console.log("   Socket Token Response:", JSON.stringify(socketTokenData).slice(0, 160));

  if (!socketTokenRes.ok || !socketTokenData.token) {
    console.error("   Socket token creation failed!");
    return;
  }

  // 6. Connect to NATS WebSocket
  console.log("\n6. Testing Official Groww WebSocket Feed (wss://socket-api.groww.in)...");
  const ws = new WebSocket("wss://socket-api.groww.in");

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      console.log("   WebSocket connection timeout after 6s.");
      ws.close();
      resolve();
    }, 6000);

    ws.onopen = () => {
      console.log("   WebSocket connected to wss://socket-api.groww.in!");
    };

    ws.onerror = (err) => {
      console.error("   WebSocket error:", err);
    };

    ws.onmessage = async (event) => {
      let msgStr = "";
      if (typeof event.data === "string") {
        msgStr = event.data;
      } else if (event.data instanceof Blob) {
        msgStr = await event.data.text();
      } else if (event.data instanceof ArrayBuffer) {
        msgStr = Buffer.from(event.data).toString("utf8");
      }
      console.log("   <<< WS Received:", msgStr.trim().slice(0, 150));

      if (msgStr.startsWith("INFO ")) {
        try {
          const infoJson = JSON.parse(msgStr.slice(5));
          const nonce = infoJson.nonce;
          console.log("   Extracted NATS Nonce:", nonce);

          // Sign the nonce using Ed25519 private key
          const sig = crypto.sign(null, Buffer.from(nonce, "utf8"), keyPair.privateKey);
          const base64UrlSig = sig.toString("base64url");

          const connectCmd = `CONNECT ${JSON.stringify({
            jwt: socketTokenData.token,
            sig: base64UrlSig,
            verbose: true,
            pedantic: false,
            protocol: 1,
          })}\r\nPING\r\n`;

          console.log("   >>> Sending CONNECT + PING to NATS server...");
          ws.send(connectCmd);
        } catch (e) {
          console.error("   Failed to parse INFO or sign nonce:", (e as Error).message);
        }
      } else if (msgStr.includes("PONG") || msgStr.includes("+OK")) {
        console.log("   Handshake acknowledged! Subscribing to topics:");
        console.log("     - Equity LTP: /ld/eq/nse/price.2885 (Reliance)");
        console.log("     - Index Value: /ld/indices/nse/price.NIFTY (Nifty 50)");

        ws.send("SUB /ld/eq/nse/price.2885 1\r\nSUB /ld/indices/nse/price.NIFTY 2\r\nPING\r\n");
      } else if (msgStr.startsWith("MSG ")) {
        console.log("   *** REAL-TIME MARKET MSG RECEIVED FROM GROWW FEED! ***");
        console.log("   Msg raw header:", msgStr.split("\r\n")[0]);
      } else if (msgStr.startsWith("-ERR")) {
        console.error("   NATS Server Error:", msgStr);
      }
    };

    ws.onclose = (ev) => {
      console.log(`   WebSocket closed (code: ${ev.code}, reason: ${ev.reason || "none"})`);
      clearTimeout(timeout);
      resolve();
    };
  });

  console.log("\n--- Verification Complete ---");
}

verifyPermissions().catch(console.error);
