import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface VideoQuizMarkersProps {
  lessonId: string;
  videoDuration: number; // in seconds
}

export const VideoQuizMarkers = ({ lessonId, videoDuration }: VideoQuizMarkersProps) => {
  const [timestamps, setTimestamps] = useState<number[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("video_quiz_points")
        .select("timestamp_seconds")
        .eq("lesson_id", lessonId)
        .order("timestamp_seconds");
      if (data) setTimestamps(data.map((d: any) => d.timestamp_seconds));
    };
    load();
  }, [lessonId]);

  if (!videoDuration || videoDuration <= 0 || timestamps.length === 0) return null;

  return (
    <div className="absolute bottom-[28px] left-[12px] right-[12px] h-0 z-30 pointer-events-none">
      {timestamps.map((ts, i) => {
        const pct = Math.min(100, Math.max(0, (ts / videoDuration) * 100));
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${pct}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="w-3 h-3 rounded-full bg-destructive border-2 border-background shadow-md" />
          </div>
        );
      })}
    </div>
  );
};
