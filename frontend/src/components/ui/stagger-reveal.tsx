/**
 * StaggerReveal — staggered child entrance animation container
 *
 * Wraps children in Framer Motion variants so they reveal in staggered
 * sequence when scrolled into view. Each child gets a 70ms stagger.
 *
 * Use for grids, lists, and card rows where sequential reveal feels natural.
 */
import { useRef } from "react";
import { motion, useInView, Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";

interface StaggerRevealProps {
  children: React.ReactNode;
  staggerDelay?: number;
  delay?: number;
  className?: string;
  childClassName?: string;
  margin?: string;
}

const containerVariants = (stagger: number, delay: number): Variants => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: stagger,
      delayChildren: delay,
    },
  },
});

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
    filter: "blur(4px)",
  },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export function StaggerReveal({
  children,
  staggerDelay = 0.07,
  delay = 0,
  className,
  childClassName,
  margin = "-80px",
}: StaggerRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: margin as `${number}px` });

  return (
    <motion.div
      ref={ref}
      variants={containerVariants(staggerDelay, delay)}
      initial="hidden"
      animate={isInView ? "show" : "hidden"}
      className={cn(className)}
    >
      {React.Children.map(children, (child) =>
        child != null ? (
          <motion.div variants={itemVariants} className={cn(childClassName)}>
            {child}
          </motion.div>
        ) : null
      )}
    </motion.div>
  );
}

export default StaggerReveal;
