import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

interface ListCardProps {
  listId: string;
  name: string;
  peopleCount?: number | null;
  createdAt: string;
  onClick: () => void;
}

export function ListCard({ name, peopleCount, createdAt, onClick }: ListCardProps) {
  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <div className="rounded-md bg-muted p-2">
          <Users className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground">
            {formatNumber(peopleCount ?? 0)} people &middot; Created{" "}
            {new Date(createdAt).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
