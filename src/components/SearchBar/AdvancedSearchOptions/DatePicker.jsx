import React, { useState, useRef, useEffect } from "react";
import { Box, Button } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { CalendarToday as CalendarIcon } from "@mui/icons-material";
import dayjs from "dayjs";
import styles from "./DatePicker.module.css";

const DatePicker = ({ value, onChange, placeholder = "Select date" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? dayjs(value) : dayjs());
  const containerRef = useRef(null);
  const calendarRef = useRef(null);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
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
      <div className={styles.inputContainer} onClick={() => setIsOpen(!isOpen)}>
        <input
          type="text"
          className={styles.input}
          value={formatDisplayDate(selectedDate)}
          placeholder={placeholder}
          readOnly
        />
        <CalendarIcon className={styles.calendarIcon} />
      </div>

      {isOpen && (
        <div className={styles.calendarPopup} ref={calendarRef}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateCalendar
              value={selectedDate}
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
      )}
    </div>
  );
};

export default DatePicker;
