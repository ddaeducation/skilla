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
    <>
      {timestamps.map((ts, i) => {
        const pct = Math.min(100, Math.max(0, (ts / videoDuration) * 100));
        return (
          <div
            key={i}
            className="absolute z-20 pointer-events-none"
            style={{
              left: `${pct}%`,
              bottom: "10px",
              transform: "translateX(-50%)",
            }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white shadow-sm" />
          </div>
        );
      })}
    </>
  );
};
