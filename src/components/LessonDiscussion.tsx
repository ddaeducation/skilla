import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Send, Reply, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  parent_id: string | null;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null };
  replies?: Comment[];
}

const LessonDiscussion = ({
  lessonId,
  courseId,
  userId,
}: {
  lessonId: string;
  courseId: string;
  userId: string;
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchComments = async () => {
    const { data } = await supabase
      .from("lesson_comments")
      .select("id, content, user_id, parent_id, created_at")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const enriched = data.map((c) => ({
        ...c,
        profile: profiles?.find((p) => p.id === c.user_id) || null,
      }));

      // Nest replies
      const topLevel = enriched.filter((c) => !c.parent_id);
      const replies = enriched.filter((c) => c.parent_id);
      const nested = topLevel.map((c) => ({
        ...c,
        replies: replies.filter((r) => r.parent_id === c.id),
      }));
      setComments(nested as Comment[]);
    } else {
      setComments([]);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [lessonId]);

  const handlePost = async (parentId: string | null = null) => {
    const text = parentId ? replyText : newComment;
    if (!text.trim()) return;

    setLoading(true);
    const { error } = await supabase.from("lesson_comments").insert({
      lesson_id: lessonId,
      course_id: courseId,
      user_id: userId,
      content: text.trim(),
      parent_id: parentId,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to post comment", variant: "destructive" });
    } else {
      if (parentId) {
        setReplyText("");
        setReplyTo(null);
      } else {
        setNewComment("");
      }

      // Award XP for commenting
      await supabase.from("student_xp").insert({
        user_id: userId,
        xp_points: 5,
        reason: "Posted a lesson comment",
        source_type: "comment",
        source_id: lessonId,
      });

      fetchComments();
    }
    setLoading(false);
  };

  const handleDelete = async (commentId: string) => {
    await supabase.from("lesson_comments").delete().eq("id", commentId);
    fetchComments();
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`flex gap-3 ${isReply ? "ml-10 mt-3" : ""}`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={comment.profile?.avatar_url || ""} />
        <AvatarFallback className="text-xs">
          {(comment.profile?.full_name || "S").charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              {comment.profile?.full_name || "Student"}
            </p>
            <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap">{comment.content}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {!isReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
            >
              <Reply className="h-3 w-3" />
              Reply
            </Button>
          )}
          {comment.user_id === userId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
              onClick={() => handleDelete(comment.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        {replyTo === comment.id && (
          <div className="flex gap-2 mt-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="min-h-[60px] text-sm"
            />
            <Button size="sm" onClick={() => handlePost(comment.id)} disabled={loading}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        )}
        {comment.replies?.map((reply) => renderComment(reply, true))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        Lesson Discussion ({comments.length})
      </h4>

      {/* New comment input */}
      <div className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Ask a question or share your thoughts..."
          className="min-h-[70px] text-sm"
        />
        <Button
          size="sm"
          className="self-end"
          onClick={() => handlePost()}
          disabled={loading || !newComment.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.map((c) => renderComment(c))}
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet. Be the first to start the discussion!
          </p>
        )}
      </div>
    </div>
  );
};

export default LessonDiscussion;
