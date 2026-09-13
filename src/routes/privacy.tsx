import { createFileRoute } from "@tanstack/react-router";

import { MarketingShell } from "@/components/layout/MarketingShell";
import { LegalDocument } from "@/components/layout/LegalDocument";

/** Privacy policy — static legal copy. */
export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — SmartQuant Edge" },
      {
        name: "description",
        content:
          "How SmartQuant Edge collects, processes, stores and protects your personal and trading data.",
      },
      { property: "og:title", content: "SmartQuant Edge Privacy Policy" },
      {
        property: "og:description",
        content: "Our commitments on data collection, retention, broker tokens and your rights.",
      },
    ],
  }),
  component: Privacy,
});

const sections = [
  {
    heading: "1. Information we collect",
    body: "We collect account details you provide (name, email, phone), platform usage telemetry, strategy configurations you create, and the OAuth session tokens issued by your broker. We never collect or store your broker password or trading PIN.",
  },
  {
    heading: "2. How we use your information",
    body: "Your data is used to operate the platform: authenticating you, running your strategies, generating backtests and reports, detecting abuse, and providing support. Aggregated, de-identified usage statistics may inform product decisions.",
  },
  {
    heading: "3. Broker credentials and funds",
    body: "SmartQuant Edge never holds client funds. Broker access is granted through short-lived OAuth tokens that you can revoke instantly from your profile or from your broker's console. Tokens are encrypted at rest using AES-256.",
  },
  {
    heading: "4. Data sharing",
    body: "We do not sell personal data. We share data only with sub-processors necessary to run the service (cloud hosting, payment processing, email delivery, error monitoring), each bound by a data-processing agreement.",
  },
  {
    heading: "5. Retention",
    body: "Account and trading records are retained for eight years to meet Indian financial record-keeping expectations. You may request deletion of non-statutory data at any time.",
  },
  {
    heading: "6. Security",
    body: "We operate an ISO 27001-aligned control set: encryption in transit and at rest, least-privilege access, mandatory two-factor authentication for staff, quarterly penetration testing and continuous vulnerability scanning.",
  },
  {
    heading: "7. Your rights",
    body: "You may access, correct, export or delete your personal data, and object to specific processing. Write to privacy@smartquant.in and we will respond within 30 days.",
  },
  {
    heading: "8. Cookies",
    body: "We use strictly necessary cookies for authentication and optional analytics cookies to understand feature usage. Analytics can be disabled from your notification and privacy settings.",
  },
  {
    heading: "9. Changes to this policy",
    body: "Material changes will be announced in-product at least 14 days before they take effect, along with an email to the address on your account.",
  },
];

function Privacy() {
  return (
    <MarketingShell>
      <LegalDocument
        title="Privacy Policy"
        updated="Last updated 12 July 2026"
        sections={sections}
      />
    </MarketingShell>
  );
}
