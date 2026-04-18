"use client";

import * as React from "react";
import { Upload, FileIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  onFilesSelected: (files: File[]) => void;
  className?: string;
  hint?: string;
}

export function FileUploader({
  accept,
  multiple = true,
  maxSizeMB = 50,
  onFilesSelected,
  className,
  hint,
}: FileUploaderProps) {
  const [isDragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    setError(null);
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const maxBytes = maxSizeMB * 1024 * 1024;
    const oversize = files.find((f) => f.size > maxBytes);
    if (oversize) {
      setError(
        `${oversize.name} exceeds the ${maxSizeMB}MB limit.`,
      );
      return;
    }
    onFilesSelected(files);
  };

  return (
    <div className={className}>
      <label
        htmlFor={inputRef.current?.id}
        onClick={(e) => {
          e.preventDefault();
          inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-input hover:border-primary/60",
        )}
      >
        <div className="rounded-full bg-muted p-2.5 text-muted-foreground">
          <Upload className="h-4 w-4" />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            Drop files here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            {hint ?? `Max ${maxSizeMB}MB per file`}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </label>
      {error ? (
        <p className="mt-2 text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

export function FileChip({
  file,
  onRemove,
}: {
  file: { name: string; size?: number };
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
      <FileIcon className="h-4 w-4 text-muted-foreground" />
      <span className="truncate">{file.name}</span>
      {file.size != null ? (
        <span className="ml-auto text-xs text-muted-foreground">
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </span>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Remove"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
