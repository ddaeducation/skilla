import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  Trophy,
  ArrowRightLeft,
  Loader2,
  Lightbulb,
  ThumbsUp,
  Target,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
  explanation: string | null;
  order_index: number;
}

interface QuizOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

interface QuestionFeedback {
  questionId: string;
  score: number;
  maxPoints: number;
  isCorrect: boolean;
  feedback: string;
  strengths?: string[];
  improvements?: string[];
  isAIGraded: boolean;
}

interface StudentQuizTakerProps {
  quizId: string;
  quizTitle: string;
  quizDescription?: string | null;
  passingScore: number;
  timeLimitMinutes?: number | null;
  open: boolean;
  onClose: () => void;
  onComplete?: (passed: boolean, score: number, maxScore: number) => void;
}

// Question types that need AI grading
const AI_GRADED_TYPES = ["short_answer", "long_answer", "scenario", "case_study", "code_based"];

export const StudentQuizTaker = ({
  quizId,
  quizTitle,
  quizDescription,
  passingScore,
  timeLimitMinutes,
  open,
  onClose,
  onComplete,
}: StudentQuizTakerProps) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [options, setOptions] = useState<Record<string, QuizOption[]>>({});
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [grading, setGrading] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);
  const [maxScore, setMaxScore] = useState<number>(0);
  const [passed, setPassed] = useState(false);
  const [feedbacks, setFeedbacks] = useState<QuestionFeedback[]>([]);
  const [showFeedbackDetails, setShowFeedbackDetails] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset state for fresh load
      setSubmitted(false);
      setGrading(false);
      setScore(0);
      setMaxScore(0);
      setPassed(false);
      setFeedbacks([]);
      setAnswers({});
      setCurrentQuestionIndex(0);
      setAttemptId(null);
      setShowFeedbackDetails(false);
      fetchQuestions();
      if (timeLimitMinutes) {
        setTimeLeft(timeLimitMinutes * 60);
      }
    }
  }, [open, quizId]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submitted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          if (!submitted) handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

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
        const questionIds = questionsData.map((q) => q.id);
        const { data: optionsData, error: optionsError } = await supabase
          .from("quiz_options")
          .select("*")
          .in("question_id", questionIds)
          .order("order_index");

        if (optionsError) throw optionsError;

        const optionsByQuestion: Record<string, QuizOption[]> = {};
        optionsData?.forEach((opt) => {
          if (!optionsByQuestion[opt.question_id]) {
            optionsByQuestion[opt.question_id] = [];
          }
          optionsByQuestion[opt.question_id].push(opt);
        });
        setOptions(optionsByQuestion);
      }

      // Check for existing passed attempt before creating a new one
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existingAttempts } = await supabase
          .from("quiz_attempts")
          .select("id, passed, score, max_score, completed_at")
          .eq("user_id", user.id)
          .eq("quiz_id", quizId)
          .eq("passed", true)
          .limit(1);

        if (existingAttempts && existingAttempts.length > 0) {
          // Already passed - show results without creating a new attempt
          const passedAttempt = existingAttempts[0];
          setAttemptId(passedAttempt.id);
          setScore(passedAttempt.score || 0);
          setMaxScore(passedAttempt.max_score || 0);
          setPassed(true);
          setSubmitted(true);
          setLoading(false);
          return;
        }

        const { data: attempt, error: attemptError } = await supabase
          .from("quiz_attempts")
          .insert({
            user_id: user.id,
            quiz_id: quizId,
          })
          .select()
          .single();

        if (attemptError) throw attemptError;
        setAttemptId(attempt.id);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast({ title: "Error", description: "Failed to load quiz", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const gradeWithAI = async (
    questionText: string,
    questionType: string,
    studentAnswer: string,
    correctAnswer: string | undefined,
    maxPoints: number
  ): Promise<{ score: number; feedback: string; isCorrect: boolean; strengths?: string[]; improvements?: string[] }> => {
    try {
      const { data, error } = await supabase.functions.invoke("ai-grade-answer", {
        body: {
          questionText,
          questionType,
          studentAnswer,
          correctAnswer,
          maxPoints,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("AI grading error:", error);
      return {
        score: 0,
        feedback: "Unable to grade automatically. Your answer has been recorded for manual review.",
        isCorrect: false,
      };
    }
  };

  const handleSubmit = useCallback(async () => {
    if (submitted || !attemptId) return;
    
    setSubmitted(true);
    setGrading(true);
    
    let totalScore = 0;
    let totalMaxScore = 0;
    const allFeedbacks: QuestionFeedback[] = [];

    try {
      for (const question of questions) {
        const questionOptions = options[question.id] || [];
        const answer = answers[question.id];
        let isCorrect = false;
        let pointsEarned = 0;
        let feedback = "";
        let strengths: string[] = [];
        let improvements: string[] = [];
        let isAIGraded = false;

        totalMaxScore += question.points;

        // Check if this question type needs AI grading
        if (AI_GRADED_TYPES.includes(question.question_type) && typeof answer === "string" && answer.trim()) {
          isAIGraded = true;
          const correctOption = questionOptions.find((o) => o.is_correct);
          const gradeResult = await gradeWithAI(
            question.question_text,
            question.question_type,
            answer,
            correctOption?.option_text,
            question.points
          );
          
          pointsEarned = gradeResult.score;
          isCorrect = gradeResult.isCorrect;
          feedback = gradeResult.feedback;
          strengths = gradeResult.strengths || [];
          improvements = gradeResult.improvements || [];
        } else if (question.question_type === "single_choice" || question.question_type === "true_false") {
          const correctOption = questionOptions.find((o) => o.is_correct);
          isCorrect = answer === correctOption?.id;
          pointsEarned = isCorrect ? question.points : 0;
          feedback = isCorrect 
            ? "Correct! " + (question.explanation || "") 
            : `Incorrect. The correct answer was: ${correctOption?.option_text}. ${question.explanation || ""}`;
        } else if (question.question_type === "multiple_choice") {
          const correctOptionIds = questionOptions.filter((o) => o.is_correct).map((o) => o.id);
          const selectedIds = Array.isArray(answer) ? answer : [];
          isCorrect =
            correctOptionIds.length === selectedIds.length &&
            correctOptionIds.every((id) => selectedIds.includes(id));
          pointsEarned = isCorrect ? question.points : 0;
          const correctTexts = questionOptions.filter(o => o.is_correct).map(o => o.option_text).join(", ");
          feedback = isCorrect 
            ? "Correct! " + (question.explanation || "")
            : `Incorrect. The correct answers were: ${correctTexts}. ${question.explanation || ""}`;
        } else if (question.question_type === "fill_in" || question.question_type === "numerical") {
          const correctOption = questionOptions.find((o) => o.is_correct);
          isCorrect = correctOption ? answer?.toString().toLowerCase().trim() === correctOption.option_text.toLowerCase().trim() : false;
          pointsEarned = isCorrect ? question.points : 0;
          feedback = isCorrect 
            ? "Correct! " + (question.explanation || "")
            : `Incorrect. The correct answer was: ${correctOption?.option_text}. ${question.explanation || ""}`;
        } else if (question.question_type === "ordering" || question.question_type === "drag_drop") {
          const correctOrder = questionOptions.map(o => o.id);
          const selectedOrder = Array.isArray(answer) ? answer : [];
          isCorrect = JSON.stringify(correctOrder) === JSON.stringify(selectedOrder);
          pointsEarned = isCorrect ? question.points : 0;
          feedback = isCorrect 
            ? "Correct order! " + (question.explanation || "")
            : "Incorrect order. " + (question.explanation || "");
        }

        totalScore += pointsEarned;

        // Save answer
        await supabase.from("quiz_answers").insert({
          attempt_id: attemptId,
          question_id: question.id,
          selected_option_id: typeof answer === "string" && questionOptions.find(o => o.id === answer) ? answer : null,
          text_answer: typeof answer === "string" && !questionOptions.find(o => o.id === answer) ? answer : null,
          is_correct: isCorrect,
          points_earned: pointsEarned,
        });

        allFeedbacks.push({
          questionId: question.id,
          score: pointsEarned,
          maxPoints: question.points,
          isCorrect,
          feedback,
          strengths,
          improvements,
          isAIGraded,
        });
      }

      const percentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
      const hasPassed = percentage >= passingScore;

      // Update attempt
      await supabase
        .from("quiz_attempts")
        .update({
          score: totalScore,
          max_score: totalMaxScore,
          passed: hasPassed,
          completed_at: new Date().toISOString(),
        })
        .eq("id", attemptId);

      setScore(totalScore);
      setMaxScore(totalMaxScore);
      setPassed(hasPassed);
      setFeedbacks(allFeedbacks);

      onComplete?.(hasPassed, totalScore, totalMaxScore);
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast({ title: "Error", description: "Failed to submit quiz", variant: "destructive" });
    } finally {
      setGrading(false);
    }
  }, [submitted, attemptId, questions, options, answers, passingScore, onComplete, toast]);

  const handleRetake = async () => {
    // Reset all state and create a new attempt
    setSubmitted(false);
    setGrading(false);
    setScore(0);
    setMaxScore(0);
    setPassed(false);
    setFeedbacks([]);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setAttemptId(null);
    setShowFeedbackDetails(false);
    if (timeLimitMinutes) {
      setTimeLeft(timeLimitMinutes * 60);
    }

    // Create a new attempt
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: attempt, error } = await supabase
        .from("quiz_attempts")
        .insert({ user_id: user.id, quiz_id: quizId })
        .select()
        .single();
      if (!error && attempt) {
        setAttemptId(attempt.id);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSingleAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleMultipleAnswer = (questionId: string, optionId: string, checked: boolean) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? (prev[questionId] as string[]) : [];
      if (checked) {
        return { ...prev, [questionId]: [...current, optionId] };
      } else {
        return { ...prev, [questionId]: current.filter((id) => id !== optionId) };
      }
    });
  };

  const handleTextAnswer = (questionId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentOptions = currentQuestion ? options[currentQuestion.id] || [] : [];
  const answeredCount = Object.keys(answers).length;
  const progressPercentage = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  const renderQuestionInput = () => {
    if (!currentQuestion) return null;

    const answer = answers[currentQuestion.id];

    switch (currentQuestion.question_type) {
      case "single_choice":
      case "true_false":
        return (
          <RadioGroup
            value={typeof answer === "string" ? answer : ""}
            onValueChange={(value) => handleSingleAnswer(currentQuestion.id, value)}
            className="space-y-3"
          >
            {currentOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={option.id} id={option.id} />
                <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                  {option.option_text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "multiple_choice":
        const selectedIds = Array.isArray(answer) ? answer : [];
        return (
          <div className="space-y-3">
            {currentOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <Checkbox
                  id={option.id}
                  checked={selectedIds.includes(option.id)}
                  onCheckedChange={(checked) =>
                    handleMultipleAnswer(currentQuestion.id, option.id, !!checked)
                  }
                />
                <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                  {option.option_text}
                </Label>
              </div>
            ))}
          </div>
        );

      case "matching":
        return (
          <div className="space-y-3">
            {currentOptions.map((option) => {
              const [left, right] = option.option_text.split("|||");
              return (
                <div key={option.id} className="flex items-center gap-4 p-3 rounded-lg border">
                  <span className="flex-1">{left}</span>
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-primary">{right}</span>
                </div>
              );
            })}
            <p className="text-sm text-muted-foreground">Match the items above.</p>
          </div>
        );

      case "fill_in":
      case "numerical":
        return (
          <Input
            placeholder="Type your answer..."
            value={typeof answer === "string" ? answer : ""}
            onChange={(e) => handleTextAnswer(currentQuestion.id, e.target.value)}
            className="text-lg"
          />
        );

      case "short_answer":
        return (
          <div className="space-y-2">
            <Input
              placeholder="Type your answer..."
              value={typeof answer === "string" ? answer : ""}
              onChange={(e) => handleTextAnswer(currentQuestion.id, e.target.value)}
              className="text-lg"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              This answer will be graded by AI
            </p>
          </div>
        );

      case "long_answer":
      case "scenario":
      case "case_study":
        return (
          <div className="space-y-2">
            <Textarea
              placeholder="Write your response..."
              value={typeof answer === "string" ? answer : ""}
              onChange={(e) => handleTextAnswer(currentQuestion.id, e.target.value)}
              rows={6}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              This answer will be graded by AI with detailed feedback
            </p>
          </div>
        );

      default:
        return (
          <Input
            placeholder="Type your answer..."
            value={typeof answer === "string" ? answer : ""}
            onChange={(e) => handleTextAnswer(currentQuestion.id, e.target.value)}
          />
        );
    }
  };

  const renderFeedbackCard = (fb: QuestionFeedback, question: QuizQuestion) => {
    return (
      <Card key={fb.questionId} className={`${fb.isCorrect ? "border-green-200" : "border-red-200"}`}>
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {fb.isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className="font-medium text-sm line-clamp-1">{question.question_text}</span>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">{fb.feedback}</p>

              {fb.isAIGraded && (
                <div className="flex items-center gap-1 mb-2">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-xs text-primary font-medium">AI Graded</span>
                </div>
              )}

              {fb.strengths && fb.strengths.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-1 text-xs font-medium text-green-600 mb-1">
                    <ThumbsUp className="w-3 h-3" />
                    Strengths
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                    {fb.strengths.map((s, i) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {fb.improvements && fb.improvements.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-xs font-medium text-orange-600 mb-1">
                    <Target className="w-3 h-3" />
                    Areas to Improve
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                    {fb.improvements.map((i, idx) => (
                      <li key={idx}>• {i}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <Badge variant={fb.isCorrect ? "default" : "destructive"} className="shrink-0">
              {fb.score}/{fb.maxPoints}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderResults = () => {
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const aiGradedCount = feedbacks.filter(f => f.isAIGraded).length;

    return (
      <div className="space-y-6 py-4">
        {/* Summary */}
        <div className="text-center space-y-4">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${passed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
            {passed ? <Trophy className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-1">
              {passed ? "Congratulations! You passed!" : "Quiz Complete"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {passed ? "Great job on completing this quiz!" : "Keep studying and try again."}
            </p>
          </div>

          <div className="flex justify-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{percentage}%</p>
              <p className="text-xs text-muted-foreground">Score</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{score}/{maxScore}</p>
              <p className="text-xs text-muted-foreground">Points</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">Passing: {passingScore}%</span>
            {passed ? (
              <Badge className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Passed
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="w-3 h-3 mr-1" />
                Not Passed
              </Badge>
            )}
          </div>

          {aiGradedCount > 0 && (
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" />
              {aiGradedCount} question{aiGradedCount > 1 ? "s" : ""} graded by AI
            </p>
          )}
        </div>

        {/* Toggle feedback details */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFeedbackDetails(!showFeedbackDetails)}
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            {showFeedbackDetails ? "Hide" : "Show"} Detailed Feedback
          </Button>
        </div>

        {/* Detailed Feedback */}
        {showFeedbackDetails && feedbacks.length > 0 && (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {feedbacks.map((fb) => {
                const question = questions.find(q => q.id === fb.questionId);
                if (!question) return null;
                return renderFeedbackCard(fb, question);
              })}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-center gap-3 pt-2">
          <Button variant="outline" onClick={handleRetake} size="lg">
            Retake Quiz
          </Button>
          <Button onClick={onClose} size="lg">
            Close
          </Button>
        </div>
      </div>
    );
  };

  const renderGrading = () => (
    <div className="text-center space-y-6 py-12">
      <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary" />
      <div>
        <h2 className="text-xl font-bold mb-2">Grading Your Answers...</h2>
        <p className="text-muted-foreground text-sm">
          AI is analyzing your responses and generating feedback
        </p>
      </div>
      <div className="flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
        <span className="text-sm text-muted-foreground">This may take a moment</span>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{quizTitle}</DialogTitle>
          {quizDescription && <DialogDescription>{quizDescription}</DialogDescription>}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p>Loading quiz...</p>
          </div>
        ) : grading ? (
          renderGrading()
        ) : submitted ? (
          renderResults()
        ) : (
          <div className="space-y-6">
            {/* Header with timer and progress */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <Badge variant="outline">{currentQuestion?.points} pts</Badge>
              </div>
              {timeLeft !== null && (
                <Badge variant={timeLeft < 60 ? "destructive" : "outline"} className="gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(timeLeft)}
                </Badge>
              )}
            </div>

            <Progress value={progressPercentage} className="h-2" />

            {/* Question */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{currentQuestion?.question_text}</CardTitle>
                <CardDescription>
                  {currentQuestion?.question_type === "multiple_choice"
                    ? "Select all that apply"
                    : currentQuestion?.question_type === "single_choice" || currentQuestion?.question_type === "true_false"
                    ? "Select one answer"
                    : "Enter your answer"}
                </CardDescription>
              </CardHeader>
              <CardContent>{renderQuestionInput()}</CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <span className="text-sm text-muted-foreground">
                {answeredCount} of {questions.length} answered
              </span>

              {currentQuestionIndex === questions.length - 1 ? (
                <Button onClick={handleSubmit}>
                  Submit Quiz
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestionIndex((i) => Math.min(questions.length - 1, i + 1))}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>

            {/* Question navigator */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              {questions.map((q, idx) => (
                <Button
                  key={q.id}
                  variant={answers[q.id] ? "default" : "outline"}
                  size="sm"
                  className={`w-8 h-8 p-0 ${currentQuestionIndex === idx ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setCurrentQuestionIndex(idx)}
                >
                  {idx + 1}
                </Button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
