import { useState } from "react";
import { Button, Chip, Stack } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import ContactFilterChip from "./ContactFilterChip";

const filterOptions = ["From", "Has attachment", "Any time", "To", "Is unread"];
const filterOptionsWithDropdown = ["From", "Any time", "To", "Is unread"];

const SearchResultFilters = () => {
  const [activeFilters, setActiveFilters] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  // Get active filters from URL
  const getActiveFilters = () => {
    const active = [...activeFilters];
    if (searchParams.get("attach_or_drive") === "true") {
      active.push("Has attachment");
    }
    if (searchParams.get("last_7_days") === "true") {
      active.push("Last 7 days");
    }
    return active;
  };

  const handleFilterClick = (filter) => {
    const newSearchParams = new URLSearchParams(location.search);
    let currentActiveFilters = getActiveFilters();

    // Map filter names to URL parameters
    const filterToParamMap = {
      "Has attachment": "attach_or_drive",
      "Last 7 days": "last_7_days",
    };

    const paramName = filterToParamMap[filter];

    if (currentActiveFilters.includes(filter)) {
      // Remove filter
      currentActiveFilters = currentActiveFilters.filter((f) => f !== filter);
      if (paramName) {
        newSearchParams.delete(paramName);
      }
    } else {
      // Add filter
      currentActiveFilters.push(filter);
      if (paramName) {
        newSearchParams.set(paramName, "true");
      }
    }

    // Mark as refinement search if any filters are active
    if (currentActiveFilters.length > 0 || newSearchParams.has("from") || newSearchParams.has("to")) {
      newSearchParams.set("isrefinement", "true");
    } else {
      newSearchParams.delete("isrefinement");
    }

    setActiveFilters(currentActiveFilters);

    // Update URL with new search params
    navigate(
      {
        pathname: location.pathname,
        search: newSearchParams.toString(),
      },
      { replace: true }
    );
  };

  const handleContactFilterChange = (filterType, selectedContacts) => {
    const newSearchParams = new URLSearchParams(location.search);

    if (selectedContacts.length > 0) {
      // Convert selected contacts to comma-separated emails
      const emails = selectedContacts.map((contact) => contact.email).join(",");
      newSearchParams.set(filterType.toLowerCase(), emails);
      // Mark as refinement search
      newSearchParams.set("isrefinement", "true");
    } else {
      // Remove filter if no contacts selected
      newSearchParams.delete(filterType.toLowerCase());
    }

    // Update URL with new search params
    navigate(
      {
        pathname: location.pathname,
        search: newSearchParams.toString(),
      },
      { replace: true }
    );
  };

  return (
    <Stack direction="row" spacing={1} p={2}>
      {filterOptions.map((filter) => {
        const isActive = getActiveFilters().includes(filter);
        if (filter === "From" || filter === "To") {
          return (
            <ContactFilterChip
              key={filter}
              label={filter}
              isActive={isActive}
              onFilterChange={handleContactFilterChange}
            />
          );
        }
        return (
          <Chip
            key={filter}
            sx={{
              bgcolor: isActive ? "#cfdef3" : "white",
              border: isActive ? "none" : "1px solid #444746",
              color: isActive ? "#041E49" : "#5f6368",
              fontSize: "14px",
              height: "30px",
              borderRadius: "8px",
              "&:hover": {
                bgcolor: isActive ? "#bad2f5" : "#9f9e9e2b",
              },
            }}
            onClick={() => handleFilterClick(filter)}
            label={
              <Stack direction="row" alignItems="center">
                {isActive && (
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
                {filter}
                {filterOptionsWithDropdown.includes(filter) && (
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 24,
                      color: isActive ? "#1a73e8" : "rgb(68, 68, 68)",
                      marginLeft: "4px",
                    }}
                  >
                    arrow_drop_down
                  </span>
                )}
              </Stack>
            }
          />
        );
      })}

      <Button variant="text" size="small" sx={{ textTransform: "none", px: 1.5, borderRadius: "16px" }}>
        Advanced search
      </Button>
    </Stack>
  );
};

export default SearchResultFilters;
