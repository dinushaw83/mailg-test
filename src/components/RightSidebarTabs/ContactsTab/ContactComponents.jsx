import React, { useState } from "react";
import {
  TextField,
  Button,
  Tooltip,
  IconButton,
  Box,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import { generateAddressString } from "../../../utils/helperFunctions";
import styles from "./CreateContact.module.css";

// Text field component with custom styling
export const CustomInput = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  sx,
  fullWidth = true,
  ...props
}) => (
  <TextField
    fullWidth={fullWidth}
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

export const ContactDetailRow = ({
  icon,
  iconType = "outlined",
  items,
  emptyText,
  onItemClick,
  onAddClick,
  onTextClick,
  itemType = "email",
  textStyle = {},
  itemContainerStyle = {},
  addressStringType = "single",
  iconStyle = {},
  disableCopy = false,
  hideTextTooltip = false,
  iconTooltip = null,
}) => {
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

  // Handle text click
  const handleTextClick = (item) => {
    if (onTextClick) {
      onTextClick(item);
    }
  };

  // If address and no details, don't show the row
  if (itemType === "address" && !filteredItems?.length > 0) return null;

  // Icon tooltip component
  const IconTooltip = ({ children }) => {
    if (!iconTooltip) return children;

    return (
      <Tooltip
        title={iconTooltip}
        placement="top"
        slotProps={{
          popper: {
            sx: {
              "& .MuiTooltip-tooltip": {
                fontSize: "12px",
                fontWeight: 200,
                backgroundColor: "rgba(0, 0, 0, 0.85)",
              },
            },
          },
        }}
      >
        {children}
      </Tooltip>
    );
  };

  // Text tooltip component
  const TextTooltip = ({ children, item }) => {
    if (hideTextTooltip) return children;

    return (
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
        {children}
      </Tooltip>
    );
  };

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
        <IconTooltip>
          <span
            className={`material-symbols-${iconType}`}
            style={{
              fontSize: "20px",
              color: "#444746",
              marginTop: "3px",
              ...iconStyle,
            }}
          >
            {icon}
          </span>
        </IconTooltip>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {filteredItems && filteredItems.length > 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {filteredItems.map((item, index) => {
              const textValue =
                itemType === "address"
                  ? generateAddressString(item, addressStringType === "multi" ? "array" : "string")
                  : itemType === "phone"
                    ? `${item.dialCode}${item.value}`
                    : item.value;

              return (
                <Box
                  key={`${index}-${item.value}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    minHeight: "30px",
                    height: "auto",
                    borderRadius: "4px",
                    "& .item-text": {
                      color: "##1f1f1f",
                      fontSize: "0.875rem",
                    },
                    "&:hover": {
                      cursor: "pointer",
                      "& .item-text": {
                        color: "#0b57d0",
                      },
                    },
                    ...itemContainerStyle,
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => handleItemClick(item)}
                >
                  <TextTooltip item={item}>
                    <Typography
                      className="item-text"
                      sx={{
                        fontSize: "14px",
                        color: "#313233",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        wordWrap: "break-word",
                      }}
                    >
                      {Array.isArray(textValue) ? (
                        textValue.map((text, index) => (
                          <span
                            style={{
                              whiteSpace: itemType === "address" ? "normal" : "nowrap",
                              display: index === textValue.length - 1 ? "inline" : "block",
                              ...textStyle,
                            }}
                            key={`multi-${index}`}
                          >
                            {text}
                          </span>
                        ))
                      ) : (
                        <span
                          style={{ whiteSpace: itemType === "address" ? "normal" : "nowrap", ...textStyle }}
                          onClick={() => handleTextClick(item)}
                        >
                          {textValue}
                        </span>
                      )}
                      {item.label && (
                        <span
                          className="address-label"
                          style={{ marginLeft: "4px", fontSize: "0.75rem", color: "#444746" }}
                        >
                          • {item.label}
                        </span>
                      )}
                    </Typography>
                  </TextTooltip>

                  {hoveredIndex === index && !disableCopy && (
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
                          mt: "-5px",
                          "&:hover": {
                            backgroundColor: "transparent",
                          },
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontSize: "18px",
                            color: "#0b57d0",
                          }}
                        >
                          content_copy
                        </span>
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              );
            })}
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

// Labels dropdown component for managing contact labels
export const LabelsDropdown = ({
  anchorEl,
  open,
  onClose,
  recipientLabels = [],
  tempLabels = [],
  onLabelToggle,
  onApply,
  hasChanged = false,
}) => (
  <Menu
    anchorEl={anchorEl}
    open={open}
    onClose={onClose}
    anchorOrigin={{
      vertical: "bottom",
      horizontal: "left",
    }}
    transformOrigin={{
      vertical: "top",
      horizontal: "left",
    }}
    sx={{
      zIndex: 30,
      "& .MuiPaper-root": {
        width: "250px",
        borderRadius: "4px",
        backgroundColor: "#f0f4f9",
        boxShadow: "0px 8px 10px 1px rgba(0,0,0,.14),0px 3px 14px 2px rgba(0,0,0,.12),0px 5px 5px -3px rgba(0,0,0,.2)",
      },
      "& .MuiMenuItem-root": {
        px: 2,
        py: 1,
        "&:hover": {
          backgroundColor: "#d3dbe5",
        },
      },
    }}
  >
    {/* Title */}
    {recipientLabels?.length > 0 && (
      <Box>
        <Typography
          variant="subtitle1"
          sx={{
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#444746",
            mx: 2,
            mb: 1,
          }}
        >
          Manage labels
        </Typography>

        {/* Labels List */}
        {[...recipientLabels]
          .sort((a, b) => a.label.localeCompare(b.label))
          .map((label) => {
            const isSelected = tempLabels.includes(label.label);

            return (
              <MenuItem
                key={`label-${label.id}`}
                onClick={() => onLabelToggle(label.label)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  height: "40px",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "20px", color: "#1f1f1f", fontWeight: 500 }}
                    >
                      label
                    </span>
                  </ListItemIcon>
                  <ListItemText
                    primary={label.label}
                    slotProps={{
                      primary: {
                        color: "#1f1f1f",
                        fontSize: "14px",
                        fontWeight: 400,
                      },
                    }}
                  />
                </Box>
                {isSelected && (
                  <span className="material-symbols-outlined" style={{ fontSize: "28px", color: "#898b8e" }}>
                    check
                  </span>
                )}
              </MenuItem>
            );
          })}

        {/* Divider */}
        {recipientLabels.length > 0 && <Divider sx={{ my: 1 }} />}
      </Box>
    )}

    {/* Apply Changes Button */}
    <MenuItem onClick={onApply} sx={{ pointerEvents: hasChanged ? "auto" : "none" }}>
      <ListItemText
        primary="Apply"
        sx={{ py: 0.5, pl: 4.5 }}
        slotProps={{
          primary: {
            color: "#1f1f1f",
            fontSize: "14px",
            fontWeight: 400,
          },
        }}
      />
    </MenuItem>
  </Menu>
);
