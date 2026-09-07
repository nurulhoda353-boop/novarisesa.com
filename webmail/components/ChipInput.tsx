"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  function commit() {
    const candidate = input.trim().replace(/,$/, "");
    if (candidate && EMAIL_RE.test(candidate) && !values.includes(candidate)) {
      onChange([...values, candidate]);
    }
    setInput("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
      if (input.trim()) {
        event.preventDefault();
        commit();
      }
    } else if (event.key === "Backspace" && !input && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className="field-row">
      <label>{label}</label>
      <div className="chips-input">
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
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          autoFocus={autoFocus}
        />
      </div>
      {trailing}
    </div>
  );
}
