"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Download,
  Eye,
  FileArchive,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Pencil,
  Printer,
  Search,
  Table2,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/Auth";
import { BatchSheets } from "@/components/BatchSheets";
import { ApiError, records } from "@/lib/api";
import { sheetPdfBlob } from "@/lib/pdf";
import { usePrefs } from "@/lib/prefs";
import { exportCsv, exportXlsx, saveBlob } from "@/lib/sheetio";
import type { Facets, MuqeemRecord, RecordFilters } from "@/lib/types";


type FilterKey = "nationality" | "occupation" | "status" | "employer" | "gender";

export default function RecordsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const archived = params.get("tab") === "archived";
  const { canManage, canAdmin } = useAuth();
  const { t } = usePrefs();

  const [rows, setRows] = useState<MuqeemRecord[] | null>(null);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Partial<Record<FilterKey, string>>>({});
  const [sort, setSort] = useState<{ key: string; order: "asc" | "desc" }>({ key: "created_at", order: "desc" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [qr, setQr] = useState(true);
  const [batch, setBatch] = useState<MuqeemRecord[] | null>(null);
  const batchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    records.facets().then(setFacets).catch(() => undefined);
  }, []);

  const load = useCallback(() => {
    const active: RecordFilters = { q: query, ...filters, archived, sort: sort.key, order: sort.order };
    return records
      .list(active)
      .then((list) => {
        setRows(list);
        setError("");
        setSelected((current) => new Set([...current].filter((id) => list.some((row) => row.id === id))));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load records"));
  }, [query, filters, archived, sort]);

  useEffect(() => {
    const timer = window.setTimeout(load, 220);
    return () => window.clearTimeout(timer);
  }, [load]);

  const picked = useMemo(() => (rows ?? []).filter((row) => selected.has(row.id)), [rows, selected]);
  const allSelected = !!rows?.length && picked.length === rows.length;
  const hasFilters = Object.values(filters).some(Boolean) || !!query;

  function toggleSort(key: string) {
    setSort((current) => (current.key === key ? { key, order: current.order === "asc" ? "desc" : "asc" } : { key, order: "asc" }));
  }

  function toggleRow(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  function setTab(tab: "active" | "archived") {
    setSelected(new Set());
    router.replace(tab === "archived" ? "/records?tab=archived" : "/records");
  }

  async function act(action: "archive" | "restore", ids: string[]) {
    if (action === "archive" && !window.confirm(`Archive ${ids.length} record${ids.length === 1 ? "" : "s"}? You can restore them later from the Archive.`)) return;
    try {
      await records.bulk(ids, action);
      setNotice(`${ids.length} record${ids.length === 1 ? "" : "s"} ${action === "archive" ? "archived" : "restored"}.`);
      setSelected(new Set());
      await load();
      records.facets().then(setFacets).catch(() => undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed");
    }
  }

  async function deleteForever(row: MuqeemRecord) {
    if (!window.confirm(`Permanently delete ${row.name}? This cannot be undone.`)) return;
    try {
      await records.removePermanently(row.id);
      setRows((current) => current?.filter((item) => item.id !== row.id) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the record");
    }
  }

  /** Mounts the off-screen sheets for `list`, waits for layout + fonts, then returns the DOM node. */
  async function mountBatch(list: MuqeemRecord[]): Promise<HTMLDivElement> {
    setBatch(list);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await document.fonts.ready;
    if (!batchRef.current) throw new Error("Batch not ready");
    return batchRef.current;
  }

  async function zipPdfs() {
    const list = picked.length ? picked : rows ?? [];
    if (!list.length) return;
    if (list.length > 60 && !window.confirm(`Creating ${list.length} PDFs can take a few minutes. Continue?`)) return;
    setBusy("zip");
    setError("");
    try {
      const container = await mountBatch(list);
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const pages = Array.from(container.querySelectorAll<HTMLElement>(".print-page"));
      for (let i = 0; i < pages.length; i++) {
        setBusy(`zip ${i + 1}/${pages.length}`);
        const sheet = pages[i].querySelector<HTMLElement>(".muqeem-sheet");
        if (!sheet) continue;
        const name = `muqeem-english_${pages[i].dataset.iqama}_${i + 1}.pdf`;
        zip.file(name, await sheetPdfBlob(sheet, name));
      }
      saveBlob(await zip.generateAsync({ type: "blob" }), `muqeem-reports-${new Date().toISOString().slice(0, 10)}.zip`);
    } catch {
      setError("Could not build the ZIP. Try fewer records at a time.");
    } finally {
      setBusy("");
      setBatch(null);
    }
  }

  async function printBatch() {
    const list = picked.length ? picked : rows ?? [];
    if (!list.length) return;
    setBusy("print");
    try {
      await mountBatch(list);
      window.print();
    } finally {
      setBusy("");
      window.setTimeout(() => setBatch(null), 500);
    }
  }

  const exportList = picked.length ? picked : rows ?? [];
  const stamp = new Date().toISOString().slice(0, 10);

  function Th({ k, children }: { k: string; children: React.ReactNode }) {
    const on = sort.key === k;
    return (
      <th className="sortable" onClick={() => toggleSort(k)}>
        {children}
        {on && <span className="sort">{sort.order === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}</span>}
      </th>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("list.eyebrow")}</p>
          <h1>{archived ? t("nav.archive") : t("list.title")}</h1>
        </div>
        <div className="detail-bar">
          <div className="tabs">
            <button className={!archived ? "on" : ""} onClick={() => setTab("active")}>
              {t("list.active")}
            </button>
            <button className={archived ? "on" : ""} onClick={() => setTab("archived")}>
              {t("list.archived")}
            </button>
          </div>
          {canManage && !archived && (
            <Link href="/new" className="btn primary">
              <FilePlus2 size={17} /> {t("nav.entry")}
            </Link>
          )}
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert ok">{notice}</div>}

      <div className="panel rise">
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input placeholder={t("list.search")} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <span className="count">{rows ? `${rows.length} ${t("common.records")}` : ""}</span>
        </div>

        <div className="filters">
          {(
            [
              ["nationality", "list.nationality", facets?.nationalities],
              ["occupation", "list.occupation", facets?.occupations],
              ["status", "list.status", facets?.statuses],
              ["employer", "list.employer", facets?.employers],
              ["gender", "list.gender", facets?.genders],
            ] as [FilterKey, string, string[] | undefined][]
          ).map(([key, label, options]) => (
            <select
              key={key}
              value={filters[key] ?? ""}
              onChange={(e) => setFilters((current) => ({ ...current, [key]: e.target.value }))}
              aria-label={t(label)}
            >
              <option value="">
                {t(label)}: {t("common.all")}
              </option>
              {(options ?? []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ))}
          {hasFilters && (
            <button
              className="btn small"
              onClick={() => {
                setFilters({});
                setQuery("");
              }}
            >
              {t("list.clear")}
            </button>
          )}
          <span style={{ marginInlineStart: "auto", display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn small" onClick={() => exportCsv(exportList, `muqeem-records-${stamp}.csv`)} disabled={!exportList.length}>
              <Table2 size={14} /> {t("list.csv")}
            </button>
            <button className="btn small" onClick={() => void exportXlsx(exportList, `muqeem-records-${stamp}.xlsx`)} disabled={!exportList.length}>
              <FileSpreadsheet size={14} /> {t("list.xlsx")}
            </button>
          </span>
        </div>

        {picked.length > 0 && (
          <div className="bulkbar">
            <b>
              {picked.length} {t("list.selected")}
            </b>
            <button className="btn small orange" onClick={() => void zipPdfs()} disabled={!!busy}>
              <FileArchive size={14} /> {busy.startsWith("zip") ? busy.replace("zip", "…") : t("list.pdfzip")}
            </button>
            <button className="btn small" onClick={() => void printBatch()} disabled={!!busy}>
              <Printer size={14} /> {t("list.printbatch")}
            </button>
            <label className="toggle">
              <input type="checkbox" checked={qr} onChange={(e) => setQr(e.target.checked)} /> QR
            </label>
            {canManage &&
              (archived ? (
                <button className="btn small" onClick={() => void act("restore", picked.map((row) => row.id))}>
                  <ArchiveRestore size={14} /> {t("common.restore")}
                </button>
              ) : (
                <button className="btn small danger" onClick={() => void act("archive", picked.map((row) => row.id))}>
                  <Archive size={14} /> {t("common.archive")}
                </button>
              ))}
          </div>
        )}

        {rows === null ? (
          <div className="skel-rows">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="empty">
            <FileText size={34} />
            <h3>{hasFilters ? t("list.noMatch") : t("list.empty")}</h3>
            <p>{hasFilters ? t("list.noMatchHint") : t("list.emptyHint")}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="chk">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))}
                      aria-label="Select all"
                    />
                  </th>
                  <Th k="iqama_number">{t("col.iqama")}</Th>
                  <Th k="name">{t("col.name")}</Th>
                  <Th k="passport_nationality">{t("col.nationality")}</Th>
                  <Th k="occupation">{t("col.occupation")}</Th>
                  <Th k="iqama_expiry_date">{t("col.expiry")}</Th>
                  <Th k="status">{t("col.status")}</Th>
                  <Th k="employer_name">{t("col.employer")}</Th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={selected.has(row.id) ? "sel" : ""} onClick={() => router.push(`/records/${row.id}`)}>
                    <td className="chk" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleRow(row.id)} aria-label={`Select ${row.name}`} />
                    </td>
                    <td>{row.iqama_number}</td>
                    <td>
                      <div className="cell-name">{row.name}</div>
                      {row.translated_name && <div className="cell-sub ar">{row.translated_name}</div>}
                    </td>
                    <td>{row.passport_nationality || row.birth_country}</td>
                    <td>{row.occupation}</td>
                    <td>{row.iqama_expiry_date}</td>
                    <td>
                      <span className={`badge${row.status.toLowerCase() === "valid" ? "" : " off"}`}>{row.status}</span>
                    </td>
                    <td className="ar" style={{ maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis" }} title={row.employer_name}>
                      {row.employer_name}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="actions">
                        <Link href={`/records/${row.id}`} className="btn small" title={t("common.view")}>
                          <Eye size={15} />
                        </Link>
                        <Link href={`/records/${row.id}?download=1`} className="btn small" title={t("common.download")}>
                          <Download size={15} />
                        </Link>
                        {canManage && !archived && (
                          <>
                            <Link href={`/records/${row.id}/edit`} className="btn small" title={t("common.edit")}>
                              <Pencil size={15} />
                            </Link>
                            <button className="btn small danger" title={t("common.archive")} onClick={() => void act("archive", [row.id])}>
                              <Archive size={15} />
                            </button>
                          </>
                        )}
                        {canManage && archived && (
                          <button className="btn small" title={t("common.restore")} onClick={() => void act("restore", [row.id])}>
                            <ArchiveRestore size={15} />
                          </button>
                        )}
                        {canAdmin && archived && (
                          <button className="btn small danger" title={t("common.delete")} onClick={() => void deleteForever(row)}>
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {batch && <BatchSheets ref={batchRef} rows={batch} qr={qr} />}
    </>
  );
}
