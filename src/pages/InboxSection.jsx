import React, { useState } from "react";
import { Box, Button, Collapse, Divider, IconButton } from "@mui/material";
import Pagination from "../components/ToolBar/Pagination";

const sectionHeaderStyle = {
  padding: "0px 6px",
  fontWeight: 500,
  color: "rgb(32,33,36)",
  fontSize: "1rem",
  fontFamily: `"Google Sans",Roboto,RobotoDraft,Helvetica,Arial,sans-serif`,
  lineHeight: "24px",
};

const InboxSection = ({
  title,
  emails,
  setShowAdvancedMenu,
  showPagination = false,
  overwriteItemsPerPage = null,
  children,
  sectionStyle = {},
}) => {
  const [expanded, setExpanded] = useState(true);

  if (!emails || emails.length === 0) return null;

  return (
    <>
      {/* ─────────────── Section Header ─────────────── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "0px 8px",
          padding: "10px",
          cursor: "pointer",
          ...sectionStyle,
        }}
      >
        <Button
          variant="text"
          disableRipple
          onClick={() => setExpanded((prev) => !prev)}
          sx={{
            height: "40px",
            minWidth: "auto",
            padding: "0",
            textTransform: "none",
            "&:hover": { backgroundColor: "rgba(32,33,36,0.031)" },
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 24,
              transition: "transform 0.2s ease",
              transform: expanded ? "rotate(0deg)" : "rotate(180deg)",
              color: "#5f6368",
              opacity: 0.8,
            }}
          >
            keyboard_arrow_down
          </span>
          <h2 style={sectionHeaderStyle}>{title}</h2>
        </Button>

        <Box sx={{ display: "flex", alignItems: "center" }}>
          {showPagination && expanded && (
            <Pagination
              totalFilteredItems={emails.length}
              overwriteItemsPerPage={overwriteItemsPerPage}
              showNavigationButtons={false}
            />
          )}
          <IconButton
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              more_vert
            </span>
          </IconButton>
        </Box>
      </Box>

      <Divider sx={{ margin: "-8px 0", opacity: 0.7 }} />

      {/* ─────────────── Expand/Collapse Section ─────────────── */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <div style={{ marginBottom: "8px" }}>{children}</div>
      </Collapse>

      {expanded && <Divider sx={{ margin: "-8px 0", opacity: 0.7 }} />}
    </>
  );
};

export default InboxSection;
