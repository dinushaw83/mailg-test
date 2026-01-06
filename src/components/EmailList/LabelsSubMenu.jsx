import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useLabels, { getPathLabelFromKey } from "../../hooks/useLabels";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";

export const LabelsSubMenu = ({ selectedIds, openCreateLabelDialog, shouldFocus = false }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { labels, setSnackbar, selection } = useGlobalContext();
  const { addLabels, removeLabels, modifyLabels } = useMailActions();
  const { getSelectionLabels } = useLabels();
  const [overrides, setOverrides] = useState({});
  const inputRef = useRef(null);

  // Focus the input when shouldFocus prop changes to true
  useEffect(() => {
    if (shouldFocus && inputRef.current) {
      // Small delay to ensure the submenu is fully rendered
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  }, [shouldFocus]);

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
    const labelsToAdd = Object.keys(overrides).filter((labelKey) => overrides[labelKey] === "checked");
    const labelsToRemove = Object.keys(overrides).filter((labelKey) => overrides[labelKey] === "unchecked");

    const addedMessage =
      labelsToAdd.length > 0 ? `added to ${labelsToAdd.map((key) => getPathLabelFromKey(labels, key)).join(", ")}` : "";

    const removedMessage =
      labelsToRemove.length > 0
        ? `removed from ${labelsToRemove.map((key) => getPathLabelFromKey(labels, key)).join(", ")}`
        : "";

    let message = "";

    if (labelsToAdd.length > 0 && labelsToRemove.length > 0) {
      message = `Conversation ${removedMessage} and ${addedMessage}`;
    } else if (labelsToAdd.length > 0 && labelsToRemove.length === 0) {
      message = `Conversation ${addedMessage}`;
    } else if (labelsToAdd.length === 0 && labelsToRemove.length > 0) {
      message = `Conversation ${removedMessage}`;
    }

    if (message) {
      modifyLabels(selectedIds, { add: labelsToAdd, remove: labelsToRemove });

      const undo = () => {
        modifyLabels(selectedIds, { add: labelsToRemove, remove: labelsToAdd });
        setSnackbar({
          open: true,
          message: "Action undone.",
          autoHideDuration: 3000,
          action: null,
        });
      };

      setSnackbar({
        open: true,
        message,
        autoHideDuration: 10000,
        action: (
          <Button size="small" onClick={undo}>
            Undo
          </Button>
        ),
      });
    }

    selection.clear();
    setOverrides({}); // reset
  }, [overrides, currentLabels, modifyLabels, setSnackbar, selection, selectedIds, labels]);

  return (
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
          onChange={(e) => {
            e.stopPropagation();
            setSearchQuery(e.target.value);
          }}
          onClick={(e) => e.stopPropagation()}
          variant="standard"
          sx={{
            "& .MuiInput-underline:before": {
              borderBottomColor: "#dadce0",
            },
            "& .MuiInput-underline:after": {
              borderBottomColor: "#1a73e8",
              borderBottomWidth: "2px",
            },
            "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
              borderBottomColor: "#dadce0",
            },
            "&.Mui-focused .MuiInput-underline:after": {
              borderBottomColor: "#1a73e8",
              borderBottomWidth: "2px",
            },
          }}
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
                // 3-state toggle cycle like MailG
                if (prev === "indeterminate") return "checked";
                if (prev === "checked") return "unchecked";
                return baseline;
              } else {
                // Normal 2-state toggle
                return prev === "checked" ? "unchecked" : "checked";
              }
            };

            const handleClick = (e) => {
              e.stopPropagation();
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
                  {getPathLabelFromKey(labels, label.key)}
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
                  openCreateLabelDialog();
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
  );
};
