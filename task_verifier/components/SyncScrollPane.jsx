/* eslint-disable */

import { useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export const SyncScrollPane = ({ leftTitle, rightTitle, leftContent, rightContent, compact = false }) => {
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const isScrolling = useRef(false);

  const handleScroll = (source) => (e) => {
    if (isScrolling.current) return;
    isScrolling.current = true;
    const target = source === "left" ? rightRef.current : leftRef.current;
    if (target) {
      target.scrollTop = e.currentTarget.scrollTop;
      target.scrollLeft = e.currentTarget.scrollLeft;
    }
    requestAnimationFrame(() => {
      isScrolling.current = false;
    });
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 0.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      {/* Left Pane */}
      <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: "text.secondary",
            px: 1.5,
            py: 1,
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#f8fafc"),
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          {leftTitle}
        </Typography>
        <Box
          ref={leftRef}
          onScroll={handleScroll("left")}
          sx={{
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1e293b" : "#0f172a"),
            p: 1.5,
            overflow: "auto",
            maxHeight: compact ? 200 : 300,
            minHeight: compact ? 100 : 150,
          }}
        >
          {leftContent}
        </Box>
      </Box>

      {/* Right Pane */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          borderLeft: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: "text.secondary",
            px: 1.5,
            py: 1,
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#f8fafc"),
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          {rightTitle}
        </Typography>
        <Box
          ref={rightRef}
          onScroll={handleScroll("right")}
          sx={{
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1e293b" : "#0f172a"),
            p: 1.5,
            overflow: "auto",
            maxHeight: compact ? 200 : 300,
            minHeight: compact ? 100 : 150,
          }}
        >
          {rightContent}
        </Box>
      </Box>
    </Box>
  );
};
