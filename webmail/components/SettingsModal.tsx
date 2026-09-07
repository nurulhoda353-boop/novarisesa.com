"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import * as api from "@/lib/api";
import type { AliasInfo, AutoreplyInfo, ForwarderInfo, MailAccount } from "@/lib/types";
import { useToast } from "@/lib/toast";

type Tab = "profile" | "security" | "aliases" | "forwarders" | "autoreply";

export function SettingsModal({
  account,
  onClose,
  onAccountUpdated,
}: {
  account: MailAccount;
  onClose: () => void;
  onAccountUpdated: (account: MailAccount) => void;
}) {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <h2>Manage account</h2>
          <div className="spacer" />
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-tabs">
          {(["profile", "security", "aliases", "forwarders", "autoreply"] as Tab[]).map((item) => (
            <button key={item} className={`modal-tab ${tab === item ? "active" : ""}`} onClick={() => setTab(item)}>
              {labelFor(item)}
            </button>
          ))}
        </div>
        <div className="modal-body">
          {tab === "profile" && <ProfileTab account={account} onAccountUpdated={onAccountUpdated} />}
          {tab === "security" && <SecurityTab />}
          {tab === "aliases" && <AliasesTab />}
          {tab === "forwarders" && <ForwardersTab />}
          {tab === "autoreply" && <AutoreplyTab />}
        </div>
      </div>
    </div>
  );
}

function labelFor(tab: Tab): string {
  return { profile: "Profile", security: "Security", aliases: "Aliases", forwarders: "Forwarders", autoreply: "Auto-reply" }[tab];
}

function ProfileTab({ account, onAccountUpdated }: { account: MailAccount; onAccountUpdated: (account: MailAccount) => void }) {
  const [displayName, setDisplayName] = useState(account.display_name);
  const [signature, setSignature] = useState(account.signature ?? "");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function save() {
    setSaving(true);
    try {
      const updated = await api.updateAccount({ display_name: displayName, cache_ttl_days: account.cache_ttl_days || 30, signature: signature || null });
      onAccountUpdated(updated);
      toast.show("Profile updated");
    } catch {
      toast.show("Could not save your profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="form-group">
        <label>Email address</label>
        <input className="form-input" value={account.address} disabled />
      </div>
      <div className="form-group">
        <label>Display name</label>
        <input className="form-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
      </div>
      <div className="form-group">
        <label>Signature</label>
        <textarea className="form-textarea" value={signature} onChange={(event) => setSignature(event.target.value)} rows={4} />
      </div>
      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function submit() {
    setSaving(true);
    try {
      await api.changePassword({ current_password: currentPassword, new_password: newPassword });
      toast.show("Password changed");
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      toast.show("Could not change your password — check the current password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="form-group">
        <label>Current password</label>
        <input className="form-input" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
      </div>
      <div className="form-group">
        <label>New password</label>
        <input className="form-input" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
        <p className="form-hint">At least 8 characters.</p>
      </div>
      <button className="btn btn-primary" onClick={submit} disabled={saving || !currentPassword || newPassword.length < 8}>
        {saving ? "Updating…" : "Change password"}
      </button>
    </div>
  );
}

function AliasesTab() {
  const [aliases, setAliases] = useState<AliasInfo[] | null>(null);
  const [localPart, setLocalPart] = useState("");
  const toast = useToast();

  useEffect(() => {
    api.listAliases().then(setAliases).catch(() => setAliases([]));
  }, []);

  async function add() {
    if (!localPart.trim()) return;
    try {
      const created = await api.createAlias(localPart.trim());
      setAliases((prev) => [...(prev ?? []), created]);
      setLocalPart("");
    } catch {
      toast.show("Could not create that alias");
    }
  }

  async function remove(id: string) {
    try {
      await api.deleteAlias(id);
      setAliases((prev) => (prev ?? []).filter((item) => item.id !== id));
    } catch {
      toast.show("Could not remove that alias");
    }
  }

  if (aliases === null) return <p>Loading…</p>;

  return (
    <div>
      <div className="form-row" style={{ marginBottom: 18 }}>
        <input
          className="form-input"
          placeholder="alias-name"
          value={localPart}
          onChange={(event) => setLocalPart(event.target.value)}
        />
        <button className="btn btn-secondary" onClick={add}>
          <Plus size={15} /> Add alias
        </button>
      </div>
      {aliases.length === 0 && <p className="form-hint">No aliases yet.</p>}
      {aliases.map((alias) => (
        <div className="list-item-row" key={alias.id}>
          <div className="grow">
            <strong>{alias.address ?? alias.local_part}</strong>
          </div>
          <button className="icon-btn" onClick={() => remove(alias.id)}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

function ForwardersTab() {
  const [forwarders, setForwarders] = useState<ForwarderInfo[] | null>(null);
  const [destination, setDestination] = useState("");
  const [keepCopy, setKeepCopy] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api.listForwarders().then(setForwarders).catch(() => setForwarders([]));
  }, []);

  async function add() {
    if (!destination.trim()) return;
    try {
      const created = await api.createForwarder(destination.trim(), keepCopy);
      setForwarders((prev) => [...(prev ?? []), created]);
      setDestination("");
    } catch {
      toast.show("Could not create that forwarder");
    }
  }

  async function remove(id: string) {
    try {
      await api.deleteForwarder(id);
      setForwarders((prev) => (prev ?? []).filter((item) => item.id !== id));
    } catch {
      toast.show("Could not remove that forwarder");
    }
  }

  if (forwarders === null) return <p>Loading…</p>;

  return (
    <div>
      <div className="form-group">
        <label>Forward a copy of new mail to</label>
        <div className="form-row">
          <input className="form-input" placeholder="name@example.com" value={destination} onChange={(event) => setDestination(event.target.value)} />
          <button className="btn btn-secondary" onClick={add}>
            <Plus size={15} /> Add
          </button>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontWeight: 400 }}>
          <input type="checkbox" checked={keepCopy} onChange={(event) => setKeepCopy(event.target.checked)} />
          Keep a copy in this mailbox
        </label>
      </div>
      {forwarders.length === 0 && <p className="form-hint">No forwarders yet.</p>}
      {forwarders.map((forwarder) => (
        <div className="list-item-row" key={forwarder.id}>
          <div className="grow">
            <strong>{forwarder.destination}</strong>
            <span>{forwarder.is_keep_copy_enabled ? "Keeps a copy" : "Forward only"}</span>
          </div>
          <button className="icon-btn" onClick={() => remove(forwarder.id)}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

function AutoreplyTab() {
  const [autoreplies, setAutoreplies] = useState<AutoreplyInfo[] | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const toast = useToast();

  useEffect(() => {
    api.listAutoreplies().then(setAutoreplies).catch(() => setAutoreplies([]));
  }, []);

  async function add() {
    if (!subject.trim() || !body.trim()) return;
    try {
      const created = await api.createAutoreply({ subject, body });
      setAutoreplies((prev) => [...(prev ?? []), created]);
      setSubject("");
      setBody("");
    } catch {
      toast.show("Could not save the auto-reply");
    }
  }

  async function remove(id: string) {
    try {
      await api.deleteAutoreply(id);
      setAutoreplies((prev) => (prev ?? []).filter((item) => item.id !== id));
    } catch {
      toast.show("Could not remove the auto-reply");
    }
  }

  if (autoreplies === null) return <p>Loading…</p>;

  return (
    <div>
      {autoreplies.map((autoreply) => (
        <div className="list-item-row" key={autoreply.id}>
          <div className="grow">
            <strong>{autoreply.subject}</strong>
            <span>{autoreply.body.slice(0, 80)}</span>
          </div>
          <button className="icon-btn" onClick={() => remove(autoreply.id)}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <div className="form-group" style={{ marginTop: 16 }}>
        <label>Subject</label>
        <input className="form-input" value={subject} onChange={(event) => setSubject(event.target.value)} />
      </div>
      <div className="form-group">
        <label>Message</label>
        <textarea className="form-textarea" value={body} onChange={(event) => setBody(event.target.value)} rows={4} />
      </div>
      <button className="btn btn-primary" onClick={add}>
        <Plus size={15} /> Turn on auto-reply
      </button>
    </div>
  );
}
