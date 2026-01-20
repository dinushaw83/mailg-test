import React, { useMemo, useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useLabels, { flattenTreeForSelect, getPathLabelFromKey, ROOT, splitKey } from "../../hooks/useLabels";

export default function EditLabelDialog({
  open,
  onClose,
  onAfterCreate,
  defaultParentKey,
  labelDefaultName,
  labelDefaultKey,
}) {
  const { setSnackbar } = useGlobalContext();
  const { labels, labelTree, renameLabel } = useLabels();
  const [name, setName] = useState(labelDefaultName ?? "");
  const [nest, setNest] = useState(false);
  const [parentKey, setParentKey] = useState(defaultParentKey ?? null);
  const [attempted, setAttempted] = useState(false);
  const [currentLabelKey, setCurrentLabelKey] = useState(labelDefaultKey ?? null);

  useEffect(() => {
    setCurrentLabelKey(labelDefaultKey ?? null);
  }, [labelDefaultKey]);

  useEffect(() => {
    setParentKey(defaultParentKey ?? null);
  }, [defaultParentKey]);

  const parentChoices = useMemo(() => flattenTreeForSelect(labelTree).filter((opt) => !opt.system), [labelTree]);

  const trimmed = name.trim();
  const targetParentKey = nest ? (parentKey ?? ROOT) : ROOT;

  useEffect(() => {
    setNest(Boolean(parentKey));
  }, [parentKey]);

  useEffect(() => {
    setName(labelDefaultName ?? "");
  }, [labelDefaultName]);

  const isDup = useMemo(() => {
    if (!trimmed) return false;

    return Object.entries(labels || {}).some(([key, meta]) => {
      // prefer meta, but fall back to parsing the key
      let candidateName = meta?.name;
      let candidateParentKey = meta?.parentKey;

      if (candidateName == null || candidateParentKey === undefined) {
        const parsed = splitKey(key);
        candidateName = candidateName ?? parsed.name;
        candidateParentKey = candidateParentKey ?? parsed.parentKey ?? ROOT;
      }

      const sameParent = (candidateParentKey ?? ROOT) === targetParentKey;
      return sameParent && (candidateName || "").toLowerCase() === trimmed.toLowerCase();
    });
  }, [labels, trimmed, targetParentKey]);

  const missingName = trimmed.length === 0;
  const missingParent = nest && !parentKey;

  const canSubmit = trimmed.length > 0 && (!nest || !!parentKey);

  const showError = attempted && (missingName || isDup || missingParent);
  const errorText = missingName
    ? "Please enter a label name:"
    : isDup
      ? "The label name you have chosen already exists. Please try another name:"
      : missingParent
        ? "Please choose a parent label:"
        : "Please enter a new label name:";

  const reset = () => {
    setName("");
    setNest(false);
    setParentKey(null);
    setAttempted(false);
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const handleSave = () => {
    const oldPath = getPathLabelFromKey(labels, currentLabelKey);
    const newPath = parentKey && parentKey !== ROOT ? `${getPathLabelFromKey(labels, parentKey)}/${trimmed}` : trimmed;

    renameLabel(currentLabelKey, trimmed, parentKey);
    onAfterCreate?.(trimmed, parentKey);
    setSnackbar?.({
      open: true,
      message: `The label ${oldPath} was renamed to ${newPath}.`,
      autoHideDuration: 4000,
    });
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            width: 420, // custom width: between xs and sm
            maxWidth: "90%",
            borderRadius: "24px",
            p: 1.5,
          },
        },
      }}
    >
      <DialogTitle sx={{ px: 3, pt: 3, pb: 1.5 }}>Edit label</DialogTitle>

      <DialogContent sx={{ px: 3, pt: 0, pb: 1.5 }}>
        <div style={{ marginBottom: 12, fontSize: 14 }}>{showError ? errorText : "Label name:"}</div>

        <TextField
          autoFocus
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSave();
            }
          }}
          error={showError && (missingName || isDup)}
          helperText=" "
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={nest}
              onChange={(e) => {
                setNest(e.target.checked);
                if (!e.target.checked) setParentKey(null);
              }}
            />
          }
          label="Nest label under:"
          sx={{ mt: 0.5 }}
        />

        <FormControl fullWidth>
          <InputLabel id="nest-under-label">Choose label</InputLabel>
          <Select
            value={parentKey ?? ""}
            onChange={(e) => setParentKey(e.target.value || null)}
            labelId="nest-under-label"
            label="Choose label"
            MenuProps={{ PaperProps: { style: { maxHeight: 280, backgroundColor: "#f0f4fa" } } }}
          >
            <MenuItem disabled sx={{ my: 2 }}>
              <span style={{ display: "inline-block" }}>Please select a parent...</span>
            </MenuItem>
            {parentChoices.map((opt) => (
              <MenuItem key={opt.key} value={opt.key} sx={{ py: 1.5 }}>
                <span style={{ paddingLeft: 12 + opt.depth * 14, display: "inline-block" }}>{opt.name}</span>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button sx={{ borderRadius: "20px", textTransform: "none", px: 3 }} onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!canSubmit} // keep enabled; validation happens on submit
          sx={{ borderRadius: "20px", textTransform: "none", px: 3 }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
