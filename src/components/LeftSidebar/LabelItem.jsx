import React from "react";

import { IconButton } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { NavLink, useMatch } from "react-router-dom";

export default function LabelItem({ labelKey, display, depth = 0, count = 0, expanded }) {
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
      <div
        className={`aim n6 ${active ? "ain" : ""}`}
        style={
          expanded
            ? {}
            : {
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                overflowX: "hidden",
                marginLeft: "20px",
              }
        }
      >
        <div className={`TO ah9 ${active ? "aBP nZ aiq" : ""}`}>
          <div
            className="TN aY7xie aEc aHS-bnr"
            style={{ marginLeft: 12 + depth * 16, ...(expanded ? {} : { paddingLeft: "6px", marginLeft: 0 }) }}
          >
            <div className="TH J-J5-Ji" />
            <div className="qj aEe qr" />
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
