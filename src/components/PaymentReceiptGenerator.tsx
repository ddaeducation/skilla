import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

interface ReceiptData {
  studentName: string;
  studentEmail: string;
  studentId?: string;
  courseName: string;
  courseSchool: string;
  amountPaid: number;
  currency: string;
  paymentDate: string;
  enrollmentId: string;
  paymentMethod?: string;
  monthsPaid?: number | null;
  transactionRef?: string;
}

interface PaymentReceiptGeneratorProps {
  receiptData: ReceiptData;
  variant?: "button" | "icon";
}

const PaymentReceiptGenerator = ({ receiptData, variant = "button" }: PaymentReceiptGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generateReceipt = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      // Header background
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 50, "F");

      // Header accent line
      doc.setFillColor(59, 130, 246); // blue-500
      doc.rect(0, 50, pageWidth, 2, "F");

      // Company name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Global Nexus Institute", margin, 28);

      // Receipt label
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("PAYMENT RECEIPT", margin, 40);

      // Receipt number and date (right side)
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const receiptNo = `RCT-${receiptData.enrollmentId.substring(0, 8).toUpperCase()}`;
      doc.text(receiptNo, pageWidth - margin, 28, { align: "right" });
      doc.text(
        new Date(receiptData.paymentDate).toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric",
        }),
        pageWidth - margin, 36, { align: "right" }
      );

      y = 65;

      // Bill To section
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("BILL TO", margin, y);

      y += 7;
      doc.setTextColor(30, 41, 59); // slate-800
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(receiptData.studentName, margin, y);

      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(receiptData.studentEmail, margin, y);

      if (receiptData.studentId) {
        y += 5;
        doc.text(`Student ID: ${receiptData.studentId}`, margin, y);
      }

      y += 15;

      // Table header
      doc.setFillColor(241, 245, 249); // slate-100
      doc.roundedRect(margin, y, contentWidth, 10, 1, 1, "F");
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("DESCRIPTION", margin + 4, y + 7);
      doc.text("AMOUNT", pageWidth - margin - 4, y + 7, { align: "right" });

      y += 16;

      // Course item
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(receiptData.courseName, margin + 4, y);

      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`School: ${receiptData.courseSchool}`, margin + 4, y);
      
      if (receiptData.monthsPaid) {
        y += 4;
        doc.text(`Duration: ${receiptData.monthsPaid} month(s)`, margin + 4, y);
      }

      // Amount
      const amountStr = `${receiptData.currency} ${receiptData.amountPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(amountStr, pageWidth - margin - 4, y - (receiptData.monthsPaid ? 4 : 0), { align: "right" });

      y += 10;

      // Divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);

      y += 8;

      // Total
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(pageWidth - margin - 70, y - 4, 70, 14, 1, 1, "F");
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL PAID", pageWidth - margin - 66, y + 4);
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.setFontSize(11);
      doc.text(amountStr, pageWidth - margin - 4, y + 4, { align: "right" });

      y += 25;

      // Payment details
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT DETAILS", margin, y);

      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);

      const details = [
        ["Payment Method", receiptData.paymentMethod || "Flutterwave"],
        ["Status", "Completed"],
        ["Transaction Ref", receiptData.transactionRef || receiptData.enrollmentId.substring(0, 12)],
      ];

      details.forEach(([label, value]) => {
        doc.setFont("helvetica", "normal");
        doc.text(`${label}:`, margin + 4, y);
        doc.setFont("helvetica", "bold");
        doc.text(value, margin + 50, y);
        y += 6;
      });

      y += 15;

      // Footer divider
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Footer
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Thank you for your enrollment at Global Nexus Institute.", pageWidth / 2, y, { align: "center" });
      y += 5;
      doc.text("This is an electronically generated receipt — no signature required.", pageWidth / 2, y, { align: "center" });
      y += 5;
      doc.text("For questions, contact support@globalnexusinstitute.com", pageWidth / 2, y, { align: "center" });

      doc.save(`Receipt-${receiptNo}.pdf`);

      toast({ title: "Receipt Downloaded", description: "Your payment receipt has been saved." });
    } catch (error) {
      console.error("Error generating receipt:", error);
      toast({ title: "Error", description: "Failed to generate receipt.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (variant === "icon") {
    return (
      <Button variant="ghost" size="icon" onClick={generateReceipt} disabled={generating} title="Download Receipt">
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
      </Button>
    );
  }

  return (
    <Button onClick={generateReceipt} disabled={generating} variant="outline" className="gap-2">
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Download Receipt
    </Button>
  );
};

export default PaymentReceiptGenerator;
