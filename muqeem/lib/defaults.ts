import { EMPTY_FIELDS, type MuqeemFields } from "./types";

/** Fields a person usually types the same way every time. Saved per browser in Settings → Entry defaults. */
export const DEFAULT_KEYS = [
  "operator_id",
  "location",
  "religion",
  "marital_status",
  "entry_location",
  "passport_issue_location",
  "iqama_issue_location",
  "employer_number",
  "employer_name",
] as const;

export type DefaultKey = (typeof DEFAULT_KEYS)[number];
export type EntryDefaults = Partial<Record<DefaultKey, string>>;

const STORAGE_KEY = "muqeem-entry-defaults";

export function loadDefaults(): EntryDefaults {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: EntryDefaults = {};
    for (const key of DEFAULT_KEYS) if (typeof parsed[key] === "string") out[key] = parsed[key] as string;
    return out;
  } catch {
    return {};
  }
}

export function saveDefaults(values: EntryDefaults): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    /* private mode: defaults just will not persist */
  }
}

/** A blank report pre-filled with the saved defaults. */
export function blankWithDefaults(reportDate: string): MuqeemFields {
  return { ...EMPTY_FIELDS, ...loadDefaults(), report_date: reportDate };
}
