import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Clock } from "lucide-react";

interface WeeklyLearningChartProps {
  userId: string | undefined;
}

interface DayData {
  day: string;
  dayShort: string;
  minutes: number;
  isToday: boolean;
}

const WeeklyLearningChart = ({ userId }: WeeklyLearningChartProps) => {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklyData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const today = new Date();
        const sevenDaysAgo = subDays(today, 6);

        const { data: records, error } = await supabase
          .from("lesson_time_tracking")
          .select("time_spent_seconds, last_active_at")
          .eq("user_id", userId)
          .gte("last_active_at", startOfDay(sevenDaysAgo).toISOString())
          .lte("last_active_at", endOfDay(today).toISOString());

        if (error) throw error;

        // Build 7-day map
        const dayMap: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const d = subDays(today, i);
          dayMap[format(d, "yyyy-MM-dd")] = 0;
        }

        // Aggregate seconds per day (capped per record to prevent corrupted data)
        records?.forEach((r) => {
          const dayKey = format(new Date(r.last_active_at), "yyyy-MM-dd");
          if (dayMap[dayKey] !== undefined) {
            const cappedSeconds = Math.min(r.time_spent_seconds, 28800); // Cap at 8h per record
            dayMap[dayKey] += cappedSeconds;
          }
        });

        const todayKey = format(today, "yyyy-MM-dd");
        const chartData: DayData[] = Object.entries(dayMap).map(([dateStr, seconds]) => ({
          day: format(new Date(dateStr), "EEE"),
          dayShort: format(new Date(dateStr), "EEE"),
          minutes: Math.round(seconds / 60),
          isToday: dateStr === todayKey,
        }));

        setData(chartData);
      } catch (error) {
        console.error("Error fetching weekly learning data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyData();
  }, [userId]);

  const totalWeekMinutes = data.reduce((sum, d) => sum + d.minutes, 0);
  const avgMinutes = data.length > 0 ? Math.round(totalWeekMinutes / 7) : 0;

  const formatMinutes = (mins: number) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${mins}m`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-sm text-primary font-semibold">
            {formatMinutes(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 h-[280px] flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground text-sm">Loading chart...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Weekly Study Time</CardTitle>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              Total: <strong className="text-foreground">{formatMinutes(totalWeekMinutes)}</strong>
            </span>
            <span>
              Avg: <strong className="text-foreground">{formatMinutes(avgMinutes)}/day</strong>
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barSize={32} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="dayShort"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 13, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => (v >= 60 ? `${Math.floor(v / 60)}h` : `${v}m`)}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", radius: 4 }} />
              <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.isToday ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.4)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyLearningChart;
