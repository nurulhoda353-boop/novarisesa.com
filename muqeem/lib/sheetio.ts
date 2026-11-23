import { EMPTY_FIELDS, type MuqeemFields, type MuqeemRecord } from "./types";

/** Spreadsheet columns = the field names, in the order of the Muqeem report. */
export const COLUMNS = Object.keys(EMPTY_FIELDS) as (keyof MuqeemFields)[];

function save(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function saveBlob(blob: Blob, filename: string): void {
  save(blob, filename);
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function exportCsv(rows: MuqeemRecord[], filename: string): void {
  const lines = [COLUMNS.join(",")];
  for (const row of rows) lines.push(COLUMNS.map((key) => csvCell(String(row[key] ?? ""))).join(","));
  // BOM so Excel reads the Arabic names as UTF-8.
  save(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), filename);
}

export async function exportXlsx(rows: MuqeemRecord[], filename: string): Promise<void> {
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const header = COLUMNS.map((key) => ({ value: key, fontWeight: "bold" as const }));
  const body = rows.map((row) => COLUMNS.map((key) => ({ value: String(row[key] ?? ""), type: String })));
  const blob = await writeExcelFile([header, ...body], { columns: COLUMNS.map(() => ({ width: 18 })) }).toBlob();
  save(blob, filename);
}

/** One example row so people can see the expected shape (Hijri dates as text). */
export async function downloadTemplate(): Promise<void> {
  const example: Partial<MuqeemFields> = {
    ...EMPTY_FIELDS,
    report_date: "1448-05-25",
    iqama_number: "2000000000",
    name: "EXAMPLE NAME",
    occupation: "Driver",
    passport_nationality: "Bangladesh",
    iqama_issue_date: "1447-01-10",
    iqama_expiry_date: "1448-01-10",
  };
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const header = COLUMNS.map((key) => ({ value: key, fontWeight: "bold" as const }));
  const sample = COLUMNS.map((key) => ({ value: String(example[key] ?? ""), type: String }));
  const blob = await writeExcelFile([header, sample], { columns: COLUMNS.map(() => ({ width: 18 })) }).toBlob();
  save(blob, "muqeem-import-template.xlsx");
}

/** Minimal RFC-4180 CSV parser (quoted fields, doubled quotes, CRLF). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

/** Reads an .xlsx or .csv file and returns one object per data row, keyed by the header names. */
export async function readImportFile(file: File): Promise<Record<string, string>[]> {
  let grid: unknown[][];
  if (/\.csv$/i.test(file.name)) {
    grid = parseCsv(await file.text());
  } else {
    const { readSheet } = await import("read-excel-file/browser");
    grid = (await readSheet(file)) as unknown[][];
  }
  if (grid.length < 2) return [];
  const header = grid[0].map((cell) => cellText(cell).toLowerCase().replace(/\s+/g, "_"));
  const known = new Set<string>(COLUMNS);
  const out: Record<string, string>[] = [];
  for (const line of grid.slice(1)) {
    if (line.every((cell) => cellText(cell) === "")) continue;
    const item: Record<string, string> = {};
    header.forEach((name, index) => {
      if (known.has(name)) item[name] = cellText(line[index]);
    });
    out.push(item);
  }
  return out;
}
