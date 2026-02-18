import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CourseDuplicateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle: string;
  onDuplicated: () => void;
}

export function CourseDuplicateDialog({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  onDuplicated,
}: CourseDuplicateDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState(`Copy of ${courseTitle}`);
  const [options, setOptions] = useState({
    sections: true,
    lessons: true,
    quizzes: true,
    assignments: true,
  });

  const toggle = (key: keyof typeof options) => {
    setOptions((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Lessons/quizzes/assignments require sections
      if (key === "sections" && !next.sections) {
        return { ...next, lessons: false, quizzes: false, assignments: false };
      }
      // Enable sections automatically when content is selected
      if ((key === "lessons" || key === "quizzes" || key === "assignments") && next[key]) {
        return { ...next, sections: true };
      }
      return next;
    });
  };

  const handleDuplicate = async () => {
    if (!newTitle.trim()) {
      toast({ title: "Please enter a title", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("duplicate-course", {
        body: {
          courseId,
          newTitle: newTitle.trim(),
          options,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message || "Duplication failed");
      }

      toast({ title: "Course duplicated!", description: `"${newTitle}" has been created as a draft.` });
      onOpenChange(false);
      onDuplicated();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Course
          </DialogTitle>
          <DialogDescription>
            Choose what to copy from <strong>{courseTitle}</strong>. The duplicate will be saved as a draft.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="new-title">New course title</Label>
            <Input
              id="new-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Copy of ..."
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Content to copy</p>

            <div className="rounded-lg border p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={options.sections}
                  onCheckedChange={() => toggle("sections")}
                />
                <div>
                  <p className="text-sm font-medium">Sections (Modules & Units)</p>
                  <p className="text-xs text-muted-foreground">Course structure</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={options.lessons}
                  onCheckedChange={() => toggle("lessons")}
                />
                <div>
                  <p className="text-sm font-medium">Lessons</p>
                  <p className="text-xs text-muted-foreground">Video, text, PDF and other lesson content</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={options.quizzes}
                  onCheckedChange={() => toggle("quizzes")}
                />
                <div>
                  <p className="text-sm font-medium">Quizzes &amp; Questions</p>
                  <p className="text-xs text-muted-foreground">All quiz questions and answer options</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={options.assignments}
                  onCheckedChange={() => toggle("assignments")}
                />
                <div>
                  <p className="text-sm font-medium">Assignments</p>
                  <p className="text-xs text-muted-foreground">Assignment details and rubrics</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-4 w-4 mr-2" />}
            Duplicate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
