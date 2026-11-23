"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BadgeCheck, ShieldX } from "lucide-react";
import { ApiError, records } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import type { PublicVerify } from "@/lib/types";

/** Public page opened by scanning the QR code on a Muqeem PDF. No login; masked iqama number only. */
export default function VerifyPage() {
  const { code } = useParams<{ code: string }>();
  const { t } = usePrefs();
  const [data, setData] = useState<PublicVerify | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    records
      .verify(code)
      .then(setData)
      .catch((err) => {
        if (!(err instanceof ApiError) || err.status !== 404) console.warn("verify failed");
        setFailed(true);
      });
  }, [code]);

  const rows: [string, string][] = data
    ? [
        ["Name", data.name],
        ["Iqama No.", data.iqama_number],
        ["Nationality", data.nationality],
        ["Status", data.status],
        ["Report date", data.report_date],
        ["Iqama expiry", data.iqama_expiry_date],
        ["Employer", data.employer_name],
      ].filter(([, value]) => value) as [string, string][]
    : [];

  return (
    <div className="login-page">
      <div className="panel login-card verify-card rise" style={{ maxWidth: 480 }}>
        <div className="logo-chip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/novarise-white.png" alt="NOVARISE" />
        </div>
        <p className="eyebrow">{t("verify.title")}</p>
        {!data && !failed && <div className="skeleton" style={{ height: 160 }} />}
        {failed && (
          <>
            <div className="seal bad">
              <ShieldX size={38} />
            </div>
            <h1 style={{ fontSize: 20 }}>{t("verify.bad")}</h1>
          </>
        )}
        {data && (
          <>
            <div className={`seal${data.verified ? "" : " bad"}`}>{data.verified ? <BadgeCheck size={40} /> : <ShieldX size={38} />}</div>
            <h1 style={{ fontSize: 20 }}>{data.verified ? t("verify.ok") : t("verify.archived")}</h1>
            <dl>
              {rows.map(([label, value]) => (
                <div key={label} style={{ display: "contents" }}>
                  <dt>{label}</dt>
                  <dd className={label === "Employer" || label === "Name" ? "ar" : undefined}>{value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </div>
    </div>
  );
}
