import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Megaphone, Gift, Video, Sparkles, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Popup {
  id: string;
  title: string;
  message: string;
  popup_type: string;
  image_url: string | null;
  cta_text: string | null;
  cta_link: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const typeOptions = [
  { value: "announcement", label: "Announcement", icon: Megaphone },
  { value: "promotion", label: "Promotion", icon: Gift },
  { value: "live_session", label: "Live Session", icon: Video },
  { value: "new_activity", label: "New Activity", icon: Sparkles },
];

const AdminPromotionalManagement = () => {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [popupType, setPopupType] = useState("announcement");
  const [imageUrl, setImageUrl] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchPopups();
  }, []);

  const fetchPopups = async () => {
    const { data } = await supabase
      .from("promotional_popups")
      .select("*")
      .order("created_at", { ascending: false });
    setPopups((data as Popup[]) || []);
    setLoading(false);
  };

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setPopupType("announcement");
    setImageUrl("");
    setCtaText("");
    setCtaLink("");
    setIsActive(true);
    setEndDate("");
    setEditingId(null);
  };

  const openEdit = (p: Popup) => {
    setEditingId(p.id);
    setTitle(p.title);
    setMessage(p.message);
    setPopupType(p.popup_type);
    setImageUrl(p.image_url || "");
    setCtaText(p.cta_text || "");
    setCtaLink(p.cta_link || "");
    setIsActive(p.is_active);
    setEndDate(p.end_date ? p.end_date.slice(0, 16) : "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Title and message are required", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      title,
      message,
      popup_type: popupType,
      image_url: imageUrl || null,
      cta_text: ctaText || null,
      cta_link: ctaLink || null,
      is_active: isActive,
      end_date: endDate ? new Date(endDate).toISOString() : null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("promotional_popups").update(payload).eq("id", editingId));
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      ({ error } = await supabase.from("promotional_popups").insert({ ...payload, created_by: session?.user?.id }));
    }

    setSaving(false);
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Updated successfully" : "Created successfully" });
      setDialogOpen(false);
      resetForm();
      fetchPopups();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("promotional_popups").delete().eq("id", id);
    if (!error) {
      toast({ title: "Deleted" });
      fetchPopups();
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("promotional_popups").update({ is_active: active }).eq("id", id);
    fetchPopups();
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      announcement: "bg-primary/10 text-primary",
      promotion: "bg-orange-100 text-orange-700",
      live_session: "bg-red-100 text-red-700",
      new_activity: "bg-emerald-100 text-emerald-700",
    };
    return <Badge className={colors[type] || ""}>{type.replace("_", " ")}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Promotional Popups & Announcements
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" /> New Popup
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Popup" : "Create New Popup"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Type</Label>
                <Select value={popupType} onValueChange={setPopupType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2">
                          <t.icon className="h-4 w-4" /> {t.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Exciting announcement!" />
              </div>
              <div>
                <Label>Message *</Label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell visitors what's happening..." rows={4} />
              </div>
              <div>
                <Label>Image URL (optional)</Label>
                <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CTA Button Text</Label>
                  <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Learn More" />
                </div>
                <div>
                  <Label>CTA Link</Label>
                  <Input value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} placeholder="/programs or https://..." />
                </div>
              </div>
              <div>
                <Label>End Date (optional)</Label>
                <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Active</Label>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingId ? "Update" : "Create"} Popup
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : popups.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No popups yet. Create one to engage visitors!</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {popups.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{getTypeBadge(p.popup_type)}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                  <TableCell>
                    <Switch
                      checked={p.is_active}
                      onCheckedChange={(v) => toggleActive(p.id, v)}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.end_date ? format(new Date(p.end_date), "MMM d, yyyy") : "No end"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPromotionalManagement;
