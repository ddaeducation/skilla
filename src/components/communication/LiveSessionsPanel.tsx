import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { Video, Plus, Loader2, ExternalLink, Globe, BookOpen, Calendar, Clock, Link2, Pencil, Trash2 } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";

interface Course {
  id: string;
  title: string;
}

interface LiveSession {
  id: string;
  title: string;
  description: string | null;
  session_url: string;
  scheduled_at: string;
  duration_minutes: number;
  course_id: string | null;
  is_global: boolean;
  host_id: string;
  created_at: string;
  courses?: { title: string } | null;
  profiles?: { full_name: string | null } | null;
}

interface LiveSessionsPanelProps {
  userId: string;
  userRole: "admin" | "instructor" | "student";
  courses: Course[];
}

const defaultForm = {
  title: "",
  description: "",
  session_url: "",
  scheduled_at: "",
  duration_minutes: 60,
  course_id: "",
  is_global: false,
};

export const LiveSessionsPanel = ({ userId, userRole, courses }: LiveSessionsPanelProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<LiveSession | null>(null);
  const [deleteSession, setDeleteSession] = useState<LiveSession | null>(null);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("live_sessions")
        .select(`
          *,
          courses (title)
        `)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      
      // Fetch host profiles separately
      const hostIds = [...new Set((data || []).map((s) => s.host_id))];
      let profilesMap: Record<string, { full_name: string | null }> = {};
      
      if (hostIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", hostIds);
        
        (profiles || []).forEach((p) => {
          profilesMap[p.id] = { full_name: p.full_name };
        });
      }
      
      // Merge profiles into sessions
      const sessionsWithProfiles = (data || []).map((s) => ({
        ...s,
        profiles: profilesMap[s.host_id] || null,
      }));
      
      setSessions(sessionsWithProfiles as unknown as LiveSession[]);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const { error } = await supabase.from("live_sessions").insert({
        title: form.title,
        description: form.description || null,
        session_url: form.session_url,
        scheduled_at: form.scheduled_at,
        duration_minutes: form.duration_minutes,
        course_id: form.course_id || null,
        is_global: form.is_global,
        host_id: userId,
      });

      if (error) throw error;

      toast({ title: "Live session scheduled successfully" });
      closeDialog();
      fetchSessions();
    } catch (error) {
      console.error("Error creating session:", error);
      toast({ title: "Error", description: "Failed to schedule session", variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!editingSession) return;
    try {
      const { error } = await supabase
        .from("live_sessions")
        .update({
          title: form.title,
          description: form.description || null,
          session_url: form.session_url,
          scheduled_at: form.scheduled_at,
          duration_minutes: form.duration_minutes,
          course_id: form.course_id || null,
          is_global: form.is_global,
        })
        .eq("id", editingSession.id);

      if (error) throw error;

      toast({ title: "Live session updated successfully" });
      closeDialog();
      fetchSessions();
    } catch (error) {
      console.error("Error updating session:", error);
      toast({ title: "Error", description: "Failed to update session", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteSession) return;
    try {
      const { error } = await supabase
        .from("live_sessions")
        .delete()
        .eq("id", deleteSession.id);

      if (error) throw error;

      toast({ title: "Live session deleted successfully" });
      setDeleteSession(null);
      fetchSessions();
    } catch (error) {
      console.error("Error deleting session:", error);
      toast({ title: "Error", description: "Failed to delete session", variant: "destructive" });
    }
  };

  const openEditDialog = (session: LiveSession) => {
    setEditingSession(session);
    setForm({
      title: session.title,
      description: session.description || "",
      session_url: session.session_url,
      scheduled_at: session.scheduled_at.slice(0, 16),
      duration_minutes: session.duration_minutes,
      course_id: session.course_id || "",
      is_global: session.is_global,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingSession(null);
    setForm(defaultForm);
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  const canEditSession = (session: LiveSession) => {
    return userRole === "admin" || session.host_id === userId;
  };

  const canCreate = userRole === "admin" || userRole === "instructor";
  const upcomingSessions = sessions.filter(s => isFuture(new Date(s.scheduled_at)));
  const pastSessions = sessions.filter(s => isPast(new Date(s.scheduled_at)));
  
  // Use pagination hooks for both sections
  const upcomingPagination = usePagination(upcomingSessions, { pageSize: 4 });
  const pastPagination = usePagination(pastSessions, { pageSize: 4 });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {canCreate && (
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Schedule Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  {editingSession ? "Edit Live Session" : "Schedule a Live Session"}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Create a virtual meeting for your students using Google Meet, Zoom, or Microsoft Teams.
                </p>
              </DialogHeader>
              <div className="space-y-5 pt-2">
                {/* Session Title */}
                <div className="space-y-2">
                  <Label htmlFor="session-title" className="text-sm font-medium">
                    Session Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="session-title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g., Weekly Q&A Session, Module 3 Review"
                  />
                </div>
                
                {/* Meeting Link with enhanced hints */}
                <div className="space-y-2">
                  <Label htmlFor="session-url" className="text-sm font-medium">
                    Meeting Link <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="session-url"
                      value={form.session_url}
                      onChange={(e) => setForm({ ...form, session_url: e.target.value })}
                      placeholder="https://meet.google.com/abc-defg-hij"
                      className="pl-10"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded">
                      <span className="font-medium">Google Meet:</span> meet.google.com/...
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded">
                      <span className="font-medium">Zoom:</span> zoom.us/j/...
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded">
                      <span className="font-medium">Teams:</span> teams.microsoft.com/...
                    </span>
                  </div>
                </div>

                {/* Date, Time & Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="session-datetime" className="text-sm font-medium">
                      Date & Time <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="session-datetime"
                        type="datetime-local"
                        value={form.scheduled_at}
                        onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="session-duration" className="text-sm font-medium">
                      Duration
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="session-duration"
                        type="number"
                        min={5}
                        max={480}
                        value={form.duration_minutes}
                        onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) || 60 })}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">In minutes (5-480)</p>
                  </div>
                </div>
                
                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="session-description" className="text-sm font-medium">
                    Description <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <Textarea
                    id="session-description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe what will be covered in this session, topics to discuss, materials needed..."
                    rows={3}
                  />
                </div>
                
                {/* Global Toggle */}
                {(userRole === "admin" || userRole === "instructor") && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
                    <Switch
                      id="session-global"
                      checked={form.is_global}
                      onCheckedChange={(checked) => setForm({ ...form, is_global: checked, course_id: "" })}
                    />
                    <div className="flex-1">
                      <Label htmlFor="session-global" className="cursor-pointer font-medium">
                        Global Session
                      </Label>
                      <p className="text-xs text-muted-foreground">Visible to all students across all courses</p>
                    </div>
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                
                {/* Course Selection */}
                {!form.is_global && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Target Course <span className="text-destructive">*</span>
                    </Label>
                    <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                      <SelectTrigger className={!form.course_id ? "text-muted-foreground" : ""}>
                        <SelectValue placeholder="Select a course for this session" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">No courses available</div>
                        ) : (
                          courses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              <span className="flex items-center gap-2">
                                <BookOpen className="h-3.5 w-3.5" />
                                {course.title}
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Only students enrolled in this course will see the session
                    </p>
                  </div>
                )}
                
                {/* Submit Button */}
                <Button 
                  onClick={editingSession ? handleUpdate : handleCreate} 
                  className="w-full" 
                  disabled={!form.title.trim() || !form.session_url.trim() || !form.scheduled_at || (!form.is_global && !form.course_id)}
                >
                  <Video className="mr-2 h-4 w-4" />
                  {editingSession ? "Update Session" : "Schedule Session"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSession} onOpenChange={(open) => !open && setDeleteSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Live Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteSession?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upcoming Sessions */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Upcoming Sessions</h3>
        {upcomingSessions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Video className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No upcoming sessions</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingPagination.paginatedItems.map((session) => (
                <Card key={session.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg flex-1">{session.title}</CardTitle>
                      <div className="flex items-center gap-1">
                        {session.is_global ? (
                          <Badge variant="secondary" className="gap-1">
                            <Globe className="h-3 w-3" />
                            Global
                          </Badge>
                        ) : session.courses?.title ? (
                          <Badge variant="outline" className="gap-1">
                            <BookOpen className="h-3 w-3" />
                            {session.courses.title}
                          </Badge>
                        ) : null}
                        {canEditSession(session) && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(session)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteSession(session)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {session.description && (
                      <p className="text-sm text-muted-foreground">{session.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(session.scheduled_at), "PPP")}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(session.scheduled_at), "p")} ({session.duration_minutes} min)
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Host: {session.profiles?.full_name || "Unknown"}
                    </p>
                    
                    {/* Visible Meeting Link */}
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <a 
                        href={session.session_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate flex-1"
                      >
                        {session.session_url}
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyLink(session.session_url)}
                        className="h-7 px-2"
                      >
                        Copy
                      </Button>
                    </div>

                    <Button asChild className="w-full">
                      <a href={session.session_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Join Session
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Pagination Controls */}
            <PaginationControls
              currentPage={upcomingPagination.currentPage}
              totalPages={upcomingPagination.totalPages}
              onPageChange={upcomingPagination.goToPage}
              startIndex={upcomingPagination.startIndex}
              endIndex={upcomingPagination.endIndex}
              totalItems={upcomingPagination.totalItems}
              itemLabel="upcoming sessions"
            />
          </>
        )}
      </div>

      {/* Past Sessions */}
      {pastSessions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Past Sessions</h3>
          <div className="space-y-2">
            {pastPagination.paginatedItems.map((session) => (
              <Card key={session.id} className="opacity-75">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{session.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(session.scheduled_at), "PPP p")} • Host: {session.profiles?.full_name || "Unknown"}
                      </p>
                      {/* Show link for past sessions too */}
                      <div className="flex items-center gap-2 mt-1">
                        <Link2 className="h-3 w-3 text-muted-foreground" />
                        <a 
                          href={session.session_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary hover:underline truncate"
                        >
                          {session.session_url}
                        </a>
                      </div>
                    </div>
                    <Badge variant="outline">Ended</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Pagination Controls */}
          <PaginationControls
            currentPage={pastPagination.currentPage}
            totalPages={pastPagination.totalPages}
            onPageChange={pastPagination.goToPage}
            startIndex={pastPagination.startIndex}
            endIndex={pastPagination.endIndex}
            totalItems={pastPagination.totalItems}
            itemLabel="past sessions"
          />
        </div>
      )}
    </div>
  );
};
