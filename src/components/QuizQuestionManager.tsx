import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, GripVertical, Check, X, Clock, Image, Code, FileText, ListOrdered, ArrowRightLeft, Play, ChevronUp, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AIQuestionGenerator } from "@/components/AIQuestionGenerator";
import { QuizPreview } from "@/components/QuizPreview";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: string;
  points: number;
  order_index: number;
  explanation: string | null;
}

interface QuizOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

interface QuizQuestionManagerProps {
  quizId: string;
  quizTitle: string;
  passingScore?: number;
  timeLimitMinutes?: number | null;
  quizDescription?: string | null;
  onClose: () => void;
}

const questionTypes = [
  // Basic Question Types
  { value: "single_choice", label: "Multiple Choice (single answer)", category: "Basic", icon: "●" },
  { value: "multiple_choice", label: "Multiple Choice (multiple answers)", category: "Basic", icon: "☑" },
  { value: "true_false", label: "True / False", category: "Basic", icon: "T/F" },
  { value: "short_answer", label: "Short Answer", category: "Basic", icon: "Aa" },
  { value: "long_answer", label: "Long Answer / Essay", category: "Basic", icon: "¶" },
  { value: "fill_in", label: "Fill in the Blanks", category: "Basic", icon: "___" },
  // Interactive Question Types
  { value: "matching", label: "Matching", category: "Interactive", icon: "↔" },
  { value: "ordering", label: "Ordering / Sequencing", category: "Interactive", icon: "123" },
  { value: "drag_drop", label: "Drag into Buckets", category: "Interactive", icon: "⇄" },
  // Advanced Question Types
  { value: "numerical", label: "Numerical / Calculation", category: "Advanced", icon: "#" },
  { value: "scenario", label: "Scenario-based Questions", category: "Advanced", icon: "📋" },
  { value: "case_study", label: "Case Study Questions", category: "Advanced", icon: "📁" },
  // Media Question Types
  { value: "image_based", label: "Image-based Questions", category: "Media", icon: "🖼" },
  { value: "code_based", label: "Code-based Questions", category: "Media", icon: "</>" },
  // Special Question Types
  { value: "timed", label: "Timed Quiz Question", category: "Special", icon: "⏱" },
  { value: "adaptive", label: "Adaptive Quiz Question", category: "Special", icon: "⚡" },
];

const categories = ["Basic", "Interactive", "Advanced", "Media", "Special"];

// Helper to check if question type needs options
const needsOptions = (type: string) => 
  ["single_choice", "multiple_choice", "true_false", "matching", "ordering", "drag_drop"].includes(type);

// Helper to check if question type uses matching-style pairs
const usesPairs = (type: string) => ["matching", "drag_drop"].includes(type);

// Helper to check if question type needs a single correct answer
const needsSingleAnswer = (type: string) => 
  ["fill_in", "short_answer", "numerical"].includes(type);

// Helper to check if question type is free-form (manual grading)
const isFreeForm = (type: string) => 
  ["long_answer", "scenario", "case_study", "code_based"].includes(type);

interface SortableQuestionCardProps {
  question: QuizQuestion;
  index: number;
  totalCount: number;
  options: Record<string, QuizOption[]>;
  getQuestionTypeIcon: (type: string) => string;
  getQuestionTypeLabel: (type: string) => string;
  renderQuestionPreview: (question: QuizQuestion) => React.ReactNode;
  onEdit: (question: QuizQuestion) => void;
  onDelete: (id: string) => void;
  onMove: (index: number, direction: "up" | "down") => void;
}

const SortableQuestionCard = ({ question, index, totalCount, options, getQuestionTypeIcon, getQuestionTypeLabel, renderQuestionPreview, onEdit, onDelete, onMove }: SortableQuestionCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined };

  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? "shadow-lg" : ""}>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded" title="Drag to reorder">
              <GripVertical className="h-4 w-4" />
            </button>
            <span className="font-medium text-sm">{index + 1}</span>
            <div className="flex flex-col">
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0} onClick={() => onMove(index, "up")} title="Move up">
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === totalCount - 1} onClick={() => onMove(index, "down")} title="Move down">
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{question.question_text}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {getQuestionTypeIcon(question.question_type)} {getQuestionTypeLabel(question.question_type)}
                  </Badge>
                  <Badge variant="outline">{question.points} pts</Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(question)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(question.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            {renderQuestionPreview(question)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const QuizQuestionManager = ({ quizId, quizTitle, passingScore = 70, timeLimitMinutes, quizDescription, onClose }: QuizQuestionManagerProps) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [options, setOptions] = useState<Record<string, QuizOption[]>>({});
  const [loading, setLoading] = useState(true);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  const [questionForm, setQuestionForm] = useState({
    question_text: "",
    question_type: "single_choice",
    points: 1,
    order_index: 0,
    explanation: "",
    image_url: "",
    time_limit: 0,
    code_language: "javascript",
  });

  const [tempOptions, setTempOptions] = useState<{ text: string; is_correct: boolean }[]>([
    { text: "", is_correct: false },
    { text: "", is_correct: false },
  ]);

  const [fillInAnswer, setFillInAnswer] = useState("");
  const [matchingPairs, setMatchingPairs] = useState<{ left: string; right: string }[]>([
    { left: "", right: "" },
    { left: "", right: "" },
  ]);
  const [bucketNames, setBucketNames] = useState<string[]>(["", ""]);

  useEffect(() => {
    fetchQuestions();
  }, [quizId]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data: questionsData, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("order_index");

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      if (questionsData && questionsData.length > 0) {
        const questionIds = questionsData.map(q => q.id);
        const { data: optionsData, error: optionsError } = await supabase
          .from("quiz_options")
          .select("*")
          .in("question_id", questionIds)
          .order("order_index");

        if (optionsError) throw optionsError;

        const optionsByQuestion: Record<string, QuizOption[]> = {};
        optionsData?.forEach(opt => {
          if (!optionsByQuestion[opt.question_id]) {
            optionsByQuestion[opt.question_id] = [];
          }
          optionsByQuestion[opt.question_id].push(opt);
        });
        setOptions(optionsByQuestion);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast({ title: "Error", description: "Failed to load questions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setQuestionForm({
      question_text: "",
      question_type: "single_choice",
      points: 1,
      order_index: questions.length,
      explanation: "",
      image_url: "",
      time_limit: 0,
      code_language: "javascript",
    });
    setTempOptions([
      { text: "", is_correct: false },
      { text: "", is_correct: false },
    ]);
    setFillInAnswer("");
    setMatchingPairs([{ left: "", right: "" }, { left: "", right: "" }]);
    setBucketNames(["", ""]);
    setEditingQuestion(null);
  };

  const initializeOptionsForType = (type: string) => {
    if (type === "true_false") {
      setTempOptions([
        { text: "True", is_correct: false },
        { text: "False", is_correct: false },
      ]);
    } else {
      setTempOptions([
        { text: "", is_correct: false },
        { text: "", is_correct: false },
      ]);
    }
    setFillInAnswer("");
    setMatchingPairs([{ left: "", right: "" }, { left: "", right: "" }]);
    setBucketNames(["", ""]);
  };

  const handleAddOption = () => {
    setTempOptions([...tempOptions, { text: "", is_correct: false }]);
  };

  const handleRemoveOption = (index: number) => {
    if (tempOptions.length > 2) {
      setTempOptions(tempOptions.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, field: "text" | "is_correct", value: string | boolean) => {
    const newOptions = [...tempOptions];
    if (field === "is_correct" && (questionForm.question_type === "single_choice" || questionForm.question_type === "true_false")) {
      newOptions.forEach((opt, i) => {
        opt.is_correct = i === index ? (value as boolean) : false;
      });
    } else {
      newOptions[index] = { ...newOptions[index], [field]: value };
    }
    setTempOptions(newOptions);
  };

  const handleAddMatchingPair = () => {
    setMatchingPairs([...matchingPairs, { left: "", right: "" }]);
  };

  const handleRemoveMatchingPair = (index: number) => {
    if (matchingPairs.length > 2) {
      setMatchingPairs(matchingPairs.filter((_, i) => i !== index));
    }
  };

  const handleMatchingPairChange = (index: number, side: "left" | "right", value: string) => {
    const newPairs = [...matchingPairs];
    newPairs[index] = { ...newPairs[index], [side]: value };
    setMatchingPairs(newPairs);
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.question_text.trim()) {
      toast({ title: "Error", description: "Question text is required", variant: "destructive" });
      return;
    }

    // Validate based on question type
    if (needsOptions(questionForm.question_type)) {
      if (questionForm.question_type === "matching") {
        const validPairs = matchingPairs.filter(p => p.left.trim() && p.right.trim());
        if (validPairs.length < 2) {
          toast({ title: "Error", description: "At least 2 matching pairs are required", variant: "destructive" });
          return;
        }
      } else if (questionForm.question_type === "drag_drop") {
        const validPairs = matchingPairs.filter(p => p.left.trim() && p.right.trim());
        if (validPairs.length < 2) {
          toast({ title: "Error", description: "At least 2 items with buckets are required", variant: "destructive" });
          return;
        }
        const validBuckets = bucketNames.filter(b => b.trim());
        if (validBuckets.length < 2) {
          toast({ title: "Error", description: "At least 2 bucket names are required", variant: "destructive" });
          return;
        }
      } else if (questionForm.question_type === "ordering") {
        const validOptions = tempOptions.filter(o => o.text.trim());
        if (validOptions.length < 2) {
          toast({ title: "Error", description: "At least 2 items are required", variant: "destructive" });
          return;
        }
      } else {
        const validOptions = tempOptions.filter(o => o.text.trim());
        if (validOptions.length < 2) {
          toast({ title: "Error", description: "At least 2 options are required", variant: "destructive" });
          return;
        }
        if (!validOptions.some(o => o.is_correct)) {
          toast({ title: "Error", description: "At least one option must be marked as correct", variant: "destructive" });
          return;
        }
      }
    }

    if (needsSingleAnswer(questionForm.question_type) && !fillInAnswer.trim()) {
      toast({ title: "Error", description: "Correct answer is required", variant: "destructive" });
      return;
    }

    try {
      let questionId: string;

      if (editingQuestion) {
        const { error } = await supabase
          .from("quiz_questions")
          .update({
            question_text: questionForm.question_text,
            question_type: questionForm.question_type,
            points: questionForm.points,
            order_index: questionForm.order_index,
            explanation: questionForm.explanation || null,
          })
          .eq("id", editingQuestion.id);

        if (error) throw error;
        questionId = editingQuestion.id;

        await supabase.from("quiz_options").delete().eq("question_id", questionId);
      } else {
        const { data, error } = await supabase
          .from("quiz_questions")
          .insert({
            quiz_id: quizId,
            question_text: questionForm.question_text,
            question_type: questionForm.question_type,
            points: questionForm.points,
            order_index: questionForm.order_index,
            explanation: questionForm.explanation || null,
          })
          .select()
          .single();

        if (error) throw error;
        questionId = data.id;
      }

      // Insert options based on question type
      if (questionForm.question_type === "single_choice" || questionForm.question_type === "multiple_choice" || questionForm.question_type === "true_false") {
        const validOptions = tempOptions.filter(o => o.text.trim());
        const optionsToInsert = validOptions.map((opt, index) => ({
          question_id: questionId,
          option_text: opt.text,
          is_correct: opt.is_correct,
          order_index: index,
        }));

        const { error: optionsError } = await supabase.from("quiz_options").insert(optionsToInsert);
        if (optionsError) throw optionsError;
      } else if (questionForm.question_type === "matching") {
        const validPairs = matchingPairs.filter(p => p.left.trim() && p.right.trim());
        const optionsToInsert = validPairs.map((pair, index) => ({
          question_id: questionId,
          option_text: `${pair.left}|||${pair.right}`,
          is_correct: true,
          order_index: index,
        }));

        const { error: optionsError } = await supabase.from("quiz_options").insert(optionsToInsert);
        if (optionsError) throw optionsError;
      } else if (questionForm.question_type === "drag_drop") {
        // Store as item|||bucket pairs (like matching)
        const validPairs = matchingPairs.filter(p => p.left.trim() && p.right.trim());
        const optionsToInsert = validPairs.map((pair, index) => ({
          question_id: questionId,
          option_text: `${pair.left}|||${pair.right}`,
          is_correct: true,
          order_index: index,
        }));

        const { error: optionsError } = await supabase.from("quiz_options").insert(optionsToInsert);
        if (optionsError) throw optionsError;
      } else if (questionForm.question_type === "ordering") {
        const validOptions = tempOptions.filter(o => o.text.trim());
        const optionsToInsert = validOptions.map((opt, index) => ({
          question_id: questionId,
          option_text: opt.text,
          is_correct: true,
          order_index: index,
        }));

        const { error: optionsError } = await supabase.from("quiz_options").insert(optionsToInsert);
        if (optionsError) throw optionsError;
      } else if (needsSingleAnswer(questionForm.question_type)) {
        const { error: optionsError } = await supabase.from("quiz_options").insert({
          question_id: questionId,
          option_text: fillInAnswer,
          is_correct: true,
          order_index: 0,
        });
        if (optionsError) throw optionsError;
      }

      toast({ title: editingQuestion ? "Question updated" : "Question created" });
      setQuestionDialogOpen(false);
      resetForm();
      fetchQuestions();
    } catch (error) {
      console.error("Error saving question:", error);
      toast({ title: "Error", description: "Failed to save question", variant: "destructive" });
    }
  };

  const handleEditQuestion = (question: QuizQuestion) => {
    setEditingQuestion(question);
    setQuestionForm({
      question_text: question.question_text,
      question_type: question.question_type,
      points: question.points,
      order_index: question.order_index,
      explanation: question.explanation || "",
      image_url: "",
      time_limit: 0,
      code_language: "javascript",
    });

    const questionOptions = options[question.id] || [];
    
    if (question.question_type === "matching") {
      const pairs = questionOptions.map(o => {
        const [left, right] = o.option_text.split("|||");
        return { left: left || "", right: right || "" };
      });
      setMatchingPairs(pairs.length >= 2 ? pairs : [{ left: "", right: "" }, { left: "", right: "" }]);
    } else if (question.question_type === "drag_drop") {
      const pairs = questionOptions.map(o => {
        const [left, right] = o.option_text.split("|||");
        return { left: left || "", right: right || "" };
      });
      setMatchingPairs(pairs.length >= 2 ? pairs : [{ left: "", right: "" }, { left: "", right: "" }]);
      // Extract unique bucket names
      const uniqueBuckets = [...new Set(pairs.map(p => p.right).filter(Boolean))];
      setBucketNames(uniqueBuckets.length >= 2 ? uniqueBuckets : ["", ""]);
    } else if (needsOptions(question.question_type)) {
      if (questionOptions.length > 0) {
        setTempOptions(questionOptions.map(o => ({ text: o.option_text, is_correct: o.is_correct })));
      } else {
        initializeOptionsForType(question.question_type);
      }
    } else if (needsSingleAnswer(question.question_type)) {
      const correctOption = questionOptions.find(o => o.is_correct);
      setFillInAnswer(correctOption?.option_text || "");
    }

    setQuestionDialogOpen(true);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Delete this question and all its options?")) return;

    try {
      await supabase.from("quiz_options").delete().eq("question_id", questionId);
      const { error } = await supabase.from("quiz_questions").delete().eq("id", questionId);
      if (error) throw error;
      toast({ title: "Question deleted" });
      fetchQuestions();
    } catch (error) {
      console.error("Error deleting question:", error);
      toast({ title: "Error", description: "Failed to delete question", variant: "destructive" });
    }
  };

  const handleReorderQuestions = useCallback(async (reorderedQuestions: QuizQuestion[]) => {
    try {
      const updates = reorderedQuestions.map((q, idx) => 
        supabase.from("quiz_questions").update({ order_index: idx }).eq("id", q.id)
      );
      await Promise.all(updates);
      toast({ title: "Questions reordered" });
    } catch (error) {
      console.error("Error reordering:", error);
      toast({ title: "Error", description: "Failed to reorder questions", variant: "destructive" });
      fetchQuestions();
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setQuestions(prev => {
      const oldIndex = prev.findIndex(q => q.id === active.id);
      const newIndex = prev.findIndex(q => q.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      handleReorderQuestions(reordered);
      return reordered;
    });
  }, [handleReorderQuestions]);

  const moveQuestion = useCallback((index: number, direction: "up" | "down") => {
    setQuestions(prev => {
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const reordered = arrayMove(prev, index, newIndex);
      handleReorderQuestions(reordered);
      return reordered;
    });
  }, [handleReorderQuestions]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const getQuestionTypeLabel = (type: string) => {
    return questionTypes.find(t => t.value === type)?.label || type;
  };

  const getQuestionTypeIcon = (type: string) => {
    const qType = questionTypes.find(t => t.value === type);
    return qType?.icon || "?";
  };

  const renderQuestionPreview = (question: QuizQuestion) => {
    const questionOptions = options[question.id] || [];

    if (question.question_type === "matching") {
      return (
        <div className="pl-4 space-y-1 border-l-2 border-muted">
          {questionOptions.map((opt) => {
            const [left, right] = opt.option_text.split("|||");
            return (
              <div key={opt.id} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{left}</span>
                <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                <span className="text-green-600">{right}</span>
              </div>
            );
          })}
        </div>
      );
    }

    if (question.question_type === "drag_drop") {
      // Group items by bucket
      const buckets: Record<string, string[]> = {};
      questionOptions.forEach((opt) => {
        const [item, bucket] = opt.option_text.split("|||");
        if (!buckets[bucket]) buckets[bucket] = [];
        buckets[bucket].push(item);
      });
      return (
        <div className="pl-4 space-y-2 border-l-2 border-muted">
          {Object.entries(buckets).map(([bucket, items]) => (
            <div key={bucket}>
              <span className="text-xs font-medium text-primary">{bucket}:</span>
              <span className="text-sm text-muted-foreground ml-1">{items.join(", ")}</span>
            </div>
          ))}
        </div>
      );
    }

    if (question.question_type === "ordering") {
      return (
        <div className="pl-4 space-y-1 border-l-2 border-muted">
          {questionOptions.map((opt, idx) => (
            <div key={opt.id} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground w-4">{idx + 1}.</span>
              <span>{opt.option_text}</span>
            </div>
          ))}
        </div>
      );
    }

    if (needsOptions(question.question_type) && questionOptions.length > 0) {
      return (
        <div className="pl-4 space-y-1 border-l-2 border-muted">
          {questionOptions.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2 text-sm">
              {opt.is_correct ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <X className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={opt.is_correct ? "text-green-600" : "text-muted-foreground"}>
                {opt.option_text}
              </span>
            </div>
          ))}
        </div>
      );
    }

    if (needsSingleAnswer(question.question_type) && questionOptions[0]) {
      return (
        <div className="pl-4 border-l-2 border-muted">
          <p className="text-sm text-muted-foreground">
            Answer: <span className="text-green-600 font-medium">{questionOptions[0].option_text}</span>
          </p>
        </div>
      );
    }

    if (isFreeForm(question.question_type)) {
      return (
        <div className="pl-4 border-l-2 border-muted">
          <p className="text-sm text-muted-foreground italic">Free-form response (manual grading)</p>
        </div>
      );
    }

    if (question.question_type === "image_based") {
      return (
        <div className="pl-4 border-l-2 border-muted flex items-center gap-2">
          <Image className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground italic">Image-based question</p>
        </div>
      );
    }

    if (question.question_type === "timed") {
      return (
        <div className="pl-4 border-l-2 border-muted flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground italic">Timed question</p>
        </div>
      );
    }

    if (question.question_type === "adaptive") {
      return (
        <div className="pl-4 border-l-2 border-muted">
          <p className="text-sm text-muted-foreground italic">Adaptive question (difficulty adjusts based on performance)</p>
        </div>
      );
    }

    return null;
  };

  const quizForPreview = {
    id: quizId,
    title: quizTitle,
    description: quizDescription,
    passing_score: passingScore,
    time_limit_minutes: timeLimitMinutes,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Manage Questions</h2>
          <p className="text-sm text-muted-foreground">Quiz: {quizTitle}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setPreviewOpen(true)}
            disabled={questions.length === 0}
          >
            <Play className="h-4 w-4 mr-2" />
            Preview Quiz
          </Button>
          <AIQuestionGenerator
            quizId={quizId}
            quizTitle={quizTitle}
            onQuestionsGenerated={fetchQuestions}
          />
          <Dialog open={questionDialogOpen} onOpenChange={(open) => {
            setQuestionDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>{editingQuestion ? "Edit Question" : "Add New Question"}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select 
                    value={questionForm.question_type} 
                    onValueChange={(v) => {
                      setQuestionForm({ ...questionForm, question_type: v });
                      initializeOptionsForType(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {categories.map(category => (
                        <SelectGroup key={category}>
                          <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{category}</SelectLabel>
                          {questionTypes.filter(t => t.category === category).map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <span className="w-6 text-center">{type.icon}</span>
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Question Text</Label>
                  <Textarea
                    value={questionForm.question_text}
                    onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                    placeholder={
                      questionForm.question_type === "fill_in" 
                        ? "Use _____ to indicate where the blank should be" 
                        : questionForm.question_type === "scenario" || questionForm.question_type === "case_study"
                        ? "Describe the scenario or case study, then ask your question..."
                        : "Enter your question"
                    }
                    rows={questionForm.question_type === "scenario" || questionForm.question_type === "case_study" ? 6 : 3}
                  />
                </div>

                {/* Image URL for image-based questions */}
                {questionForm.question_type === "image_based" && (
                  <div className="space-y-2">
                    <Label>Image URL</Label>
                    <Input
                      value={questionForm.image_url}
                      onChange={(e) => setQuestionForm({ ...questionForm, image_url: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                    <p className="text-xs text-muted-foreground">
                      Provide a URL to the image students will analyze
                    </p>
                  </div>
                )}

                {/* Code language for code-based questions */}
                {questionForm.question_type === "code_based" && (
                  <div className="space-y-2">
                    <Label>Programming Language</Label>
                    <Select 
                      value={questionForm.code_language} 
                      onValueChange={(v) => setQuestionForm({ ...questionForm, code_language: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="java">Java</SelectItem>
                        <SelectItem value="csharp">C#</SelectItem>
                        <SelectItem value="cpp">C++</SelectItem>
                        <SelectItem value="sql">SQL</SelectItem>
                        <SelectItem value="html">HTML/CSS</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Time limit for timed questions */}
                {questionForm.question_type === "timed" && (
                  <div className="space-y-2">
                    <Label>Time Limit (seconds)</Label>
                    <Input
                      type="number"
                      min={10}
                      value={questionForm.time_limit}
                      onChange={(e) => setQuestionForm({ ...questionForm, time_limit: Number(e.target.value) })}
                      placeholder="30"
                    />
                    <p className="text-xs text-muted-foreground">
                      Students must answer within this time limit
                    </p>
                  </div>
                )}

                {/* Options for choice questions */}
                {(questionForm.question_type === "single_choice" || questionForm.question_type === "multiple_choice") && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Answer Options</Label>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Option
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {questionForm.question_type === "single_choice" 
                        ? "Select one correct answer" 
                        : "Select all correct answers"}
                    </p>
                    <div className="space-y-2">
                      {tempOptions.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="flex-1">
                            <Input
                              value={option.text}
                              onChange={(e) => handleOptionChange(index, "text", e.target.value)}
                              placeholder={`Option ${index + 1}`}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={option.is_correct}
                              onCheckedChange={(checked) => handleOptionChange(index, "is_correct", checked)}
                            />
                            <span className="text-xs text-muted-foreground w-16">
                              {option.is_correct ? "Correct" : "Wrong"}
                            </span>
                          </div>
                          {tempOptions.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveOption(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* True/False options */}
                {questionForm.question_type === "true_false" && (
                  <div className="space-y-3">
                    <Label>Select the correct answer</Label>
                    <div className="space-y-2">
                      {tempOptions.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="flex-1">
                            <Input value={option.text} disabled className="bg-muted" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={option.is_correct}
                              onCheckedChange={(checked) => handleOptionChange(index, "is_correct", checked)}
                            />
                            <span className="text-xs text-muted-foreground w-16">
                              {option.is_correct ? "Correct" : "Wrong"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matching pairs */}
                {questionForm.question_type === "matching" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Matching Pairs</Label>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddMatchingPair}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Pair
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Create pairs that students will match together
                    </p>
                    <div className="space-y-2">
                      {matchingPairs.map((pair, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={pair.left}
                            onChange={(e) => handleMatchingPairChange(index, "left", e.target.value)}
                            placeholder="Left item"
                            className="flex-1"
                          />
                          <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                          <Input
                            value={pair.right}
                            onChange={(e) => handleMatchingPairChange(index, "right", e.target.value)}
                            placeholder="Right item"
                            className="flex-1"
                          />
                          {matchingPairs.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveMatchingPair(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ordering/Sequencing items */}
                {questionForm.question_type === "ordering" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Items (in correct order)</Label>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddOption}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Item
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter items in the correct order. They will be shuffled for students.
                    </p>
                    <div className="space-y-2">
                      {tempOptions.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                          <Input
                            value={option.text}
                            onChange={(e) => handleOptionChange(index, "text", e.target.value)}
                            placeholder={`Item ${index + 1}`}
                            className="flex-1"
                          />
                          {tempOptions.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveOption(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Drag into Buckets */}
                {questionForm.question_type === "drag_drop" && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Bucket Names</Label>
                        <Button type="button" variant="outline" size="sm" onClick={() => setBucketNames([...bucketNames, ""])}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Bucket
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Define the categories/buckets students will sort items into.
                      </p>
                      <div className="space-y-2">
                        {bucketNames.map((bucket, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={bucket}
                              onChange={(e) => {
                                const newBuckets = [...bucketNames];
                                newBuckets[index] = e.target.value;
                                setBucketNames(newBuckets);
                              }}
                              placeholder={`Bucket ${index + 1} (e.g., "Business value")`}
                              className="flex-1"
                            />
                            {bucketNames.length > 2 && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => setBucketNames(bucketNames.filter((_, i) => i !== index))}>
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Items & Correct Bucket</Label>
                        <Button type="button" variant="outline" size="sm" onClick={() => setMatchingPairs([...matchingPairs, { left: "", right: "" }])}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Item
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enter each item and select which bucket it belongs to.
                      </p>
                      <div className="space-y-2">
                        {matchingPairs.map((pair, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={pair.left}
                              onChange={(e) => handleMatchingPairChange(index, "left", e.target.value)}
                              placeholder="Item text"
                              className="flex-1"
                            />
                            <select
                              className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[140px]"
                              value={pair.right}
                              onChange={(e) => handleMatchingPairChange(index, "right", e.target.value)}
                            >
                              <option value="">Select bucket</option>
                              {bucketNames.filter(b => b.trim()).map((b, i) => (
                                <option key={i} value={b}>{b}</option>
                              ))}
                            </select>
                            {matchingPairs.length > 2 && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveMatchingPair(index)}>
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Fill in the blank / Short answer / Numerical answer */}
                {needsSingleAnswer(questionForm.question_type) && (
                  <div className="space-y-2">
                    <Label>Correct Answer</Label>
                    <Input
                      value={fillInAnswer}
                      onChange={(e) => setFillInAnswer(e.target.value)}
                      placeholder={
                        questionForm.question_type === "numerical" 
                          ? "Enter the correct number" 
                          : "Enter the correct answer"
                      }
                      type={questionForm.question_type === "numerical" ? "number" : "text"}
                    />
                    <p className="text-xs text-muted-foreground">
                      {questionForm.question_type === "fill_in" && "This is the expected answer for the blank"}
                      {questionForm.question_type === "short_answer" && "Student answers will be compared to this"}
                      {questionForm.question_type === "numerical" && "Enter the expected numerical answer"}
                    </p>
                  </div>
                )}

                {/* Free-form question info */}
                {isFreeForm(questionForm.question_type) && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {questionForm.question_type === "long_answer" && "Long answer questions require manual grading. Students will provide an essay-style response."}
                      {questionForm.question_type === "scenario" && "Scenario-based questions present a situation for students to analyze and respond to."}
                      {questionForm.question_type === "case_study" && "Case study questions require students to analyze a detailed case and provide insights."}
                      {questionForm.question_type === "code_based" && "Students will write and/or analyze code. Manual review recommended."}
                    </p>
                  </div>
                )}

                {/* Adaptive question info */}
                {questionForm.question_type === "adaptive" && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Adaptive questions adjust difficulty based on student performance. Configure follow-up questions for correct and incorrect answers.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Points</Label>
                    <Input
                      type="number"
                      min={1}
                      value={questionForm.points}
                      onChange={(e) => setQuestionForm({ ...questionForm, points: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Order Index</Label>
                    <Input
                      type="number"
                      value={questionForm.order_index}
                      onChange={(e) => setQuestionForm({ ...questionForm, order_index: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Explanation (shown after answering)</Label>
                  <Textarea
                    value={questionForm.explanation}
                    onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                    placeholder="Optional explanation for the correct answer"
                    rows={2}
                  />
                </div>

                <Button onClick={handleSaveQuestion} className="w-full">
                  {editingQuestion ? "Update Question" : "Create Question"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading questions...</div>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No questions yet. Add your first question to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {questions.map((question, index) => (
                <SortableQuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  totalCount={questions.length}
                  options={options}
                  getQuestionTypeIcon={getQuestionTypeIcon}
                  getQuestionTypeLabel={getQuestionTypeLabel}
                  renderQuestionPreview={renderQuestionPreview}
                  onEdit={handleEditQuestion}
                  onDelete={handleDeleteQuestion}
                  onMove={moveQuestion}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Quiz Preview Dialog */}
      <QuizPreview
        quiz={quizForPreview}
        questions={questions}
        options={options}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
};
