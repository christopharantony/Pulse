import { Card } from '@/components/ui/card';
import { HabitTrashList } from '@/features/habits/components/habit-trash-list';

export default function HabitsTrashPage() {
  return (
    <Card className="flex flex-col gap-4">
      <h1 className="text-h2 text-foreground">Trash</h1>
      <HabitTrashList />
    </Card>
  );
}
