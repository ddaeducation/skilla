import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Loader2,
  Sparkles,
  Lightbulb,
  CheckCircle,
  XCircle,
  ChevronRight,
  Trophy,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FollowUpQuestion {
  question: string;
  hint: string;
  options: { text: string; is_correct: boolean }[];
  explanation: string;
}

interface WrongQuestion {
  questionText: string;
  studentAnswer: string;
  correctAnswer: string;
  feedback: string;
}

interface FollowUpQuizProps {
  open: boolean;
  onClose: () => void;
  wrongQuestions: WrongQuestion[];
  scorePercentage: number;
  quizTitle: string;
}

export const FollowUpQuiz = ({
  open,
  onClose,
  wrongQuestions,
  scorePercentage,
  quizTitle,
}: FollowUpQuizProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<FollowUpQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [finished, setFinished] = useState(false);

  const generateQuestions = async () => {
    setLoading(true);
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswer("");
    setAnswered(false);
    setCorrectCount(0);
    setTotalAnswered(0);
    setShowHint(false);
    setFinished(false);

    try {
      const { data, error } = await supabase.functions.invoke("generate-followup-questions", {
        body: { wrongQuestions, scorePercentage, quizTitle },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.questions?.length) throw new Error("No questions generated");

      setQuestions(data.questions);
    } catch (err: any) {
      console.error("Follow-up generation error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to generate practice questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = () => {
    if (!selectedAnswer) return;
    setAnswered(true);
    setTotalAnswered((p) => p + 1);
    const current = questions[currentIndex];
    const correct = current.options.find((o) => o.is_correct);
    if (correct && selectedAnswer === correct.text) {
      setCorrectCount((p) => p + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex >= questions.length - 1) {
      setFinished(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedAnswer("");
    setAnswered(false);
    setShowHint(false);
  };

  const current = questions[currentIndex];
  const isCorrectAnswer = current?.options.find((o) => o.is_correct)?.text === selectedAnswer;

  const renderIntro = () => (
    <div className="text-center space-y-6 py-8">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h3 className="text-xl font-bold mb-2">Practice & Improve</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Based on your quiz results ({scorePercentage}%), we'll generate personalized practice
          questions targeting the areas where you need improvement.
        </p>
      </div>
      <div className="bg-muted/50 rounded-lg p-4 max-w-sm mx-auto">
        <p className="text-sm font-medium mb-1">Topics to review:</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          {wrongQuestions.slice(0, 4).map((q, i) => (
            <li key={i} className="truncate">• {q.questionText}</li>
          ))}
          {wrongQuestions.length > 4 && (
            <li className="text-xs text-muted-foreground">...and {wrongQuestions.length - 4} more</li>
          )}
        </ul>
      </div>
      <Button onClick={generateQuestions} size="lg" className="gap-2">
        <Sparkles className="w-4 h-4" />
        Generate Practice Questions
      </Button>
    </div>
  );

  const renderLoading = () => (
    <div className="text-center space-y-4 py-12">
      <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">Generating personalized questions...</p>
    </div>
  );

  const renderQuestion = () => {
    if (!current) return null;
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="w-3 h-3" />
            {correctCount}/{totalAnswered} correct
          </Badge>
        </div>

        <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-2" />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{current.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer} disabled={answered}>
              {current.options.map((opt, idx) => {
                let optClass = "";
                if (answered) {
                  if (opt.is_correct) optClass = "border-green-500 bg-green-50 dark:bg-green-950/30";
                  else if (selectedAnswer === opt.text && !opt.is_correct)
                    optClass = "border-red-500 bg-red-50 dark:bg-red-950/30";
                }
                return (
                  <div
                    key={idx}
                    className={`flex items-center space-x-2 border rounded-lg p-3 transition-colors ${optClass}`}
                  >
                    <RadioGroupItem value={opt.text} id={`followup-${idx}`} />
                    <Label htmlFor={`followup-${idx}`} className="flex-1 cursor-pointer text-sm">
                      {opt.text}
                    </Label>
                    {answered && opt.is_correct && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {answered && selectedAnswer === opt.text && !opt.is_correct && (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                );
              })}
            </RadioGroup>

            {!answered && !showHint && (
              <Button variant="ghost" size="sm" onClick={() => setShowHint(true)} className="gap-1 text-xs">
                <Lightbulb className="w-3 h-3" />
                Show Hint
              </Button>
            )}

            {showHint && !answered && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
                  {current.hint}
                </p>
              </div>
            )}

            {answered && (
              <div
                className={`rounded-lg p-3 ${
                  isCorrectAnswer
                    ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                    : "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                }`}
              >
                <p className="text-sm font-medium mb-1">
                  {isCorrectAnswer ? "🎉 Correct!" : "📖 Let's learn from this:"}
                </p>
                <p className="text-sm text-muted-foreground">{current.explanation}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          {!answered ? (
            <Button onClick={handleAnswer} disabled={!selectedAnswer}>
              Check Answer
            </Button>
          ) : (
            <Button onClick={handleNext} className="gap-1">
              {currentIndex >= questions.length - 1 ? "See Results" : "Next"}
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderFinished = () => {
    const pct = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const improved = pct > scorePercentage;
    return (
      <div className="text-center space-y-6 py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold mb-1">Practice Complete!</h3>
          <p className="text-3xl font-bold text-primary">
            {correctCount}/{totalAnswered} correct ({pct}%)
          </p>
          {improved && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center justify-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Great improvement from your quiz score of {scorePercentage}%!
            </p>
          )}
          {!improved && (
            <p className="text-sm text-muted-foreground mt-2">
              Keep practicing — every attempt helps you learn!
            </p>
          )}
        </div>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={generateQuestions} className="gap-1">
            <RefreshCw className="w-4 h-4" />
            Practice Again
          </Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Follow-Up Practice
          </DialogTitle>
          <DialogDescription>Personalized questions to help you improve</DialogDescription>
        </DialogHeader>
        {loading
          ? renderLoading()
          : finished
          ? renderFinished()
          : questions.length > 0
          ? renderQuestion()
          : renderIntro()}
      </DialogContent>
    </Dialog>
  );
};
