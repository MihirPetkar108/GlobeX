import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent, useSpring, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Balancer from "react-wrap-balancer";
import TradeGlobe, { TradeGlobeRef } from "@/components/TradeGlobe";
import { SAMPLE_DATA, aggregateByCountry } from "@/lib/tradeData";
import SplitText from "@/components/ui/split-text";
import AuthShell from "@/components/auth/AuthShell";
import { useAuthContext } from "@/context/AuthContext";
import {
  ChevronDown,
  ShieldCheck,
} from "lucide-react";

type LandingPhase = "idle" | "rotating" | "zooming" | "mumbai" | "auth-ready";

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<TradeGlobeRef>(null);
  const initialPovRef = useRef<{ lat: number; lng: number; altitude: number } | null>(null);
  const phaseRef = useRef<LandingPhase>("idle");
  const navigate = useNavigate();
  const { appState } = useAuthContext();
  const prefersReducedMotion = useReducedMotion();
  const aggregatedData = useMemo(() => aggregateByCountry(SAMPLE_DATA, null), []);

  useEffect(() => {
    if (appState === "DASHBOARD") {
      navigate("/home", { replace: true });
    }
  }, [appState, navigate]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Snappy, frictionless spring for silky smooth 60fps tracking
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 32,
    mass: 0.15,
    restDelta: 0.001,
  });

  const [landingPhase, setLandingPhase] = useState<LandingPhase>("idle");

  // Dynamic Camera transitions as scroll progresses into Mumbai
  useMotionValueEvent(smoothProgress, "change", (progress) => {
    if (prefersReducedMotion) return;

    const nextPhase: LandingPhase =
      progress < 0.20 ? "rotating" : progress < 0.45 ? "zooming" : progress < 0.68 ? "mumbai" : "auth-ready";

    if (phaseRef.current !== nextPhase) {
      phaseRef.current = nextPhase;
      setLandingPhase(nextPhase);
    }

    if (!globeRef.current) return;

    if (!initialPovRef.current && progress > 0.001) {
      initialPovRef.current = globeRef.current.getCurrentPointOfView() || { lat: 20, lng: 55, altitude: 2.2 };
    }

    const startLat = initialPovRef.current?.lat ?? 20;
    const startLng = initialPovRef.current?.lng ?? 55;
    const startAlt = initialPovRef.current?.altitude ?? 2.2;

    const indiaLat = 20.5937;
    const indiaLng = 78.9629;
    const indiaAlt = 1.55;

    const mumbaiLat = 18.9438;
    const mumbaiLng = 72.9463;
    const mumbaiAlt = 0.55;

    let lat, lng, altitude;

    if (progress <= 0.40) {
      const t1 = progress / 0.40;
      const ease1 = 1 - Math.pow(1 - t1, 2.5);
      lat = startLat + (indiaLat - startLat) * ease1;
      lng = startLng + (indiaLng - startLng) * ease1;
      altitude = startAlt + (indiaAlt - startAlt) * ease1;
    } else {
      const t2 = (progress - 0.40) / 0.60;
      const ease2 = 1 - Math.pow(1 - t2, 2.8);
      lat = indiaLat + (mumbaiLat - indiaLat) * ease2;
      lng = indiaLng + (mumbaiLng - indiaLng) * ease2;
      altitude = indiaAlt + (mumbaiAlt - indiaAlt) * ease2;
    }

    globeRef.current.pointOfView({ lat, lng, altitude }, 0);
  });

  // Stage 1 Hero Transitions (Smooth fade out without gaps)
  const heroOpacity = useTransform(smoothProgress, [0, 0.28], [1, 0]);
  const heroY = useTransform(smoothProgress, [0, 0.28], [0, -30]);
  const heroPointerEvents = useTransform(smoothProgress, (v) => (v < 0.25 ? "auto" : "none"));

  // Stage 2 Globe Zoom & Spatial Dimming (GPU only)
  const globeScale = useTransform(smoothProgress, [0, 0.40, 0.80], [1, 1.35, 1.8]);
  const globeX = useTransform(smoothProgress, [0, 0.40, 0.80], ["18%", "4%", "-4%"]);
  const globeOpacity = useTransform(smoothProgress, [0.60, 0.90], [1, 0.25]);

  // ── "Bloom from Mumbai" Animation Sequence (100% GPU accelerated) ─────────
  // Seamlessly overlaps with hero fade-out to prevent any momentary black screen
  const bloomRadiusNum = useTransform(smoothProgress, [0.26, 0.60], [0, 160]);
  const authClipPath = useTransform(bloomRadiusNum, (r) => `circle(${r}% at 50% 50%)`);

  const authOpacity = useTransform(smoothProgress, [0.26, 0.44], [0, 1]);
  const authScale = useTransform(smoothProgress, [0.26, 0.60], [0.35, 1.0]);
  const authPointerEvents = useTransform(smoothProgress, (v) => (v >= 0.45 ? "auto" : "none"));

  const scrollToAuth = () => {
    window.scrollTo({
      top: window.innerHeight * 1.8,
      behavior: "smooth",
    });
  };

  const handleLoginSuccess = () => {
    navigate("/home");
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[320vh] bg-[var(--bg-app)] text-[var(--text-primary)] font-sans select-none transition-colors duration-200"
    >
      {/* ─── STICKY FULLSCREEN VIEWPORT CONTAINER ─────────────────────────────────── */}
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-between overflow-hidden">
        
        {/* Background ambient lighting glow (Semantic Teal & Cyan) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 -z-10"
          style={{
            background:
              "radial-gradient(circle at 50% 40%, var(--info-bg) 0%, transparent 65%), radial-gradient(circle at 80% 80%, var(--success-bg) 0%, transparent 50%)",
          }}
        />

        {/* ── 3D EARTH GLOBE LAYER (Optimized Lifecycle & Auto-Paused on Auth) ─ */}
        {!prefersReducedMotion && (
          <motion.div
            style={{
              scale: globeScale,
              x: globeX,
              opacity: globeOpacity,
            }}
            className="absolute inset-0 flex items-center justify-center pointer-events-auto z-10 transform-gpu"
          >
            <div className="w-[600px] h-[600px] sm:w-[950px] sm:h-[950px] md:w-[1150px] md:h-[1150px] lg:w-[1350px] lg:h-[1350px] xl:w-[1550px] xl:h-[1550px] flex items-center justify-center">
              <TradeGlobe
                ref={globeRef}
                aggregatedData={aggregatedData}
                selectedCountry="India"
                showArcs={true}
                autoRotate={landingPhase === "idle" || landingPhase === "rotating"}
                disableCountryAutoFocus={true}
                isPaused={landingPhase === "auth-ready"}
                lifecyclePhase={landingPhase}
              />
            </div>
          </motion.div>
        )}

        {/* ── STAGE 1: HERO VIEW (Headline, Subtext, Scroll Cue) ──────────── */}
        {!prefersReducedMotion && (
          <motion.div
            style={{
              opacity: heroOpacity,
              y: heroY,
              pointerEvents: heroPointerEvents,
            }}
            className="absolute inset-x-4 sm:left-12 lg:left-20 top-1/2 -translate-y-1/2 max-w-sm sm:max-w-[620px] xl:max-w-[680px] space-y-6 sm:space-y-7 z-20 pointer-events-none transform-gpu"
          >
            <span className="block font-display font-bold text-xl sm:text-2xl tracking-wide text-blue-900">
              Globex
            </span>

            <h1 className="text-2xl sm:text-4xl sm:text-5xl lg:text-[3.6rem] xl:text-[4rem] font-display font-extrabold tracking-tight leading-[1.02] text-[var(--text-primary)] pointer-events-auto">
              <Balancer>
                <span className="text-[var(--emerald)] inline-block">
                  <SplitText text="Trade globally." delay={0.1} className="justify-start font-display font-extrabold" />
                </span>
                <span className="font-serif italic text-[var(--emerald)] text-3xl sm:text-5xl sm:text-6xl lg:text-[4.4rem] xl:text-[4.9rem] inline-block mt-1 font-normal tracking-wide">
                  <SplitText text="With confidence." delay={0.4} className="justify-start font-serif italic" />
                </span>
              </Balancer>
            </h1>

            <p className="text-sm sm:text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed font-sans pointer-events-auto max-w-xs sm:max-w-[540px]">
              Connect with verified international buyers and sellers, verify trade papers automatically, and protect every payment with programmable escrow.
            </p>

            {/* Pulsing Scroll Cue with Click-to-Scroll Trigger */}
            <div
              onClick={scrollToAuth}
              className="pt-2 inline-flex items-center gap-3 text-xs sm:text-sm font-mono text-[var(--text-secondary)] pointer-events-auto cursor-pointer hover:text-[var(--text-primary)] transition-colors"
            >
              <div className="w-8 h-8 rounded-full border border-[var(--hairline-strong)] bg-[var(--surface-1)] flex items-center justify-center animate-bounce shadow-lg text-[var(--emerald)]">
                <ChevronDown className="w-4 h-4" />
              </div>
              <span className="text-[var(--text-secondary)]">Scroll to sign in & access enterprise workspace</span>
            </div>
          </motion.div>
        )}

        {/* ── STAGE 2: "BLOOM FROM MUMBAI" AUTH SURFACE REVEAL ───────────── */}
        <div className="absolute inset-0 z-40 w-full h-full min-h-screen flex items-center justify-center p-4 sm:p-6 pointer-events-none">
          <motion.div
            style={{
              opacity: prefersReducedMotion ? 1 : authOpacity,
              scale: prefersReducedMotion ? 1 : authScale,
              clipPath: prefersReducedMotion ? "none" : authClipPath,
              WebkitClipPath: prefersReducedMotion ? "none" : authClipPath,
              pointerEvents: prefersReducedMotion ? "auto" : authPointerEvents,
              transformOrigin: "50% 50%",
            }}
            className="w-full max-w-[760px] pointer-events-auto transform-gpu will-change-[transform,opacity,clip-path]"
          >
            {/* Translucent Near-Square Auth Shell */}
            <AuthShell onSuccess={handleLoginSuccess} />
          </motion.div>
        </div>

        {/* Minimal Bottom Bar */}
        <div className="w-full py-2 px-6 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--text-tertiary)] z-30">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--brand-teal)]" />
            <span>GLOBEX Protocol · India ⇄ UAE ⇄ Global Trade</span>
          </div>
          <span>CEPA Schedule Rules · EVM Verified</span>
        </div>

      </div>
    </div>
  );
}
