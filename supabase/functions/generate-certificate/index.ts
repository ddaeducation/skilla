import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateCertificateNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CERT-${timestamp}-${random}`;
}

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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  } : { r: 0, g: 0, b: 0 };
}

// Fetch image and convert to base64 for PDF embedding
async function fetchImageAsBase64(url: string): Promise<{ data: Uint8Array; width: number; height: number; format: string } | null> {
  try {
    console.log('Fetching background image from:', url);
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Failed to fetch image:', response.status, response.statusText);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || '';
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    let format = 'jpeg';
    if (contentType.includes('png') || url.toLowerCase().endsWith('.png')) {
      format = 'png';
    } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      format = 'jpeg';
    }
    
    console.log('Image fetched successfully, format:', format, 'size:', bytes.length);
    
    return {
      data: bytes,
      width: 0,
      height: 0,
      format
    };
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

// ─── Simple QR Code generator (QR Version 1, numeric/alphanumeric workaround using URL) ───
// We use a public QR API to generate a PNG QR code and embed it as an image in the PDF.
async function fetchQRCodePng(url: string, size = 120): Promise<Uint8Array | null> {
  try {
    // Use Google Chart API (public, no API key needed)
    const qrUrl = `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(url)}&choe=UTF-8`;
    const resp = await fetch(qrUrl);
    if (!resp.ok) return null;
    const ab = await resp.arrayBuffer();
    return new Uint8Array(ab);
  } catch {
    return null;
  }
}

// ─── Draw a QR code PNG as a PDF XObject (returned as PDF stream fragment) ───
// Returns the xobject definition string and the binary bytes separately.
async function buildQRXObject(
  verificationUrl: string,
  placeholder: Placeholder,
  pdfHeight: number
): Promise<{ pdfObjText: string; imageBytes: Uint8Array; drawCommand: string } | null> {
  const qrSize = placeholder.width || placeholder.fontSize * 4 || 100;
  const pngBytes = await fetchQRCodePng(verificationUrl, Math.round(qrSize));
  if (!pngBytes) return null;

  // PDF Y = bottom-left, convert from top-left
  const pdfY = pdfHeight - placeholder.y - qrSize;
  const drawCommand = `q\n${qrSize} 0 0 ${qrSize} ${placeholder.x.toFixed(2)} ${pdfY.toFixed(2)} cm\n/QRImg Do\nQ\n`;

  const pdfObjText = `<< /Type /XObject /Subtype /Image /Width ${Math.round(qrSize)} /Height ${Math.round(qrSize)} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pngBytes.length} >>`;
  return { pdfObjText, imageBytes: pngBytes, drawCommand };
}

// Generate PDF with background image support
async function generateCertificatePDFWithBackground(
  studentName: string,
  courseName: string,
  schoolName: string,
  certificateNumber: string,
  issueDate: string,
  instructorName: string,
  verificationUrl: string,
  template?: { placeholders: Placeholder[]; width: number; height: number; background_url?: string | null }
): Promise<Uint8Array> {
  const width = template?.width || 842;
  const height = template?.height || 595;

  // Build text objects from placeholders if template exists
  let textObjects = "";
  let hasQRPlaceholder = false;
  let qrPlaceholder: Placeholder | null = null;
  
  if (template?.placeholders && template.placeholders.length > 0) {
    template.placeholders.forEach((placeholder) => {
      if (placeholder.type === "qr_code") {
        hasQRPlaceholder = true;
        qrPlaceholder = placeholder;
        return; // handled separately
      }

      let text = "";
      switch (placeholder.type) {
        case "student_name":
          text = studentName;
          break;
        case "course_name":
          text = courseName;
          break;
        case "date":
          text = issueDate;
          break;
        case "certificate_id":
          text = certificateNumber;
          break;
        case "instructor_name":
          text = instructorName;
          break;
        case "school_name":
          text = schoolName;
          break;
        case "custom":
          text = placeholder.customText || "";
          break;
      }
      
      if (!text) return;
      
      const rgb = hexToRgb(placeholder.color);
      const fontSize = placeholder.fontSize || 24;
      const pdfY = height - placeholder.y - fontSize;
      
      let fontRef = "/F2";
      if (placeholder.fontWeight === "bold" && placeholder.fontStyle === "italic") {
        fontRef = "/F4";
      } else if (placeholder.fontWeight === "bold") {
        fontRef = "/F1";
      } else if (placeholder.fontStyle === "italic") {
        fontRef = "/F3";
      }
      
      const placeholderWidth = placeholder.width || 150;
      const textAlign = placeholder.textAlign || "center";
      const charWidthRatio = placeholder.fontWeight === "bold" ? 0.55 : 0.5;
      const estimatedTextWidth = text.length * fontSize * charWidthRatio;
      
      let pdfX = placeholder.x;
      if (textAlign === "center") {
        pdfX = placeholder.x + (placeholderWidth - estimatedTextWidth) / 2;
      } else if (textAlign === "right") {
        pdfX = placeholder.x + placeholderWidth - estimatedTextWidth;
      }
      pdfX = Math.max(0, pdfX);
      
      textObjects += `
BT
${fontRef} ${fontSize} Tf
${rgb.r.toFixed(2)} ${rgb.g.toFixed(2)} ${rgb.b.toFixed(2)} rg
${pdfX.toFixed(2)} ${pdfY.toFixed(2)} Td
(${text.replace(/[()\\]/g, '\\$&')}) Tj
ET
`;
    });
  } else {
    // Default layout if no template
    const title = "Certificate of Completion";
    textObjects = `
BT
/F1 36 Tf
0.2 0.4 0.6 rg
180 500 Td
(${title}) Tj
ET

BT
/F2 14 Tf
0.3 0.3 0.3 rg
150 440 Td
(This is to certify that) Tj
ET

BT
/F1 28 Tf
0.1 0.1 0.1 rg
${Math.max(100, 421 - studentName.length * 7)} 390 Td
(${studentName}) Tj
ET

BT
/F2 14 Tf
0.3 0.3 0.3 rg
230 350 Td
(has successfully completed the course) Tj
ET

BT
/F1 22 Tf
0.2 0.4 0.6 rg
${Math.max(100, 421 - courseName.length * 5)} 300 Td
(${courseName}) Tj
ET

BT
/F2 12 Tf
0.4 0.4 0.4 rg
300 260 Td
(School: ${schoolName}) Tj
ET

BT
/F2 12 Tf
0.3 0.3 0.3 rg
280 220 Td
(Instructor: ${instructorName}) Tj
ET

BT
/F2 10 Tf
0.5 0.5 0.5 rg
100 100 Td
(Certificate Number: ${certificateNumber}) Tj
ET

BT
/F2 10 Tf
0.5 0.5 0.5 rg
600 100 Td
(Issue Date: ${issueDate}) Tj
ET

BT
/F2 12 Tf
0.3 0.3 0.3 rg
280 150 Td
(Global Network Institute) Tj
ET
`;
  }

  // Check if we have a background image
  let imageData: { data: Uint8Array; width: number; height: number; format: string } | null = null;
  if (template?.background_url) {
    imageData = await fetchImageAsBase64(template.background_url);
  }

  // Handle QR code - encode full certificate info
  let qrData: { pdfObjText: string; imageBytes: Uint8Array; drawCommand: string } | null = null;
  if (hasQRPlaceholder && qrPlaceholder) {
    const qrText = verificationUrl;
    qrData = await buildQRXObject(qrText, qrPlaceholder, height);
  }

  // Build PDF with or without background image, with or without QR
  if (imageData) {
    console.log('Generating PDF with background image, format:', imageData.format);
    return generatePDFWithImage(width, height, textObjects, imageData, qrData);
  } else {
    console.log('Generating PDF without background image');
    return generatePDFWithoutImage(width, height, textObjects, qrData);
  }
}

function generatePDFWithoutImage(
  width: number, 
  height: number, 
  textObjects: string,
  qrData: { pdfObjText: string; imageBytes: Uint8Array; drawCommand: string } | null
): Uint8Array {
  const hasQR = !!qrData;

  const streamContent = (hasQR ? qrData!.drawCommand : "") + textObjects;
  const streamLength = new TextEncoder().encode(streamContent).length;

  if (!hasQR) {
    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >> >> >>
endobj

4 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj

5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj

6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj

7 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>
endobj

8 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique >>
endobj

xref
0 9
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000280 00000 n 
0000001520 00000 n 
0000001597 00000 n 
0000001680 00000 n 
0000001770 00000 n 

trailer
<< /Size 9 /Root 1 0 R >>
startxref
1870
%%EOF`;
    return new TextEncoder().encode(pdfContent);
  }

  // With QR code as object 9
  const qrBytes = qrData!.imageBytes;
  const objects: string[] = [];

  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`);
  objects.push(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >> /XObject << /QRImg 9 0 R >> >> >>\nendobj`);
  objects.push(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`);
  objects.push(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`);
  objects.push(`6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);
  objects.push(`7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>\nendobj`);
  objects.push(`8 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique >>\nendobj`);
  objects.push(`9 0 obj\n${qrData!.pdfObjText}\nstream`);

  const header = `%PDF-1.4\n${objects.join('\n\n')}\n`;
  const headerBytes = new TextEncoder().encode(header);
  const afterStream = new TextEncoder().encode(`\nendstream\nendobj\n\ntrailer\n<< /Size 10 /Root 1 0 R >>\nstartxref\n${headerBytes.length + qrBytes.length + 50}\n%%EOF`);

  const total = new Uint8Array(headerBytes.length + qrBytes.length + afterStream.length);
  total.set(headerBytes, 0);
  total.set(qrBytes, headerBytes.length);
  total.set(afterStream, headerBytes.length + qrBytes.length);
  return total;
}

function generatePDFWithImage(
  width: number, 
  height: number, 
  textObjects: string, 
  imageData: { data: Uint8Array; format: string },
  qrData: { pdfObjText: string; imageBytes: Uint8Array; drawCommand: string } | null
): Uint8Array {
  const imageBytes = imageData.data;
  const isPng = imageData.format === 'png';
  
  if (isPng) {
    console.log('Processing PNG image for PDF embedding');
    return generatePDFWithPngImage(width, height, textObjects, imageBytes, qrData);
  } else {
    console.log('Processing JPEG image for PDF embedding');
    return generatePDFWithJpegImage(width, height, textObjects, imageBytes, qrData);
  }
}

function generatePDFWithJpegImage(
  width: number,
  height: number,
  textObjects: string,
  imageBytes: Uint8Array,
  qrData: { pdfObjText: string; imageBytes: Uint8Array; drawCommand: string } | null
): Uint8Array {
  const imageStreamLength = imageBytes.length;
  const hasQR = !!qrData;

  const contentStream = `q
${width} 0 0 ${height} 0 0 cm
/Img1 Do
Q
${hasQR ? qrData!.drawCommand : ""}${textObjects}`;
  const contentStreamLength = new TextEncoder().encode(contentStream).length;

  const xobjects = hasQR
    ? `/XObject << /Img1 9 0 R /QRImg 10 0 R >>`
    : `/XObject << /Img1 9 0 R >>`;

  const objects: string[] = [];
  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`);
  objects.push(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >> ${xobjects} >> >>\nendobj`);
  objects.push(`4 0 obj\n<< /Length ${contentStreamLength} >>\nstream\n${contentStream}\nendstream\nendobj`);
  objects.push(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`);
  objects.push(`6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);
  objects.push(`7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>\nendobj`);
  objects.push(`8 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique >>\nendobj`);
  objects.push(`9 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageStreamLength} >>\nstream`);

  const headerAndObjects = `%PDF-1.4\n${objects.join('\n\n')}\n`;
  const headerBytes = new TextEncoder().encode(headerAndObjects);

  if (!hasQR) {
    const afterImageStream = `\nendstream\nendobj\n\ntrailer\n<< /Size 10 /Root 1 0 R >>\nstartxref\n${headerBytes.length + imageBytes.length + 50}\n%%EOF`;
    const afterBytes = new TextEncoder().encode(afterImageStream);
    const total = new Uint8Array(headerBytes.length + imageBytes.length + afterBytes.length);
    total.set(headerBytes, 0);
    total.set(imageBytes, headerBytes.length);
    total.set(afterBytes, headerBytes.length + imageBytes.length);
    console.log('PDF with JPEG image generated, total size:', total.length);
    return total;
  }

  // With QR
  const qrBytes = qrData!.imageBytes;
  const betweenStreams = new TextEncoder().encode(`\nendstream\nendobj\n\n10 0 obj\n${qrData!.pdfObjText}\nstream`);
  const afterQR = new TextEncoder().encode(`\nendstream\nendobj\n\ntrailer\n<< /Size 11 /Root 1 0 R >>\nstartxref\n1000\n%%EOF`);

  const total = new Uint8Array(headerBytes.length + imageBytes.length + betweenStreams.length + qrBytes.length + afterQR.length);
  let offset = 0;
  total.set(headerBytes, offset); offset += headerBytes.length;
  total.set(imageBytes, offset); offset += imageBytes.length;
  total.set(betweenStreams, offset); offset += betweenStreams.length;
  total.set(qrBytes, offset); offset += qrBytes.length;
  total.set(afterQR, offset);
  console.log('PDF with JPEG + QR image generated, total size:', total.length);
  return total;
}

function generatePDFWithPngImage(
  width: number,
  height: number,
  textObjects: string,
  pngBytes: Uint8Array,
  qrData: { pdfObjText: string; imageBytes: Uint8Array; drawCommand: string } | null
): Uint8Array {
  let offset = 8;
  let imageWidth = width;
  let imageHeight = height;
  const idatChunks: Uint8Array[] = [];
  let colorType = 2;
  
  while (offset < pngBytes.length) {
    const chunkLength = (pngBytes[offset] << 24) | (pngBytes[offset + 1] << 16) | 
                        (pngBytes[offset + 2] << 8) | pngBytes[offset + 3];
    const chunkType = String.fromCharCode(
      pngBytes[offset + 4], pngBytes[offset + 5], 
      pngBytes[offset + 6], pngBytes[offset + 7]
    );
    
    if (chunkType === 'IHDR') {
      imageWidth = (pngBytes[offset + 8] << 24) | (pngBytes[offset + 9] << 16) | 
                   (pngBytes[offset + 10] << 8) | pngBytes[offset + 11];
      imageHeight = (pngBytes[offset + 12] << 24) | (pngBytes[offset + 13] << 16) | 
                    (pngBytes[offset + 14] << 8) | pngBytes[offset + 15];
      colorType = pngBytes[offset + 17];
      const hasAlpha = colorType === 4 || colorType === 6;
      console.log('PNG dimensions:', imageWidth, 'x', imageHeight, 'colorType:', colorType, 'hasAlpha:', hasAlpha);
    } else if (chunkType === 'IDAT') {
      idatChunks.push(pngBytes.slice(offset + 8, offset + 8 + chunkLength));
    } else if (chunkType === 'IEND') {
      break;
    }
    
    offset += 12 + chunkLength;
  }
  
  const totalIdatLength = idatChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combinedIdat = new Uint8Array(totalIdatLength);
  let idatOffset = 0;
  for (const chunk of idatChunks) {
    combinedIdat.set(chunk, idatOffset);
    idatOffset += chunk.length;
  }

  const hasAlpha = colorType === 4 || colorType === 6;
  const colorSpace = hasAlpha ? '/DeviceRGB' : (colorType === 0 ? '/DeviceGray' : '/DeviceRGB');
  const hasQR = !!qrData;

  const contentStream = `q
${width} 0 0 ${height} 0 0 cm
/Img1 Do
Q
${hasQR ? qrData!.drawCommand : ""}${textObjects}`;
  const contentStreamLength = new TextEncoder().encode(contentStream).length;

  const xobjects = hasQR
    ? `/XObject << /Img1 9 0 R /QRImg 10 0 R >>`
    : `/XObject << /Img1 9 0 R >>`;

  const objects: string[] = [];
  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`);
  objects.push(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >> ${xobjects} >> >>\nendobj`);
  objects.push(`4 0 obj\n<< /Length ${contentStreamLength} >>\nstream\n${contentStream}\nendstream\nendobj`);
  objects.push(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`);
  objects.push(`6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);
  objects.push(`7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>\nendobj`);
  objects.push(`8 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique >>\nendobj`);
  objects.push(`9 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace ${colorSpace} /BitsPerComponent 8 /Filter /FlateDecode /Length ${combinedIdat.length} >>\nstream`);

  const headerText = `%PDF-1.4\n${objects.join('\n\n')}\n`;
  const headerBytes = new TextEncoder().encode(headerText);

  if (!hasQR) {
    const afterPng = new TextEncoder().encode(`\nendstream\nendobj\n\ntrailer\n<< /Size 10 /Root 1 0 R >>\nstartxref\n1000\n%%EOF`);
    const total = new Uint8Array(headerBytes.length + combinedIdat.length + afterPng.length);
    total.set(headerBytes, 0);
    total.set(combinedIdat, headerBytes.length);
    total.set(afterPng, headerBytes.length + combinedIdat.length);
    console.log('PDF with PNG image generated, total size:', total.length);
    return total;
  }

  // With QR
  const qrBytes = qrData!.imageBytes;
  const betweenStreams = new TextEncoder().encode(`\nendstream\nendobj\n\n10 0 obj\n${qrData!.pdfObjText}\nstream`);
  const afterQR = new TextEncoder().encode(`\nendstream\nendobj\n\ntrailer\n<< /Size 11 /Root 1 0 R >>\nstartxref\n1000\n%%EOF`);

  const total = new Uint8Array(headerBytes.length + combinedIdat.length + betweenStreams.length + qrBytes.length + afterQR.length);
  let off = 0;
  total.set(headerBytes, off); off += headerBytes.length;
  total.set(combinedIdat, off); off += combinedIdat.length;
  total.set(betweenStreams, off); off += betweenStreams.length;
  total.set(qrBytes, off); off += qrBytes.length;
  total.set(afterQR, off);
  console.log('PDF with PNG + QR image generated, total size:', total.length);
  return total;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating certificate for user:', user.id);

    const body = await req.json();
    const { courseId, regenerate } = body;

    if (!courseId) {
      return new Response(
        JSON.stringify({ error: 'Course ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('payment_status', 'completed')
      .single();

    if (enrollmentError || !enrollment) {
      return new Response(
        JSON.stringify({ error: 'You must complete enrollment to receive a certificate' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if certificate already exists
    const { data: existingCert } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    // If cert exists and not regenerating, return existing
    if (existingCert && !regenerate) {
      return new Response(
        JSON.stringify({ success: true, certificate: existingCert, message: 'Certificate already issued' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('title, school, instructor_name')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return new Response(
        JSON.stringify({ error: 'Course not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch certificate template
    const { data: templates } = await supabase
      .from('certificate_templates')
      .select('*')
      .or(`course_id.eq.${courseId},is_default.eq.true`)
      .order('course_id', { ascending: false, nullsFirst: false });
    
    const template = templates?.find(t => t.course_id === courseId) || templates?.find(t => t.is_default) || null;
    
    console.log('Using template:', template?.name || 'Default built-in', 'Background:', template?.background_url || 'none');

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const studentName = profile?.full_name || user.email?.split('@')[0] || 'Student';

    // Reuse existing cert number when regenerating so the verification URL stays valid
    const certificateNumber = existingCert?.certificate_number || generateCertificateNumber();

    const issueDate = existingCert
      ? new Date(existingCert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Build verification URL (points to the public verify page)
    const appUrl = supabaseUrl.includes('supabase.co')
      ? 'https://skilllafrica.lovable.app'
      : 'http://localhost:8080';
    const verificationUrl = `${appUrl}/certificate/verify/${certificateNumber}`;

    console.log('Generating PDF for:', studentName, course.title, 'verify:', verificationUrl, 'regenerate:', !!regenerate);

    const pdfBytes = await generateCertificatePDFWithBackground(
      studentName,
      course.title,
      course.school,
      certificateNumber,
      issueDate,
      course.instructor_name || "Course Instructor",
      verificationUrl,
      template ? {
        placeholders: template.placeholders as Placeholder[],
        width: template.width,
        height: template.height,
        background_url: template.background_url,
      } : undefined
    );

    // Upload PDF to storage (upsert so regeneration overwrites the old file)
    const fileName = `${user.id}/${certificateNumber}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
    }

    const { data: urlData } = supabase.storage
      .from('certificates')
      .getPublicUrl(fileName);

    const pdfUrl = urlData?.publicUrl || null;

    let certificate;
    let certError;

    if (existingCert && regenerate) {
      // Update existing certificate record with new pdf_url
      const result = await supabase
        .from('certificates')
        .update({ pdf_url: pdfUrl })
        .eq('id', existingCert.id)
        .select()
        .single();
      certificate = result.data;
      certError = result.error;
    } else {
      // Insert new certificate record
      const result = await supabase
        .from('certificates')
        .insert({
          user_id: user.id,
          course_id: courseId,
          certificate_number: certificateNumber,
          pdf_url: pdfUrl,
          issued_at: new Date().toISOString()
        })
        .select()
        .single();
      certificate = result.data;
      certError = result.error;
    }

    if (certError) {
      return new Response(
        JSON.stringify({ error: 'Failed to create certificate record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Certificate processed successfully:', certificate.certificate_number);

    return new Response(
      JSON.stringify({ success: true, certificate, pdfUrl, message: regenerate ? 'Certificate regenerated successfully' : 'Certificate generated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Certificate generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
