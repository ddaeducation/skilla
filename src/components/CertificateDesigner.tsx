import { useState, useRef, useEffect } from "react";
import { useDraggable, DndContext, DragEndEvent } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Type, Save, Trash2, Eye, Plus, GripVertical, Loader2, Star, AlignLeft, AlignCenter, AlignRight, GripHorizontal } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Placeholder {
  id: string;
  type: "student_name" | "course_name" | "date" | "certificate_id" | "instructor_name" | "school_name" | "custom";
  label: string;
  x: number;
  y: number;
  width?: number; // Width of placeholder (optional, defaults to auto)
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textAlign: "left" | "center" | "right";
  color: string;
  customText?: string;
}

interface CertificateTemplate {
  id?: string;
  course_id?: string;
  name: string;
  background_url: string | null;
  placeholders: Placeholder[];
  width: number;
  height: number;
  is_default?: boolean;
}

interface CertificateDesignerProps {
  courseId?: string;
  existingTemplate?: CertificateTemplate;
  onSave?: (template: CertificateTemplate) => void;
  onClose?: () => void;
}

const placeholderTypes = [
  { value: "student_name", label: "Student Name", preview: "[Student Name]" },
  { value: "course_name", label: "Course Name", preview: "[Course Name]" },
  { value: "date", label: "Issue Date", preview: "[Issue Date]" },
  { value: "certificate_id", label: "Certificate ID", preview: "[Certificate ID]" },
  { value: "instructor_name", label: "Instructor Name", preview: "[Instructor Name]" },
  { value: "school_name", label: "School Name", preview: "[School Name]" },
  { value: "custom", label: "Custom Text", preview: "Custom Text" },
];

const DraggablePlaceholder = ({ 
  placeholder, 
  isSelected, 
  onClick,
  scale,
  onResize
}: { 
  placeholder: Placeholder; 
  isSelected: boolean;
  onClick: () => void;
  scale: number;
  onResize: (id: string, deltaWidth: number, direction: 'left' | 'right') => void;
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: placeholder.id,
  });
  
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<'left' | 'right' | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const handleResizeStart = (e: React.MouseEvent, direction: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeDirection(direction);
    startXRef.current = e.clientX;
    startWidthRef.current = placeholder.width || 150;
  };

  useEffect(() => {
    if (!isResizing || !resizeDirection) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current;
      const deltaWidth = resizeDirection === 'right' ? deltaX / scale : -deltaX / scale;
      onResize(placeholder.id, deltaWidth, resizeDirection);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeDirection, placeholder.id, onResize, scale]);

  const placeholderWidth = placeholder.width || 150;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: placeholder.x * scale,
    top: placeholder.y * scale,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    cursor: isResizing ? (resizeDirection === 'left' ? 'w-resize' : 'e-resize') : 'move',
    fontSize: placeholder.fontSize * scale,
    fontWeight: placeholder.fontWeight,
    fontStyle: placeholder.fontStyle || 'normal',
    textAlign: placeholder.textAlign || 'center',
    color: placeholder.color,
    border: isSelected ? '2px dashed hsl(var(--primary))' : '1px dashed hsl(var(--border))',
    padding: `${4 * scale}px ${8 * scale}px`,
    backgroundColor: 'hsl(var(--background) / 0.9)',
    borderRadius: 4,
    userSelect: 'none',
    zIndex: isSelected ? 10 : 1,
    width: placeholderWidth * scale,
    minWidth: 80 * scale,
  };

  const previewText = placeholder.type === "custom" 
    ? placeholder.customText || "Custom Text"
    : placeholderTypes.find(p => p.value === placeholder.type)?.preview || placeholder.label;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Left resize handle */}
      {isSelected && (
        <div
          className="absolute left-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-w-resize hover:bg-primary/20 rounded-l"
          style={{ transform: 'translateX(-100%)' }}
          onMouseDown={(e) => handleResizeStart(e, 'left')}
        >
          <GripHorizontal className="w-3 h-3 text-primary rotate-90" />
        </div>
      )}
      
      {/* Main content - draggable */}
      <div 
        className="flex items-center justify-center gap-1 w-full overflow-hidden"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="w-3 h-3 opacity-50 flex-shrink-0" />
        <span className="truncate">{previewText}</span>
      </div>
      
      {/* Right resize handle */}
      {isSelected && (
        <div
          className="absolute right-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-e-resize hover:bg-primary/20 rounded-r"
          style={{ transform: 'translateX(100%)' }}
          onMouseDown={(e) => handleResizeStart(e, 'right')}
        >
          <GripHorizontal className="w-3 h-3 text-primary rotate-90" />
        </div>
      )}
    </div>
  );
};

interface Course {
  id: string;
  title: string;
}

const CertificateDesigner = ({ courseId, existingTemplate, onSave, onClose }: CertificateDesignerProps) => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  
  const [template, setTemplate] = useState<CertificateTemplate>({
    name: existingTemplate?.name || "Default Template",
    background_url: existingTemplate?.background_url || null,
    placeholders: existingTemplate?.placeholders || [],
    width: existingTemplate?.width || 842,
    height: existingTemplate?.height || 595,
    course_id: courseId || existingTemplate?.course_id,
    is_default: existingTemplate?.is_default || false,
    ...existingTemplate,
  });
  
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Fetch courses for dropdown
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id, title')
          .order('title');
        
        if (error) throw error;
        setCourses(data || []);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoadingCourses(false);
      }
    };
    
    fetchCourses();
  }, []);

  // Calculate scale for responsive canvas
  const scale = canvasSize.width > 0 ? canvasSize.width / template.width : 1;

  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        const containerWidth = canvasRef.current.parentElement?.clientWidth || 800;
        const maxWidth = Math.min(containerWidth - 32, 800);
        const aspectRatio = template.height / template.width;
        setCanvasSize({
          width: maxWidth,
          height: maxWidth * aspectRatio,
        });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [template.width, template.height]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    
    setTemplate(prev => ({
      ...prev,
      placeholders: prev.placeholders.map(p => 
        p.id === active.id 
          ? { 
              ...p, 
              x: Math.max(0, Math.min(p.x + delta.x / scale, template.width - 100)),
              y: Math.max(0, Math.min(p.y + delta.y / scale, template.height - 30))
            }
          : p
      ),
    }));
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check for valid image types (PNG or JPEG recommended)
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPEG or PNG recommended)",
        variant: "destructive",
      });
      return;
    }

    // Warn if not PNG or JPEG
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Format Note",
        description: "For best results in PDF certificates, use JPEG or PNG format.",
      });
    }

    // Recommend JPEG for optimal PDF embedding
    const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg';
    if (!isJpeg) {
      console.log('PNG format uploaded - will be embedded in PDF with FlateDecode');
    } else {
      console.log('JPEG format uploaded - optimal for PDF embedding with DCTDecode');
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `certificate-bg-${Date.now()}.${fileExt}`;
      const filePath = `certificate-templates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-materials')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('course-materials')
        .getPublicUrl(filePath);

      setTemplate(prev => ({ ...prev, background_url: urlData.publicUrl }));
      
      toast({
        title: "Background uploaded",
        description: isJpeg 
          ? "JPEG background uploaded - optimal for PDF certificates" 
          : "PNG background uploaded - will be embedded in PDF",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload background image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const addPlaceholder = (type: Placeholder["type"]) => {
    // Set default width based on placeholder type
    const defaultWidths: Record<string, number> = {
      student_name: 300,
      course_name: 400,
      date: 200,
      certificate_id: 250,
      instructor_name: 250,
      school_name: 300,
      custom: 200,
    };

    const newPlaceholder: Placeholder = {
      id: `placeholder-${Date.now()}`,
      type,
      label: placeholderTypes.find(p => p.value === type)?.label || "Custom",
      x: template.width / 2 - (defaultWidths[type] || 150) / 2,
      y: template.height / 2,
      width: defaultWidths[type] || 150,
      fontSize: 24,
      fontWeight: type === "student_name" || type === "course_name" ? "bold" : "normal",
      fontStyle: "normal",
      textAlign: "center",
      color: "#1a1a1a",
      customText: type === "custom" ? "Custom Text" : undefined,
    };

    setTemplate(prev => ({
      ...prev,
      placeholders: [...prev.placeholders, newPlaceholder],
    }));
    setSelectedPlaceholder(newPlaceholder.id);
  };

  const handlePlaceholderResize = (id: string, deltaWidth: number, direction: 'left' | 'right') => {
    setTemplate(prev => ({
      ...prev,
      placeholders: prev.placeholders.map(p => {
        if (p.id !== id) return p;
        
        const currentWidth = p.width || 150;
        const newWidth = Math.max(80, Math.min(currentWidth + deltaWidth, template.width - 20));
        
        // If resizing from the left, also adjust x position
        if (direction === 'left') {
          const widthDiff = currentWidth - newWidth;
          return { 
            ...p, 
            width: newWidth,
            x: Math.max(0, p.x + widthDiff)
          };
        }
        
        return { ...p, width: newWidth };
      }),
    }));
  };

  const updatePlaceholder = (id: string, updates: Partial<Placeholder>) => {
    setTemplate(prev => ({
      ...prev,
      placeholders: prev.placeholders.map(p => 
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
  };

  const deletePlaceholder = (id: string) => {
    setTemplate(prev => ({
      ...prev,
      placeholders: prev.placeholders.filter(p => p.id !== id),
    }));
    setSelectedPlaceholder(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // If setting as default, first unset any existing default templates
      if (template.is_default) {
        await supabase
          .from('certificate_templates')
          .update({ is_default: false })
          .eq('is_default', true);
      }

      const templateData = {
        course_id: template.course_id || null,
        name: template.name,
        background_url: template.background_url,
        placeholders: JSON.parse(JSON.stringify(template.placeholders)),
        width: template.width,
        height: template.height,
        is_default: template.is_default || false,
      };

      if (existingTemplate?.id) {
        const { error } = await supabase
          .from('certificate_templates')
          .update(templateData)
          .eq('id', existingTemplate.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('certificate_templates')
          .insert([templateData]);
        
        if (error) throw error;
      }

      toast({
        title: "Template saved",
        description: template.is_default 
          ? "Certificate template has been saved as the default template" 
          : "Certificate template has been saved successfully",
      });

      onSave?.(template);
      onClose?.();
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Save failed",
        description: "Failed to save certificate template",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedPlaceholderData = template.placeholders.find(p => p.id === selectedPlaceholder);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Canvas Area */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Input
              value={template.name}
              onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
              className="font-semibold w-48"
              placeholder="Template Name"
            />
            <Select
              value={template.course_id || "all"}
              onValueChange={(value) => setTemplate(prev => ({ 
                ...prev, 
                course_id: value === "all" ? undefined : value 
              }))}
              disabled={loadingCourses}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Assign to course..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses (Global)</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-background">
              <Switch
                id="is-default"
                checked={template.is_default || false}
                onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, is_default: checked }))}
              />
              <Label htmlFor="is-default" className="flex items-center gap-1.5 cursor-pointer text-sm">
                <Star className={`w-4 h-4 ${template.is_default ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
                Default
              </Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save Template
            </Button>
          </div>
        </div>

        <DndContext onDragEnd={handleDragEnd}>
          <div
            ref={canvasRef}
            className="relative border-2 border-dashed border-border rounded-lg overflow-hidden bg-muted"
            style={{ 
              width: canvasSize.width || '100%', 
              height: canvasSize.height || 400,
              backgroundImage: template.background_url ? `url(${template.background_url})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            onClick={() => setSelectedPlaceholder(null)}
          >
            {!template.background_url && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Upload a background image</p>
                </div>
              </div>
            )}
            
            {template.placeholders.map((placeholder) => (
              <DraggablePlaceholder
                key={placeholder.id}
                placeholder={placeholder}
                isSelected={selectedPlaceholder === placeholder.id}
                onClick={() => setSelectedPlaceholder(placeholder.id)}
                scale={scale}
                onResize={handlePlaceholderResize}
              />
            ))}
          </div>
        </DndContext>

        <div className="flex gap-4 flex-wrap items-start">
          <div className="space-y-1">
            <Label htmlFor="bg-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>Upload Background</span>
              </div>
            </Label>
            <p className="text-xs text-muted-foreground pl-1">JPEG or PNG (JPEG recommended for best PDF quality)</p>
            <input
              id="bg-upload"
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              className="hidden"
              onChange={handleBackgroundUpload}
              disabled={uploading}
            />
          </div>
          
          {template.background_url && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setTemplate(prev => ({ ...prev, background_url: null }))}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Remove Background
              </Button>
              {template.background_url.toLowerCase().endsWith('.png') && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">PNG</span>
              )}
              {(template.background_url.toLowerCase().endsWith('.jpg') || template.background_url.toLowerCase().endsWith('.jpeg')) && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded dark:bg-green-900/20">JPEG ✓</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar - Placeholders */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Placeholder
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {placeholderTypes.map((type) => (
              <Button
                key={type.value}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => addPlaceholder(type.value as Placeholder["type"])}
              >
                <Type className="w-4 h-4 mr-2" />
                {type.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        {selectedPlaceholderData && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Edit Placeholder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedPlaceholderData.type === "custom" && (
                <div>
                  <Label>Custom Text</Label>
                  <Input
                    value={selectedPlaceholderData.customText || ""}
                    onChange={(e) => updatePlaceholder(selectedPlaceholderData.id, { customText: e.target.value })}
                    placeholder="Enter custom text"
                  />
                </div>
              )}
              
              <div>
                <Label>Font Size</Label>
                <Input
                  type="number"
                  value={selectedPlaceholderData.fontSize}
                  onChange={(e) => updatePlaceholder(selectedPlaceholderData.id, { fontSize: parseInt(e.target.value) || 16 })}
                  min={8}
                  max={72}
                />
              </div>
              
              <div>
                <Label>Font Weight</Label>
                <Select
                  value={selectedPlaceholderData.fontWeight}
                  onValueChange={(value) => updatePlaceholder(selectedPlaceholderData.id, { fontWeight: value as "normal" | "bold" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="bold">Bold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Font Style</Label>
                <Select
                  value={selectedPlaceholderData.fontStyle || "normal"}
                  onValueChange={(value) => updatePlaceholder(selectedPlaceholderData.id, { fontStyle: value as "normal" | "italic" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="italic">Italic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Text Alignment (inside placeholder)</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant={(selectedPlaceholderData.textAlign || "center") === "left" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => updatePlaceholder(selectedPlaceholderData.id, { textAlign: "left" })}
                  >
                    <AlignLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={(selectedPlaceholderData.textAlign || "center") === "center" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => updatePlaceholder(selectedPlaceholderData.id, { textAlign: "center" })}
                  >
                    <AlignCenter className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant={(selectedPlaceholderData.textAlign || "center") === "right" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => updatePlaceholder(selectedPlaceholderData.id, { textAlign: "right" })}
                  >
                    <AlignRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Center on Certificate</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      const placeholderWidth = selectedPlaceholderData.width || 150;
                      const centeredX = (template.width - placeholderWidth) / 2;
                      updatePlaceholder(selectedPlaceholderData.id, { x: centeredX });
                    }}
                  >
                    <AlignCenter className="w-4 h-4 mr-1" />
                    Center Horizontally
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Centers the placeholder in the middle of the certificate
                </p>
              </div>
              
              <div>
                <Label>Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={selectedPlaceholderData.color}
                    onChange={(e) => updatePlaceholder(selectedPlaceholderData.id, { color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <Input
                    value={selectedPlaceholderData.color}
                    onChange={(e) => updatePlaceholder(selectedPlaceholderData.id, { color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label>Width</Label>
                <Input
                  type="number"
                  value={Math.round(selectedPlaceholderData.width || 150)}
                  onChange={(e) => updatePlaceholder(selectedPlaceholderData.id, { width: parseInt(e.target.value) || 150 })}
                  min={80}
                  max={template.width}
                />
                <p className="text-xs text-muted-foreground mt-1">Drag edges to resize horizontally</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>X Position</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedPlaceholderData.x)}
                    onChange={(e) => updatePlaceholder(selectedPlaceholderData.id, { x: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={template.width}
                  />
                </div>
                <div>
                  <Label>Y Position</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedPlaceholderData.y)}
                    onChange={(e) => updatePlaceholder(selectedPlaceholderData.id, { y: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={template.height}
                  />
                </div>
              </div>
              
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => deletePlaceholder(selectedPlaceholderData.id)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete Placeholder
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Current Placeholders</CardTitle>
          </CardHeader>
          <CardContent>
            {template.placeholders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No placeholders added yet</p>
            ) : (
              <div className="space-y-1">
                {template.placeholders.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                      selectedPlaceholder === p.id ? 'bg-primary/10' : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedPlaceholder(p.id)}
                  >
                    <span className="text-sm">{p.label}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePlaceholder(p.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
          </DialogHeader>
          <div
            className="relative border rounded-lg overflow-hidden mx-auto"
            style={{ 
              width: '100%',
              aspectRatio: `${template.width} / ${template.height}`,
              backgroundImage: template.background_url ? `url(${template.background_url})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: template.background_url ? undefined : 'hsl(var(--muted))',
            }}
          >
            {template.placeholders.map((placeholder) => {
              const previewText = placeholder.type === "custom" 
                ? placeholder.customText || "Custom Text"
                : placeholderTypes.find(p => p.value === placeholder.type)?.preview || placeholder.label;
              
              return (
                <div
                  key={placeholder.id}
                  style={{
                    position: 'absolute',
                    left: `${(placeholder.x / template.width) * 100}%`,
                    top: `${(placeholder.y / template.height) * 100}%`,
                    width: placeholder.width ? `${(placeholder.width / template.width) * 100}%` : 'auto',
                    fontSize: `${(placeholder.fontSize / template.width) * 100}vw`,
                    fontWeight: placeholder.fontWeight,
                    fontStyle: placeholder.fontStyle || 'normal',
                    textAlign: placeholder.textAlign || 'center',
                    color: placeholder.color,
                    minWidth: '10%',
                  }}
                >
                  {previewText}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CertificateDesigner;
