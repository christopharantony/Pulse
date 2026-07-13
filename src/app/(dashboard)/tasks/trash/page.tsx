import { Card } from '@/components/ui/card';
import { TrashList } from '@/features/tasks/components/trash-list';

export default function TrashPage() {
  return (
    <Card className="flex flex-col gap-4">
      <TrashList />
    </Card>
  );
}
