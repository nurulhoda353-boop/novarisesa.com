import {
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  File as FileIcon,
  Music,
  Presentation,
} from "lucide-react";
import type { ComponentType } from "react";

const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
  txt: "text/plain",
  csv: "text/csv",
  mp4: "video/mp4",
  mp3: "audio/mpeg",
};

export function guessContentType(filename: string): string {
  const ext = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";
  return EXTENSION_MIME[ext] ?? "application/octet-stream";
}

export function isImageContentType(contentType: string): boolean {
  return contentType.startsWith("image/");
}

export function attachmentIcon(contentType: string): ComponentType<{ size?: number }> {
  if (contentType.startsWith("image/")) return FileImage;
  if (contentType.startsWith("video/")) return FileVideo;
  if (contentType.startsWith("audio/")) return Music;
  if (contentType === "application/pdf") return FileText;
  if (contentType.includes("word")) return FileText;
  if (contentType.includes("sheet") || contentType.includes("excel")) return FileSpreadsheet;
  if (contentType.includes("presentation") || contentType.includes("powerpoint")) return Presentation;
  if (contentType.includes("zip")) return FileArchive;
  return FileIcon;
}
