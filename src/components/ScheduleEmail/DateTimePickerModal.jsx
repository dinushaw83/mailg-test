import React, { useState } from 'react';
import {
  Modal,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  Grid,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import dayjs from 'dayjs';

const DateTimePickerModal = ({ open, onClose, onSchedule }) => {
  const [selectedDate, setSelectedDate] = useState(dayjs(new Date()));
  const [selectedTime, setSelectedTime] = useState('10:31 PM');
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('10:31 PM');
  const [dateError, setDateError] = useState('');
  const [timeError, setTimeError] = useState('');

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    setDateInput(formatDateForInput(newDate));
    setDateError('');
  };

  const handleTimeChange = (event) => {
    const value = event.target.value;
    setTimeInput(value);
    setTimeError('');
  };

  const formatDateForInput = (date) => {
    return date.format('MMM D, YYYY');
  };

  const parseDateInput = (input) => {
    // Try to parse various date formats
    const formats = [
      'MMM D, YYYY',    // Sep 16, 2025
      'MMMM D, YYYY',   // September 16, 2025
      'MMM DD, YYYY',   // Sep 16, 2025
      'MMMM DD, YYYY',  // September 16, 2025
      'M/D/YYYY',       // 9/16/2025
      'MM/DD/YYYY',     // 09/16/2025
      'D/M/YYYY',       // 16/9/2025
      'DD/MM/YYYY',     // 16/09/2025
    ];

    for (const format of formats) {
      const parsed = dayjs(input, format, true);
      if (parsed.isValid()) {
        return parsed;
      }
    }
    return null;
  };

  const parseTimeInput = (input) => {
    // Try to parse various time formats
    const formats = [
      'h:mm A',    // 10:31 PM
      'hh:mm A',   // 10:31 PM
      'H:mm',      // 22:31
      'HH:mm',     // 22:31
    ];

    for (const format of formats) {
      const parsed = dayjs(input, format, true);
      if (parsed.isValid()) {
        return parsed.format('h:mm A');
      }
    }
    return null;
  };

  const handleDateInputChange = (event) => {
    const value = event.target.value;
    setDateInput(value);
    // Clear error when user starts typing
    if (dateError) {
      setDateError('');
    }
  };

  const handleTimeInputChange = (event) => {
    const value = event.target.value;
    setTimeInput(value);
    // Clear error when user starts typing
    if (timeError) {
      setTimeError('');
    }
  };

  const handleDateInputBlur = (event) => {
    const value = event.target.value.trim();
    
    if (value === '') {
      setDateError('');
      return;
    }

    const parsed = parseDateInput(value);
    if (parsed && parsed.isValid()) {
      setSelectedDate(parsed);
      setDateError('');
    } else {
      setDateError('Invalid date');
    }
  };

  const handleTimeInputBlur = (event) => {
    const value = event.target.value.trim();
    
    if (value === '') {
      setTimeError('');
      return;
    }

    const parsed = parseTimeInput(value);
    if (parsed) {
      setSelectedTime(parsed);
      setTimeError('');
    } else {
      setTimeError('Invalid time');
    }
  };

  // Initialize inputs when modal opens
  React.useEffect(() => {
    if (open) {
      setDateInput(formatDateForInput(selectedDate));
      setTimeInput(selectedTime);
      setDateError('');
      setTimeError('');
    }
  }, [open, selectedDate, selectedTime]);

  const handleSchedule = () => {
    // Check for validation errors
    if (dateError || timeError) {
      return;
    }

    // Validate current inputs one more time
    const parsedDate = parseDateInput(dateInput);
    const parsedTime = parseTimeInput(timeInput);

    if (!parsedDate || !parsedTime) {
      return;
    }

    // Combine selected date with selected time
    const [time, period] = parsedTime.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours);
    
    if (period === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    const scheduledDateTime = parsedDate
      .hour(hour24)
      .minute(parseInt(minutes))
      .second(0)
      .millisecond(0)
      .toDate();
    
    onSchedule({
      id: 'custom-date-time',
      label: 'Custom date & time',
      date: scheduledDateTime,
      isCustom: true
    });
  };

  return (
    <Modal
      open={open}
      aria-labelledby="date-time-picker-modal"
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 0,
          outline: 'none',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            pb: 2,
          }}
        >
          <Typography
            id="date-time-picker-modal"
            variant="h6"
            component="h2"
            sx={{
              fontWeight: 500,
              fontSize: '1.25rem',
              color: 'rgb(32, 33, 36)',
              margin: 0,
            }}
          >
            Pick date & time
          </Typography>
        </Box>

        {/* Content */}
        <Box sx={{ p: 3, pt: 0 }}>
          <Grid container spacing={3} sx={{ flexDirection: 'row' }} alignItems="flex-start">
            {/* Calendar Section */}
            <Grid item xs={8}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateCalendar
                  value={selectedDate}
                  onChange={handleDateChange}
                  views={['day']}
                  minDate={dayjs(new Date())}
                  sx={{
                    '&.MuiDateCalendar-root': {
                      maxWidth: 256,
                      maxHeight: "max-content"
                    },
                    '& .MuiPickersCalendarHeader-root': {
                      paddingLeft: 0,
                      paddingRight: 0,
                      marginTop: 0,
                    },
                    '& .MuiPickersCalendarHeader-label': {
                      fontSize: '1rem',
                      fontWeight: 500,
                      cursor: 'default',
                      '&:hover': {
                        backgroundColor: 'transparent',
                      },
                    },
                    '& .MuiPickersCalendarHeader-labelContainer': {
                      cursor: 'default',
                      '&:hover': {
                        backgroundColor: 'transparent',
                      },
                    },
                    '& .MuiDayCalendar-weekDayLabel': {
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: 'rgb(95, 99, 104)',
                    },
                    '& .MuiPickersDay-root': {
                      fontSize: '0.875rem',
                      '&.Mui-selected': {
                        backgroundColor: '#1a73e8',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: '#1557b0',
                        },
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      },
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>

            {/* Date & Time Inputs */}
            <Grid item xs={4} flexGrow={1}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <TextField
                  label="Date"
                  value={dateInput}
                  onChange={handleDateInputChange}
                  onBlur={handleDateInputBlur}
                  error={!!dateError}
                  helperText={dateError}
                  placeholder="Sep 16, 2025 or September 16, 2025"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontSize: '0.875rem',
                    },
                    '& .MuiFormHelperText-root': {
                      fontSize: '0.75rem',
                    },
                  }}
                />
                <TextField
                  label="Time"
                  value={timeInput}
                  onChange={handleTimeInputChange}
                  onBlur={handleTimeInputBlur}
                  error={!!timeError}
                  helperText={timeError}
                  placeholder="10:31 PM or 22:31"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontSize: '0.875rem',
                    },
                    '& .MuiFormHelperText-root': {
                      fontSize: '0.75rem',
                    },
                  }}
                />
              </Box>
            </Grid>
          </Grid>

          {/* Action Buttons */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              mt: 3,
              pt: 2,
              gap: 2,
            }}
          >
            <Button
              onClick={onClose}
              sx={{
                color: 'rgb(95, 99, 104)',
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              variant="contained"
              sx={{
                fontFamily: 'Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                display: 'inline-flex',
                position: 'relative',
                alignItems: 'center',
                boxSizing: 'border-box',
                border: 'none',
                borderRadius: '9999px',
                outline: 'none',
                background: 'transparent',
                appearance: 'none',
                lineHeight: 'inherit',
                textRendering: 'inherit',
                userSelect: 'none',
                verticalAlign: 'middle',
                cursor: 'pointer',
                justifyContent: 'center',
                minWidth: '64px',
                paddingBlock: 0,
                height: '40px',
                marginBlock: 'max((48px - 40px)/2, 0px)',
                willChange: 'transform, opacity',
                color: '#fff',
                backgroundColor: '#0b57d0',
                boxShadow: 'none',
                paddingInline: '24px',
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                letterSpacing: '0rem',
                '&:hover': {
                  backgroundColor: '#0b57d0',
                  '--gm3-ripple-hover-color': '#0b57d0',
                  '--gm3-ripple-hover-opacity': '0.08',
                },
                '&:active': {
                  '--gm3-ripple-pressed-color': '#0b57d0',
                  '--gm3-ripple-pressed-opacity': '0.1',
                },
                '&:focus': {
                  '--gm3-focus-ring-outward-color': '#00639b',
                  '--gm3-focus-ring-outward-offset': '2px',
                  '--gm3-focus-ring-outward-track-width': '3px',
                },
              }}
            >
              Schedule send
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default DateTimePickerModal;
