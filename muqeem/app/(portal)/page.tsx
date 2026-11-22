"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Eye, FilePlus2, FileText, Pencil, Search, Trash2 } from "lucide-react";
import { useAuth } from "@/components/Auth";
import { ApiError, records } from "@/lib/api";
import type { MuqeemRecord } from "@/lib/types";

export default function RecordsPage() {
  const router = useRouter();
  const { canManage } = useAuth();
  const [rows, setRows] = useState<MuqeemRecord[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      records
        .list(query)
        .then((list) => {
          setRows(list);
          setError("");
        })
        .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load records"));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function remove(row: MuqeemRecord) {
    if (!window.confirm(`Delete the Muqeem record for ${row.name}? This cannot be undone.`)) return;
    try {
      await records.remove(row.id);
      setRows((current) => current?.filter((item) => item.id !== row.id) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the record");
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Muqeem Control</p>
          <h1>Muqeem Records</h1>
        </div>
        {canManage && (
          <Link href="/new" className="btn primary">
            <FilePlus2 size={17} /> Entry Muqeem
          </Link>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="panel">
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input placeholder="Search name, iqama, passport or employer" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <span className="count">{rows ? `${rows.length} record${rows.length === 1 ? "" : "s"}` : ""}</span>
        </div>

        {rows === null ? (
          <div className="empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="empty">
            <FileText size={34} />
            <h3>{query ? "No matching records" : "No Muqeem records yet"}</h3>
            <p>{query ? "Try a different search." : "Use Entry Muqeem to add the first resident report."}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Iqama No.</th>
                  <th>Name</th>
                  <th>Nationality</th>
                  <th>Occupation</th>
                  <th>Iqama Expiry</th>
                  <th>Status</th>
                  <th>Employer</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} onClick={() => router.push(`/records/${row.id}`)}>
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
                    <td className="ar" style={{ maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis" }} title={row.employer_name}>{row.employer_name}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="actions">
                        <Link href={`/records/${row.id}`} className="btn small" title="View">
                          <Eye size={15} />
                        </Link>
                        <Link href={`/records/${row.id}?download=1`} className="btn small" title="Download PDF">
                          <Download size={15} />
                        </Link>
                        {canManage && (
                          <>
                            <Link href={`/records/${row.id}/edit`} className="btn small" title="Edit">
                              <Pencil size={15} />
                            </Link>
                            <button className="btn small danger" title="Delete" onClick={() => remove(row)}>
                              <Trash2 size={15} />
                            </button>
                          </>
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
    </>
  );
}
