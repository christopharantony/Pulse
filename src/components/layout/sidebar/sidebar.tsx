'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ActivityIcon, ChevronsLeftIcon } from '@animateicons/react/lucide';
import { cn } from '@/lib/utils';
import { sidebarWidth } from '@/lib/motion';
import { navItems } from './nav-items';
import { SidebarNavItem } from './sidebar-nav-item';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.aside
      initial={false}
      animate={collapsed ? 'collapsed' : 'expanded'}
      variants={shouldReduceMotion ? undefined : sidebarWidth}
      className={cn(
        'sticky top-0 z-sticky hidden h-screen shrink-0 flex-col border-r border-border-subtle bg-surface/40 lg:flex',
        shouldReduceMotion && (collapsed ? 'w-[76px]' : 'w-[260px]')
      )}
    >
      <div className={cn('flex h-16 items-center gap-2 px-4', collapsed && 'justify-center px-0')}>
        <Link href="/dashboard" className="flex items-center gap-2 text-foreground">
          <ActivityIcon size={22} className="shrink-0 text-accent" />
          {!collapsed && <span className="text-lg font-semibold tracking-tight">Pulse</span>}
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        {navItems.map((item) => (
          <SidebarNavItem key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="border-t border-border-subtle p-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-base hover:bg-surface/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
            collapsed && 'justify-center px-0'
          )}
        >
          <ChevronsLeftIcon
            size={18}
            isAnimated={false}
            className={cn('shrink-0 transition-transform duration-base', collapsed && 'rotate-180')}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}
