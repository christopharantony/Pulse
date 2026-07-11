import type { ComponentType } from 'react';
import {
  BookOpenIcon,
  ChartLineIcon,
  CheckCheckIcon,
  ClipboardIcon,
  DashboardIcon,
  FlameIcon,
  StarIcon,
  UsersRoundIcon,
} from '@animateicons/react/lucide';

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number; className?: string; isAnimated?: boolean }>;
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
  { label: 'Tasks', href: '/tasks', icon: CheckCheckIcon },
  { label: 'Habits', href: '/habits', icon: FlameIcon },
  { label: 'Goals', href: '/goals', icon: StarIcon },
  { label: 'Calendar', href: '/calendar', icon: ClipboardIcon },
  { label: 'Notes', href: '/notes', icon: BookOpenIcon },
  { label: 'Analytics', href: '/analytics', icon: ChartLineIcon },
  { label: 'Team', href: '/team', icon: UsersRoundIcon },
];
