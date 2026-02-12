import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText, Image, Video, Loader2 } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";

interface FileUploadProps {
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  folder?: string;
  label?: string;
  placeholder?: string;
}

export const FileUpload = ({
  value,
  onChange,
  accept = ".pdf,.jpg,.jpeg,.png,.gif,.mp4,.webm",
  folder = "lessons",
  label = "File",
  placeholder = "Upload a file or enter URL",
}: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [useUrl, setUseUrl] = useState(!!value && !value.includes("course-materials"));
  
  const { upload, uploading } = useFileUpload({
    bucket: "course-materials",
    folder,
    maxSize: 50,
    allowedTypes: accept.split(",").map((t) => t.trim()),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await upload(file);
    if (url) {
      onChange(url);
      setUseUrl(false);
    }
  };

  const getFileIcon = () => {
    if (!value) return <Upload className="h-4 w-4" />;
    if (value.match(/\.(pdf)$/i)) return <FileText className="h-4 w-4" />;
    if (value.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return <Image className="h-4 w-4" />;
    if (value.match(/\.(mp4|webm|mov)$/i)) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getFileName = (url: string) => {
    try {
      const parts = url.split("/");
      const fileName = parts[parts.length - 1];
      // Remove timestamp prefix if present
      const cleanName = fileName.replace(/^\d+-[a-z0-9]+-/, "");
      return decodeURIComponent(cleanName);
    } catch {
      return "Uploaded file";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs h-6"
          onClick={() => setUseUrl(!useUrl)}
        >
          {useUrl ? "Upload file instead" : "Use URL instead"}
        </Button>
      </div>

      {useUrl ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />

          {value && !useUrl ? (
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
              {getFileIcon()}
              <span className="flex-1 truncate text-sm">{getFileName(value)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onChange("")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Choose file
                </>
              )}
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Max size: 50MB. Supported: PDF, images, videos
          </p>
        </div>
      )}
    </div>
  );
};
