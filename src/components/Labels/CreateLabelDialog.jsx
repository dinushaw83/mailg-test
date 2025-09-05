import React, { useMemo, useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Checkbox, FormControlLabel,
    FormControl, InputLabel, Select, MenuItem
} from "@mui/material";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useLabels from "../../hooks/useLabels";
import { buildLabelTree, flattenTreeForSelect } from "../../utils/helperFunctions";

export default function CreateLabelDialog({ open, onClose, onAfterCreate }) {
    const { labels, setSnackbar } = useGlobalContext();
    const { createLabel } = useLabels();

    const [name, setName] = useState("");
    const [nest, setNest] = useState(false);
    const [parent, setParent] = useState("");
    const [attempted, setAttempted] = useState(false);

    // Build parent choices (Gmail-like nesting)
    const parentChoices = useMemo(() => {
        const filtered = Object.fromEntries(
            Object.entries(labels || {}).filter(([, meta]) => !meta?.system)
        );
        const tree = buildLabelTree(filtered);
        return flattenTreeForSelect(tree); // [{ value, label, depth }]
    }, [labels]);

    const trimmed = name.trim();
    const targetParent = nest ? (parent || null) : null;

    // sibling-scoped duplicate check
    const isDup = useMemo(() => {
        if (!trimmed) return false;
        return Object.entries(labels || {}).some(([n, meta]) => {
            const sameParent = (meta?.parent || null) === targetParent;
            return sameParent && n.toLowerCase() === trimmed.toLowerCase();
        });
    }, [labels, trimmed, targetParent]);

    // only block conditions we care about
    const missingName = trimmed.length === 0;
    const missingParent = nest && !parent;

    // Shown only after clicking Create
    const showError = attempted && (missingName || isDup || missingParent);
    const errorText =
        missingName
            ? "Please enter a label name:"
            : isDup
                ? "The label name you have chosen already exists. Please try another name:"
                : missingParent
                    ? "Please choose a parent label:"
                    : "Please enter a new label name:";

    const reset = () => {
        setName(""); setNest(false); setParent(""); setAttempted(false);   // reset attempted
    };

    // Keep "Create" enabled (Gmail style). We'll block in handleCreate if invalid.
    const canSubmit = trimmed.length > 0 && (!nest || !!parent);

    const handleClose = () => { reset(); onClose?.(); };

    const handleCreate = () => {
        // click/Enter: validate now
        if (missingName || isDup || missingParent) {
            setAttempted(true);
            return;
        }

        try {
            if (nest && parent) {
                createLabel(trimmed, { parent });
                onAfterCreate?.(trimmed, parent);
            } else {
                createLabel(trimmed);
                onAfterCreate?.(trimmed, null);
            }
            handleClose();
        } catch (e) {
            setSnackbar?.({
                open: true,
                message: e?.message || "Could not create label.",
                autoHideDuration: 4000,
            });
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth={false}
            slotProps={{
                paper: {
                    sx: {
                        width: "25%",     // custom px value
                        maxWidth: "90%", // still responsive
                        borderRadius: "24px",
                        p: 1.5,
                    },
                },
            }}
        >
            <DialogTitle sx={{ px: 3, pt: 3, pb: 1.5 }}>New label</DialogTitle>

            <DialogContent sx={{ px: 3, pt: 0, pb: 1.5 }}>
                <div
                    style={{
                        marginBottom: 12,
                        fontSize: 14,
                    }}
                >
                    {showError ? errorText : "Please enter a new label name:"}
                </div>

                <TextField
                    autoFocus
                    fullWidth
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            handleCreate();
                        }
                    }}
                    inputProps={{ "aria-label": "New label name" }}
                    error={!!trimmed && showError && (missingName || isDup)}
                    helperText=" "
                />

                <FormControlLabel
                    control={<Checkbox checked={nest} onChange={(e) => setNest(e.target.checked)} />}
                    label="Nest label under:"
                    sx={{ mt: 0.5 }}
                />

                <FormControl fullWidth disabled={!nest} sx={{ mb: 1 }}>
                    <InputLabel id="nest-under-label">Choose label</InputLabel>
                    <Select
                        labelId="nest-under-label"
                        label="Choose label"
                        value={parent}
                        onChange={(e) => setParent(e.target.value)}
                        MenuProps={{ PaperProps: { style: { maxHeight: 280 } } }}
                    >
                        {parentChoices.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                <span style={{ paddingLeft: 12 + opt.depth * 14, display: "inline-block" }}>
                                    {opt.label}
                                </span>
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
                    onClick={handleCreate}
                    // Keep enabled to match Gmail; we block in handler if invalid
                    disabled={!canSubmit}
                    sx={{ borderRadius: "20px", textTransform: "none", px: 3 }}
                >
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
}
