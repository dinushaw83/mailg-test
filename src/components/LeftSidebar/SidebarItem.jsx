import React from "react";
import { NavLink, useMatch } from "react-router-dom";

const hsClass = (key) => `aHS-bn${key}`;

export default function SidebarItem({ item }) {
  // Exact match for base path
  const exactMatch = useMatch({ path: `/${item.key}`, end: true });
  // For Inbox, also match nested paths like /inbox/:inboxId
  const nestedMatch =
    item.key === "inbox"
      ? useMatch({ path: `/${item.key}/*`, end: false })
      : null;
  const isActive = !!(exactMatch || nestedMatch);

  const handleClick = (e) => {
    if (item.onClick) {
      e.preventDefault();
      item.onClick(item);
    }
  };

  return (
    <NavLink
      to={`/${item.key}`}
      end
      className="J-Ke n0"
      style={{ textDecoration: "none", color: "inherit" }}
      aria-label={item.label}
      onClick={handleClick}
    >
      <div className={`aim ${isActive ? "ain" : ""}`}>
        <div className={`TO n6 ${isActive ? "aBP nZ aiq" : ""}`}>
          <div
            className={`TN bzz ah9 ${hsClass(item.key)}`}
            style={{ marginLeft: 0 }}
          >
            <span
              className={
                isActive
                  ? "material-symbols-filled"
                  : "material-symbols-outlined"
              }
              style={{
                alignItems: "center",
                display: "flex",
                flexShrink: 0,
                fontSize: "20px",
                justifyContent: "flex-start",
                marginRight: "18px",
                opacity: isActive ? 1 : 0.71,
              }}
            >
              {item.icon}
            </span>

            <div className="aio UKr6le">
              <span className={`nU ${isActive ? "n1" : ""}`}>{item.label}</span>

              {item.key !== "all" &&
                typeof item.count === "number" &&
                item.count > 0 && <div className="bsU">{item.count}</div>}
            </div>

            <div className="nL aif" />
          </div>
        </div>
      </div>
    </NavLink>
  );
}
