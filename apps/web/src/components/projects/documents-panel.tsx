"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Image as ImageIcon,
  Video,
  ShieldCheck,
  Download,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploader, FileChip } from "@/components/common/file-uploader";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { useToast } from "@/hooks/use-toast";
import { projectsApi } from "@/lib/projects-api";
import { extractApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { ProjectDocument } from "@realestate/shared";

const CATEGORY_ICONS: Record<ProjectDocument["fileType"], typeof FileText> = {
  brochure: FileText,
  layout: ImageIcon,
  legal: ShieldCheck,
  media: Video,
};

const CATEGORY_LABEL: Record<ProjectDocument["fileType"], string> = {
  brochure: "Brochure",
  layout: "Layout",
  legal: "Legal",
  media: "Media",
};

interface DocumentsPanelProps {
  projectId: string;
  documents: ProjectDocument[];
}

export function DocumentsPanel({ projectId, documents }: DocumentsPanelProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [category, setCategory] =
    useState<ProjectDocument["fileType"]>("brochure");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectDocument | null>(
    null,
  );

  const uploadMut = useMutation({
    mutationFn: (file: File) =>
      projectsApi.uploadDocument(projectId, {
        fileName: file.name,
        fileType: category,
        fileSize: file.size,
        mimeType: file.type,
      }),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.show({
        title: "Document uploaded",
        description: doc.fileName,
        variant: "success",
      });
      setPendingFile(null);
    },
    onError: (err) => {
      toast.show({
        title: "Upload failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (documentId: string) => projectsApi.deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.show({
        title: "Document deleted",
        variant: "success",
      });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.show({
        title: "Delete failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  const grouped = groupBy(documents, (d) => d.fileType);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Upload document</h2>
            <p className="text-sm text-muted-foreground">
              PDF, image, and video files up to 50MB.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Category</span>
            <Select
              value={category}
              onValueChange={(v) =>
                setCategory(v as ProjectDocument["fileType"])
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brochure">Brochure</SelectItem>
                <SelectItem value="layout">Layout</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="media">Media</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <FileUploader
            accept=".pdf,image/*,video/*"
            multiple={false}
            maxSizeMB={50}
            hint="PDF, JPG, PNG, MP4 — max 50MB"
            onFilesSelected={(files) => {
              const file = files[0];
              if (file) setPendingFile(file);
            }}
          />
          {pendingFile ? (
            <div className="flex items-center gap-2">
              <FileChip
                file={pendingFile}
                onRemove={() => setPendingFile(null)}
              />
              <Button
                size="sm"
                disabled={uploadMut.isPending}
                onClick={() => uploadMut.mutate(pendingFile)}
              >
                {uploadMut.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : null}
                Upload as {CATEGORY_LABEL[category].toLowerCase()}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload brochures, master layouts, approvals, and media so your sales team can share them with leads."
        />
      ) : (
        <div className="space-y-6">
          {(Object.keys(grouped) as ProjectDocument["fileType"][]).map(
            (cat) => {
              const Icon = CATEGORY_ICONS[cat];
              return (
                <section key={cat}>
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">
                      {CATEGORY_LABEL[cat]}
                    </h3>
                    <Badge variant="secondary">{grouped[cat]!.length}</Badge>
                  </div>
                  <ul className="grid gap-2 md:grid-cols-2">
                    {grouped[cat]!.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {d.fileName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(d.fileSize / 1024 / 1024).toFixed(2)} MB ·{" "}
                            {formatDate(d.createdAt)} · v{d.version}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          aria-label="Open"
                        >
                          <a
                            href={d.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          aria-label="Download"
                        >
                          <a href={d.fileUrl} download={d.fileName}>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete"
                          onClick={() => setDeleteTarget(d)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            },
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this document?"
        description={deleteTarget?.fileName}
        confirmLabel="Delete"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() =>
          deleteTarget ? deleteMut.mutate(deleteTarget.id) : undefined
        }
      />
    </div>
  );
}

function groupBy<T, K extends string>(
  arr: T[],
  fn: (item: T) => K,
): Partial<Record<K, T[]>> {
  const out: Partial<Record<K, T[]>> = {};
  for (const item of arr) {
    const k = fn(item);
    if (!out[k]) out[k] = [];
    out[k]!.push(item);
  }
  return out;
}
