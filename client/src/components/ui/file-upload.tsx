import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface FileUploadProps {
  onFileUploaded: (fileData: { url: string; filename: string; size: number }) => void;
  className?: string;
}

export function FileUpload({ onFileUploaded, className }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; filename: string; size: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, HEIC)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await apiRequest('POST', '/api/upload', formData);
      const data = await response.json();

      const fileData = {
        url: data.url,
        filename: data.filename,
        size: data.size,
      };

      setUploadedFile(fileData);
      onFileUploaded(fileData);

      toast({
        title: "Upload successful",
        description: "Your photo has been uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    } else {
      toast({
        title: "No file selected",
        description: "Please select an image file to upload",
        variant: "destructive",
      });
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (uploadedFile) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <img 
                src={uploadedFile.url} 
                alt="Uploaded file preview" 
                className="w-24 h-24 rounded-lg object-cover"
              />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{uploadedFile.filename}</h3>
              <p className="text-sm text-gray-500">{formatFileSize(uploadedFile.size)}</p>
              <div className="mt-2 flex items-center space-x-2">
                <div className="flex items-center text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span>Upload successful</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
          isDragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-gray-300 hover:border-primary'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
            <p className="text-xl font-medium text-gray-700 mb-2">Uploading...</p>
            <p className="text-gray-500">Please wait while we process your image</p>
          </div>
        ) : (
          <div>
            <div className="mx-auto w-16 h-16 text-gray-400 mb-4">
              <Upload className="w-full h-full" />
            </div>
            <div className="mb-4">
              <p className="text-xl font-medium text-gray-700 mb-2">Drop your photo here</p>
              <p className="text-gray-500">or click to browse your files</p>
            </div>
            <div className="text-sm text-gray-400">
              <p>Supports: JPG, PNG, HEIC up to 10MB</p>
            </div>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileInputChange}
        />
      </div>
    </div>
  );
}
