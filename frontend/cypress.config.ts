import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5181",
    supportFile: false,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    // The primary lifecycle-rail nav is `hidden lg:flex` (LifecycleRail.tsx) -
    // below the lg breakpoint (1024px) it's replaced by a mobile drawer this
    // suite doesn't drive, so the viewport must clear 1024px wide.
    viewportWidth: 1280,
    viewportHeight: 800,
  },
});
