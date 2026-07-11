'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/motion';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div initial="hidden" animate="visible" exit="exit" variants={fadeInUp} className={className}>
      {children}
    </motion.div>
  );
}
