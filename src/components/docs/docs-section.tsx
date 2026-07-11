import type { ReactNode } from 'react';

interface DocsSectionProps {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}

export function DocsSection({ id, title, description, children }: DocsSectionProps) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-border-subtle py-12 first:pt-0 last:border-0">
      <div className="mb-6 flex flex-col gap-1.5">
        <h2 className="text-h2 text-foreground">{title}</h2>
        {description && <p className="max-w-2xl text-small text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

interface DocsExampleProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function DocsExample({ label, children, className }: DocsExampleProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-label text-muted-foreground">{label}</p>
      <div
        className={`flex flex-wrap items-center gap-4 rounded-lg border border-border-subtle bg-surface/30 p-5 ${className ?? ''}`}
      >
        {children}
      </div>
    </div>
  );
}
