import React, { useMemo, useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Checkbox, FormControlLabel,
    FormControl, InputLabel, Select, MenuItem
} from "@mui/material";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useLabels from "../../hooks/useLabels";

export default function CreateLabelDialog({ open, onClose, onAfterCreate }) {
    const { labels, setSnackbar } = useGlobalContext();
    const { createLabel } = useLabels()

    const [name, setName] = useState("");
    const [nest, setNest] = useState(false);
    const [parent, setParent] = useState("");

    // non-system labels for the dropdown
    const labelOptions = useMemo(
        () => Object.entries(labels || {})
            .filter(([, meta]) => !meta.system)
            .map(([n]) => n)
            .sort((a, b) => a.localeCompare(b)),
        [labels]
    );

    const trimmed = name.trim();
    const isDup = useMemo(
        () => Object.keys(labels || {}).some(n => n.toLowerCase() === trimmed.toLowerCase()),
        [labels, trimmed]
    );
    const canCreate = trimmed.length > 0 && !isDup && (!nest || !!parent);

    const reset = () => {
        setName("");
        setNest(false);
        setParent("");
    };

    const handleClose = () => {
        reset();
        onClose?.();
    };

    const handleCreate = () => {
        try {
            // If you want parent/child naming like "Parent/Child":
            const finalName = nest && parent ? `${parent}/${trimmed}` : trimmed;
            createLabel(finalName);
            
            // we leave onAfterCreate to notify parent components of the new label
            if (onAfterCreate) {
                onAfterCreate(finalName);
            } else {
                setSnackbar({
                    open: true,
                    message: `Created label “${finalName}”.`,
                    autoHideDuration: 3000,
                });
            }

            handleClose();
        } catch (e) {
            setSnackbar({
                open: true,
                message: e?.message || "Could not create label.",
                autoHideDuration: 4000,
            });
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs" slotProps={{
            paper: {
                sx: {
                    borderRadius: "24px",
                    padding: "12px",
                }
            }
        }}>
            <DialogTitle>New label</DialogTitle>
            <DialogContent>
                <div style={{ marginBottom: 12, color: "rgba(0,0,0,0.6)", fontSize: 14 }}>
                    Please enter a new label name:
                </div>

                <TextField
                    autoFocus
                    fullWidth
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder=""
                    inputProps={{ "aria-label": "New label name" }}
                    error={!!trimmed && isDup}
                    helperText={isDup ? "A label with this name already exists." : " "}
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
                        {labelOptions.map((opt) => (
                            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </DialogContent>

            <DialogActions>
                <Button
                    onClick={handleClose}
                    sx={{
                        borderRadius: "20px",
                        textTransform: "none",
                        px: 3,
                    }}
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleCreate}
                    disabled={!canCreate}
                    sx={{
                        borderRadius: "20px",
                        textTransform: "none",
                        px: 3,
                    }}
                >
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
}
