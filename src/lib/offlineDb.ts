import { openDB, DBSchema, IDBPDatabase } from "idb";

interface OfflineLMSDB extends DBSchema {
  lessons: {
    key: string;
    value: {
      id: string;
      courseId: string;
      sectionId: string | null;
      title: string;
      contentType: string;
      contentText: string | null;
      contentUrl: string | null;
      orderIndex: number;
      durationMinutes: number | null;
      downloadedAt: number;
    };
    indexes: { "by-course": string };
  };
  quizzes: {
    key: string;
    value: {
      id: string;
      courseId: string;
      sectionId: string | null;
      title: string;
      description: string | null;
      passingScore: number;
      timeLimitMinutes: number | null;
      maxAttempts: number | null;
      questions: any[];
      downloadedAt: number;
    };
    indexes: { "by-course": string };
  };
  videos: {
    key: string;
    value: {
      id: string;
      lessonId: string;
      courseId: string;
      title: string;
      blob: Blob;
      mimeType: string;
      size: number;
      downloadedAt: number;
    };
    indexes: { "by-course": string; "by-lesson": string };
  };
  courses: {
    key: string;
    value: {
      id: string;
      title: string;
      description: string | null;
      imageUrl: string | null;
      sections: any[];
      downloadedAt: number;
    };
  };
  pendingProgress: {
    key: string;
    value: {
      id: string;
      lessonId: string;
      courseId: string;
      userId: string;
      completedAt: number;
      synced: boolean;
    };
    indexes: { "by-synced": number };
  };
}

let dbInstance: IDBPDatabase<OfflineLMSDB> | null = null;

export async function getOfflineDb() {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineLMSDB>("gni-offline-lms", 1, {
    upgrade(db) {
      const lessonStore = db.createObjectStore("lessons", { keyPath: "id" });
      lessonStore.createIndex("by-course", "courseId");

      const quizStore = db.createObjectStore("quizzes", { keyPath: "id" });
      quizStore.createIndex("by-course", "courseId");

      const videoStore = db.createObjectStore("videos", { keyPath: "id" });
      videoStore.createIndex("by-course", "courseId");
      videoStore.createIndex("by-lesson", "lessonId");

      db.createObjectStore("courses", { keyPath: "id" });

      const progressStore = db.createObjectStore("pendingProgress", { keyPath: "id" });
      progressStore.createIndex("by-synced", "synced");
    },
  });

  return dbInstance;
}

// Save a lesson for offline
export async function saveLessonOffline(lesson: OfflineLMSDB["lessons"]["value"]) {
  const db = await getOfflineDb();
  await db.put("lessons", lesson);
}

// Save a quiz for offline
export async function saveQuizOffline(quiz: OfflineLMSDB["quizzes"]["value"]) {
  const db = await getOfflineDb();
  await db.put("quizzes", quiz);
}

// Save video blob for offline
export async function saveVideoOffline(video: OfflineLMSDB["videos"]["value"]) {
  const db = await getOfflineDb();
  await db.put("videos", video);
}

// Save course metadata
export async function saveCourseOffline(course: OfflineLMSDB["courses"]["value"]) {
  const db = await getOfflineDb();
  await db.put("courses", course);
}

// Get offline lessons for a course
export async function getOfflineLessons(courseId: string) {
  const db = await getOfflineDb();
  return db.getAllFromIndex("lessons", "by-course", courseId);
}

// Get offline quizzes for a course
export async function getOfflineQuizzes(courseId: string) {
  const db = await getOfflineDb();
  return db.getAllFromIndex("quizzes", "by-course", courseId);
}

// Get offline video for a lesson
export async function getOfflineVideo(lessonId: string) {
  const db = await getOfflineDb();
  const videos = await db.getAllFromIndex("videos", "by-lesson", lessonId);
  return videos[0] || null;
}

// Get offline course
export async function getOfflineCourse(courseId: string) {
  const db = await getOfflineDb();
  return db.get("courses", courseId);
}

// Get all downloaded courses
export async function getAllOfflineCourses() {
  const db = await getOfflineDb();
  return db.getAll("courses");
}

// Save pending progress
export async function savePendingProgress(progress: OfflineLMSDB["pendingProgress"]["value"]) {
  const db = await getOfflineDb();
  await db.put("pendingProgress", progress);
}

// Get unsynced progress
export async function getUnsyncedProgress() {
  const db = await getOfflineDb();
  return db.getAllFromIndex("pendingProgress", "by-synced", 0);
}

// Mark progress as synced
export async function markProgressSynced(id: string) {
  const db = await getOfflineDb();
  const item = await db.get("pendingProgress", id);
  if (item) {
    item.synced = true;
    await db.put("pendingProgress", item);
  }
}

// Delete offline course and all its content
export async function deleteOfflineCourse(courseId: string) {
  const db = await getOfflineDb();
  const tx = db.transaction(["courses", "lessons", "quizzes", "videos"], "readwrite");

  await tx.objectStore("courses").delete(courseId);

  const lessons = await tx.objectStore("lessons").index("by-course").getAll(courseId);
  for (const l of lessons) await tx.objectStore("lessons").delete(l.id);

  const quizzes = await tx.objectStore("quizzes").index("by-course").getAll(courseId);
  for (const q of quizzes) await tx.objectStore("quizzes").delete(q.id);

  const videos = await tx.objectStore("videos").index("by-course").getAll(courseId);
  for (const v of videos) await tx.objectStore("videos").delete(v.id);

  await tx.done;
}

// Check if a lesson is available offline
export async function isLessonOffline(lessonId: string) {
  const db = await getOfflineDb();
  const lesson = await db.get("lessons", lessonId);
  return !!lesson;
}

// Check if a video is downloaded
export async function isVideoOffline(lessonId: string) {
  const db = await getOfflineDb();
  const videos = await db.getAllFromIndex("videos", "by-lesson", lessonId);
  return videos.length > 0;
}

// Get storage usage estimate
export async function getOfflineStorageUsage() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentage: estimate.quota ? Math.round(((estimate.usage || 0) / estimate.quota) * 100) : 0,
    };
  }
  return { used: 0, quota: 0, percentage: 0 };
}
