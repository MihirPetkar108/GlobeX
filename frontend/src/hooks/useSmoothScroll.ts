/**
 * useSmoothScroll — Lenis smooth scroll integration
 *
 * Initializes Lenis on mount, drives via requestAnimationFrame,
 * and cleans up on unmount. Call once at the App root level
 * inside a BrowserRouter context so anchor hash links work.
 *
 * DECISION: Lenis chosen over native scroll-behavior:smooth because
 * it provides consistent, configurable inertia across browsers and
 * works seamlessly with Framer Motion's useScroll hook.
 */
import { useEffect } from "react";
import Lenis from "lenis";

export function useSmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      // Expo-out easing curve: fast start, soft landing
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 2,
      infinite: false,
    });

    // Expose lenis instance globally so GSAP ScrollTrigger can sync
    (window as Window & { lenis?: Lenis }).lenis = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    const rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      delete (window as Window & { lenis?: Lenis }).lenis;
    };
  }, []);
}
