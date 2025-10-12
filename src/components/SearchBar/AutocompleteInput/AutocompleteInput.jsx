import React, { useRef, useState } from "react";
import styles from "./AutocompleteInput.module.css";

export default function AutocompleteInput({ value, onChange, suggestion, onAccept, onFocus }) {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Calculate the suggestion remainder to display
  const getRemainder = () => {
    if (!suggestion || !suggestion.value || !value) {
      return "";
    }

    const currentValue = value.toLowerCase();
    const suggestionValue = suggestion.value.toLowerCase();

    // Check if suggestion starts with what user typed
    if (suggestionValue.startsWith(currentValue)) {
      return suggestion.value.slice(value.length);
    }

    return "";
  };

  const remainder = getRemainder();

  // keyboard handling: Tab, Arrow Right to accept suggestion
  const handleKeyDown = (e) => {
    if (!remainder) return;

    if (e.key === "Tab") {
      // Accept suggestion with Tab key
      e.preventDefault();
      onAccept(suggestion.value);
      // Keep focus in input
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else if (e.key === "ArrowRight") {
      // Accept suggestion with arrow right if cursor is at the end
      const cursorPos = inputRef.current?.selectionStart ?? 0;
      if (cursorPos === value.length) {
        e.preventDefault();
        onAccept(suggestion.value);
      }
    }
  };

  return (
    <>
      {/* Ghost layer - only show when focused */}
      {isFocused && (
        <div className={styles.ghost} aria-hidden="true">
          <span className={styles.typed}>{value}</span>
          <span className={styles.remainder}>{remainder}</span>
          {/* Tab badge appears right after the ghost text */}
          {remainder && <span className={styles.tabBadge}>tab</span>}
        </div>
      )}

      <input
        name="search"
        ref={inputRef}
        className={styles.realSearchInput}
        placeholder="Search mail"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        onFocus={() => {
          setIsFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setIsFocused(false);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
    </>
  );
}
