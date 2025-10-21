import React, { useState, useRef } from "react";
import dayjs from "dayjs";
import { Box, Popover, Button, TextField } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";

const TextInputStyle = {
  "& .MuiOutlinedInput-root": {
    fontSize: "14px",
    width: "135px",
    "& fieldset": {
      borderColor: "#dadce0",
    },
    "&:hover fieldset": {
      borderColor: "#dadce0",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#dadce0",
    },
  },
  "& .MuiInputLabel-root": {
    fontSize: "14px",
    color: "#5f6368",
  },
};
export default function CustomDateRange({ anchorEl, open, onClose, onApply }) {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);

  const startDateInputRef = useRef(null);
  const endDateInputRef = useRef(null);
  const isClosingStartRef = useRef(false);
  const isClosingEndRef = useRef(false);

  const handleApply = () => {
    if (startDate && endDate) {
      onApply({
        startDate: dayjs(startDate).format("YYYY-MM-DD"),
        endDate: dayjs(endDate).format("YYYY-MM-DD"),
      });
      onClose();
    }
  };

  const handleClose = () => {
    setStartDate(null);
    setEndDate(null);
    onClose();
  };

  return (
    <>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              p: 2,
              boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2), 0px 0px 2px rgba(0, 0, 0, 0.1)",
              borderRadius: "8px",
              width: "275px",
            },
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex" }}>
            <TextField
              ref={startDateInputRef}
              variant="outlined"
              type="text"
              size="small"
              label="Start date"
              value={startDate ? dayjs(startDate).format("YYYY/MM/DD") : ""}
              onFocus={() => {
                if (!startCalendarOpen && !isClosingStartRef.current) {
                  setStartCalendarOpen(true);
                }
              }}
              sx={TextInputStyle}
            />
            <TextField
              ref={endDateInputRef}
              variant="outlined"
              type="text"
              size="small"
              label="End date"
              value={endDate ? dayjs(endDate).format("YYYY/MM/DD") : ""}
              onFocus={() => {
                if (!endCalendarOpen && !isClosingEndRef.current) {
                  setEndCalendarOpen(true);
                }
              }}
              sx={TextInputStyle}
            />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              onClick={handleApply}
              disabled={!startDate || !endDate}
              sx={{
                textTransform: "none",
                backgroundColor: "#1a73e8",
                "&:hover": {
                  backgroundColor: "#1765cc",
                },
                "&:disabled": {
                  backgroundColor: "#e8eaed",
                  color: "#9aa0a6",
                },
                fontSize: "14px",
                fontWeight: 400,
                px: 3,
                py: 0.75,
                borderRadius: "4px",
                boxShadow: "none",
              }}
            >
              Apply
            </Button>
          </Box>
        </Box>
      </Popover>

      {/* Start Date Calendar Popover */}
      {startCalendarOpen && (
        <Popover
          open={startCalendarOpen}
          anchorEl={startDateInputRef.current}
          onClose={() => setStartCalendarOpen(false)}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          slotProps={{
            paper: {
              sx: {
                mt: 0.5,
                boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2), 0px 0px 2px rgba(0, 0, 0, 0.1)",
              },
            },
          }}
          disableAutoFocus
          disableEnforceFocus
        >
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box>
              <DateCalendar
                value={startDate}
                onChange={(newValue) => {
                  setStartDate(newValue);
                  isClosingStartRef.current = true;
                  setStartCalendarOpen(false);
                  startDateInputRef.current?.blur();
                  setTimeout(() => {
                    isClosingStartRef.current = false;
                  }, 100);
                }}
                maxDate={dayjs().subtract(1, "day")}
                sx={{
                  height: "300px",
                  "& .MuiPickersDay-root": {
                    fontSize: "0.875rem",
                    border: "none",
                    "&.Mui-selected": {
                      backgroundColor: "#1a73e8",
                      color: "white",
                      "&:hover": {
                        backgroundColor: "#1557b0",
                      },
                    },
                    "&:hover": {
                      backgroundColor: "#C6DAFC",
                    },
                  },
                  "& .MuiPickersDay-today": {
                    border: "none !important",
                    backgroundColor: "transparent",
                  },
                }}
              />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  pb: 1,
                  pt: 0,
                }}
              >
                <Button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setStartDate(null);
                    setStartCalendarOpen(false);
                    startDateInputRef.current?.blur();
                  }}
                  sx={{
                    textTransform: "none",
                    color: "#1a73e8",
                    fontSize: "14px",
                    fontWeight: 500,
                    "&:hover": {
                      backgroundColor: "rgba(26, 115, 232, 0.04)",
                    },
                  }}
                >
                  None
                </Button>
              </Box>
            </Box>
          </LocalizationProvider>
        </Popover>
      )}

      {/* End Date Calendar Popover */}
      {endCalendarOpen && (
        <Popover
          open={endCalendarOpen}
          anchorEl={endDateInputRef.current}
          onClose={() => setEndCalendarOpen(false)}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          slotProps={{
            paper: {
              sx: {
                mt: 0.5,
                boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2), 0px 0px 2px rgba(0, 0, 0, 0.1)",
              },
            },
          }}
          disableAutoFocus
          disableEnforceFocus
        >
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box>
              <DateCalendar
                value={endDate}
                onChange={(newValue) => {
                  setEndDate(newValue);
                  isClosingEndRef.current = true;
                  setEndCalendarOpen(false);
                  endDateInputRef.current?.blur();
                  setTimeout(() => {
                    isClosingEndRef.current = false;
                  }, 100);
                }}
                minDate={startDate || undefined}
                maxDate={dayjs()}
                sx={{
                  height: "300px",
                  "& .MuiPickersDay-root": {
                    fontSize: "0.875rem",
                    border: "none",
                    "&.Mui-selected": {
                      backgroundColor: "#1a73e8",
                      color: "white",
                      "&:hover": {
                        backgroundColor: "#1557b0",
                      },
                    },
                    "&:hover": {
                      backgroundColor: "#C6DAFC",
                    },
                  },
                  "& .MuiPickersDay-today": {
                    border: "none !important",
                    backgroundColor: "transparent",
                  },
                }}
              />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  pb: 1,
                  pt: 0,
                }}
              >
                <Button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setEndDate(null);
                    setEndCalendarOpen(false);
                    endDateInputRef.current?.blur();
                  }}
                  sx={{
                    textTransform: "none",
                    color: "#1a73e8",
                    fontSize: "14px",
                    fontWeight: 500,
                    "&:hover": {
                      backgroundColor: "rgba(26, 115, 232, 0.04)",
                    },
                  }}
                >
                  None
                </Button>
              </Box>
            </Box>
          </LocalizationProvider>
        </Popover>
      )}
    </>
  );
}
