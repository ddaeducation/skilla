import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RichTextEditor } from "@/components/RichTextEditor";
import { QuizQuestionManager } from "@/components/QuizQuestionManager";

interface LessonData {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  duration_minutes: number | null;
  is_free_preview: boolean;
  order_index: number;
  section_id: string | null;
  required_watch_percentage: number | null;
  is_locked: boolean;
  unlock_at: string | null;
}

interface QuizData {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  order_index: number;
  section_id: string | null;
}

interface AssignmentData {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  max_score: number;
  due_date: string | null;
  order_index: number;
  section_id: string | null;
}

interface ContentItemEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'lesson' | 'quiz' | 'assignment';
  itemId: string;
  onSaved: () => void;
}

export const ContentItemEditDialog = ({
  open,
  onOpenChange,
  type,
  itemId,
  onSaved,
}: ContentItemEditDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showQuizQuestions, setShowQuizQuestions] = useState(false);

  // Lesson form state
  const [lessonForm, setLessonForm] = useState<LessonData | null>(null);

  // Quiz form state
  const [quizForm, setQuizForm] = useState<QuizData | null>(null);

  // Assignment form state
  const [assignmentForm, setAssignmentForm] = useState<AssignmentData | null>(null);

  // Fetch data when dialog opens
  useEffect(() => {
    if (open && itemId) {
      fetchItemData();
      setShowQuizQuestions(false);
    }
  }, [open, itemId, type]);

  const fetchItemData = async () => {
    setLoading(true);
    try {
      if (type === 'lesson') {
        const { data, error } = await supabase
          .from("lesson_content")
          .select("*")
          .eq("id", itemId)
          .maybeSingle();
        if (error) throw error;
        if (data) setLessonForm(data);
      } else if (type === 'quiz') {
        const { data, error } = await supabase
          .from("quizzes")
          .select("*")
          .eq("id", itemId)
          .maybeSingle();
        if (error) throw error;
        if (data) setQuizForm(data);
      } else if (type === 'assignment') {
        const { data, error } = await supabase
          .from("assignments")
          .select("*")
          .eq("id", itemId)
          .maybeSingle();
        if (error) throw error;
        if (data) setAssignmentForm(data);
      }
    } catch (error) {
      console.error("Error fetching item:", error);
      toast({ title: "Error", description: "Failed to load item", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (type === 'lesson' && lessonForm) {
        const { error } = await supabase
          .from("lesson_content")
          .update({
            title: lessonForm.title,
            description: lessonForm.description,
            content_type: lessonForm.content_type,
            content_url: lessonForm.content_url,
            content_text: lessonForm.content_text,
            duration_minutes: lessonForm.duration_minutes,
            is_free_preview: lessonForm.is_free_preview,
            required_watch_percentage: lessonForm.required_watch_percentage,
          })
          .eq("id", itemId);
        if (error) throw error;
        toast({ title: "Lesson updated" });
      } else if (type === 'quiz' && quizForm) {
        const { error } = await supabase
          .from("quizzes")
          .update({
            title: quizForm.title,
            description: quizForm.description,
            passing_score: quizForm.passing_score,
            time_limit_minutes: quizForm.time_limit_minutes,
            max_attempts: quizForm.max_attempts,
          })
          .eq("id", itemId);
        if (error) throw error;
        toast({ title: "Quiz updated" });
      } else if (type === 'assignment' && assignmentForm) {
        const { error } = await supabase
          .from("assignments")
          .update({
            title: assignmentForm.title,
            description: assignmentForm.description,
            instructions: assignmentForm.instructions,
            max_score: assignmentForm.max_score,
            due_date: assignmentForm.due_date,
          })
          .eq("id", itemId);
        if (error) throw error;
        toast({ title: "Assignment updated" });
      }
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving:", error);
      toast({ title: "Error", description: "Failed to save changes", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'lesson': return "Edit Lesson";
      case 'quiz': return "Edit Quiz";
      case 'assignment': return "Edit Assignment";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Lesson Form */}
            {type === 'lesson' && lessonForm && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={lessonForm.description || ""}
                    onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Content Type</Label>
                    <Select
                      value={lessonForm.content_type}
                      onValueChange={(value) => setLessonForm({ ...lessonForm, content_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text/Rich Content</SelectItem>
                        <SelectItem value="video">Video Upload</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="vimeo">Vimeo</SelectItem>
                        <SelectItem value="embed">Embedded Video (Distraction-Free)</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={lessonForm.duration_minutes || ""}
                      onChange={(e) => setLessonForm({ ...lessonForm, duration_minutes: parseInt(e.target.value) || null })}
                    />
                  </div>
                </div>
                {(lessonForm.content_type === 'youtube' || lessonForm.content_type === 'vimeo' || 
                  lessonForm.content_type === 'video' || lessonForm.content_type === 'pdf' || 
                  lessonForm.content_type === 'image' || lessonForm.content_type === 'embed') && (
                  <div className="space-y-2">
                    <Label htmlFor="content_url">
                      {lessonForm.content_type === 'youtube' ? 'YouTube URL or Embed URL' :
                       lessonForm.content_type === 'vimeo' ? 'Vimeo URL' :
                       lessonForm.content_type === 'embed' ? 'Embed URL (Distraction-Free)' :
                       lessonForm.content_type === 'video' ? 'Video URL or Embed URL' : 'Content URL'}
                    </Label>
                    <Input
                      id="content_url"
                      value={lessonForm.content_url || ""}
                      onChange={(e) => setLessonForm({ ...lessonForm, content_url: e.target.value })}
                      placeholder={
                        lessonForm.content_type === 'youtube' ? 'https://www.youtube.com/watch?v=... or embed URL' :
                        lessonForm.content_type === 'video' ? 'Upload URL or paste embed URL (e.g. YouTube embed)' :
                        'Enter URL...'
                      }
                    />
                    {(lessonForm.content_type === 'youtube' || lessonForm.content_type === 'video') && (
                      <p className="text-xs text-muted-foreground">
                        Paste a YouTube watch URL, share URL, embed URL, or any video embed link
                      </p>
                    )}
                  </div>
                )}
                <div className="space-y-2 flex-1">
                  <Label>{lessonForm.content_type === 'text' ? 'Content' : 'Supplemental Notes / Content'}</Label>
                  <RichTextEditor
                    value={lessonForm.content_text || ""}
                    onChange={(value) => setLessonForm({ ...lessonForm, content_text: value })}
                    minHeight={lessonForm.content_type === 'text' ? "400px" : "200px"}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="free_preview"
                    checked={lessonForm.is_free_preview}
                    onCheckedChange={(checked) => setLessonForm({ ...lessonForm, is_free_preview: checked })}
                  />
                  <Label htmlFor="free_preview">Free Preview</Label>
                </div>
                {['video', 'youtube', 'vimeo', 'embed'].includes(lessonForm.content_type) && (
                  <div className="space-y-2">
                    <Label htmlFor="watch_percentage">Required Watch Percentage (%)</Label>
                    <Input
                      id="watch_percentage"
                      type="number"
                      min={0}
                      max={100}
                      value={lessonForm.required_watch_percentage ?? ""}
                      onChange={(e) => setLessonForm({ 
                        ...lessonForm, 
                        required_watch_percentage: e.target.value ? parseInt(e.target.value) : null 
                      })}
                      placeholder="e.g. 80 (leave empty for no requirement)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Students must watch this percentage of the video before they can mark the lesson complete. Leave empty to allow immediate completion.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Quiz Form */}
            {type === 'quiz' && quizForm && (
              <>
                {!showQuizQuestions ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={quizForm.title}
                        onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={quizForm.description || ""}
                        onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="passing_score">Passing Score (%)</Label>
                        <Input
                          id="passing_score"
                          type="number"
                          min={0}
                          max={100}
                          value={quizForm.passing_score}
                          onChange={(e) => setQuizForm({ ...quizForm, passing_score: parseInt(e.target.value) || 70 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time_limit">Time Limit (minutes)</Label>
                        <Input
                          id="time_limit"
                          type="number"
                          value={quizForm.time_limit_minutes || ""}
                          onChange={(e) => setQuizForm({ ...quizForm, time_limit_minutes: parseInt(e.target.value) || null })}
                          placeholder="No limit"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="max_attempts">Max Attempts</Label>
                        <Input
                          id="max_attempts"
                          type="number"
                          value={quizForm.max_attempts || ""}
                          onChange={(e) => setQuizForm({ ...quizForm, max_attempts: parseInt(e.target.value) || null })}
                          placeholder="Unlimited"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowQuizQuestions(true)}
                    >
                      Manage Quiz Questions
                    </Button>
                  </>
                ) : (
                  <div className="flex-1">
                    <QuizQuestionManager
                      quizId={itemId}
                      quizTitle={quizForm.title}
                      passingScore={quizForm.passing_score}
                      timeLimitMinutes={quizForm.time_limit_minutes}
                      quizDescription={quizForm.description}
                      onClose={() => setShowQuizQuestions(false)}
                    />
                  </div>
                )}
              </>
            )}

            {/* Assignment Form */}
            {type === 'assignment' && assignmentForm && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={assignmentForm.title}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={assignmentForm.description || ""}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <Label>Instructions</Label>
                  <RichTextEditor
                    value={assignmentForm.instructions || ""}
                    onChange={(value) => setAssignmentForm({ ...assignmentForm, instructions: value })}
                    minHeight="300px"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max_score">Max Score</Label>
                    <Input
                      id="max_score"
                      type="number"
                      value={assignmentForm.max_score}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, max_score: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="datetime-local"
                      value={assignmentForm.due_date ? assignmentForm.due_date.slice(0, 16) : ""}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value || null })}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {!showQuizQuestions && (
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
