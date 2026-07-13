'use client';

import { forwardRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from '@animateicons/react/lucide';
import { cn } from '@/lib/utils';

export const Modal = DialogPrimitive.Root;
export const ModalTrigger = DialogPrimitive.Trigger;
export const ModalClose = DialogPrimitive.Close;

export const ModalOverlay = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-overlay bg-background/80 animate-fade-in backdrop-blur-sm', className)}
    {...props}
  />
));
ModalOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const ModalContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <ModalOverlay />
    {/* Centers via flexbox rather than a translate transform, so it doesn't fight the
        `animate-scale-in` keyframes below — both would otherwise write to the same
        `transform` property and the animation's end state (`scale(1)`) would clobber the
        centering offset once the animation finishes. */}
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'w-full max-w-md animate-scale-in rounded-lg border border-border bg-surface-elevated p-6 shadow-glow focus:outline-none',
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 flex text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          aria-label="Close"
        >
          <XIcon size={18} isAnimated={false} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </div>
  </DialogPrimitive.Portal>
));
ModalContent.displayName = DialogPrimitive.Content.displayName;

export const ModalHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 pb-4', className)} {...props} />
);

export const ModalTitle = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-h3 text-foreground', className)} {...props} />
));
ModalTitle.displayName = DialogPrimitive.Title.displayName;

export const ModalDescription = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-small text-muted-foreground', className)} {...props} />
));
ModalDescription.displayName = DialogPrimitive.Description.displayName;

export const ModalFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center justify-end gap-3 pt-4', className)} {...props} />
);
