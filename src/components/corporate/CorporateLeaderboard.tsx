import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Award } from "lucide-react";

interface CorporateEnrollment {
  id: string; member_id: string; course_id: string; status: string;
  courses?: { title: string }; corporate_members?: { full_name: string | null; email: string };
}

interface Member {
  id: string; email: string; full_name: string | null;
}

interface Props {
  members: Member[];
  enrollments: CorporateEnrollment[];
}

interface LeaderEntry {
  memberId: string;
  name: string;
  email: string;
  totalCourses: number;
  completed: number;
  inProgress: number;
  score: number;
}

const CorporateLeaderboard = ({ members, enrollments }: Props) => {
  const leaderboard: LeaderEntry[] = members.map(m => {
    const memberEnrollments = enrollments.filter(e => e.member_id === m.id);
    const completed = memberEnrollments.filter(e => e.status === "completed").length;
    const inProgress = memberEnrollments.filter(e => e.status === "in_progress" || e.status === "enrolled").length;
    return {
      memberId: m.id,
      name: m.full_name || m.email,
      email: m.email,
      totalCourses: memberEnrollments.length,
      completed,
      inProgress,
      score: completed * 100 + inProgress * 25,
    };
  }).filter(e => e.totalCourses > 0).sort((a, b) => b.score - a.score);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (index === 1) return <Medal className="h-6 w-6 text-gray-400" />;
    if (index === 2) return <Award className="h-6 w-6 text-amber-600" />;
    return <span className="h-6 w-6 flex items-center justify-center text-sm font-bold text-muted-foreground">#{index + 1}</span>;
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  if (leaderboard.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Leaderboard</h2>
        <Card><CardContent className="py-8 text-center text-muted-foreground">No enrollments yet. Assign courses to see the leaderboard.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">🏆 Team Leaderboard</h2>

      {/* Top 3 podium */}
      {leaderboard.length >= 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {leaderboard.slice(0, 3).map((entry, i) => (
            <Card key={entry.memberId} className={i === 0 ? "border-yellow-400 border-2 bg-yellow-50/50 dark:bg-yellow-950/20" : ""}>
              <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
                {getRankIcon(i)}
                <Avatar className="h-12 w-12">
                  <AvatarFallback className={i === 0 ? "bg-yellow-100 text-yellow-800" : ""}>{getInitials(entry.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{entry.name}</p>
                  <p className="text-xs text-muted-foreground">{entry.email}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="default">{entry.completed} completed</Badge>
                  {entry.inProgress > 0 && <Badge variant="secondary">{entry.inProgress} in progress</Badge>}
                </div>
                <p className="text-lg font-bold text-primary">{entry.score} pts</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Remaining */}
      {leaderboard.length > 3 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Rankings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {leaderboard.slice(3).map((entry, i) => (
              <div key={entry.memberId} className="flex items-center gap-4 py-2 border-b last:border-0">
                {getRankIcon(i + 3)}
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{getInitials(entry.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{entry.name}</p>
                  <p className="text-xs text-muted-foreground">{entry.completed} completed, {entry.inProgress} in progress</p>
                </div>
                <span className="font-bold text-primary">{entry.score} pts</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CorporateLeaderboard;
