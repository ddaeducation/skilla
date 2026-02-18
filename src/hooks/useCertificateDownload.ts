import { useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CertificateData } from "@/components/CertificateRenderer";

interface UseCertificateDownloadOptions {
  onError?: (msg: string) => void;
}

/**
 * Returns a function that:
 * 1. Fetches the latest certificate template + student data from the backend
 * 2. Renders the certificate into a hidden off-screen DOM element using CertificateRenderer
 * 3. Uses html2canvas to capture it as an image
 * 4. Uses jsPDF to create a PDF at full resolution and triggers download
 */
export function useCertificateDownload({ onError }: UseCertificateDownloadOptions = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const downloadCertificate = useCallback(async (
    courseId: string,
    certificateNumber: string,
    certData: CertificateData
  ) => {
    try {
      // Dynamically import to avoid bundling in server contexts
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const container = containerRef.current;
      if (!container) throw new Error("Render container not mounted");

      // Wait for images to load
      await new Promise<void>((resolve) => {
        const imgs = Array.from(container.querySelectorAll("img"));
        if (imgs.length === 0) { resolve(); return; }
        let loaded = 0;
        imgs.forEach((img) => {
          if (img.complete) { loaded++; if (loaded === imgs.length) resolve(); return; }
          img.addEventListener("load", () => { loaded++; if (loaded === imgs.length) resolve(); }, { once: true });
          img.addEventListener("error", () => { loaded++; if (loaded === imgs.length) resolve(); }, { once: true });
        });
        // Fallback timeout
        setTimeout(resolve, 3000);
      });

      const template = certData.template;
      const pdfWidth = template?.width || 842;
      const pdfHeight = template?.height || 595;

      const canvas = await html2canvas(container, {
        useCORS: true,
        allowTaint: false,
        scale: 3, // high-res capture
        width: pdfWidth,
        height: pdfHeight,
        backgroundColor: null,
        logging: false,
      });

      // Landscape orientation matching template dimensions
      const orientation = pdfWidth > pdfHeight ? "landscape" : "portrait";
      const pdf = new jsPDF({
        orientation,
        unit: "pt",
        format: [pdfWidth, pdfHeight],
      });

      const imgData = canvas.toDataURL("image/png", 1.0);
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`certificate-${certificateNumber}.pdf`);
    } catch (err: any) {
      console.error("Certificate download error:", err);
      onError?.(err.message || "Failed to generate certificate PDF");
    }
  }, [onError]);

  return { containerRef, downloadCertificate };
}
