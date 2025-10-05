import React, { useState } from "react";
import { 
  Box, 
  Typography, 
  FormControl, 
  FormLabel, 
  RadioGroup, 
  FormControlLabel, 
  Radio, 
  TextField, 
  Checkbox, 
  Link
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useGlobalContext } from "../../contexts/GlobalContext";
import AutoReplyRichTextEditor from "../RichTextEditor/AutoReplyRichTextEditor";

const VacationResponder = () => {
  const { vacationResponder, setVacationResponder } = useGlobalContext();
  const [isPlainText, setIsPlainText] = useState(false);
  const [firstDayOpen, setFirstDayOpen] = useState(false);
  const [lastDayOpen, setLastDayOpen] = useState(false);
  const [lastDayEnabled, setLastDayEnabled] = useState(!!vacationResponder.lastDay);

  const handleVacationChange = (field, value) => {
    setVacationResponder(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper function to convert date string to Date object
  const stringToDate = (dateString) => {
    if (!dateString) return null;
    // Create date in local timezone to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Helper function to convert Date object to string
  const dateToString = (date) => {
    if (!date) return "";
    // Format date in local timezone to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ marginBottom: 4 }}>
        <Box sx={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 3 }}>
          {/* Left Column - Text Content */}
          <Box sx={{ display: "flex", flexDirection: "column", width: "25%" }}>
            <Typography variant="body1" sx={{ color: "#202124", fontSize: "14px", fontWeight: "bold", marginBottom: 1 }}>
              Vacation responder:
            </Typography>
            
            <Typography variant="body2" sx={{ 
              marginBottom: 1, 
              fontSize: "13px", 
              color: "#5f6368",
              lineHeight: 1.4
            }}>
              (sends an automated reply to incoming messages. If a contact sends you several messages, this automated reply will be sent at most once every 4 days)
            </Typography>
            
            <Link 
              href="#" 
              sx={{ 
                color: "#1a73e8", 
                textDecoration: "none",
                fontSize: "13px",
                "&:hover": { textDecoration: "underline" }
              }}
            >
              Learn more
            </Link>
          </Box>

          {/* Right Column - Radio Buttons and Fields */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", flex: 1, width: "75%" }}>
            <FormControl component="fieldset">
              <RadioGroup
                value={vacationResponder.enabled ? "on" : "off"}
                onChange={(e) => handleVacationChange("enabled", e.target.value === "on")}
              >
                <FormControlLabel 
                  value="off" 
                  control={<Radio size="small" sx={{ padding: "5px", paddingLeft: 0 }} />} 
                  label={
                    <Typography variant="body2" sx={{ fontSize: "14px", fontWeight: "bold", color: "#202124" }}>
                      Vacation responder off
                    </Typography>
                  }
                  sx={{ margin: 0,  }}
                />
                <FormControlLabel 
                  value="on" 
                  control={<Radio size="small" sx={{ padding: "5px",  paddingLeft: 0 }} />} 
                  label={
                    <Typography variant="body2" sx={{ fontSize: "14px", fontWeight: "bold", color: "#202124" }}>
                      Vacation responder on
                    </Typography>
                  }
                  sx={{ margin: 0 }}
                />
              </RadioGroup>
            </FormControl>

            {vacationResponder.enabled && (
              <Box sx={{ width: "100%" }}>
                {/* Date Range */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Typography variant="body2" sx={{ 
                      fontSize: "14px", 
                      fontWeight: "bold",
                      color: "#202124",
                      marginRight: "6px"
                    }}>
                      First day:
                    </Typography>
                    <DatePicker
                      open={firstDayOpen}
                      onOpen={() => setFirstDayOpen(true)}
                      onClose={() => setFirstDayOpen(false)}
                      value={stringToDate(vacationResponder.firstDay)}
                      onChange={(newValue) => {
                        handleVacationChange("firstDay", dateToString(newValue));
                        setFirstDayOpen(false);
                      }}
                      slotProps={{
                        textField: {
                          size: "small",
                          onClick: () => setFirstDayOpen(true),
                          sx: { 
                            maxWidth: 200,
                            padding: "8px",
                            cursor: "pointer",
                            "& .MuiPickersInputBase-root": {
                              fontSize: "13px",
                              height: "23px", 
                              paddingInline: "8px",
                            },
                            "& .MuiInputAdornment-root": {
                              display: "none"
                            }
                          }
                        },
                        actionBar: {
                          actions: ['today'],
                          sx: {
                            justifyContent: 'flex-start',
                            '& .MuiButton-root': {
                              color: '#424242',
                              fontWeight: 500,
                              paddingLeft: "20px"
                            }
                          }
                        },
                        layout: {
                          sx: {
                            '& .MuiDateCalendar-root': {
                              minHeight: 'fit-content',
                              height: 'fit-content',
                            },
                            '& .MuiPickersSlideTransition-root': {
                              minHeight: '230px',
                            },
                            "& .MuiPickersCalendarHeader-switchViewButton": {
                              display: 'none',
                            },
                            "& .MuiPickersCalendarHeader-labelContainer": {
                              pointerEvents: 'none',
                              cursor: 'default',
                            },
                            "& .MuiPickersCalendarHeader-label": {
                              pointerEvents: 'none',
                              cursor: 'default',
                            },
                          }
                        }
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Checkbox
                      checked={lastDayEnabled}
                      onChange={(e) => {
                        setLastDayEnabled(e.target.checked);
                        if (!e.target.checked) {
                          handleVacationChange("lastDay", "");
                        }
                      }}
                      size="small"
                      sx={{ marginRight: 0 }}
                    />
                    <Typography variant="body2" sx={{ 
                      fontSize: "14px", 
                      fontWeight: "bold",
                      color: "#202124",
                      marginRight: "4px"
                    }}>
                      Last day:
                    </Typography>
                    <DatePicker
                      open={lastDayOpen}
                      onOpen={() => setLastDayOpen(true)}
                      onClose={() => setLastDayOpen(false)}
                      value={stringToDate(vacationResponder.lastDay ?? "")}
                      onChange={(newValue) => {
                        handleVacationChange("lastDay", dateToString(newValue));
                        setLastDayOpen(false);
                      }}
                      disabled={!lastDayEnabled}
                      slotProps={{
                        textField: {
                          size: "small",
                          placeholder: !lastDayEnabled ? "(optional)" : "MM/DD/YYYY",
                          onClick: () => !lastDayEnabled || setLastDayOpen(true),
                          sx: { 
                            maxWidth: 200,
                            height: "23px",
                            paddingInline: "8px",
                            cursor: lastDayEnabled ? "pointer" : "default",
                            "& .MuiPickersInputBase-root": {
                              fontSize: "13px",
                              paddingInline: "8px",
                              height: "23px"
                            },
                            "& .MuiInputAdornment-root": {
                              display: "none"
                            }
                          }
                        },
                        actionBar: {
                          actions: ['today'],
                          sx: {
                            justifyContent: 'flex-start',
                            '& .MuiButton-root': {
                              color: '#424242',
                              fontWeight: 500,
                              paddingLeft: "20px"
                            }
                          }
                        },
                        layout: {
                          sx: {
                            '& .MuiDateCalendar-root': {
                              minHeight: 'fit-content',
                              height: 'fit-content',
                            },
                            '& .MuiPickersSlideTransition-root': {
                              minHeight: '200px',
                            },
                            "& .MuiPickersCalendarHeader-switchViewButton": {
                              display: 'none',
                            },
                            "& .MuiPickersCalendarHeader-labelContainer": {
                              pointerEvents: 'none',
                              cursor: 'default',
                            },
                            "& .MuiPickersCalendarHeader-label": {
                              pointerEvents: 'none',
                              cursor: 'default',
                            },
                          }
                        }
                      }}
                    />
                  </Box>
                </Box>

                {/* Subject */}
                <Box sx={{ display: "flex", alignItems: "center", marginBottom: 1 }}>
                  <Typography variant="body2" sx={{ 
                    fontSize: "14px", 
                    fontWeight: "bold",
                    color: "#202124",
                    marginRight: "20px"
                  }}>
                    Subject:
                  </Typography>
                  <TextField
                    size="small"
                    value={vacationResponder.subject}
                    onChange={(e) => handleVacationChange("subject", e.target.value)}
                    placeholder="Enter subject"
                    sx={{ 
                      flexGrow: 1, 
                      maxWidth: 400,  
                      height: "23px",
                      "& .MuiInputBase-root": {
                        fontSize: "13px",
                        height: "23px",
                      },
                      "& .MuiInputBase-input": {
                        padding: "0px 8px"
                      }
                    }}
                  />
                </Box>

                {/* Message */}
                <Box sx={{ marginBottom: 2, display: "flex", flexDirection: "row", gap: "11px" }}>
                  <Typography variant="body2" sx={{ 
                    marginBottom: 1, 
                    fontSize: "14px", 
                    fontWeight: "bold",
                    color: "#202124"
                  }}>
                    Message:
                  </Typography>
                  
                  <div style={{ flex: 1 }}>
                    <AutoReplyRichTextEditor
                      content={vacationResponder.message}
                      onChange={(html, plainText) => {
                        handleVacationChange("message", isPlainText ? plainText : html);
                      }}
                      placeholder="Enter your vacation message here..."
                      isPlainText={isPlainText}
                      onTogglePlainText={() => setIsPlainText(!isPlainText)}
                    />
                  </div>
                </Box>

                {/* Only Contacts Checkbox */}
                <FormControlLabel
                  sx={{ marginLeft: 7 }}
                  control={
                    <Checkbox
                      checked={vacationResponder.onlyContacts}
                      onChange={(e) => handleVacationChange("onlyContacts", e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontSize: "14px", fontWeight: "bold", color: "#202124" }}>
                      Only send a response to people in my Contacts
                    </Typography>
                  }
                />
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default VacationResponder;
