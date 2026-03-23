import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Clock, Sparkles, GripVertical } from "lucide-react";

interface VideoQuizPoint {
  id: string;
  lesson_id: string;
  course_id: string;
  timestamp_seconds: number;
  question_text: string;
  question_type: string;
  points: number;
  explanation: string | null;
  behavior: string;
  counts_toward_grade: boolean;
  order_index: number;
}

interface VideoQuizOption {
  id?: string;
  video_quiz_point_id?: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

interface VideoQuizPointManagerProps {
  lessonId: string;
  courseId: string;
  durationMinutes?: number | null;
}

const QUESTION_TYPES = [
  { value: "single_choice", label: "Single Choice" },
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True/False" },
  { value: "fill_in", label: "Fill in the Blank" },
  { value: "short_answer", label: "Short Answer" },
  { value: "matching", label: "Matching" },
  { value: "ordering", label: "Ordering" },
  { value: "drag_drop", label: "Drag into Buckets" },
];

const BEHAVIOR_OPTIONS = [
  { value: "must_correct", label: "Must answer correctly" },
  { value: "any_answer", label: "Any answer continues" },
  { value: "skippable", label: "Skippable" },
];

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const VideoQuizPointManager = ({ lessonId, courseId, durationMinutes }: VideoQuizPointManagerProps) => {
  const { toast } = useToast();
  const [quizPoints, setQuizPoints] = useState<VideoQuizPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<VideoQuizPoint | null>(null);
  const [editOptions, setEditOptions] = useState<VideoQuizOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form state for new/edit
  const [form, setForm] = useState({
    timestamp_seconds: 0,
    question_text: "",
    question_type: "single_choice",
    points: 1,
    explanation: "",
    behavior: "any_answer",
    counts_toward_grade: false,
  });

  useEffect(() => {
    fetchQuizPoints();
  }, [lessonId]);

  const fetchQuizPoints = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("video_quiz_points")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("timestamp_seconds", { ascending: true });
    if (!error && data) setQuizPoints(data as VideoQuizPoint[]);
    setLoading(false);
  };

  const fetchOptions = async (pointId: string) => {
    const { data } = await supabase
      .from("video_quiz_point_options")
      .select("*")
      .eq("video_quiz_point_id", pointId)
      .order("order_index");
    return (data || []) as VideoQuizOption[];
  };

  const openNewDialog = () => {
    setEditingPoint(null);
    setForm({
      timestamp_seconds: 0,
      question_text: "",
      question_type: "single_choice",
      points: 1,
      explanation: "",
      behavior: "any_answer",
      counts_toward_grade: false,
    });
    setEditOptions([
      { option_text: "", is_correct: true, order_index: 0 },
      { option_text: "", is_correct: false, order_index: 1 },
    ]);
    setEditDialogOpen(true);
  };

  const openEditDialog = async (point: VideoQuizPoint) => {
    setEditingPoint(point);
    setForm({
      timestamp_seconds: point.timestamp_seconds,
      question_text: point.question_text,
      question_type: point.question_type,
      points: point.points,
      explanation: point.explanation || "",
      behavior: point.behavior,
      counts_toward_grade: point.counts_toward_grade,
    });
    const opts = await fetchOptions(point.id);
    setEditOptions(opts.length > 0 ? opts : [
      { option_text: "", is_correct: true, order_index: 0 },
      { option_text: "", is_correct: false, order_index: 1 },
    ]);
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.question_text.trim()) {
      toast({ title: "Error", description: "Question text is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let pointId: string;
      if (editingPoint) {
        const { error } = await supabase
          .from("video_quiz_points")
          .update({
            timestamp_seconds: form.timestamp_seconds,
            question_text: form.question_text,
            question_type: form.question_type,
            points: form.points,
            explanation: form.explanation || null,
            behavior: form.behavior,
            counts_toward_grade: form.counts_toward_grade,
          })
          .eq("id", editingPoint.id);
        if (error) throw error;
        pointId = editingPoint.id;
        // Delete old options
        await supabase.from("video_quiz_point_options").delete().eq("video_quiz_point_id", pointId);
      } else {
        const { data, error } = await supabase
          .from("video_quiz_points")
          .insert({
            lesson_id: lessonId,
            course_id: courseId,
            timestamp_seconds: form.timestamp_seconds,
            question_text: form.question_text,
            question_type: form.question_type,
            points: form.points,
            explanation: form.explanation || null,
            behavior: form.behavior,
            counts_toward_grade: form.counts_toward_grade,
            order_index: quizPoints.length,
          })
          .select("id")
          .single();
        if (error) throw error;
        pointId = data.id;
      }

      // Insert options
      const needsOptions = ["single_choice", "multiple_choice", "true_false", "matching", "ordering", "drag_drop"].includes(form.question_type);
      if (needsOptions && editOptions.length > 0) {
        const optionsToInsert = editOptions.map((o, i) => ({
          video_quiz_point_id: pointId,
          option_text: o.option_text,
          is_correct: o.is_correct,
          order_index: i,
        }));
        const { error: optError } = await supabase.from("video_quiz_point_options").insert(optionsToInsert);
        if (optError) throw optError;
      }

      toast({ title: editingPoint ? "Quiz point updated" : "Quiz point added" });
      setEditDialogOpen(false);
      fetchQuizPoints();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("video_quiz_points").delete().eq("id", id);
    if (!error) {
      toast({ title: "Quiz point deleted" });
      fetchQuizPoints();
    }
  };

  const handleAIGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-video-quiz", {
        body: { lessonId, courseId, durationMinutes },
      });
      if (error) throw error;
      toast({ title: "AI quiz points generated!", description: `${data?.count || 0} questions added` });
      fetchQuizPoints();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to generate", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const addOption = () => {
    setEditOptions([...editOptions, { option_text: "", is_correct: false, order_index: editOptions.length }]);
  };

  const removeOption = (idx: number) => {
    setEditOptions(editOptions.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, field: string, value: any) => {
    setEditOptions(editOptions.map((o, i) => {
      if (i !== idx) {
        if (field === "is_correct" && value === true && form.question_type === "single_choice") {
          return { ...o, is_correct: false };
        }
        return o;
      }
      return { ...o, [field]: value };
    }));
  };

  const totalDurationSecs = (durationMinutes || 10) * 60;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Video Pop-up Quiz Points ({quizPoints.length})
        </h4>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAIGenerate} disabled={generating}>
            <Sparkles className="w-3 h-3 mr-1" />
            {generating ? "Generating..." : "AI Generate"}
          </Button>
          <Button size="sm" onClick={openNewDialog}>
            <Plus className="w-3 h-3 mr-1" />
            Add Quiz Point
          </Button>
        </div>
      </div>

      {/* Timeline visualization */}
      {quizPoints.length > 0 && (
        <div className="relative bg-muted/50 rounded-lg p-3">
          <div className="relative h-8 bg-muted rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 rounded-full" />
            {quizPoints.map((point) => {
              const pos = Math.min(95, Math.max(2, (point.timestamp_seconds / totalDurationSecs) * 100));
              return (
                <button
                  key={point.id}
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full border-2 border-background shadow-md hover:scale-125 transition-transform cursor-pointer z-10"
                  style={{ left: `${pos}%` }}
                  onClick={() => openEditDialog(point)}
                  title={`${formatTime(point.timestamp_seconds)} — ${point.question_text.slice(0, 40)}...`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0:00</span>
            <span>{formatTime(totalDurationSecs)}</span>
          </div>
        </div>
      )}

      {/* Quiz points list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading quiz points...</p>
      ) : quizPoints.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No quiz points yet. Add questions at specific timestamps to create pop-up quizzes during video playback.
        </p>
      ) : (
        <div className="space-y-2">
          {quizPoints.map((point) => (
            <Card key={point.id} className="group">
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                  {formatTime(point.timestamp_seconds)}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{point.question_text}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs">{point.question_type.replace(/_/g, " ")}</Badge>
                    <Badge variant="outline" className="text-xs">{point.behavior.replace(/_/g, " ")}</Badge>
                    {point.counts_toward_grade && (
                      <Badge className="text-xs">Graded</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(point)}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(point.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Add Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPoint ? "Edit Quiz Point" : "Add Quiz Point"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Timestamp (seconds)</Label>
                <Input
                  type="number"
                  min={0}
                  max={totalDurationSecs}
                  value={form.timestamp_seconds}
                  onChange={(e) => setForm({ ...form, timestamp_seconds: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Appears at {formatTime(form.timestamp_seconds)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={form.question_type} onValueChange={(v) => {
                  setForm({ ...form, question_type: v });
                  if (v === "true_false") {
                    setEditOptions([
                      { option_text: "True", is_correct: true, order_index: 0 },
                      { option_text: "False", is_correct: false, order_index: 1 },
                    ]);
                  }
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Question Text</Label>
              <Textarea
                value={form.question_text}
                onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                rows={2}
              />
            </div>

            {/* Options section for relevant types */}
            {["single_choice", "multiple_choice", "true_false", "matching", "ordering", "drag_drop"].includes(form.question_type) && (
              <div className="space-y-2">
                <Label>Options</Label>
                {editOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      className="flex-1"
                      value={opt.option_text}
                      onChange={(e) => updateOption(idx, "option_text", e.target.value)}
                      placeholder={
                        form.question_type === "matching" ? "Left|||Right" :
                        form.question_type === "drag_drop" ? "Item|||Bucket" :
                        `Option ${idx + 1}`
                      }
                    />
                    {!["matching", "ordering", "drag_drop"].includes(form.question_type) && (
                      <Switch
                        checked={opt.is_correct}
                        onCheckedChange={(checked) => updateOption(idx, "is_correct", checked)}
                      />
                    )}
                    {editOptions.length > 2 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeOption(idx)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addOption}>
                  <Plus className="w-3 h-3 mr-1" /> Add Option
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label>Explanation (shown after answering)</Label>
              <Textarea
                value={form.explanation}
                onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                rows={2}
                placeholder="Optional explanation..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Points</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.points}
                  onChange={(e) => setForm({ ...form, points: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Behavior</Label>
                <Select value={form.behavior} onValueChange={(v) => setForm({ ...form, behavior: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BEHAVIOR_OPTIONS.map((b) => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex flex-col justify-end">
                <div className="flex items-center gap-2">
                  <Switch
                    id="graded"
                    checked={form.counts_toward_grade}
                    onCheckedChange={(c) => setForm({ ...form, counts_toward_grade: c })}
                  />
                  <Label htmlFor="graded" className="text-sm">Counts toward grade</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingPoint ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
