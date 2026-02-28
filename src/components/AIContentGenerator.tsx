import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2, BookOpen, FileQuestion, ClipboardList, Wand2, Check, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RichTextEditor } from "@/components/RichTextEditor";

interface AIContentGeneratorProps {
  courseId: string;
  courseName: string;
  sectionId?: string;
  onContentGenerated: () => void;
}

interface GeneratedLesson {
  title: string;
  description: string;
  content_text: string;
  duration_minutes: number;
  selected?: boolean;
}

interface GeneratedQuiz {
  title: string;
  description: string;
  passing_score: number;
  questions: GeneratedQuestion[];
}

interface GeneratedQuestion {
  question_text: string;
  question_type: string;
  points: number;
  explanation: string;
  options?: { text: string; is_correct: boolean }[];
  selected?: boolean;
}

interface GeneratedAssignment {
  title: string;
  description: string;
  instructions: string;
  max_score: number;
  rubric?: { criteria: string; points: number; description: string }[];
}

const questionTypeOptions = [
  { value: "single_choice", label: "Multiple Choice (single)" },
  { value: "multiple_choice", label: "Multiple Choice (multiple)" },
  { value: "true_false", label: "True / False" },
  { value: "fill_in", label: "Fill in the Blanks" },
  { value: "short_answer", label: "Short Answer" },
  { value: "matching", label: "Matching" },
];

export const AIContentGenerator = ({ courseId, courseName, sectionId, onContentGenerated }: AIContentGeneratorProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"lesson" | "quiz" | "assignment">("lesson");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [regeneratingAssignment, setRegeneratingAssignment] = useState(false);
  const [regeneratingAll, setRegeneratingAll] = useState(false);

  // Common form fields
  const [topic, setTopic] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");

  // Lesson-specific
  const [lessonCount, setLessonCount] = useState(5);
  const [generatedLessons, setGeneratedLessons] = useState<GeneratedLesson[]>([]);

  // Quiz-specific
  const [questionCount, setQuestionCount] = useState(5);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>(["single_choice", "true_false"]);
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null);

  // Assignment-specific
  const [generatedAssignment, setGeneratedAssignment] = useState<GeneratedAssignment | null>(null);

  const resetForm = () => {
    setTopic("");
    setAdditionalContext("");
    setDifficulty("intermediate");
    setLessonCount(5);
    setQuestionCount(5);
    setSelectedQuestionTypes(["single_choice", "true_false"]);
    setGeneratedLessons([]);
    setGeneratedQuiz(null);
    setGeneratedAssignment(null);
    setRegeneratingIndex(null);
    setRegeneratingAssignment(false);
    setRegeneratingAll(false);
  };

  const handleRegenerateAll = async () => {
    if (!topic.trim()) {
      toast({ title: "Error", description: "Topic is required to regenerate", variant: "destructive" });
      return;
    }

    setRegeneratingAll(true);
    try {
      // Regenerate based on which content type has generated content
      const promises: Promise<void>[] = [];

      if (generatedLessons.length > 0) {
        promises.push(
          (async () => {
            const { data, error } = await supabase.functions.invoke("ai-content-generator", {
              body: {
                type: "lesson",
                topic,
                courseName,
                lessonCount,
                difficulty,
                additionalContext: additionalContext.trim() || undefined,
              },
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);
            const lessons = (data.data as GeneratedLesson[]).map((l, i) => ({ 
              ...l, 
              selected: generatedLessons[i]?.selected ?? true 
            }));
            setGeneratedLessons(lessons);
          })()
        );
      }

      if (generatedQuiz) {
        promises.push(
          (async () => {
            const { data, error } = await supabase.functions.invoke("ai-content-generator", {
              body: {
                type: "quiz",
                topic,
                courseName,
                questionCount,
                questionTypes: selectedQuestionTypes,
                difficulty,
                additionalContext: additionalContext.trim() || undefined,
              },
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);
            const quiz = data.data as GeneratedQuiz;
            quiz.questions = quiz.questions.map((q, i) => ({ 
              ...q, 
              selected: generatedQuiz.questions[i]?.selected ?? true 
            }));
            setGeneratedQuiz(quiz);
          })()
        );
      }

      if (generatedAssignment) {
        promises.push(
          (async () => {
            const { data, error } = await supabase.functions.invoke("ai-content-generator", {
              body: {
                type: "assignment",
                topic,
                courseName,
                difficulty,
                additionalContext: additionalContext.trim() || undefined,
              },
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);
            setGeneratedAssignment(data.data as GeneratedAssignment);
          })()
        );
      }

      if (promises.length === 0) {
        toast({ title: "Nothing to regenerate", description: "Generate content first before regenerating all", variant: "destructive" });
        return;
      }

      await Promise.all(promises);
      toast({ title: "All content regenerated!", description: "Review the new content below." });
    } catch (error: any) {
      console.error("Regenerate all error:", error);
      toast({ title: "Error", description: error.message || "Failed to regenerate content", variant: "destructive" });
    } finally {
      setRegeneratingAll(false);
    }
  };

  const handleRegenerateLesson = async (index: number) => {
    const existingLesson = generatedLessons[index];
    setRegeneratingIndex(index);
    
    try {
      const { data, error } = await supabase.functions.invoke("ai-content-generator", {
        body: {
          type: "single_lesson",
          topic,
          courseName,
          difficulty,
          additionalContext: additionalContext.trim() || undefined,
          existingContent: existingLesson.title,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newLesson = data.data as GeneratedLesson;
      setGeneratedLessons(prev => prev.map((l, i) => 
        i === index ? { ...newLesson, selected: existingLesson.selected } : l
      ));

      toast({ title: "Lesson regenerated!", description: "Review the new content below." });
    } catch (error: any) {
      console.error("Regeneration error:", error);
      toast({ title: "Error", description: error.message || "Failed to regenerate lesson", variant: "destructive" });
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleRegenerateQuestion = async (index: number) => {
    if (!generatedQuiz) return;
    
    const existingQuestion = generatedQuiz.questions[index];
    setRegeneratingIndex(index);
    
    try {
      const { data, error } = await supabase.functions.invoke("ai-content-generator", {
        body: {
          type: "single_question",
          topic,
          courseName,
          difficulty,
          questionTypes: [existingQuestion.question_type],
          additionalContext: additionalContext.trim() || undefined,
          existingContent: existingQuestion.question_text,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newQuestion = data.data as GeneratedQuestion;
      setGeneratedQuiz(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          questions: prev.questions.map((q, i) => 
            i === index ? { ...newQuestion, selected: existingQuestion.selected } : q
          ),
        };
      });

      toast({ title: "Question regenerated!", description: "Review the new question below." });
    } catch (error: any) {
      console.error("Regeneration error:", error);
      toast({ title: "Error", description: error.message || "Failed to regenerate question", variant: "destructive" });
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleRegenerateAssignment = async () => {
    setRegeneratingAssignment(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("ai-content-generator", {
        body: {
          type: "assignment",
          topic,
          courseName,
          difficulty,
          additionalContext: additionalContext.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedAssignment(data.data as GeneratedAssignment);
      toast({ title: "Assignment regenerated!", description: "Review the new assignment below." });
    } catch (error: any) {
      console.error("Regeneration error:", error);
      toast({ title: "Error", description: error.message || "Failed to regenerate assignment", variant: "destructive" });
    } finally {
      setRegeneratingAssignment(false);
    }
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
          type: activeTab,
          topic,
          courseName,
          lessonCount: activeTab === "lesson" ? lessonCount : undefined,
          questionCount: activeTab === "quiz" ? questionCount : undefined,
          questionTypes: activeTab === "quiz" ? selectedQuestionTypes : undefined,
          difficulty,
          additionalContext: additionalContext.trim() || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (activeTab === "lesson") {
        const lessons = (data.data as GeneratedLesson[]).map(l => ({ ...l, selected: true }));
        setGeneratedLessons(lessons);
      } else if (activeTab === "quiz") {
        const quiz = data.data as GeneratedQuiz;
        quiz.questions = quiz.questions.map(q => ({ ...q, selected: true }));
        setGeneratedQuiz(quiz);
      } else if (activeTab === "assignment") {
        setGeneratedAssignment(data.data as GeneratedAssignment);
      }

      toast({ title: "Content generated!", description: "Review and save the generated content below." });
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({ title: "Error", description: error.message || "Failed to generate content", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLessons = async () => {
    const selectedLessons = generatedLessons.filter(l => l.selected);
    if (selectedLessons.length === 0) {
      toast({ title: "Error", description: "Select at least one lesson to save", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Get current max order index
      const { data: existingLessons } = await supabase
        .from("lesson_content")
        .select("order_index")
        .eq("course_id", courseId)
        .order("order_index", { ascending: false })
        .limit(1);

      let startIndex = (existingLessons?.[0]?.order_index ?? -1) + 1;

      const lessonsToInsert = selectedLessons.map((lesson, idx) => ({
        course_id: courseId,
        section_id: sectionId || null,
        title: lesson.title,
        description: lesson.description,
        content_type: "text",
        content_text: lesson.content_text,
        duration_minutes: lesson.duration_minutes,
        order_index: startIndex + idx,
        is_free_preview: false,
      }));

      const { error } = await supabase.from("lesson_content").insert(lessonsToInsert);
      if (error) throw error;

      toast({ title: "Success!", description: `${selectedLessons.length} lessons saved to your course.` });
      onContentGenerated();
      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ title: "Error", description: "Failed to save lessons", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!generatedQuiz) return;

    const selectedQuestions = generatedQuiz.questions.filter(q => q.selected);
    if (selectedQuestions.length === 0) {
      toast({ title: "Error", description: "Select at least one question to save", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Get current max order index for quizzes
      const { data: existingQuizzes } = await supabase
        .from("quizzes")
        .select("order_index")
        .eq("course_id", courseId)
        .order("order_index", { ascending: false })
        .limit(1);

      const quizOrderIndex = (existingQuizzes?.[0]?.order_index ?? -1) + 1;

      // Insert quiz
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          course_id: courseId,
          section_id: sectionId || null,
          title: generatedQuiz.title,
          description: generatedQuiz.description,
          passing_score: generatedQuiz.passing_score,
          order_index: quizOrderIndex,
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Insert questions
      for (let i = 0; i < selectedQuestions.length; i++) {
        const q = selectedQuestions[i];
        const { data: question, error: questionError } = await supabase
          .from("quiz_questions")
          .insert({
            quiz_id: quiz.id,
            question_text: q.question_text,
            question_type: q.question_type,
            points: q.points,
            explanation: q.explanation,
            order_index: i,
          })
          .select()
          .single();

        if (questionError) throw questionError;

        // Insert options if applicable
        if (q.options && q.options.length > 0) {
          const optionsToInsert = q.options.map((opt, idx) => ({
            question_id: question.id,
            option_text: opt.text,
            is_correct: opt.is_correct,
            order_index: idx,
          }));

          const { error: optionsError } = await supabase.from("quiz_options").insert(optionsToInsert);
          if (optionsError) throw optionsError;
        }
      }

      toast({ title: "Success!", description: `Quiz with ${selectedQuestions.length} questions saved.` });
      onContentGenerated();
      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ title: "Error", description: "Failed to save quiz", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAssignment = async () => {
    if (!generatedAssignment) return;

    setSaving(true);
    try {
      // Get current max order index for assignments
      const { data: existingAssignments } = await supabase
        .from("assignments")
        .select("order_index")
        .eq("course_id", courseId)
        .order("order_index", { ascending: false })
        .limit(1);

      const orderIndex = (existingAssignments?.[0]?.order_index ?? -1) + 1;

      const { error } = await supabase.from("assignments").insert({
        course_id: courseId,
        section_id: sectionId || null,
        title: generatedAssignment.title,
        description: generatedAssignment.description,
        instructions: generatedAssignment.instructions,
        max_score: generatedAssignment.max_score,
        order_index: orderIndex,
      });

      if (error) throw error;

      toast({ title: "Success!", description: "Assignment saved to your course." });
      onContentGenerated();
      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ title: "Error", description: "Failed to save assignment", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleLessonSelection = (index: number) => {
    setGeneratedLessons(prev => prev.map((l, i) => i === index ? { ...l, selected: !l.selected } : l));
  };

  const toggleQuestionSelection = (index: number) => {
    if (!generatedQuiz) return;
    setGeneratedQuiz({
      ...generatedQuiz,
      questions: generatedQuiz.questions.map((q, i) => i === index ? { ...q, selected: !q.selected } : q),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            AI Content Generator
          </DialogTitle>
          <DialogDescription>
            Use AI to generate lessons, quizzes, and assignments for "{courseName}"
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as typeof activeTab); resetForm(); }} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="lesson" className="gap-2">
              <BookOpen className="h-4 w-4" /> Lessons
            </TabsTrigger>
            <TabsTrigger value="quiz" className="gap-2">
              <FileQuestion className="h-4 w-4" /> Quiz
            </TabsTrigger>
            <TabsTrigger value="assignment" className="gap-2">
              <ClipboardList className="h-4 w-4" /> Assignment
            </TabsTrigger>
          </TabsList>

          {/* Common Form Fields */}
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic / Subject *</Label>
                <Input
                  id="topic"
                  placeholder="e.g., Introduction to Python Programming"
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
                placeholder="Any specific requirements, focus areas, or context for the content..."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                rows={2}
              />
            </div>

            <TabsContent value="lesson" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lessonCount">Number of Lessons</Label>
                <Input
                  id="lessonCount"
                  type="number"
                  min={1}
                  max={20}
                  value={lessonCount}
                  onChange={(e) => setLessonCount(parseInt(e.target.value) || 5)}
                />
              </div>

              {generatedLessons.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Generated Lessons (Click to edit)</h4>
                    <Button onClick={handleSaveLessons} disabled={saving} size="sm">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                      Save Selected ({generatedLessons.filter(l => l.selected).length})
                    </Button>
                  </div>
                  {generatedLessons.map((lesson, idx) => (
                    <Card key={idx} className={`transition-colors ${lesson.selected ? "border-primary" : "opacity-60"}`}>
                      <CardHeader className="py-3">
                        <div className="flex items-start gap-3">
                          <Checkbox checked={lesson.selected} onCheckedChange={() => toggleLessonSelection(idx)} className="mt-1" />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                value={lesson.title}
                                onChange={(e) => {
                                  setGeneratedLessons(prev => prev.map((l, i) => i === idx ? { ...l, title: e.target.value } : l));
                                }}
                                className="font-medium flex-1"
                                placeholder="Lesson title"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRegenerateLesson(idx)}
                                disabled={regeneratingIndex === idx}
                                className="shrink-0"
                              >
                                {regeneratingIndex === idx ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <Textarea
                              value={lesson.description}
                              onChange={(e) => {
                                setGeneratedLessons(prev => prev.map((l, i) => i === idx ? { ...l, description: e.target.value } : l));
                              }}
                              className="text-sm"
                              placeholder="Lesson description"
                              rows={2}
                            />
                            <RichTextEditor
                              value={lesson.content_text}
                              onChange={(value) => {
                                setGeneratedLessons(prev => prev.map((l, i) => i === idx ? { ...l, content_text: value } : l));
                              }}
                              placeholder="Lesson content"
                              minHeight="150px"
                              courseId={courseId}
                            />
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Duration (min):</Label>
                              <Input
                                type="number"
                                min={1}
                                value={lesson.duration_minutes}
                                onChange={(e) => {
                                  setGeneratedLessons(prev => prev.map((l, i) => i === idx ? { ...l, duration_minutes: parseInt(e.target.value) || 5 } : l));
                                }}
                                className="w-20 h-7 text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="quiz" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="questionCount">Number of Questions</Label>
                  <Input
                    id="questionCount"
                    type="number"
                    min={1}
                    max={50}
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

              {generatedQuiz && (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Quiz Title</Label>
                      <Button onClick={handleSaveQuiz} disabled={saving} size="sm">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                        Save Quiz ({generatedQuiz.questions.filter(q => q.selected).length} questions)
                      </Button>
                    </div>
                    <Input
                      value={generatedQuiz.title}
                      onChange={(e) => setGeneratedQuiz({ ...generatedQuiz, title: e.target.value })}
                      placeholder="Quiz title"
                    />
                    <Textarea
                      value={generatedQuiz.description}
                      onChange={(e) => setGeneratedQuiz({ ...generatedQuiz, description: e.target.value })}
                      placeholder="Quiz description"
                      rows={2}
                    />
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Passing Score (%):</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={generatedQuiz.passing_score}
                        onChange={(e) => setGeneratedQuiz({ ...generatedQuiz, passing_score: parseInt(e.target.value) || 70 })}
                        className="w-20 h-7 text-sm"
                      />
                    </div>
                  </div>
                  <h4 className="font-medium text-sm">Questions (Click to edit)</h4>
                  {generatedQuiz.questions.map((question, idx) => (
                    <Card key={idx} className={`transition-colors ${question.selected ? "border-primary" : "opacity-60"}`}>
                      <CardContent className="py-3">
                        <div className="flex items-start gap-3">
                          <Checkbox checked={question.selected} onCheckedChange={() => toggleQuestionSelection(idx)} className="mt-1" />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start gap-2">
                              <Textarea
                                value={question.question_text}
                                onChange={(e) => {
                                  const updatedQuestions = [...generatedQuiz.questions];
                                  updatedQuestions[idx] = { ...updatedQuestions[idx], question_text: e.target.value };
                                  setGeneratedQuiz({ ...generatedQuiz, questions: updatedQuestions });
                                }}
                                placeholder="Question text"
                                rows={2}
                                className="flex-1"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRegenerateQuestion(idx)}
                                disabled={regeneratingIndex === idx}
                                className="shrink-0"
                              >
                                {regeneratingIndex === idx ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Select
                                value={question.question_type}
                                onValueChange={(value) => {
                                  const updatedQuestions = [...generatedQuiz.questions];
                                  updatedQuestions[idx] = { ...updatedQuestions[idx], question_type: value };
                                  setGeneratedQuiz({ ...generatedQuiz, questions: updatedQuestions });
                                }}
                              >
                                <SelectTrigger className="w-40 h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {questionTypeOptions.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex items-center gap-1">
                                <Label className="text-xs">Points:</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={question.points}
                                  onChange={(e) => {
                                    const updatedQuestions = [...generatedQuiz.questions];
                                    updatedQuestions[idx] = { ...updatedQuestions[idx], points: parseInt(e.target.value) || 1 };
                                    setGeneratedQuiz({ ...generatedQuiz, questions: updatedQuestions });
                                  }}
                                  className="w-16 h-7 text-sm"
                                />
                              </div>
                            </div>
                            {question.options && question.options.length > 0 && (
                              <div className="space-y-2 pt-2 border-t">
                                <Label className="text-xs font-medium">Options</Label>
                                {question.options.map((opt, optIdx) => (
                                  <div key={optIdx} className="flex items-center gap-2">
                                    <Checkbox
                                      checked={opt.is_correct}
                                      onCheckedChange={(checked) => {
                                        const updatedQuestions = [...generatedQuiz.questions];
                                        const updatedOptions = [...(updatedQuestions[idx].options || [])];
                                        updatedOptions[optIdx] = { ...updatedOptions[optIdx], is_correct: !!checked };
                                        updatedQuestions[idx] = { ...updatedQuestions[idx], options: updatedOptions };
                                        setGeneratedQuiz({ ...generatedQuiz, questions: updatedQuestions });
                                      }}
                                    />
                                    <Input
                                      value={opt.text}
                                      onChange={(e) => {
                                        const updatedQuestions = [...generatedQuiz.questions];
                                        const updatedOptions = [...(updatedQuestions[idx].options || [])];
                                        updatedOptions[optIdx] = { ...updatedOptions[optIdx], text: e.target.value };
                                        updatedQuestions[idx] = { ...updatedQuestions[idx], options: updatedOptions };
                                        setGeneratedQuiz({ ...generatedQuiz, questions: updatedQuestions });
                                      }}
                                      className="flex-1 h-7 text-sm"
                                      placeholder="Option text"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            <Textarea
                              value={question.explanation}
                              onChange={(e) => {
                                const updatedQuestions = [...generatedQuiz.questions];
                                updatedQuestions[idx] = { ...updatedQuestions[idx], explanation: e.target.value };
                                setGeneratedQuiz({ ...generatedQuiz, questions: updatedQuestions });
                              }}
                              placeholder="Explanation (shown after answer)"
                              rows={2}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="assignment" className="mt-0 space-y-4">
              {generatedAssignment && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Label className="font-medium">Edit Assignment</Label>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleRegenerateAssignment} 
                          disabled={regeneratingAssignment}
                        >
                          {regeneratingAssignment ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Regenerate
                        </Button>
                        <Button onClick={handleSaveAssignment} disabled={saving} size="sm">
                          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                          Save Assignment
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Title</Label>
                      <Input
                        value={generatedAssignment.title}
                        onChange={(e) => setGeneratedAssignment({ ...generatedAssignment, title: e.target.value })}
                        placeholder="Assignment title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Description</Label>
                      <Textarea
                        value={generatedAssignment.description}
                        onChange={(e) => setGeneratedAssignment({ ...generatedAssignment, description: e.target.value })}
                        placeholder="Brief description"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Instructions</Label>
                      <Textarea
                        value={generatedAssignment.instructions}
                        onChange={(e) => setGeneratedAssignment({ ...generatedAssignment, instructions: e.target.value })}
                        placeholder="Detailed instructions for students"
                        rows={6}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Max Score:</Label>
                      <Input
                        type="number"
                        min={1}
                        value={generatedAssignment.max_score}
                        onChange={(e) => setGeneratedAssignment({ ...generatedAssignment, max_score: parseInt(e.target.value) || 100 })}
                        className="w-24"
                      />
                    </div>
                    {generatedAssignment.rubric && generatedAssignment.rubric.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Grading Rubric</Label>
                        {generatedAssignment.rubric.map((item, idx) => (
                          <div key={idx} className="border rounded p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                value={item.criteria}
                                onChange={(e) => {
                                  const updatedRubric = [...(generatedAssignment.rubric || [])];
                                  updatedRubric[idx] = { ...updatedRubric[idx], criteria: e.target.value };
                                  setGeneratedAssignment({ ...generatedAssignment, rubric: updatedRubric });
                                }}
                                placeholder="Criteria name"
                                className="flex-1"
                              />
                              <Input
                                type="number"
                                min={1}
                                value={item.points}
                                onChange={(e) => {
                                  const updatedRubric = [...(generatedAssignment.rubric || [])];
                                  updatedRubric[idx] = { ...updatedRubric[idx], points: parseInt(e.target.value) || 1 };
                                  setGeneratedAssignment({ ...generatedAssignment, rubric: updatedRubric });
                                }}
                                className="w-20"
                                placeholder="Points"
                              />
                            </div>
                            <Textarea
                              value={item.description}
                              onChange={(e) => {
                                const updatedRubric = [...(generatedAssignment.rubric || [])];
                                updatedRubric[idx] = { ...updatedRubric[idx], description: e.target.value };
                                setGeneratedAssignment({ ...generatedAssignment, rubric: updatedRubric });
                              }}
                              placeholder="Description of this criteria"
                              rows={2}
                              className="text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <div className="flex gap-2">
              <Button onClick={handleGenerate} disabled={loading || regeneratingAll || !topic.trim()} className="flex-1 gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "Generating..." : `Generate ${activeTab === "lesson" ? "Lessons" : activeTab === "quiz" ? "Quiz" : "Assignment"}`}
              </Button>
              {(generatedLessons.length > 0 || generatedQuiz || generatedAssignment) && (
                <Button 
                  onClick={handleRegenerateAll} 
                  disabled={loading || regeneratingAll} 
                  variant="outline"
                  className="gap-2"
                >
                  {regeneratingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {regeneratingAll ? "Regenerating..." : "Regenerate All"}
                </Button>
              )}
            </div>
          </div>
        </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
