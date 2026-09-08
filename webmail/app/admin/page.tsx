"use client";

import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import type { MailAccount } from "@/lib/types";
import { useTheme } from "@/lib/theme";
import { ToastProvider } from "@/lib/toast";
import { AdminPanel } from "@/components/AdminPanel";

/**
 * The admin panel as its own route (mail.novarisesa.com/admin) rather than
 * an overlay only reachable from inside the mail app's state - bookmarkable,
 * reloadable, and independent of whatever MailApp happened to have mounted.
 * Runs its own tiny bootstrap (ensureSession) since nothing here assumes
 * MailApp is (or ever was) on the page.
 */
export default function AdminPage() {
  useTheme();
  const [status, setStatus] = useState<"loading" | "denied" | "ready">("loading");
  const [account, setAccount] = useState<MailAccount | null>(null);

  useEffect(() => {
    api
      .ensureSession()
      .then((existing) => {
        if (!existing || existing.role !== "admin") {
          setStatus("denied");
          return;
        }
        setAccount(existing);
        setStatus("ready");
      })
      .catch(() => setStatus("denied"));
  }, []);

  function goToMail() {
    window.location.href = "/";
  }

  if (status === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--muted)" }}>
        Loading…
      </div>
    );
  }

  if (status === "denied" || !account) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: 14,
          color: "var(--ink)",
          background: "var(--bg)",
          textAlign: "center",
          padding: 24,
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 600 }}>You need admin access to view this page.</p>
        <button className="btn btn-primary" onClick={goToMail}>
          Back to Novamail
        </button>
      </div>
    );
  }

  return (
    <ToastProvider>
      <AdminPanel currentAccount={account} onClose={goToMail} onSwitchedAccount={goToMail} />
    </ToastProvider>
  );
}
