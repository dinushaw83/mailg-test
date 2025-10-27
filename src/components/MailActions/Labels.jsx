import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Checkbox from "@mui/material/Checkbox";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";
import useLabels, { normalizeLabelName } from "../../hooks/useLabels";
import Button from "@mui/material/Button";

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
  onOpenCreateLabelDialog,
}) => {
  const { labels, setSnackbar, selection } = useGlobalContext();
  const { addLabels, removeLabels } = useMailActions();
  const { getSelectionLabels } = useLabels();
  const [overrides, setOverrides] = useState({});
  const inputRef = useRef(null);

  const handleLabelClose = () => {
    setLabelAnchorEl(null);
    setSearchQuery("");
    setSelectedLabelKeys(new Set());
  };

  const hasChanges = Object.keys(overrides).length > 0;

  // Get currently applied labels for selected emails
  const { currentLabels, labelCounts, nSel } = getSelectionLabels(selectedIds);

  const availableLabels = useMemo(() => {
    return Object.entries(labels || {})
      .filter(([key, meta]) => !meta.system)
      .map(([key, meta]) => ({
        key,
        name: meta.name || key,
        color: meta.color,
        isCurrentlyApplied: currentLabels.has(key),
      }))
      .filter((label) => label.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [labels, searchQuery, currentLabels]);

  const handleApplyLabels = useCallback(() => {
    const ids = [...selectedIds]; // Capture IDs before any action

    const labelsToAdd = [];
    const labelsToRemove = [];
    for (const [labelKey, finalState] of Object.entries(overrides)) {
      if (finalState === "checked" && !currentLabels.has(labelKey)) {
        labelsToAdd.push(labelKey);
      }
      if (finalState === "unchecked" && currentLabels.has(labelKey)) {
        labelsToRemove.push(labelKey);
      }
      // "indeterminate" means leave it as-is
    }

    addLabels(ids, labelsToAdd);
    removeLabels(ids, labelsToRemove);

    const undo = () => {
      addLabels(ids, labelsToRemove);
      removeLabels(ids, labelsToAdd);
      setSnackbar({
        open: true,
        message: "Action undone.",
        autoHideDuration: 3000,
        action: null,
      });
    };

    // Generate the message based on what actions were taken
    let message = "";
    const normalizedAdd = labelsToAdd.map(normalizeLabelName);
    const normalizedRemove = labelsToRemove.map(normalizeLabelName);

    if (labelsToRemove.length > 0 && labelsToAdd.length > 0) {
      // Both add and remove
      message = `Conversation removed from '${normalizedRemove.join("', '")}', and added to '${normalizedAdd.join(
        "', '"
      )}'.`;
    } else if (labelsToRemove.length > 0) {
      // Only remove
      message = `Conversation removed from '${normalizedRemove.join("', '")}'.`;
    } else if (labelsToAdd.length > 0) {
      // Only add
      message = `Conversation added to '${normalizedAdd.join("', '")}'.`;
    }

    setSnackbar((prev) => ({
      ...prev,
      open: true,
      message,
      autoHideDuration: 3000,
      action: (
        <Button size="small" onClick={undo}>
          Undo
        </Button>
      ),
    }));

    selection.clear();
    setOverrides({}); // reset

    handleLabelClose();
    handleClose();
  }, [
    overrides,
    currentLabels,
    addLabels,
    removeLabels,
    setSnackbar,
    selection,
    handleLabelClose,
    handleClose,
    selectedIds,
  ]);

  return (
    <Popover
      open={Boolean(labelAnchorEl)}
      anchorEl={labelAnchorEl}
      onClose={handleLabelClose}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      slotProps={{
        transition: {
          onEntered: () => inputRef.current?.focus(),
        },
      }}
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
            inputRef={inputRef}
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
            availableLabels.map((label) => {
              const count = labelCounts.get(label.key) || 0;
              const baselineChecked = nSel > 0 && count === nSel;
              const baselineSome = nSel > 1 && count > 0 && count < nSel;

              let baselineState = "unchecked";
              if (baselineChecked) baselineState = "checked";
              else if (baselineSome) baselineState = "indeterminate";

              const effectiveState = overrides[label.key] || baselineState;

              const cycleState = (prev, baseline) => {
                if (baseline === "indeterminate") {
                  // Gmail 3-state cycle
                  if (prev === "indeterminate") return "checked";
                  if (prev === "checked") return "unchecked";
                  return baseline;
                } else {
                  // Normal 2-state toggle
                  return prev === "checked" ? "unchecked" : "checked";
                }
              };

              const handleClick = () => {
                setOverrides((prev) => ({
                  ...prev,
                  [label.key]: cycleState(effectiveState, baselineState),
                }));
              };

              const checked = effectiveState === "checked";
              const indeterminate = effectiveState === "indeterminate";

              return (
                <Box
                  key={label.key}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    paddingX: "16px",
                    paddingY: "4px",
                    cursor: "pointer",
                    "&:hover": { background: "#07070714" },
                  }}
                  onClick={handleClick}
                >
                  <Checkbox
                    checked={checked}
                    indeterminate={indeterminate}
                    icon={
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#5f6368" }}>
                        check_box_outline_blank
                      </span>
                    }
                    checkedIcon={
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#5f6368" }}>
                        check_box
                      </span>
                    }
                    indeterminateIcon={
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#5f6368" }}>
                        indeterminate_check_box
                      </span>
                    }
                    sx={{ padding: "4px", pointerEvents: "none" }}
                  />
                  <Typography sx={{ flex: 1, fontSize: "0.875rem", lineHeight: "20px" }}>
                    {normalizeLabelName(label.key)}
                  </Typography>
                </Box>
              );
            })
          )}
        </Box>

        {/* Footer */}
        <Box>
          <Divider />
          <Box sx={{ paddingY: "6px" }}>
            {hasChanges ? (
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
                    handleClose();
                    onOpenCreateLabelDialog();
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
