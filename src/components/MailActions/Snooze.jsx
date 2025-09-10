import React, { useState, useEffect, Fragment } from "react";
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
import { StaticDatePicker } from "@mui/x-date-pickers/StaticDatePicker";

const CalendarPickerModal = ({ open, onClose, selectedDateTime, setSelectedDateTime, onConfirm }) => {
  const [dateError, setDateError] = useState("");
  const [timeError, setTimeError] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");

  // Helper function to safely format date
  const formatDate = (date) => {
    if (!date || typeof date.toLocaleDateString !== "function") {
      return "";
    }
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Helper function to safely format time
  const formatTime = (date) => {
    if (!date || typeof date.toLocaleTimeString !== "function") {
      return "";
    }
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // Helper function to validate date
  const validateDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    const inputDate = new Date(date);
    inputDate.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

    if (isNaN(inputDate.getTime())) {
      return "Invalid Date";
    }
    if (inputDate < today) {
      return "Invalid Date";
    }
    return "";
  };

  // Helper function to validate time
  const validateTime = (timeString, selectedDate) => {
    const [hours, minutes] = timeString.split(":");

    if (!hours || !minutes) {
      return "Invalid time format";
    }

    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);

    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return "Invalid time";
    }

    // If the selected date is today, check if time is in the future
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();

    if (isToday) {
      const now = new Date();
      const inputTime = new Date(selectedDate);
      inputTime.setHours(hour, minute, 0, 0);

      if (inputTime <= now) {
        return "Invalid time";
      }
    }

    return "";
  };

  // Update input fields when selectedDateTime changes
  useEffect(() => {
    setDateInput(formatDate(selectedDateTime));
    setTimeInput(formatTime(selectedDateTime));
  }, [selectedDateTime]);

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
          width: 500,
          bgcolor: "background.paper",
          borderRadius: 10,
          boxShadow: 24,
          p: 4,
        }}
      >
        <Typography variant="h6" component="h2" sx={{ mb: 3 }}>
          Select Date & Time
        </Typography>
        <Box sx={{ mb: 3, display: "flex" }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <StaticDatePicker
              displayStaticWrapperAs="desktop"
              value={selectedDateTime}
              onChange={(newValue) => {
                setSelectedDateTime(newValue);
                setDateError(""); // Clear date error when using calendar
                setTimeError(""); // Clear time error when using calendar
              }}
              disablePast
              slotProps={{
                actionBar: {
                  actions: [],
                },
              }}
            />
            {/* <DateTimePicker
            label="Snooze until"
            value={selectedDateTime}
            onChange={(newValue) => setSelectedDateTime(newValue)}
            renderInput={(params) => <TextField {...params} fullWidth />}
            minDateTime={new Date()}
            sx={{ mb: 3 }}
          /> */}
          </LocalizationProvider>

          <Box sx={{ display: "flex", gap: 2, flexDirection: "column" }}>
            <TextField
              label="Date"
              value={dateInput}
              onChange={(event) => setDateInput(event.target.value)}
              error={!!dateError}
              helperText={dateError}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const error = validateDate(event.target.value);
                  setDateError(error);
                  if (!error) {
                    const newDate = new Date(event.target.value);
                    setSelectedDateTime(newDate);
                  }
                }
              }}
              sx={{ mb: 3 }}
            />

            <TextField
              label="Time"
              value={timeInput}
              onChange={(event) => setTimeInput(event.target.value)}
              error={!!timeError}
              helperText={timeError}
              placeholder="08:00"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const timeString = event.target.value;
                  const error = validateTime(timeString, selectedDateTime);
                  setTimeError(error);
                  if (!error) {
                    const [hours, minutes] = timeString.split(":");
                    const newDate = new Date(selectedDateTime);
                    newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
                    setSelectedDateTime(newDate);
                  }
                }
              }}
              sx={{ mb: 3 }}
            />
          </Box>
        </Box>

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
    onClose();
  };

  const handleDateTimeConfirm = () => {
    console.log("handleDateTimeConfirm", selectedDateTime);
    snooze(selectedIds, selectedDateTime);
    setCalendarModalOpen(false);
    onClose();
  };

  return (
    <>
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
      </Popover>

      <CalendarPickerModal
        open={calendarModalOpen}
        onClose={handleCalendarClose}
        selectedDateTime={selectedDateTime}
        setSelectedDateTime={setSelectedDateTime}
        onConfirm={handleDateTimeConfirm}
      />
    </>
  );
};
