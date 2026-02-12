import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UseFileUploadOptions {
  bucket: string;
  folder?: string;
  maxSize?: number; // in MB
  allowedTypes?: string[];
}

export const useFileUpload = (options: UseFileUploadOptions) => {
  const { bucket, folder = "", maxSize = 10, allowedTypes } = options;
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const upload = async (file: File): Promise<string | null> => {
    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${maxSize}MB`,
        variant: "destructive",
      });
      return null;
    }

    // Validate file type if specified
    if (allowedTypes && allowedTypes.length > 0) {
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      const mimeType = file.type;
      const isAllowed = allowedTypes.some(
        (type) =>
          type === mimeType ||
          type === `.${fileExtension}` ||
          type === fileExtension
      );
      if (!isAllowed) {
        toast({
          title: "Invalid file type",
          description: `Allowed types: ${allowedTypes.join(", ")}`,
          variant: "destructive",
        });
        return null;
      }
    }

    setUploading(true);
    setProgress(0);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 9);
      const fileName = `${timestamp}-${randomId}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setProgress(100);
      toast({
        title: "Upload successful",
        description: "File has been uploaded successfully",
      });

      return urlData.publicUrl;
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileUrl: string): Promise<boolean> => {
    try {
      // Extract file path from URL
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split(`/storage/v1/object/public/${bucket}/`);
      if (pathParts.length < 2) {
        throw new Error("Invalid file URL");
      }
      const filePath = decodeURIComponent(pathParts[1]);

      const { error } = await supabase.storage.from(bucket).remove([filePath]);

      if (error) {
        throw error;
      }

      return true;
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    upload,
    deleteFile,
    uploading,
    progress,
  };
};
