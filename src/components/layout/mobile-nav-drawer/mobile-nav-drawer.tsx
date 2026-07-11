'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ActivityIcon } from '@animateicons/react/lucide';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { navItems } from '@/components/layout/sidebar/nav-items';

interface MobileNavDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNavDrawer({ open, onOpenChange }: MobileNavDrawerProps) {
  const pathname = usePathname();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="left" className="max-w-[280px] gap-6">
        <Link
          href="/dashboard"
          onClick={() => onOpenChange(false)}
          className="flex items-center gap-2 text-foreground"
        >
          <ActivityIcon size={22} className="text-accent" />
          <span className="text-lg font-semibold tracking-tight">Pulse</span>
        </Link>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-base',
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted-foreground hover:bg-surface/60 hover:text-foreground'
                )}
              >
                <Icon size={18} isAnimated={false} className="shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </DrawerContent>
    </Drawer>
  );
}
