"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Pencil, Printer, Trash2 } from "lucide-react";
import { useAuth } from "@/components/Auth";
import { MuqeemSheet, SHEET_HEIGHT, SHEET_WIDTH } from "@/components/MuqeemSheet";
import { ApiError, records } from "@/lib/api";
import { downloadSheetPdf } from "@/lib/pdf";
import type { MuqeemRecord } from "@/lib/types";

export default function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const wantsDownload = useSearchParams().get("download") === "1";
  const { canManage } = useAuth();
  const [record, setRecord] = useState<MuqeemRecord | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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

  async function remove() {
    if (!record || !window.confirm(`Delete the Muqeem record for ${record.name}? This cannot be undone.`)) return;
    try {
      await records.remove(record.id);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the record");
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Muqeem Control</p>
          <h1>{record ? record.name : "Muqeem Record"}</h1>
        </div>
        <div className="detail-bar">
          <Link href="/" className="btn">
            <ArrowLeft size={16} /> All records
          </Link>
          {record && (
            <>
              {canManage && (
                <Link href={`/records/${record.id}/edit`} className="btn">
                  <Pencil size={16} /> Edit
                </Link>
              )}
              <button className="btn" onClick={() => window.print()}>
                <Printer size={16} /> Print
              </button>
              <button className="btn orange" onClick={download} disabled={busy}>
                <Download size={16} /> {busy ? "Preparing…" : "Download PDF"}
              </button>
              {canManage && (
                <button className="btn danger" onClick={remove}>
                  <Trash2 size={16} /> Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {!record && !error && <div className="empty">Loading…</div>}

      {record && (
        <>
          <div className="sheet-stage" ref={stage}>
            <div className="sheet-paper" style={{ width: SHEET_WIDTH * scale, height: SHEET_HEIGHT * scale }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: SHEET_WIDTH, height: SHEET_HEIGHT }}>
                <MuqeemSheet data={record} />
              </div>
            </div>
          </div>
          {/* Full-size copy used for PDF export and printing */}
          <div className="print-area" ref={exportRef} aria-hidden>
            <MuqeemSheet data={record} />
          </div>
        </>
      )}
    </>
  );
}
