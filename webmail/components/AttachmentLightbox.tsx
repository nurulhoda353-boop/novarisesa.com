"use client";

import { Download, X } from "lucide-react";
import { saveBlob } from "@/lib/download";

export function AttachmentLightbox({
  url,
  filename,
  blob,
  onClose,
}: {
  url: string;
  filename: string;
  blob: Blob;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="lightbox" onClick={(event) => event.stopPropagation()}>
        <div className="lightbox-toolbar">
          <span className="lightbox-filename">{filename}</span>
          <div className="spacer" />
          <button className="icon-btn" title="Download" onClick={() => saveBlob(blob, filename)}>
            <Download size={18} />
          </button>
          <button className="icon-btn" title="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="lightbox-body">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={filename} />
        </div>
      </div>
    </div>
  );
}
