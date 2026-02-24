import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload } from "@/hooks/useFileUpload";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { Megaphone, Plus, Loader2, Globe, BookOpen, ImagePlus, X, MoreVertical, Pencil, Trash2, CheckSquare, Square, Search, Filter, Calendar, User } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import AnnouncementComments from "@/components/AnnouncementComments";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  title: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  course_id: string | null;
  is_global: boolean;
  created_at: string;
  author_id: string;
  image_url?: string | null;
  courses?: { title: string } | null;
  profiles?: { full_name: string | null } | null;
  comments_enabled?: boolean;
}

interface AnnouncementsPanelProps {
  userId: string;
  userRole: "admin" | "instructor" | "student";
  courses: Course[];
  enrolledCourseIds?: string[];
}

export const AnnouncementsPanel = ({ userId, userRole, courses, enrolledCourseIds = [] }: AnnouncementsPanelProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [authors, setAuthors] = useState<{ id: string; name: string }[]>([]);
  
  const [form, setForm] = useState({
    title: "",
    content: "",
    course_ids: [] as string[],
    is_global: false,
    comments_enabled: true,
    image_url: "",
  });
  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
    course_id: "",
    is_global: false,
    comments_enabled: true,
    image_url: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useFileUpload({
    bucket: "communication-uploads",
    folder: `announcements/${userId}`,
    maxSize: 10,
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  });

  useEffect(() => {
    fetchAnnouncements();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("announcements-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAnnouncements = async () => {
    try {
      // Fetch announcements
      const { data, error } = await supabase
        .from("announcements")
        .select(`
          *,
          courses (title)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch author profiles separately
      const authorIds = [...new Set((data || []).map((a) => a.author_id))];
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
      
      // Merge profiles into announcements
      const announcementsWithProfiles = (data || []).map((a) => ({
        ...a,
        profiles: profilesMap[a.author_id] || null,
      }));
      
      setAnnouncements(announcementsWithProfiles as unknown as Announcement[]);
      
      // Extract unique authors
      const uniqueAuthors = new Map<string, string>();
      announcementsWithProfiles.forEach((a: any) => {
        if (a.author_id && a.profiles?.full_name) {
          uniqueAuthors.set(a.author_id, a.profiles.full_name);
        }
      });
      setAuthors(Array.from(uniqueAuthors.entries()).map(([id, name]) => ({ id, name })));
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter announcements
  const filteredAnnouncements = announcements.filter((announcement) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        announcement.title.toLowerCase().includes(query) ||
        announcement.content.toLowerCase().includes(query) ||
        announcement.profiles?.full_name?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    
    // Course filter
    if (courseFilter !== "all") {
      if (courseFilter === "global" && !announcement.is_global) return false;
      if (courseFilter !== "global" && announcement.course_id !== courseFilter) return false;
    }
    
    // Type filter
    if (typeFilter !== "all") {
      if (typeFilter === "global" && !announcement.is_global) return false;
      if (typeFilter === "course" && announcement.is_global) return false;
    }
    
    // Author filter
    if (authorFilter !== "all" && announcement.author_id !== authorFilter) return false;
    
    // Date range filter
    const announcementDate = new Date(announcement.created_at);
    if (dateFrom && isBefore(announcementDate, startOfDay(dateFrom))) return false;
    if (dateTo && isAfter(announcementDate, endOfDay(dateTo))) return false;
    
    return true;
  });

  // Use pagination hook
  const {
    currentPage,
    totalPages,
    paginatedItems: paginatedAnnouncements,
    goToPage,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(filteredAnnouncements, { pageSize: 4 });

  const clearFilters = () => {
    setSearchQuery("");
    setCourseFilter("all");
    setTypeFilter("all");
    setAuthorFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = searchQuery || courseFilter !== "all" || typeFilter !== "all" || authorFilter !== "all" || dateFrom || dateTo;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await upload(file);
    if (url) {
      if (isEdit) {
        setEditForm({ ...editForm, image_url: url });
      } else {
        setForm({ ...form, image_url: url });
      }
    }
  };

  const handleCreate = async () => {
    try {
      // Get author name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();

      if (form.is_global) {
        // Single global announcement
        const { error } = await supabase.from("announcements").insert({
          title: form.title,
          content: form.content,
          course_id: null,
          is_global: true,
          author_id: userId,
          comments_enabled: form.comments_enabled,
          image_url: form.image_url || null,
        });
        if (error) throw error;
      } else {
        // Insert one announcement per selected course
        const inserts = form.course_ids.map((courseId) => ({
          title: form.title,
          content: form.content,
          course_id: courseId,
          is_global: false,
          author_id: userId,
          comments_enabled: form.comments_enabled,
          image_url: form.image_url || null,
        }));
        const { error } = await supabase.from("announcements").insert(inserts);
        if (error) throw error;
      }

      // Send email notifications in background
      supabase.functions.invoke("send-notification", {
        body: {
          type: "announcement",
          announcement: {
            title: form.title,
            content: form.content,
            course_id: form.course_ids[0] || null,
            is_global: form.is_global,
            author_name: profile?.full_name || "Admin",
          },
        },
      }).catch((err) => console.error("Failed to send notifications:", err));

      toast({ title: "Announcement posted successfully" });
      setDialogOpen(false);
      setForm({ title: "", content: "", course_ids: [], is_global: false, comments_enabled: true, image_url: "" });
      fetchAnnouncements();
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast({ title: "Error", description: "Failed to post announcement", variant: "destructive" });
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setEditForm({
      title: announcement.title,
      content: announcement.content,
      course_id: announcement.course_id || "",
      is_global: announcement.is_global,
      comments_enabled: announcement.comments_enabled !== false,
      image_url: announcement.image_url || "",
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingAnnouncement) return;

    try {
      const { error } = await supabase
        .from("announcements")
        .update({
          title: editForm.title,
          content: editForm.content,
          course_id: editForm.course_id || null,
          is_global: editForm.is_global,
          comments_enabled: editForm.comments_enabled,
          image_url: editForm.image_url || null,
        })
        .eq("id", editingAnnouncement.id);

      if (error) throw error;

      toast({ title: "Announcement updated successfully" });
      setEditDialogOpen(false);
      setEditingAnnouncement(null);
      setEditForm({ title: "", content: "", course_id: "", is_global: false, comments_enabled: true, image_url: "" });
      fetchAnnouncements();
    } catch (error) {
      console.error("Error updating announcement:", error);
      toast({ title: "Error", description: "Failed to update announcement", variant: "destructive" });
    }
  };

  const handleDelete = async (announcementId: string) => {
    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", announcementId);

      if (error) throw error;

      toast({ title: "Announcement deleted successfully" });
      fetchAnnouncements();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast({ title: "Error", description: "Failed to delete announcement", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      toast({ title: `${selectedIds.size} announcement(s) deleted successfully` });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      fetchAnnouncements();
    } catch (error) {
      console.error("Error deleting announcements:", error);
      toast({ title: "Error", description: "Failed to delete announcements", variant: "destructive" });
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    const manageableAnnouncements = announcements.filter(a => canManage(a));
    if (selectedIds.size === manageableAnnouncements.length && manageableAnnouncements.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(manageableAnnouncements.map(a => a.id)));
    }
  };

  const canCreate = userRole === "admin" || userRole === "instructor";
  const canManage = (announcement: Announcement) => {
    return userRole === "admin" || announcement.author_id === userId;
  };
  const manageableAnnouncements = announcements.filter(a => canManage(a));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search announcements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          {/* Course Filter */}
          <div className="min-w-[180px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Course</Label>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                <SelectItem value="global">Global Only</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Author Filter */}
          <div className="min-w-[150px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Author</Label>
            <Select value={authorFilter} onValueChange={setAuthorFilter}>
              <SelectTrigger>
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
          
          {/* Date From */}
          <div className="min-w-[140px]">
            <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PP") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Date To */}
          <div className="min-w-[140px]">
            <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PP") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
        
        {hasActiveFilters && (
          <p className="text-sm text-muted-foreground mt-2">
            Showing {filteredAnnouncements.length} of {announcements.length} announcements
          </p>
        )}
      </Card>

      {canCreate && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {manageableAnnouncements.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="gap-2"
                >
                  {selectedIds.size === manageableAnnouncements.length && manageableAnnouncements.length > 0 ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select All"}
                </Button>
                {selectedIds.size > 0 && (
                  <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete Selected
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedIds.size} Announcement(s)</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {selectedIds.size} selected announcement(s)? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBulkDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Announcement title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Write your announcement..."
                    rows={4}
                  />
                </div>
                
                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>Attach Image (optional)</Label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleImageUpload(e, false)}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                  />
                  {form.image_url ? (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden border">
                      <img
                        src={form.image_url}
                        alt="Announcement"
                        className="w-full h-full object-cover"
                      />
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
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="mr-2 h-4 w-4" />
                      )}
                      {uploading ? "Uploading..." : "Upload Image or Screenshot"}
                    </Button>
                  )}
                </div>

                {(userRole === "admin" || userRole === "instructor") && (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.is_global}
                      onCheckedChange={(checked) => setForm({ ...form, is_global: checked, course_ids: [] })}
                    />
                    <Label>Global announcement (visible to all users)</Label>
                  </div>
                )}
                {!form.is_global && (
                  <div className="space-y-2">
                    <Label>Target Course(s)</Label>
                    <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                      {courses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No courses available</p>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <Checkbox
                              checked={form.course_ids.length === courses.length && courses.length > 0}
                              onCheckedChange={(checked) => {
                                setForm({ ...form, course_ids: checked ? courses.map(c => c.id) : [] });
                              }}
                            />
                            <Label className="text-sm font-medium cursor-pointer">Select All</Label>
                          </div>
                          {courses.map((course) => (
                            <div key={course.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={form.course_ids.includes(course.id)}
                                onCheckedChange={(checked) => {
                                  setForm({
                                    ...form,
                                    course_ids: checked
                                      ? [...form.course_ids, course.id]
                                      : form.course_ids.filter(id => id !== course.id),
                                  });
                                }}
                              />
                              <Label className="text-sm cursor-pointer">{course.title}</Label>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                    {form.course_ids.length > 0 && (
                      <p className="text-xs text-muted-foreground">{form.course_ids.length} course(s) selected</p>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.comments_enabled}
                    onCheckedChange={(checked) => setForm({ ...form, comments_enabled: checked })}
                  />
                  <Label>Allow comments</Label>
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={!form.title || !form.content || uploading || (!form.is_global && form.course_ids.length === 0)}>
                  Post Announcement
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
      
      {/* Show bulk actions for non-creators if they have manageable announcements */}
      {!canCreate && manageableAnnouncements.length > 0 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            className="gap-2"
          >
            {selectedIds.size === manageableAnnouncements.length && manageableAnnouncements.length > 0 ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select All"}
          </Button>
          {selectedIds.size > 0 && (
            <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selectedIds.size} Announcement(s)</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedIds.size} selected announcement(s)? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Announcement title"
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                placeholder="Write your announcement..."
                rows={4}
              />
            </div>
            
            {/* Image Upload for Edit */}
            <div className="space-y-2">
              <Label>Attach Image (optional)</Label>
              <input
                type="file"
                ref={editFileInputRef}
                onChange={(e) => handleImageUpload(e, true)}
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
              />
              {editForm.image_url ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border">
                  <img
                    src={editForm.image_url}
                    alt="Announcement"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => setEditForm({ ...editForm, image_url: "" })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => editFileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="mr-2 h-4 w-4" />
                  )}
                  {uploading ? "Uploading..." : "Upload Image or Screenshot"}
                </Button>
              )}
            </div>

            {(userRole === "admin" || userRole === "instructor") && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={editForm.is_global}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, is_global: checked, course_id: "" })}
                />
                <Label>Global announcement (visible to all users)</Label>
              </div>
            )}
            {!editForm.is_global && (
              <div className="space-y-2">
                <Label>Target Course</Label>
                <Select value={editForm.course_id} onValueChange={(v) => setEditForm({ ...editForm, course_id: v })}>
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
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={editForm.comments_enabled}
                onCheckedChange={(checked) => setEditForm({ ...editForm, comments_enabled: checked })}
              />
              <Label>Allow comments</Label>
            </div>
            <Button onClick={handleUpdate} className="w-full" disabled={!editForm.title || !editForm.content || uploading}>
              Update Announcement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {filteredAnnouncements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {hasActiveFilters ? "No announcements match your filters" : "No announcements"}
            </h3>
            <p className="text-muted-foreground">
              {hasActiveFilters ? "Try adjusting your filters" : "Check back later for updates"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paginatedAnnouncements.map((announcement) => (
            <Card key={announcement.id} className={selectedIds.has(announcement.id) ? "ring-2 ring-primary" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {canManage(announcement) && (
                      <Checkbox
                        checked={selectedIds.has(announcement.id)}
                        onCheckedChange={() => toggleSelect(announcement.id)}
                        className="mt-1"
                      />
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        By {announcement.profiles?.full_name || "Unknown"} • {format(new Date(announcement.created_at), "PPP")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {announcement.is_global ? (
                      <Badge variant="secondary" className="gap-1">
                        <Globe className="h-3 w-3" />
                        Global
                      </Badge>
                    ) : announcement.courses?.title ? (
                      <Badge variant="outline" className="gap-1">
                        <BookOpen className="h-3 w-3" />
                        {announcement.courses.title}
                      </Badge>
                    ) : null}
                    
                    {canManage(announcement) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(announcement)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this announcement? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(announcement.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{announcement.content}</p>
                {announcement.image_url && (
                  <div className="mt-4">
                    <img
                      src={announcement.image_url}
                      alt="Announcement attachment"
                      className="max-w-full h-auto rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(announcement.image_url!, "_blank")}
                    />
                  </div>
                )}
                <AnnouncementComments 
                  announcementId={announcement.id} 
                  userId={userId} 
                  commentsEnabled={announcement.comments_enabled !== false}
                />
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
            itemLabel="announcements"
          />
        </div>
      )}
    </div>
  );
};
