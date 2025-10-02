import React, { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
} from "@mui/material";
import { useGlobalContext } from "../../../../contexts/GlobalContext";

const dialogHeadlineStyle = {
    color: "var(--gm3-dialog-headline-color, var(--gm3-sys-color-on-surface, #1f1f1f))",
    lineHeight: "var(--gm3-dialog-headline-line-height, 2rem)",
    fontSize: "var(--gm3-dialog-headline-size, 1.5rem)",
    letterSpacing: "var(--gm3-dialog-headline-tracking, 0)",
    fontWeight: "var(--gm3-dialog-headline-weight, 400)",
};


export default function NewSignatureDialog({ open, onClose, onAfterCreate }) {
    const { setSnackbar } = useGlobalContext();
    const [name, setName] = useState("");

    const reset = () => setName("");

    const handleClose = () => {
        reset();
        onClose?.();
    };

    const handleCreate = () => {
        if (!name.trim()) {
            setSnackbar({
                open: true,
                message: "Signature name cannot be empty",
            });
            return;
        }
        onAfterCreate?.(name.trim());
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
                        width: 420,
                        maxWidth: "90%",
                        borderRadius: "12px",
                    },
                },
            }}
        >
            <DialogTitle sx={{
                px: 3, pt: 3, pb: 1.5,
            }} style={dialogHeadlineStyle}>Name new signature</DialogTitle>

            <DialogContent sx={{ px: 3, pt: 0, pb: 1 }}>
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
                    helperText={`${name.length}/320`}
                    placeholder="Signature name"
                    inputProps={{ maxLength: 320 }}
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            "& fieldset": {
                                borderColor: "#747775",
                            },
                            "&.Mui-focused fieldset": {
                                borderColor: "#0b57d0",
                            },
                        },
                        "& .MuiInputBase-input::placeholder": {
                            color: "#5f6368",
                            opacity: 1,
                        },
                        "& .MuiFormHelperText-root": {
                            textAlign: "right",
                            fontSize: "0.75rem",
                            color: "#5f6368",
                        },
                    }}
                />
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button
                    sx={{ borderRadius: "20px", textTransform: "none", px: 3 }}
                    onClick={handleClose}
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleCreate}
                    sx={{
                        borderRadius: "20px",
                        textTransform: "none",
                        px: 3,
                        backgroundColor: "#0b57d0",
                        color: "#fff",
                        "&:hover": {
                            backgroundColor: "#0b57d0",
                            opacity: 0.9,
                        },
                    }}
                >
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
}
