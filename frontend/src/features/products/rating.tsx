import { Star } from "lucide-react";

export function Rating({ value, count }: { value: string | number; count: number }) {
  const v = Number(value);
  if (!count) return <span className="text-xs text-muted-foreground">No reviews yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Star className="size-3.5 fill-amber-400 text-amber-400" />
      <span className="font-medium text-foreground">{v.toFixed(1)}</span>
      <span>({count})</span>
    </span>
  );
}
