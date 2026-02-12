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
  type: "student_name" | "course_name" | "date" | "certificate_id" | "instructor_name" | "school_name" | "custom";
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
    
    // Determine format
    let format = 'jpeg';
    if (contentType.includes('png') || url.toLowerCase().endsWith('.png')) {
      format = 'png';
    } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      format = 'jpeg';
    }
    
    console.log('Image fetched successfully, format:', format, 'size:', bytes.length);
    
    return {
      data: bytes,
      width: 0, // Will use template dimensions
      height: 0,
      format
    };
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

// Generate PDF with background image support
async function generateCertificatePDFWithBackground(
  studentName: string,
  courseName: string,
  schoolName: string,
  certificateNumber: string,
  issueDate: string,
  instructorName: string,
  template?: { placeholders: Placeholder[]; width: number; height: number; background_url?: string | null }
): Promise<Uint8Array> {
  const width = template?.width || 842;
  const height = template?.height || 595;

  // Build text objects from placeholders if template exists
  let textObjects = "";
  
  if (template?.placeholders && template.placeholders.length > 0) {
    template.placeholders.forEach((placeholder) => {
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
      // PDF coordinates are bottom-left origin, convert from top-left
      const pdfY = height - placeholder.y - fontSize;
      
      // Determine font reference based on weight and style
      // F1: Helvetica-Bold, F2: Helvetica, F3: Helvetica-Oblique, F4: Helvetica-BoldOblique
      let fontRef = "/F2";
      if (placeholder.fontWeight === "bold" && placeholder.fontStyle === "italic") {
        fontRef = "/F4";
      } else if (placeholder.fontWeight === "bold") {
        fontRef = "/F1";
      } else if (placeholder.fontStyle === "italic") {
        fontRef = "/F3";
      }
      
      // Calculate text position based on alignment and width
      const placeholderWidth = placeholder.width || 150;
      const textAlign = placeholder.textAlign || "center";
      
      // Estimate text width (approximate: fontSize * 0.5 per character for Helvetica)
      const charWidthRatio = placeholder.fontWeight === "bold" ? 0.55 : 0.5;
      const estimatedTextWidth = text.length * fontSize * charWidthRatio;
      
      // Calculate X position based on alignment
      let pdfX = placeholder.x;
      if (textAlign === "center") {
        // Center the text within the placeholder width
        pdfX = placeholder.x + (placeholderWidth - estimatedTextWidth) / 2;
      } else if (textAlign === "right") {
        // Align text to the right edge of the placeholder
        pdfX = placeholder.x + placeholderWidth - estimatedTextWidth;
      }
      // For "left" alignment, use the original x position
      
      // Ensure pdfX doesn't go negative
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

  // Build PDF with or without background image
  if (imageData) {
    console.log('Generating PDF with background image, format:', imageData.format);
    return generatePDFWithImage(width, height, textObjects, imageData);
  } else {
    console.log('Generating PDF without background image');
    return generatePDFWithoutImage(width, height, textObjects);
  }
}

function generatePDFWithoutImage(width: number, height: number, textObjects: string): Uint8Array {
  const streamContent = textObjects;
  const streamLength = streamContent.length;

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

function generatePDFWithImage(
  width: number, 
  height: number, 
  textObjects: string, 
  imageData: { data: Uint8Array; format: string }
): Uint8Array {
  const imageBytes = imageData.data;
  const isPng = imageData.format === 'png';
  
  // For PNG, we need to extract raw image data from the PNG file
  // For JPEG, we can embed directly with DCTDecode
  if (isPng) {
    console.log('Processing PNG image for PDF embedding');
    return generatePDFWithPngImage(width, height, textObjects, imageBytes);
  } else {
    console.log('Processing JPEG image for PDF embedding');
    return generatePDFWithJpegImage(width, height, textObjects, imageBytes);
  }
}

function generatePDFWithJpegImage(
  width: number,
  height: number,
  textObjects: string,
  imageBytes: Uint8Array
): Uint8Array {
  const imageStreamLength = imageBytes.length;

  // Content stream: draw image full-page, then draw text on top
  const contentStream = `q
${width} 0 0 ${height} 0 0 cm
/Img1 Do
Q
${textObjects}`;
  const contentStreamLength = contentStream.length;

  // Build PDF structure with image XObject
  const objects: string[] = [];
  
  // Object 1: Catalog
  objects.push(`1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj`);

  // Object 2: Pages
  objects.push(`2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj`);

  // Object 3: Page
  objects.push(`3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >> /XObject << /Img1 9 0 R >> >> >>
endobj`);

  // Object 4: Content stream
  objects.push(`4 0 obj
<< /Length ${contentStreamLength} >>
stream
${contentStream}
endstream
endobj`);

  // Object 5: Bold font
  objects.push(`5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj`);

  // Object 6: Regular font
  objects.push(`6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj`);

  // Object 7: Oblique (italic) font
  objects.push(`7 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>
endobj`);

  // Object 8: Bold Oblique font
  objects.push(`8 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique >>
endobj`);

  // Object 9: Image XObject (JPEG)
  objects.push(`9 0 obj
<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageStreamLength} >>
stream`);

  // Build the PDF header and objects (text parts)
  const headerAndObjects = `%PDF-1.4
${objects.join('\n\n')}
`;

  // Convert to bytes
  const headerBytes = new TextEncoder().encode(headerAndObjects);
  
  // End of image stream and remaining objects
  const afterImageStream = `
endstream
endobj

xref
0 10
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000350 00000 n 
0000001500 00000 n 
0000001577 00000 n 
0000001654 00000 n 
0000001750 00000 n 
0000001850 00000 n 

trailer
<< /Size 10 /Root 1 0 R >>
startxref
${headerBytes.length + imageBytes.length + 50}
%%EOF`;
  
  const afterBytes = new TextEncoder().encode(afterImageStream);

  // Combine all parts
  const totalLength = headerBytes.length + imageBytes.length + afterBytes.length;
  const pdfBytes = new Uint8Array(totalLength);
  pdfBytes.set(headerBytes, 0);
  pdfBytes.set(imageBytes, headerBytes.length);
  pdfBytes.set(afterBytes, headerBytes.length + imageBytes.length);

  console.log('PDF with JPEG image generated, total size:', totalLength);
  return pdfBytes;
}

function generatePDFWithPngImage(
  width: number,
  height: number,
  textObjects: string,
  pngBytes: Uint8Array
): Uint8Array {
  // Parse PNG to extract IDAT chunks (compressed image data)
  // PNG structure: signature (8 bytes) + chunks
  // Each chunk: length (4) + type (4) + data (length) + CRC (4)
  
  let offset = 8; // Skip PNG signature
  let imageWidth = width;
  let imageHeight = height;
  const idatChunks: Uint8Array[] = [];
  let hasAlpha = false;
  let colorType = 2; // RGB
  
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
      hasAlpha = colorType === 4 || colorType === 6;
      console.log('PNG dimensions:', imageWidth, 'x', imageHeight, 'colorType:', colorType, 'hasAlpha:', hasAlpha);
    } else if (chunkType === 'IDAT') {
      idatChunks.push(pngBytes.slice(offset + 8, offset + 8 + chunkLength));
    } else if (chunkType === 'IEND') {
      break;
    }
    
    offset += 12 + chunkLength; // 4 (length) + 4 (type) + data + 4 (CRC)
  }
  
  // Combine all IDAT chunks
  const totalIdatLength = idatChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combinedIdat = new Uint8Array(totalIdatLength);
  let idatOffset = 0;
  for (const chunk of idatChunks) {
    combinedIdat.set(chunk, idatOffset);
    idatOffset += chunk.length;
  }
  
  console.log('Combined IDAT length:', totalIdatLength);
  
  // For PNG with alpha, we need to create a soft mask
  // For simplicity, embed as FlateDecode with PNG predictor
  const colorSpace = hasAlpha ? '/DeviceRGB' : '/DeviceRGB';
  const bitsPerComponent = 8;
  
  // Content stream: draw image full-page, then draw text on top
  const contentStream = `q
${width} 0 0 ${height} 0 0 cm
/Img1 Do
Q
${textObjects}`;
  const contentStreamLength = contentStream.length;

  // Build PDF with PNG image using FlateDecode and PNG predictor
  const objects: string[] = [];
  
  objects.push(`1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj`);

  objects.push(`2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj`);

  objects.push(`3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >> /XObject << /Img1 9 0 R >> >> >>
endobj`);

  objects.push(`4 0 obj
<< /Length ${contentStreamLength} >>
stream
${contentStream}
endstream
endobj`);

  objects.push(`5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj`);

  objects.push(`6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj`);

  objects.push(`7 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>
endobj`);

  objects.push(`8 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique >>
endobj`);

  // PNG image as XObject with FlateDecode and PNG predictor
  const colorsPerPixel = hasAlpha ? 4 : 3;
  objects.push(`9 0 obj
<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace ${colorSpace} /BitsPerComponent ${bitsPerComponent} /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors ${colorsPerPixel} /BitsPerComponent 8 /Columns ${imageWidth} >> /Length ${combinedIdat.length} >>
stream`);

  const headerAndObjects = `%PDF-1.4
${objects.join('\n\n')}
`;

  const headerBytes = new TextEncoder().encode(headerAndObjects);
  
  const afterImageStream = `
endstream
endobj

xref
0 10
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000350 00000 n 
0000001500 00000 n 
0000001577 00000 n 
0000001654 00000 n 
0000001750 00000 n 
0000001850 00000 n

trailer
<< /Size 10 /Root 1 0 R >>
startxref
${headerBytes.length + combinedIdat.length + 50}
%%EOF`;
  
  const afterBytes = new TextEncoder().encode(afterImageStream);

  const totalLength = headerBytes.length + combinedIdat.length + afterBytes.length;
  const pdfBytes = new Uint8Array(totalLength);
  pdfBytes.set(headerBytes, 0);
  pdfBytes.set(combinedIdat, headerBytes.length);
  pdfBytes.set(afterBytes, headerBytes.length + combinedIdat.length);

  console.log('PDF with PNG image generated, total size:', totalLength);
  return pdfBytes;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Failed to get user:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating certificate for user:', user.id);

    const { courseId } = await req.json();

    if (!courseId) {
      return new Response(
        JSON.stringify({ error: 'Course ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is enrolled with completed payment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('payment_status', 'completed')
      .single();

    if (enrollmentError || !enrollment) {
      console.error('Enrollment check failed:', enrollmentError);
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

    if (existingCert) {
      console.log('Certificate already exists:', existingCert.certificate_number);
      return new Response(
        JSON.stringify({ 
          success: true, 
          certificate: existingCert,
          message: 'Certificate already issued'
        }),
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
      console.error('Course fetch failed:', courseError);
      return new Response(
        JSON.stringify({ error: 'Course not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch certificate template for this course or default
    const { data: templates } = await supabase
      .from('certificate_templates')
      .select('*')
      .or(`course_id.eq.${courseId},is_default.eq.true`)
      .order('course_id', { ascending: false, nullsFirst: false });
    
    // Prefer course-specific template, fall back to default
    const template = templates?.find(t => t.course_id === courseId) || templates?.find(t => t.is_default) || null;
    
    console.log('Using template:', template?.name || 'Default built-in', 'Background:', template?.background_url || 'none');

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const studentName = profile?.full_name || user.email?.split('@')[0] || 'Student';
    const certificateNumber = generateCertificateNumber();
    const issueDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    console.log('Generating PDF for:', studentName, course.title);

    // Generate PDF content using template if available (with background image support)
    const pdfBytes = await generateCertificatePDFWithBackground(
      studentName,
      course.title,
      course.school,
      certificateNumber,
      issueDate,
      course.instructor_name || "Course Instructor",
      template ? {
        placeholders: template.placeholders as Placeholder[],
        width: template.width,
        height: template.height,
        background_url: template.background_url,
      } : undefined
    );

    // Upload PDF to storage
    const fileName = `${user.id}/${certificateNumber}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      // Continue without storage URL if upload fails
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('certificates')
      .getPublicUrl(fileName);

    const pdfUrl = urlData?.publicUrl || null;

    // Create certificate record
    const { data: certificate, error: certError } = await supabase
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

    if (certError) {
      console.error('Certificate creation error:', certError);
      return new Response(
        JSON.stringify({ error: 'Failed to create certificate record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Certificate created successfully:', certificate.certificate_number, 'PDF URL:', pdfUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        certificate,
        message: 'Certificate generated successfully'
      }),
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
