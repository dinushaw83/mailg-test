import React, { useEffect, useMemo, useRef, useState } from "react";
import TextField from "@mui/material/TextField";

function HoverRow({ className = "J-N", label, onClick, padding = "6px 48px" }) {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const bg = hover || focus ? "#f3f4f6" : "transparent";

  return (
    <div
      className={className}
      role="menuitem"
      tabIndex={0}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        ...footerItemStyle,
        padding,
        background: bg,
      }}
    >
      <div className="J-N-Jz">{label}</div>
    </div>
  );
}

export default function MoveToSubMenu({
  labels = [],
  onSelect,
  showInbox = false,
  showSpam = true,
  showTrash = true,
  shouldFocus = false,
}) {
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  // Focus the input when shouldFocus prop changes to true
  useEffect(() => {
    if (shouldFocus && inputRef.current) {
      // Small delay to ensure the submenu is fully rendered
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  }, [shouldFocus]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = needle ? labels.filter((l) => l.name.toLowerCase().includes(needle)) : labels;
    return [...base];
  }, [labels, q]);

  function handleSelect(item) {
    if (!item || item.id === "__sep__") return;
    if (item.id === "__inbox__") onSelect({ id: "inbox", name: "Inbox" });
    else if (item.id === "__spam__") onSelect({ id: "spam", name: "Spam" });
    else if (item.id === "__trash__") onSelect({ id: "trash", name: "Trash" });
    else onSelect(item);
  }

  return (
    <div ref={menuRef} role="menu" aria-label="Move to">
      <div
        className="SK AX"
        style={{
          border: "none",
          padding: 0,
          boxShadow: "none",
          userSelect: "none",
        }}
      >
        <div className="asc" style={{ padding: "8px 8px 0", userSelect: "none" }}>
          Move to:
          <span
            className="aW1"
            aria-live="polite"
            role="status"
            style={{
              overflow: "hidden",
              position: "absolute",
              top: "-1000px",
              width: 1,
              display: "inline-block",
              userSelect: "none",
            }}
          >
            ✔
          </span>
        </div>

        {/* Search */}
        <div
          style={{
            padding: "8px 8px 16px",
            userSelect: "none",
          }}
        >
          <TextField
            fullWidth
            inputRef={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onClick={(e) => e.stopPropagation()}
            variant="standard"
            placeholder="Filter labels"
            sx={{
              "& .MuiInput-underline:before": {
                borderBottomColor: "#dadce0",
              },
              "& .MuiInput-underline:after": {
                borderBottomColor: "#1a73e8",
                borderBottomWidth: "2px",
              },
              "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
                borderBottomColor: "#dadce0",
              },
              "&.Mui-focused .MuiInput-underline:after": {
                borderBottomColor: "#1a73e8",
                borderBottomWidth: "2px",
              },
            }}
            InputProps={{
              endAdornment: (
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 20,
                    color: "rgb(95, 99, 104)",
                    marginLeft: "8px",
                  }}
                >
                  search
                </span>
              ),
              sx: {
                fontSize: "0.875rem",
                padding: "8px 0",
                "& input": {
                  padding: 0,
                },
              },
            }}
          />
        </div>

        {/* List (driven by `filtered`) */}
        <div
          className="J-M-Jz aiL"
          style={{
            overflow: "auto",
            maxHeight: 240,
            userSelect: "none",
            minWidth: 12,
          }}
        >
          {filtered.map((item, i) =>
            item.id === "__sep__" ? (
              <div
                key={`sep-${i}`}
                role="separator"
                style={{
                  borderTop: "1px solid #ebebeb",
                  margin: "5px 0 6px",
                }}
              />
            ) : (
              <div
                key={item.id}
                className="J-N"
                role="menuitem"
                title={item.name}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onClick={() => handleSelect(item)}
                style={{
                  listStyle: "none",
                  margin: 0,
                  whiteSpace: "nowrap",
                  position: "relative",
                  cursor: "pointer",
                  padding: "6px 48px",
                  color: "rgb(32, 33, 36)",
                  userSelect: "none",
                  background: i === active ? "#f3f4f6" : "transparent",
                }}
              >
                <div
                  className="J-N-Jz"
                  style={{
                    alignItems: "center",
                    display: "flex",
                    justifyContent: "space-between",
                    position: "relative",
                    userSelect: "none",
                  }}
                >
                  {item.name}
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div
          className="J-Kh"
          role="separator"
          style={{
            borderTop: "1px solid #ebebeb",
            marginTop: 5,
            marginBottom: 6,
            userSelect: "none",
          }}
        />

        {showInbox && <HoverRow label="Inbox" onClick={() => handleSelect({ id: "__inbox__", name: "Inbox" })} />}

        {showSpam && <HoverRow label="Spam" onClick={() => handleSelect({ id: "__spam__", name: "Spam" })} />}

        {showTrash && <HoverRow label="Trash" onClick={() => handleSelect({ id: "__trash__", name: "Trash" })} />}

        <div
          className="J-Kh"
          role="separator"
          style={{
            borderTop: "1px solid #ebebeb",
            marginTop: 5,
            marginBottom: 6,
            userSelect: "none",
          }}
        />

        <HoverRow
          className="J-JK"
          label="Create new"
          padding="2px 48px"
          onClick={() => handleSelect({ id: "__create_label__", name: "Create new" })}
        />

        <HoverRow className="J-JK" label="Manage labels" padding="2px 48px" onClick={() => alert("Manage labels")} />
      </div>
    </div>
  );
}

const footerItemStyle = {
  listStyle: "none",
  margin: 0,
  whiteSpace: "nowrap",
  position: "relative",
  cursor: "pointer",
  padding: "6px 48px",
  color: "rgb(32, 33, 36)",
  userSelect: "none",
};
