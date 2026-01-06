import React, { useState } from "react";
import {
  Modal,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  IconButton,
} from "@mui/material";
import { Close as CloseIcon, CalendarToday as CalendarIcon } from "@mui/icons-material";

const ScheduleEmailModal = ({ open, onClose, onSelectSchedule, onOpenDateTimePicker }) => {
  // Calculate dates for the three default options
  const getTomorrowMorning = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    return tomorrow;
  };

  const getTomorrowAfternoon = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(13, 0, 0, 0);
    return tomorrow;
  };

  const getMondayMorning = () => {
    const monday = new Date();
    const daysUntilMonday = (1 + 7 - monday.getDay()) % 7;
    monday.setDate(monday.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
    monday.setHours(8, 0, 0, 0);
    return monday;
  };

  const formatDateTime = (date) => {
    const options = {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    return date.toLocaleDateString("en-US", options);
  };

  const scheduleOptions = [
    {
      id: "tomorrow-morning",
      label: "Tomorrow morning",
      date: getTomorrowMorning(),
    },
    {
      id: "tomorrow-afternoon",
      label: "Tomorrow afternoon",
      date: getTomorrowAfternoon(),
    },
    {
      id: "monday-morning",
      label: "Monday morning",
      date: getMondayMorning(),
    },
  ];

  const customOption = {
    id: "pick-date-time",
    label: "Pick date & time",
    date: null,
    isCustom: true,
  };

  const handleOptionSelect = (option) => {
    if (option.isCustom) {
      onOpenDateTimePicker();
    } else {
      onSelectSchedule(option);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="schedule-email-modal"
      aria-describedby="schedule-email-description"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 300,
          bgcolor: "background.paper",
          borderRadius: 6,
          boxShadow: 24,
          p: 0,
          outline: "none",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 3,
            py: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box>
            <Typography
              id="schedule-email-modal"
              variant="h6"
              component="h2"
              sx={{
                fontWeight: 500,
                fontSize: "1.25rem",
                color: "rgb(32, 33, 36)",
                margin: 0,
              }}
            >
              Schedule Send
            </Typography>
            <Typography
              id="schedule-email-description"
              variant="body2"
              sx={{
                color: "rgb(95, 99, 104)",
                fontSize: "0.875rem",
              }}
            >
              Local Standard Time
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: "rgb(95, 99, 104)",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Options List */}
        <List sx={{ p: 0 }}>
          {scheduleOptions.map((option, index) => (
            <React.Fragment key={option.id}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleOptionSelect(option)}
                  sx={{
                    py: 0.5,
                    px: 3,
                    "&:hover": {
                      backgroundColor: "rgba(0, 0, 0, 0.04)",
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography
                        variant="body1"
                        sx={{
                          fontSize: "0.875rem",
                          color: "rgb(32, 33, 36)",
                          fontWeight: 400,
                        }}
                      >
                        {option.label}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "0.8rem",
                          color: "rgb(95, 99, 104)",
                          marginTop: 0.25,
                        }}
                      >
                        {formatDateTime(option.date)}
                      </Typography>
                    }
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </React.Fragment>
          ))}
        </List>

        {/* Custom Date & Time Option */}
        <Divider />
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleOptionSelect(customOption)}
            sx={{
              py: 1.5,
              px: 3,
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CalendarIcon
                    sx={{
                      fontSize: "18px",
                      color: "rgb(95, 99, 104)",
                    }}
                  />
                  <Typography
                    variant="body1"
                    sx={{
                      fontSize: "0.875rem",
                      color: "rgb(32, 33, 36)",
                      fontWeight: 400,
                    }}
                  >
                    {customOption.label}
                  </Typography>
                </Box>
              }
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            />
          </ListItemButton>
        </ListItem>
      </Box>
    </Modal>
  );
};

export default ScheduleEmailModal;
