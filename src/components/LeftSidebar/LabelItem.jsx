import React from "react";
import { NavLink, useMatch } from "react-router-dom";

export default function LabelItem({ name, count = 0 }) {
  const match = useMatch("/label/:label");
  const active = decodeURIComponent(match?.params?.label || "") === name;

  return (
    <div className={`aim n6 ${active ? "ain" : ""}`}>
      <div className={`TO ah9 ${active ? "aBP nZ aiq" : ""}`}>
        <div className="TN aY7xie aEc aHS-bnr" style={{ marginLeft: 0 }}>
          <div className="TH J-J5-Ji" />
          <div className="qj aEe qr" />
          <div className="aio aip ">
            <span className="nU ">
              <NavLink
                to={`/label/${encodeURIComponent(name)}`}
                className="J-Ke n0"
                style={{ textDecoration: "none", color: "inherit" }}
                aria-label={`${name} label`}
              >
                {name}
              </NavLink>
            </span>
            {count > 0 && <span className="ml-1 text-xs text-gray-500">({count})</span>}
          </div>
          <div className="nL aig">
            <div className="pM aj0 sf-hidden" tabIndex={0} aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}