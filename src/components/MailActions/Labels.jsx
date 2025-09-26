import React, { useCallback, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Checkbox from "@mui/material/Checkbox";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";
import { normalizeLabelName } from "../../hooks/useLabels";

export const Labels = ({
  searchQuery,
  setSearchQuery,
  setLabelAnchorEl,
  setSelectedLabelKeys,
  selectedLabelKeys,
  labelAnchorEl,
  selectedIds,
  handleClose,
  anchorOrigin = { vertical: "top", horizontal: "right" },
  transformOrigin = { vertical: "top", horizontal: "left" },
}) => {
  const { labels, setSnackbar, selectedEmails, selection } = useGlobalContext();
  const { moveToLabel } = useMailActions();

  const handleLabelClose = () => {
    setLabelAnchorEl(null);
    setSearchQuery("");
    setSelectedLabelKeys(new Set());
  };

  const handleLabelToggle = (labelKey) => {
    setSelectedLabelKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(labelKey)) {
        newSet.delete(labelKey);
      } else {
        newSet.add(labelKey);
      }
      return newSet;
    });
  };

  const hasNewSelections = selectedLabelKeys.size > 0;

  // Get currently applied labels for selected emails
  const currentLabels = useMemo(() => {
    if (selectedEmails.length === 0) return new Set();

    const labelCounts = {};
    selectedEmails.forEach((email) => {
      email.labels.forEach((label) => {
        labelCounts[label] = (labelCounts[label] || 0) + 1;
      });
    });

    // Return labels that are applied to ALL selected emails
    return new Set(
      Object.entries(labelCounts)
        .filter(([_, count]) => count === selectedEmails.length)
        .map(([label]) => label)
    );
  }, [selectedEmails]);

  const availableLabels = useMemo(() => {
    return (
      Object.entries(labels || {})
        // .filter(([key, meta]) => !meta.system)
        .map(([key, meta]) => ({
          key,
          name: meta.name || key,
          color: meta.color,
          isCurrentlyApplied: currentLabels.has(key),
        }))
        .filter((label) => label.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  }, [labels, searchQuery, currentLabels]);

  const handleApplyLabels = useCallback(() => {
    const selectedLabels = Array.from(selectedLabelKeys)
      .map((key) => {
        const label = availableLabels.find((l) => l.key === key);
        return label?.key;
      })
      .filter(Boolean);

    if (selectedLabels.length > 0) {
      // Apply all selected labels
      selectedLabels.forEach((labelName) => {
        moveToLabel(selectedIds, labelName);
      });
      setSnackbar({ message: `Applied ${selectedLabels.length} label(s)`, severity: "success" });

      // Clear selection after applying labels
      selection.clear();
    }

    handleLabelClose();
    handleClose();
  }, [selectedLabelKeys, availableLabels, selectedIds, moveToLabel, setSnackbar, selection]);

  return (
    <Popover
      open={Boolean(labelAnchorEl)}
      anchorEl={labelAnchorEl}
      onClose={handleLabelClose}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      sx={{
        "& .MuiPopover-paper": {
          marginLeft: "0px",
        },
      }}
    >
      <Box sx={{ width: "280px", maxHeight: "400px", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <Box sx={{ paddingX: "16px", paddingY: "12px" }}>
          <Typography sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#202124" }}>Label as:</Typography>
        </Box>

        {/* Search Input */}
        <Box sx={{ paddingX: "16px", paddingBottom: "8px" }}>
          <TextField
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="standard"
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
                "& .MuiInput-underline:before": {
                  borderBottomColor: "#dadce0",
                },
                "& .MuiInput-underline:after": {
                  borderBottomColor: "#1a73e8",
                },
                "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
                  borderBottomColor: "#dadce0",
                },
              },
            }}
          />
        </Box>

        {/* Labels List */}
        <Box sx={{ flex: 1, overflowY: "auto", maxHeight: "250px" }}>
          {availableLabels.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                paddingY: "12px",
                paddingX: "16px",
              }}
            >
              <Typography sx={{ fontSize: "0.875rem", lineHeight: "20px", color: "#5f6368" }}>
                {searchQuery ? "No labels found" : "No labels available"}
              </Typography>
            </Box>
          ) : (
            availableLabels.map((label) => (
              <Box
                key={label.key}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  paddingX: "16px",
                  paddingY: "4px",
                  cursor: "pointer",
                  "&:hover": {
                    background: "#07070714",
                  },
                }}
                onClick={() => handleLabelToggle(label.key)}
              >
                <Checkbox
                  checked={label.isCurrentlyApplied || selectedLabelKeys.has(label.key)}
                  size="small"
                  sx={{ padding: "4px", pointerEvents: "none" }}
                />
                <Typography sx={{ flex: 1, fontSize: "0.875rem", lineHeight: "20px" }}>{normalizeLabelName(label.key)}</Typography>
              </Box>
            ))
          )}
        </Box>

        {/* Footer */}
        <Box>
          <Divider />
          <Box sx={{ paddingY: "6px" }}>
            {hasNewSelections ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  paddingX: "16px",
                  height: "32px",
                  overflow: "hidden",
                  cursor: "pointer",
                  "&:hover": {
                    background: "#07070714",
                  },
                }}
                onClick={handleApplyLabels}
              >
                <Box sx={{ width: "20px" }} />
                <Typography sx={{ flex: 1, paddingY: "16px", fontSize: "0.875rem", lineHeight: "20px" }}>
                  Apply
                </Typography>
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    paddingX: "16px",
                    height: "32px",
                    overflow: "hidden",
                    cursor: "pointer",
                    "&:hover": {
                      background: "#07070714",
                    },
                  }}
                  onClick={() => {
                    // TODO: Implement create new label
                    console.log("Create new label");
                  }}
                >
                  <Box sx={{ width: "20px" }} />
                  <Typography sx={{ flex: 1, paddingY: "16px", fontSize: "0.875rem", lineHeight: "20px" }}>
                    Create new
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    paddingX: "16px",
                    height: "32px",
                    overflow: "hidden",
                    cursor: "pointer",
                    "&:hover": {
                      background: "#07070714",
                    },
                  }}
                  onClick={() => {
                    // TODO: Implement manage labels
                    console.log("Manage labels");
                  }}
                >
                  <Box sx={{ width: "20px" }} />
                  <Typography sx={{ flex: 1, paddingY: "16px", fontSize: "0.875rem", lineHeight: "20px" }}>
                    Manage labels
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Box>
    </Popover>
  );
};
