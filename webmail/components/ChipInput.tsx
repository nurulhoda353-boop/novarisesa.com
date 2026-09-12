"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import * as api from "@/lib/api";
import type { ContactInfo, DirectoryEntry } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPLIT_RE = /[,;\s]+/;

type Person = { email: string; name: string; isTeammate: boolean };

// Shared across every ChipInput on the page (To/Cc/Bcc each mount their
// own) so opening a compose window fetches these lists once, not three
// times each.
let peopleCache: Person[] | null = null;
let peoplePromise: Promise<Person[]> | null = null;
function loadPeople(): Promise<Person[]> {
  if (peopleCache) return Promise.resolve(peopleCache);
  peoplePromise ??= Promise.all([
    api.listDirectory().catch(() => [] as DirectoryEntry[]),
    api.listContacts().catch(() => [] as ContactInfo[]),
  ]).then(([directory, contacts]) => {
    // Every teammate mailbox first (an internal work address is almost
    // always who you meant), then personal contacts not already covered
    // by the directory, de-duplicated by email.
    const seen = new Set<string>();
    const merged: Person[] = [];
    for (const entry of directory) {
      seen.add(entry.address.toLowerCase());
      merged.push({ email: entry.address, name: entry.display_name, isTeammate: true });
    }
    for (const contact of contacts) {
      if (seen.has(contact.email.toLowerCase())) continue;
      seen.add(contact.email.toLowerCase());
      merged.push({ email: contact.email, name: contact.display_name, isTeammate: false });
    }
    return (peopleCache = merged);
  });
  return peoplePromise;
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
  const [people, setPeople] = useState<Person[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPeople().then(setPeople);
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

  const trimmedInput = input.trim();
  const query = trimmedInput.toLowerCase();
  const available = people.filter((person) => !values.includes(person.email));
  // Nothing typed yet -> browse the whole directory (capped) straight from
  // a click, same as this field's placeholder promised: pick a teammate
  // without typing at all. One character narrows it down from there.
  const suggestions =
    query.length === 0
      ? available.slice(0, 8)
      : available
          .filter(
            (person) => person.email.toLowerCase().includes(query) || person.name.toLowerCase().includes(query),
          )
          .slice(0, 8);
  // A fully-typed, valid address that isn't already one of the matches
  // above (an outside address, or a teammate/contact typed out in full
  // rather than picked from the list) still gets its own row - otherwise
  // the dropdown just goes empty and looks like nothing registered, even
  // though the address is perfectly valid and Enter/Tab would accept it.
  const showAddNew =
    EMAIL_RE.test(trimmedInput) &&
    !values.includes(trimmedInput) &&
    !suggestions.some((person) => person.email.toLowerCase() === query);
  const dropdownCount = suggestions.length + (showAddNew ? 1 : 0);

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

  function pickPerson(email: string) {
    onChange([...values, email]);
    setInput("");
    setError(false);
    setShowSuggestions(false);
  }

  function pickDropdownIndex(rawIndex: number) {
    const index = Math.min(Math.max(rawIndex, 0), dropdownCount - 1);
    if (index < suggestions.length) pickPerson(suggestions[index].email);
    else pickPerson(trimmedInput);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (showSuggestions && dropdownCount > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlighted((value) => (value + 1) % dropdownCount);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlighted((value) => (value - 1 + dropdownCount) % dropdownCount);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        pickDropdownIndex(highlighted);
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
      {showSuggestions && dropdownCount > 0 && (
        <div className="recipient-suggestions">
          {suggestions.map((person, index) => (
            <button
              key={person.email}
              type="button"
              className={`recipient-suggestion ${index === highlighted ? "highlighted" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pickPerson(person.email)}
              onMouseEnter={() => setHighlighted(index)}
            >
              <span className="name">{person.name || person.email}</span>
              {person.name && <span className="email">{person.email}</span>}
              {person.isTeammate && <span className="badge">Team</span>}
            </button>
          ))}
          {showAddNew && (
            <button
              type="button"
              className={`recipient-suggestion ${suggestions.length === highlighted ? "highlighted" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pickPerson(trimmedInput)}
              onMouseEnter={() => setHighlighted(suggestions.length)}
            >
              <span className="email">{trimmedInput}</span>
              <span className="badge new">Add</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
