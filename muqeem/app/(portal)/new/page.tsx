"use client";

import { useAuth } from "@/components/Auth";
import { RecordForm } from "@/components/RecordForm";

export default function NewRecordPage() {
  const { canManage } = useAuth();
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Muqeem Control</p>
          <h1>Entry Muqeem</h1>
        </div>
      </div>
      {canManage ? <RecordForm /> : <div className="alert error">You can view records but not enter new ones.</div>}
    </>
  );
}
