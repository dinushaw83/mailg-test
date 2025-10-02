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
  Link,
  Button,
  Divider
} from "@mui/material";
import { useGlobalContext } from "../../contexts/GlobalContext";
import AutoReplyRichTextEditor from "../RichTextEditor/AutoReplyRichTextEditor";

const GeneralTab = () => {
  const { vacationResponder, setVacationResponder } = useGlobalContext();
  const [isPlainText, setIsPlainText] = useState(false);

  const handleVacationChange = (field, value) => {
    setVacationResponder(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ marginBottom: 2, color: "#202124" }}>
        General
      </Typography>
      
      {/* Vacation Responder Section */}
      <Box sx={{ marginBottom: 4 }}>
        <Box sx={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 3 }}>
          {/* Left Column - Text Content */}
          <Box sx={{ display: "flex", flexDirection: "column", width: "15%" }}>
            <Typography variant="body1" sx={{ color: "#202124", fontSize: "14px", marginBottom: 1 }}>
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
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", flex: 1 }}>
            <FormControl component="fieldset">
              <RadioGroup
                value={vacationResponder.enabled ? "on" : "off"}
                onChange={(e) => handleVacationChange("enabled", e.target.value === "on")}
                sx={{ gap: 2 }}
              >
                <FormControlLabel 
                  value="off" 
                  control={<Radio size="small" />} 
                  label={
                    <Typography variant="body2" sx={{ fontSize: "14px", color: "#202124" }}>
                      Vacation responder off
                    </Typography>
                  }
                  sx={{ margin: 0 }}
                />
                <FormControlLabel 
                  value="on" 
                  control={<Radio size="small" />} 
                  label={
                    <Typography variant="body2" sx={{ fontSize: "14px", color: "#202124" }}>
                      Vacation responder on
                    </Typography>
                  }
                  sx={{ margin: 0 }}
                />
              </RadioGroup>
            </FormControl>

            {vacationResponder.enabled && (
              <Box sx={{ marginTop: 3, width: "100%" }}>
                {/* Date Range */}
                <Box sx={{ display: "flex", alignItems: "center", marginBottom: 2, gap: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Typography variant="body2" sx={{ 
                      minWidth: "80px", 
                      fontSize: "13px", 
                      color: "#202124",
                      marginRight: 2
                    }}>
                      First day:
                    </Typography>
                    <TextField
                      type="date"
                      size="small"
                      value={vacationResponder.firstDay}
                      onChange={(e) => handleVacationChange("firstDay", e.target.value)}
                      sx={{ 
                        maxWidth: 200,
                        "& .MuiInputBase-root": {
                          fontSize: "13px",
                          height: "32px"
                        }
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Checkbox
                      checked={!!vacationResponder.lastDay}
                      onChange={(e) => {
                        if (!e.target.checked) {
                          handleVacationChange("lastDay", "");
                        }
                      }}
                      size="small"
                      sx={{ marginRight: 1 }}
                    />
                    <Typography variant="body2" sx={{ 
                      minWidth: "80px", 
                      fontSize: "13px", 
                      color: "#202124",
                      marginRight: 2
                    }}>
                      Last day:
                    </Typography>
                    <TextField
                      type="date"
                      size="small"
                      value={vacationResponder.lastDay}
                      onChange={(e) => handleVacationChange("lastDay", e.target.value)}
                      placeholder="(optional)"
                      disabled={!vacationResponder.lastDay}
                      sx={{ 
                        maxWidth: 200,
                        "& .MuiInputBase-root": {
                          fontSize: "13px",
                          height: "32px"
                        }
                      }}
                    />
                  </Box>
                </Box>

                {/* Subject */}
                <Box sx={{ display: "flex", alignItems: "center", marginBottom: 2 }}>
                  <Typography variant="body2" sx={{ 
                    minWidth: "80px", 
                    fontSize: "13px", 
                    color: "#202124",
                    marginRight: 2
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
                      "& .MuiInputBase-root": {
                        fontSize: "13px",
                        height: "32px"
                      }
                    }}
                  />
                </Box>

                {/* Message */}
                <Box sx={{ marginBottom: 2 }}>
                  <Typography variant="body2" sx={{ 
                    marginBottom: 1, 
                    fontSize: "13px", 
                    color: "#202124"
                  }}>
                    Message:
                  </Typography>
                  
                  <AutoReplyRichTextEditor
                    content={vacationResponder.message}
                    onChange={(html, plainText) => {
                      handleVacationChange("message", isPlainText ? plainText : html);
                    }}
                    placeholder="Enter your vacation message here..."
                    isPlainText={isPlainText}
                    onTogglePlainText={() => setIsPlainText(!isPlainText)}
                  />
                </Box>

                {/* Only Contacts Checkbox */}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={vacationResponder.onlyContacts}
                      onChange={(e) => handleVacationChange("onlyContacts", e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontSize: "13px", color: "#202124" }}>
                      Only send a response to people in my Contacts
                    </Typography>
                  }
                  sx={{ margin: 0 }}
                />
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default GeneralTab;
