"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28 });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[70] hidden h-[3px] origin-left sm:block bg-gradient-to-r from-[#e8b86d] via-[#2ec4b6] to-[#0b7d73]"
    />
  );
}
