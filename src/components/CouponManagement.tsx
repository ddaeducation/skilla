import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, CalendarIcon, Copy, Percent, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Coupon {
  id: string;
  code: string;
  discount_type: "percentage" | "amount";
  discount_value: number;
  course_id: string | null;
  is_global: boolean;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  courses?: { title: string } | null;
}

interface Course {
  id: string;
  title: string;
}

interface CouponManagementProps {
  isAdmin?: boolean;
  instructorCourseIds?: string[];
}

export const CouponManagement = ({ isAdmin = false, instructorCourseIds = [] }: CouponManagementProps) => {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "amount",
    discount_value: 10,
    course_id: "" as string | null,
    is_global: false,
    max_uses: null as number | null,
    expires_at: null as Date | null,
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
      }

      // Fetch coupons
      let couponsQuery = supabase
        .from("coupons")
        .select(`
          *,
          courses (title)
        `)
        .order("created_at", { ascending: false });

      // If instructor, filter to their courses only
      if (!isAdmin && instructorCourseIds.length > 0) {
        couponsQuery = couponsQuery.in("course_id", instructorCourseIds);
      }

      const { data: couponsData, error: couponsError } = await couponsQuery;
      
      if (couponsError) {
        console.error("Error fetching coupons:", couponsError);
      } else {
        setCoupons(couponsData as Coupon[] || []);
      }

      // Fetch courses for dropdown
      let coursesQuery = supabase
        .from("courses")
        .select("id, title")
        .order("title");

      if (!isAdmin && instructorCourseIds.length > 0) {
        coursesQuery = coursesQuery.in("id", instructorCourseIds);
      }

      const { data: coursesData } = await coursesQuery;
      if (coursesData) {
        setCourses(coursesData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code }));
  };

  const resetForm = () => {
    setFormData({
      code: "",
      discount_type: "percentage",
      discount_value: 10,
      course_id: null,
      is_global: false,
      max_uses: null,
      expires_at: null,
      is_active: true,
    });
    setEditingCoupon(null);
  };

  const handleOpenDialog = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        course_id: coupon.course_id,
        is_global: coupon.is_global,
        max_uses: coupon.max_uses,
        expires_at: coupon.expires_at ? new Date(coupon.expires_at) : null,
        is_active: coupon.is_active,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code) {
      toast({
        title: "Error",
        description: "Please enter a coupon code",
        variant: "destructive",
      });
      return;
    }

    if (formData.discount_value <= 0) {
      toast({
        title: "Error",
        description: "Discount value must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (formData.discount_type === "percentage" && formData.discount_value > 100) {
      toast({
        title: "Error",
        description: "Percentage discount cannot exceed 100%",
        variant: "destructive",
      });
      return;
    }

    try {
      const couponData = {
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        course_id: formData.is_global ? null : formData.course_id || null,
        is_global: formData.is_global,
        max_uses: formData.max_uses,
        expires_at: formData.expires_at?.toISOString() || null,
        is_active: formData.is_active,
        created_by: currentUserId!,
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from("coupons")
          .update(couponData)
          .eq("id", editingCoupon.id);

        if (error) throw error;
        toast({ title: "Coupon updated successfully" });
      } else {
        const { error } = await supabase
          .from("coupons")
          .insert(couponData);

        if (error) throw error;
        toast({ title: "Coupon created successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error saving coupon:", error);
      toast({
        title: "Error",
        description: error.message?.includes("unique") 
          ? "A coupon with this code already exists" 
          : "Failed to save coupon",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (couponId: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    try {
      const { error } = await supabase
        .from("coupons")
        .delete()
        .eq("id", couponId);

      if (error) throw error;
      toast({ title: "Coupon deleted successfully" });
      fetchData();
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast({
        title: "Error",
        description: "Failed to delete coupon",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !coupon.is_active })
        .eq("id", coupon.id);

      if (error) throw error;
      toast({ title: `Coupon ${coupon.is_active ? "deactivated" : "activated"}` });
      fetchData();
    } catch (error) {
      console.error("Error toggling coupon:", error);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Code copied to clipboard" });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return <div className="p-8 text-center">Loading coupons...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Coupon Management</h2>
          <p className="text-muted-foreground">Create and manage discount coupons for courses</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? "Edit Coupon" : "Create New Coupon"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Coupon Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g., SAVE20"
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={generateRandomCode} type="button">
                    Generate
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value: "percentage" | "amount") => 
                      setFormData(prev => ({ ...prev, discount_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="amount">Fixed Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Discount Value</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max={formData.discount_type === "percentage" ? 100 : undefined}
                      value={formData.discount_value}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        discount_value: parseFloat(e.target.value) || 0 
                      }))}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {formData.discount_type === "percentage" ? "%" : "$"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Apply to All Courses</Label>
                <Switch
                  checked={formData.is_global}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    is_global: checked,
                    course_id: checked ? null : prev.course_id
                  }))}
                />
              </div>

              {!formData.is_global && (
                <div className="space-y-2">
                  <Label>Specific Course</Label>
                  <Select
                    value={formData.course_id || ""}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      course_id: value || null 
                    }))}
                  >
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Uses (optional)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.max_uses || ""}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      max_uses: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                    placeholder="Unlimited"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Expiry Date (optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.expires_at && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.expires_at 
                          ? format(formData.expires_at, "PPP") 
                          : "No expiry"
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.expires_at || undefined}
                        onSelect={(date) => setFormData(prev => ({ 
                          ...prev, 
                          expires_at: date || null 
                        }))}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                      {formData.expires_at && (
                        <div className="p-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => setFormData(prev => ({ ...prev, expires_at: null }))}
                          >
                            Clear expiry
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingCoupon ? "Update" : "Create"} Coupon
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {coupons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No coupons created yet. Create your first coupon to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold">{coupon.code}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyCode(coupon.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {coupon.discount_type === "percentage" ? (
                          <>
                            <Percent className="h-4 w-4 text-muted-foreground" />
                            <span>{coupon.discount_value}%</span>
                          </>
                        ) : (
                          <>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>${coupon.discount_value}</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {coupon.is_global ? (
                        <Badge variant="secondary">All Courses</Badge>
                      ) : coupon.courses ? (
                        <span className="text-sm">{coupon.courses.title}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {coupon.max_uses 
                        ? `${coupon.current_uses}/${coupon.max_uses}` 
                        : `${coupon.current_uses} uses`
                      }
                    </TableCell>
                    <TableCell>
                      {coupon.expires_at ? (
                        <span className={isExpired(coupon.expires_at) ? "text-destructive" : ""}>
                          {format(new Date(coupon.expires_at), "MMM d, yyyy")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isExpired(coupon.expires_at) ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : coupon.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(coupon)}
                        >
                          <Switch checked={coupon.is_active} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(coupon)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(coupon.id)}
                        >
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

export default CouponManagement;
