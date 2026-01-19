import React, { useState, useRef } from "react";
import { Box, Chip, Menu, MenuItem, Divider, Stack } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import CustomDateRange from "./CustomDateRange";
import { ACTIVE_FILTERS, getActiveFilters } from "../../utils/searchParams";

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

  // Get chip label
  const getChipLabel = () => {
    const activeFilters = getActiveFilters(location);
    if (activeFilters.includes(ACTIVE_FILTERS.LAST_WEEK)) {
      return "Older than a week";
    }
    if (activeFilters.includes(ACTIVE_FILTERS.LAST_MONTH)) {
      return "Older than a month";
    }
    if (activeFilters.includes(ACTIVE_FILTERS.LAST_6_MONTHS)) {
      return "Older than 6 months";
    }
    if (activeFilters.includes(ACTIVE_FILTERS.LAST_YEAR)) {
      return "Older than a year";
    }
    if (activeFilters.includes(ACTIVE_FILTERS.CUSTOM_RANGE)) {
      return "Custom range";
    }
    return "Any time";
  };

  // Handle date filter selection
  const handleDateFilterSelect = (filterType) => {
    const newSearchParams = new URLSearchParams(location.search);

    if (filterType === "Any time") {
      // Remove all date filters
      newSearchParams.delete("after");
      newSearchParams.delete("before");
    } else {
      const today = new Date();
      let startDate;
      let endDate;

      // Calculate the date based on filter type
      switch (filterType) {
        case "Older than a week": {
          const newStartDate = new Date(today);
          newStartDate.setDate(today.getDate() - 7);
          startDate = newStartDate;
          const newEndDate = new Date(today);
          newEndDate.setDate(today.getDate() + 7);
          endDate = newEndDate;
          break;
        }
        case "Older than a month":
          const newStartDate = new Date(today);
          newStartDate.setMonth(today.getMonth() - 1);
          startDate = newStartDate;
          const newEndDate = new Date(today);
          newEndDate.setMonth(today.getMonth() + 1);
          endDate = newEndDate;
          break;
        case "Older than 6 months": {
          const newStartDate = new Date(today);
          newStartDate.setMonth(today.getMonth() - 6);
          startDate = newStartDate;
          const newEndDate = new Date(today);
          newEndDate.setMonth(today.getMonth() + 6);
          endDate = newEndDate;
          break;
        }
        case "Older than a year": {
          const newStartDate = new Date(today);
          newStartDate.setFullYear(today.getFullYear() - 1);
          startDate = newStartDate;
          const newEndDate = new Date(today);
          newEndDate.setFullYear(today.getFullYear() + 1);
          endDate = newEndDate;
          break;
        }
        default:
          return;
      }

      startDate = startDate.toISOString().split("T")[0];
      endDate = endDate.toISOString().split("T")[0];

      newSearchParams.set("after", startDate);
      newSearchParams.set("before", endDate);

      // For "Older than..." filters, use dateend
    }

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
    newSearchParams.set("after", startDate);
    newSearchParams.set("before", endDate);

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

  const activeFilter = getActiveFilters(location);
  // Chip is only active when a date filter is actually applied (not "Any time")
  const chipIsActive = getChipLabel() !== "Any time";

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
