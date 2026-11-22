import type { CSSProperties } from "react";
import type { MuqeemFields } from "@/lib/types";

/**
 * The Muqeem "Resident's Information" report, laid out on an A4 page exactly like the
 * original portal PDF. One CSS pixel here equals one PDF point, so every number below is
 * a measurement taken straight off the original (595.28 x 841.89 pt).
 */
export const SHEET_WIDTH = 595.28;
export const SHEET_HEIGHT = 841.89;

const ORANGE = "#ff7e05";
const COL = { l1: 20, v1: 105.2, l2: 205.5, v2: 293.1, l3: 391.7, v3: 480.2 };

const base: CSSProperties = {
  position: "absolute",
  fontSize: 10,
  lineHeight: "14.7px",
  whiteSpace: "nowrap",
  transform: "translateY(-50%)",
};

function At({ x, y, label, bold, rtl, children }: {
  x: number;
  y: number;
  label?: boolean;
  bold?: boolean;
  rtl?: boolean;
  children: React.ReactNode;
}) {
  const style: CSSProperties = {
    ...base,
    left: label ? x - 0.2 : x - 0.1,
    top: y + 2.9,
    color: label ? ORANGE : "#000",
    fontWeight: label ? 600 : bold ? 600 : 400,
    ...(label ? { fontSize: 11 } : {}),
    ...(rtl ? { direction: "rtl", unicodeBidi: "plaintext" } : {}),
  };
  return <div style={style}>{children}</div>;
}

function Rule({ y }: { y: number }) {
  return <div style={{ position: "absolute", left: 19.8, width: 556, top: y + 0.3, height: 1, background: "#000" }} />;
}

function Heading({ y, size = 11, children }: { y: number; size?: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        ...base,
        left: 23.5,
        width: 553.3,
        top: y + 2.9,
        textAlign: "center",
        fontWeight: 600,
        fontSize: size,
      }}
    >
      {children}
    </div>
  );
}

export function MuqeemSheet({ data }: { data: MuqeemFields }) {
  // Each item may carry its own y: the original portal prints a few cells a point or two off the row.
  const row = (y: number, items: [number, string, React.ReactNode, number?][]) =>
    items.flatMap(([lx, label, value, dy = 0], i) => [
      <At key={`l${y}-${i}`} x={lx} y={y + dy} label>
        {label}
      </At>,
      <At key={`v${y}-${i}`} x={lx === COL.l1 ? COL.v1 : lx === COL.l2 ? COL.v2 : COL.v3} y={y + dy}>
        {value}
      </At>,
    ]);

  return (
    <div
      className="muqeem-sheet"
      style={{
        position: "relative",
        width: SHEET_WIDTH,
        height: SHEET_HEIGHT,
        background: "#fff",
        color: "#000",
        fontFamily: '"DIN Next Arabic", "Barlow", "Noto Sans Arabic", sans-serif',
        overflow: "hidden",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/muqeem-logo.png" alt="Muqeem" style={{ position: "absolute", left: 24, top: 43, width: 67, height: 37 }} />

      <At x={433.7} y={40.5} label>Report Date</At>
      <At x={502.5} y={40.5}>{data.report_date}</At>
      <At x={433.7} y={60.3} label>Operator ID</At>
      <At x={502.5} y={60.4}>{data.operator_id}</At>
      <At x={433.7} y={80.8} label>Location</At>
      <At x={502.2} y={80.8} bold>{data.location}</At>
      <Heading y={60.3} size={12}>Resident&apos;s Information</Heading>

      <Rule y={110.8} />
      <Heading y={126.5}>Person Information - Head of Household</Heading>
      {row(160.2, [
        [COL.l1, "Iqama Number", data.iqama_number],
        [COL.l2, "Version Number", data.version_number],
        [COL.l3, "Gender", data.gender],
      ])}
      <At x={20} y={184} label>Name</At>
      <At x={124.2} y={184}>{data.name}</At>
      <At x={20} y={208} label>Translated Name</At>
      <At x={124.2} y={208.1} rtl>{data.translated_name}</At>
      {row(232.3, [
        [COL.l1, "Birth Date", data.birth_date],
        [COL.l2, "Birth Country", data.birth_country],
        [COL.l3, "Martial Status", data.marital_status],
      ])}
      {row(256.1, [
        [COL.l1, "Religion", data.religion],
        [COL.l2, "Occupation", data.occupation],
      ])}
      {row(279.2, [
        [COL.l1, "Status", data.status],
        [COL.l2, "Entry Date", data.entry_date],
        [COL.l3, "Entry Location", data.entry_location],
      ])}

      <Rule y={301.8} />
      <Heading y={317.8}>Passport Information</Heading>
      {row(352.1, [
        [COL.l1, "Number", data.passport_number],
        [COL.l2, "Nationality", data.passport_nationality, 1.1],
      ])}
      {row(376.2, [
        [COL.l1, "Issue Date", data.passport_issue_date],
        [COL.l2, "Expiry Date", data.passport_expiry_date, 0.8],
        [COL.l3, "Issue Location", data.passport_issue_location, 2.2],
      ])}

      <Rule y={398.4} />
      <Heading y={414.4}>Iqama Information</Heading>
      {row(449.3, [
        [COL.l1, "Issue Date", data.iqama_issue_date],
        [COL.l2, "Expiry Date", data.iqama_expiry_date],
        [COL.l3, "Issue Location", data.iqama_issue_location],
      ])}

      <Rule y={473.5} />
      <Heading y={489.5}>Employer Information</Heading>
      {row(524.1, [[COL.l1, "Number", data.employer_number]])}
      <At x={20} y={548.2} label>Name</At>
      <At x={105.2} y={548.2} rtl>{data.employer_name}</At>
    </div>
  );
}
