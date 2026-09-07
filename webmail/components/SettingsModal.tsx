"use client";

import { useEffect, useState } from "react";
import { Plus, Star, Trash2, X } from "lucide-react";
import * as api from "@/lib/api";
import type { AliasInfo, AutoreplyInfo, ContactInfo, ForwarderInfo, MailAccount, MailChangeRequestInfo, MailRuleInfo } from "@/lib/types";
import { initials } from "@/lib/format";
import { useToast } from "@/lib/toast";

type Tab = "profile" | "security" | "contacts" | "aliases" | "forwarders" | "autoreply" | "rules";

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
          {(["profile", "security", "contacts", "aliases", "forwarders", "autoreply", "rules"] as Tab[]).map((item) => (
            <button key={item} className={`modal-tab ${tab === item ? "active" : ""}`} onClick={() => setTab(item)}>
              {labelFor(item)}
            </button>
          ))}
        </div>
        <div className="modal-body">
          {tab === "profile" && <ProfileTab account={account} onAccountUpdated={onAccountUpdated} />}
          {tab === "security" && <SecurityTab account={account} />}
          {tab === "contacts" && <ContactsTab />}
          {tab === "aliases" && <AliasesTab />}
          {tab === "forwarders" && <ForwardersTab />}
          {tab === "autoreply" && <AutoreplyTab />}
          {tab === "rules" && <RulesTab />}
        </div>
      </div>
    </div>
  );
}

function labelFor(tab: Tab): string {
  return {
    profile: "Profile",
    security: "Security",
    contacts: "Contacts",
    aliases: "Aliases",
    forwarders: "Forwarders",
    autoreply: "Auto-reply",
    rules: "Rules",
  }[tab];
}

function ProfileTab({ account, onAccountUpdated }: { account: MailAccount; onAccountUpdated: (account: MailAccount) => void }) {
  const isMember = account.role === "member";
  const [displayName, setDisplayName] = useState(account.display_name);
  const [signature, setSignature] = useState(account.signature ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pending, setPending] = useState<MailChangeRequestInfo[]>([]);
  const toast = useToast();

  useEffect(() => {
    if (!isMember) return;
    api.myChangeRequests().then((rows) => setPending(rows.filter((row) => row.status === "pending"))).catch(() => {});
  }, [isMember]);

  const nameChanged = displayName !== account.display_name;
  const namePending = pending.some((row) => row.request_type === "display_name");

  async function save() {
    setSaving(true);
    try {
      if (isMember && nameChanged) {
        await api.requestChange("display_name", displayName);
        setPending((prev) => [...prev, { id: "pending", request_type: "display_name", status: "pending", rejection_reason: null, created_at: "", resolved_at: null }]);
        toast.show("Name change sent for admin approval");
      }
      const updated = await api.updateAccount({
        display_name: isMember ? account.display_name : displayName,
        cache_ttl_days: account.cache_ttl_days || 30,
        signature: signature || null,
      });
      onAccountUpdated(updated);
      if (!(isMember && nameChanged)) toast.show("Profile updated");
    } catch {
      toast.show("Could not save your profile");
    } finally {
      setSaving(false);
    }
  }

  async function pickAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const updated = await api.uploadAvatar(file);
      onAccountUpdated(updated);
      toast.show(updated.avatar_url !== account.avatar_url ? "Profile photo updated" : "Photo sent for admin approval");
    } catch {
      toast.show("Could not upload that photo");
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <div>
      <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div className="avatar lg">
          {account.avatar_url ? <img src={account.avatar_url} alt="" /> : initials(account.display_name, account.address)}
        </div>
        <label className="btn btn-secondary sm" style={{ cursor: "pointer" }}>
          {uploadingAvatar ? "Uploading…" : "Change photo"}
          <input type="file" accept="image/*" onChange={pickAvatar} disabled={uploadingAvatar} hidden />
        </label>
      </div>
      <div className="form-group">
        <label>Email address</label>
        <input className="form-input" value={account.address} disabled />
      </div>
      <div className="form-group">
        <label>Display name</label>
        <input className="form-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        {isMember && (
          <p className="form-hint">
            {namePending ? "A name change is waiting for admin approval." : "Changing this needs admin approval."}
          </p>
        )}
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

function SecurityTab({ account }: { account: MailAccount }) {
  const isMember = account.role === "member";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!isMember) return;
    api
      .myChangeRequests()
      .then((rows) => setPending(rows.some((row) => row.request_type === "password" && row.status === "pending")))
      .catch(() => {});
  }, [isMember]);

  async function submit() {
    setSaving(true);
    try {
      if (isMember) {
        await api.requestChange("password", newPassword);
        setPending(true);
        toast.show("Password change sent for admin approval");
      } else {
        await api.changePassword({ current_password: currentPassword, new_password: newPassword });
        toast.show("Password changed");
        setCurrentPassword("");
      }
      setNewPassword("");
    } catch {
      toast.show(isMember ? "Could not send that request" : "Could not change your password — check the current password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {isMember ? (
        <p className="form-hint" style={{ marginBottom: 16 }}>
          {pending
            ? "A password change is waiting for admin approval."
            : "Password changes need admin approval — pick a new one below and send it for review."}
        </p>
      ) : (
        <div className="form-group">
          <label>Current password</label>
          <input className="form-input" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
        </div>
      )}
      <div className="form-group">
        <label>New password</label>
        <input className="form-input" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
        <p className="form-hint">At least 8 characters.</p>
      </div>
      <button
        className="btn btn-primary"
        onClick={submit}
        disabled={saving || (!isMember && !currentPassword) || newPassword.length < 8}
      >
        {saving ? "Sending…" : isMember ? "Send for approval" : "Change password"}
      </button>
    </div>
  );
}

function ContactsTab() {
  const [contacts, setContacts] = useState<ContactInfo[] | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const toast = useToast();

  useEffect(() => {
    api.listContacts().then(setContacts).catch(() => setContacts([]));
  }, []);

  async function add() {
    if (!email.trim()) return;
    try {
      const created = await api.createContact({ email: email.trim(), display_name: displayName.trim() });
      setContacts((prev) => [...(prev ?? []), created]);
      setEmail("");
      setDisplayName("");
    } catch {
      toast.show("Could not save that contact");
    }
  }

  async function toggleFavorite(contact: ContactInfo) {
    try {
      const updated = await api.updateContact(contact.id, {
        display_name: contact.display_name,
        phone: contact.phone,
        company: contact.company,
        is_favorite: !contact.is_favorite,
      });
      setContacts((prev) => (prev ?? []).map((item) => (item.id === contact.id ? updated : item)));
    } catch {
      toast.show("Could not update that contact");
    }
  }

  async function remove(id: string) {
    try {
      await api.deleteContact(id);
      setContacts((prev) => (prev ?? []).filter((item) => item.id !== id));
    } catch {
      toast.show("Could not remove that contact");
    }
  }

  if (contacts === null) return <p>Loading…</p>;

  return (
    <div>
      <div className="form-row" style={{ marginBottom: 18 }}>
        <input
          className="form-input"
          placeholder="Name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <input
          className="form-input"
          placeholder="name@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button className="btn btn-secondary" onClick={add}>
          <Plus size={15} /> Add
        </button>
      </div>
      {contacts.length === 0 && <p className="form-hint">No saved contacts yet.</p>}
      {contacts.map((contact) => (
        <div className="list-item-row" key={contact.id}>
          <button className="icon-btn" onClick={() => toggleFavorite(contact)} title={contact.is_favorite ? "Unstar" : "Star"}>
            <Star size={16} fill={contact.is_favorite ? "var(--star)" : "none"} color={contact.is_favorite ? "var(--star)" : undefined} />
          </button>
          <div className="grow">
            <strong>{contact.display_name || contact.email}</strong>
            <span>{contact.email}</span>
          </div>
          <button className="icon-btn" onClick={() => remove(contact.id)}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
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

const DESTINATION_PRESETS = [
  { value: "INBOX.Archive", label: "Archive" },
  { value: "INBOX.Junk", label: "Spam" },
  { value: "INBOX.Trash", label: "Trash" },
  { value: "__custom__", label: "Custom folder…" },
];

function folderLabel(destination: string): string {
  const preset = DESTINATION_PRESETS.find((item) => item.value === destination);
  if (preset) return preset.label;
  return destination.replace(/^INBOX\./, "");
}

function RulesTab() {
  const [rules, setRules] = useState<MailRuleInfo[] | null>(null);
  const [fromContains, setFromContains] = useState("");
  const [subjectContains, setSubjectContains] = useState("");
  const [destinationPreset, setDestinationPreset] = useState(DESTINATION_PRESETS[0].value);
  const [customLabel, setCustomLabel] = useState("");
  const toast = useToast();

  useEffect(() => {
    api.listRules().then(setRules).catch(() => setRules([]));
  }, []);

  async function add() {
    if (!fromContains.trim() && !subjectContains.trim()) {
      toast.show("Add a From or Subject condition first");
      return;
    }
    const destination =
      destinationPreset === "__custom__"
        ? `INBOX.${customLabel.trim().replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "-")}`
        : destinationPreset;
    if (destinationPreset === "__custom__" && !customLabel.trim()) {
      toast.show("Name the custom folder first");
      return;
    }
    try {
      const created = await api.createRule({
        name: fromContains || subjectContains,
        from_contains: fromContains.trim() || null,
        subject_contains: subjectContains.trim() || null,
        destination_folder: destination,
        is_enabled: true,
      });
      setRules((prev) => [...(prev ?? []), created]);
      setFromContains("");
      setSubjectContains("");
      setCustomLabel("");
    } catch {
      toast.show("Could not save that rule");
    }
  }

  async function toggle(rule: MailRuleInfo) {
    try {
      const updated = await api.updateRule(rule.id, {
        name: rule.name,
        from_contains: rule.from_contains,
        subject_contains: rule.subject_contains,
        destination_folder: rule.destination_folder,
        is_enabled: !rule.is_enabled,
      });
      setRules((prev) => (prev ?? []).map((item) => (item.id === rule.id ? updated : item)));
    } catch {
      toast.show("Could not update that rule");
    }
  }

  async function remove(id: string) {
    try {
      await api.deleteRule(id);
      setRules((prev) => (prev ?? []).filter((item) => item.id !== id));
    } catch {
      toast.show("Could not remove that rule");
    }
  }

  if (rules === null) return <p>Loading…</p>;

  return (
    <div>
      <p className="form-hint" style={{ marginBottom: 16 }}>
        New mail matching a rule is filed automatically the moment it arrives — the first enabled rule that matches wins.
      </p>
      {rules.length === 0 && <p className="form-hint">No rules yet.</p>}
      {rules.map((rule) => (
        <div className="list-item-row" key={rule.id}>
          <input type="checkbox" checked={rule.is_enabled} onChange={() => toggle(rule)} />
          <div className="grow">
            <strong>
              {rule.from_contains && `From contains "${rule.from_contains}"`}
              {rule.from_contains && rule.subject_contains && " and "}
              {rule.subject_contains && `Subject contains "${rule.subject_contains}"`}
            </strong>
            <span>Move to {folderLabel(rule.destination_folder)}</span>
          </div>
          <button className="icon-btn" onClick={() => remove(rule.id)}>
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <div className="form-group" style={{ marginTop: 16 }}>
        <label>From contains</label>
        <input className="form-input" placeholder="billing@example.com" value={fromContains} onChange={(event) => setFromContains(event.target.value)} />
      </div>
      <div className="form-group">
        <label>Subject contains</label>
        <input className="form-input" placeholder="invoice" value={subjectContains} onChange={(event) => setSubjectContains(event.target.value)} />
      </div>
      <div className="form-group">
        <label>Move matching mail to</label>
        <select className="form-input" value={destinationPreset} onChange={(event) => setDestinationPreset(event.target.value)}>
          {DESTINATION_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>
      {destinationPreset === "__custom__" && (
        <div className="form-group">
          <label>Folder name</label>
          <input className="form-input" placeholder="Receipts" value={customLabel} onChange={(event) => setCustomLabel(event.target.value)} />
        </div>
      )}
      <button className="btn btn-primary" onClick={add}>
        <Plus size={15} /> Add rule
      </button>
    </div>
  );
}
