import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Member {
  id: string; email: string; full_name: string | null; user_id: string | null;
}
interface License {
  id: string; course_id: string; total_seats: number; used_seats: number;
  courses?: { title: string };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  licenses: License[];
  accountId: string;
  accountName: string;
  onAssigned: () => void;
}

const CorporateAssignCourse = ({ open, onOpenChange, members, licenses, accountId, accountName, onAssigned }: Props) => {
  const { toast } = useToast();
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedLicense, setSelectedLicense] = useState("");
  const [assigning, setAssigning] = useState(false);

  const availableLicenses = licenses.filter(l => l.used_seats < l.total_seats && l.courses);

  const handleAssign = async () => {
    if (!selectedMember || !selectedLicense) return;
    setAssigning(true);
    try {
      const license = licenses.find(l => l.id === selectedLicense);
      const member = members.find(m => m.id === selectedMember);
      if (!license || !member) throw new Error("Invalid selection");

      const { error } = await supabase.from("corporate_enrollments").insert({
        corporate_account_id: accountId,
        member_id: selectedMember,
        course_id: license.course_id,
        license_id: selectedLicense,
        user_id: member.user_id,
        status: "assigned",
      });
      if (error) throw error;

      // Update used seats
      await supabase.from("corporate_course_licenses").update({
        used_seats: license.used_seats + 1,
      }).eq("id", selectedLicense);

      // Send email notification
      try {
        await supabase.functions.invoke("send-corporate-member-invitation", {
          body: {
            type: "course_assigned",
            member_email: member.email,
            member_name: member.full_name,
            company_name: accountName,
            course_title: (license as any).courses?.title,
            site_url: window.location.origin,
          },
        });
      } catch { /* email is best-effort */ }

      toast({ title: "Course assigned", description: `${(license as any).courses?.title} assigned to ${member.full_name || member.email}` });
      setSelectedMember("");
      setSelectedLicense("");
      onOpenChange(false);
      onAssigned();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Assign Course to Employee</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Employee</Label>
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger><SelectValue placeholder="Choose an employee" /></SelectTrigger>
              <SelectContent>
                {members.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Select Course</Label>
            <Select value={selectedLicense} onValueChange={setSelectedLicense}>
              <SelectTrigger><SelectValue placeholder="Choose a course" /></SelectTrigger>
              <SelectContent>
                {availableLicenses.map(l => (
                  <SelectItem key={l.id} value={l.id}>
                    {(l as any).courses?.title} ({l.total_seats - l.used_seats} seats left)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableLicenses.length === 0 && (
              <p className="text-sm text-muted-foreground">No licenses with available seats.</p>
            )}
          </div>
          <Button className="w-full" onClick={handleAssign} disabled={assigning || !selectedMember || !selectedLicense}>
            {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Assign Course
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CorporateAssignCourse;
