"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarDays, Check, Save } from "lucide-react";
import { ApiError, records } from "@/lib/api";
import { blankWithDefaults } from "@/lib/defaults";
import { HIJRI_PATTERN, todayHijri } from "@/lib/hijri";
import type { Facets, MuqeemFields, MuqeemRecord } from "@/lib/types";

type Key = keyof MuqeemFields;

const DATE_KEYS: Key[] = [
  "report_date",
  "birth_date",
  "entry_date",
  "passport_issue_date",
  "passport_expiry_date",
  "iqama_issue_date",
  "iqama_expiry_date",
];
const REQUIRED: Key[] = ["report_date", "iqama_number", "name"];

/** Types 14480525 → 1448-05-25 so nobody has to place the dashes. */
function maskHijri(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function hijriProblem(value: string): string {
  if (!value) return "";
  if (!HIJRI_PATTERN.test(value)) return value.length >= 10 ? "Use 1448-05-25" : "";
  const [, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12) return "Month must be 01–12";
  if (day < 1 || day > 30) return "Day must be 01–30";
  return "";
}

function Field({
  label,
  required,
  hint,
  error,
  span,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  span?: 2 | 3 | 4;
  children: React.ReactNode;
}) {
  return (
    <label className={`ef${span ? ` s${span}` : ""}${error ? " bad" : ""}`}>
      <span className="ef-label">
        {label}
        {required && <i className="req">*</i>}
      </span>
      {children}
      {(error || hint) && <small className={error ? "ef-err" : "ef-hint"}>{error || hint}</small>}
    </label>
  );
}

export function RecordForm({ id, initial }: { id?: string; initial?: MuqeemFields }) {
  const router = useRouter();
  const [data, setData] = useState<MuqeemFields>(initial ?? blankWithDefaults(todayHijri()));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState<Set<Key>>(new Set());
  const [facets, setFacets] = useState<Facets | null>(null);
  const [duplicate, setDuplicate] = useState<MuqeemRecord | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Saved defaults live in localStorage, which is only available after mount.
  useEffect(() => {
    if (initial) return;
    const timer = window.setTimeout(() => setData(blankWithDefaults(todayHijri())), 0);
    return () => window.clearTimeout(timer);
  }, [initial]);

  useEffect(() => {
    records.facets().then(setFacets).catch(() => undefined);
  }, []);

  const set = (key: Key) => (value: string) => setData((current) => ({ ...current, [key]: value }));
  const touch = (key: Key) => setTouched((current) => new Set(current).add(key));

  const problems = useMemo(() => {
    const out: Partial<Record<Key, string>> = {};
    for (const key of DATE_KEYS) {
      const message = hijriProblem(data[key]);
      if (message) out[key] = message;
    }
    if (data.iqama_number && !/^\d{10}$/.test(data.iqama_number)) out.iqama_number = "Usually 10 digits";
    return out;
  }, [data]);

  const missing = REQUIRED.filter((key) => !data[key].trim());
  const hardErrors = DATE_KEYS.filter((key) => problems[key]);
  const done = REQUIRED.length - missing.length;
  const showErr = (key: Key) => (touched.has(key) || (data[key] && DATE_KEYS.includes(key)) ? problems[key] : undefined);

  async function checkDuplicate() {
    touch("iqama_number");
    const iqama = data.iqama_number.trim();
    if (id || iqama.length < 6) return setDuplicate(null);
    try {
      const hits = await records.list({ q: iqama, limit: 5 });
      setDuplicate(hits.find((row) => row.iqama_number === iqama && row.version_number === data.version_number) ?? null);
    } catch {
      setDuplicate(null);
    }
  }

  async function submit(event?: React.FormEvent) {
    event?.preventDefault();
    setError("");
    setTouched(new Set([...REQUIRED, ...DATE_KEYS]));
    if (missing.length) {
      setError("Please fill the required fields marked with *.");
      return;
    }
    if (hardErrors.length) {
      setError(`Check the date format: ${hardErrors.map((k) => k.replace(/_/g, " ")).join(", ")} (Hijri, like 1448-05-25).`);
      return;
    }
    setBusy(true);
    try {
      const saved = id ? await records.update(id, data) : await records.create(data);
      router.push(`/records/${saved.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the record");
      setBusy(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // Ctrl/Cmd + S saves.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const text = (
    key: Key,
    label: string,
    opts: { span?: 2 | 3 | 4; rtl?: boolean; placeholder?: string; list?: string; hint?: string; upper?: boolean; digits?: boolean; onBlur?: () => void } = {},
  ) => (
    <Field label={label} required={REQUIRED.includes(key)} span={opts.span} hint={opts.hint} error={showErr(key)}>
      <input
        value={data[key]}
        onChange={(e) => {
          let value = e.target.value;
          if (opts.upper) value = value.toUpperCase();
          if (opts.digits) value = value.replace(/\D/g, "");
          set(key)(value);
        }}
        onBlur={() => {
          touch(key);
          opts.onBlur?.();
        }}
        placeholder={opts.placeholder}
        list={opts.list}
        dir={opts.rtl ? "rtl" : undefined}
        className={opts.rtl ? "ar" : undefined}
        inputMode={opts.digits ? "numeric" : undefined}
        autoComplete="off"
      />
    </Field>
  );

  const date = (key: Key, label: string) => (
    <Field label={label} required={REQUIRED.includes(key)} error={showErr(key)}>
      <div className="with-btn">
        <input
          value={data[key]}
          onChange={(e) => set(key)(maskHijri(e.target.value))}
          onBlur={() => touch(key)}
          placeholder="1448-05-25"
          inputMode="numeric"
          maxLength={10}
          autoComplete="off"
        />
        {key === "report_date" && (
          <button type="button" className="btn" title="Use today's Hijri date" onClick={() => set(key)(todayHijri())}>
            <CalendarDays size={16} />
          </button>
        )}
      </div>
    </Field>
  );

  const pick = (key: Key, label: string, options: string[]) => (
    <Field label={label}>
      <select value={data[key]} onChange={(e) => set(key)(e.target.value)}>
        {[...new Set([...options, data[key]].filter(Boolean))].map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </Field>
  );

  const countries = [...new Set([...(facets?.nationalities ?? []), "Pakistan", "India", "Bangladesh", "Nepal", "Sri Lanka", "Philippines", "Egypt", "Sudan", "Yemen", "Indonesia"])];
  const issues = !!(missing.length || hardErrors.length);

  return (
    <form ref={formRef} onSubmit={submit} className="entry">
      <div className="entry-top panel">
        <div className="entry-progress">
          <div className="entry-dots">
            {REQUIRED.map((key) => (
              <span key={key} className={data[key].trim() ? "on" : ""} />
            ))}
          </div>
          <span>
            {done === REQUIRED.length ? (
              <>
                <Check size={14} /> Required fields complete
              </>
            ) : (
              <>
                {done} of {REQUIRED.length} required fields
              </>
            )}
          </span>
        </div>
        <span className="cell-sub">
          Dates are Hijri · type <b>14480525</b> and the dashes appear · <kbd>Ctrl S</kbd> saves
        </span>
      </div>

      {error && <div className="alert error">{error}</div>}
      {duplicate && (
        <div className="alert warn">
          <AlertTriangle size={15} style={{ verticalAlign: "-2px" }} /> A report for this Iqama and version already exists ({duplicate.name}).{" "}
          <Link href={`/records/${duplicate.id}`} style={{ textDecoration: "underline" }}>
            Open it
          </Link>{" "}
          or change the Version Number.
        </div>
      )}

      <section className="panel esec">
        <header>
          <h2>Report</h2>
        </header>
        <div className="eg">
          {date("report_date", "Report date")}
          {text("operator_id", "Operator ID")}
          {text("location", "Location", { span: 2 })}
        </div>
      </section>

      <section className="panel esec">
        <header>
          <h2>Person</h2>
          <span>Head of household</span>
        </header>
        <div className="eg">
          {text("iqama_number", "Iqama number", { digits: true, onBlur: () => void checkDuplicate(), placeholder: "2XXXXXXXXX" })}
          {text("version_number", "Version", { digits: true })}
          {pick("gender", "Gender", ["Male", "Female"])}
          {pick("status", "Status", ["Valid", "Expired", "Cancelled", "Final Exit"])}
          {text("name", "Name", { span: 2, upper: true, placeholder: "AS WRITTEN ON THE REPORT" })}
          {text("translated_name", "Name in Arabic", { span: 2, rtl: true })}
          {date("birth_date", "Birth date")}
          {text("birth_country", "Birth country", { list: "countries" })}
          {pick("marital_status", "Marital status", ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"])}
          {pick("religion", "Religion", ["Islam", "Christianity", "Hinduism", "Buddhism", "Other"])}
          {text("occupation", "Occupation", { span: 2, list: "occupations" })}
          {date("entry_date", "Entry date")}
          {text("entry_location", "Entry location")}
        </div>
      </section>

      <div className="esplit">
        <section className="panel esec">
          <header>
            <h2>Passport</h2>
          </header>
          <div className="eg e2">
            {text("passport_number", "Number", { upper: true })}
            {text("passport_nationality", "Nationality", { list: "countries" })}
            {date("passport_issue_date", "Issue date")}
            {date("passport_expiry_date", "Expiry date")}
            {text("passport_issue_location", "Issue location", { span: 2 })}
          </div>
        </section>

        <section className="panel esec">
          <header>
            <h2>Iqama</h2>
          </header>
          <div className="eg e2">
            {date("iqama_issue_date", "Issue date")}
            {date("iqama_expiry_date", "Expiry date")}
            {text("iqama_issue_location", "Issue location", { span: 2 })}
          </div>
        </section>
      </div>

      <section className="panel esec">
        <header>
          <h2>Employer</h2>
        </header>
        <div className="eg">
          {text("employer_number", "Number", { digits: true })}
          {text("employer_name", "Name in Arabic", { span: 3, rtl: true, list: "employers" })}
        </div>
      </section>

      <datalist id="countries">
        {countries.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="occupations">
        {(facets?.occupations ?? []).map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="employers">
        {(facets?.employers ?? []).map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="entry-bar">
        <span className={issues ? "cell-sub" : "ok-note"}>{issues ? "Some required fields or dates need attention." : "Ready to save."}</span>
        <button type="button" className="btn" onClick={() => router.back()} disabled={busy}>
          Cancel
        </button>
        <button className="btn primary" disabled={busy}>
          <Save size={16} /> {busy ? "Saving…" : id ? "Save changes" : "Save Muqeem"}
        </button>
      </div>
    </form>
  );
}
