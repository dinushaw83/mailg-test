import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useLabels, { getPathLabelFromKey, normalizeLabelName } from "../../hooks/useLabels";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import Popover from "@mui/material/Popover";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { buildLabelPath } from "../../utils/labelSync";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";

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
  const { addLabels, removeLabels, modifyLabels } = useMailActions();
  const { getSelectionLabels } = useLabels();
  const [overrides, setOverrides] = useState({});
  const inputRef = useRef(null);
  const { folder } = useParams();

  // Get labelIdToKeyMap from Redux to convert UUID keys to composite keys for display
  const labelIdToKeyMap = useSelector((state) => state.mail.labelIdToKeyMap || {});

  const handleLabelClose = () => {
    setLabelAnchorEl(null);
    setSearchQuery("");
    setSelectedLabelKeys(new Set());
    setOverrides({}); // Clear pending changes when closing without applying
  };

  const hasChanges = Object.keys(overrides).length > 0;

  // Get currently applied labels for selected emails, passing folder if present
  const { currentLabels, labelCounts, nSel } = getSelectionLabels(selectedIds, folder);
  console.log({ currentLabels, labelCounts, nSel, selectedIds });

  const availableLabels = useMemo(() => {
    return Object.entries(labels || {})
      .filter(([key, meta]) => !meta.system)
      .map(([key, meta]) => {
        const fullPath = buildLabelPath(key, meta, labels, labelIdToKeyMap, getPathLabelFromKey);

        return {
          key, // Keep original key for operations (UUID or composite)
          fullPath, // Full path for display (e.g., "Parent/child/subchild")
          name: meta.name || key,
          color: meta.color,
          isCurrentlyApplied: currentLabels.has(key),
        };
      })
      .filter((label) => {
        // Use full path for search filtering
        return label.fullPath.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => {
        // Sort by full path
        return a.fullPath.localeCompare(b.fullPath);
      });
  }, [labels, searchQuery, currentLabels, labelIdToKeyMap]);

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

    modifyLabels(ids, { add: labelsToAdd, remove: labelsToRemove });

    const undo = () => {
      modifyLabels(ids, { add: labelsToRemove, remove: labelsToAdd });
      setSnackbar({
        open: true,
        message: "Action undone.",
        autoHideDuration: 3000,
        action: null,
      });
    };

    // Generate the message based on what actions were taken
    let message = "";
    const normalizedAdd = labelsToAdd.map((key) => getPathLabelFromKey(labels, key));
    const normalizedRemove = labelsToRemove.map((key) => getPathLabelFromKey(labels, key));

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

    console.log({ overrides });
    selection.clear();
    setOverrides({}); // reset

    handleLabelClose();
    handleClose();
  }, [
    overrides,
    currentLabels,
    modifyLabels,
    setSnackbar,
    selection,
    handleLabelClose,
    handleClose,
    selectedIds,
    labels,
  ]);

  console.log({ availableLabels });
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
              // alert('asdad')
              // labelCounts: count of each label on the selected emails
              // nSel: number of selected emails
              // baselineChecked: true if the label is on all selected emails
              // baselineSome: true if the label is on some of the selected emails
              // baselineState: "checked" if the label is on all selected emails, "indeterminate" if the label is on some of the selected emails, "unchecked" if the label is on none of the selected emails
              // NEW: Iterate through the Map entries to find the matching object ID
              let count = 0;
              for (const [keyObj, val] of labelCounts.entries()) {
                if (keyObj.id === label.key) {
                  count = val;
                  break; // Stop once we found the match
                }
              }
              const baselineChecked = nSel > 0 && count === nSel;
              const baselineSome = nSel > 1 && count > 0 && count < nSel;
              console.log({ label, baselineChecked, baselineSome, count, nSel, labelCounts });

              let baselineState = "unchecked";
              if (baselineChecked) baselineState = "checked";
              else if (baselineSome) baselineState = "indeterminate";

              const effectiveState = overrides[label.key] || baselineState;

              const cycleState = (prev, baseline) => {
                if (baseline === "indeterminate") {
                  // 3-state cycle
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
                  <Typography sx={{ flex: 1, fontSize: "0.875rem", lineHeight: "20px" }}>{label.fullPath}</Typography>
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
