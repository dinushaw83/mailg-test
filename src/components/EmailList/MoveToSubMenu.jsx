import React, { useEffect, useMemo, useRef, useState } from "react";

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

export default function MoveToSubMenu({ labels = [], onSelect, showInbox = false, showSpam = true, showTrash = true }) {
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  // Focus search when opened
  useEffect(() => {
    const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
    return () => clearTimeout(t);
  }, []);

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
          className="J-M-JJ asg"
          style={{
            overflow: "hidden",
            position: "relative",
            border: "none",
            padding: 0,
            margin: "8px 8px 16px",
            userSelect: "none",
          }}
        >
          <div style={{ userSelect: "none", visibility: "visible" }} />
          <input
            ref={inputRef}
            className="bqf"
            type="text"
            maxLength={225}
            aria-label="Filter labels"
            tabIndex={0}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            style={{
              fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
              lineHeight: "20px",
              paddingBottom: "4px",
              paddingRight: "36px",
              boxShadow: "rgba(0, 0, 0, 0.12) 0 -1px 0 0 inset",
              border: 0,
              background: "#fff",
              margin: 0,
              color: "#222",
              fontSize: "100%",
              width: "100%",
              maxWidth: "50ex",
              outline: 0,
            }}
          />
          <div
            className="A0"
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 20,
                lineHeight: "20px",
                display: "inline-block",
                color: "#777",
              }}
            >
              search
            </span>
          </div>
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
