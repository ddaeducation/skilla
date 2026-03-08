import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Search, Download, RefreshCw, Heart } from "lucide-react";
import { format } from "date-fns";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

interface Donation {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  amount: number;
  currency: string;
  message: string | null;
  transaction_ref: string | null;
  status: string;
  created_at: string;
}

const AdminDonationManagement = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("donations")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setDonations(data as Donation[]);
    if (error) console.error("Error fetching donations:", error);
    setLoading(false);
  };

  const usdDonations = donations.filter(d => d.currency === "USD");
  const rwfDonations = donations.filter(d => d.currency === "RWF");

  const totalUSD = usdDonations.reduce((sum, d) => sum + Number(d.amount), 0);
  const totalRWF = rwfDonations.reduce((sum, d) => sum + Number(d.amount), 0);

  const filterDonations = (list: Donation[]) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(d =>
      (d.name?.toLowerCase().includes(q)) ||
      (d.email?.toLowerCase().includes(q)) ||
      (d.phone?.toLowerCase().includes(q)) ||
      (d.message?.toLowerCase().includes(q))
    );
  };

  const DonationTable = ({ data, currency }: { data: Donation[]; currency: string }) => {
    const filtered = filterDonations(data);
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No {currency} donations found
              </TableCell>
            </TableRow>
          ) : (
            filtered.map(d => (
              <TableRow key={d.id}>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(d.created_at), "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell>{d.name || "Anonymous"}</TableCell>
                <TableCell>{d.email || "—"}</TableCell>
                <TableCell>{d.phone || "—"}</TableCell>
                <TableCell className="font-semibold">
                  {currency === "USD" ? `$${Number(d.amount).toFixed(2)}` : `RWF ${Number(d.amount).toLocaleString()}`}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{d.message || "—"}</TableCell>
                <TableCell>
                  <Badge variant={d.status === "completed" ? "default" : "secondary"}>
                    {d.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    );
  };

  const handleExport = (type: "excel" | "pdf") => {
    const columns = [
      { header: "Date", accessor: (d: any) => format(new Date(d.created_at), "MMM dd, yyyy HH:mm") },
      { header: "Name", accessor: (d: any) => d.name || "Anonymous" },
      { header: "Email", accessor: (d: any) => d.email || "" },
      { header: "Phone", accessor: (d: any) => d.phone || "" },
      { header: "Amount", accessor: (d: any) => d.amount },
      { header: "Currency", accessor: (d: any) => d.currency },
      { header: "Message", accessor: (d: any) => d.message || "" },
      { header: "Status", accessor: (d: any) => d.status },
    ];

    if (type === "excel") {
      exportToExcel(donations, columns, "donations");
    } else {
      exportToPDF(donations, columns, "donations", "Donations Report");
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total USD Donations</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalUSD.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{usdDonations.length} donation(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total RWF Donations</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">RWF {totalRWF.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{rwfDonations.length} donation(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search donors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchDonations} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("excel")}>
            <Download className="h-4 w-4 mr-1" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* USD Donations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">USD Donations</CardTitle>
        </CardHeader>
        <CardContent>
          <DonationTable data={usdDonations} currency="USD" />
        </CardContent>
      </Card>

      {/* RWF Donations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">RWF Donations</CardTitle>
        </CardHeader>
        <CardContent>
          <DonationTable data={rwfDonations} currency="RWF" />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDonationManagement;
