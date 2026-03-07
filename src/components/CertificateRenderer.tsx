import React, { useEffect, useRef, useCallback } from "react";

interface Placeholder {
  id: string;
  type: "student_name" | "course_name" | "date" | "certificate_id" | "instructor_name" | "school_name" | "custom" | "qr_code";
  label: string;
  x: number;
  y: number;
  width?: number;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  color: string;
  customText?: string;
}

export interface CertificateData {
  studentName: string;
  courseName: string;
  schoolName: string;
  certificateNumber: string;
  issueDate: string;
  instructorName: string;
  verificationUrl: string;
  template?: {
    placeholders: Placeholder[];
    width: number;
    height: number;
    background_url?: string | null;
  };
}

interface CertificateRendererProps {
  data: CertificateData;
  scale?: number;
  onReady?: () => void;
}

function getPlaceholderText(ph: Placeholder, data: CertificateData): string {
  switch (ph.type) {
    case "student_name": return data.studentName;
    case "course_name": return data.courseName;
    case "date": return data.issueDate;
    case "certificate_id": return data.certificateNumber;
    case "instructor_name": return data.instructorName;
    case "school_name": return data.schoolName;
    case "custom": return ph.customText || "";
    default: return "";
  }
}

/**
 * A QR code placeholder rendered as a <canvas> so html2canvas captures it
 * natively without any cross-origin or image-loading timing issues.
 */
function QRCanvas({
  text,
  size,
  onReady,
}: {
  text: string;
  size: number;
  onReady?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        if (cancelled || !canvasRef.current) return;
        // Draw directly onto our canvas element
        await QRCode.toCanvas(canvasRef.current, text, {
          width: size,
          margin: 1,
          color: { dark: "#000000", light: "#ffffff" },
          errorCorrectionLevel: "M",
        });
        if (!cancelled) {
          // One rAF to ensure the browser has composited the canvas pixels
          requestAnimationFrame(() => {
            if (!cancelled) onReady?.();
          });
        }
      } catch (err) {
        console.error("QR generation failed:", err);
        if (!cancelled) onReady?.(); // don't hang
      }
    })();
    return () => { cancelled = true; };
  }, [text, size, onReady]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

/**
 * Renders a certificate template exactly as designed — used both for preview
 * and as the source for html2canvas PDF capture.
 */
const CertificateRenderer = React.forwardRef<HTMLDivElement, CertificateRendererProps>(
  ({ data, scale = 1, onReady }, ref) => {
    const template = data.template;
    const width = template?.width || 842;
    const height = template?.height || 595;

    // Track how many QR canvases still need to signal ready
    const qrPlaceholders = template?.placeholders.filter(p => p.type === "qr_code") ?? [];
    const pendingQRRef = useRef(qrPlaceholders.length);
    const readyFiredRef = useRef(false);

    const handleQRReady = useCallback(() => {
      pendingQRRef.current -= 1;
      if (pendingQRRef.current <= 0 && !readyFiredRef.current) {
        readyFiredRef.current = true;
        onReady?.();
      }
    }, [onReady]);

    // When there are no QR codes, fire onReady after mount
    useEffect(() => {
      if (qrPlaceholders.length === 0 && !readyFiredRef.current) {
        readyFiredRef.current = true;
        onReady?.();
      }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const containerStyle: React.CSSProperties = {
      position: "relative",
      width: width * scale,
      height: height * scale,
      overflow: "hidden",
      backgroundColor: "#ffffff",
      fontFamily: "Helvetica, Arial, sans-serif",
    };

    if (!template || template.placeholders.length === 0) {
      return (
        <div ref={ref} style={containerStyle}>
          {template?.background_url && (
            <img
              src={template.background_url}
              alt=""
              crossOrigin="anonymous"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", padding: 40 * scale, gap: 16 * scale,
          }}>
            <div style={{ fontSize: 36 * scale, fontWeight: "bold", color: "#1a4e8a" }}>Certificate of Completion</div>
            <div style={{ fontSize: 14 * scale, color: "#555" }}>This is to certify that</div>
            <div style={{ fontSize: 28 * scale, fontWeight: "bold", color: "#111" }}>{data.studentName}</div>
            <div style={{ fontSize: 14 * scale, color: "#555" }}>has successfully completed the course</div>
            <div style={{ fontSize: 22 * scale, fontWeight: "bold", color: "#1a4e8a" }}>{data.courseName}</div>
            <div style={{ fontSize: 12 * scale, color: "#666" }}>School: {data.schoolName}</div>
            <div style={{ fontSize: 12 * scale, color: "#555" }}>Instructor: {data.instructorName}</div>
            <div style={{ fontSize: 10 * scale, color: "#999", marginTop: 8 * scale }}>
              Certificate #{data.certificateNumber} · {data.issueDate}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} style={containerStyle}>
        {/* Background image */}
        {template.background_url && (
          <img
            src={template.background_url}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "fill",
              display: "block",
            }}
          />
        )}

        {/* Placeholders */}
        {template.placeholders.map((ph) => {
          const isQR = ph.type === "qr_code";
          const placeholderWidth = (ph.width || 150) * scale;
          const placeholderHeight = isQR ? placeholderWidth : (ph.fontSize + 8) * scale;

          const wrapStyle: React.CSSProperties = {
            position: "absolute",
            left: ph.x * scale,
            top: ph.y * scale,
            width: placeholderWidth,
            height: placeholderHeight,
          };

          if (isQR) {
            const size = Math.round(ph.width || 150);
            const qrText = [
              `Name: ${data.studentName}`,
              `Course: ${data.courseName}`,
              `School: ${data.schoolName}`,
              `Date: ${data.issueDate}`,
              `Certificate: ${data.certificateNumber}`,
              `Verify: ${data.verificationUrl}`,
            ].join('\n');
            return (
              <div key={ph.id} style={wrapStyle}>
                <QRCanvas
                  text={qrText}
                  size={size}
                  onReady={handleQRReady}
                />
              </div>
            );
          }

          const text = getPlaceholderText(ph, data);
          if (!text) return null;

          const textStyle: React.CSSProperties = {
            fontSize: ph.fontSize * scale,
            fontWeight: ph.fontWeight,
            fontStyle: ph.fontStyle || "normal",
            textAlign: ph.textAlign || "center",
            color: ph.color,
            width: "100%",
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "visible",
            display: "block",
          };

          return (
            <div key={ph.id} style={wrapStyle}>
              <span style={textStyle}>{text}</span>
            </div>
          );
        })}
      </div>
    );
  }
);

CertificateRenderer.displayName = "CertificateRenderer";

export default CertificateRenderer;
