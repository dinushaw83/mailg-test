import React from "react";
import { TextField, Button, Tooltip, IconButton, Box } from "@mui/material";
import styles from "./CreateContact.module.css";

// Text field component with custom styling
export const CustomInput = ({ label, value, onChange, placeholder, type = "text", error, sx, ...props }) => (
  <TextField
    fullWidth
    variant="outlined"
    label={label}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    type={type}
    error={error}
    sx={{
      "& .MuiInputLabel-root": {
        transform: "translate(14px, 6px) scale(1)",
        "&.Mui-focused, &.MuiInputLabel-shrink": {
          transform: "translate(14px, -9px) scale(0.75)",
        },
      },
      "& .MuiOutlinedInput-root": {
        "& fieldset": {
          borderColor: error ? "#b3261f" : "#747775",
        },
        "&:hover fieldset": {
          borderColor: error ? "#b3261f" : "black",
        },
        "&.Mui-focused fieldset": {
          borderColor: error ? "#b3261f" : "#0b57d0",
          borderWidth: "3px",
        },
      },
      ...sx,
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

// Custom button component with consistent styling
export const CustomButton = ({ onClick, children, startIcon }) => (
  <Button
    startIcon={startIcon}
    onClick={onClick}
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
    {children}
  </Button>
);

// Section icon component with tooltip
export const SectionIcon = ({ iconName, title, isVisible = true, iconType = "outlined", iconStyle = {} }) => {
  if (!isVisible) {
    return (
      <span
        className={`material-symbols-${iconType}`}
        style={{
          fontSize: "24px",
          color: "#7a7c7a",
          marginTop: "3px",
          marginRight: "8px",
          opacity: 0,
          ...iconStyle,
        }}
      >
        {iconName}
      </span>
    );
  }

  return (
    <Tooltip
      title={title}
      placement="bottom"
      slotProps={{
        popper: {
          sx: {
            "& .MuiTooltip-tooltip": {
              borderRadius: 0,
              fontWeight: 200,
            },
          },
        },
      }}
    >
      <span
        className={`material-symbols-${iconType}`}
        style={{
          fontSize: "24px",
          color: "#7a7c7a",
          marginTop: "3px",
          marginRight: "8px",
          ...iconStyle,
        }}
      >
        {iconName}
      </span>
    </Tooltip>
  );
};

// Close button component with remove tooltip
export const CloseButton = ({ onClick }) => (
  <Tooltip
    title="Remove"
    placement="top"
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
    <IconButton size="small" onClick={onClick} className={styles.closeButton}>
      <span className="material-symbols-outlined">close_small</span>
    </IconButton>
  </Tooltip>
);

// Label dropdown component
export const LabelDropdown = ({
  value,
  onChange,
  onFocus,
  onBlur,
  options,
  placeholder = "Label",
  showDropdown,
  onLabelSelect,
  dropdownClassName,
}) => (
  <Box className={styles.labelInputContainer}>
    <CustomInput
      label="Label"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={onFocus}
      onBlur={onBlur}
    />
    {showDropdown && (
      <Box className={dropdownClassName}>
        {options.map((option, idx) => (
          <Box key={idx} className={styles.dropdownOption} onClick={() => onLabelSelect(option)}>
            {option}
          </Box>
        ))}
      </Box>
    )}
  </Box>
);

// Action icon button component for header actions
export const ActionIconButton = ({
  iconName,
  title,
  onClick,
  size = "medium",
  iconSize = 21,
  color = "#4f5251",
  iconType = "outlined",
  sx = {},
  ...props
}) => (
  <Tooltip
    title={title}
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
    <IconButton
      size={size}
      onClick={onClick}
      sx={{
        color,
        ...sx,
      }}
      {...props}
    >
      <span className={`material-symbols-${iconType}`} style={{ fontSize: iconSize }}>
        {iconName}
      </span>
    </IconButton>
  </Tooltip>
);
