import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Button,
} from "@mui/material";

export const SCOPES = {
  SINGLE: "single",
  WITH_SUBLABELS: "with_sublabels",
};

export default function ChangeLabelColorModal({ open, onClose, labelName, onConfirm }) {
  const [scope, setScope] = useState(SCOPES.SINGLE);

  const handleConfirm = () => {
    onConfirm(scope);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "24px",
            p: 1.5,
          },
        },
      }}
    >
      <DialogTitle sx={{ px: 3, pt: 3, pb: 1.5 }}>Changing colour on multiple labels</DialogTitle>

      <DialogContent sx={{ px: 3, pt: 0, pb: 1.5 }}>
        <Typography sx={{ mb: 2, fontSize: 14 }}>Set colour for:</Typography>

        <RadioGroup value={scope} onChange={(e) => setScope(e.target.value)}>
          <FormControlLabel
            value={SCOPES.SINGLE}
            control={<Radio />}
            label={
              <Typography fontSize={14}>
                Only label <strong>"{labelName}"</strong>
              </Typography>
            }
          />
          <FormControlLabel
            value={SCOPES.WITH_SUBLABELS}
            control={<Radio />}
            label={
              <Typography fontSize={14}>
                Label <strong>‘{labelName}’</strong> and its sublabels
              </Typography>
            }
          />
        </RadioGroup>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: "20px", textTransform: "none", px: 3 }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleConfirm} sx={{ borderRadius: "20px", textTransform: "none", px: 3 }}>
          Set colour
        </Button>
      </DialogActions>
    </Dialog>
  );
}
