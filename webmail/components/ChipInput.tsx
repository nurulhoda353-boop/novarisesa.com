"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import * as api from "@/lib/api";
import type { ContactInfo } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPLIT_RE = /[,;\s]+/;

// Shared across every ChipInput on the page (To/Cc/Bcc each mount their
// own) so opening a compose window fetches the contact list once, not
// three times.
let contactsCache: ContactInfo[] | null = null;
let contactsPromise: Promise<ContactInfo[]> | null = null;
function loadContacts(): Promise<ContactInfo[]> {
  if (contactsCache) return Promise.resolve(contactsCache);
  contactsPromise ??= api
    .listContacts()
    .then((rows) => (contactsCache = rows))
    .catch(() => []);
  return contactsPromise;
}

export function ChipInput({
  label,
  values,
  onChange,
  autoFocus,
  trailing,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  autoFocus?: boolean;
  trailing?: React.ReactNode;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadContacts().then(setContacts);
  }, []);

  useEffect(() => {
    function onOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  const query = input.trim().toLowerCase();
  const suggestions =
    query.length === 0
      ? []
      : contacts
          .filter(
            (contact) =>
              !values.includes(contact.email) &&
              (contact.email.toLowerCase().includes(query) ||
                contact.display_name.toLowerCase().includes(query)),
          )
          .slice(0, 6);

  function addChip(candidate: string): boolean {
    const email = candidate.trim().replace(/,$/, "");
    if (!email) return true;
    if (!EMAIL_RE.test(email)) return false;
    if (!values.includes(email)) onChange([...values, email]);
    return true;
  }

  function commit() {
    if (!input.trim()) return;
    const ok = addChip(input);
    if (ok) {
      setInput("");
      setError(false);
      setShowSuggestions(false);
    } else {
      // Keep the text so the user can see and fix what they typed,
      // instead of it silently vanishing with no explanation.
      setError(true);
    }
  }

  function pickSuggestion(contact: ContactInfo) {
    onChange([...values, contact.email]);
    setInput("");
    setError(false);
    setShowSuggestions(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (showSuggestions && suggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlighted((value) => (value + 1) % suggestions.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlighted((value) => (value - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        pickSuggestion(suggestions[highlighted]);
        return;
      }
      if (event.key === "Escape") {
        setShowSuggestions(false);
        return;
      }
    }
    if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
      if (input.trim()) {
        event.preventDefault();
        commit();
      }
    } else if (event.key === "Backspace" && !input && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!text.includes(",") && !text.includes(";") && !/\s/.test(text.trim())) return; // a single token - let normal typing/paste handle it
    event.preventDefault();
    const candidates = text.split(SPLIT_RE).map((item) => item.trim()).filter(Boolean);
    const added: string[] = [];
    const rejected: string[] = [];
    for (const candidate of candidates) {
      if (EMAIL_RE.test(candidate) && !values.includes(candidate) && !added.includes(candidate)) {
        added.push(candidate);
      } else if (!EMAIL_RE.test(candidate)) {
        rejected.push(candidate);
      }
    }
    if (added.length > 0) onChange([...values, ...added]);
    // Whatever didn't look like a valid address stays in the field,
    // visible, rather than silently disappearing.
    setInput(rejected.join(", "));
    setError(rejected.length > 0);
  }

  return (
    <div className="field-row" ref={containerRef} style={{ position: "relative" }}>
      <label>{label}</label>
      <div className={`chips-input ${error ? "has-error" : ""}`}>
        {values.map((value) => (
          <span className="chip" key={value}>
            {value}
            <button onClick={() => onChange(values.filter((item) => item !== value))}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setError(false);
            setShowSuggestions(true);
            setHighlighted(0);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => window.setTimeout(commit, 100)}
          onFocus={() => setShowSuggestions(true)}
          autoFocus={autoFocus}
        />
      </div>
      {error && (
        <span className="recipient-error">Enter a valid email address</span>
      )}
      {trailing}
      {showSuggestions && suggestions.length > 0 && (
        <div className="recipient-suggestions">
          {suggestions.map((contact, index) => (
            <button
              key={contact.id}
              type="button"
              className={`recipient-suggestion ${index === highlighted ? "highlighted" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pickSuggestion(contact)}
              onMouseEnter={() => setHighlighted(index)}
            >
              <span className="name">{contact.display_name || contact.email}</span>
              {contact.display_name && <span className="email">{contact.email}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
