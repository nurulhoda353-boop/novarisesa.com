"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import i18n from "@/i18n/config";

const DASHBOARD_ORIGIN = process.env.NEXT_PUBLIC_DASHBOARD_ORIGIN ?? "https://my.novarisesa.com";

type EditModeContextValue = {
  /** Framed inside the dashboard with the preview flag — false for real visitors. */
  active: boolean;
  /** Pen mode on/off, controlled by the dashboard. */
  editing: boolean;
  /** Locally-applied, not-yet-published image URLs, keyed by assetSlots key. */
  assetOverrides: Record<string, string>;
  selectedAssetKey: string | null;
  selectAsset: (key: string | null) => void;
  changeAssetUrl: (slotKey: string, url: string) => void;
  uploadAssetFile: (slotKey: string, file: File) => void;
  removeAsset: (slotKey: string) => void;
};

const EditModeContext = createContext<EditModeContextValue>({
  active: false,
  editing: false,
  assetOverrides: {},
  selectedAssetKey: null,
  selectAsset: () => {},
  changeAssetUrl: () => {},
  uploadAssetFile: () => {},
  removeAsset: () => {},
});

export function useEditMode() {
  return useContext(EditModeContext);
}

function cloneDoc(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value ?? {})) as Record<string, unknown>;
}

function parsePath(path: string): Array<string | number> {
  return path.split(".").map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
}

function replaceAtPath(
  doc: Record<string, unknown>,
  path: Array<string | number>,
  value: unknown,
): Record<string, unknown> {
  const next = cloneDoc(doc);
  let cursor: Record<string | number, unknown> = next;
  path.slice(0, -1).forEach((part) => {
    cursor = cursor[part] as Record<string | number, unknown>;
  });
  cursor[path[path.length - 1]] = value;
  return next;
}

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [editing, setEditing] = useState(false);
  const [assetOverrides, setAssetOverrides] = useState<Record<string, string>>({});
  const [selectedAssetKey, setSelectedAssetKey] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setActive(window.self !== window.top && params.get("novarise_preview") === "1");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("novarise-preview-mode", active);
  }, [active]);

  useEffect(() => {
    document.documentElement.classList.toggle("novarise-edit-mode", editing);
  }, [editing]);

  const selectAsset = useCallback((key: string | null) => setSelectedAssetKey(key), []);

  const commitField = useCallback((path: string, value: string) => {
    const segments = parsePath(path);
    const lang = i18n.language || "en";
    const current = (i18n.getResourceBundle(lang, "translation") ?? {}) as Record<string, unknown>;
    const next = replaceAtPath(current, segments, value);
    i18n.addResourceBundle(lang, "translation", next, true, true);
    window.parent.postMessage({ type: "novarise:field-change", path, value }, DASHBOARD_ORIGIN);
  }, []);

  const changeAssetUrl = useCallback((slotKey: string, url: string) => {
    setAssetOverrides((current) => ({ ...current, [slotKey]: url }));
    window.parent.postMessage({ type: "novarise:asset-change", slotKey, url }, DASHBOARD_ORIGIN);
  }, []);

  const uploadAssetFile = useCallback((slotKey: string, file: File) => {
    window.parent.postMessage({ type: "novarise:asset-upload", slotKey, file }, DASHBOARD_ORIGIN);
  }, []);

  const removeAsset = useCallback((slotKey: string) => {
    window.parent.postMessage({ type: "novarise:asset-remove", slotKey }, DASHBOARD_ORIGIN);
  }, []);

  // Global editable wiring: mark [data-cms-field] nodes editable, delegate
  // click/keydown/paste/focusout centrally instead of per-field handlers.
  useEffect(() => {
    if (!active) return;

    function markEditable(root: ParentNode) {
      root.querySelectorAll<HTMLElement>("[data-cms-field]").forEach((el) => {
        if (el.isContentEditable) return;
        try {
          el.contentEditable = "plaintext-only";
        } catch {
          el.contentEditable = "true";
        }
      });
    }

    if (editing) markEditable(document);

    const observer = new MutationObserver((mutations) => {
      if (!editing) return;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.hasAttribute("data-cms-field") && !node.isContentEditable) {
            try {
              node.contentEditable = "plaintext-only";
            } catch {
              node.contentEditable = "true";
            }
          }
          markEditable(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    function onClickCapture(event: MouseEvent) {
      if (!editing) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const assetEl = target.closest<HTMLElement>("[data-cms-asset]");
      if (assetEl) {
        event.preventDefault();
        event.stopPropagation();
        selectAsset(assetEl.dataset.cmsAsset ?? null);
        return;
      }
      const fieldEl = target.closest<HTMLElement>("[data-cms-field]");
      if (fieldEl) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    document.addEventListener("click", onClickCapture, { capture: true });

    function onKeyDown(event: KeyboardEvent) {
      if (!editing) return;
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-cms-field]")) return;
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        target.blur();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);

    function onPaste(event: ClipboardEvent) {
      if (!editing) return;
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-cms-field]")) return;
      event.preventDefault();
      const text = event.clipboardData?.getData("text/plain") ?? "";
      document.execCommand("insertText", false, text);
    }
    document.addEventListener("paste", onPaste, true);

    function onFocusOut(event: FocusEvent) {
      if (!editing) return;
      const el = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-cms-field]");
      if (!el) return;
      const path = el.dataset.cmsField;
      if (!path) return;
      commitField(path, el.textContent ?? "");
    }
    document.addEventListener("focusout", onFocusOut, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClickCapture, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("paste", onPaste, true);
      document.removeEventListener("focusout", onFocusOut, true);
    };
  }, [active, editing, commitField, selectAsset]);

  // postMessage bridge with the dashboard.
  useEffect(() => {
    if (!active) return;

    function onMessage(event: MessageEvent) {
      if (event.origin !== DASHBOARD_ORIGIN) return;
      const data = event.data as
        | { type?: string; editing?: boolean; slotKey?: string; url?: string }
        | undefined;
      if (!data?.type) return;
      if (data.type === "novarise:edit-mode") {
        setEditing(Boolean(data.editing));
      } else if (data.type === "novarise:asset-updated" && data.slotKey && data.url) {
        const slotKey = data.slotKey;
        const url = data.url;
        setAssetOverrides((current) => ({ ...current, [slotKey]: url }));
      } else if (data.type === "novarise:reload") {
        window.location.reload();
      }
    }
    function onLanguageChanged(lng: string) {
      window.parent.postMessage({ type: "novarise:locale-changed", locale: lng }, DASHBOARD_ORIGIN);
    }

    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "novarise:ready" }, DASHBOARD_ORIGIN);
    window.parent.postMessage({ type: "novarise:locale-changed", locale: i18n.language }, DASHBOARD_ORIGIN);
    i18n.on("languageChanged", onLanguageChanged);
    return () => {
      window.removeEventListener("message", onMessage);
      i18n.off("languageChanged", onLanguageChanged);
    };
  }, [active]);

  const value = useMemo<EditModeContextValue>(
    () => ({
      active,
      editing,
      assetOverrides,
      selectedAssetKey,
      selectAsset,
      changeAssetUrl,
      uploadAssetFile,
      removeAsset,
    }),
    [active, editing, assetOverrides, selectedAssetKey, selectAsset, changeAssetUrl, uploadAssetFile, removeAsset],
  );

  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>;
}
