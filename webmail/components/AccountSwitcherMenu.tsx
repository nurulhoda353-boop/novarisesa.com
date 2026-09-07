"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, Settings, UserPlus } from "lucide-react";
import type { MailAccount } from "@/lib/types";
import type { StoredAccount } from "@/lib/api";
import { avatarColorFor } from "@/lib/avatar";
import { initials } from "@/lib/format";

export function AccountSwitcherMenu({
  account,
  accounts,
  onSwitch,
  onAddAccount,
  onLogout,
  onOpenSettings,
}: {
  account: MailAccount;
  accounts: StoredAccount[];
  onSwitch: (address: string) => void;
  onAddAccount: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="account-avatar-btn" onClick={() => setOpen((v) => !v)} title={account.address}>
        <span className="avatar ring" style={{ background: avatarColorFor(account.address) }}>
          {account.avatar_url ? <img src={account.avatar_url} alt="" /> : initials(account.display_name, account.address)}
        </span>
      </button>
      {open && (
        <div className="popover" style={{ right: 0, top: "calc(100% + 8px)", left: "auto", minWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px 14px" }}>
            <span className="avatar lg" style={{ background: avatarColorFor(account.address) }}>
              {account.avatar_url ? <img src={account.avatar_url} alt="" /> : initials(account.display_name, account.address)}
            </span>
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: "block", fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {account.display_name}
              </strong>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{account.address}</span>
            </div>
          </div>
          <button className="popover-item" onClick={() => { setOpen(false); onOpenSettings(); }}>
            <Settings size={16} /> Manage account
          </button>
          <div className="popover-divider" />
          {accounts
            .filter((item) => item.address !== account.address)
            .map((item) => (
              <button
                key={item.address}
                className="popover-item"
                onClick={() => {
                  setOpen(false);
                  onSwitch(item.address);
                }}
              >
                <span className="avatar sm" style={{ background: avatarColorFor(item.address) }}>
                  {item.avatar_url ? <img src={item.avatar_url} alt="" /> : initials(item.display_name, item.address)}
                </span>
                {item.address}
              </button>
            ))}
          <button className="popover-item" onClick={() => { setOpen(false); onAddAccount(); }}>
            <UserPlus size={16} /> Add another account
          </button>
          <div className="popover-divider" />
          <button className="popover-item" onClick={() => { setOpen(false); onLogout(); }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
