import React, { useMemo, useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Checkbox, FormControlLabel,
    FormControl, InputLabel, Select, MenuItem
} from "@mui/material";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useLabels, { flattenTreeForSelect, ROOT, splitKey } from "../../hooks/useLabels";

export default function CreateLabelDialog({ open, onClose, onAfterCreate }) {
    const { setSnackbar } = useGlobalContext();
    const { labels, createLabel, labelTree } = useLabels();

    const [name, setName] = useState("");
    const [nest, setNest] = useState(false);
    const [parentKey, setParentKey] = useState(null);
    const [attempted, setAttempted] = useState(false);

    const parentChoices = useMemo(
        () => flattenTreeForSelect(labelTree).filter(opt => !labels?.[opt.key]?.system),
        [labelTree, labels]
    );

    const trimmed = name.trim();
    const targetParentKey = nest ? (parentKey ?? ROOT) : ROOT;

    const isDup = useMemo(() => {
        if (!trimmed) return false;

        return Object.entries(labels || {}).some(([key, meta]) => {
            // prefer meta, but fall back to parsing the key
            let candidateName = meta?.name;
            let candidateParentKey = meta?.parentKey;

            if (candidateName == null || candidateParentKey === undefined) {
                const parsed = splitKey(key);
                candidateName = candidateName ?? parsed.name;
                candidateParentKey = candidateParentKey ?? (parsed.parentKey ?? ROOT);
            }

            const sameParent = (candidateParentKey ?? ROOT) === targetParentKey;
            return sameParent && (candidateName || "").toLowerCase() === trimmed.toLowerCase();
        });
    }, [labels, trimmed, targetParentKey]);

    const missingName = trimmed.length === 0;
    const missingParent = nest && !parentKey;

    const canSubmit = trimmed.length > 0 && (!nest || !!parentKey);

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
        setName("");
        setNest(false);
        setParentKey(null);
        setAttempted(false);
    };
    const handleClose = () => { reset(); onClose?.(); };

    const handleCreate = () => {
        // validate on submit (Gmail style)
        if (missingName || isDup || missingParent) {
            setAttempted(true);
            return;
        }
        try {
            const pk = nest ? parentKey : ROOT;
            createLabel(trimmed, { parentKey: pk });
            onAfterCreate?.(trimmed, pk);

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
                        width: 420,        // custom width: between xs and sm
                        maxWidth: "90%",
                        borderRadius: "24px",
                        p: 1.5,
                    },
                },
            }}
        >
            <DialogTitle sx={{ px: 3, pt: 3, pb: 1.5 }}>New label</DialogTitle>

            <DialogContent sx={{ px: 3, pt: 0, pb: 1.5 }}>
                <div style={{ marginBottom: 12, fontSize: 14}}>
                    {showError ? errorText : "Please enter a new label name:"}
                </div>

                <TextField
                    autoFocus
                    fullWidth
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate(); } }}
                    inputProps={{ "aria-label": "New label name" }}
                    error={showError && (missingName || isDup)}
                    helperText=" "
                />

                <FormControlLabel
                    control={<Checkbox checked={nest} onChange={(e) => {
                        setNest(e.target.checked);
                        if (!e.target.checked) setParentKey(null);
                    }
                    } />}
                    label="Nest label under:"
                    sx={{ mt: 0.5 }}
                />

                <FormControl fullWidth disabled={!nest} sx={{ mb: 1 }}>
                    <InputLabel id="nest-under-label">Choose label</InputLabel>
                    <Select
                        value={parentKey ?? ""}
                        onChange={(e) => setParentKey(e.target.value || null)}
                        labelId="nest-under-label"
                        label="Choose label"
                        MenuProps={{ PaperProps: { style: { maxHeight: 280 } } }}
                    >
                        {parentChoices.map(opt => (
                            <MenuItem key={opt.key} value={opt.key}>
                                <span style={{ paddingLeft: 12 + opt.depth * 14, display: "inline-block" }}>
                                    {opt.name}
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
                    disabled={!canSubmit} // keep enabled; validation happens on submit
                    sx={{ borderRadius: "20px", textTransform: "none", px: 3 }}
                >
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
}
