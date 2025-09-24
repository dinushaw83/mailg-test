import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Button,
} from "@mui/material";

export default function RemoveLabelModal({
    open,
    onClose,
    labelName,
    onConfirm,
    conversationCount,
    multipleLabels = [],
}) {
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    let content;
    if (multipleLabels.length > 1) {
        content = (
            <>
                <Typography sx={{ mb: 2, fontSize: 14 }}>
                    The following labels will be removed from your messages and then deleted.
                    No messages will be deleted.
                </Typography>
                {multipleLabels.map((lbl) => (
                    <Typography
                        key={lbl.key}
                        sx={{ fontSize: 14, ml: 2 + lbl.depth * 2 }} // indent by depth
                    >
                        <strong>{lbl.name}</strong> ({lbl.count} {lbl.count === 1 ? "conversation" : "conversations"})
                    </Typography>
                ))}
            </>
        );
    } else {
        const lbl = multipleLabels[0];
        content = (
            <Typography sx={{ mb: 2, fontSize: 14 }}>
                {lbl.count
                    ? <>Remove the label "<strong>{lbl.name}</strong>" from {lbl.count} {lbl.count === 1 ? "conversation" : "conversations"} and delete the label?</>
                    : <>Delete the label "<strong>{lbl.name}</strong>"?</>}
            </Typography>
        );
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
            slotProps={{ paper: { sx: { borderRadius: "24px", p: 1.5 } } }}>
            <DialogTitle sx={{ px: 3, pt: 3, pb: 1.5, fontWeight: 400, fontSize: "1.5rem", color: "#1f1f1f" }}>
                Remove label
            </DialogTitle>
            <DialogContent sx={{ px: 3, mt: 2, pb: 1.5 }}>
                {content}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} sx={{ borderRadius: "20px", textTransform: "none", px: 3 }}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleConfirm}
                    sx={{
                        borderRadius: "20px",
                        textTransform: "none",
                        px: 3,
                        backgroundColor: "#0b57d0",
                        boxShadow: "none",
                        paddingInline: "24px",
                    }}
                >
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    );
}
