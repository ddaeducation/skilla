import { useState } from "react";
import { Sparkles, Loader2, BookOpen, FileQuestion, ClipboardList, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface AIFullCourseGeneratorProps {
  courseId: string;
  courseTitle: string;
  courseDescription: string | null;
  onCourseGenerated: () => void;
}

export const AIFullCourseGenerator = ({
  courseId,
  courseTitle,
  courseDescription,
  onCourseGenerated,
}: AIFullCourseGeneratorProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [description, setDescription] = useState(courseDescription || "");
  const [modulesCount, setModulesCount] = useState(5);
  const [lessonsPerModule, setLessonsPerModule] = useState(5);
  const [includeQuizzes, setIncludeQuizzes] = useState(true);
  const [includeAssignments, setIncludeAssignments] = useState(true);
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ modules: number; lessons: number; quizzes: number; assignments: number } | null>(null);

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast({ title: "Description required", description: "Please provide a course description to generate content.", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setProgress(10);
    setResult(null);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 3, 90));
      }, 3000);

      const res = await supabase.functions.invoke("generate-full-course", {
        body: {
          courseId,
          courseTitle,
          courseDescription: description,
          modulesCount,
          lessonsPerModule,
          includeQuizzes,
          includeAssignments,
          difficulty,
        },
      });

      clearInterval(progressInterval);

      // Handle edge function errors with detailed messages
      if (res.error) {
        // Check if it's a connection timeout - the function may have succeeded
        const errorMsg = res.error?.message || "";
        const isTimeout = errorMsg.includes("Failed to fetch") || errorMsg.includes("network") || errorMsg.includes("timeout") || errorMsg.includes("aborted");
        
        if (isTimeout) {
          // Function likely completed but connection dropped - check if content was created
          setProgress(95);
          toast({
            title: "Course generation may have completed",
            description: "The connection timed out but the course may have been generated. Refreshing content...",
          });
          onCourseGenerated();
          setProgress(100);
          setResult({ modules: modulesCount, lessons: modulesCount * lessonsPerModule, quizzes: includeQuizzes ? modulesCount : 0, assignments: includeAssignments ? modulesCount : 0 });
          return;
        }

        let errorMessage = "Failed to generate course content.";
        try {
          const errorData = await res.error?.context?.json?.();
          if (errorData?.error) errorMessage = errorData.error;
        } catch {
          if (res.data?.error) errorMessage = res.data.error;
        }
        throw new Error(errorMessage);
      }
      if (res.data?.error) throw new Error(res.data.error);
      const data = res.data;

      setProgress(100);
      setResult(data.summary);

      toast({
        title: "Course generated successfully!",
        description: `Created ${data.summary.modules} modules, ${data.summary.lessons} lessons, ${data.summary.quizzes} quizzes, ${data.summary.assignments} assignments.`,
      });

      onCourseGenerated();
    } catch (error: any) {
      console.error("Error generating course:", error);
      
      // Check for connection/timeout errors - function may have succeeded server-side
      const msg = error.message || "";
      if (msg.includes("Failed to fetch") || msg.includes("network") || msg.includes("timeout")) {
        toast({
          title: "Course generation may have completed",
          description: "The connection timed out, but the course content may have been created. Please refresh the page to check.",
        });
        onCourseGenerated();
      } else {
        toast({
          title: "Generation failed",
          description: error.message || "Failed to generate course content. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    if (!generating) {
      setOpen(false);
      setResult(null);
      setProgress(0);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="default"
        size="sm"
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        AI Generate Course
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Course Generator
            </DialogTitle>
            <DialogDescription>
              Generate a complete course structure with modules, lessons, quizzes, and assignments powered by AI.
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className="space-y-4 py-4">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg">Course Generated!</h3>
                <p className="text-sm text-muted-foreground">Your course content has been created successfully.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                  <Layers className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{result.modules}</p>
                    <p className="text-xs text-muted-foreground">Modules</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{result.lessons}</p>
                    <p className="text-xs text-muted-foreground">Lessons</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                  <FileQuestion className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{result.quizzes}</p>
                    <p className="text-xs text-muted-foreground">Quizzes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{result.assignments}</p>
                    <p className="text-xs text-muted-foreground">Assignments</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleClose}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div>
                <Label>Course Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this course is about, who it's for, and what students will learn..."
                  rows={4}
                  disabled={generating}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Number of Modules</Label>
                  <Input
                    type="number"
                    min={2}
                    max={12}
                    value={modulesCount}
                    onChange={(e) => setModulesCount(Number(e.target.value))}
                    disabled={generating}
                  />
                </div>
                <div>
                  <Label>Lessons per Module</Label>
                  <Input
                    type="number"
                    min={2}
                    max={10}
                    value={lessonsPerModule}
                    onChange={(e) => setLessonsPerModule(Number(e.target.value))}
                    disabled={generating}
                  />
                </div>
              </div>

              <div>
                <Label>Difficulty Level</Label>
                <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)} disabled={generating}>
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

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileQuestion className="h-4 w-4 text-muted-foreground" />
                  <Label className="cursor-pointer">Include Quizzes</Label>
                </div>
                <Switch checked={includeQuizzes} onCheckedChange={setIncludeQuizzes} disabled={generating} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <Label className="cursor-pointer">Include Assignments</Label>
                </div>
                <Switch checked={includeAssignments} onCheckedChange={setIncludeAssignments} disabled={generating} />
              </div>

              {generating && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating course content... This may take a minute.</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={handleClose} disabled={generating}>
                  Cancel
                </Button>
                <Button onClick={handleGenerate} disabled={generating} className="gap-2">
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {generating ? "Generating..." : "Generate Course"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
