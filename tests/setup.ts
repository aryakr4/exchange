import "@testing-library/jest-dom/vitest";

import { vi } from "vitest";

// lib/env.ts parses eagerly at import — give it a complete environment
// before any test module loads.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.RESEND_API_KEY = "test-resend-key";
process.env.EXCHANGERATE_API_KEY = "test-fx-key";
process.env.CRON_SECRET = "test-cron-secret-16-chars";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

// jsdom is missing a few APIs Radix UI primitives rely on.
if (typeof window !== "undefined") {
  window.HTMLElement.prototype.scrollIntoView ??= vi.fn();
  window.HTMLElement.prototype.hasPointerCapture ??= vi.fn(() => false);
  window.HTMLElement.prototype.releasePointerCapture ??= vi.fn();

  globalThis.ResizeObserver ??= class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as typeof window.matchMedia;
}
