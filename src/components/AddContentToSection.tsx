import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, FileText, Video, Youtube, Image, FileQuestion, ClipboardList, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/FileUpload";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AddContentToSectionProps {
  courseId: string;
  sectionId: string;
  onContentCreated: () => void;
}

const contentTypes = [
  { value: "text", label: "Text/Notes", icon: FileText },
  { value: "note", label: "Note", icon: FileText },
  { value: "video", label: "Video", icon: Video },
  { value: "youtube", label: "YouTube", icon: Youtube },
  { value: "vimeo", label: "Vimeo", icon: Video },
  { value: "embed", label: "Embedded Video", icon: Video },
  { value: "pdf", label: "PDF Document", icon: FileText },
  { value: "image", label: "Image/Photo", icon: Image },
  { value: "python", label: "Python Code", icon: FileText },
  { value: "sql", label: "SQL Code", icon: FileText },
  { value: "quiz", label: "Quiz", icon: FileQuestion },
  { value: "assignment", label: "Assignment", icon: ClipboardList },
];

export const AddContentToSection = ({ courseId, sectionId, onContentCreated }: AddContentToSectionProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    content_type: "text",
    content_url: "",
    content_text: "",
    duration_minutes: 0,
    is_free_preview: false,
    // Quiz-specific
    passing_score: 70,
    time_limit_minutes: 0,
    // Assignment-specific
    instructions: "",
    rubrics: "",
    max_score: 100,
    due_date: undefined as Date | undefined,
  });

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      content_type: "text",
      content_url: "",
      content_text: "",
      duration_minutes: 0,
      is_free_preview: false,
      passing_score: 70,
      time_limit_minutes: 0,
      instructions: "",
      rubrics: "",
      max_score: 100,
      due_date: undefined,
    });
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (form.content_type === "quiz") {
        // Get max order index for quizzes
        const { data: existingQuizzes } = await supabase
          .from("quizzes")
          .select("order_index")
          .eq("course_id", courseId)
          .order("order_index", { ascending: false })
          .limit(1);

        const orderIndex = (existingQuizzes?.[0]?.order_index ?? -1) + 1;

        const { error } = await supabase.from("quizzes").insert({
          course_id: courseId,
          section_id: sectionId,
          title: form.title,
          description: form.description || null,
          passing_score: form.passing_score,
          time_limit_minutes: form.time_limit_minutes || null,
          order_index: orderIndex,
        });

        if (error) throw error;
        toast({ title: "Quiz created!" });
      } else if (form.content_type === "assignment") {
        // Get max order index for assignments
        const { data: existingAssignments } = await supabase
          .from("assignments")
          .select("order_index")
          .eq("course_id", courseId)
          .order("order_index", { ascending: false })
          .limit(1);

        const orderIndex = (existingAssignments?.[0]?.order_index ?? -1) + 1;

        const { error } = await supabase.from("assignments").insert({
          course_id: courseId,
          section_id: sectionId,
          title: form.title,
          description: form.description || null,
          instructions: form.instructions || null,
          rubrics: form.rubrics || null,
          attachment_url: form.content_url || null,
          max_score: form.max_score,
          due_date: form.due_date ? form.due_date.toISOString() : null,
          order_index: orderIndex,
        });

        if (error) throw error;
        toast({ title: "Assignment created!" });
      } else {
        // Regular lesson content
        const { data: existingLessons } = await supabase
          .from("lesson_content")
          .select("order_index")
          .eq("course_id", courseId)
          .order("order_index", { ascending: false })
          .limit(1);

        const orderIndex = (existingLessons?.[0]?.order_index ?? -1) + 1;

        const { error } = await supabase.from("lesson_content").insert({
          course_id: courseId,
          section_id: sectionId,
          title: form.title,
          description: form.description || null,
          content_type: form.content_type,
          content_url: form.content_url || null,
          content_text: form.content_text || null,
          duration_minutes: form.duration_minutes || null,
          is_free_preview: form.is_free_preview,
          order_index: orderIndex,
        });

        if (error) throw error;
        toast({ title: "Content created!" });
      }

      onContentCreated();
      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ title: "Error", description: error.message || "Failed to save content", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isQuiz = form.content_type === "quiz";
  const isAssignment = form.content_type === "assignment";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          <Plus className="h-3 w-3 mr-1" />
          Add Content
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Add Content</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Content title"
              />
            </div>
            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select value={form.content_type} onValueChange={(v) => setForm({ ...form, content_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description"
            />
          </div>

          {/* Lesson-specific fields */}
          {!isQuiz && !isAssignment && (
            <>
              {form.content_type === "youtube" && (
                <div className="space-y-2">
                  <Label>YouTube URL or Embed Code</Label>
                  <Input
                    value={form.content_url}
                    onChange={(e) => setForm({ ...form, content_url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=... or embed URL"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste a YouTube watch URL, share URL, or embed URL
                  </p>
                </div>
              )}

              {form.content_type === "vimeo" && (
                <div className="space-y-2">
                  <Label>Vimeo URL</Label>
                  <Input
                    value={form.content_url}
                    onChange={(e) => setForm({ ...form, content_url: e.target.value })}
                    placeholder="https://vimeo.com/..."
                  />
                </div>
              )}

              {form.content_type === "embed" && (
                <div className="space-y-2">
                  <Label>Embed URL (Distraction-Free)</Label>
                  <Input
                    value={form.content_url}
                    onChange={(e) => setForm({ ...form, content_url: e.target.value })}
                    placeholder="Paste any video embed URL..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste a YouTube embed, Vimeo, or any iframe-compatible video URL. Will play distraction-free without related videos or suggestions.
                  </p>
                </div>
              )}

              {(form.content_type === "video" || form.content_type === "pdf" || form.content_type === "image") && (
                <div className="space-y-4">
                  <FileUpload
                    value={form.content_url}
                    onChange={(url) => setForm({ ...form, content_url: url })}
                    folder="lessons"
                    accept={
                      form.content_type === "video"
                        ? ".mp4,.webm,.mov"
                        : form.content_type === "pdf"
                        ? ".pdf"
                        : ".jpg,.jpeg,.png,.gif,.webp"
                    }
                  />
                  {form.content_type === "video" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Separator className="flex-1" />
                        <span className="text-xs text-muted-foreground">OR paste embed URL</span>
                        <Separator className="flex-1" />
                      </div>
                      <Input
                        value={form.content_url}
                        onChange={(e) => setForm({ ...form, content_url: e.target.value })}
                        placeholder="https://www.youtube.com/embed/... or any video embed URL"
                      />
                      <p className="text-xs text-muted-foreground">
                        Paste a YouTube embed URL, Vimeo URL, or any video embed link
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 flex-1">
                <Label>Content</Label>
                <RichTextEditor
                  value={form.content_text}
                  onChange={(val) => setForm({ ...form, content_text: val })}
                  placeholder="Write your lesson content here..."
                  minHeight="400px"
                  contentContext="lesson"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    checked={form.is_free_preview}
                    onCheckedChange={(checked) => setForm({ ...form, is_free_preview: checked })}
                  />
                  <Label>Free Preview</Label>
                </div>
              </div>
            </>
          )}

          {/* Quiz-specific fields */}
          {isQuiz && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Passing Score (%)</Label>
                <Input
                  type="number"
                  value={form.passing_score}
                  onChange={(e) => setForm({ ...form, passing_score: parseInt(e.target.value) || 70 })}
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Time Limit (minutes, 0 = no limit)</Label>
                <Input
                  type="number"
                  value={form.time_limit_minutes}
                  onChange={(e) => setForm({ ...form, time_limit_minutes: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
            </div>
          )}

          {/* Assignment-specific fields */}
          {isAssignment && (
            <>
              <div className="space-y-2 flex-1">
                <Label>Instructions</Label>
                <RichTextEditor
                  value={form.instructions}
                  onChange={(val) => setForm({ ...form, instructions: val })}
                  placeholder="Write assignment instructions with headings, paragraphs, links, and formatting..."
                  minHeight="300px"
                  contentContext="assignment_instructions"
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label>Rubrics (Grading Criteria)</Label>
                <RichTextEditor
                  value={form.rubrics}
                  onChange={(val) => setForm({ ...form, rubrics: val })}
                  placeholder="Define grading rubrics with criteria, point breakdowns, and expectations..."
                  minHeight="200px"
                  contentContext="rubrics"
                />
              </div>
              <div className="space-y-2">
                <Label>Attachment (PDF, IPYNB, DOCX, ZIP, etc.)</Label>
                <FileUpload
                  value={form.content_url}
                  onChange={(url) => setForm({ ...form, content_url: url })}
                  folder="assignments"
                  accept=".pdf,.ipynb,.docx,.doc,.xlsx,.xls,.csv,.zip,.rar,.pptx,.ppt,.txt,.py,.r,.json,.html"
                  label="Assignment File"
                  placeholder="Upload a file or enter URL"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Score</Label>
                  <Input
                    type="number"
                    value={form.max_score}
                    onChange={(e) => setForm({ ...form, max_score: parseInt(e.target.value) || 100 })}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date (optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !form.due_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.due_date ? format(form.due_date, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={form.due_date}
                        onSelect={(date) => setForm({ ...form, due_date: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Content
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
