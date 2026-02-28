import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Loader2, 
  Download,
  FileText,
  Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PeerReview {
  id: string;
  assignment_id: string;
  submission_id: string;
  reviewer_id: string;
  score: number | null;
  feedback: string | null;
  reviewed_at: string | null;
  submission_text?: string | null;
  file_url?: string | null;
}

interface PeerReviewPanelProps {
  assignmentId: string;
  courseId: string;
  maxScore: number;
  userId: string;
  onReviewsComplete?: () => void;
}

const REQUIRED_REVIEWS = 2;

export const PeerReviewPanel = ({
  assignmentId,
  courseId,
  maxScore,
  userId,
  onReviewsComplete,
}: PeerReviewPanelProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [pendingReviews, setPendingReviews] = useState<PeerReview[]>([]);
  const [completedReviews, setCompletedReviews] = useState<PeerReview[]>([]);
  const [reviewsReceived, setReviewsReceived] = useState<PeerReview[]>([]);
  const [activeReview, setActiveReview] = useState<PeerReview | null>(null);
  const [reviewScore, setReviewScore] = useState<number[]>([Math.round(maxScore / 2)]);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionDetails, setSubmissionDetails] = useState<Record<string, { submission_text: string | null; file_url: string | null }>>({});

  useEffect(() => {
    fetchReviews();
  }, [assignmentId, userId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      // Fetch reviews assigned to this user
      const { data: myReviews, error: reviewsError } = await supabase
        .from("peer_reviews")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("reviewer_id", userId);

      if (reviewsError) throw reviewsError;

      const pending = (myReviews || []).filter(r => !r.reviewed_at);
      const completed = (myReviews || []).filter(r => r.reviewed_at);
      
      setPendingReviews(pending);
      setCompletedReviews(completed);

      // Fetch submission details for pending reviews
      if (pending.length > 0) {
        const submissionIds = pending.map(r => r.submission_id);
        const { data: subs } = await supabase
          .from("assignment_submissions")
          .select("id, submission_text, file_url")
          .in("id", submissionIds);
        
        if (subs) {
          const details: Record<string, { submission_text: string | null; file_url: string | null }> = {};
          subs.forEach(s => {
            details[s.id] = { submission_text: s.submission_text, file_url: s.file_url };
          });
          setSubmissionDetails(details);
        }
      }

      // Fetch reviews received on my submission (anonymous)
      const { data: mySubmission } = await supabase
        .from("assignment_submissions")
        .select("id")
        .eq("assignment_id", assignmentId)
        .eq("user_id", userId)
        .maybeSingle();

      if (mySubmission) {
        const { data: received } = await supabase
          .from("peer_reviews")
          .select("id, score, feedback, reviewed_at")
          .eq("submission_id", mySubmission.id)
          .not("reviewed_at", "is", null);
        
        setReviewsReceived((received as any) || []);
      }

      // If no reviews assigned yet, try to assign them
      if (!myReviews || myReviews.length === 0) {
        await assignPeerReviews();
      }
    } catch (error) {
      console.error("Error fetching peer reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const assignPeerReviews = async () => {
    setAssigning(true);
    try {
      // Check if user has submitted
      const { data: mySubmission } = await supabase
        .from("assignment_submissions")
        .select("id")
        .eq("assignment_id", assignmentId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!mySubmission) {
        setAssigning(false);
        return;
      }

      // Get all other submissions for this assignment
      const { data: otherSubmissions } = await supabase
        .from("assignment_submissions")
        .select("id, user_id")
        .eq("assignment_id", assignmentId)
        .neq("user_id", userId);

      if (!otherSubmissions || otherSubmissions.length === 0) {
        setAssigning(false);
        return;
      }

      // Check already assigned reviews
      const { data: existingReviews } = await supabase
        .from("peer_reviews")
        .select("submission_id")
        .eq("reviewer_id", userId)
        .eq("assignment_id", assignmentId);

      const existingSubmissionIds = new Set((existingReviews || []).map(r => r.submission_id));
      const available = otherSubmissions.filter(s => !existingSubmissionIds.has(s.id));
      
      // Randomly select up to REQUIRED_REVIEWS
      const shuffled = available.sort(() => Math.random() - 0.5);
      const toAssign = shuffled.slice(0, REQUIRED_REVIEWS - (existingReviews?.length || 0));

      if (toAssign.length > 0) {
        const inserts = toAssign.map(sub => ({
          assignment_id: assignmentId,
          submission_id: sub.id,
          reviewer_id: userId,
          course_id: courseId,
        }));

        const { error } = await supabase
          .from("peer_reviews")
          .insert(inserts);

        if (error) throw error;
        await fetchReviews();
      }
    } catch (error) {
      console.error("Error assigning peer reviews:", error);
    } finally {
      setAssigning(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!activeReview) return;
    if (!reviewFeedback.trim()) {
      toast({ title: "Feedback required", description: "Please provide written feedback.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("peer_reviews")
        .update({
          score: reviewScore[0],
          feedback: reviewFeedback.trim(),
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", activeReview.id);

      if (error) throw error;

      toast({ title: "Review submitted!", description: "Thank you for your peer review." });
      setActiveReview(null);
      setReviewFeedback("");
      setReviewScore([Math.round(maxScore / 2)]);
      await fetchReviews();

      // Check if all reviews now done
      if (completedReviews.length + 1 >= REQUIRED_REVIEWS) {
        onReviewsComplete?.();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const allReviewsDone = completedReviews.length >= REQUIRED_REVIEWS;
  const totalAssigned = pendingReviews.length + completedReviews.length;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Active review form
  if (activeReview) {
    const sub = submissionDetails[activeReview.submission_id];
    return (
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Peer Review
          </CardTitle>
          <CardDescription>
            Review this anonymous submission fairly. Your identity is also hidden from the author.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Submission content */}
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Student Submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sub?.submission_text && (
                <p className="text-sm whitespace-pre-wrap">{sub.submission_text}</p>
              )}
              {sub?.file_url && (
                <a
                  href={sub.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Download className="w-4 h-4" />
                  Download attached file
                </a>
              )}
              {!sub?.submission_text && !sub?.file_url && (
                <p className="text-sm text-muted-foreground italic">No content available.</p>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Score slider */}
          <div className="space-y-3">
            <Label>Score: {reviewScore[0]} / {maxScore}</Label>
            <Slider
              value={reviewScore}
              onValueChange={setReviewScore}
              min={0}
              max={maxScore}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>{maxScore}</span>
            </div>
          </div>

          {/* Feedback */}
          <div className="space-y-2">
            <Label htmlFor="peer-feedback">Written Feedback (required)</Label>
            <Textarea
              id="peer-feedback"
              placeholder="Provide constructive feedback on this submission..."
              value={reviewFeedback}
              onChange={(e) => setReviewFeedback(e.target.value)}
              rows={5}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setActiveReview(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReview} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={allReviewsDone ? "border-green-200" : "border-yellow-200"}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5" />
          Peer Review
          {allReviewsDone ? (
            <Badge className="bg-green-500 ml-auto">
              <CheckCircle className="w-3 h-3 mr-1" />
              Completed
            </Badge>
          ) : (
            <Badge variant="outline" className="border-yellow-500 text-yellow-600 ml-auto">
              <Clock className="w-3 h-3 mr-1" />
              {completedReviews.length}/{REQUIRED_REVIEWS} Done
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {allReviewsDone
            ? "You've completed all required peer reviews. You may proceed."
            : "You must review other students' work before you can move to the next section."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending reviews */}
        {pendingReviews.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Pending Reviews</p>
            {pendingReviews.map((review, idx) => (
              <Card key={review.id} className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => {
                setActiveReview(review);
                setReviewScore([Math.round(maxScore / 2)]);
                setReviewFeedback("");
              }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Submission #{idx + 1 + completedReviews.length}</span>
                  </div>
                  <Button size="sm">Review Now</Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Completed reviews */}
        {completedReviews.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Completed Reviews</p>
            {completedReviews.map((review, idx) => (
              <Card key={review.id} className="p-4 bg-green-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm">Review #{idx + 1}</span>
                  </div>
                  <Badge variant="outline">Score: {review.score}/{maxScore}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Not enough submissions yet */}
        {totalAssigned < REQUIRED_REVIEWS && pendingReviews.length === 0 && (
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Waiting for more submissions</p>
              <p className="text-sm text-muted-foreground">
                Not enough classmates have submitted yet. Peer reviews will be assigned once more submissions are available.
              </p>
            </div>
          </div>
        )}

        <Separator />

        {/* Reviews received on my submission */}
        <div>
          <p className="text-sm font-medium mb-2">Reviews of Your Work</p>
          {reviewsReceived.length > 0 ? (
            <div className="space-y-2">
              {reviewsReceived.map((review, idx) => (
                <Card key={review.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Anonymous Reviewer #{idx + 1}</span>
                      <Badge variant="outline">Score: {review.score}/{maxScore}</Badge>
                    </div>
                    {review.feedback && (
                      <p className="text-sm text-muted-foreground">{review.feedback}</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No reviews received yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
