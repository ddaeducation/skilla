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
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ bottom: "12px", height: "14px" }}
    >
      {timestamps.map((ts, i) => {
        const pct = Math.min(99, Math.max(1, (ts / videoDuration) * 100));
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
            <div
              className="rounded-full shadow-md"
              style={{
                width: "10px",
                height: "10px",
                backgroundColor: "#ef4444",
                border: "2px solid white",
                boxShadow: "0 0 4px rgba(0,0,0,0.5)",
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
