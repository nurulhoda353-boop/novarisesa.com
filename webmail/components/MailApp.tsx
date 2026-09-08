"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MailOpen } from "lucide-react";
import * as api from "@/lib/api";
import type { StoredAccount } from "@/lib/api";
import type { ComposeInitial, FolderInfo, MailAccount, MailMessageSummary, SendMailRequest } from "@/lib/types";
import { SYSTEM_FOLDERS } from "@/lib/types";
import { groupIntoThreads, type MailThread } from "@/lib/threads";
import { buildReplyInitial } from "@/lib/compose-helpers";
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
import { ShortcutsHelpModal } from "./ShortcutsHelpModal";
import { EMPTY_FILTERS, type SearchFilters } from "./SearchFilterPopover";

const PAGE_SIZE = 30;
const SPLIT_MODE_KEY = "novamail-split-mode";
const UNDO_SEND_MS = 5000;

// Offline fallback: the mobile app already caches each folder's plain
// (no search/filter) message list and falls back to it when a load fails,
// so a user who loses connectivity still sees their last-known mail
// instead of a blank error. Mirrors that here for web parity.
function messageCacheKey(address: string, folder: string): string {
  return `novamail-cache-${address}-${folder}`;
}

function cacheMessages(address: string, folder: string, data: MailMessageSummary[]): void {
  try {
    window.localStorage.setItem(messageCacheKey(address, folder), JSON.stringify(data));
  } catch {
    // Caching is a convenience, never let it disrupt a successful load.
  }
}

function loadCachedMessages(address: string, folder: string): MailMessageSummary[] | null {
  try {
    const raw = window.localStorage.getItem(messageCacheKey(address, folder));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MailMessageSummary[];
    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export type SplitMode = "none" | "right";

function imapFolderFor(key: string): string {
  if (key === SYSTEM_FOLDERS.starred) return SYSTEM_FOLDERS.inbox;
  return key;
}

interface PendingSend {
  id: number;
  timer: number;
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
  // The websocket's onmessage closure below is only ever created once per
  // connection (the effect deliberately doesn't depend on activeFolder -
  // switching folders shouldn't reconnect the socket), so it needs a ref
  // to read the *current* folder rather than the one open when connect()
  // ran; otherwise "new mail" arriving after a folder switch keeps
  // checking a stale value and picks the wrong branch (toast vs. reload).
  const activeFolderRef = useRef(activeFolder);
  activeFolderRef.current = activeFolder;
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [messages, setMessages] = useState<MailMessageSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextBeforeUid, setNextBeforeUid] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [openThread, setOpenThread] = useState<MailThread | null>(null);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [activeFilters, setActiveFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [draftsRefreshKey, setDraftsRefreshKey] = useState(0);
  const [snoozeCount, setSnoozeCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [offline, setOffline] = useState(false);

  const [composeWindows, setComposeWindows] = useState<ComposeWindowHandle[]>([]);
  const composeCounter = useRef(0);
  const pendingSendCounter = useRef(0);
  const pendingSends = useRef<Map<number, PendingSend>>(new Map());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [snoozeTarget, setSnoozeTarget] = useState<{ anchor: HTMLElement; apply: (date: Date) => void } | null>(null);
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [splitMode, setSplitMode] = useState<SplitMode>("none");

  const wsRef = useRef<WebSocket | null>(null);
  const wsRetryRef = useRef(0);

  const loadFolders = useCallback(() => {
    api.listFolders().then(setFolders).catch(() => {});
    api.listSnoozes().then((rows) => setSnoozeCount(rows.length)).catch(() => {});
    api.listDrafts().then((rows) => setDraftCount(rows.length)).catch(() => {});
  }, []);

  const loadMessages = useCallback(
    async (
      folder: string,
      options: { append?: boolean; beforeUid?: number; q?: string; filters?: SearchFilters } = {},
    ) => {
      if (folder === SYSTEM_FOLDERS.drafts) return;
      const setBusy = options.append ? setLoadingMore : setLoading;
      setBusy(true);
      const activeFilterSet = options.filters ?? EMPTY_FILTERS;
      const isPlainView =
        !options.append &&
        !options.q &&
        !activeFilterSet.from_contains &&
        !activeFilterSet.has_attachment &&
        !activeFilterSet.since &&
        !activeFilterSet.before;
      try {
        const result = await api.listMessages({
          folder: imapFolderFor(folder),
          limit: PAGE_SIZE,
          before_uid: options.beforeUid,
          q: options.q || undefined,
          starred: folder === SYSTEM_FOLDERS.starred ? true : undefined,
          from_contains: activeFilterSet.from_contains || undefined,
          has_attachment: activeFilterSet.has_attachment || undefined,
          since: activeFilterSet.since || undefined,
          before: activeFilterSet.before || undefined,
        });
        setMessages((prev) => (options.append ? [...prev, ...result.data] : result.data));
        setNextBeforeUid(result.next_before_uid);
        setOffline(false);
        if (isPlainView && account) cacheMessages(account.address, folder, result.data);
      } catch {
        if (isPlainView && account) {
          const cached = loadCachedMessages(account.address, folder);
          if (cached) {
            setMessages(cached);
            setNextBeforeUid(null);
            setOffline(true);
            toast.show("You're offline — showing saved mail");
            return;
          }
        }
        toast.show("Could not load messages");
      } finally {
        setBusy(false);
      }
    },
    [toast, account],
  );

  const refreshCurrent = useCallback(() => {
    loadMessages(activeFolder, { q: activeSearch, filters: activeFilters });
    loadFolders();
  }, [activeFolder, activeSearch, activeFilters, loadMessages, loadFolders]);

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
    setActiveFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    if (activeFolder === SYSTEM_FOLDERS.drafts) {
      setDraftsRefreshKey((v) => v + 1);
    } else {
      loadMessages(activeFolder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, activeFolder]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SPLIT_MODE_KEY);
      if (stored === "right") setSplitMode("right");
    } catch {
      // ignore
    }
  }, []);

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
            if (activeFolderRef.current === SYSTEM_FOLDERS.inbox) {
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
    loadMessages(activeFolder, { q: search, filters: activeFilters });
  }

  function handleFiltersChange(next: SearchFilters, apply: boolean) {
    setFilters(next);
    if (apply) {
      setActiveFilters(next);
      setOpenThread(null);
      loadMessages(activeFolder, { q: activeSearch, filters: next });
    }
  }

  function toggleSplitMode() {
    setSplitMode((prev) => {
      const next = prev === "right" ? "none" : "right";
      try {
        window.localStorage.setItem(SPLIT_MODE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
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

  async function replyToOpenThread(mode: "reply" | "replyAll" | "forward") {
    if (!openThread || !account) return;
    const latestMessage = openThread.messages[openThread.messages.length - 1];
    try {
      const detail = await api.getMessage(imapFolderFor(activeFolder), latestMessage.uid);
      openCompose(buildReplyInitial(detail, mode, account.address));
    } catch {
      toast.show("Could not open a reply for this message");
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

  function handleSendRequest(
    payload: SendMailRequest,
    meta: { draftId: string | null; files: File[]; initial: ComposeInitial },
  ) {
    pendingSendCounter.current += 1;
    const id = pendingSendCounter.current;

    async function actuallySend() {
      try {
        await api.sendMessage(payload);
        if (meta.draftId) await api.deleteDraft(meta.draftId).catch(() => {});
        loadFolders();
      } catch {
        toast.show("Could not send the message — it was not sent");
      }
      pendingSends.current.delete(id);
    }

    const timer = window.setTimeout(actuallySend, UNDO_SEND_MS);
    pendingSends.current.set(id, { id, timer });
    toast.show("Sending…", {
      actionLabel: "Undo",
      onAction: () => {
        window.clearTimeout(timer);
        pendingSends.current.delete(id);
        openCompose({ ...meta.initial, draftId: meta.draftId, attachmentFiles: meta.files });
      },
    });
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

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (settingsOpen || shortcutsOpen || snoozeTarget || addingAccount) {
        if (event.key === "Escape") {
          setSettingsOpen(false);
          setShortcutsOpen(false);
          setSnoozeTarget(null);
        }
        return;
      }
      switch (event.key) {
        case "c":
          event.preventDefault();
          openCompose({ mode: "new" });
          break;
        case "/":
          event.preventDefault();
          document.getElementById("mail-search-input")?.focus();
          break;
        case "u":
          setOpenThread(null);
          break;
        case "e":
          if (openThread) handleThreadAction("archive");
          break;
        case "#":
          if (openThread) handleThreadAction("trash");
          break;
        case "r":
          if (openThread) replyToOpenThread("reply");
          break;
        case "a":
          if (openThread) replyToOpenThread("replyAll");
          break;
        case "f":
          if (openThread) replyToOpenThread("forward");
          break;
        case "?":
          setShortcutsOpen(true);
          break;
        case "Escape":
          if (composeWindows.length > 0) {
            closeCompose(composeWindows[composeWindows.length - 1].id);
          } else if (openThread) {
            setOpenThread(null);
          }
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openThread, composeWindows, settingsOpen, shortcutsOpen, snoozeTarget, addingAccount, activeFolder, account]);

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
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onRefresh={refreshCurrent}
        refreshing={loading}
        theme={theme}
        onToggleTheme={toggleTheme}
        onToggleMobileRail={() => setMobileRailOpen((v) => !v)}
        onSwitchAccount={handleSwitchAccount}
        onAddAccount={() => setAddingAccount(true)}
        onLogout={handleLogout}
        onOpenSettings={() => setSettingsOpen(true)}
        splitMode={splitMode}
        onToggleSplitMode={toggleSplitMode}
        onShowShortcuts={() => setShortcutsOpen(true)}
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
          {offline && activeFolder !== SYSTEM_FOLDERS.drafts && (
            <div className="offline-banner">You&apos;re offline — showing your last saved mail.</div>
          )}
          {activeFolder === SYSTEM_FOLDERS.drafts ? (
            <DraftsList onOpenDraft={openCompose} refreshKey={draftsRefreshKey} />
          ) : splitMode === "right" ? (
            <div className="split-view">
              <div className="split-list-pane">
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
                  onLoadMore={() =>
                    nextBeforeUid &&
                    loadMessages(activeFolder, { append: true, beforeUid: nextBeforeUid, q: activeSearch, filters: activeFilters })
                  }
                  loading={loading}
                />
              </div>
              <div className="split-reading-pane">
                {openThread ? (
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
                  <div className="empty-state">
                    <MailOpen size={48} strokeWidth={1.2} />
                    <h3>Select a conversation</h3>
                    <p>Choose a message from the list to read it here.</p>
                  </div>
                )}
              </div>
            </div>
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
              onLoadMore={() =>
                nextBeforeUid &&
                loadMessages(activeFolder, { append: true, beforeUid: nextBeforeUid, q: activeSearch, filters: activeFilters })
              }
              loading={loading}
            />
          )}
        </div>
      </div>

      {composeWindows.map((handle) => (
        <ComposeWindow key={handle.id} handle={handle} account={account} onClose={closeCompose} onSendRequest={handleSendRequest} />
      ))}

      {settingsOpen && (
        <SettingsModal
          account={account}
          onClose={() => setSettingsOpen(false)}
          onAccountUpdated={(updated) => setAccount(updated)}
        />
      )}

      {shortcutsOpen && <ShortcutsHelpModal onClose={() => setShortcutsOpen(false)} />}

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
