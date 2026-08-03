"use client";

import { useEffect, useRef, useState } from "react";
import { Link2, Trash2, Upload, X } from "lucide-react";
import { useEditMode } from "./EditModeContext";

/**
 * Floating replace/remove popover for [data-cms-asset] images — only rendered
 * while pen mode is on and an image slot has been clicked.
 */
export function AssetOverlay() {
  const { editing, selectedAssetKey, selectAsset, changeAssetUrl, uploadAssetFile, removeAsset } = useEditMode();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [urlValue, setUrlValue] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing || !selectedAssetKey) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-cms-asset="${CSS.escape(selectedAssetKey)}"]`);
    setRect(el?.getBoundingClientRect() ?? null);
    setUrlValue("");
  }, [editing, selectedAssetKey]);

  useEffect(() => {
    if (!selectedAssetKey) return;
    function onPointerDown(event: MouseEvent) {
      if (popoverRef.current?.contains(event.target as Node)) return;
      selectAsset(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") selectAsset(null);
    }
    function onScroll() {
      selectAsset(null);
    }
    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [selectedAssetKey, selectAsset]);

  if (!editing || !selectedAssetKey || !rect) return null;

  return (
    <div
      ref={popoverRef}
      className="novarise-asset-popover"
      style={{
        position: "fixed",
        left: rect.left + rect.width / 2,
        top: rect.top + rect.height / 2,
      }}
    >
      <button type="button" className="novarise-asset-popover-close" onClick={() => selectAsset(null)} aria-label="Close">
        <X size={13} />
      </button>
      <label className="novarise-asset-popover-action">
        <Upload size={15} />
        <span>Upload from device</span>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) {
              uploadAssetFile(selectedAssetKey, file);
              selectAsset(null);
            }
          }}
        />
      </label>
      <div className="novarise-asset-popover-url">
        <Link2 size={15} />
        <input
          type="text"
          placeholder="Paste image URL, press Enter"
          value={urlValue}
          onChange={(event) => setUrlValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && urlValue.trim()) {
              changeAssetUrl(selectedAssetKey, urlValue.trim());
              setUrlValue("");
              selectAsset(null);
            }
          }}
        />
      </div>
      <button
        type="button"
        className="novarise-asset-popover-action novarise-asset-popover-remove"
        onClick={() => {
          removeAsset(selectedAssetKey);
          selectAsset(null);
        }}
      >
        <Trash2 size={15} />
        <span>Remove image</span>
      </button>
    </div>
  );
}
