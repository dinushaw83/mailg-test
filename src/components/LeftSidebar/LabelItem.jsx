import React from "react";
import { IconButton } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { NavLink, useMatch } from "react-router-dom";
import Icon from "../ui/Icon";

export default function LabelItem({
  labelKey,
  display,
  depth = 0,
  count = 0,
  hasChildren = false,
  isOpen = true,
  onToggle, // () => void
}) {
  // Route like /label/:label where :label is encodeURIComponent(labelKey)
  const match = useMatch("/label/:label");
  const currentKey = match?.params?.label ? decodeURIComponent(match.params.label) : "";
  const active = currentKey === labelKey;

  return (
    <NavLink
      to={`/label/${encodeURIComponent(labelKey)}`}
      className="J-Ke n0"
      style={{ textDecoration: "none", color: "inherit" }}
      aria-label={`${display} label`}
    >
      <div className={`aim n6 ${active ? "ain" : ""}`}>
        <div className={`TO ah9 ${active ? "aBP nZ aiq" : ""}`}>
          <div className="TN aY7xie aEc aHS-bnr" style={{ marginLeft: depth * 16 }}>
            {/* Arrow (only if it has children) */}
            {hasChildren && (
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggle?.();
                }}
                style={{ cursor: "pointer", display: "inline-flex" }}
                aria-label={isOpen ? "Collapse" : "Expand"}
                role="button"
              >
                {!isOpen
                  ? <Icon name="arrow_right" style={{ width: 16, height: 16, marginRight: "2px", marginLeft: "-15px", shape: "square" }}/>
                  : <Icon name="arrow_drop_down" style={{ width: 16, height: 16, marginRight: "2px", marginLeft: "-15px", shape: "square" }}/>
                }
              </span>
            )}

            <Icon name="label" style={{ width: 16, height: 16 }} />

            <div className="aio aip">
              <span className="nU">{display}</span>
              {count > 0 && <span className="ml-1 text-xs text-gray-500">({count})</span>}
            </div>

            <div className="nL aig group">
              <div className="pM aj0">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NavLink>
  );
}
