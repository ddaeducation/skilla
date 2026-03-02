import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AIQuestionGeneratorProps {
  quizId: string;
  quizTitle: string;
  onQuestionsGenerated: () => void;
}

interface GeneratedQuestion {
  question_text: string;
  question_type: string;
  points: number;
  explanation: string;
  options?: { text: string; is_correct: boolean }[];
  selected?: boolean;
}

const questionTypeOptions = [
  { value: "single_choice", label: "Multiple Choice (single)" },
  { value: "multiple_choice", label: "Multiple Choice (multiple)" },
  { value: "true_false", label: "True / False" },
  { value: "fill_in", label: "Fill in the Blanks" },
  { value: "short_answer", label: "Short Answer" },
  { value: "matching", label: "Matching" },
  { value: "ordering", label: "Ordering / Sequencing" },
  { value: "drag_drop", label: "Drag into Buckets" },
];

export const AIQuestionGenerator = ({ quizId, quizTitle, onQuestionsGenerated }: AIQuestionGeneratorProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [topic, setTopic] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>(["single_choice", "true_false"]);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);

  const resetForm = () => {
    setTopic("");
    setAdditionalContext("");
    setQuestionCount(5);
    setDifficulty("intermediate");
    setSelectedQuestionTypes(["single_choice", "true_false"]);
    setGeneratedQuestions([]);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: "Error", description: "Please enter a topic", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-content-generator", {
        body: {
          type: "questions",
          topic,
          questionCount,
          questionTypes: selectedQuestionTypes,
          difficulty,
          additionalContext: additionalContext.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const questions = (data.data as GeneratedQuestion[]).map(q => ({ ...q, selected: true }));
      setGeneratedQuestions(questions);

      toast({ title: "Questions generated!", description: "Review and save the questions below." });
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({ title: "Error", description: error.message || "Failed to generate questions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuestions = async () => {
    const selectedQuestions = generatedQuestions.filter(q => q.selected);
    if (selectedQuestions.length === 0) {
      toast({ title: "Error", description: "Select at least one question to save", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Get current max order index
      const { data: existingQuestions } = await supabase
        .from("quiz_questions")
        .select("order_index")
        .eq("quiz_id", quizId)
        .order("order_index", { ascending: false })
        .limit(1);

      let startIndex = (existingQuestions?.[0]?.order_index ?? -1) + 1;

      for (let i = 0; i < selectedQuestions.length; i++) {
        const q = selectedQuestions[i];
        const { data: question, error: questionError } = await supabase
          .from("quiz_questions")
          .insert({
            quiz_id: quizId,
            question_text: q.question_text,
            question_type: q.question_type,
            points: q.points,
            explanation: q.explanation,
            order_index: startIndex + i,
          })
          .select()
          .single();

        if (questionError) throw questionError;

        // Insert options if applicable
        if (q.options && q.options.length > 0) {
          const optionsToInsert = q.options.map((opt, idx) => ({
            question_id: question.id,
            option_text: opt.text,
            is_correct: (q.question_type === "matching" || q.question_type === "ordering" || q.question_type === "drag_drop") ? true : (opt.is_correct ?? false),
            order_index: idx,
          }));

          const { error: optionsError } = await supabase.from("quiz_options").insert(optionsToInsert);
          if (optionsError) throw optionsError;
        }
      }

      toast({ title: "Success!", description: `${selectedQuestions.length} questions added to the quiz.` });
      onQuestionsGenerated();
      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ title: "Error", description: "Failed to save questions", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleQuestionSelection = (index: number) => {
    setGeneratedQuestions(prev => prev.map((q, i) => i === index ? { ...q, selected: !q.selected } : q));
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI Generate Questions
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Question Generator
          </DialogTitle>
          <DialogDescription>
            Generate questions for "{quizTitle}" using AI
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic / Subject *</Label>
              <Input
                id="topic"
                placeholder="e.g., Python Data Types"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Additional Context (Optional)</Label>
            <Textarea
              id="context"
              placeholder="Any specific focus areas or requirements..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="questionCount">Number of Questions</Label>
              <Input
                id="questionCount"
                type="number"
                min={1}
                max={20}
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
              />
            </div>
            <div className="space-y-2">
              <Label>Question Types</Label>
              <div className="flex flex-wrap gap-2">
                {questionTypeOptions.map((type) => (
                  <Badge
                    key={type.value}
                    variant={selectedQuestionTypes.includes(type.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedQuestionTypes(prev =>
                        prev.includes(type.value)
                          ? prev.filter(t => t !== type.value)
                          : [...prev, type.value]
                      );
                    }}
                  >
                    {type.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {generatedQuestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Generated Questions</h4>
                <span className="text-sm text-muted-foreground">
                  {generatedQuestions.filter(q => q.selected).length} selected
                </span>
              </div>
              {generatedQuestions.map((question, idx) => (
                <Card key={idx} className={`cursor-pointer transition-colors ${question.selected ? "border-primary" : "opacity-60"}`} onClick={() => toggleQuestionSelection(idx)}>
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <Checkbox checked={question.selected} onCheckedChange={() => toggleQuestionSelection(idx)} />
                      <div className="flex-1">
                        <p className="font-medium">{question.question_text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{question.question_type}</Badge>
                          <Badge variant="secondary" className="text-xs">{question.points} pts</Badge>
                        </div>
                        {question.options && question.question_type === "matching" ? (
                          <div className="mt-2 space-y-1">
                            {question.options.map((opt, optIdx) => {
                              const [left, right] = (opt.text || "").split("|||");
                              return (
                                <div key={optIdx} className="text-sm flex items-center gap-2">
                                  <span className="text-muted-foreground">{left}</span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="text-green-600 font-medium">{right}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : question.options ? (
                          <div className="mt-2 space-y-1">
                            {question.options.map((opt, optIdx) => (
                              <div key={optIdx} className={`text-sm ${opt.is_correct ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                                {opt.is_correct ? "✓" : "○"} {opt.text}
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {question.explanation && (
                          <p className="text-xs text-muted-foreground mt-2 italic">💡 {question.explanation}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

        </div>

        <div className="flex-shrink-0 flex gap-2 pt-4 border-t">
            {generatedQuestions.length === 0 ? (
              <Button onClick={handleGenerate} disabled={loading || !topic.trim()} className="w-full gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "Generating..." : "Generate Questions"}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setGeneratedQuestions([])} className="flex-1">
                  Regenerate
                </Button>
                <Button onClick={handleSaveQuestions} disabled={saving} className="flex-1 gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Done - Add {generatedQuestions.filter(q => q.selected).length} Questions
                </Button>
              </>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
