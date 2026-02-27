import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, CheckCircle, XCircle, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface CollaborationRequest {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  company_website: string | null;
  collaboration_type: string;
  description: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  reviewed: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const AdminCollaborationManagement = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<CollaborationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CollaborationRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("collaboration_requests" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRequests(data as any);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true);
    const { error } = await supabase
      .from("collaboration_requests" as any)
      .update({ status, admin_notes: adminNotes, reviewed_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) {
      toast({ title: "Error updating", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Request ${status}` });
      setSelected(null);
      fetchRequests();
    }
    setUpdating(false);
  };

  const filtered = requests.filter(r =>
    r.company_name.toLowerCase().includes(search.toLowerCase()) ||
    r.contact_name.toLowerCase().includes(search.toLowerCase()) ||
    r.contact_email.toLowerCase().includes(search.toLowerCase())
  );

  const formatType = (type: string) => type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search requests..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {["all", "pending", "approved", "rejected"].map(s => (
            <Badge key={s} variant="outline" className="cursor-pointer capitalize">
              {s} ({s === "all" ? requests.length : requests.filter(r => r.status === s).length})
            </Badge>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No collaboration requests found.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(req => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.company_name}</TableCell>
                    <TableCell>
                      <div>{req.contact_name}</div>
                      <div className="text-xs text-muted-foreground">{req.contact_email}</div>
                    </TableCell>
                    <TableCell>{formatType(req.collaboration_type)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[req.status] || "bg-muted"}`}>
                        {req.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{format(new Date(req.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => { setSelected(req); setAdminNotes(req.admin_notes || ""); }}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Collaboration Request</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Company</p>
                  <p className="font-medium">{selected.company_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Contact</p>
                  <p className="font-medium">{selected.contact_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selected.contact_email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{selected.contact_phone || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Website</p>
                  <p className="font-medium">{selected.company_website ? (
                    <a href={selected.company_website} target="_blank" rel="noopener noreferrer" className="text-primary underline">{selected.company_website}</a>
                  ) : "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">{formatType(selected.collaboration_type)}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">Description</p>
                <p className="text-sm bg-muted p-3 rounded-md">{selected.description}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">Admin Notes</p>
                <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Add notes about this request..." rows={3} />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => updateStatus(selected.id, "approved")} disabled={updating} className="flex-1 bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button onClick={() => updateStatus(selected.id, "rejected")} disabled={updating} variant="destructive" className="flex-1">
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button onClick={() => updateStatus(selected.id, "reviewed")} disabled={updating} variant="outline" className="flex-1">
                  <Clock className="h-4 w-4 mr-1" /> Under Review
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCollaborationManagement;
