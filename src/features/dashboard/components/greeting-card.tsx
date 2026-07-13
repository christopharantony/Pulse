import { Card } from '@/components/ui/card';
import type { GreetingData } from '@/features/dashboard/types/dashboard';

const GREETING_TEXT: Record<GreetingData['greeting'], string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
};

const GREETING_EMOJI: Record<GreetingData['greeting'], string> = {
  morning: '☀️',
  afternoon: '👋',
  evening: '🌙',
};

function formatDate(dateISO: string): string {
  return new Date(`${dateISO}T00:00:00.000Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** The dashboard header: dynamic greeting, name, date, and a motivational line. */
export function GreetingCard({ greeting }: { greeting: GreetingData }) {
  const firstName = greeting.name.split(' ')[0];

  return (
    <Card className="flex flex-col gap-2 bg-gradient-to-br from-surface/70 to-surface/40">
      <p className="text-label uppercase tracking-[0.2em] text-accent">{formatDate(greeting.dateISO)}</p>
      <h1 className="text-h1 text-foreground">
        {GREETING_TEXT[greeting.greeting]}, {firstName} {GREETING_EMOJI[greeting.greeting]}
      </h1>
      <p className="text-muted-foreground">{greeting.message}</p>
    </Card>
  );
}
