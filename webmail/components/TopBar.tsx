"use client";

import { Menu, Moon, RefreshCw, Search, Settings, Sun, X } from "lucide-react";
import type { MailAccount } from "@/lib/types";
import type { StoredAccount } from "@/lib/api";
import type { ThemeMode } from "@/lib/theme";
import { AccountSwitcherMenu } from "./AccountSwitcherMenu";

export function TopBar({
  account,
  accounts,
  search,
  onSearchChange,
  onSearchSubmit,
  onRefresh,
  refreshing,
  theme,
  onToggleTheme,
  onToggleMobileRail,
  onSwitchAccount,
  onAddAccount,
  onLogout,
  onOpenSettings,
}: {
  account: MailAccount;
  accounts: StoredAccount[];
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onToggleMobileRail: () => void;
  onSwitchAccount: (address: string) => void;
  onAddAccount: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onToggleMobileRail} title="Menu" style={{ display: "none" }} id="mobile-menu-btn">
        <Menu size={20} />
      </button>
      <div className="brand-mark">
        <img src="/novamail-icon.png" alt="Novamail" />
        <span>Novamail</span>
      </div>
      <form
        className="search-box"
        onSubmit={(event) => {
          event.preventDefault();
          onSearchSubmit();
        }}
      >
        <Search size={17} />
        <input
          placeholder="Search mail"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        {search && (
          <button type="button" onClick={() => onSearchChange("")}>
            <X size={16} />
          </button>
        )}
      </form>
      <div className="topbar-actions">
        <button className="icon-btn" onClick={onRefresh} title="Refresh" disabled={refreshing}>
          <RefreshCw size={19} style={refreshing ? { animation: "spin 0.8s linear infinite" } : undefined} />
        </button>
        <button className="icon-btn" onClick={onToggleTheme} title="Toggle theme">
          {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <button className="icon-btn" onClick={onOpenSettings} title="Settings">
          <Settings size={19} />
        </button>
        <AccountSwitcherMenu
          account={account}
          accounts={accounts}
          onSwitch={onSwitchAccount}
          onAddAccount={onAddAccount}
          onLogout={onLogout}
          onOpenSettings={onOpenSettings}
        />
      </div>
      <style jsx>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 980px) {
          #mobile-menu-btn { display: grid !important; }
        }
      `}</style>
    </header>
  );
}
