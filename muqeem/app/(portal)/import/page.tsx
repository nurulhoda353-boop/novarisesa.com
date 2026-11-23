"use client";

import { useRef, useState } from "react";
import { FileDown, FileSpreadsheet, Table2, Upload } from "lucide-react";
import { useAuth } from "@/components/Auth";
import { ApiError, records } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import { downloadTemplate, exportCsv, exportXlsx, readImportFile } from "@/lib/sheetio";
import type { ImportResult } from "@/lib/types";

export default function ImportPage() {
  const { canAdmin } = useAuth();
  const { t } = usePrefs();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError("");
    setResult(null);
    setFileName(file.name);
    try {
      const parsed = await readImportFile(file);
      if (!parsed.length) throw new Error("No data rows found. Check that the first row has the column names.");
      setRows(parsed);
    } catch (err) {
      setRows(null);
      setError(err instanceof Error ? err.message : "Could not read that file");
    }
  }

  async function run() {
    if (!rows) return;
    setBusy(true);
    setError("");
    try {
      // Chunked so one giant request never times out.
      const total: ImportResult = { created: 0, skipped: 0, errors: [] };
      for (let start = 0; start < rows.length; start += 500) {
        const part = await records.importRows(rows.slice(start, start + 500));
        total.created += part.created;
        total.skipped += part.skipped;
        total.errors.push(...part.errors.map((e) => ({ row: e.row + start, message: e.message })));
      }
      setResult(total);
      setRows(null);
      setFileName("");
      if (fileInput.current) fileInput.current.value = "";
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function exportAll(kind: "csv" | "xlsx") {
    setError("");
    try {
      const all = await records.list({ limit: 2000, sort: "created_at", order: "desc" });
      const stamp = new Date().toISOString().slice(0, 10);
      if (kind === "csv") exportCsv(all, `muqeem-all-${stamp}.csv`);
      else await exportXlsx(all, `muqeem-all-${stamp}.xlsx`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Export failed");
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("import.eyebrow")}</p>
          <h1>{t("import.title")}</h1>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="dash-grid">
        <section className="panel panel-pad c6 rise">
          <h2>
            <i />
            {t("import.exportAll")}
          </h2>
          <div className="detail-bar">
            <button className="btn" onClick={() => void exportAll("xlsx")}>
              <FileSpreadsheet size={16} /> Excel (.xlsx)
            </button>
            <button className="btn" onClick={() => void exportAll("csv")}>
              <Table2 size={16} /> CSV
            </button>
          </div>
        </section>

        <section className="panel panel-pad c6 rise" style={{ animationDelay: "80ms" }}>
          <h2>
            <i />
            {t("import.template")}
          </h2>
          <button className="btn" onClick={() => void downloadTemplate()}>
            <FileDown size={16} /> {t("import.template")}
          </button>
          <p className="cell-sub" style={{ marginTop: 12 }}>
            {t("import.hint")}
          </p>
        </section>

        <section className="panel panel-pad c12 rise" style={{ animationDelay: "160ms" }}>
          <h2>
            <i />
            {t("import.run")}
          </h2>
          {!canAdmin ? (
            <div className="alert warn">{t("import.adminOnly")}</div>
          ) : (
            <>
              <div className="dropzone" onClick={() => fileInput.current?.click()}>
                <Upload size={26} />
                <p style={{ margin: "8px 0 0" }}>{fileName || t("import.pick")}</p>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".xlsx,.csv"
                  hidden
                  onChange={(e) => void pick(e.target.files?.[0])}
                />
              </div>
              {rows && (
                <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <span>
                    <b>{rows.length}</b> rows ready
                  </span>
                  <button className="btn primary" onClick={() => void run()} disabled={busy}>
                    <Upload size={16} /> {busy ? "…" : t("import.run")}
                  </button>
                </div>
              )}
              {result && (
                <div style={{ marginTop: 14 }}>
                  <div className={`alert ${result.errors.length ? "warn" : "ok"}`}>
                    {t("import.done")}: <b>{result.created}</b> created, <b>{result.skipped}</b> skipped (already exist),{" "}
                    <b>{result.errors.length}</b> with errors.
                    {result.errors.length > 0 && (
                      <ul className="import-errors">
                        {result.errors.map((item) => (
                          <li key={`${item.row}-${item.message}`}>
                            Row {item.row}: {item.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
