import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useLessonTimeTracking = (
  userId: string | undefined,
  lessonId: string | undefined,
  courseId: string | undefined
) => {
  const [isTracking, setIsTracking] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeSpentRef = useRef(0);
  const lastSaveRef = useRef(0);
  const isTrackingRef = useRef(false);
  const paramsRef = useRef({ userId, lessonId, courseId });

  // Keep refs in sync
  useEffect(() => {
    paramsRef.current = { userId, lessonId, courseId };
  }, [userId, lessonId, courseId]);

  useEffect(() => {
    timeSpentRef.current = timeSpent;
  }, [timeSpent]);

  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  // Save time to database
  const saveTime = useCallback(async () => {
    const { userId: uid, lessonId: lid, courseId: cid } = paramsRef.current;
    const currentTime = timeSpentRef.current;
    const lastSave = lastSaveRef.current;

    if (!uid || !lid || !cid || currentTime === lastSave) return;

    const delta = currentTime - lastSave;
    if (delta <= 0 || delta > 300) return; // Cap at 5 minutes per save to prevent corrupted data

    try {
      const { data: existing } = await supabase
        .from("lesson_time_tracking")
        .select("id, time_spent_seconds")
        .eq("user_id", uid)
        .eq("lesson_id", lid)
        .single();

      if (existing) {
        await supabase
          .from("lesson_time_tracking")
          .update({
            time_spent_seconds: existing.time_spent_seconds + delta,
            last_active_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("lesson_time_tracking").insert({
          user_id: uid,
          lesson_id: lid,
          course_id: cid,
          time_spent_seconds: currentTime,
          last_active_at: new Date().toISOString(),
        });
      }

      lastSaveRef.current = currentTime;
    } catch (error) {
      console.error("Error saving time tracking:", error);
    }
  }, []);

  // Start tracking
  const startTracking = useCallback(() => {
    setIsTracking(true);
  }, []);

  // Stop tracking
  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  // Increment timer when tracking
  useEffect(() => {
    if (isTracking) {
      intervalRef.current = setInterval(() => {
        setTimeSpent((prev) => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTracking]);

  // Save every 30 seconds via a dedicated interval
  useEffect(() => {
    if (isTracking) {
      saveIntervalRef.current = setInterval(() => {
        saveTime();
      }, 30000);
    } else if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = null;
    }

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    };
  }, [isTracking, saveTime]);

  // Activity detection & inactivity timeout
  useEffect(() => {
    if (!userId || !lessonId || !courseId) return;

    const handleActivity = () => {
      if (!isTrackingRef.current) {
        setIsTracking(true);
      }

      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }

      inactivityTimeoutRef.current = setTimeout(() => {
        setIsTracking(false);
        saveTime();
      }, 120000);
    };

    const events = ["mousemove", "keydown", "scroll", "click", "touchstart"];
    events.forEach((e) => window.addEventListener(e, handleActivity));

    // Start on mount
    setIsTracking(true);
    handleActivity();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      saveTime();
    };
  }, [userId, lessonId, courseId, saveTime]);

  // Load existing time on mount
  useEffect(() => {
    const loadExistingTime = async () => {
      if (!userId || !lessonId) return;

      const { data } = await supabase
        .from("lesson_time_tracking")
        .select("time_spent_seconds")
        .eq("user_id", userId)
        .eq("lesson_id", lessonId)
        .single();

      if (data) {
        setTimeSpent(data.time_spent_seconds);
        timeSpentRef.current = data.time_spent_seconds;
        lastSaveRef.current = data.time_spent_seconds;
      }
    };

    loadExistingTime();
  }, [userId, lessonId]);

  return { timeSpent, isTracking, startTracking, stopTracking, saveTime };
};

// Hook to get aggregated time data
export const useLearningTimeStats = (userId: string | undefined) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTime: 0,
    courseTime: {} as Record<string, number>,
    lessonTime: {} as Record<string, number>,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("lesson_time_tracking")
          .select("lesson_id, course_id, time_spent_seconds")
          .eq("user_id", userId);

        if (error) throw error;

        const courseTime: Record<string, number> = {};
        const lessonTime: Record<string, number> = {};
        let totalTime = 0;

        data?.forEach((record) => {
          totalTime += record.time_spent_seconds;
          courseTime[record.course_id] = (courseTime[record.course_id] || 0) + record.time_spent_seconds;
          lessonTime[record.lesson_id] = record.time_spent_seconds;
        });

        setStats({ totalTime, courseTime, lessonTime });
      } catch (error) {
        console.error("Error fetching time stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  return { stats, loading };
};
