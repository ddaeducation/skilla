import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, MessageCircle, Send, Trash2, ImagePlus, X } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload } from "@/hooks/useFileUpload";

interface Comment {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  image_url?: string | null;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
}

interface AnnouncementCommentsProps {
  announcementId: string;
  userId: string;
  commentsEnabled?: boolean;
}

const AnnouncementComments = ({ announcementId, userId, commentsEnabled = true }: AnnouncementCommentsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentImageUrl, setCommentImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { upload, uploading } = useFileUpload({
    bucket: "communication-uploads",
    folder: `comments/${userId}`,
    maxSize: 10,
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  });

  useEffect(() => {
    if (expanded) {
      fetchComments();
    }
  }, [announcementId, expanded]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("announcement_comments")
        .select("*")
        .eq("announcement_id", announcementId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch author profiles separately
      const authorIds = [...new Set((data || []).map((c) => c.author_id))];
      let profilesMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};

      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", authorIds);

        (profiles || []).forEach((p) => {
          profilesMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
        });
      }

      // Merge profiles into comments
      const commentsWithProfiles = (data || []).map((c) => ({
        ...c,
        profiles: profilesMap[c.author_id] || null,
      }));

      setComments(commentsWithProfiles as unknown as Comment[]);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file);
    if (url) {
      setCommentImageUrl(url);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("announcement_comments").insert({
        announcement_id: announcementId,
        author_id: userId,
        content: newComment.trim(),
        image_url: commentImageUrl || null,
      });

      if (error) throw error;

      setNewComment("");
      setCommentImageUrl("");
      fetchComments();
      toast({ title: "Comment added" });
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({ title: "Error", description: "Failed to add comment", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("announcement_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      setComments(comments.filter((c) => c.id !== commentId));
      toast({ title: "Comment deleted" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({ title: "Error", description: "Failed to delete comment", variant: "destructive" });
    }
  };

  if (!commentsEnabled) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="gap-2"
      >
        <MessageCircle className="h-4 w-4" />
        {expanded ? "Hide Comments" : `Comments ${comments.length > 0 ? `(${comments.length})` : ""}`}
      </Button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {comments.length > 0 && (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                        <AvatarFallback>
                          {(comment.profiles?.full_name || "U").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">
                            {comment.profiles?.full_name || "Unknown User"}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.created_at), "MMM d, h:mm a")}
                            </span>
                            {comment.author_id === userId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleDelete(comment.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm mt-1">{comment.content}</p>
                        {comment.image_url && (
                          <div className="mt-2">
                            <img
                              src={comment.image_url}
                              alt="Comment attachment"
                              className="max-w-xs h-auto rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(comment.image_url!, "_blank")}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment with Image Upload */}
              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                />
                {commentImageUrl && (
                  <div className="relative w-32 h-20 rounded-lg overflow-hidden border">
                    <img src={commentImageUrl} alt="Comment attachment" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-5 w-5"
                      onClick={() => setCommentImageUrl("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  </Button>
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={2}
                    className="resize-none flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={handleSubmit}
                    disabled={!newComment.trim() || submitting || uploading}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AnnouncementComments;
