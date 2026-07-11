'use client';

import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNavDrawer } from '@/components/layout/mobile-nav-drawer';
import { Navbar } from '@/components/layout/navbar';
import { fadeIn } from '@/lib/motion';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <MobileNavDrawer open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

      <div className="flex min-h-screen flex-1 flex-col">
        <Navbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <AnimatePresence mode="wait">
          <motion.main
            key="content"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={fadeIn}
            className="flex-1 px-4 py-6 sm:px-6 lg:px-8"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
