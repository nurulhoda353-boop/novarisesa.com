"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/Auth";
import { RecordForm } from "@/components/RecordForm";
import { ApiError, records } from "@/lib/api";
import type { MuqeemRecord } from "@/lib/types";

export default function EditRecordPage() {
  const { id } = useParams<{ id: string }>();
  const { canManage } = useAuth();
  const [record, setRecord] = useState<MuqeemRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    records
      .get(id)
      .then(setRecord)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load the record"));
  }, [id]);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Muqeem Control</p>
          <h1>Edit Muqeem</h1>
        </div>
      </div>
      {!canManage && <div className="alert error">You do not have permission to edit records.</div>}
      {error && <div className="alert error">{error}</div>}
      {canManage && record && <RecordForm id={id} initial={record} />}
    </>
  );
}
