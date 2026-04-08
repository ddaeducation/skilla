import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Zap, Trophy, Star, Flame } from "lucide-react";

const LEVELS = [
  { name: "Beginner", minXP: 0, icon: "🌱" },
  { name: "Learner", minXP: 100, icon: "📚" },
  { name: "Explorer", minXP: 300, icon: "🧭" },
  { name: "Achiever", minXP: 600, icon: "⭐" },
  { name: "Scholar", minXP: 1000, icon: "🎓" },
  { name: "Expert", minXP: 2000, icon: "🏆" },
  { name: "Master", minXP: 5000, icon: "👑" },
];

const XP_ACTIONS = [
  { action: "Complete a lesson", xp: 10 },
  { action: "Pass a quiz", xp: 25 },
  { action: "Submit an assignment", xp: 20 },
  { action: "Post a discussion comment", xp: 5 },
  { action: "Earn a certificate", xp: 100 },
];

const GamificationPanel = ({ userId }: { userId: string }) => {
  const [totalXP, setTotalXP] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchXP = async () => {
      const { data } = await supabase
        .from("student_xp")
        .select("xp_points")
        .eq("user_id", userId);

      if (data) {
        setTotalXP(data.reduce((sum, r) => sum + r.xp_points, 0));
      }
      setLoading(false);
    };
    fetchXP();
  }, [userId]);

  const currentLevel = useMemo(() => {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (totalXP >= LEVELS[i].minXP) return i;
    }
    return 0;
  }, [totalXP]);

  const nextLevel = currentLevel < LEVELS.length - 1 ? LEVELS[currentLevel + 1] : null;
  const progressToNext = nextLevel
    ? ((totalXP - LEVELS[currentLevel].minXP) / (nextLevel.minXP - LEVELS[currentLevel].minXP)) * 100
    : 100;

  if (loading) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Zap className="h-5 w-5 text-yellow-500" />
        Your Progress & XP
      </h2>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <span className="text-4xl">{LEVELS[currentLevel].icon}</span>
              <p className="text-lg font-bold mt-2">{LEVELS[currentLevel].name}</p>
              <p className="text-2xl font-bold text-primary mt-1">{totalXP} XP</p>
              {nextLevel && (
                <div className="mt-3 space-y-1.5">
                  <Progress value={progressToNext} className="h-2.5" />
                  <p className="text-xs text-muted-foreground">
                    {nextLevel.minXP - totalXP} XP to {nextLevel.name} {nextLevel.icon}
                  </p>
                </div>
              )}
              {!nextLevel && (
                <Badge className="mt-3 gap-1">
                  <Trophy className="h-3 w-3" />
                  Max Level Reached!
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Star className="h-4 w-4 text-yellow-500" />
              How to Earn XP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {XP_ACTIONS.map((a) => (
              <div key={a.action} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{a.action}</span>
                <Badge variant="secondary" className="text-xs">+{a.xp} XP</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Level roadmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Level Roadmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {LEVELS.map((level, i) => (
              <div
                key={level.name}
                className={`flex flex-col items-center px-3 py-2 rounded-lg text-center min-w-[80px] ${
                  i === currentLevel
                    ? "bg-primary/10 border border-primary/30"
                    : i < currentLevel
                    ? "bg-muted/50"
                    : "opacity-50"
                }`}
              >
                <span className="text-xl">{level.icon}</span>
                <span className="text-xs font-medium mt-1">{level.name}</span>
                <span className="text-[10px] text-muted-foreground">{level.minXP} XP</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GamificationPanel;
