/**
 * Official Groww Feed API Client for SmartQuant Edge.
 *
 * Implements:
 * 1. GrowwAPI authentication & session token exchange (HMAC SHA-256).
 * 2. GrowwFeed NATS WebSocket streaming (wss://socket-api.groww.in).
 * 3. Ed25519 NKeys user key generation and nonce signature authentication.
 * 4. Topic subscriptions:
 *    - subscribe_ltp: /ld/eq/nse/price.{token}
 *    - subscribe_index_value: /ld/indices/{exchange}/price.{token}
 * 5. Native binary Protobuf decoder for StocksSocketResponseProtoDto:
 *    - StocksLivePriceProto (ltp, open, high, low, close, volume, tsInMillis)
 *    - StocksLiveIndicesProto (value, tsInMillis)
 * 6. High-res callback dispatch with zero fabricated prices.
 */

import crypto from "node:crypto";

export interface GrowwInstrument {
  exchange: "NSE" | "BSE";
  segment: "CASH" | "FNO";
  exchange_token: string;
  trading_symbol?: string;
}

export interface StockLivePrice {
  tsInMillis: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value: number;
  bidQty: number;
  offerQty: number;
  avgPrice: number;
  highPriceRange: number;
  lowPriceRange: number;
  ltp: number;
  openInterest: number;
  lowTradeRange: number;
  highTradeRange: number;
}

export interface StockLiveIndex {
  tsInMillis: number;
  value: number;
}

export interface ParsedSocketResponse {
  symbol?: string;
  segment?: number;
  exchange?: number;
  stockLivePrice?: StockLivePrice;
  stocksLiveIndices?: StockLiveIndex;
}

// ---------------------------------------------------------------------------
// Native Protobuf Decoder for StocksSocketResponseProtoDto
// ---------------------------------------------------------------------------

function readVarint(buf: Uint8Array, offset: number): [number, number] {
  let res = 0;
  let shift = 0;
  let bytesRead = 0;
  while (offset + bytesRead < buf.length) {
    const b = buf[offset + bytesRead++];
    res |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7;
  }
  return [res, bytesRead];
}

function readDouble(buf: Uint8Array, offset: number): number {
  if (offset + 8 > buf.length) return 0;
  const view = new DataView(buf.buffer, buf.byteOffset + offset, 8);
  return view.getFloat64(0, true);
}

export function parseStocksSocketResponseProto(buf: Uint8Array): ParsedSocketResponse {
  const result: ParsedSocketResponse = {};
  let offset = 0;

  while (offset < buf.length) {
    const [tagWire, tagBytes] = readVarint(buf, offset);
    offset += tagBytes;
    const fieldNum = tagWire >>> 3;
    const wireType = tagWire & 0x7;

    if (wireType === 2) {
      // Length-delimited
      const [len, lenBytes] = readVarint(buf, offset);
      offset += lenBytes;
      const fieldData = buf.subarray(offset, offset + len);
      offset += len;

      if (fieldNum === 1) {
        // symbol (string)
        result.symbol = new TextDecoder().decode(fieldData);
      } else if (fieldNum === 4) {
        // stockLivePrice (StocksLivePriceProto)
        result.stockLivePrice = parseLivePriceProto(fieldData);
      } else if (fieldNum === 6) {
        // stocksLiveIndices (StocksLiveIndicesProto)
        result.stocksLiveIndices = parseLiveIndicesProto(fieldData);
      }
    } else if (wireType === 0) {
      // Varint
      const [val, valBytes] = readVarint(buf, offset);
      offset += valBytes;
      if (fieldNum === 2) result.segment = val;
      if (fieldNum === 3) result.exchange = val;
    } else if (wireType === 1) {
      // 64-bit
      offset += 8;
    } else if (wireType === 5) {
      // 32-bit
      offset += 4;
    } else {
      // Unknown wire type; break to avoid infinite loop
      break;
    }
  }

  return result;
}

function parseLivePriceProto(buf: Uint8Array): StockLivePrice {
  const price: StockLivePrice = {
    tsInMillis: 0,
    open: 0,
    high: 0,
    low: 0,
    close: 0,
    volume: 0,
    value: 0,
    bidQty: 0,
    offerQty: 0,
    avgPrice: 0,
    highPriceRange: 0,
    lowPriceRange: 0,
    ltp: 0,
    openInterest: 0,
    lowTradeRange: 0,
    highTradeRange: 0,
  };

  let offset = 0;
  while (offset < buf.length) {
    const [tagWire, tagBytes] = readVarint(buf, offset);
    offset += tagBytes;
    const fieldNum = tagWire >>> 3;
    const wireType = tagWire & 0x7;

    if (wireType === 1) {
      // 64-bit float (double)
      const val = readDouble(buf, offset);
      offset += 8;
      switch (fieldNum) {
        case 1:
          price.tsInMillis = val;
          break;
        case 2:
          price.open = val;
          break;
        case 3:
          price.high = val;
          break;
        case 4:
          price.low = val;
          break;
        case 5:
          price.close = val;
          break;
        case 6:
          price.volume = val;
          break;
        case 7:
          price.value = val;
          break;
        case 8:
          price.bidQty = val;
          break;
        case 9:
          price.offerQty = val;
          break;
        case 10:
          price.avgPrice = val;
          break;
        case 11:
          price.highPriceRange = val;
          break;
        case 12:
          price.lowPriceRange = val;
          break;
        case 13:
          price.ltp = val;
          break;
        case 14:
          price.openInterest = val;
          break;
        case 15:
          price.lowTradeRange = val;
          break;
        case 16:
          price.highTradeRange = val;
          break;
      }
    } else if (wireType === 0) {
      const [, valBytes] = readVarint(buf, offset);
      offset += valBytes;
    } else if (wireType === 2) {
      const [len, lenBytes] = readVarint(buf, offset);
      offset += lenBytes + len;
    } else if (wireType === 5) {
      offset += 4;
    } else {
      break;
    }
  }

  return price;
}

function parseLiveIndicesProto(buf: Uint8Array): StockLiveIndex {
  const index: StockLiveIndex = {
    tsInMillis: 0,
    value: 0,
  };

  let offset = 0;
  while (offset < buf.length) {
    const [tagWire, tagBytes] = readVarint(buf, offset);
    offset += tagBytes;
    const fieldNum = tagWire >>> 3;
    const wireType = tagWire & 0x7;

    if (wireType === 1) {
      const val = readDouble(buf, offset);
      offset += 8;
      if (fieldNum === 1) index.tsInMillis = val;
      if (fieldNum === 2) index.value = val;
    } else if (wireType === 0) {
      const [, valBytes] = readVarint(buf, offset);
      offset += valBytes;
    } else if (wireType === 2) {
      const [len, lenBytes] = readVarint(buf, offset);
      offset += lenBytes + len;
    } else {
      break;
    }
  }

  return index;
}

// ---------------------------------------------------------------------------
// NKeys & Ed25519 Utilities
// ---------------------------------------------------------------------------

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

export function generateNKeysUserKey(rawPublicKey: Buffer): string {
  // Prefix byte for User is 0xA0 (160)
  const nkeyPayload = Buffer.concat([Buffer.from([0xa0]), rawPublicKey]);
  const crc = crc16LE(nkeyPayload);
  const crcBuf = Buffer.alloc(2);
  crcBuf.writeUInt16LE(crc, 0);
  return base32Encode(Buffer.concat([nkeyPayload, crcBuf]));
}

// ---------------------------------------------------------------------------
// GrowwAPI Authentication Client
// ---------------------------------------------------------------------------

export class GrowwAPI {
  public static readonly BASE_URL = "https://api.groww.in/v1";
  public static readonly SOCKET_URL = "wss://socket-api.groww.in";

  public static async getAccessToken(apiKey: string, apiSecret: string): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const checksum = crypto
      .createHash("sha256")
      .update(apiSecret + timestamp)
      .digest("hex");

    const res = await fetch(`${GrowwAPI.BASE_URL}/token/api/access`, {
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

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groww token exchange failed (${res.status}): ${errText.slice(0, 150)}`);
    }

    const data = (await res.json()) as { token?: string };
    if (!data.token) {
      throw new Error("Groww token exchange response missing token");
    }

    return data.token;
  }

  public static async generateSocketToken(
    sessionToken: string,
    nkeyPublicKey: string,
  ): Promise<{ token: string; subscriptionId: string }> {
    const res = await fetch(`${GrowwAPI.BASE_URL}/api/apex/v1/socket/token/create/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
        "x-client-id": "growwapi",
        "x-api-version": "1.0",
      },
      body: JSON.stringify({
        socketKey: nkeyPublicKey,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `Groww socket token creation failed (${res.status}): ${errText.slice(0, 150)}`,
      );
    }

    const data = (await res.json()) as { token?: string; subscriptionId?: string };
    if (!data.token) {
      throw new Error("Groww socket token creation response missing token");
    }

    return {
      token: data.token,
      subscriptionId: data.subscriptionId || "",
    };
  }
}

// ---------------------------------------------------------------------------
// GrowwFeed: NATS WebSocket Streaming Client
// ---------------------------------------------------------------------------

export type OnTickCallback = (topic: string, data: ParsedSocketResponse) => void;
export type OnConnectionChange = (
  status: "CONNECTED" | "DISCONNECTED" | "ERROR",
  detail: string,
) => void;

export class GrowwFeed {
  private ws: WebSocket | null = null;
  private sessionToken: string;
  private socketJwt: string | null = null;
  private subscriptionId: string | null = null;
  private keyPair: crypto.KeyPairKeyObjectResult | null = null;
  private nkeysUserKey: string | null = null;

  private isConnected = false;
  private isConnecting = false;
  private sidCounter = 1;
  private subscribedTopics = new Map<string, number>(); // topic -> sid
  private ltpStore = new Map<string, StockLivePrice>();
  private indexStore = new Map<string, StockLiveIndex>();

  private onTickCallback?: OnTickCallback;
  private onConnectionChangeCallback?: OnConnectionChange;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isDisposed = false;

  constructor(sessionToken: string) {
    this.sessionToken = sessionToken;
  }

  public setOnTick(callback: OnTickCallback) {
    this.onTickCallback = callback;
  }

  public setOnConnectionChange(callback: OnConnectionChange) {
    this.onConnectionChangeCallback = callback;
  }

  public async initialize(): Promise<void> {
    if (this.isDisposed) return;

    // 1. Generate Ed25519 keypair
    this.keyPair = crypto.generateKeyPairSync("ed25519");
    const rawPub = this.keyPair.publicKey.export({ type: "spki", format: "der" }).subarray(-32);
    this.nkeysUserKey = generateNKeysUserKey(rawPub);

    // 2. Obtain official socket JWT token
    const socketTokenRes = await GrowwAPI.generateSocketToken(this.sessionToken, this.nkeysUserKey);
    this.socketJwt = socketTokenRes.token;
    this.subscriptionId = socketTokenRes.subscriptionId;
  }

  public connect(): void {
    if (this.isConnecting || this.isConnected || this.isDisposed) return;
    this.isConnecting = true;

    try {
      this.ws = new WebSocket(GrowwAPI.SOCKET_URL);

      this.ws.onopen = () => {
        // Awaiting NATS INFO frame from server
      };

      this.ws.onmessage = async (event) => {
        await this.handleMessage(event.data);
      };

      this.ws.onerror = (err) => {
        this.onConnectionChangeCallback?.("ERROR", `Groww Feed WebSocket Error`);
      };

      this.ws.onclose = (ev) => {
        this.isConnected = false;
        this.isConnecting = false;
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.onConnectionChangeCallback?.(
          "DISCONNECTED",
          `Groww Feed WebSocket closed (code: ${ev.code}, reason: ${ev.reason || "none"})`,
        );
        this.scheduleReconnect();
      };
    } catch (err) {
      this.isConnecting = false;
      const msg = err instanceof Error ? err.message : String(err);
      this.onConnectionChangeCallback?.("ERROR", `Failed to initialize WebSocket: ${msg}`);
      this.scheduleReconnect();
    }
  }

  private async handleMessage(data: unknown): Promise<void> {
    let rawBuffer: Uint8Array;
    if (typeof data === "string") {
      rawBuffer = new TextEncoder().encode(data);
    } else if (data instanceof ArrayBuffer) {
      rawBuffer = new Uint8Array(data);
    } else if (typeof Blob !== "undefined" && data instanceof Blob) {
      const arr = await data.arrayBuffer();
      rawBuffer = new Uint8Array(arr);
    } else {
      return;
    }

    const textHeader = new TextDecoder().decode(
      rawBuffer.subarray(0, Math.min(256, rawBuffer.length)),
    );

    if (textHeader.startsWith("INFO ")) {
      try {
        const jsonStr = textHeader.slice(5).split("\r\n")[0];
        const info = JSON.parse(jsonStr) as { nonce?: string };
        if (info.nonce && this.keyPair && this.socketJwt) {
          const sig = crypto.sign(null, Buffer.from(info.nonce, "utf8"), this.keyPair.privateKey);
          const base64UrlSig = sig.toString("base64url");

          const connectFrame = `CONNECT ${JSON.stringify({
            jwt: this.socketJwt,
            sig: base64UrlSig,
            verbose: false,
            pedantic: false,
            protocol: 1,
          })}\r\nPING\r\n`;

          this.ws?.send(connectFrame);
        }
      } catch (e) {
        this.onConnectionChangeCallback?.(
          "ERROR",
          `NATS INFO parse failed: ${(e as Error).message}`,
        );
      }
      return;
    }

    if (textHeader.includes("PONG") || textHeader.includes("+OK")) {
      if (!this.isConnected) {
        this.isConnected = true;
        this.isConnecting = false;
        this.onConnectionChangeCallback?.(
          "CONNECTED",
          "Connected to official Groww Feed NATS gateway.",
        );

        // Re-subscribe all active topics
        this.resubscribeAll();

        // Start heartbeat ping
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send("PING\r\n");
          }
        }, 25000);
      }
      return;
    }

    if (textHeader.startsWith("PING")) {
      this.ws?.send("PONG\r\n");
      return;
    }

    if (textHeader.startsWith("MSG ")) {
      // Parse NATS MSG frame: MSG <subject> <sid> [reply-to] <bytes>\r\n<payload>\r\n
      const headerEnd = findCRLF(rawBuffer);
      if (headerEnd === -1) return;

      const headerLine = new TextDecoder().decode(rawBuffer.subarray(0, headerEnd));
      const parts = headerLine.split(" ");
      const subject = parts[1];
      const payloadStart = headerEnd + 2; // skip \r\n
      const payloadBytes = rawBuffer.subarray(payloadStart, rawBuffer.length - 2); // trim trailing \r\n

      try {
        const parsed = parseStocksSocketResponseProto(payloadBytes);

        if (parsed.stockLivePrice) {
          this.ltpStore.set(subject, parsed.stockLivePrice);
        }
        if (parsed.stocksLiveIndices) {
          this.indexStore.set(subject, parsed.stocksLiveIndices);
        }

        this.onTickCallback?.(subject, parsed);
      } catch (err) {
        // Skip malformed frame
      }
    }
  }

  public subscribe_ltp(
    instruments: GrowwInstrument[],
    onDataReceived?: OnTickCallback,
  ): Record<string, boolean> {
    const result: Record<string, boolean> = {};

    for (const inst of instruments) {
      const segmentKey = inst.segment === "FNO" ? "fo" : "eq";
      const exchangeKey = inst.exchange.toLowerCase();
      const topic = `/ld/${segmentKey}/${exchangeKey}/price.${inst.exchange_token}`;

      if (!this.subscribedTopics.has(topic)) {
        const sid = this.sidCounter++;
        this.subscribedTopics.set(topic, sid);

        if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(`SUB ${topic} ${sid}\r\n`);
        }
        result[inst.exchange_token] = true;
      } else {
        result[inst.exchange_token] = false;
      }
    }

    if (onDataReceived) {
      this.onTickCallback = onDataReceived;
    }

    return result;
  }

  public subscribe_index_value(
    indices: GrowwInstrument[],
    onDataReceived?: OnTickCallback,
  ): Record<string, boolean> {
    const result: Record<string, boolean> = {};

    for (const inst of indices) {
      const exchangeKey = inst.exchange.toLowerCase();
      const topic = `/ld/indices/${exchangeKey}/price.${inst.exchange_token}`;

      if (!this.subscribedTopics.has(topic)) {
        const sid = this.sidCounter++;
        this.subscribedTopics.set(topic, sid);

        if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(`SUB ${topic} ${sid}\r\n`);
        }
        result[inst.exchange_token] = true;
      } else {
        result[inst.exchange_token] = false;
      }
    }

    if (onDataReceived) {
      this.onTickCallback = onDataReceived;
    }

    return result;
  }

  public unsubscribe_ltp(instruments: GrowwInstrument[]): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const inst of instruments) {
      const segmentKey = inst.segment === "FNO" ? "fo" : "eq";
      const exchangeKey = inst.exchange.toLowerCase();
      const topic = `/ld/${segmentKey}/${exchangeKey}/price.${inst.exchange_token}`;
      const sid = this.subscribedTopics.get(topic);
      if (sid !== undefined) {
        if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(`UNSUB ${sid}\r\n`);
        }
        this.subscribedTopics.delete(topic);
        result[inst.exchange_token] = true;
      } else {
        result[inst.exchange_token] = false;
      }
    }
    return result;
  }

  public unsubscribe_index_value(indices: GrowwInstrument[]): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const inst of indices) {
      const exchangeKey = inst.exchange.toLowerCase();
      const topic = `/ld/indices/${exchangeKey}/price.${inst.exchange_token}`;
      const sid = this.subscribedTopics.get(topic);
      if (sid !== undefined) {
        if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(`UNSUB ${sid}\r\n`);
        }
        this.subscribedTopics.delete(topic);
        result[inst.exchange_token] = true;
      } else {
        result[inst.exchange_token] = false;
      }
    }
    return result;
  }

  public get_ltp(): Map<string, StockLivePrice> {
    return new Map(this.ltpStore);
  }

  public get_index_value(): Map<string, StockLiveIndex> {
    return new Map(this.indexStore);
  }

  private resubscribeAll(): void {
    if (!this.isConnected || this.ws?.readyState !== WebSocket.OPEN) return;
    for (const [topic, sid] of this.subscribedTopics.entries()) {
      this.ws.send(`SUB ${topic} ${sid}\r\n`);
    }
  }

  private scheduleReconnect(): void {
    if (this.isDisposed || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isConnected && !this.isConnecting) {
        this.connect();
      }
    }, 5000);
  }

  public disconnect(): void {
    this.isDisposed = true;
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
  }
}

function findCRLF(buf: Uint8Array): number {
  for (let i = 0; i < buf.length - 1; i++) {
    if (buf[i] === 0x0d && buf[i + 1] === 0x0a) {
      return i;
    }
  }
  return -1;
}
