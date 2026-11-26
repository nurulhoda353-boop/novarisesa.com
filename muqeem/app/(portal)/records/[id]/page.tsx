"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Archive, ArchiveRestore, ArrowLeft, Download, Pencil, Printer, Trash2 } from "lucide-react";
import { useAuth } from "@/components/Auth";
import { verifyUrlFor } from "@/components/BatchSheets";
import { MuqeemSheet, SHEET_HEIGHT, SHEET_WIDTH } from "@/components/MuqeemSheet";
import { ApiError, records } from "@/lib/api";
import { QR_ENABLED } from "@/lib/features";
import { downloadSheetPdf } from "@/lib/pdf";
import { usePrefs } from "@/lib/prefs";
import type { HistoryEntry, MuqeemRecord } from "@/lib/types";

export default function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const wantsDownload = useSearchParams().get("download") === "1";
  const { canManage, canAdmin } = useAuth();
  const { t } = usePrefs();
  const [record, setRecord] = useState<MuqeemRecord | null>(null);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState(QR_ENABLED);
  const [scale, setScale] = useState(1);
  const stage = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const autoDownloaded = useRef(false);

  useEffect(() => {
    records
      .get(id)
      .then(setRecord)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load the record"));
  }, [id]);

  useEffect(() => {
    if (!canAdmin) return;
    records
      .history(id)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [id, canAdmin, record?.archived_at]);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const fit = () => setScale(Math.min(1.7, Math.max(0.4, (element.clientWidth - 44) / SHEET_WIDTH)));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [record]);

  async function download() {
    if (!record || !exportRef.current) return;
    setBusy(true);
    try {
      await downloadSheetPdf(exportRef.current, `muqeem-english_${record.iqama_number}.pdf`);
    } catch {
      setError("Could not create the PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (wantsDownload && record && !autoDownloaded.current) {
      autoDownloaded.current = true;
      void download();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsDownload, record]);

  async function archive() {
    if (!record || !window.confirm(`Archive the Muqeem record for ${record.name}? You can restore it from the Archive.`)) return;
    try {
      await records.archive(record.id);
      router.push("/records");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not archive the record");
    }
  }

  async function restore() {
    if (!record) return;
    try {
      await records.bulk([record.id], "restore");
      setRecord(await records.get(record.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not restore the record");
    }
  }

  async function deleteForever() {
    if (!record || !window.confirm(`Permanently delete ${record.name}? This cannot be undone.`)) return;
    try {
      await records.removePermanently(record.id);
      router.push("/records?tab=archived");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the record");
    }
  }

  const verifyUrl = QR_ENABLED && record && qr ? verifyUrlFor(record) : undefined;
  const archived = !!record?.archived_at;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("brand.title")}</p>
          <h1>{record ? record.name : t("nav.records")}</h1>
        </div>
        <div className="detail-bar">
          <Link href={archived ? "/records?tab=archived" : "/records"} className="btn">
            <ArrowLeft size={16} /> {t("detail.back")}
          </Link>
          {record && (
            <>
              {canManage && !archived && (
                <Link href={`/records/${record.id}/edit`} className="btn">
                  <Pencil size={16} /> {t("common.edit")}
                </Link>
              )}
              {QR_ENABLED && (
                <label className="toggle">
                  <input type="checkbox" checked={qr} onChange={(e) => setQr(e.target.checked)} /> {t("detail.qr")}
                </label>
              )}
              <button className="btn" onClick={() => window.print()}>
                <Printer size={16} /> {t("common.print")}
              </button>
              <button className="btn orange" onClick={download} disabled={busy}>
                <Download size={16} /> {busy ? "…" : t("common.download")}
              </button>
              {canManage && !archived && (
                <button className="btn danger" onClick={archive}>
                  <Archive size={16} /> {t("common.archive")}
                </button>
              )}
              {canManage && archived && (
                <button className="btn" onClick={restore}>
                  <ArchiveRestore size={16} /> {t("common.restore")}
                </button>
              )}
              {canAdmin && archived && (
                <button className="btn danger" onClick={deleteForever}>
                  <Trash2 size={16} /> {t("common.delete")}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {archived && <div className="alert warn">{t("detail.archivedBanner")}</div>}
      {!record && !error && <div className="skeleton" style={{ height: 420 }} />}

      {record && (
        <div className={canAdmin ? "detail-layout" : undefined}>
          <div className="sheet-stage" ref={stage}>
            <div className="sheet-paper" style={{ width: SHEET_WIDTH * scale, height: SHEET_HEIGHT * scale }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: SHEET_WIDTH, height: SHEET_HEIGHT }}>
                <MuqeemSheet data={record} verifyUrl={verifyUrl} />
              </div>
            </div>
          </div>

          {canAdmin && (
            <aside className="panel panel-pad">
              <h2>
                <i />
                {t("detail.history")}
              </h2>
              {history === null ? (
                <div className="skeleton" style={{ height: 120 }} />
              ) : history.length === 0 ? (
                <p className="cell-sub">{t("detail.historyEmpty")}</p>
              ) : (
                <div className="history">
                  {history.map((entry) => (
                    <div className="item" key={entry.id}>
                      <div className="act">{entry.action.replace("muqeem.", "")}</div>
                      <div className="meta">
                        {entry.actor} · {new Date(entry.at).toLocaleString()}
                      </div>
                      {entry.changes.slice(0, 6).map((change) => (
                        <div className="chg" key={change.field}>
                          {change.field.replace(/_/g, " ")}: <s>{change.from || "—"}</s> → <em>{change.to || "—"}</em>
                        </div>
                      ))}
                      {entry.changes.length > 6 && <div className="chg">+{entry.changes.length - 6} more</div>}
                    </div>
                  ))}
                </div>
              )}
            </aside>
          )}

          {/* Full-size copy used for PDF export and printing */}
          <div className="print-area" ref={exportRef} aria-hidden>
            <MuqeemSheet data={record} verifyUrl={verifyUrl} />
          </div>
        </div>
      )}
    </>
  );
}
