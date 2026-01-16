import React, { useState, useEffect, useMemo, Fragment } from "react";
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
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions, { makeMatch } from "../../hooks/useMailActions";

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

  const handleConfirm = () => {
    let candidate = new Date(selectedDateTime);

    if (!candidate || Number.isNaN(candidate.getTime())) {
      setDateError("Invalid Date");
      setTimeError("Invalid time");
      return;
    }

    const parsedDate = new Date(dateInput);
    const dateValidationMessage = validateDate(dateInput);

    if (dateValidationMessage || Number.isNaN(parsedDate.getTime())) {
      setDateError(dateValidationMessage || "Invalid Date");
      return;
    }

    candidate.setFullYear(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
    setDateError("");

    const timeValidationMessage = validateTime(timeInput, candidate);

    if (timeValidationMessage) {
      setTimeError(timeValidationMessage);
      return;
    }

    const [hours, minutes] = timeInput.split(":");
    candidate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    if (Number.isNaN(candidate.getTime())) {
      setTimeError("Invalid time");
      return;
    }

    const now = new Date();

    if (candidate <= now) {
      const isSameDay = candidate.toDateString() === now.toDateString();
      setDateError(isSameDay ? "" : "Select a future date");
      setTimeError("Select a future time");
      return;
    }

    setDateError("");
    setTimeError("");
    setSelectedDateTime(candidate);
    onConfirm(candidate);
  };

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
              onChange={(event) => {
                const value = event.target.value;
                setDateInput(value);

                const parsed = new Date(value);
                if (Number.isNaN(parsed.getTime())) {
                  return;
                }

                const validationMessage = validateDate(value);
                if (validationMessage) {
                  setDateError(validationMessage);
                  return;
                }

                const updated = new Date(selectedDateTime);
                updated.setFullYear(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
                setDateError("");
                setSelectedDateTime(updated);
              }}
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
          <Button onClick={handleConfirm} variant="contained">
            Confirm
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export const SnoozePopover = ({ anchorEl, open, onClose, selectedIds, snooze }) => {
  const { setSnackbar, selection, emails } = useGlobalContext();
  const { unsnooze } = useMailActions();
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState(new Date());
  const today = new Date();

  // Later today - set to 6 PM today
  const laterToday = new Date(today);
  laterToday.setHours(18, 0, 0, 0);
  const shouldShowLaterToday = today < laterToday;

  // Tomorrow - set to 8 AM tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

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

  // Helper function to show snackbar with undo action
  const handleSnoozeWithUndo = (ids, snoozeUntil) => {
    snooze(ids, snoozeUntil);
    selection.clear();

    const message = ids.length > 1 ? `${ids.length} conversations snoozed.` : "Conversation snoozed.";

    setSnackbar({
      open: true,
      message,
      autoHideDuration: 10000,
      action: (
        <Button
          sx={{ textTransform: "none" }}
          size="small"
          onClick={() => {
            unsnooze(ids);
            setSnackbar({
              open: true,
              message: "Action undone.",
              autoHideDuration: 3000,
              action: null,
            });
          }}
        >
          Undo
        </Button>
      ),
    });
  };

  const handleCalendarOpen = () => {
    setCalendarModalOpen(true);
  };

  const handleCalendarClose = () => {
    setCalendarModalOpen(false);
    onClose();
  };

  const handleDateTimeConfirm = (date) => {
    handleSnoozeWithUndo(selectedIds, date);
    setCalendarModalOpen(false);
    onClose();
  };

  // Check if any selected emails are snoozed (snooze_until is not null)
  const hasSnoozedEmails = useMemo(() => {
    if (!selectedIds?.length) return false;
    const match = makeMatch(selectedIds);
    return (emails || []).some((m) => match(m) && (m.snooze_until || m.snoozeUntil));
  }, [selectedIds, emails]);

  const handleUnsnooze = () => {
    // Capture previous snooze times per email before unsnoozing
    const prevSnoozeById = {};
    const match = makeMatch(selectedIds);

    (emails || []).forEach((m) => {
      const snoozeTime = m.snooze_until || m.snoozeUntil;
      if (match(m) && snoozeTime) {
        prevSnoozeById[String(m.id)] = snoozeTime;
      }
    });

    unsnooze(selectedIds);
    selection.clear();
    setSnackbar({
      open: true,
      message: selectedIds.length > 1 ? `${selectedIds.length} conversations unsnoozed.` : "Conversation unsnoozed.",
      autoHideDuration: 8000,
      action: (
        <Button
          sx={{ textTransform: "none" }}
          size="small"
          onClick={() => {
            // Re-apply previous snooze times per message
            Object.entries(prevSnoozeById).forEach(([id, iso]) => {
              const when = new Date(iso);
              if (!isNaN(when.getTime())) {
                snooze([id], when);
              }
            });
            setSnackbar({ open: true, message: "Action undone.", autoHideDuration: 3000, action: null });
          }}
        >
          Undo
        </Button>
      ),
    });
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

          {shouldShowLaterToday && (
            <ActionMenuItem
              label="Later today"
              rightText={formatTime(laterToday)}
              onClick={() => {
                handleSnoozeWithUndo(selectedIds, laterToday);
                onClose();
              }}
            />
          )}
          <ActionMenuItem
            label="Tomorrow"
            rightText={formatTime(tomorrow)}
            onClick={() => {
              handleSnoozeWithUndo(selectedIds, tomorrow);
              onClose();
            }}
          />
          <ActionMenuItem
            label="This weekend"
            rightText={formatTime(thisWeekend)}
            onClick={() => {
              handleSnoozeWithUndo(selectedIds, thisWeekend);
              onClose();
            }}
          />
          <ActionMenuItem
            label="Next week"
            rightText={formatTime(nextWeek)}
            onClick={() => {
              handleSnoozeWithUndo(selectedIds, nextWeek);
              onClose();
            }}
          />
          <Divider sx={{ marginY: "6px" }} />
          <ActionMenuItem icon="calendar_month" label="Select date & time" onClick={handleCalendarOpen} />
          {hasSnoozedEmails && (
            <>
              <Divider sx={{ marginY: "6px" }} />
              <ActionMenuItem icon="cancel" label="Unsnooze" onClick={handleUnsnooze} />
            </>
          )}
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
