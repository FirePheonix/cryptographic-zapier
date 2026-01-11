"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SendIcon, Loader2Icon, UserCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addPRComment } from "@/app/actions/pull-request";
import { toast } from "sonner";

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  userId: string;
}

interface PRCommentsProps {
  prId: string;
  comments: Comment[];
}

export function PRComments({ prId, comments }: PRCommentsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await addPRComment(prId, newComment.trim());
      if (result.success) {
        setNewComment("");
        router.refresh();
        toast.success("Comment added");
      } else {
        toast.error(result.error || "Failed to add comment");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Comment List */}
      {comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="p-4 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-2 mb-2">
                <UserCircleIcon className="size-5 text-muted-foreground" />
                <span className="text-sm font-medium">{comment.userId}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No comments yet
        </p>
      )}

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          disabled={isSubmitting}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !newComment.trim()}
          >
            {isSubmitting ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : (
              <SendIcon className="mr-2 size-4" />
            )}
            Comment
          </Button>
        </div>
      </form>
    </div>
  );
}
