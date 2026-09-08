"use client";

import { useState } from "react";
import { Columns2, Keyboard, ListFilter, Menu, Moon, RefreshCw, Rows2, Search, Settings, ShieldCheck, Sun, X } from "lucide-react";
import type { MailAccount } from "@/lib/types";
import type { StoredAccount } from "@/lib/api";
import type { ThemeMode } from "@/lib/theme";
import { AccountSwitcherMenu } from "./AccountSwitcherMenu";
import { hasActiveFilters, SearchFilterPopover, type SearchFilters } from "./SearchFilterPopover";
import type { SplitMode } from "./MailApp";

export function TopBar({
  account,
  accounts,
  search,
  onSearchChange,
  onSearchSubmit,
  filters,
  onFiltersChange,
  onRefresh,
  refreshing,
  theme,
  onToggleTheme,
  onToggleMobileRail,
  onSwitchAccount,
  onAddAccount,
  onLogout,
  onOpenSettings,
  splitMode,
  onToggleSplitMode,
  onShowShortcuts,
}: {
  account: MailAccount;
  accounts: StoredAccount[];
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters, apply: boolean) => void;
  onRefresh: () => void;
  refreshing: boolean;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onToggleMobileRail: () => void;
  onSwitchAccount: (address: string) => void;
  onAddAccount: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  splitMode: SplitMode;
  onToggleSplitMode: () => void;
  onShowShortcuts: () => void;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const filtersActive = hasActiveFilters(filters);

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
          id="mail-search-input"
          placeholder="Search mail"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        {search && (
          <button type="button" onClick={() => onSearchChange("")}>
            <X size={16} />
          </button>
        )}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className={`icon-btn ${filtersActive ? "active" : ""}`}
            title="Search filters"
            onClick={(event) => {
              event.stopPropagation();
              setFilterOpen((v) => !v);
            }}
          >
            <ListFilter size={16} />
          </button>
          {filterOpen && (
            <SearchFilterPopover
              filters={filters}
              onChange={(next) => onFiltersChange(next, false)}
              onApply={() => onFiltersChange(filters, true)}
              onClose={() => setFilterOpen(false)}
            />
          )}
        </div>
      </form>
      <div className="topbar-actions">
        <button className="icon-btn" onClick={onShowShortcuts} title="Keyboard shortcuts (?)">
          <Keyboard size={19} />
        </button>
        <button
          className="icon-btn"
          onClick={onToggleSplitMode}
          title={splitMode === "right" ? "Switch to single view" : "Switch to split view"}
        >
          {splitMode === "right" ? <Rows2 size={19} /> : <Columns2 size={19} />}
        </button>
        <button className="icon-btn" onClick={onRefresh} title="Refresh" disabled={refreshing}>
          <RefreshCw size={19} style={refreshing ? { animation: "spin 0.8s linear infinite" } : undefined} />
        </button>
        <button className="icon-btn" onClick={onToggleTheme} title="Toggle theme">
          {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <button className="icon-btn" onClick={onOpenSettings} title="Settings">
          <Settings size={19} />
        </button>
        {account.role === "admin" && (
          <a className="icon-btn" href="/admin" title="Admin panel">
            <ShieldCheck size={19} />
          </a>
        )}
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
