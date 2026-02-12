import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trophy, Pencil, Trash2 } from "lucide-react";

interface Course {
  id: string;
  title: string;
}

interface BadgeDefinition {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  criteria_type: string;
  criteria_value: Record<string, any> | null;
  course_id: string | null;
  is_active: boolean;
  created_at: string;
  courses?: { title: string } | null;
}

interface AdminBadgeManagementProps {
  courses: Course[];
}

const CRITERIA_TYPES = [
  { value: "course_completion", label: "Course Completion" },
  { value: "quiz_score", label: "Quiz Score Threshold" },
  { value: "time_spent", label: "Time Spent (minutes)" },
  { value: "lessons_completed", label: "Lessons Completed Count" },
  { value: "manual", label: "Manual Award" },
];

const AdminBadgeManagement = ({ courses }: AdminBadgeManagementProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<BadgeDefinition[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeDefinition | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    criteria_type: "manual",
    criteria_value: "",
    course_id: "",
    is_active: true,
  });

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      const { data, error } = await supabase
        .from("badge_definitions")
        .select(`
          *,
          courses (title)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBadges((data as unknown as BadgeDefinition[]) || []);
    } catch (error) {
      console.error("Error fetching badges:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const badgeData = {
        name: form.name,
        description: form.description || null,
        criteria_type: form.criteria_type,
        criteria_value: form.criteria_value ? { value: form.criteria_value } : null,
        course_id: form.course_id || null,
        is_active: form.is_active,
      };

      if (editingBadge) {
        const { error } = await supabase
          .from("badge_definitions")
          .update(badgeData)
          .eq("id", editingBadge.id);

        if (error) throw error;
        toast({ title: "Badge updated successfully" });
      } else {
        const { error } = await supabase
          .from("badge_definitions")
          .insert(badgeData);

        if (error) throw error;
        toast({ title: "Badge created successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchBadges();
    } catch (error) {
      console.error("Error saving badge:", error);
      toast({ title: "Error", description: "Failed to save badge", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this badge?")) return;

    try {
      const { error } = await supabase
        .from("badge_definitions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Badge deleted" });
      fetchBadges();
    } catch (error) {
      console.error("Error deleting badge:", error);
      toast({ title: "Error", description: "Failed to delete badge", variant: "destructive" });
    }
  };

  const handleEdit = (badge: BadgeDefinition) => {
    setEditingBadge(badge);
    setForm({
      name: badge.name,
      description: badge.description || "",
      criteria_type: badge.criteria_type,
      criteria_value: badge.criteria_value?.value?.toString() || "",
      course_id: badge.course_id || "",
      is_active: badge.is_active,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingBadge(null);
    setForm({
      name: "",
      description: "",
      criteria_type: "manual",
      criteria_value: "",
      course_id: "",
      is_active: true,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Badge Management</h2>
          <p className="text-muted-foreground">Create and manage digital badges for achievements</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Badge
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBadge ? "Edit Badge" : "Create Badge"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Badge name"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Badge description"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Criteria Type</Label>
                <Select value={form.criteria_type} onValueChange={(v) => setForm({ ...form, criteria_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRITERIA_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.criteria_type !== "manual" && form.criteria_type !== "course_completion" && (
                <div className="space-y-2">
                  <Label>
                    {form.criteria_type === "quiz_score" && "Minimum Score (%)"}
                    {form.criteria_type === "time_spent" && "Required Minutes"}
                    {form.criteria_type === "lessons_completed" && "Lessons Count"}
                  </Label>
                  <Input
                    type="number"
                    value={form.criteria_value}
                    onChange={(e) => setForm({ ...form, criteria_value: e.target.value })}
                    placeholder="Enter value"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Course (Optional)</Label>
                <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All courses (global badge)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All courses (global)</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={!form.name}>
                {editingBadge ? "Update Badge" : "Create Badge"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {badges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No badges created</h3>
            <p className="text-muted-foreground">Create your first badge to reward student achievements</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Badges ({badges.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Criteria</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {badges.map((badge) => (
                  <TableRow key={badge.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{badge.name}</p>
                        {badge.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{badge.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CRITERIA_TYPES.find((t) => t.value === badge.criteria_type)?.label || badge.criteria_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {badge.courses?.title || <span className="text-muted-foreground">Global</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.is_active ? "default" : "secondary"}>
                        {badge.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(badge)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(badge.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminBadgeManagement;
