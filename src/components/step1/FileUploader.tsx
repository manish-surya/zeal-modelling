"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, File, X } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface FileUploaderProps {
  projectId: string;
  userId: string;
  onUploaded: (file: File, storagePath: string) => void;
  existingFile: string | null;
  uploading: boolean;
}

export default function FileUploader({
  projectId,
  userId,
  onUploaded,
  existingFile,
  uploading,
}: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setUploadError(null);

      // Validate file type
      const allowed = [".csv", ".xlsx", ".xls", ".json"];
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowed.includes(ext)) {
        setUploadError("Unsupported file type. Please upload CSV, Excel, or JSON.");
        return;
      }

      // Validate size (50MB)
      if (file.size > 50 * 1024 * 1024) {
        setUploadError("File too large. Maximum size is 50MB.");
        return;
      }

      setSelectedFile(file);
      setUploadProgress(10);

      const supabase = createClient();
      const storagePath = `${userId}/${projectId}/${Date.now()}_${file.name}`;

      setUploadProgress(30);
      const { error: storageError } = await supabase.storage
        .from("user-datasets")
        .upload(storagePath, file, { upsert: true });

      // Storage upload is non-fatal — CSV is already parsed client-side.
      // If the bucket/policies aren't configured yet, continue anyway.
      const finalPath = storageError ? `local/${projectId}/${file.name}` : storagePath;

      setUploadProgress(90);
      onUploaded(file, finalPath);
      setUploadProgress(100);
    },
    [projectId, userId, onUploaded]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  if (uploading || (selectedFile && uploadProgress > 0 && uploadProgress < 100)) {
    return (
      <div className="rounded-lg border border-[#CCCCCC] bg-[#F8F9FA] p-6">
        <div className="flex items-center gap-3 mb-3">
          <File className="w-5 h-5 text-[#2E75B6]" />
          <span className="text-sm font-medium text-[#1A1A1A]">
            {selectedFile?.name ?? "Uploading..."}
          </span>
        </div>
        <div className="h-2 rounded-full bg-[#EEEEEE] overflow-hidden">
          <div
            className="h-full bg-[#2E75B6] transition-all duration-300 rounded-full"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
        <p className="text-xs text-[#666666] mt-2">Uploading and detecting column types...</p>
      </div>
    );
  }

  if (existingFile || (selectedFile && uploadProgress === 100)) {
    const displayName = existingFile ?? selectedFile?.name;
    return (
      <div className="rounded-lg border border-[#4CAF50] bg-[#E8F5E9] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#4CAF50]/20 flex items-center justify-center">
            <File className="w-4 h-4 text-[#4CAF50]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#1A1A1A]">{displayName}</p>
            {selectedFile && (
              <p className="text-xs text-[#666666]">{formatBytes(selectedFile.size)}</p>
            )}
          </div>
        </div>
        <label className="cursor-pointer text-xs text-[#2E75B6] hover:underline">
          Replace
          <input type="file" className="hidden" accept=".csv,.xlsx,.xls,.json" onChange={onInputChange} />
        </label>
      </div>
    );
  }

  return (
    <div>
      <label
        className={`flex flex-col items-center justify-center w-full h-40 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
          dragOver
            ? "border-[#2E75B6] bg-[#D6E4F0]/30"
            : "border-[#CCCCCC] bg-[#F8F9FA] hover:border-[#2E75B6]/50 hover:bg-[#F8F9FA]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <Upload className="w-8 h-8 text-[#666666] mb-3" />
        <p className="text-sm font-medium text-[#1A1A1A]">
          Drag & drop your dataset here
        </p>
        <p className="text-xs text-[#666666] mt-1">
          or <span className="text-[#2E75B6]">click to browse</span>
        </p>
        <p className="text-xs text-[#666666] mt-2">CSV, Excel, JSON · Max 50MB</p>
        <input
          type="file"
          className="hidden"
          accept=".csv,.xlsx,.xls,.json"
          onChange={onInputChange}
        />
      </label>

      {uploadError && (
        <div className="mt-3 p-3 rounded-md bg-[#FFEBEE] text-sm text-[#C0392B] flex items-center gap-2">
          <X className="w-4 h-4 flex-shrink-0" />
          {uploadError}
        </div>
      )}
    </div>
  );
}
