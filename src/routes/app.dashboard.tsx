import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "./app.index";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({
    meta: [
      { title: "Market Dashboard — SmartQuant Edge Quantitative Terminal" },
      {
        name: "description",
        content:
          "Institutional market overview, market breadth, regime detection, active watchlist, and live algo desk controls.",
      },
    ],
  }),
  component: Dashboard,
});
