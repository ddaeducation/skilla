import HighlightedHTML from "@/components/HighlightedHTML";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { stripHtml } from "@/lib/utils";
import { sanitizeYouTubeIframes } from "@/lib/youtubeUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Eye, 
  Calendar, 
  Award, 
  FileText, 
  Upload,
  Clock,
  ClipboardList,
  ChevronDown,
  BookOpen
} from "lucide-react";
import { format } from "date-fns";

interface Assignment {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  rubrics?: string | null;
  max_score: number;
  due_date?: string | null;
}

interface AssignmentPreviewProps {
  assignment: Assignment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AssignmentPreview = ({ assignment, open, onOpenChange }: AssignmentPreviewProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <DialogTitle>Assignment Preview</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assignment Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{assignment.title}</CardTitle>
                  {assignment.description && (
                    <p className="text-muted-foreground mt-2">{stripHtml(assignment.description)}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className="flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    {assignment.max_score} points
                  </Badge>
                  {assignment.due_date && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due: {format(new Date(assignment.due_date), "MMM d, yyyy")}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Instructions */}
          {assignment.instructions && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="prose prose-sm max-w-none [&>h1]:text-xl [&>h1]:font-bold [&>h1]:mb-3 [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mb-2 [&>h3]:text-base [&>h3]:font-medium [&>h3]:mb-2 [&>p]:mb-4 [&>p]:leading-relaxed [&>ul]:mb-4 [&>ol]:mb-4 [&>a]:text-primary [&>a]:underline"
                  dangerouslySetInnerHTML={{ __html: sanitizeYouTubeIframes(assignment.instructions) }}
                />
              </CardContent>
            </Card>
          )}

          {/* Rubrics */}
          {assignment.rubrics && (
            <Collapsible>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Rubrics
                      </span>
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <div 
                      className="prose prose-sm max-w-none [&>h1]:text-xl [&>h1]:font-bold [&>h1]:mb-3 [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mb-2 [&>h3]:text-base [&>h3]:font-medium [&>h3]:mb-2 [&>p]:mb-4 [&>p]:leading-relaxed [&>ul]:mb-4 [&>ol]:mb-4 [&>a]:text-primary [&>a]:underline"
                      dangerouslySetInnerHTML={{ __html: sanitizeYouTubeIframes(assignment.rubrics) }}
                    />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          <Separator />

          {/* Submission Form Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Your Submission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="submission-text">Written Response</Label>
                <Textarea
                  id="submission-text"
                  placeholder="Write your assignment response here..."
                  rows={8}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  This is where students will type their assignment response.
                </p>
              </div>

              <div className="space-y-2">
                <Label>File Attachment</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted/30">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drag and drop files here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported formats: PDF, DOC, DOCX, TXT, ZIP
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview Note */}
          <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Preview Mode</p>
              <p className="text-sm text-muted-foreground">
                This is how students will see this assignment. The submission form is disabled in preview mode.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close Preview
            </Button>
            <Button disabled>
              Submit Assignment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
