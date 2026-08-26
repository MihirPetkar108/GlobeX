/**
 * ScrollReveal — scroll-triggered entrance animation wrapper
 *
 * Uses Framer Motion useInView to trigger a reveal when the element
 * enters the viewport. Supports directional Y/X translate, blur, and
 * custom delay/duration.
 *
 * DESIGN RULE: Y-rise = 20px max, blur = 6px→0 (optional), easing = expo-out.
 * Keep animations subtle — this is an institutional B2B product.
 */
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  blur?: boolean;
  className?: string;
  /** If true, only animates once even if scrolled past and back */
  once?: boolean;
  /** Viewport margin before triggering — negative means trigger before fully visible */
  margin?: string;
}

export function ScrollReveal({
  children,
  delay = 0,
  duration = 0.55,
  direction = "up",
  distance = 20,
  blur = false,
  className,
  once = true,
  margin = "-60px",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: margin as `${number}px` });

  const initialTranslate: Record<string, number> = {};
  if (direction === "up") initialTranslate.y = distance;
  if (direction === "down") initialTranslate.y = -distance;
  if (direction === "left") initialTranslate.x = distance;
  if (direction === "right") initialTranslate.x = -distance;

  return (
    <motion.div
      ref={ref}
      initial={{
        opacity: 0,
        filter: blur ? "blur(6px)" : "blur(0px)",
        ...initialTranslate,
      }}
      animate={
        isInView
          ? { opacity: 1, filter: "blur(0px)", x: 0, y: 0 }
          : {
              opacity: 0,
              filter: blur ? "blur(6px)" : "blur(0px)",
              ...initialTranslate,
            }
      }
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1], // expo-out
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export default ScrollReveal;
