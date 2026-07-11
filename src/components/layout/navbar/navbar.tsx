'use client';

import { BellIcon, ListChevronsUpDownIcon, MenuIcon, MoonIcon } from '@animateicons/react/lucide';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UserMenu } from '@/components/layout/user-menu';

interface NavbarProps {
  onOpenMobileNav: () => void;
}

export function Navbar({ onOpenMobileNav }: NavbarProps) {
  return (
    <header className="sticky top-0 z-sticky flex h-16 items-center gap-3 border-b border-border-subtle bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <MenuIcon size={18} isAnimated={false} />
      </Button>

      <Button variant="ghost" size="sm" className="hidden w-auto items-center gap-1.5 lg:flex">
        <span className="text-sm font-medium text-foreground">Pulse Workspace</span>
        <ListChevronsUpDownIcon size={14} isAnimated={false} className="text-muted" />
      </Button>

      <div className="flex-1" />

      <div className="hidden w-full max-w-xs sm:block">
        <SearchInput placeholder="Search…" aria-label="Search" />
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <BellIcon size={18} isAnimated={false} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Toggle theme">
            <MoonIcon size={18} isAnimated={false} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Theme</TooltipContent>
      </Tooltip>

      <UserMenu />
    </header>
  );
}
