"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useReviews, useSubmitReview } from "./product-api";
import type { Review } from "./types";

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange?.(n)}
          className={cn(onChange ? "cursor-pointer" : "cursor-default")}
        >
          <Star className={cn("size-4", n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
        </button>
      ))}
    </span>
  );
}

function ReviewForm({ productId, mine }: { productId: string; mine?: Review }) {
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [comment, setComment] = useState(mine?.comment ?? "");
  const { create, update, remove } = useSubmitReview(productId);
  const pending = create.isPending || update.isPending || remove.isPending;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Something went wrong");
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return toast.error("Choose a rating");
    const body = { rating, comment: comment.trim() || undefined };
    run(() => (mine ? update.mutateAsync(body) : create.mutateAsync(body)), mine ? "Review updated" : "Thanks for your review");
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border p-4">
      <p className="text-sm font-medium">{mine ? "Your review" : "Write a review"}</p>
      <Stars value={rating} onChange={setRating} />
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} placeholder="Share your experience (optional)" rows={3} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {mine ? "Save changes" : "Submit review"}
        </Button>
        {mine ? (
          <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => remove.mutateAsync(), "Review deleted")}>
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function ReviewsSection({ productId }: { productId: string }) {
  const { user } = useAuth();
  const { data, isLoading } = useReviews(productId);
  const mine = data?.items.find((r) => user && r.userId === user.id);

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold">Reviews{data ? ` (${data.total})` : ""}</h2>

      {user ? (
        <div className="space-y-2">
          <ReviewForm key={mine?.id ?? "new"} productId={productId} mine={mine} />
          {!mine ? <p className="text-xs text-muted-foreground">Only customers who bought this product can leave a review.</p> : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sign in to leave a review.</p>
      )}

      {isLoading ? (
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
      ) : data?.items.length ? (
        <ul className="space-y-4">
          {data.items.map((r) => (
            <li key={r.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <Stars value={r.rating} />
                <span className="text-sm font-medium">{r.author}</span>
                <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-GB")}</span>
              </div>
              {r.comment ? <p className="text-sm text-muted-foreground">{r.comment}</p> : null}
              <Separator className="mt-4" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      )}
    </section>
  );
}
