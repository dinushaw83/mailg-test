import React, { useState } from "react";
import { TextField, Button, Tooltip, IconButton, Box, Typography } from "@mui/material";
import { generateAddressString } from "../../../utils/helperFunctions";
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
  children,
  tooltipPlacement = "bottom",
  tooltipPopperSx = {},
  ...props
}) => (
  <Tooltip
    title={title}
    placement={tooltipPlacement}
    slotProps={{
      popper: {
        sx: {
          "& .MuiTooltip-tooltip": {
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            color: "white",
            fontSize: "12px",
            fontWeight: 200,
          },
          ...tooltipPopperSx,
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
      {children}
    </IconButton>
  </Tooltip>
);

export const ContactDetailRow = ({ icon, items, emptyText, onItemClick, onAddClick, itemType = "email" }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [copyTooltipOpen, setCopyTooltipOpen] = useState(false);

  // Filter out items with empty value
  const filteredItems = items.filter((item) => {
    if (itemType === "address") {
      // For addresses, check if any address field has content
      return (
        item.streetAddress ||
        item.poBox ||
        item.streetAddress2 ||
        item.city ||
        item.stateName ||
        item.zipCode ||
        item.countryCode
      );
    }
    return item.value;
  });

  // Handle copy to clipboard
  const handleCopy = async (item, event) => {
    event.stopPropagation();
    let textToCopy;
    if (itemType === "address") {
      // Format address for copying
      textToCopy = generateAddressString(item);
    } else {
      textToCopy = item.value || item;
    }
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyTooltipOpen(true);
      setTimeout(() => setCopyTooltipOpen(false), 2000);
    } catch (err) {
      // Error copying to clipboard
    }
  };

  // Handle item click
  const handleItemClick = (item) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  // Handle add text click
  const handleAddClick = () => {
    if (onAddClick) {
      onAddClick();
    }
  };

  // If address and no details, don't show the row
  if (itemType === "address" && !filteredItems?.length > 0) return null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
      }}
    >
      {/* Icon */}
      <Box sx={{ display: "flex", alignItems: "center", mt: "-2px" }}>
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: "20px",
            color: "#444746",
            marginTop: "2px",
          }}
        >
          {icon}
        </span>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {filteredItems && filteredItems.length > 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {filteredItems.map((item, index) => (
              <Box
                key={`${index}-${item.value}`}
                sx={{
                  display: "flex",
                  alignItems: itemType === "address" ? "flex-start" : "center",
                  justifyContent: "space-between",
                  minHeight: itemType === "address" ? "auto" : "20px",
                  height: itemType === "address" ? "auto" : "20px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  "& .item-text": {
                    color: "##1f1f1f",
                    fontSize: "0.875rem",
                  },
                  "&:hover": {
                    "& .item-text": {
                      color: "#0b57d0",
                    },
                  },
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => handleItemClick(item)}
              >
                <Tooltip
                  title={`${
                    itemType === "email"
                      ? item.value
                      : itemType === "address"
                      ? generateAddressString(item)
                      : `${item.dialCode}${item.value}`
                  } (from your MailG Contacts)`}
                  placement="top"
                  slotProps={{
                    popper: {
                      sx: {
                        "& .MuiTooltip-tooltip": {
                          maxWidth: "200px",
                          fontSize: "12px",
                          backgroundColor: "rgba(0, 0, 0, 0.8)",
                          fontWeight: 200,
                        },
                      },
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: itemType === "address" ? "flex-start" : "center",
                      flex: 1,
                      minWidth: 0,
                      flexDirection: itemType === "address" ? "column" : "row",
                    }}
                  >
                    {itemType === "address" ? (
                      <>
                        <Typography
                          className="item-text"
                          sx={{
                            fontSize: "14px",
                            color: "#313233",
                            flex: 1,
                            wordWrap: "break-word",
                            whiteSpace: "normal",
                          }}
                        >
                          {generateAddressString(item)}
                          {item.label && (
                            <span
                              className="address-label"
                              style={{ marginLeft: "4px", fontSize: "0.75rem", color: "#444746" }}
                            >
                              • {item.label}
                            </span>
                          )}
                        </Typography>
                      </>
                    ) : (
                      <Typography
                        className="item-text"
                        sx={{
                          fontSize: "14px",
                          color: "#313233",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {itemType === "email" ? item.value : `${item.dialCode}${item.value}`}
                      </Typography>
                    )}
                  </Box>
                </Tooltip>

                {hoveredIndex === index && (
                  <Tooltip
                    open={copyTooltipOpen}
                    title={`${
                      itemType === "email" ? "Email" : itemType === "phone" ? "Phone number" : "Address"
                    } copied`}
                    placement="top"
                    slotProps={{
                      popper: {
                        sx: {
                          "& .MuiTooltip-tooltip": {
                            borderRadius: 0,
                            fontSize: "11px",
                            fontWeight: 200,
                          },
                        },
                      },
                    }}
                  >
                    <IconButton
                      className="copy-icon"
                      size="medium"
                      onClick={(e) => handleCopy(item, e)}
                      sx={{
                        transition: "opacity 0.2s",
                        "&:hover": {
                          backgroundColor: "transparent",
                        },
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: "20px",
                          color: "#0b57d0",
                        }}
                      >
                        content_copy
                      </span>
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              py: 0.5,
              cursor: "pointer",
              height: "20px",
            }}
            onClick={handleAddClick}
          >
            <Typography
              sx={{
                fontSize: "0.875rem",
                color: "#0b57d0",
                fontWeight: 400,
              }}
            >
              {emptyText}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};
