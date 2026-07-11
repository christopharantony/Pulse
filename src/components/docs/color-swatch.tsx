interface ColorSwatchProps {
  name: string;
  className: string;
  variable: string;
}

export function ColorSwatch({ name, className, variable }: ColorSwatchProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`h-16 w-full rounded-lg border border-border-subtle ${className}`} />
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{name}</span>
        <span className="font-mono text-caption text-muted">{variable}</span>
      </div>
    </div>
  );
}
