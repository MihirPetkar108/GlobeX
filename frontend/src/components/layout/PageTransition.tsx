import { motion } from "framer-motion";
import { ReactNode } from "react";

const pageVariants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.22,
      ease: [0.22, 1, 0.36, 1], // Smooth cubic-bezier without abrupt steps
    },
  },
};

export const PageTransition = ({ children, className = "" }: { children: ReactNode; className?: string }) => {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className={`w-full min-h-[calc(100vh-3.5rem)] ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
