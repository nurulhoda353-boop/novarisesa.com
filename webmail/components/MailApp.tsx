"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as api from "@/lib/api";
import type { StoredAccount } from "@/lib/api";
import type { ComposeInitial, FolderInfo, MailAccount, MailMessageSummary } from "@/lib/types";
import { SYSTEM_FOLDERS } from "@/lib/types";
import { groupIntoThreads, type MailThread } from "@/lib/threads";
import { useTheme } from "@/lib/theme";
import { ToastProvider, useToast } from "@/lib/toast";
import { LoginScreen } from "./LoginScreen";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MessageList } from "./MessageList";
import { MessageView } from "./MessageView";
import { DraftsList } from "./DraftsList";
import { ComposeWindow, type ComposeWindowHandle } from "./ComposeWindow";
import { SettingsModal } from "./SettingsModal";
import { SnoozePopover } from "./SnoozePopover";

const PAGE_SIZE = 30;

function imapFolderFor(key: string): string {
  if (key === SYSTEM_FOLDERS.starred) return SYSTEM_FOLDERS.inbox;
  return key;
}

export function MailApp() {
  return (
    <ToastProvider>
      <MailAppInner />
    </ToastProvider>
  );
}

function MailAppInner() {
  const [booting, setBooting] = useState(true);
  const [account, setAccount] = useState<MailAccount | null>(null);
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [addingAccount, setAddingAccount] = useState(false);
  const [theme, toggleTheme] = useTheme();
  const toast = useToast();

  const [activeFolder, setActiveFolder] = useState<string>(SYSTEM_FOLDERS.inbox);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [messages, setMessages] = useState<MailMessageSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextBeforeUid, setNextBeforeUid] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [openThread, setOpenThread] = useState<MailThread | null>(null);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [draftsRefreshKey, setDraftsRefreshKey] = useState(0);
  const [snoozeCount, setSnoozeCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);

  const [composeWindows, setComposeWindows] = useState<ComposeWindowHandle[]>([]);
  const composeCounter = useRef(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [snoozeTarget, setSnoozeTarget] = useState<{ anchor: HTMLElement; apply: (date: Date) => void } | null>(null);
  const [mobileRailOpen, setMobileRailOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const wsRetryRef = useRef(0);

  const loadFolders = useCallback(() => {
    api.listFolders().then(setFolders).catch(() => {});
    api.listSnoozes().then((rows) => setSnoozeCount(rows.length)).catch(() => {});
    api.listDrafts().then((rows) => setDraftCount(rows.length)).catch(() => {});
  }, []);

  const loadMessages = useCallback(
    async (folder: string, options: { append?: boolean; beforeUid?: number; q?: string } = {}) => {
      if (folder === SYSTEM_FOLDERS.drafts) return;
      const setBusy = options.append ? setLoadingMore : setLoading;
      setBusy(true);
      try {
        const result = await api.listMessages({
          folder: imapFolderFor(folder),
          limit: PAGE_SIZE,
          before_uid: options.beforeUid,
          q: options.q || undefined,
          starred: folder === SYSTEM_FOLDERS.starred ? true : undefined,
        });
        setMessages((prev) => (options.append ? [...prev, ...result.data] : result.data));
        setNextBeforeUid(result.next_before_uid);
      } catch {
        toast.show("Could not load messages");
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );

  const refreshCurrent = useCallback(() => {
    loadMessages(activeFolder, { q: activeSearch });
    loadFolders();
  }, [activeFolder, activeSearch, loadMessages, loadFolders]);

  // ---- Bootstrapping ----
  useEffect(() => {
    api.setSessionListener((next) => {
      setAccount(next);
      setAccounts(api.savedAccounts());
    });
    api
      .ensureSession()
      .then((existing) => {
        setAccount(existing);
        setAccounts(api.savedAccounts());
      })
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    if (!account) return;
    setOpenThread(null);
    setSelected(new Set());
    setActiveSearch("");
    setSearch("");
    if (activeFolder === SYSTEM_FOLDERS.drafts) {
      setDraftsRefreshKey((v) => v + 1);
    } else {
      loadMessages(activeFolder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, activeFolder]);

  useEffect(() => {
    if (!account) return;
    loadFolders();
    const interval = window.setInterval(loadFolders, 60_000);
    return () => window.clearInterval(interval);
  }, [account, loadFolders]);

  // ---- Real-time push ----
  useEffect(() => {
    if (!account) return;
    let closedByUs = false;

    function connect() {
      const socket = new WebSocket(api.wsUrl());
      wsRef.current = socket;
      socket.onopen = () => {
        wsRetryRef.current = 0;
      };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as { type?: string };
          if (payload.type === "new_mail") {
            loadFolders();
            if (activeFolder === SYSTEM_FOLDERS.inbox) {
              loadMessages(SYSTEM_FOLDERS.inbox);
            } else {
              toast.show("New mail arrived in your inbox", { actionLabel: "View", onAction: () => setActiveFolder(SYSTEM_FOLDERS.inbox) });
            }
          }
        } catch {
          // ignore malformed frames
        }
      };
      socket.onclose = () => {
        if (closedByUs) return;
        const delay = Math.min(30_000, 1000 * 2 ** wsRetryRef.current);
        wsRetryRef.current += 1;
        window.setTimeout(connect, delay);
      };
    }
    connect();
    return () => {
      closedByUs = true;
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  function handleSearchSubmit() {
    setActiveSearch(search);
    setOpenThread(null);
    loadMessages(activeFolder, { q: search });
  }

  function toggleSelect(uid: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }
  function toggleSelectAll() {
    setSelected((prev) => (prev.size === messages.length ? new Set() : new Set(messages.map((item) => item.uid))));
  }

  function removeFromList(uids: number[]) {
    setMessages((prev) => prev.filter((item) => !uids.includes(item.uid)));
    setSelected((prev) => {
      const next = new Set(prev);
      uids.forEach((uid) => next.delete(uid));
      return next;
    });
  }

  async function moveAndDrop(message: MailMessageSummary, destination: string) {
    try {
      await api.moveMessage(imapFolderFor(activeFolder), message.uid, destination);
      removeFromList([message.uid]);
    } catch {
      toast.show("That action could not be completed");
    }
  }

  async function handleArchive(message: MailMessageSummary) {
    await moveAndDrop(message, SYSTEM_FOLDERS.archive);
  }
  async function handleDelete(message: MailMessageSummary) {
    if (activeFolder === SYSTEM_FOLDERS.trash) {
      try {
        await api.deleteMessage(imapFolderFor(activeFolder), message.uid);
        removeFromList([message.uid]);
      } catch {
        toast.show("Could not delete permanently");
      }
    } else {
      await moveAndDrop(message, SYSTEM_FOLDERS.trash);
    }
  }
  async function handleToggleStar(message: MailMessageSummary) {
    const willStar = !message.flags.includes("\\Flagged");
    setMessages((prev) =>
      prev.map((item) =>
        item.uid === message.uid
          ? { ...item, flags: willStar ? [...item.flags, "\\Flagged"] : item.flags.filter((flag) => flag !== "\\Flagged") }
          : item,
      ),
    );
    try {
      await api.setStar(imapFolderFor(activeFolder), message.uid, willStar);
    } catch {
      toast.show("Could not update the star");
    }
  }
  async function handleMarkRead(message: MailMessageSummary, value: boolean) {
    setMessages((prev) =>
      prev.map((item) =>
        item.uid === message.uid
          ? { ...item, flags: value ? [...new Set([...item.flags, "\\Seen"])] : item.flags.filter((flag) => flag !== "\\Seen") }
          : item,
      ),
    );
    try {
      await api.setRead(imapFolderFor(activeFolder), message.uid, value);
    } catch {
      toast.show("Could not update the message");
    }
  }

  function openSnoozeFor(message: MailMessageSummary, anchor: HTMLElement) {
    setSnoozeTarget({
      anchor,
      apply: async (date) => {
        try {
          await api.snoozeMessage(imapFolderFor(activeFolder), message.uid, date.toISOString());
          removeFromList([message.uid]);
          loadFolders();
          toast.show(`Snoozed until ${date.toLocaleString()}`);
        } catch {
          toast.show("Could not snooze this message");
        } finally {
          setSnoozeTarget(null);
        }
      },
    });
  }

  function openMessage(message: MailMessageSummary) {
    const threads = groupIntoThreads(messages);
    const thread = threads.find((item) => item.messages.some((m) => m.uid === message.uid));
    setOpenThread(thread ?? { messages: [message] });
  }

  async function handleThreadAction(action: "archive" | "trash" | "unread" | "moveToInbox") {
    if (!openThread) return;
    const uids = openThread.messages.map((m) => m.uid);
    try {
      if (action === "unread") {
        await Promise.all(uids.map((uid) => api.setRead(imapFolderFor(activeFolder), uid, false)));
      } else {
        const destination =
          action === "archive" ? SYSTEM_FOLDERS.archive : action === "moveToInbox" ? SYSTEM_FOLDERS.inbox : SYSTEM_FOLDERS.trash;
        if (action === "trash" && activeFolder === SYSTEM_FOLDERS.trash) {
          await Promise.all(uids.map((uid) => api.deleteMessage(imapFolderFor(activeFolder), uid)));
        } else {
          await Promise.all(uids.map((uid) => api.moveMessage(imapFolderFor(activeFolder), uid, destination)));
        }
      }
      removeFromList(uids);
      setOpenThread(null);
    } catch {
      toast.show("That action could not be completed");
    }
  }

  function openCompose(initial: ComposeInitial) {
    composeCounter.current += 1;
    setComposeWindows((prev) => [...prev, { id: composeCounter.current, initial }].slice(-3));
  }
  function closeCompose(id: number) {
    setComposeWindows((prev) => prev.filter((item) => item.id !== id));
    if (activeFolder === SYSTEM_FOLDERS.drafts) setDraftsRefreshKey((v) => v + 1);
    loadFolders();
  }

  async function handleAddAccount(nextAccount: MailAccount) {
    setAddingAccount(false);
    setAccount(nextAccount);
    setAccounts(api.savedAccounts());
    setActiveFolder(SYSTEM_FOLDERS.inbox);
  }

  async function handleSwitchAccount(address: string) {
    const next = await api.switchAccount(address);
    if (next) {
      setAccount(next);
      setActiveFolder(SYSTEM_FOLDERS.inbox);
      setMessages([]);
    } else {
      toast.show("Could not switch accounts — please sign in again");
    }
  }

  async function handleLogout() {
    await api.logout();
    setAccounts(api.savedAccounts());
    const remaining = api.savedAccounts();
    if (remaining.length > 0) {
      await handleSwitchAccount(remaining[0].address);
    } else {
      setAccount(null);
    }
  }

  const inboxUnread = useMemo(() => folders.find((f) => f.name === SYSTEM_FOLDERS.inbox)?.unseen ?? 0, [folders]);

  if (booting) return null;

  if (!account) {
    return <LoginScreen onSuccess={(next) => { setAccount(next); setAccounts(api.savedAccounts()); }} />;
  }

  return (
    <div className="app-shell">
      <TopBar
        account={account}
        accounts={accounts}
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={handleSearchSubmit}
        onRefresh={refreshCurrent}
        refreshing={loading}
        theme={theme}
        onToggleTheme={toggleTheme}
        onToggleMobileRail={() => setMobileRailOpen((v) => !v)}
        onSwitchAccount={handleSwitchAccount}
        onAddAccount={() => setAddingAccount(true)}
        onLogout={handleLogout}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="body-row">
        <Sidebar
          collapsed={false}
          mobileOpen={mobileRailOpen}
          activeFolder={activeFolder}
          counts={{ inboxUnread, draftCount, snoozeCount }}
          onSelectFolder={(folder) => {
            setActiveFolder(folder);
            setMobileRailOpen(false);
          }}
          onCompose={() => openCompose({ mode: "new" })}
        />
        <div className="main-panel">
          {activeFolder === SYSTEM_FOLDERS.drafts ? (
            <DraftsList onOpenDraft={openCompose} refreshKey={draftsRefreshKey} />
          ) : openThread ? (
            <MessageView
              thread={openThread}
              folder={imapFolderFor(activeFolder)}
              account={account}
              onBack={() => setOpenThread(null)}
              onThreadAction={handleThreadAction}
              onSnoozeRequest={(anchor) => openSnoozeFor(openThread.messages[openThread.messages.length - 1], anchor)}
              onCompose={openCompose}
            />
          ) : (
            <MessageList
              folder={imapFolderFor(activeFolder)}
              messages={messages}
              selected={selected}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onOpen={openMessage}
              onToggleStar={handleToggleStar}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onSnooze={openSnoozeFor}
              onMarkRead={handleMarkRead}
              hasMore={nextBeforeUid !== null}
              loadingMore={loadingMore}
              onLoadMore={() => nextBeforeUid && loadMessages(activeFolder, { append: true, beforeUid: nextBeforeUid, q: activeSearch })}
              loading={loading}
            />
          )}
        </div>
      </div>

      {composeWindows.map((handle) => (
        <ComposeWindow key={handle.id} handle={handle} account={account} onClose={closeCompose} />
      ))}

      {settingsOpen && (
        <SettingsModal
          account={account}
          onClose={() => setSettingsOpen(false)}
          onAccountUpdated={(updated) => setAccount(updated)}
        />
      )}

      {snoozeTarget && (
        <SnoozePopover anchor={snoozeTarget.anchor} onPick={snoozeTarget.apply} onClose={() => setSnoozeTarget(null)} />
      )}

      {addingAccount && (
        <div className="modal-overlay" onClick={() => setAddingAccount(false)}>
          <div onClick={(event) => event.stopPropagation()}>
            <LoginScreen compact onSuccess={handleAddAccount} onCancel={() => setAddingAccount(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
