import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  ArrowRightLeft,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { SortableOrderingList } from "@/components/quiz/SortableOrderingList";

interface QuizQuestion {
  id: string;
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

interface Quiz {
  id: string;
  title: string;
  description?: string | null;
  passing_score: number;
  time_limit_minutes?: number | null;
}

interface QuizPreviewProps {
  quiz: Quiz;
  questions: QuizQuestion[];
  options: Record<string, QuizOption[]>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuizPreview = ({ quiz, questions, options, open, onOpenChange }: QuizPreviewProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const currentOptions = currentQuestion ? options[currentQuestion.id] || [] : [];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleReset = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowResults(false);
  };

  const calculateScore = () => {
    let correct = 0;
    let total = 0;

    questions.forEach((question) => {
      const questionOptions = options[question.id] || [];
      const answer = answers[question.id];
      total += question.points;

      if (question.question_type === "single_choice" || question.question_type === "true_false") {
        const correctOption = questionOptions.find((o) => o.is_correct);
        if (correctOption && answer === correctOption.id) {
          correct += question.points;
        }
      } else if (question.question_type === "multiple_choice") {
        const correctOptionIds = questionOptions.filter((o) => o.is_correct).map((o) => o.id);
        const selectedIds = Array.isArray(answer) ? answer : [];
        if (
          correctOptionIds.length === selectedIds.length &&
          correctOptionIds.every((id) => selectedIds.includes(id))
        ) {
          correct += question.points;
        }
      } else if (question.question_type === "matching") {
        const pairs = questionOptions.map(o => {
          const [, right] = o.option_text.split("|||");
          return right;
        });
        const studentMatches = Array.isArray(answer) ? answer : [];
        let correctCount = 0;
        pairs.forEach((right, idx) => {
          if (studentMatches[idx] === right) correctCount++;
        });
        correct += Math.round((correctCount / Math.max(pairs.length, 1)) * question.points);
      } else if (question.question_type === "drag_drop") {
        const correctBuckets: Record<string, string> = {};
        questionOptions.forEach(o => {
          const [item, bucket] = o.option_text.split("|||");
          correctBuckets[item] = bucket;
        });
        const studentBuckets = typeof answer === "string" ? (() => { try { return JSON.parse(answer); } catch { return {}; } })() : {};
        let correctCount = 0;
        const totalItems = Object.keys(correctBuckets).length;
        Object.entries(correctBuckets).forEach(([item, bucket]) => {
          if (studentBuckets[item] === bucket) correctCount++;
        });
        correct += totalItems > 0 ? Math.round((correctCount / totalItems) * question.points) : 0;
      } else if (question.question_type === "ordering") {
        const correctOrder = questionOptions.map(o => o.id);
        const studentOrder = Array.isArray(answer) ? answer : [];
        if (JSON.stringify(correctOrder) === JSON.stringify(studentOrder)) {
          correct += question.points;
        }
      } else if (question.question_type === "fill_in" || question.question_type === "short_answer" || question.question_type === "numerical") {
        const correctOption = questionOptions.find((o) => o.is_correct);
        if (correctOption && typeof answer === "string" && answer.toLowerCase().trim() === correctOption.option_text.toLowerCase().trim()) {
          correct += question.points;
        }
      }
    });

    return { correct, total, percentage: total > 0 ? Math.round((correct / total) * 100) : 0 };
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const questionAnswer = answers[currentQuestion.id];

    switch (currentQuestion.question_type) {
      case "single_choice":
      case "true_false":
        return (
          <RadioGroup
            value={typeof questionAnswer === "string" ? questionAnswer : ""}
            onValueChange={(value) => setAnswers({ ...answers, [currentQuestion.id]: value })}
            className="space-y-3"
          >
            {currentOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value={option.id} id={option.id} />
                <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                  {option.option_text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "multiple_choice":
        const selectedOptions = Array.isArray(questionAnswer) ? questionAnswer : [];
        return (
          <div className="space-y-3">
            {currentOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <Checkbox
                  id={option.id}
                  checked={selectedOptions.includes(option.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setAnswers({ ...answers, [currentQuestion.id]: [...selectedOptions, option.id] });
                    } else {
                      setAnswers({ ...answers, [currentQuestion.id]: selectedOptions.filter((id) => id !== option.id) });
                    }
                  }}
                />
                <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                  {option.option_text}
                </Label>
              </div>
            ))}
          </div>
        );

      case "fill_in":
      case "short_answer":
      case "numerical":
        return (
          <Input
            placeholder={currentQuestion.question_type === "numerical" ? "Enter your numerical answer..." : "Type your answer..."}
            type={currentQuestion.question_type === "numerical" ? "number" : "text"}
            value={typeof questionAnswer === "string" ? questionAnswer : ""}
            onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
            className="max-w-md"
          />
        );

      case "long_answer":
      case "scenario":
      case "case_study":
      case "code_based":
        return (
          <Textarea
            placeholder="Type your detailed answer here..."
            value={typeof questionAnswer === "string" ? questionAnswer : ""}
            onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
            rows={6}
            className={currentQuestion.question_type === "code_based" ? "font-mono" : ""}
          />
        );

      case "matching": {
        const matchAnswer = (Array.isArray(questionAnswer) ? questionAnswer : []) as string[];
        const pairs = currentOptions.map((opt) => {
          const [left, right] = opt.option_text.split("|||");
          return { id: opt.id, left, right };
        });
        const rightOpts = [...pairs].sort((a, b) => a.right.localeCompare(b.right));
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select the correct match for each item on the left.</p>
            {pairs.map((pair, idx) => {
              const selectedRight = matchAnswer[idx] || "";
              return (
                <div key={pair.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-lg border bg-muted/30">
                  <span className="flex-1 font-medium break-words whitespace-normal">{pair.left}</span>
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                  <select
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedRight}
                    onChange={(e) => {
                      const newMatches = [...matchAnswer];
                      while (newMatches.length < pairs.length) newMatches.push("");
                      newMatches[idx] = e.target.value;
                      setAnswers({ ...answers, [currentQuestion.id]: newMatches });
                    }}
                  >
                    <option value="">-- Select --</option>
                    {rightOpts.map((ro) => (
                      <option key={ro.id} value={ro.right}>{ro.right}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        );
      }

      case "drag_drop": {
        const ddItems = currentOptions.map(o => {
          const [item, bucket] = o.option_text.split("|||");
          return { id: o.id, item, correctBucket: bucket };
        });
        const ddBuckets = [...new Set(ddItems.map(i => i.correctBucket))];
        let ddAssignments: Record<string, string> = {};
        if (typeof questionAnswer === "string") {
          try { ddAssignments = JSON.parse(questionAnswer); } catch {}
        }
        const ddUnassigned = ddItems.filter(i => !ddAssignments[i.item]);

        const ddAssign = (itemText: string, bucketName: string) => {
          const newA = { ...ddAssignments, [itemText]: bucketName };
          setAnswers({ ...answers, [currentQuestion.id]: JSON.stringify(newA) });
        };
        const ddRemove = (itemText: string) => {
          const newA = { ...ddAssignments };
          delete newA[itemText];
          setAnswers({ ...answers, [currentQuestion.id]: JSON.stringify(newA) });
        };

        return (
          <div className="space-y-4">
            {ddUnassigned.length > 0 && (
              <div className="bg-primary/10 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-center">Click an item, then click a bucket to place it</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {ddUnassigned.map(item => (
                    <span key={item.id} className="px-4 py-2 bg-card text-card-foreground border-2 border-border rounded-md text-sm shadow font-semibold">
                      {item.item}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">{ddUnassigned.length} item{ddUnassigned.length !== 1 ? "s" : ""} left</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ddBuckets.map(bucket => {
                const bucketItems = ddItems.filter(i => ddAssignments[i.item] === bucket);
                return (
                  <div key={bucket} className="border-2 border-dashed rounded-lg p-4 min-h-[100px] space-y-2">
                    <h4 className="font-semibold text-center">{bucket}</h4>
                    {bucketItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-1.5 bg-muted text-foreground rounded text-sm font-medium">
                        <span>{item.item}</span>
                        <button className="text-muted-foreground hover:text-foreground" onClick={() => ddRemove(item.item)}>✕</button>
                      </div>
                    ))}
                    {ddUnassigned.length > 0 && ddUnassigned.map(item => (
                      <Button key={item.id} variant="outline" size="sm" className="w-full text-xs opacity-0 hover:opacity-100 transition-opacity" onClick={() => ddAssign(item.item, bucket)}>
                        + {item.item}
                      </Button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case "ordering": {
        const orderAnswer = (Array.isArray(questionAnswer) ? questionAnswer : []) as string[];
        const orderItems = orderAnswer.length > 0
          ? orderAnswer.map(id => currentOptions.find(o => o.id === id)).filter(Boolean) as typeof currentOptions
          : currentOptions;

        if (orderAnswer.length === 0 && currentOptions.length > 0) {
          const shuffled = [...currentOptions].sort(() => Math.random() - 0.5).map(o => o.id);
          setTimeout(() => setAnswers(prev => {
            if (!prev[currentQuestion.id]) {
              return { ...prev, [currentQuestion.id]: shuffled };
            }
            return prev;
          }), 0);
        }

        return (
          <SortableOrderingList
            items={orderItems.map(o => ({ id: o.id, text: o.option_text }))}
            onReorder={(newIds) => setAnswers({ ...answers, [currentQuestion.id]: newIds })}
          />
        );
      }

      default:
        return <p className="text-muted-foreground">This question type is not yet supported in preview mode.</p>;
    }
  };

  const renderResults = () => {
    const { correct, total, percentage } = calculateScore();
    const passed = percentage >= quiz.passing_score;

    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          {passed ? (
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          ) : (
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          )}
          <h3 className="text-2xl font-bold mb-2">
            {passed ? "Congratulations!" : "Keep Practicing"}
          </h3>
          <p className="text-muted-foreground">
            {passed ? "You passed the quiz!" : "You didn't reach the passing score this time."}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-primary">{percentage}%</p>
                <p className="text-sm text-muted-foreground">Your Score</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{correct}/{total}</p>
                <p className="text-sm text-muted-foreground">Points Earned</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{quiz.passing_score}%</p>
                <p className="text-sm text-muted-foreground">Passing Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={handleReset}>
            Try Again
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Close Preview
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <DialogTitle>Quiz Preview: {quiz.title}</DialogTitle>
          </div>
          {quiz.description && (
            <p className="text-sm text-muted-foreground">{quiz.description}</p>
          )}
        </DialogHeader>

        {!showResults ? (
          <div className="space-y-6">
            {/* Progress and Timer */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-1">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {quiz.time_limit_minutes && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {quiz.time_limit_minutes} min
                  </Badge>
                )}
                <Badge variant="secondary">
                  {currentQuestion?.points || 0} pts
                </Badge>
              </div>
            </div>

            {/* Question */}
            {currentQuestion && (
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <Badge variant="outline" className="mb-3">
                      {currentQuestion.question_type.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                    <h3 className="text-lg font-semibold">{currentQuestion.question_text}</h3>
                  </div>

                  {renderQuestion()}
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button onClick={handleNext}>
                {currentQuestionIndex === questions.length - 1 ? "Finish" : "Next"}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          renderResults()
        )}
      </DialogContent>
    </Dialog>
  );
};
