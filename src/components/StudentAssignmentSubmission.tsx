import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  X, 
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Download,
  BookOpen,
  ChevronDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AssignmentSubmission {
  id: string;
  submission_text: string | null;
  file_url: string | null;
  submitted_at: string;
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
}

interface StudentAssignmentSubmissionProps {
  assignmentId: string;
  assignmentTitle: string;
  assignmentDescription?: string | null;
  instructions?: string | null;
  rubrics?: string | null;
  maxScore: number;
  dueDate?: string | null;
  maxSubmissions?: number | null;
  aiGradingEnabled?: boolean;
  open: boolean;
  onClose: () => void;
  onSubmit?: () => void;
}

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const StudentAssignmentSubmission = ({
  assignmentId,
  assignmentTitle,
  assignmentDescription,
  instructions,
  rubrics,
  maxScore,
  dueDate,
  maxSubmissions,
  aiGradingEnabled = false,
  open,
  onClose,
  onSubmit,
}: StudentAssignmentSubmissionProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<AssignmentSubmission | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [aiGrading, setAiGrading] = useState(false);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [maxSubmissionsReached, setMaxSubmissionsReached] = useState(false);

  useEffect(() => {
    if (open) {
      fetchExistingSubmission();
    }
  }, [open, assignmentId]);

  const fetchExistingSubmission = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setExistingSubmission(data);
        setSubmissionText(data.submission_text || "");
      }
    } catch (error) {
      console.error("Error fetching submission:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, Word document, PowerPoint, Excel, image, or text file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <Image className="w-8 h-8 text-blue-500" />;
    if (file.type === "application/pdf") return <FileText className="w-8 h-8 text-red-500" />;
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const handleSubmit = async () => {
    if (!submissionText.trim() && !selectedFile) {
      toast({
        title: "Error",
        description: "Please provide a text response or upload a file.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let fileUrl: string | null = null;

      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${user.id}/${assignmentId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("assignment-submissions")
          .upload(fileName, selectedFile, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("assignment-submissions")
          .getPublicUrl(fileName);

        fileUrl = urlData.publicUrl;
        setUploadProgress(100);
      }

      if (existingSubmission) {
        // Update existing submission
        const { error } = await supabase
          .from("assignment_submissions")
          .update({
            submission_text: submissionText.trim() || null,
            file_url: fileUrl || existingSubmission.file_url,
            submitted_at: new Date().toISOString(),
          })
          .eq("id", existingSubmission.id);

        if (error) throw error;
      } else {
        // Create new submission
        const { error } = await supabase.from("assignment_submissions").insert({
          assignment_id: assignmentId,
          user_id: user.id,
          submission_text: submissionText.trim() || null,
          file_url: fileUrl,
        });

        if (error) throw error;
      }

      // Determine grading method:
      // - If submission has a file attachment → peer review
      // - If AI grading is enabled and text-only → AI grades it
      // - Otherwise → manual/instructor grading
      const hasAttachment = !!(fileUrl || (existingSubmission?.file_url && !selectedFile));

      if (hasAttachment) {
        toast({
          title: "Submitted for Peer Review!",
          description: "Your assignment includes an attachment and will be reviewed by your classmates.",
        });
      } else if (aiGradingEnabled && submissionText.trim()) {
        setAiGrading(true);
        try {
          const { data: gradeData, error: gradeError } = await supabase.functions.invoke("ai-grade-answer", {
            body: {
              questionText: `${assignmentTitle}${instructions ? '\n\nInstructions: ' + instructions.replace(/<[^>]*>/g, '') : ''}`,
              questionType: "assignment",
              studentAnswer: submissionText.trim(),
              maxPoints: maxScore,
              rubric: rubrics || undefined,
            },
          });

          if (!gradeError && gradeData && !gradeData.error) {
            const { data: latestSub } = await supabase
              .from("assignment_submissions")
              .select("id")
              .eq("assignment_id", assignmentId)
              .eq("user_id", user.id)
              .order("submitted_at", { ascending: false })
              .limit(1)
              .single();

            if (latestSub) {
              await supabase
                .from("assignment_submissions")
                .update({
                  score: gradeData.score,
                  feedback: gradeData.feedback,
                  graded_at: new Date().toISOString(),
                })
                .eq("id", latestSub.id);
            }

            toast({
              title: "AI Grading Complete!",
              description: `Score: ${gradeData.score}/${maxScore}. ${gradeData.feedback}`,
            });
          }
        } catch (gradeErr) {
          console.error("AI grading error:", gradeErr);
        } finally {
          setAiGrading(false);
        }
      } else {
        toast({
          title: "Success!",
          description: "Your assignment has been submitted.",
        });
      }

      onSubmit?.();
      onClose();
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit assignment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isOverdue = dueDate && new Date(dueDate) < new Date();
  const isGraded = existingSubmission?.graded_at != null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{assignmentTitle}</DialogTitle>
          {assignmentDescription && <DialogDescription>{assignmentDescription}</DialogDescription>}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Assignment Info */}
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                {maxScore} points
              </Badge>
              {dueDate && (
                <Badge variant={isOverdue ? "destructive" : "outline"} className="gap-1">
                  <Clock className="w-3 h-3" />
                  Due: {format(new Date(dueDate), "MMM d, yyyy h:mm a")}
                </Badge>
              )}
              {existingSubmission && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Submitted
                </Badge>
              )}
              {isGraded && (
                <Badge variant="default" className="gap-1 bg-green-500">
                  Score: {existingSubmission?.score}/{maxScore}
                </Badge>
              )}
            </div>


            {/* Feedback (if graded) */}
            {isGraded && existingSubmission?.feedback && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-green-800">Instructor Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-green-700 whitespace-pre-wrap">{existingSubmission.feedback}</p>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Submission Form */}
            {!isGraded && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="submission-text">Your Response</Label>
                  <Textarea
                    id="submission-text"
                    placeholder="Type your response here..."
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                </div>

                {/* File Upload */}
                <div className="space-y-4">
                  <Label>Attachments</Label>
                  
                  {selectedFile ? (
                    <Card className="p-4">
                      <div className="flex items-center gap-4">
                        {getFileIcon(selectedFile)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleRemoveFile}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ) : existingSubmission?.file_url ? (
                    <Card className="p-4">
                      <div className="flex items-center gap-4">
                        <FileText className="w-8 h-8 text-blue-500" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">Previously uploaded file</p>
                          <a 
                            href={existingSubmission.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </a>
                        </div>
                      </div>
                    </Card>
                  ) : null}

                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept={ALLOWED_FILE_TYPES.join(",")}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm font-medium mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, Word, PowerPoint, Excel, Images (max 10MB)
                      </p>
                    </label>
                  </div>
                </div>

                {/* Warning for overdue */}
                {isOverdue && (
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="py-3 flex items-center gap-2 text-yellow-800">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">This assignment is past due. Late submissions may affect your grade.</span>
                    </CardContent>
                  </Card>
                )}

                {/* Submit Button */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitting || aiGrading}>
                    {aiGrading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        AI Grading...
                      </>
                    ) : submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : existingSubmission ? (
                      "Update Submission"
                    ) : (
                      "Submit Assignment"
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* View-only for graded submissions */}
            {isGraded && (
              <div className="space-y-4">
                {existingSubmission?.submission_text && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Your Submission</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{existingSubmission.submission_text}</p>
                    </CardContent>
                  </Card>
                )}
                <div className="flex justify-end">
                  <Button onClick={onClose}>Close</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
