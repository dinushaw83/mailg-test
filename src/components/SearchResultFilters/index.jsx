import { useState } from "react";
import { Button, Chip, Stack } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import ContactFilterChip from "./ContactFilterChip";
import DateFilterChip from "./DateFilterChip";

const filterOptions = ["From", "Has attachment", "Any time", "To", "Is unread"];
const filterOptionsWithDropdown = ["From", "Any time", "To"];

const SearchResultFilters = () => {
  const [activeFilters, setActiveFilters] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  // Determine which filter chips should be visible based on URL parameters
  const shouldShowFilterChip = (filter) => {
    const isRefinementSearch = searchParams.get("isrefinement") === "true";

    // If "From" is already applied via advanced search (has 'from' param but NOT a refinement search), hide the chip
    // However, if it's a refinement search, show it because the user might have clicked the chip to filter
    if (filter === "From" && searchParams.has("from") && !isRefinementSearch) {
      return false;
    }

    // If "To" is already applied via advanced search (has 'to' param but NOT a refinement search), hide the chip
    if (filter === "To" && searchParams.has("to") && !isRefinementSearch) {
      return false;
    }

    // If "Has attachment" is already applied via advanced search (has 'attachment' param), hide the chip
    if (filter === "Has attachment" && searchParams.has("attachment")) {
      return false;
    }

    // If there's a date 'within' of 1 day, hide the "Any time" chip
    if (filter === "Any time" && searchParams.has("within") && searchParams.get("within") === "1 day") {
      return false;
    }

    // Show all other filters
    return true;
  };

  // Get active filters from URL
  const getActiveFilters = () => {
    const active = [...activeFilters];
    if (searchParams.get("attach_or_drive") === "true") {
      active.push("Has attachment");
    }
    if (searchParams.get("is_unread") === "true") {
      active.push("Is unread");
    }
    // Note: "Any time" date filter is not added here as it represents the default state
    // DateFilterChip manages its own active state based on URL parameters
    return active;
  };

  const handleFilterClick = (filter) => {
    const newSearchParams = new URLSearchParams(location.search);
    let currentActiveFilters = getActiveFilters();

    if (currentActiveFilters.includes(filter)) {
      // Remove filter
      currentActiveFilters = currentActiveFilters.filter((f) => f !== filter);

      if (filter === "Has attachment") {
        newSearchParams.delete("attach_or_drive");
      } else if (filter === "Is unread") {
        newSearchParams.delete("is_unread");
      }
    } else {
      // Add filter
      currentActiveFilters.push(filter);

      if (filter === "Has attachment") {
        newSearchParams.set("attach_or_drive", "true");
      } else if (filter === "Is unread") {
        newSearchParams.set("is_unread", "true");
      }
    }

    // Mark as refinement search if any filters are active or we're on search results page
    const hasAnyFilter =
      currentActiveFilters.length > 0 ||
      newSearchParams.has("from") ||
      newSearchParams.has("to") ||
      newSearchParams.has("datestart") ||
      newSearchParams.has("dateend") ||
      newSearchParams.has("is_unread") ||
      location.pathname.startsWith("/search");

    if (hasAnyFilter) {
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

      // Keep isrefinement=true if we're on search results page or have other filters
      const hasOtherFilters =
        newSearchParams.has("from") ||
        newSearchParams.has("to") ||
        newSearchParams.has("attach_or_drive") ||
        newSearchParams.has("is_unread") ||
        newSearchParams.has("datestart") ||
        newSearchParams.has("dateend");

      if (location.pathname.startsWith("/search") || hasOtherFilters) {
        newSearchParams.set("isrefinement", "true");
      } else {
        newSearchParams.delete("isrefinement");
      }
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
      {filterOptions
        .filter((filter) => shouldShowFilterChip(filter))
        .map((filter) => {
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
          if (filter === "Any time") {
            return <DateFilterChip key={filter} label={filter} isActive={isActive} />;
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
