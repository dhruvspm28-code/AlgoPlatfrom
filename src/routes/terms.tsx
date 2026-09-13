import { createFileRoute } from "@tanstack/react-router";

import { MarketingShell } from "@/components/layout/MarketingShell";
import { LegalDocument } from "@/components/layout/LegalDocument";

/** Terms & conditions — static legal copy. */
export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — SmartQuant Edge" },
      {
        name: "description",
        content:
          "The terms governing your use of the SmartQuant Edge algorithmic trading platform, including risk disclosures and billing.",
      },
      { property: "og:title", content: "SmartQuant Edge Terms & Conditions" },
      {
        property: "og:description",
        content: "Service terms, acceptable use, billing, liability and market risk disclosure.",
      },
    ],
  }),
  component: Terms,
});

const sections = [
  {
    heading: "1. Acceptance of terms",
    body: "By creating an account you agree to these terms, our privacy policy and any plan-specific commercial terms. If you use SmartQuant Edge on behalf of an organisation, you confirm you are authorised to bind it.",
  },
  {
    heading: "2. Nature of the service",
    body: "SmartQuant Edge is trading software. It is not an investment adviser, portfolio manager or broker, and nothing in the product constitutes investment advice or a recommendation to buy or sell any security.",
  },
  {
    heading: "3. Market risk disclosure",
    body: "Trading in securities and derivatives carries substantial risk of loss. Backtested and simulated results are hypothetical and do not represent actual trading. Past performance is not indicative of future results. You are solely responsible for every order placed from your account.",
  },
  {
    heading: "4. Your responsibilities",
    body: "You must keep credentials confidential, enable two-factor authentication, comply with exchange and SEBI regulations, and ensure any automated strategy you deploy respects your broker's rate and exposure limits.",
  },
  {
    heading: "5. Acceptable use",
    body: "You may not reverse engineer the platform, resell access, scrape market data, attempt to manipulate markets, or use the service for any unlawful purpose. We may suspend accounts that threaten platform integrity.",
  },
  {
    heading: "6. Billing and refunds",
    body: "Paid plans bill in advance on a monthly or annual cycle. Cancellations take effect at the end of the current cycle. Partial periods are not refunded except where required by law.",
  },
  {
    heading: "7. Availability",
    body: "We target 99.9% monthly availability but do not guarantee uninterrupted service. Scheduled maintenance is announced in advance and normally occurs outside Indian market hours.",
  },
  {
    heading: "8. Limitation of liability",
    body: "To the maximum extent permitted by law, our aggregate liability is limited to the fees you paid in the twelve months preceding the claim. We are not liable for trading losses, missed opportunities or indirect damages.",
  },
  {
    heading: "9. Governing law",
    body: "These terms are governed by the laws of India. Courts at Bengaluru, Karnataka have exclusive jurisdiction over any dispute.",
  },
];

function Terms() {
  return (
    <MarketingShell>
      <LegalDocument
        title="Terms & Conditions"
        updated="Last updated 12 July 2026"
        sections={sections}
      />
    </MarketingShell>
  );
}
