import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface LeaderboardEntry {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  score: number;
  lessonsCompleted: number;
  quizzesPassed: number;
  rank: number;
}

interface Course {
  id: string;
  title: string;
}

interface LeaderboardSectionProps {
  user: User | null;
  enrolledCourseIds: string[];
}

const LeaderboardSection = ({ user, enrolledCourseIds }: LeaderboardSectionProps) => {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    fetchEnrolledCourses();
  }, [enrolledCourseIds]);

  useEffect(() => {
    if (selectedCourse) {
      fetchLeaderboard(selectedCourse);
    }
  }, [selectedCourse]);

  const fetchEnrolledCourses = async () => {
    if (enrolledCourseIds.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .in("id", enrolledCourseIds);

      if (error) throw error;

      setCourses(data || []);
      if (data && data.length > 0) {
        setSelectedCourse(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (courseId: string) => {
    setLoading(true);

    try {
      // Get all enrollments for this course with completed payment
      const { data: enrollments, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("user_id")
        .eq("course_id", courseId)
        .eq("payment_status", "completed");

      if (enrollmentError) throw enrollmentError;

      const userIds = enrollments?.map((e) => e.user_id) || [];
      if (userIds.length === 0) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Get progress for each user
      const { data: progress, error: progressError } = await supabase
        .from("student_progress")
        .select("user_id, completed")
        .eq("course_id", courseId)
        .eq("completed", true);

      if (progressError) throw progressError;

      // Get quiz attempts
      const { data: quizAttempts, error: quizError } = await supabase
        .from("quiz_attempts")
        .select(`
          user_id,
          passed,
          quizzes!inner (course_id)
        `)
        .eq("quizzes.course_id", courseId)
        .eq("passed", true);

      if (quizError) throw quizError;

      // Calculate scores for each user
      const userScores: Record<string, { lessons: number; quizzes: number }> = {};

      userIds.forEach((id) => {
        userScores[id] = { lessons: 0, quizzes: 0 };
      });

      progress?.forEach((p) => {
        if (userScores[p.user_id]) {
          userScores[p.user_id].lessons += 1;
        }
      });

      quizAttempts?.forEach((q) => {
        if (userScores[q.user_id]) {
          userScores[q.user_id].quizzes += 1;
        }
      });

      // Build leaderboard
      const entries: LeaderboardEntry[] = userIds.map((userId) => {
        const profile = profiles?.find((p) => p.id === userId);
        const scores = userScores[userId] || { lessons: 0, quizzes: 0 };
        const totalScore = scores.lessons * 10 + scores.quizzes * 25; // Points: 10 per lesson, 25 per quiz

        return {
          userId,
          fullName: profile?.full_name || "Anonymous",
          avatarUrl: profile?.avatar_url,
          score: totalScore,
          lessonsCompleted: scores.lessons,
          quizzesPassed: scores.quizzes,
          rank: 0,
        };
      });

      // Sort by score and assign ranks
      entries.sort((a, b) => b.score - a.score);
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      setLeaderboard(entries);

      // Find current user's rank
      const userEntry = entries.find((e) => e.userId === user?.id);
      setCurrentUserRank(userEntry || null);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium">{rank}</span>;
    }
  };

  if (loading && courses.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (enrolledCourseIds.length === 0 || courses.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">
            See how you rank against your classmates
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No courses enrolled</h3>
            <p className="text-muted-foreground">
              Enroll in a course to see the leaderboard
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">
            See how you rank against your classmates
          </p>
        </div>
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Select a course" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Current User Rank Card */}
      {currentUserRank && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your Ranking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                  {getRankIcon(currentUserRank.rank)}
                </div>
                <div>
                  <p className="font-medium">{currentUserRank.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {currentUserRank.lessonsCompleted} lessons • {currentUserRank.quizzesPassed} quizzes passed
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{currentUserRank.score}</p>
                <p className="text-sm text-muted-foreground">points</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : leaderboard.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No rankings yet</h3>
            <p className="text-muted-foreground">
              Complete lessons and quizzes to appear on the leaderboard
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Course Rankings</CardTitle>
            <CardDescription>
              Points: 10 per lesson completed, 25 per quiz passed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaderboard.slice(0, 20).map((entry) => (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    entry.userId === user?.id
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8">
                      {getRankIcon(entry.rank)}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={entry.avatarUrl || undefined} />
                      <AvatarFallback>
                        {entry.fullName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {entry.fullName}
                        {entry.userId === user?.id && (
                          <Badge variant="secondary" className="ml-2">
                            You
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.lessonsCompleted} lessons • {entry.quizzesPassed} quizzes
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{entry.score}</p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
              ))}

              {/* Show current user's position if outside top 20 */}
              {currentUserRank && currentUserRank.rank > 20 && (
                <>
                  <div className="flex items-center justify-center py-2 text-muted-foreground text-xs">
                    ••• {currentUserRank.rank - 21} more students •••
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8">
                        {getRankIcon(currentUserRank.rank)}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={currentUserRank.avatarUrl || undefined} />
                        <AvatarFallback>
                          {currentUserRank.fullName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {currentUserRank.fullName}
                          <Badge variant="secondary" className="ml-2">You</Badge>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {currentUserRank.lessonsCompleted} lessons • {currentUserRank.quizzesPassed} quizzes
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{currentUserRank.score}</p>
                      <p className="text-xs text-muted-foreground">points</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LeaderboardSection;
