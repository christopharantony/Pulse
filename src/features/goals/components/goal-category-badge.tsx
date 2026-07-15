import { Badge } from '@/components/ui/badge';
import type { GoalCategory } from '@/features/goals/api/goals.api';

export const GOAL_CATEGORY_LABEL: Record<GoalCategory, string> = {
  personal: 'Personal',
  career: 'Career',
  health: 'Health',
  finance: 'Finance',
  learning: 'Learning',
  business: 'Business',
  relationships: 'Relationships',
  custom: 'Custom',
};

export function GoalCategoryBadge({ category, customLabel }: { category: GoalCategory; customLabel?: string | null }) {
  const label = category === 'custom' && customLabel ? customLabel : GOAL_CATEGORY_LABEL[category];
  return (
    <Badge variant="outline" aria-label={`Category: ${label}`}>
      {label}
    </Badge>
  );
}
