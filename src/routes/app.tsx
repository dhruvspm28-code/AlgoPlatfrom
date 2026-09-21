import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { authService } from "@/services/auth-service";

/**
 * Authenticated application layout.
 * Every /app/* screen renders inside the persistent sidebar + topbar chrome.
 * Route guard ensures unauthenticated visitors are redirected to /login.
 */
export const Route = createFileRoute("/app")({
  beforeLoad: ({ location }) => {
    if (typeof window !== "undefined" && !authService.isAuthenticated()) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
