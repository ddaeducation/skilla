import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, SkipForward, HelpCircle } from "lucide-react";

interface VideoQuizPoint {
  id: string;
  timestamp_seconds: number;
  question_text: string;
  question_type: string;
  points: number;
  explanation: string | null;
  behavior: string;
  counts_toward_grade: boolean;
}

interface VideoQuizOption {
  id: string;
  video_quiz_point_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

interface VideoQuizPopupProps {
  lessonId: string;
  courseId: string;
  currentTimeSeconds: number;
  onPauseVideo: () => void;
  onResumeVideo: () => void;
  userId?: string;
}

export const VideoQuizPopup = ({
  lessonId,
  courseId,
  currentTimeSeconds,
  onPauseVideo,
  onResumeVideo,
  userId,
}: VideoQuizPopupProps) => {
  const [quizPoints, setQuizPoints] = useState<VideoQuizPoint[]>([]);
  const [allOptions, setAllOptions] = useState<Record<string, VideoQuizOption[]>>({});
  const [triggeredIds, setTriggeredIds] = useState<Set<string>>(new Set());
  const [activePoint, setActivePoint] = useState<VideoQuizPoint | null>(null);
  const [answer, setAnswer] = useState<string | string[]>("");
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [visible, setVisible] = useState(false);
  const previousTimeRef = useRef<number | null>(null);

  // Load quiz points once
  useEffect(() => {
    const load = async () => {
      setQuizPoints([]);
      setAllOptions({});
      setTriggeredIds(new Set());

      const { data: points } = await supabase
        .from("video_quiz_points")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("timestamp_seconds");
      if (!points || points.length === 0) return;
      setQuizPoints(points as VideoQuizPoint[]);

      const pointIds = points.map((p: any) => p.id);
      const { data: opts } = await supabase
        .from("video_quiz_point_options")
        .select("*")
        .in("video_quiz_point_id", pointIds)
        .order("order_index");

      const grouped: Record<string, VideoQuizOption[]> = {};
      (opts || []).forEach((o: any) => {
        if (!grouped[o.video_quiz_point_id]) grouped[o.video_quiz_point_id] = [];
        grouped[o.video_quiz_point_id].push(o);
      });
      setAllOptions(grouped);

      // Don't pre-load answered — quizzes should always appear on rewatch
    };
    load();
  }, [lessonId, userId]);

  useEffect(() => {
    previousTimeRef.current = null;
    setTriggeredIds(new Set());
  }, [lessonId]);

  // Check if current time crosses a quiz timestamp
  useEffect(() => {
    if (activePoint || quizPoints.length === 0) return;

    const currentSec = Math.floor(currentTimeSeconds);
    const previousSec = previousTimeRef.current;
    previousTimeRef.current = currentSec;

    if (previousSec === null) {
      const exactPoint = quizPoints.find(
        (p) => p.timestamp_seconds === currentSec && !triggeredIds.has(p.id)
      );
      if (exactPoint) {
        triggerQuizPoint(exactPoint);
      }
      return;
    }

    // If user seeked backward, reset triggered quizzes that are ahead of current time
    if (currentSec < previousSec - 2) {
      setTriggeredIds((prev) => {
        const newSet = new Set<string>();
        prev.forEach((id) => {
          const point = quizPoints.find((p) => p.id === id);
          if (point && point.timestamp_seconds < currentSec) {
            newSet.add(id);
          }
        });
        return newSet;
      });
    }

    const fromSec = Math.min(previousSec, currentSec);
    const toSec = Math.max(previousSec, currentSec);

    const matchingPoint = quizPoints.find(
      (p) => p.timestamp_seconds >= fromSec && p.timestamp_seconds <= toSec && !triggeredIds.has(p.id)
    );

    if (matchingPoint) {
      triggerQuizPoint(matchingPoint);
    }
  }, [currentTimeSeconds, quizPoints, triggeredIds, activePoint]);

  const triggerQuizPoint = (point: VideoQuizPoint) => {
    onPauseVideo();
    setActivePoint(point);
    setAnswer(point.question_type === "multiple_choice" ? [] : "");
    setSubmitted(false);
    setIsCorrect(false);
    setVisible(true);
    // Fade-in animation
    setTimeout(() => setFadeIn(true), 50);
  };

  const checkAnswer = useCallback(() => {
    if (!activePoint) return;
    const options = allOptions[activePoint.id] || [];

    let correct = false;
    if (activePoint.question_type === "single_choice" || activePoint.question_type === "true_false") {
      const correctOpt = options.find((o) => o.is_correct);
      correct = correctOpt?.id === answer;
    } else if (activePoint.question_type === "multiple_choice") {
      const correctIds = options.filter((o) => o.is_correct).map((o) => o.id);
      const selected = Array.isArray(answer) ? answer : [];
      correct = correctIds.length === selected.length && correctIds.every((id) => selected.includes(id));
    } else if (activePoint.question_type === "fill_in" || activePoint.question_type === "short_answer") {
      const correctOpt = options.find((o) => o.is_correct);
      correct = correctOpt
        ? typeof answer === "string" && answer.toLowerCase().trim() === correctOpt.option_text.toLowerCase().trim()
        : false;
    }

    setIsCorrect(correct);
    setSubmitted(true);

    // Save response
    if (userId) {
      supabase.from("video_quiz_point_responses").upsert({
        video_quiz_point_id: activePoint.id,
        user_id: userId,
        course_id: courseId,
        answer: typeof answer === "string" ? answer : JSON.stringify(answer),
        is_correct: correct,
      }, { onConflict: "video_quiz_point_id,user_id" }).then(() => {});
    }
  }, [activePoint, allOptions, answer, userId, courseId]);

  const handleContinue = () => {
    if (!activePoint) return;
    // For must_correct behavior, don't allow continue if wrong
    if (activePoint.behavior === "must_correct" && submitted && !isCorrect) {
      // Reset for retry
      setAnswer(activePoint.question_type === "multiple_choice" ? [] : "");
      setSubmitted(false);
      return;
    }
    dismiss();
  };

  const handleSkip = () => {
    // Save skip as zero score
    if (userId && activePoint) {
      supabase.from("video_quiz_point_responses").upsert({
        video_quiz_point_id: activePoint.id,
        user_id: userId,
        course_id: courseId,
        answer: "skipped",
        is_correct: false,
      }, { onConflict: "video_quiz_point_id,user_id" }).then(() => {});
    }
    dismiss();
  };

  const dismiss = () => {
    setFadeIn(false);
    setTimeout(() => {
      if (activePoint) {
        setTriggeredIds((prev) => new Set([...prev, activePoint.id]));
      }
      setActivePoint(null);
      setVisible(false);
      onResumeVideo();
    }, 300);
  };

  if (!visible || !activePoint) return null;

  const options = allOptions[activePoint.id] || [];

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 transition-opacity duration-300 p-4 ${
        fadeIn ? "opacity-100" : "opacity-0"
      }`}
      style={{ pointerEvents: fadeIn ? "auto" : "none" }}
    >
      <Card className="w-full max-w-lg shadow-2xl border-border bg-background max-h-[90vh] overflow-y-auto">
        <CardContent className="pt-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="gap-1">
              <HelpCircle className="w-3 h-3" />
              Pop-up Quiz
            </Badge>
            <Badge variant="outline">{activePoint.points} pts</Badge>
          </div>

          {/* Question */}
          <p className="text-base font-normal">{activePoint.question_text}</p>

          {/* Answer area */}
          {!submitted && (
            <>
              {(activePoint.question_type === "single_choice" || activePoint.question_type === "true_false") && (
                <RadioGroup
                  value={typeof answer === "string" ? answer : ""}
                  onValueChange={(v) => setAnswer(v)}
                  className="space-y-2"
                >
                  {options.map((opt) => (
                    <div key={opt.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value={opt.id} id={`vq-${opt.id}`} />
                      <Label htmlFor={`vq-${opt.id}`} className="flex-1 cursor-pointer text-sm">
                        {opt.option_text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {activePoint.question_type === "multiple_choice" && (
                <div className="space-y-2">
                  {options.map((opt) => {
                    const selected = Array.isArray(answer) ? answer : [];
                    return (
                      <div key={opt.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                        <Checkbox
                          id={`vq-${opt.id}`}
                          checked={selected.includes(opt.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setAnswer([...selected, opt.id]);
                            else setAnswer(selected.filter((id) => id !== opt.id));
                          }}
                        />
                        <Label htmlFor={`vq-${opt.id}`} className="flex-1 cursor-pointer text-sm">
                          {opt.option_text}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}

              {(activePoint.question_type === "fill_in" || activePoint.question_type === "short_answer") && (
                <Input
                  value={typeof answer === "string" ? answer : ""}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer..."
                  autoFocus
                />
              )}
            </>
          )}

          {/* Result feedback */}
          {submitted && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${isCorrect ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"}`}>
              {isCorrect ? (
                <><CheckCircle className="w-5 h-5" /><span className="font-medium">Correct!</span></>
              ) : (
                <><XCircle className="w-5 h-5" /><span className="font-medium">
                  {activePoint.behavior === "must_correct" ? "Incorrect — try again" : "Incorrect"}
                </span></>
              )}
            </div>
          )}

          {/* Explanation */}
          {submitted && activePoint.explanation && (
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{activePoint.explanation}</p>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-2">
            {!submitted && (
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                <SkipForward className="w-4 h-4 mr-1" /> Skip
              </Button>
            )}
            {!submitted ? (
              <Button size="sm" onClick={checkAnswer} disabled={!answer || (Array.isArray(answer) && answer.length === 0)}>
                Submit Answer
              </Button>
            ) : (
              <Button size="sm" onClick={handleContinue}>
                {activePoint.behavior === "must_correct" && !isCorrect ? "Try Again" : "Continue Watching"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
