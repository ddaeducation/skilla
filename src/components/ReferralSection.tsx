import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Gift, Users, DollarSign, Share2 } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface ReferralSectionProps {
  user: User;
}

const ReferralSection = ({ user }: ReferralSectionProps) => {
  const [referralCode, setReferralCode] = useState("");
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalDollars, setTotalDollars] = useState(0);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchReferralData();
  }, [user.id]);

  const fetchReferralData = async () => {
    setLoading(true);

    // Get or generate referral code
    const { data: codeData } = await supabase
      .from("referral_codes")
      .select("code")
      .eq("user_id", user.id)
      .maybeSingle();

    if (codeData?.code) {
      setReferralCode(codeData.code);
    } else {
      // Generate via RPC
      const { data: newCode } = await supabase.rpc("generate_referral_code", {
        p_user_id: user.id,
      });
      if (newCode) setReferralCode(newCode);
    }

    // Fetch points
    const { data: pointsData } = await supabase
      .from("referral_points")
      .select("points, dollar_value")
      .eq("user_id", user.id);

    if (pointsData) {
      const pts = pointsData.reduce((sum, p) => sum + p.points, 0);
      const dollars = pointsData.reduce((sum, p) => sum + Number(p.dollar_value), 0);
      setTotalPoints(pts);
      setTotalDollars(dollars);
    }

    // Fetch referrals
    const { data: refData } = await supabase
      .from("referrals")
      .select("*, profiles:referred_id(full_name, email)")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    if (refData) setReferrals(refData);

    setLoading(false);
  };

  const copyCode = () => {
    const link = `${window.location.origin}/signup?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
  };

  const shareLink = () => {
    const link = `${window.location.origin}/signup?ref=${referralCode}`;
    if (navigator.share) {
      navigator.share({
        title: "Join me on Skillls Africa!",
        text: "Sign up using my referral link and we both earn rewards!",
        url: link,
      });
    } else {
      copyCode();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Referral Program</h1>
        <p className="text-muted-foreground">
          Invite friends and earn rewards towards your courses
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Points</p>
                <p className="text-2xl font-bold">{totalPoints}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Credit</p>
                <p className="text-2xl font-bold">${totalDollars.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Referrals</p>
                <p className="text-2xl font-bold">{referrals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>Share this link with friends to earn points</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              readOnly
              value={`${window.location.origin}/signup?ref=${referralCode}`}
              className="font-mono text-sm"
            />
            <Button variant="outline" size="icon" onClick={copyCode}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button onClick={shareLink}>
              <Share2 className="h-4 w-4 mr-2" /> Share
            </Button>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <h4 className="font-semibold text-sm">How it works</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Friend signs up using your link → You earn <strong>100 points ($2)</strong></li>
              <li>• Friend enrolls in a course → You earn <strong>250 points ($5)</strong></li>
              <li>• Use points as discount on your next enrollment or monthly payment</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
          <CardDescription>People you've invited</CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No referrals yet. Share your link to start earning!
            </p>
          ) : (
            <div className="space-y-3">
              {referrals.map((ref) => (
                <div key={ref.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">
                      {(ref.profiles as any)?.full_name || (ref.profiles as any)?.email || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(ref.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={ref.points_awarded_signup ? "default" : "secondary"}>
                      {ref.points_awarded_signup ? "Signed Up (+100)" : "Pending"}
                    </Badge>
                    {ref.points_awarded_enrollment && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        Enrolled (+250)
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralSection;
