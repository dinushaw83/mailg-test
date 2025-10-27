import React, { useState, useRef, useEffect } from "react";
import { Button, InputAdornment, Portal, TextField } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { CalendarToday as CalendarIcon } from "@mui/icons-material";
import dayjs from "dayjs";
import styles from "./DatePicker.module.css";

const DatePicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? dayjs(value) : null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef(null);
  const calendarRef = useRef(null);

  // Sync internal state with value prop changes
  useEffect(() => {
    if (value) {
      setSelectedDate(dayjs(value));
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        calendarRef.current &&
        !calendarRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const calculatePopupPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    onChange(newDate ? newDate.format("YYYY-MM-DD") : "");
    setIsOpen(false);
  };

  const handleTodayClick = () => {
    const today = dayjs();
    setSelectedDate(today);
    onChange(today.format("YYYY-MM-DD"));
    setIsOpen(false);
  };

  const handleNoneClick = () => {
    setSelectedDate(null);
    onChange("");
    setIsOpen(false);
  };

  const formatDisplayDate = (date) => {
    if (!date) return "";
    return dayjs(date).format("MMM D, YYYY");
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div
        className={styles.inputContainer}
        onClick={() => {
          if (!isOpen) {
            calculatePopupPosition();
          }
          setIsOpen(!isOpen);
        }}
      >
        <TextField
          variant="standard"
          type="text"
          className={styles.input}
          value={formatDisplayDate(selectedDate)}
          readOnly
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <CalendarIcon sx={{ fontSize: "16px" }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            "& .MuiInput-root": {
              fontSize: "14px",
            },
            "& .MuiInputBase-input": {
              height: "20px !important",
              padding: 0,
            },
            // override hover underline
            "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
              borderBottom: "1px solid rgba(0,0,0,0.42)",
            },
            // override the focused/active line color
            "& .MuiInput-underline:after": {
              borderBottom: "1px solid #4285f4",
            },
          }}
        />
      </div>

      {isOpen && (
        <Portal>
          <div
            className={styles.calendarPopup}
            ref={calendarRef}
            style={{
              position: "fixed",
              top: popupPosition.top,
              left: popupPosition.left,
              zIndex: 10000,
            }}
          >
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateCalendar
                value={selectedDate || dayjs()}
                onChange={handleDateChange}
                views={["day"]}
                maxDate={dayjs()}
                sx={{
                  "&.MuiDateCalendar-root": {
                    maxWidth: 256,
                    maxHeight: "max-content",
                  },
                  "& .MuiPickersCalendarHeader-root": {
                    paddingLeft: 0,
                    paddingRight: 0,
                    marginTop: 0,
                  },
                  "& .MuiPickersCalendarHeader-label": {
                    fontSize: "1rem",
                    fontWeight: 500,
                    cursor: "default",
                    "&:hover": {
                      backgroundColor: "transparent",
                    },
                  },
                  "& .MuiPickersCalendarHeader-labelContainer": {
                    cursor: "default",
                    "&:hover": {
                      backgroundColor: "transparent",
                    },
                  },
                  "& .MuiDayCalendar-weekDayLabel": {
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    color: "rgb(95, 99, 104)",
                  },
                  "& .MuiPickersDay-root": {
                    fontSize: "0.875rem",
                    "&.Mui-selected": {
                      backgroundColor: "#1a73e8",
                      color: "white",
                      "&:hover": {
                        backgroundColor: "#1557b0",
                      },
                    },
                    "&:hover": {
                      backgroundColor: "rgba(0, 0, 0, 0.04)",
                    },
                  },
                }}
              />
            </LocalizationProvider>

            <div className={styles.calendarFooter}>
              <Button onClick={handleTodayClick} className={styles.footerButton} size="small">
                Today
              </Button>
              <Button onClick={handleNoneClick} className={styles.footerButton} size="small">
                None
              </Button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};

export default DatePicker;
