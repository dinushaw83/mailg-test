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
  OutlinedInput,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useLabels, { flattenTreeForSelect, ROOT, splitKey } from "../../hooks/useLabels";

const NoLegendOutlinedInput = styled(OutlinedInput)({
  "& legend": {
    display: "none",
  },
  "& fieldset": {
    top: 0,
  },
});

export default function CreateLabelDialog({
  open,
  onClose,
  onAfterCreate,
  defaultParentKey,
  labelDefaultName,
  isMoving = true,
}) {
  const { setSnackbar } = useGlobalContext();
  const { labels, createLabel, labelTree, renameLabel } = useLabels();
  const [name, setName] = useState(labelDefaultName ?? "");
  const [nest, setNest] = useState(false);
  const [parentKey, setParentKey] = useState(defaultParentKey ?? null);
  const [attempted, setAttempted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const inputRef = React.useRef(null);

  const parentChoices = useMemo(
    () => flattenTreeForSelect(labelTree).filter((opt) => !labels?.[opt.key]?.system),
    [labelTree, labels]
  );

  const trimmed = name.trim();
  const targetParentKey = nest ? (parentKey ?? ROOT) : ROOT;

  const isEditing = useMemo(() => !!labelDefaultName, [labelDefaultName]);

  useEffect(() => {
    setNest(Boolean(parentKey));
  }, [parentKey]);

  useEffect(() => {
    setParentKey(defaultParentKey ?? null);
  }, [defaultParentKey]);

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

  const handleCreate = async () => {
    // validate on submit
    if (missingName || isDup || missingParent) {
      setAttempted(true);
      return;
    }
    try {
      const pk = nest ? parentKey : ROOT;
      const createdLabel = await createLabel(trimmed, { parentKey: pk });
      onAfterCreate?.(trimmed, pk, isMoving, createdLabel?.id);

      handleClose();
    } catch (e) {
      setSnackbar?.({
        open: true,
        message: e?.message || "Could not create label.",
        autoHideDuration: 4000,
      });
    }
  };

  const handleSave = () => {
    renameLabel(currentLabelKey, trimmed);
    onAfterCreate?.(trimmed, parentKey, isMoving);
    setSnackbar?.({
      open: true,
      message: `The label "${trimmed}" was saved.`,
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
        transition: {
          onEntered: () => {
            if (inputRef.current) {
              inputRef.current.focus();
            }
          },
        },
      }}
    >
      <DialogTitle sx={{ px: 3, pt: 3, pb: 1.5 }}>New label</DialogTitle>

      <DialogContent sx={{ px: 3, pt: 0, pb: 1.5 }}>
        <div style={{ marginBottom: 12, fontSize: 14 }}>{showError ? errorText : "Please enter a new label name:"}</div>

        <TextField
          autoFocus
          fullWidth
          value={name ?? defaultName}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
          error={showError && (missingName || isDup)}
          helperText=" "
          inputRef={inputRef}
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
          <InputLabel
            shrink={false}
            sx={{
              "&.MuiInputLabel-shrink": {
                backgroundColor: "#f0f4fa",
                paddingRight: "4px",
              },
            }}
          >
            {nest && !parentKey && !isDropdownOpen ? "Please select a parent..." : ""}
          </InputLabel>
          <Select
            input={<NoLegendOutlinedInput />}
            value={parentKey ?? ""}
            onChange={(e) => setParentKey(e.target.value || null)}
            MenuProps={{
              PaperProps: {
                style: { maxHeight: 280, backgroundColor: "#f0f4fa" },
              },
            }}
            onOpen={() => setIsDropdownOpen(true)}
            onClose={() => setIsDropdownOpen(false)}
          >
            <MenuItem disabled sx={{ my: 2 }}>
              <span>Please select a parent...</span>
            </MenuItem>
            {parentChoices.map((opt) => (
              <MenuItem key={opt.key} value={opt.key} sx={{ py: 1.5 }}>
                <span style={{ paddingLeft: 12 + opt.depth * 14 }}>{opt.name}</span>
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
          onClick={isEditing ? handleSave : handleCreate}
          disabled={!canSubmit} // keep enabled; validation happens on submit
          sx={{ borderRadius: "20px", textTransform: "none", px: 3 }}
        >
          {isEditing ? "Save" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
