import { Card } from '@/components/ui/card';
import { GoalTrashList } from '@/features/goals/components/goal-trash-list';

export default function GoalsTrashPage() {
  return (
    <Card className="flex flex-col gap-4">
      <h1 className="text-h2 text-foreground">Trash</h1>
      <GoalTrashList />
    </Card>
  );
}
