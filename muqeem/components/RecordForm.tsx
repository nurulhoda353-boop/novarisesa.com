"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Save } from "lucide-react";
import { ApiError, records } from "@/lib/api";
import { HIJRI_PATTERN, todayHijri } from "@/lib/hijri";
import { EMPTY_FIELDS, type MuqeemFields } from "@/lib/types";

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

export function RecordForm({ id, initial }: { id?: string; initial?: MuqeemFields }) {
  const router = useRouter();
  const [data, setData] = useState<MuqeemFields>(initial ?? { ...EMPTY_FIELDS, report_date: todayHijri() });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key: Key) => (value: string) => setData((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    for (const key of DATE_KEYS) {
      if (data[key] && !HIJRI_PATTERN.test(data[key])) {
        setError(`"${data[key]}" is not a valid date. Use the Hijri format 1448-05-25 (year-month-day).`);
        return;
      }
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

  const text = (key: Key, label: string, opts: { required?: boolean; span?: 2 | 3; rtl?: boolean; placeholder?: string; list?: string } = {}) => (
    <label className={`field${opts.span ? ` span${opts.span}` : ""}`}>
      <span>
        {label}
        {opts.required && <span className="req"> *</span>}
      </span>
      <input
        value={data[key]}
        onChange={(e) => set(key)(e.target.value)}
        required={opts.required}
        placeholder={opts.placeholder}
        list={opts.list}
        dir={opts.rtl ? "rtl" : undefined}
        className={opts.rtl ? "ar" : undefined}
      />
    </label>
  );

  const date = (key: Key, label: string, required = false) => (
    <label className="field">
      <span>
        {label}
        {required && <span className="req"> *</span>}
      </span>
      <div className="with-btn">
        <input
          value={data[key]}
          onChange={(e) => set(key)(e.target.value)}
          placeholder="1448-05-25"
          inputMode="numeric"
          maxLength={10}
          required={required}
        />
        {key === "report_date" && (
          <button type="button" className="btn" title="Use today's Hijri date" onClick={() => set(key)(todayHijri())}>
            <CalendarDays size={16} />
          </button>
        )}
      </div>
    </label>
  );

  const pick = (key: Key, label: string, options: string[]) => (
    <label className="field">
      <span>{label}</span>
      <select value={data[key]} onChange={(e) => set(key)(e.target.value)}>
        {[...new Set([...options, data[key]].filter(Boolean))].map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );

  return (
    <form onSubmit={submit} className="panel">
      {error && (
        <div style={{ padding: "20px 24px 0" }}>
          <div className="alert error" style={{ margin: 0 }}>
            {error}
          </div>
        </div>
      )}

      <section className="form-section">
        <h2>
          <i /> Report header
        </h2>
        <div className="grid">
          {date("report_date", "Report Date", true)}
          {text("operator_id", "Operator ID")}
          {text("location", "Location")}
        </div>
      </section>

      <section className="form-section">
        <h2>
          <i /> Person information · Head of household
        </h2>
        <div className="grid">
          {text("iqama_number", "Iqama Number", { required: true })}
          {text("version_number", "Version Number")}
          {pick("gender", "Gender", ["Male", "Female"])}
          {text("name", "Name", { required: true, span: 2, placeholder: "AS WRITTEN ON THE REPORT" })}
          <span />
          {text("translated_name", "Translated Name (Arabic)", { span: 2, rtl: true })}
          <span />
          {date("birth_date", "Birth Date")}
          {text("birth_country", "Birth Country", { list: "countries" })}
          {pick("marital_status", "Martial Status", ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"])}
          {pick("religion", "Religion", ["Islam", "Christianity", "Hinduism", "Buddhism", "Other"])}
          {text("occupation", "Occupation")}
          <span />
          {pick("status", "Status", ["Valid", "Expired", "Cancelled", "Final Exit"])}
          {date("entry_date", "Entry Date")}
          {text("entry_location", "Entry Location")}
        </div>
      </section>

      <section className="form-section">
        <h2>
          <i /> Passport information
        </h2>
        <div className="grid">
          {text("passport_number", "Number")}
          {text("passport_nationality", "Nationality", { list: "countries" })}
          <span />
          {date("passport_issue_date", "Issue Date")}
          {date("passport_expiry_date", "Expiry Date")}
          {text("passport_issue_location", "Issue Location")}
        </div>
      </section>

      <section className="form-section">
        <h2>
          <i /> Iqama information
        </h2>
        <div className="grid">
          {date("iqama_issue_date", "Issue Date")}
          {date("iqama_expiry_date", "Expiry Date")}
          {text("iqama_issue_location", "Issue Location")}
        </div>
      </section>

      <section className="form-section" style={{ borderBottom: 0 }}>
        <h2>
          <i /> Employer information
        </h2>
        <div className="grid">
          {text("employer_number", "Number")}
          {text("employer_name", "Name (Arabic)", { span: 2, rtl: true })}
        </div>
      </section>

      <datalist id="countries">
        {["Pakistan", "India", "Bangladesh", "Nepal", "Sri Lanka", "Philippines", "Egypt", "Sudan", "Yemen", "Indonesia"].map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="form-foot">
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
