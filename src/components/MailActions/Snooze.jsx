import React, { useState } from "react";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Modal from "@mui/material/Modal";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ActionMenuItem } from "./ActionMenuItem";

const CalendarPickerModal = ({ open, onClose, selectedDateTime, setSelectedDateTime, onConfirm }) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="calendar-picker-modal"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
        }}
      >
        <Typography variant="h6" component="h2" sx={{ mb: 3, textAlign: "center" }}>
          Select Date & Time
        </Typography>

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DateTimePicker
            label="Snooze until"
            value={selectedDateTime}
            onChange={(newValue) => setSelectedDateTime(newValue)}
            renderInput={(params) => <TextField {...params} fullWidth />}
            minDateTime={new Date()}
            sx={{ mb: 3 }}
          />
        </LocalizationProvider>

        <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="contained">
            Confirm
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export const SnoozePopover = ({ anchorEl, open, onClose, onBack, selectedIds, snooze }) => {
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState(new Date());
  const today = new Date();

  // Later today - set to 6 PM today
  const laterToday = new Date(today);
  laterToday.setHours(18, 0, 0, 0);

  // Tomorrow - set to 8 AM tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  // Later this week - next Friday at 8 AM
  const laterThisWeek = new Date(today);
  const daysUntilFriday = (5 - today.getDay() + 7) % 7;
  laterThisWeek.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
  laterThisWeek.setHours(8, 0, 0, 0);

  // This weekend - next Sunday at 8 AM
  const thisWeekend = new Date(today);
  const daysUntilSunday = (0 - today.getDay() + 7) % 7;
  thisWeekend.setDate(today.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  thisWeekend.setHours(8, 0, 0, 0);

  // Next week - next Monday at 8 AM
  const nextWeek = new Date(today);
  const daysUntilMonday = (1 - today.getDay() + 7) % 7;
  nextWeek.setDate(today.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
  nextWeek.setHours(8, 0, 0, 0);

  // Format dates for display - "Wed, 18:00", "Thu, 08:00", etc.
  const formatTime = (date) => {
    const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
    const time = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${weekday}, ${time}`;
  };

  const handleCalendarOpen = () => {
    setCalendarModalOpen(true);
  };

  const handleCalendarClose = () => {
    setCalendarModalOpen(false);
  };

  const handleDateTimeConfirm = () => {
    snooze(selectedIds, selectedDateTime);
    setCalendarModalOpen(false);
    onClose();
  };

  return (
    <Popover
      id="snooze-popover"
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
    >
      <Box sx={{ paddingY: "6px", width: "256px", minHeight: "109px" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            paddingX: "16px",
            height: "32px",
          }}
        >
          <Typography sx={{ flex: 1, paddingY: "16px", fontSize: "0.875rem", lineHeight: "20px" }}>
            Snooze until...
          </Typography>
        </Box>

        {/* <Divider sx={{ marginY: "6px" }} /> */}

        <ActionMenuItem
          label="Later today"
          rightText={formatTime(laterToday)}
          onClick={() => {
            snooze(selectedIds, laterToday);
            onClose();
          }}
        />
        <ActionMenuItem
          label="Tomorrow"
          rightText={formatTime(tomorrow)}
          onClick={() => {
            snooze(selectedIds, tomorrow);
            onClose();
          }}
        />
        <ActionMenuItem
          label="Later this week"
          rightText={formatTime(laterThisWeek)}
          onClick={() => {
            snooze(selectedIds, laterThisWeek);
            onClose();
          }}
        />
        <ActionMenuItem
          label="This weekend"
          rightText={formatTime(thisWeekend)}
          onClick={() => {
            snooze(selectedIds, thisWeekend);
            onClose();
          }}
        />
        <ActionMenuItem
          label="Next week"
          rightText={formatTime(nextWeek)}
          onClick={() => {
            snooze(selectedIds, nextWeek);
            onClose();
          }}
        />
        <Divider sx={{ marginY: "6px" }} />
        <ActionMenuItem icon="calendar_month" label="Select date & time" onClick={handleCalendarOpen} />
      </Box>

      <CalendarPickerModal
        open={calendarModalOpen}
        onClose={handleCalendarClose}
        selectedDateTime={selectedDateTime}
        setSelectedDateTime={setSelectedDateTime}
        onConfirm={handleDateTimeConfirm}
      />
    </Popover>
  );
};
