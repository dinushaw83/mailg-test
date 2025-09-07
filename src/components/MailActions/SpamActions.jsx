import React, { useState, useRef } from "react";
import MoveToMenu from "./MoveToMenu";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";
import { Icon } from "../InboxView/ActionBar";
import Button from "@mui/material/Button";

const LABELS = [
  { id: "notes", name: "Notes" },
  { id: "receipts", name: "Receipts" },
  { id: "work", name: "Work" },
  { id: "social", name: "Social" },
  { id: "updates", name: "Updates" },
  { id: "forums", name: "Forums" },
  { id: "promotions", name: "Promotions" },
];

export default function SpamActions() {
  const { moveToSpam, moveToTrash, notSpam } = useMailActions();
  const { selection } = useGlobalContext();

  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);

  const handleMenuItemClick = async (item) => {
    const ids = [...selection.ids]; // Set → Array
    if (!ids.length) return;

    try {
      if (item.id === "__spam__" || item.id === "spam") {
        moveToSpam(ids);
      } else if (item.id === "__trash__" || item.id === "trash") {
        moveToTrash(ids);
      }
      setOpen(false);
      // selection.clear(); // uncomment if you want to clear after action
    } catch (e) {
      console.error("Move failed:", e);
      // optionally show a toast
    }
  };

  return (
    <div className="G-tF" style={{ display: "flex", alignItems: "center" }}>
      {/* Delete forever button */}
      <Button
        sx={{
          textTransform: "none",
          color: "rgb(95,99,104)",
          "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
          marginLeft: "8px",
        }}
      >
        Delete forever
      </Button>

      {/* Not Spam button */}
      <Button
        sx={{
          textTransform: "none",
          color: "rgb(95,99,104)",
          "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
          marginLeft: "8px",
          marginRight: "8px",
        }}
        onClick={() => {
          notSpam([...selection.ids]);
        }}
      >
        Not Spam
      </Button>

      <Icon name="mail" label="Mail" />

      <Icon name="drive_file_move" label="Move" onClick={() => setOpen((s) => !s)} _ref={anchorRef} />

      {open && (
        <MoveToMenu
          anchorRef={anchorRef}
          labels={LABELS}
          onSelect={handleMenuItemClick}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
