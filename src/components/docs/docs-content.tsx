'use client';

import Link from 'next/link';
import {
  ActivityIcon,
  BellIcon,
  DownloadIcon,
  MailIcon,
  PlusIcon,
  SettingsIcon,
  StarIcon,
  TrashIcon,
  UserRoundIcon,
} from '@animateicons/react/lucide';

import { DocsNav } from '@/components/docs/docs-nav';
import { DocsSection, DocsExample } from '@/components/docs/docs-section';
import { ColorSwatch } from '@/components/docs/color-swatch';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { SearchInput } from '@/components/ui/search-input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Radio } from '@/components/ui/radio';
import { Toggle } from '@/components/ui/toggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Divider } from '@/components/ui/divider';
import { StatCard } from '@/components/ui/stat-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from '@/components/ui/modal';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/feedback/spinner';
import { Skeleton, CardSkeleton } from '@/components/feedback/skeleton';
import { Progress } from '@/components/feedback/progress';
import { Alert } from '@/components/feedback/alert';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SuccessState } from '@/components/feedback/success-state';

const navGroups = [
  {
    label: 'Foundations',
    items: [
      { id: 'overview', label: 'Overview' },
      { id: 'colors', label: 'Colors' },
      { id: 'typography', label: 'Typography' },
      { id: 'spacing', label: 'Spacing & radius' },
    ],
  },
  {
    label: 'Inputs',
    items: [
      { id: 'buttons', label: 'Buttons' },
      { id: 'text-inputs', label: 'Text inputs' },
      { id: 'selection', label: 'Selection controls' },
    ],
  },
  {
    label: 'Data display',
    items: [
      { id: 'cards', label: 'Cards & badges' },
      { id: 'table', label: 'Table & pagination' },
    ],
  },
  {
    label: 'Feedback',
    items: [
      { id: 'loading', label: 'Loading states' },
      { id: 'states', label: 'Alerts & states' },
    ],
  },
  {
    label: 'Navigation',
    items: [
      { id: 'tabs-breadcrumbs', label: 'Tabs & breadcrumbs' },
      { id: 'accordion', label: 'Accordion' },
    ],
  },
  {
    label: 'Overlays',
    items: [
      { id: 'overlays', label: 'Modal, drawer, popover' },
      { id: 'menus', label: 'Dropdown menu' },
    ],
  },
];

export function DocsContent() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-sticky flex h-16 items-center justify-between border-b border-border-subtle bg-background/80 px-6 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2">
          <ActivityIcon size={20} className="text-accent" />
          <span className="text-sm font-semibold tracking-tight">Pulse — Design System</span>
        </Link>
        <Link href="/dashboard" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          Back to app
        </Link>
      </header>

      <div className="mx-auto flex max-w-6xl gap-12 px-6 py-10">
        <DocsNav groups={navGroups} />

        <main className="min-w-0 flex-1">
          <DocsSection
            id="overview"
            title="Overview"
            description="Pulse is built with Next.js App Router, TypeScript, Tailwind CSS v3, Radix UI primitives, class-variance-authority, and Framer Motion. This page is a living reference for the design tokens and components introduced in the Application Shell & Design System phase — use it to see what already exists before building something new."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Tech stack" value="Next.js 15" icon={<ActivityIcon size={18} />} />
              <StatCard label="Styling" value="Tailwind v3" icon={<StarIcon size={18} />} />
              <StatCard label="Primitives" value="Radix UI" icon={<SettingsIcon size={18} />} />
              <StatCard label="Motion" value="Framer Motion" icon={<PlusIcon size={18} />} />
            </div>
            <div className="mt-6 flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface/30 p-5 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Import components</span> from{' '}
                <code className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-accent">
                  @/components/ui/&lt;name&gt;
                </code>{' '}
                (design system), or{' '}
                <code className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-accent">
                  @/components/feedback/&lt;name&gt;
                </code>{' '}
                and{' '}
                <code className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-accent">
                  @/components/layout/&lt;name&gt;
                </code>{' '}
                for feedback and shell pieces. Each component folder has a barrel{' '}
                <code className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-accent">index.ts</code>.
              </p>
              <p>
                Tokens live as CSS variables in{' '}
                <code className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-accent">
                  src/app/globals.css
                </code>{' '}
                and are exposed as Tailwind theme keys in{' '}
                <code className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-xs text-accent">
                  tailwind.config.ts
                </code>
                . Use semantic classes (<code className="text-accent">bg-surface</code>,{' '}
                <code className="text-accent">text-muted-foreground</code>,{' '}
                <code className="text-accent">border-border</code>) instead of raw Tailwind slate/cyan classes in
                new code.
              </p>
            </div>
          </DocsSection>

          <DocsSection id="colors" title="Colors" description="Semantic color tokens, resolved from CSS custom properties.">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <ColorSwatch name="Background" variable="--color-background" className="bg-background" />
              <ColorSwatch name="Surface" variable="--color-surface" className="bg-surface" />
              <ColorSwatch name="Surface elevated" variable="--color-surface-elevated" className="bg-surface-elevated" />
              <ColorSwatch name="Border" variable="--color-border" className="bg-border" />
              <ColorSwatch name="Foreground" variable="--color-foreground" className="bg-foreground" />
              <ColorSwatch name="Muted" variable="--color-muted" className="bg-muted" />
              <ColorSwatch name="Accent" variable="--color-accent" className="bg-accent" />
              <ColorSwatch name="Accent strong" variable="--color-accent-strong" className="bg-accent-strong" />
              <ColorSwatch name="Destructive" variable="--color-destructive" className="bg-destructive" />
              <ColorSwatch name="Success" variable="--color-success" className="bg-success" />
              <ColorSwatch name="Warning" variable="--color-warning" className="bg-warning" />
              <ColorSwatch name="Secondary glow" variable="--color-secondary-glow" className="bg-secondary-glow" />
            </div>
          </DocsSection>

          <DocsSection id="typography" title="Typography" description="Type scale exposed as Tailwind text-size utilities.">
            <div className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface/30 p-6">
              <p className="text-display text-foreground">Display · text-display</p>
              <p className="text-h1 text-foreground">Heading 1 · text-h1</p>
              <p className="text-h2 text-foreground">Heading 2 · text-h2</p>
              <p className="text-h3 text-foreground">Heading 3 · text-h3</p>
              <p className="text-body text-foreground">Body text · text-body</p>
              <p className="text-small text-muted-foreground">Small text · text-small</p>
              <p className="text-label text-muted-foreground">LABEL TEXT · text-label</p>
              <p className="text-caption text-muted">Caption text · text-caption</p>
            </div>
          </DocsSection>

          <DocsSection id="spacing" title="Spacing & radius" description="Border radius scale used across controls and surfaces.">
            <div className="flex flex-wrap gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="size-16 rounded-sm border border-accent/40 bg-accent/10" />
                <span className="font-mono text-caption text-muted">rounded-sm</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="size-16 rounded-md border border-accent/40 bg-accent/10" />
                <span className="font-mono text-caption text-muted">rounded-md</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="size-16 rounded-lg border border-accent/40 bg-accent/10" />
                <span className="font-mono text-caption text-muted">rounded-lg</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="size-16 rounded-xl border border-accent/40 bg-accent/10" />
                <span className="font-mono text-caption text-muted">rounded-xl</span>
              </div>
            </div>
          </DocsSection>

          <DocsSection id="buttons" title="Buttons" description="Variants, sizes, loading and icon states.">
            <div className="flex flex-col gap-6">
              <DocsExample label="Variants">
                <Button variant="primary" className="w-auto">Primary</Button>
                <Button variant="secondary" className="w-auto">Secondary</Button>
                <Button variant="outline" className="w-auto">Outline</Button>
                <Button variant="ghost" className="w-auto">Ghost</Button>
                <Button variant="destructive" className="w-auto">Destructive</Button>
                <Button variant="link" className="w-auto">Link</Button>
              </DocsExample>
              <DocsExample label="Sizes">
                <Button size="sm" className="w-auto">Small</Button>
                <Button size="md" className="w-auto">Medium</Button>
                <Button size="lg" className="w-auto">Large</Button>
                <Button size="icon" aria-label="Add">
                  <PlusIcon size={16} isAnimated={false} />
                </Button>
              </DocsExample>
              <DocsExample label="States">
                <Button className="w-auto" isLoading>
                  Loading
                </Button>
                <Button className="w-auto" disabled>
                  Disabled
                </Button>
                <Button className="w-auto" variant="outline">
                  <DownloadIcon size={16} isAnimated={false} />
                  With icon
                </Button>
              </DocsExample>
            </div>
          </DocsSection>

          <DocsSection id="text-inputs" title="Text inputs" description="Input, PasswordInput, SearchInput, Textarea.">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input label="Email" name="docs-email" placeholder="you@example.com" icon={<MailIcon size={18} isAnimated={false} />} />
              <PasswordInput label="Password" name="docs-password" placeholder="••••••••" />
              <SearchInput placeholder="Search…" aria-label="Search" />
              <Input label="With error" name="docs-error" defaultValue="invalid value" error="This field is required" />
              <div className="sm:col-span-2">
                <Textarea label="Description" name="docs-textarea" placeholder="Write something…" />
              </div>
            </div>
          </DocsSection>

          <DocsSection id="selection" title="Selection controls" description="Checkbox, Radio, Toggle, Select.">
            <div className="flex flex-col gap-6">
              <DocsExample label="Checkbox / Radio / Toggle">
                <Checkbox label="Accept terms" name="docs-checkbox" defaultChecked />
                <Radio label="Option A" name="docs-radio" defaultChecked />
                <Radio label="Option B" name="docs-radio" />
                <Toggle label="Enable notifications" name="docs-toggle" defaultChecked />
              </DocsExample>
              <DocsExample label="Select" className="max-w-xs">
                <Select defaultValue="member">
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </DocsExample>
            </div>
          </DocsSection>

          <DocsSection id="cards" title="Cards & badges" description="Card, Badge, Avatar, Divider.">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Project Alpha</CardTitle>
                  <CardDescription>A sample card composition.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <Badge variant="accent">Active</Badge>
                  <Badge variant="outline">v1.2</Badge>
                  <Badge variant="success">Passing</Badge>
                  <Badge variant="destructive">2 issues</Badge>
                </CardContent>
                <CardFooter>
                  <Avatar size="sm">
                    <AvatarFallback>PU</AvatarFallback>
                  </Avatar>
                  <Divider orientation="vertical" className="mx-2 h-6" />
                  <span className="text-small text-muted-foreground">Updated 2h ago</span>
                </CardFooter>
              </Card>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar size="sm"><AvatarFallback>SM</AvatarFallback></Avatar>
                  <Avatar size="md"><AvatarFallback>MD</AvatarFallback></Avatar>
                  <Avatar size="lg"><AvatarFallback><UserRoundIcon size={20} isAnimated={false} /></AvatarFallback></Avatar>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="accent">Accent</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <Badge variant="outline">Outline</Badge>
                </div>
              </div>
            </div>
          </DocsSection>

          <DocsSection id="table" title="Table & pagination" description="Table primitives and pagination control.">
            <div className="flex flex-col gap-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Ada Lovelace</TableCell>
                    <TableCell><Badge variant="success">Active</Badge></TableCell>
                    <TableCell>Owner</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Alan Turing</TableCell>
                    <TableCell><Badge variant="outline">Invited</Badge></TableCell>
                    <TableCell>Member</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <PaginationDemo />
            </div>
          </DocsSection>

          <DocsSection id="loading" title="Loading states" description="Spinner, Skeleton, Progress.">
            <div className="flex flex-col gap-6">
              <DocsExample label="Spinner">
                <Spinner size="sm" />
                <Spinner size="md" />
                <Spinner size="lg" />
              </DocsExample>
              <DocsExample label="Progress" className="flex-col items-stretch">
                <Progress value={35} />
                <Progress value={70} />
              </DocsExample>
              <DocsExample label="Skeleton" className="flex-col items-stretch gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
                <div className="max-w-xs">
                  <CardSkeleton />
                </div>
              </DocsExample>
            </div>
          </DocsSection>

          <DocsSection id="states" title="Alerts & states" description="Alert, EmptyState, ErrorState, SuccessState.">
            <div className="flex flex-col gap-6">
              <DocsExample label="Alert" className="flex-col items-stretch gap-3">
                <Alert variant="info" title="Heads up">This is an informational alert.</Alert>
                <Alert variant="success" title="Saved">Your changes were saved successfully.</Alert>
                <Alert variant="warning" title="Careful">This action may have side effects.</Alert>
                <Alert variant="destructive" title="Error">Something went wrong.</Alert>
              </DocsExample>
              <DocsExample label="Empty / error / success state" className="flex-col items-stretch gap-4">
                <EmptyState
                  icon={<BellIcon size={20} />}
                  title="No notifications"
                  description="You're all caught up."
                  action={<Button size="sm" className="w-auto">Refresh</Button>}
                />
                <ErrorState code="500" title="Failed to load" description="Something went wrong loading this data." />
                <SuccessState title="All done" description="Your request completed successfully." />
              </DocsExample>
            </div>
          </DocsSection>

          <DocsSection id="tabs-breadcrumbs" title="Tabs & breadcrumbs" description="Tabs and Breadcrumbs navigation.">
            <div className="flex flex-col gap-6">
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="text-small text-muted-foreground">
                  Overview tab content.
                </TabsContent>
                <TabsContent value="activity" className="text-small text-muted-foreground">
                  Activity tab content.
                </TabsContent>
                <TabsContent value="settings" className="text-small text-muted-foreground">
                  Settings tab content.
                </TabsContent>
              </Tabs>
              <Breadcrumbs
                items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings', href: '/settings/security' }, { label: 'Security' }]}
              />
            </div>
          </DocsSection>

          <DocsSection id="accordion" title="Accordion" description="Collapsible content sections.">
            <Accordion type="single" collapsible className="max-w-xl">
              <AccordionItem value="item-1">
                <AccordionTrigger>What is Pulse?</AccordionTrigger>
                <AccordionContent>A productivity platform foundation built with Next.js.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>What styling approach is used?</AccordionTrigger>
                <AccordionContent>Tailwind CSS with a semantic token layer and CVA variants.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </DocsSection>

          <DocsSection id="overlays" title="Modal, drawer, popover" description="Radix-backed overlay primitives.">
            <DocsExample label="Trigger examples">
              <Modal>
                <ModalTrigger asChild>
                  <Button variant="outline" className="w-auto">Open modal</Button>
                </ModalTrigger>
                <ModalContent>
                  <ModalHeader>
                    <ModalTitle>Confirm action</ModalTitle>
                    <ModalDescription>Are you sure you want to continue?</ModalDescription>
                  </ModalHeader>
                  <ModalFooter>
                    <Button variant="outline" className="w-auto">Cancel</Button>
                    <Button className="w-auto">Confirm</Button>
                  </ModalFooter>
                </ModalContent>
              </Modal>

              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="outline" className="w-auto">Open drawer</Button>
                </DrawerTrigger>
                <DrawerContent side="right">
                  <DrawerHeader>
                    <DrawerTitle>Details</DrawerTitle>
                    <DrawerDescription>Drawer content slides in from the side.</DrawerDescription>
                  </DrawerHeader>
                </DrawerContent>
              </Drawer>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-auto">Open popover</Button>
                </PopoverTrigger>
                <PopoverContent>
                  <p className="text-sm text-foreground">Popover content anchored to the trigger.</p>
                </PopoverContent>
              </Popover>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Info">
                    <StarIcon size={16} isAnimated={false} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tooltip content</TooltipContent>
              </Tooltip>
            </DocsExample>
          </DocsSection>

          <DocsSection id="menus" title="Dropdown menu" description="Radix DropdownMenu styled with the token system.">
            <DocsExample label="Trigger example">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-auto">
                    <SettingsIcon size={16} isAnimated={false} />
                    Options
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center gap-2">
                    <UserRoundIcon size={16} isAnimated={false} />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2">
                    <SettingsIcon size={16} isAnimated={false} />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive className="flex items-center gap-2">
                    <TrashIcon size={16} isAnimated={false} />
                    Delete account
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </DocsExample>
          </DocsSection>
        </main>
      </div>
    </div>
  );
}

function PaginationDemo() {
  return <Pagination page={2} pageCount={5} onPageChange={() => undefined} />;
}
