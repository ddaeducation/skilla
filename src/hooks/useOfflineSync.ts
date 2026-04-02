import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getUnsyncedProgress,
  markProgressSynced,
  savePendingProgress,
} from "@/lib/offlineDb";
import { useToast } from "@/hooks/use-toast";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const syncProgress = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);

    try {
      const unsyncedItems = await getUnsyncedProgress();
      if (unsyncedItems.length === 0) {
        setIsSyncing(false);
        return;
      }

      let synced = 0;
      for (const item of unsyncedItems) {
        try {
          const { error } = await supabase.from("student_progress").upsert(
            {
              user_id: item.userId,
              lesson_id: item.lessonId,
              course_id: item.courseId,
              completed: true,
              completed_at: new Date(item.completedAt).toISOString(),
            } as any,
            { onConflict: "user_id,lesson_id" }
          );

          if (!error) {
            await markProgressSynced(item.id);
            synced++;
          }
        } catch {
          // Will retry next time
        }
      }

      if (synced > 0) {
        toast({
          title: "Progress synced",
          description: `${synced} lesson${synced > 1 ? "s" : ""} synced successfully.`,
        });
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, toast]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncProgress();
    }
  }, [isOnline, syncProgress]);

  // Periodic sync every 30 seconds when online
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(syncProgress, 30000);
    return () => clearInterval(interval);
  }, [isOnline, syncProgress]);

  // Save progress locally (works offline)
  const saveProgressOffline = useCallback(
    async (lessonId: string, courseId: string, userId: string) => {
      await savePendingProgress({
        id: `${userId}-${lessonId}`,
        lessonId,
        courseId,
        userId,
        completedAt: Date.now(),
        synced: false,
      });

      if (isOnline) {
        syncProgress();
      }
    },
    [isOnline, syncProgress]
  );

  return { isOnline, isSyncing, syncProgress, saveProgressOffline };
}
