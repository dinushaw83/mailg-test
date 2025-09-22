import React, { useState } from "react";
import {
  Box,
  TextField,
  IconButton,
  Button,
  Avatar,
  Select,
  MenuItem,
  FormControl,
  Tooltip,
  Divider,
} from "@mui/material";
import { countryCode } from "../../../utils/countryCode";

// Reusable input component with consistent styling
const CustomInput = ({ label, value, onChange, placeholder, type = "text", ...props }) => (
  <TextField
    fullWidth
    variant="outlined"
    label={label}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    type={type}
    sx={{
      "& .MuiInputLabel-root": {
        transform: "translate(14px, 6px) scale(1)",
        "&.Mui-focused": {
          transform: "translate(14px, -9px) scale(0.75)",
        },
      },
      "& .MuiOutlinedInput-root": {
        "& fieldset": {
          borderColor: "#747775",
        },
        "&:hover fieldset": {
          borderColor: "black",
        },
        "&.Mui-focused fieldset": {
          borderColor: "#0b57d0",
          borderWidth: "3px",
        },
      },
    }}
    slotProps={{
      input: {
        sx: {
          height: "35px",
          padding: 0,
        },
      },
    }}
    {...props}
  />
);

const CreateContact = ({ onClose }) => {
  const [showPrefix, setShowPrefix] = useState(false);
  const [showDepartment, setShowDepartment] = useState(false);
  const [emails, setEmails] = useState([{ value: "" }]);
  const [phones, setPhones] = useState([{ countryCode: "US", value: "" }]);
  const [formData, setFormData] = useState({
    prefix: "",
    firstName: "",
    lastName: "",
    company: "",
    jobTitle: "",
    department: "",
  });

  // State for showing close buttons on hover/focus
  const [hoveredEmailIndex, setHoveredEmailIndex] = useState(null);
  const [focusedEmailIndex, setFocusedEmailIndex] = useState(null);
  const [hoveredPhoneIndex, setHoveredPhoneIndex] = useState(null);
  const [focusedPhoneIndex, setFocusedPhoneIndex] = useState(null);
  // Setting USA as user country
  const userCountry = countryCode.find((c) => c.code === "US");

  // Handle form input changes for basic fields
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle email input changes for specific email index
  const handleEmailChange = (index, value) => {
    const newEmails = [...emails];
    newEmails[index].value = value;
    setEmails(newEmails);
  };

  // Add a new email input field
  const addEmail = () => {
    setEmails([...emails, { value: "" }]);
  };

  // Remove email input field (minimum 1 email required)
  const removeEmail = (index) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index));
    }
  };


  // Handle phone input changes for specific phone index and field
  const handlePhoneChange = (index, field, value) => {
    const newPhones = [...phones];
    newPhones[index][field] = value;
    setPhones(newPhones);
  };

  // Add a new phone input field
  const addPhone = () => {
    setPhones([...phones, { countryCode: "US", value: "" }]);
  };

  // Remove phone input field (minimum 1 phone required)
  const removePhone = (index) => {
    if (phones.length > 1) {
      setPhones(phones.filter((_, i) => i !== index));
    }
  };

  return (
    <Box sx={{ overflow: "hidden", height: "calc(100vh - 100px)", position: "relative" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1,
          position: "fixed",
          backgroundColor: "white",
          zIndex: 2,
          width: "288px",
        }}
      >
        {/* Back */}
        <Tooltip
          title="Back"
          placement="bottom"
          slotProps={{
            popper: {
              sx: {
                "& .MuiTooltip-tooltip": {
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: 200,
                },
              },
            },
          }}
        >
          <IconButton onClick={onClose} size="medium">
            <span className="material-symbols-outlined" style={{ fontSize: 21, color: "#4f5251" }}>
              arrow_back
            </span>
          </IconButton>
        </Tooltip>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {/* Add to favorites */}
          <Tooltip
            title="Add to favorites"
            placement="bottom"
            slotProps={{
              popper: {
                sx: {
                  "& .MuiTooltip-tooltip": {
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: 200,
                  },
                },
              },
            }}
          >
            <IconButton size="medium">
              <span className="material-symbols-outlined" style={{ fontSize: 21, color: "#4f5251" }}>
                star
              </span>
            </IconButton>
          </Tooltip>

          {/* Save */}
          <Button
            variant="contained"
            sx={{
              textTransform: "none",
              px: 2.5,
              borderRadius: "50px",
              fontSize: "0.875rem",
              fontWeight: 500,
              py: "7px",
            }}
            disabled={true}
          >
            Save
          </Button>

          {/* Close */}
          <Tooltip
            title="Close"
            placement="bottom"
            slotProps={{
              popper: {
                sx: {
                  "& .MuiTooltip-tooltip": {
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: 200,
                  },
                },
              },
            }}
          >
            <IconButton onClick={onClose} size="medium">
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#4f5251" }}>
                close
              </span>
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Scrollable Content */}
      <Box sx={{ overflowY: "auto", py: 2, px: 1, mt: 7, height: "calc(100vh - 188px)" }}>
        {/* Profile Picture */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <Avatar
            sx={{
              width: "88px",
              height: "88px",
              bgcolor: "#e8f0fe",
              color: "#d2e3fc",
              fontSize: "110px",
            }}
          >
            <span className="material-symbols-filled" style={{ marginTop: "15px" }}>
              person
            </span>
          </Avatar>
        </Box>

        {/* Personal Details Section */}
        <Box sx={{ display: "flex", alignItems: "flex-start", mb: "18px" }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "24px", color: "#7a7c7a", marginTop: "3px", marginRight: "8px" }}
          >
            person
          </span>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
            {/* Prefix */}
            {showPrefix && (
              <CustomInput
                label="Prefix"
                value={formData.prefix}
                onChange={(e) => handleInputChange("prefix", e.target.value)}
              />
            )}
            {/* First name */}
            <CustomInput
              label="First name"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
            />

            {/* Last name */}
            <CustomInput
              label="Last name"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
            />
          </Box>

          <IconButton
            size="small"
            onClick={() => setShowPrefix((prev) => !prev)}
            style={{
              transform: showPrefix ? "rotate(180deg)" : "rotate(0deg)",
              color: showPrefix ? "#0b57d0" : "#4a4d4c",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 23 }}>
              keyboard_arrow_down
            </span>
          </IconButton>
        </Box>

        {/* Company Information Section */}
        <Box sx={{ display: "flex", alignItems: "flex-start", mb: "18px" }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "24px", color: "#7a7c7a", marginTop: "3px", marginRight: "8px" }}
          >
            domain
          </span>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
            {/* Company */}
            <CustomInput
              label="Company"
              value={formData.company}
              onChange={(e) => handleInputChange("company", e.target.value)}
            />

            {/* Job title */}
            <CustomInput
              label="Job title"
              value={formData.jobTitle}
              onChange={(e) => handleInputChange("jobTitle", e.target.value)}
            />

            {/* Department */}
            {showDepartment && (
              <CustomInput
                label="Department"
                value={formData.department}
                onChange={(e) => handleInputChange("department", e.target.value)}
              />
            )}
          </Box>

          <IconButton
            size="small"
            onClick={() => setShowDepartment((prev) => !prev)}
            style={{
              transform: showDepartment ? "rotate(180deg)" : "rotate(0deg)",
              color: showDepartment ? "#0b57d0" : "#4a4d4c",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 23 }}>
              keyboard_arrow_down
            </span>
          </IconButton>
        </Box>

        {/* Email Section */}
        <Box sx={{ display: "flex", alignItems: "flex-start", mb: "18px" }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "24px", color: "#7a7c7a", marginTop: "3px", marginRight: "8px" }}
          >
            mail
          </span>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
            {emails.map((email, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  position: "relative",
                }}
                onMouseEnter={() => setHoveredEmailIndex(index)}
                onMouseLeave={() => setHoveredEmailIndex(null)}
              >
                <CustomInput
                  label="Email"
                  value={email.value}
                  onChange={(e) => handleEmailChange(index, e.target.value)}
                  onFocus={() => setFocusedEmailIndex(index)}
                  onBlur={() => setFocusedEmailIndex(null)}
                  type="email"
                />
                <IconButton
                  size="small"
                  onClick={() => removeEmail(index)}
                  sx={{
                    color: "#666",
                    opacity: hoveredEmailIndex === index || focusedEmailIndex === index ? 1 : 0,
                    transition: "opacity 0.2s ease-in-out",
                    pointerEvents: hoveredEmailIndex === index || focusedEmailIndex === index ? "auto" : "none",
                  }}
                >
                  <span className="material-symbols-outlined">close</span>
                </IconButton>
              </Box>
            ))}

            <Button
              startIcon={
                <span className="material-symbols-outlined" style={{ fontSize: "21px" }}>
                  add
                </span>
              }
              onClick={addEmail}
              variant="contained"
              sx={{
                color: "#0b57d0",
                textTransform: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
                backgroundColor: "#f0f4f9",
                borderRadius: "38px",
                boxShadow: "none",
                mr: 4,
                "&:hover": {
                  opacity: 0.9,
                },
              }}
            >
              Add email
            </Button>
          </Box>
        </Box>

        {/* Phone Section */}
        <Box sx={{ display: "flex", alignItems: "flex-start", mb: "18px" }}>
          <span
            className="material-symbols-filled"
            style={{ fontSize: "24px", color: "#7a7c7a", marginTop: "3px", marginRight: "8px" }}
          >
            call
          </span>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
            {phones.map((phone, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  position: "relative",
                }}
                onMouseEnter={() => setHoveredPhoneIndex(index)}
                onMouseLeave={() => setHoveredPhoneIndex(null)}
              >
                <FormControl
                  sx={{
                    width: "60px",
                    "& .MuiOutlinedInput-root": {
                      height: "35px",
                      "& fieldset": {
                        borderColor: "#747775",
                      },
                      "&:hover fieldset": {
                        borderColor: "black",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#0b57d0",
                        borderWidth: "3px",
                      },
                    },
                  }}
                >
                  <Select
                    value={phone.countryCode}
                    onChange={(e) => handlePhoneChange(index, "countryCode", e.target.value)}
                    displayEmpty
                    size="small"
                    renderValue={(value) => {
                      const country = countryCode.find((c) => c.code === value);
                      return (
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: "18px" }}>{country?.emoji}</span>
                        </Box>
                      );
                    }}
                    sx={{
                      height: "35px",
                      "& .MuiInputBase-input": {
                        pr: "24px !important",
                      },
                      "& .MuiSelect-select": {
                        padding: "8px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      },
                      "& .MuiSelect-icon": {
                        right: 0,
                        fontSize: "18px",
                      },
                    }}
                    MenuProps={{
                      anchorOrigin: {
                        vertical: "top",
                        horizontal: "left",
                      },
                      transformOrigin: {
                        vertical: "bottom",
                        horizontal: "left",
                      },
                      PaperProps: {
                        sx: {
                          backgroundColor: "#f0f4f9",
                          maxHeight: "400px",
                          maxWidth: "276px",
                          "& .MuiMenuItem-root": {
                            padding: "2px 12px",
                          },
                          "&::-webkit-scrollbar": {
                            display: "none",
                          },
                          scrollbarWidth: "none",
                          msOverflowStyle: "none",
                        },
                      },
                    }}
                  >
                    {/* User's country first */}
                    {userCountry && (
                      <MenuItem key={userCountry.code} value={userCountry.code}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <span style={{ fontSize: "20px" }}>{userCountry.emoji}</span>
                          <span style={{ fontSize: "15px", fontWeight: 400 }}>
                            {userCountry.name} ({userCountry.dial_code})
                          </span>
                        </Box>
                      </MenuItem>
                    )}

                    {/* Divider after user's country */}
                    {userCountry && <Divider sx={{ my: 0.5 }} />}

                    {/* All other countries */}
                    {countryCode
                      .filter((country) => country.code !== userCountry?.code)
                      .map((country) => (
                        <MenuItem key={country.code} value={country.code}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <span style={{ fontSize: "20px" }}>{country.emoji}</span>
                            <span style={{ fontSize: "15px", fontWeight: 400 }}>
                              {country.name} ({country.dial_code})
                            </span>
                          </Box>
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
                <CustomInput
                  label="Phone"
                  value={phone.value}
                  onChange={(e) => handlePhoneChange(index, "value", e.target.value)}
                  onFocus={() => setFocusedPhoneIndex(index)}
                  onBlur={() => setFocusedPhoneIndex(null)}
                  type="tel"
                />
                <IconButton
                  size="small"
                  onClick={() => removePhone(index)}
                  sx={{
                    color: "#666",
                    opacity: hoveredPhoneIndex === index || focusedPhoneIndex === index ? 1 : 0,
                    transition: "opacity 0.2s ease-in-out",
                    pointerEvents: hoveredPhoneIndex === index || focusedPhoneIndex === index ? "auto" : "none",
                  }}
                >
                  <span className="material-symbols-outlined">close</span>
                </IconButton>
              </Box>
            ))}

            <Button
              startIcon={
                <span className="material-symbols-outlined" style={{ fontSize: "21px" }}>
                  add
                </span>
              }
              onClick={addPhone}
              variant="contained"
              sx={{
                color: "#0b57d0",
                textTransform: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
                backgroundColor: "#f0f4f9",
                borderRadius: "38px",
                boxShadow: "none",
                mr: 4,
                "&:hover": {
                  opacity: 0.9,
                },
              }}
            >
              Add phone
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default CreateContact;
