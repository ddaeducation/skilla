import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload } from "@/hooks/useFileUpload";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { MessageSquare, Plus, Loader2, ArrowLeft, Send, Pin, ImagePlus, X, Search, CalendarIcon, FilterX } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  title: string;
}

interface Author {
  id: string;
  name: string;
}

interface Thread {
  id: string;
  title: string;
  content: string;
  course_id: string;
  author_id: string;
  is_pinned: boolean;
  created_at: string;
  image_url?: string | null;
  courses?: { title: string } | null;
  profiles?: { full_name: string | null } | null;
  reply_count?: number;
}

interface Reply {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  image_url?: string | null;
  profiles?: { full_name: string | null } | null;
}

interface DiscussionForumsProps {
  userId: string;
  userRole: "admin" | "instructor" | "student";
  courses: Course[];
  enrolledCourseIds?: string[];
}

export const DiscussionForums = ({ userId, userRole, courses, enrolledCourseIds = [] }: DiscussionForumsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [replyContent, setReplyContent] = useState("");
  const [replyImageUrl, setReplyImageUrl] = useState("");
  const [form, setForm] = useState({
    title: "",
    content: "",
    course_id: "",
    image_url: "",
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [authors, setAuthors] = useState<Author[]>([]);
  
  const threadFileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  
  const { upload: uploadThread, uploading: uploadingThread } = useFileUpload({
    bucket: "communication-uploads",
    folder: `threads/${userId}`,
    maxSize: 10,
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  });
  
  const { upload: uploadReply, uploading: uploadingReply } = useFileUpload({
    bucket: "communication-uploads",
    folder: `replies/${userId}`,
    maxSize: 10,
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  });

  useEffect(() => {
    fetchThreads();

    const channel = supabase
      .channel("discussion-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "discussion_replies" }, () => {
        if (selectedThread) fetchReplies(selectedThread.id);
        fetchReplyCounts();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "discussion_threads" }, () => {
        fetchThreads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedThread]);

  const fetchThreads = async () => {
    try {
      const { data, error } = await supabase
        .from("discussion_threads")
        .select(`
          *,
          courses (title)
        `)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch author profiles separately
      const authorIds = [...new Set((data || []).map((t) => t.author_id))];
      let profilesMap: Record<string, { full_name: string | null }> = {};
      
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", authorIds);
        
        (profiles || []).forEach((p) => {
          profilesMap[p.id] = { full_name: p.full_name };
        });
      }
      
      // Merge profiles into threads
      const threadsWithProfiles = (data || []).map((t) => ({
        ...t,
        profiles: profilesMap[t.author_id] || null,
      }));
      
      setThreads(threadsWithProfiles as unknown as Thread[]);
      
      // Extract unique authors
      const authorMap = new Map<string, string>();
      threadsWithProfiles.forEach((thread: any) => {
        if (thread.author_id && thread.profiles?.full_name) {
          authorMap.set(thread.author_id, thread.profiles.full_name);
        }
      });
      setAuthors(Array.from(authorMap.entries()).map(([id, name]) => ({ id, name })));
      
      // Fetch reply counts after getting threads
      if (data && data.length > 0) {
        fetchReplyCounts(data.map(t => t.id));
      }
    } catch (error) {
      console.error("Error fetching threads:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReplyCounts = async (threadIds?: string[]) => {
    try {
      const ids = threadIds || threads.map(t => t.id);
      if (ids.length === 0) return;

      const { data, error } = await supabase
        .from("discussion_replies")
        .select("thread_id")
        .in("thread_id", ids);

      if (error) throw error;

      // Count replies per thread
      const counts: Record<string, number> = {};
      (data || []).forEach(reply => {
        counts[reply.thread_id] = (counts[reply.thread_id] || 0) + 1;
      });
      setReplyCounts(counts);
    } catch (error) {
      console.error("Error fetching reply counts:", error);
    }
  };

  const fetchReplies = async (threadId: string) => {
    setRepliesLoading(true);
    try {
      const { data, error } = await supabase
        .from("discussion_replies")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Fetch author profiles separately
      const authorIds = [...new Set((data || []).map((r) => r.author_id))];
      let profilesMap: Record<string, { full_name: string | null }> = {};
      
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", authorIds);
        
        (profiles || []).forEach((p) => {
          profilesMap[p.id] = { full_name: p.full_name };
        });
      }
      
      // Merge profiles into replies
      const repliesWithProfiles = (data || []).map((r) => ({
        ...r,
        profiles: profilesMap[r.author_id] || null,
      }));
      
      setReplies(repliesWithProfiles as unknown as Reply[]);
    } catch (error) {
      console.error("Error fetching replies:", error);
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleThreadImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadThread(file);
    if (url) {
      setForm({ ...form, image_url: url });
    }
  };

  const handleReplyImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadReply(file);
    if (url) {
      setReplyImageUrl(url);
    }
  };

  const handleCreateThread = async () => {
    try {
      const { error } = await supabase.from("discussion_threads").insert({
        title: form.title,
        content: form.content,
        course_id: form.course_id,
        author_id: userId,
        image_url: form.image_url || null,
      });

      if (error) throw error;

      toast({ title: "Thread created successfully" });
      setDialogOpen(false);
      setForm({ title: "", content: "", course_id: "", image_url: "" });
      fetchThreads();
    } catch (error) {
      console.error("Error creating thread:", error);
      toast({ title: "Error", description: "Failed to create thread", variant: "destructive" });
    }
  };

  const handleReply = async () => {
    if (!selectedThread || !replyContent.trim()) return;

    try {
      const { error } = await supabase.from("discussion_replies").insert({
        thread_id: selectedThread.id,
        content: replyContent,
        author_id: userId,
        image_url: replyImageUrl || null,
      });

      if (error) throw error;

      setReplyContent("");
      setReplyImageUrl("");
      fetchReplies(selectedThread.id);
    } catch (error) {
      console.error("Error posting reply:", error);
      toast({ title: "Error", description: "Failed to post reply", variant: "destructive" });
    }
  };

  const openThread = (thread: Thread) => {
    setSelectedThread(thread);
    fetchReplies(thread.id);
  };

  // Filter threads: show threads where user is the author OR enrolled in the course (or admin/instructor sees all)
  const visibleThreads = threads.filter(thread => {
    // Admins and instructors can see all threads
    if (userRole === "admin" || userRole === "instructor") return true;
    // User is the author
    if (thread.author_id === userId) return true;
    // User is enrolled in the course
    if (enrolledCourseIds.includes(thread.course_id)) return true;
    return false;
  });

  const filteredThreads = visibleThreads.filter(thread => {
    // Course filter
    if (selectedCourse !== "all" && thread.course_id !== selectedCourse) return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = thread.title.toLowerCase().includes(query);
      const matchesContent = thread.content.toLowerCase().includes(query);
      const matchesAuthor = thread.profiles?.full_name?.toLowerCase().includes(query);
      if (!matchesTitle && !matchesContent && !matchesAuthor) return false;
    }
    
    // Author filter
    if (authorFilter !== "all" && thread.author_id !== authorFilter) return false;
    
    // Date range filter
    const threadDate = new Date(thread.created_at);
    if (dateFrom && threadDate < dateFrom) return false;
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      if (threadDate > endOfDay) return false;
    }
    
    return true;
  });

  // Use pagination hook
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedThreads,
    goToPage,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(filteredThreads, { pageSize: 4 });

  const hasActiveFilters = searchQuery || selectedCourse !== "all" || authorFilter !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCourse("all");
    setAuthorFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (selectedThread) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setSelectedThread(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Threads
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{selectedThread.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  By {selectedThread.profiles?.full_name || "Unknown"} • {format(new Date(selectedThread.created_at), "PPP")}
                </p>
              </div>
              {selectedThread.is_pinned && (
                <Badge variant="secondary" className="gap-1">
                  <Pin className="h-3 w-3" />
                  Pinned
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{selectedThread.content}</p>
            {selectedThread.image_url && (
              <div className="mt-4">
                <img
                  src={selectedThread.image_url}
                  alt="Thread attachment"
                  className="max-w-full h-auto rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(selectedThread.image_url!, "_blank")}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="font-semibold">Replies ({replies.length})</h3>
          
          {repliesLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {replies.map((reply) => (
                <Card key={reply.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {reply.profiles?.full_name?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {reply.profiles?.full_name || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(reply.created_at), "PPp")}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap">{reply.content}</p>
                        {reply.image_url && (
                          <div className="mt-2">
                            <img
                              src={reply.image_url}
                              alt="Reply attachment"
                              className="max-w-md h-auto rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(reply.image_url!, "_blank")}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Reply Input with Image Upload */}
              <div className="space-y-2">
                <input
                  type="file"
                  ref={replyFileInputRef}
                  onChange={handleReplyImageUpload}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                />
                {replyImageUrl && (
                  <div className="relative w-40 h-24 rounded-lg overflow-hidden border">
                    <img src={replyImageUrl} alt="Reply attachment" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-5 w-5"
                      onClick={() => setReplyImageUrl("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => replyFileInputRef.current?.click()}
                    disabled={uploadingReply}
                  >
                    {uploadingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  </Button>
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button onClick={handleReply} disabled={!replyContent.trim() || uploadingReply}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Course Filter */}
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Author Filter */}
          <Select value={authorFilter} onValueChange={setAuthorFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Authors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Authors</SelectItem>
              {authors.map((author) => (
                <SelectItem key={author.id} value={author.id}>
                  {author.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date From */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "PP") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Date To */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "PP") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <FilterX className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          )}

          <div className="flex-1" />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Thread
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Start Discussion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Course</Label>
                <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Discussion topic"
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Start the discussion..."
                  rows={4}
                />
              </div>
              
              {/* Image Upload for Thread */}
              <div className="space-y-2">
                <Label>Attach Image (optional)</Label>
                <input
                  type="file"
                  ref={threadFileInputRef}
                  onChange={handleThreadImageUpload}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                />
                {form.image_url ? (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                    <img src={form.image_url} alt="Thread attachment" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => setForm({ ...form, image_url: "" })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => threadFileInputRef.current?.click()}
                    disabled={uploadingThread}
                  >
                    {uploadingThread ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="mr-2 h-4 w-4" />
                    )}
                    {uploadingThread ? "Uploading..." : "Upload Image or Screenshot"}
                  </Button>
                )}
              </div>
              
              <Button onClick={handleCreateThread} className="w-full" disabled={!form.title || !form.content || !form.course_id || uploadingThread}>
                Create Thread
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {filteredThreads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No discussions yet</h3>
            <p className="text-muted-foreground">Start a new discussion to get the conversation going</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {paginatedThreads.map((thread) => (
            <Card 
              key={thread.id} 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => openThread(thread)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {thread.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                      <h4 className="font-medium">{thread.title}</h4>
                      {thread.image_url && <ImagePlus className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      By {thread.profiles?.full_name || "Unknown"} • {format(new Date(thread.created_at), "PPP")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {replyCounts[thread.id] || 0}
                    </Badge>
                    <Badge variant="outline">{thread.courses?.title}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Pagination Controls */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={totalItems}
            itemLabel="discussions"
          />
        </div>
      )}
    </div>
  );
};
