import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StudentNotetakerProps {
  userId: string;
  courseId: string;
  lessonId: string;
}

export const StudentNotetaker = ({ userId, courseId, lessonId }: StudentNotetakerProps) => {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchNote = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("student_notes" as any)
        .select("content")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .eq("lesson_id", lessonId)
        .maybeSingle();

      if (data) setContent((data as any).content || "");
      setLoading(false);
    };
    fetchNote();
  }, [userId, courseId, lessonId]);

  const saveNote = useCallback(async (text: string) => {
    setSaving(true);
    setSaved(false);

    const { data: existing } = await supabase
      .from("student_notes" as any)
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .eq("lesson_id", lessonId)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("student_notes" as any)
        .update({ content: text, updated_at: new Date().toISOString() } as any)
        .eq("id", (existing as any).id));
    } else {
      ({ error } = await supabase
        .from("student_notes" as any)
        .insert({ user_id: userId, course_id: courseId, lesson_id: lessonId, content: text } as any));
    }

    setSaving(false);
    if (error) {
      toast({ title: "Failed to save note", variant: "destructive" });
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [userId, courseId, lessonId, toast]);

  const handleChange = (value: string) => {
    setContent(value);
    setSaved(false);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => saveNote(value), 1500);
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Write your notes for this lesson. Notes are auto-saved.
        </p>
        <div className="flex items-center gap-2">
          {saving && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving…
            </Badge>
          )}
          {saved && (
            <Badge variant="secondary" className="gap-1 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" /> Saved
            </Badge>
          )}
        </div>
      </div>
      <Textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Start writing your notes here..."
        className="min-h-[300px] resize-y text-base leading-relaxed"
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => saveNote(content)}
          disabled={saving}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          Save Now
        </Button>
      </div>
    </div>
  );
};
