import React, { useState, useRef } from "react";
import { Box, Chip, Menu, MenuItem, Divider, Stack } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import CustomDateRange from "./CustomDateRange";

export default function DateFilterChip({ label }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [customRangeAnchorEl, setCustomRangeAnchorEl] = useState(null);
  const chipRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const open = Boolean(anchorEl);
  const customRangeOpen = Boolean(customRangeAnchorEl);
  const searchParams = new URLSearchParams(location.search);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get current active filter
  const getActiveFilter = () => {
    const dateRangeType = searchParams.get("daterangetype");
    const dateStart = searchParams.get("datestart");
    const dateEnd = searchParams.get("dateend");

    if (!dateRangeType || (!dateStart && !dateEnd)) return "Any time";

    // If we have both datestart and dateend, it's a custom range
    if (dateStart && dateEnd) {
      return `${formatDate(dateStart)} – ${formatDate(dateEnd)}`;
    }

    // If we have only datestart, it's "After" filter (Last 7 days default)
    if (dateStart) {
      return `After ${formatDate(dateStart)}`;
    }

    // If we have only dateend, check which preset it matches
    if (dateEnd) {
      const endDate = new Date(dateEnd);
      const today = new Date();
      const diffTime = today - endDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 6 && diffDays <= 8) return "Older than a week";
      if (diffDays >= 28 && diffDays <= 32) return "Older than a month";
      if (diffDays >= 180 && diffDays <= 185) return "Older than 6 months";
      if (diffDays >= 363 && diffDays <= 367) return "Older than a year";

      return `Before ${formatDate(dateEnd)}`;
    }

    return "Any time";
  };

  // Get chip label
  const getChipLabel = () => {
    const activeFilter = getActiveFilter();
    if (activeFilter === "Any time") {
      return label;
    }
    return activeFilter;
  };

  // Handle date filter selection
  const handleDateFilterSelect = (filterType) => {
    const newSearchParams = new URLSearchParams(location.search);

    if (filterType === "Any time") {
      // Remove all date filters
      newSearchParams.delete("datestart");
      newSearchParams.delete("dateend");
      newSearchParams.delete("daterangetype");
    } else {
      const today = new Date();
      let targetDate;

      // Calculate the date based on filter type
      switch (filterType) {
        case "Older than a week":
          targetDate = new Date(today);
          targetDate.setDate(today.getDate() - 7);
          break;
        case "Older than a month":
          targetDate = new Date(today);
          targetDate.setMonth(today.getMonth() - 1);
          break;
        case "Older than 6 months":
          targetDate = new Date(today);
          targetDate.setMonth(today.getMonth() - 6);
          break;
        case "Older than a year":
          targetDate = new Date(today);
          targetDate.setFullYear(today.getFullYear() - 1);
          break;
        default:
          return;
      }

      const dateString = targetDate.toISOString().split("T")[0];

      // For "Older than..." filters, use dateend
      newSearchParams.delete("datestart");
      newSearchParams.set("dateend", dateString);
      newSearchParams.set("daterangetype", "custom_range");
    }

    // Check if any filters remain active
    const hasOtherFilters =
      newSearchParams.has("from") ||
      newSearchParams.has("to") ||
      newSearchParams.has("attach_or_drive") ||
      newSearchParams.has("is_unread");
    const hasDateFilter = newSearchParams.has("datestart") || newSearchParams.has("dateend");

    // Set isrefinement=true if any filters are active (prevents filter params from appearing in searchbar)
    // Delete it if no filters remain
    if (hasDateFilter || hasOtherFilters) {
      newSearchParams.set("isrefinement", "true");
    } else {
      newSearchParams.delete("isrefinement");
    }

    // Update URL
    navigate(
      {
        pathname: location.pathname,
        search: newSearchParams.toString(),
      },
      { replace: true }
    );

    handleClose();
  };

  const handleCustomRangeClick = () => {
    handleClose(); // Close the menu first
    setCustomRangeAnchorEl(chipRef.current);
  };

  const handleCustomRangeClose = () => {
    setCustomRangeAnchorEl(null);
  };

  const handleCustomRangeApply = ({ startDate, endDate }) => {
    const newSearchParams = new URLSearchParams(location.search);

    // Set both datestart and dateend for custom range
    newSearchParams.set("datestart", startDate);
    newSearchParams.set("dateend", endDate);
    newSearchParams.set("daterangetype", "custom_range");

    // Always set isrefinement=true when applying date filters
    // This prevents date parameters from appearing in the search bar
    newSearchParams.set("isrefinement", "true");

    // Update URL
    navigate(
      {
        pathname: location.pathname,
        search: newSearchParams.toString(),
      },
      { replace: true }
    );

    handleCustomRangeClose();
  };

  const activeFilter = getActiveFilter();
  // Chip is only active when a date filter is actually applied (not "Any time")
  const chipIsActive = activeFilter !== "Any time";

  const menuItems = ["Any time", "Older than a week", "Older than a month", "Older than 6 months", "Older than a year"];

  return (
    <Box>
      <Chip
        key={label}
        ref={chipRef}
        sx={{
          bgcolor: chipIsActive ? "#cfdef3" : "white",
          border: chipIsActive ? "none" : "1px solid #444746",
          color: chipIsActive ? "#041E49" : "#5f6368",
          fontSize: "14px",
          height: "30px",
          borderRadius: "8px",
          "&:hover": {
            bgcolor: chipIsActive ? "#bad2f5" : "#9f9e9e2b",
          },
        }}
        onClick={handleClick}
        label={
          <Stack direction="row" alignItems="center">
            {chipIsActive && (
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 20,
                  color: "black",
                  marginRight: "4px",
                }}
              >
                check
              </span>
            )}
            {getChipLabel()}
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 24,
                color: chipIsActive ? "#1a73e8" : "rgb(68, 68, 68)",
                marginLeft: "4px",
              }}
            >
              arrow_drop_down
            </span>
          </Stack>
        }
      />
      <Menu
        id={`${label.toLowerCase()}-filter-menu`}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2), 0px 0px 2px rgba(0, 0, 0, 0.1)",
              borderRadius: "4px",
              minWidth: "260px",
            },
          },
        }}
      >
        {menuItems.map((item) => (
          <MenuItem
            key={item}
            onClick={() => handleDateFilterSelect(item)}
            sx={{
              fontSize: "14px",
              py: 1,
              px: 2,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 20,
                color: "black",
                marginRight: "4px",
                visibility: item === "Any time" && activeFilter === "Any time" ? "visible" : "hidden",
              }}
            >
              check
            </span>
            <span style={{ flex: 1 }}>{item}</span>
          </MenuItem>
        ))}
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={handleCustomRangeClick}
          sx={{
            fontSize: "14px",
            py: 1,
            px: "46px",
          }}
        >
          Custom range...
        </MenuItem>
      </Menu>

      <CustomDateRange
        anchorEl={customRangeAnchorEl}
        open={customRangeOpen}
        onClose={handleCustomRangeClose}
        onApply={handleCustomRangeApply}
      />
    </Box>
  );
}
