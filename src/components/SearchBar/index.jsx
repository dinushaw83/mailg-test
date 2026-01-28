import React, { useState, useRef, useMemo, useEffect } from "react";
import { Chip, List, ListItem, ListItemIcon, ListItemText, ClickAwayListener } from "@mui/material";
import styles from "./SearchBar.module.css";
import { Icon } from "../InboxView/ActionBar";
import { useGlobalContext } from "../../contexts/GlobalContext";
import {
  useSearchUrlSync,
  useSearchNavigation,
  useAutocompleteState,
  useThrottledSearch,
  useSearchSuggestions,
} from "./hooks";
import {
  addToSearchHistory,
  addBasicSearchQuery,
  removeFromSearchHistory,
  isSearchIndexReady,
} from "../../utils/search";
import { useNavigate, useLocation } from "react-router-dom";
import { useHotkeys } from "react-hotkeys-hook";
import AdvancedSearchOptions from "./AdvancedSearchOptions/AdvancedSearchOptions";
import { encodeForPath, buildSearchBarFromUrl } from "../../utils/helperFunctions";
import AutocompleteInput from "./AutocompleteInput/AutocompleteInput";
import { useActiveFiltersSync } from "./hooks/useActiveFiltersSync";
import { ACTIVE_FILTERS } from "../../utils/searchParams";

// Filter options for the search bar
const filterOptions = [
  {
    label: "Has attachment",
    value: ACTIVE_FILTERS.HAS_ATTACHMENT,
  },
  {
    label: "From me",
    value: ACTIVE_FILTERS.FROM_ME,
  },
  {
    label: "Last 7 days",
    value: ACTIVE_FILTERS.LAST_WEEK,
  },
];

const useCustomHotKeys = ({ focusInput, goToLabel }) => {
  const { keyboardShortcuts } = useGlobalContext();
  const shortcutsOn = keyboardShortcuts === "shortcuts-on";

  useHotkeys(shortcutsOn ? "Slash" : "", (event) => {
    event.preventDefault();
    focusInput();
  });

  useHotkeys(shortcutsOn ? "g>l" : "", (event) => {
    event.preventDefault();
    goToLabel();
  });
};

/**
 * Extract folder or label from URL pathname
 * @param {string} pathname - Current URL pathname
 * @returns {Object} - { folder: string | null, label: string | null }
 */
const extractFolderOrLabelFromPath = (pathname) => {
  // Exclude search routes
  if (pathname.startsWith("/search")) {
    return { folder: null, label: null };
  }

  // Check for label route: /label/:label
  const labelMatch = pathname.match(/^\/label\/([^/]+)/);
  if (labelMatch) {
    return { folder: null, label: decodeURIComponent(labelMatch[1]) };
  }

  // Check for folder route: /:folder (but not /contacts, /settings, etc.)
  const excludedPaths = ["/contacts", "/settings", "/mailg-account", "/import-data", "/inbox"];
  if (excludedPaths.some((path) => pathname.startsWith(path))) {
    return { folder: null, label: null };
  }

  // Extract folder from pathname (e.g., /sent, /spam, /trash)
  const pathParts = pathname.split("/").filter(Boolean);
  if (pathParts.length > 0) {
    const folder = pathParts[0];
    // Validate it's a known folder
    const validFolders = [
      "starred",
      "snoozed",
      "sent",
      "drafts",
      "spam",
      "trash",
      "important",
      "chats",
      "scheduled",
      "all",
    ];
    if (validFolders.includes(folder.toLowerCase())) {
      return { folder: folder.toLowerCase(), label: null };
    }
  }

  return { folder: null, label: null };
};

const getIsInInbox = (pathname) => {
  return pathname.startsWith("/inbox");
};

/**
 * Generate search operator prefix based on folder or label
 * @param {string | null} folder - Folder name
 * @param {string | null} label - Label name (may be nested with :: or / in URL, converted to - for search)
 * @returns {string | null} - Search operator prefix (e.g., "in:sent" or "label:Parent-Child")
 */
const getSearchOperatorPrefix = (folder, label) => {
  if (folder) {
    // Use "is:starred" instead of "in:starred" for the starred folder
    if (folder === "starred") {
      return "is:starred";
    }
    return `in:${folder}`;
  }
  if (label) {
    // Convert :: or / separators to - and lowercase for the search operator (e.g., "Parent::Child" -> "parent-child")
    const normalizedLabel = label.replace(/::/g, "/").toLowerCase();
    return `label:${normalizedLabel}`;
  }
  return null;
};

const SearchBar = () => {
  const { emails, loggedInUser } = useGlobalContext();
  const [isFocused, setIsFocused] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [hoveredItemIndex, setHoveredItemIndex] = useState(-1);
  const [removedSuggestionsInSession, setRemovedSuggestionsInSession] = useState([]);

  const searchContainerRef = useRef(null);
  const advancedSearchRef = useRef(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdvancedSearch = location.pathname.startsWith("/search/advanced");
  const searchQuery = useMemo(() => buildSearchBarFromUrl(location), [location]);
  const isInInbox = useMemo(() => getIsInInbox(location.pathname), [location.pathname]);

  // Extract current folder or label from URL
  const { folder: currentFolder, label: currentLabel } = useMemo(
    () => extractFolderOrLabelFromPath(location.pathname),
    [location.pathname]
  );

  // Get the search operator prefix for current folder/label
  const folderOperatorPrefix = useMemo(
    () => getSearchOperatorPrefix(currentFolder, currentLabel),
    [currentFolder, currentLabel]
  );

  // Custom hooks for managing search bar state and effects
  useSearchUrlSync(location, searchQuery, isAdvancedSearch, setSearchValue);
  useSearchNavigation(location, searchValue, setSearchValue, activeFilters, setActiveFilters);
  useActiveFiltersSync(location, setActiveFilters, loggedInUser?.email);
  const { autoCompleteSuggestion, setAutoCompleteSuggestion, highlightedIndex, setHighlightedIndex } =
    useAutocompleteState(searchValue, emails, isFocused);

  // Throttle search value for API calls
  const throttledSearchValue = useThrottledSearch(searchValue, 300);

  // Fetch suggestions from API
  const { suggestions: apiSuggestions } = useSearchSuggestions(throttledSearchValue, isFocused);

  // Reset removed suggestions when the dropdown closes
  useEffect(() => {
    if (!isFocused) {
      setRemovedSuggestionsInSession([]);
    }
  }, [isFocused]);

  // Auto-populate search operator when folder/label changes (navigation only)
  // User can freely clear or modify the search value after navigation
  useEffect(() => {
    // Don't populate if we're on a search route
    if (location.pathname.startsWith("/search")) {
      return;
    }

    // Don't populate if we don't have a folder or label operator
    if (!folderOperatorPrefix && !isInInbox) {
      return;
    }
    // Check if the operator is already in the search value
    let operatorPattern;
    if (currentFolder) {
      // For starred folder, check for both "is:starred" and "in:starred"
      if (currentFolder === "starred") {
        operatorPattern = new RegExp(`(is|in):\\s*starred`, "i");
      } else {
        operatorPattern = new RegExp(`in:\\s*${currentFolder}`, "i");
      }
    } else {
      operatorPattern = new RegExp(`label:\\s*${currentLabel?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
    }

    // Only populate if the operator is not already present
    if (!operatorPattern.test(searchValue)) {
      setSearchValue(folderOperatorPrefix || "");
    }
  }, [location.pathname, folderOperatorPrefix, currentFolder, currentLabel, isInInbox]);

  // Get search results
  const searchResults = useMemo(() => {
    return [];
  }, []);

  // Get filtered emails based on active filters
  const filteredEmails = useMemo(() => {
    if (!emails || emails.length === 0) return [];

    let filtered = [...emails];

    // Apply "Has attachment" filter
    if (activeFilters.includes(ACTIVE_FILTERS.HAS_ATTACHMENT)) {
      filtered = filtered.filter((email) => email.attachments && email.attachments.length > 0);
    }

    // Apply "Last 7 days" filter (last 7 days including today)
    if (activeFilters.includes(ACTIVE_FILTERS.LAST_WEEK)) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      filtered = filtered.filter((email) => new Date(email.timestamp) >= sevenDaysAgo);
    }

    // Apply "From me" filter
    if (activeFilters.includes(ACTIVE_FILTERS.FROM_ME)) {
      filtered = filtered.filter((email) => email.from?.email === "john.doe@example.com" || email.from?.name === "me");
    }

    // Sort by timestamp (most recent first) and limit to 5
    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
  }, [emails, activeFilters]);

  const recentSuggestions = [];
  const matchingPreviousSearches = [];
  const allPreviousSearches = [];

  // Map API suggestions to matching contacts
  const matchingContacts = useMemo(() => {
    if (!apiSuggestions.contacts || apiSuggestions.contacts.length === 0) {
      return [];
    }

    return apiSuggestions.contacts.map((contact) => ({
      email: contact.value || contact.email,
      name: contact.description || contact.name || contact.value || contact.email,
      type: contact.type || "contact",
    }));
  }, [apiSuggestions.contacts]);

  // Map other API suggestions (labels, folders, operators, recent_searches)
  const apiOtherSuggestions = useMemo(() => {
    const allSuggestions = [];

    // Add labels
    if (apiSuggestions.labels && apiSuggestions.labels.length > 0) {
      apiSuggestions.labels.forEach((label) => {
        allSuggestions.push({
          value: label.value || label,
          type: label.type || "label",
          description: label.description,
        });
      });
    }

    // Add folders
    if (apiSuggestions.folders && apiSuggestions.folders.length > 0) {
      apiSuggestions.folders.forEach((folder) => {
        allSuggestions.push({
          value: folder.value || folder,
          type: folder.type || "folder",
          description: folder.description,
        });
      });
    }

    // Add categories
    if (apiSuggestions.categories && apiSuggestions.categories.length > 0) {
      apiSuggestions.categories.forEach((category) => {
        allSuggestions.push({
          value: category.value || category,
          type: category.type || "category",
          description: category.description,
        });
      });
    }

    // Add operators
    if (apiSuggestions.operators && apiSuggestions.operators.length > 0) {
      apiSuggestions.operators.forEach((operator) => {
        allSuggestions.push({
          value: operator.value || operator,
          type: operator.type || "operator",
          description: operator.description,
        });
      });
    }

    // Add recent searches (can be strings or objects)
    if (apiSuggestions.recent_searches && apiSuggestions.recent_searches.length > 0) {
      apiSuggestions.recent_searches.forEach((search) => {
        // Handle both string and object formats
        if (typeof search === "string") {
          allSuggestions.push({
            value: search,
            type: "recent_search",
            description: null,
          });
        } else {
          allSuggestions.push({
            value: search.value || search,
            type: search.type || "recent_search",
            description: search.description || null,
          });
        }
      });
    }

    return allSuggestions;
  }, [
    apiSuggestions.labels,
    apiSuggestions.folders,
    apiSuggestions.categories,
    apiSuggestions.operators,
    apiSuggestions.recent_searches,
  ]);

  const expandedContent = useMemo(() => {
    if (searchValue.trim() && activeFilters.length > 0) {
      // When both search and filters are active, apply filters to search results
      let filtered = searchResults.filter((result) => {
        // Apply "Has attachment" filter
        if (activeFilters.includes(ACTIVE_FILTERS.HAS_ATTACHMENT)) {
          if (!result.attachments || result.attachments.length === 0) return false;
        }

        // Apply "From me" filter
        if (activeFilters.includes(ACTIVE_FILTERS.FROM_ME)) {
          if (result.from?.email !== "john.doe@example.com" && result.from?.name !== "me") return false;
        }

        return true;
      });

      // Show API suggestions first, then matching previous searches, then filtered results
      const combined = [...apiOtherSuggestions, ...matchingPreviousSearches, ...filtered];

      return combined;
    } else if (searchValue.trim()) {
      // Show API suggestions first, then matching previous searches, then search results
      return [...apiOtherSuggestions, ...matchingPreviousSearches, ...searchResults];
    } else if (isFocused) {
      // When input is empty and focused, show API suggestions first, then previous searches, then recent suggestions
      // Combine API suggestions with previous searches and recent suggestions, avoiding duplicates
      const combined = [];
      const seen = new Set();

      // Add API suggestions first
      apiOtherSuggestions.forEach((suggestion) => {
        const key = suggestion.value || suggestion;
        if (!seen.has(key)) {
          combined.push(suggestion);
          seen.add(key);
        }
      });

      // Add previous searches
      allPreviousSearches.forEach((search) => {
        if (!seen.has(search)) {
          combined.push(search);
          seen.add(search);
        }
      });

      // Add recent suggestions that aren't already in previous searches
      recentSuggestions.forEach((suggestion) => {
        if (!seen.has(suggestion) && combined.length < 6) {
          combined.push(suggestion);
          seen.add(suggestion);
        }
      });

      return combined;
    }
    return [];
  }, [
    searchValue,
    searchResults,
    recentSuggestions,
    isFocused,
    activeFilters,
    filteredEmails,
    matchingPreviousSearches,
    allPreviousSearches,
    apiOtherSuggestions,
  ]);

  // Calculate all navigable items for keyboard navigation
  const allNavigableItems = useMemo(() => {
    return [...matchingContacts, ...expandedContent];
  }, [matchingContacts, expandedContent]);

  const focusInput = (delay = 0) => {
    setTimeout(() => {
      searchInputRef.current?.focus();
      setIsFocused(true);
    }, delay);
  };

  const goToLabel = () => {
    // focus the label input
    focusInput();

    // set the search value to the label
    setSearchValue("label:");
  };

  // Helper function to convert activeFilters array to filter object
  const getFilterObject = () => {
    return {
      hasAttachment: activeFilters.includes(ACTIVE_FILTERS.HAS_ATTACHMENT),
      fromMe: activeFilters.includes(ACTIVE_FILTERS.FROM_ME),
      lastSevenDays: activeFilters.includes(ACTIVE_FILTERS.LAST_WEEK),
    };
  };

  // Handle filter pill clicks
  const handleFilterClick = (filter) => {
    setActiveFilters((prev) => {
      if (prev.includes(filter)) {
        // Remove filter if already active
        return prev.filter((f) => f !== filter);
      } else {
        return [...prev, filter];
      }
    });

    // Focus the search input after clicking a filter with a slight delay
    // to ensure the chip click event completes first
    focusInput(10);
  };

  // Helper function to highlight search terms
  const highlightSearchTerm = (text, searchTerm) => {
    if (!searchTerm || !text) return text;

    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const testRegex = new RegExp(`^${escaped}$`, "i"); // for exact-part testing
    const splitRegex = new RegExp(`(${escaped})`, "i"); // for splitting (i = case-insensitive)

    const parts = text.split(splitRegex);

    return parts.map((part, index) => (testRegex.test(part) ? <strong key={index}>{part}</strong> : part));
  };

  const handleSearchValue = (formattedValue) => {
    const queryParams = new URLSearchParams();

    let finalsEachValue = formattedValue || searchValue;
    
    // Check if searching for starred emails from inbox - redirect to starred folder
    const searchLower = finalsEachValue.toLowerCase().trim();
    const isStarredSearch = searchLower === "is_starred" || 
                           searchLower === "is:starred" || 
                           searchLower === "in:starred" ||
                           searchLower.includes("is_starred") ||
                           searchLower.includes("is:starred") ||
                           searchLower.includes("in:starred");
    
    if (isInInbox && isStarredSearch) {
      handleClickAway();
      navigate("/starred");
      return;
    }
    
    if (activeFilters.includes(ACTIVE_FILTERS.HAS_ATTACHMENT)) {
      queryParams.set("attachment", "true");
    }
    if (activeFilters.includes(ACTIVE_FILTERS.FROM_ME)) {
      queryParams.set("from", loggedInUser?.email);
    }
    if (activeFilters.includes(ACTIVE_FILTERS.LAST_WEEK)) {
      finalsEachValue = finalsEachValue
        .replace(/after:(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})/g, "")
        .replace(/before:(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})/g, "");
      const todayDate = new Date().toISOString().split("T")[0];
      const targetDate = new Date(todayDate);
      targetDate.setDate(targetDate.getDate() - 7);
      const startDate = targetDate.toISOString().split("T")[0];
      const endDate = todayDate;
      queryParams.set("after", startDate);
      queryParams.set("before", endDate);
    }

    // Build simple search URL with only the input value (ignore all filters)
    const searchUrl = `/search/${encodeForPath(finalsEachValue)}?${queryParams.toString()}`;
    handleClickAway();
    navigate(searchUrl);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Tab" && autoCompleteSuggestion) {
      // Auto-complete with Tab key
      e.preventDefault();
      setSearchValue(autoCompleteSuggestion.value);
      setAutoCompleteSuggestion(null);
    } else if (e.key === "ArrowDown") {
      // Navigate down through suggestions
      e.preventDefault();
      if (isFocused && allNavigableItems.length > 0) {
        setHighlightedIndex((prev) => (prev < allNavigableItems.length - 1 ? prev + 1 : prev));
      }
    } else if (e.key === "ArrowUp") {
      // Navigate up through suggestions
      e.preventDefault();
      if (isFocused && allNavigableItems.length > 0) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      }
    } else if (e.key === "Enter") {
      // If an item is highlighted, select it
      if (highlightedIndex >= 0 && allNavigableItems.length > 0) {
        e.preventDefault();
        const selectedItem = allNavigableItems[highlightedIndex];
        handleResultClick(selectedItem);
        return;
      }

      // When searching from input bar, ignore all other advanced filters
      // and just parse what's in the input
      if (!searchValue.trim() && activeFilters.length === 0) {
        // Don't navigate if no search value
        return;
      }

      // Add search query to history when submitted
      addToSearchHistory(searchValue);
      addBasicSearchQuery(searchValue, {});
      handleSearchValue();
      setIsFocused(false);

      e.target.blur();
    } else if (e.key === "Escape" || e.key === "Esc") {
      setIsFocused(false);
      setHighlightedIndex(-1);
      e.preventDefault();
      e.target.blur();
    }
  };

  const handleResultClick = (item) => {
    // Handle contact clicks - format as from:<email> or to:<email>
    if (typeof item === "object" && item.email && item.type === "contact") {
      // Determine if we're in from: or to: context based on current search value
      const searchLower = searchValue.toLowerCase().trim();
      const prefix = searchLower.startsWith("to:") ? "to:" : "from:";
      const formattedValue = `${prefix}${item.email}`;
      setSearchValue(formattedValue);
      setTimeout(() => {
        handleSearchValue(formattedValue);
      }, 100);
      // Keep focus so user can continue typing
      focusInput();
      return;
    }

    // Handle search result objects (emails with id)
    if (typeof item === "object" && item.id) {
      // Extract thread_id from the search result
      const thread_id = item.thread_id || item.id;
      navigate(`/inbox/${thread_id}`);
      setIsFocused(false);
      setShowAdvancedSearch(false);
      return;
    }

    // Handle API suggestions (labels, folders, categories, operators, recent_searches)
    if (typeof item === "object" && item.value && item.type) {
      let formattedValue = item.value;
      let shouldNavigate = true;
      // Format based on type
      if (item.type === "category") {
        // Format as category:<name>
        formattedValue = `category:${item.value}`;
      } else if (item.type === "label") {
        // Format as label:<label>
        formattedValue = `label:${item.value.replaceAll(" ", "-")}`;
      } else if (item.type === "folder") {
        // Format as in:<folder>
        formattedValue = `in:${item.value}`;
      } else if (item.type === "recent_search") {
        // For recent searches, just use the value as-is
        formattedValue = item.value;
      } else if (item.type === "operator") {
        // Operators already have the : so just use the value
        formattedValue = item.value;
        if (item.value.endsWith(":")) {
          shouldNavigate = false;
        }
      }

      setSearchValue(formattedValue);
      if (shouldNavigate) {
        setTimeout(() => {
          handleSearchValue(formattedValue);
        }, 100);
      }
      // Keep focus so user can continue typing
      focusInput();
      return;
    }

    // Handle string suggestions (legacy behavior)
    if (typeof item === "string") {
      // Add search query to history when clicked from suggestions
      if (item && item.trim()) {
        addToSearchHistory(item);
        addBasicSearchQuery(item, getFilterObject());
      }
      navigate(`/search/${encodeForPath(item)}`);
      setIsFocused(false);
      setShowAdvancedSearch(false);
    }
  };

  const handleClickAway = () => {
    setIsFocused(false);
    setShowAdvancedSearch(false);
  };

  const handleClearSearch = () => {
    setSearchValue("");
    setActiveFilters([]);
    setAutoCompleteSuggestion(null);
    // Reset the advanced search form fields
    advancedSearchRef.current?.resetForm();
  };

  const handleSearchBarFocus = () => {
    setShowAdvancedSearch(false);
    setIsFocused(true);
    setHighlightedIndex(-1);
    // Don't auto-populate on focus - let the useEffect handle initial population
    // This allows users to clear the operator and type a different search
  };

  const handleAdvancedSearchClick = () => {
    setShowAdvancedSearch(true);
    setIsFocused(false);
  };

  useCustomHotKeys({ focusInput, goToLabel });

  const handleRemoveSuggestion = (item, e) => {
    e.stopPropagation();

    // Remove from search history permanently
    removeFromSearchHistory(item);

    // Add to session list to hide it until the dropdown closes
    setRemovedSuggestionsInSession((prev) => [...prev, item]);
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <div className={styles.searchContainer} ref={searchContainerRef}>
        <div className={`${styles.searchBar} ${isFocused ? styles.focused : ""}`}>
          <div className={styles.searchInputContainer}>
            <Icon
              name="search"
              label="Search"
              size="medium"
              fontSize={24}
              style={{
                marginRight: "0px !important",
                position: "absolute",
                left: "16px",
              }}
            />

            <AutocompleteInput
              ref={searchInputRef}
              value={searchValue}
              onChange={setSearchValue}
              onFocus={handleSearchBarFocus}
              onKeyDown={handleKeyDown}
              suggestion={autoCompleteSuggestion}
              onAccept={(value) => {
                setSearchValue(value);
                setAutoCompleteSuggestion(null);
              }}
            />

            {searchValue && (
              <Icon
                name="close"
                label="Clear search"
                size="medium"
                fontSize={24}
                style={{
                  position: "absolute",
                  right: "58px",
                  marginRight: "0px !important",
                }}
                onClick={handleClearSearch}
              />
            )}

            <Icon
              name="tune"
              label="Show search options"
              size="medium"
              fontSize={24}
              style={{
                position: "absolute",
                right: "16px",
                marginRight: "0px !important",
              }}
              onClick={handleAdvancedSearchClick}
            />
          </div>
        </div>

        {/* Expanded content overlay */}
        <div className={`${styles.expandedContent} ${isFocused ? styles.expanded : ""}`}>
          {/* Filter pills */}
          <div className={styles.filterPills}>
            {filterOptions.map((filter, index) => {
              const isActive = activeFilters.includes(filter.value);
              return (
                <Chip
                  key={index}
                  label={filter.label}
                  size="small"
                  className={`${styles.filterChip} ${isActive ? styles.filterChipActive : ""}`}
                  variant="outlined"
                  onClick={() => {
                    handleFilterClick(filter.value);
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  icon={
                    isActive ? (
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 18, color: "black", marginRight: "5px" }}
                      >
                        check
                      </span>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
          {/* Search results or suggestions */}
          <div className={styles.recentSearches}>
            <List
              dense
              sx={{
                paddingTop: `${matchingContacts.length > 0 && searchValue.trim() ? "0" : "8px"}`,
              }}
            >
              {/* Show matching contacts first */}
              {matchingContacts.length > 0 && searchValue.trim() && (
                <>
                  {matchingContacts.map((contact, index) => {
                    const isHighlighted = highlightedIndex === index;
                    return (
                      <ListItem
                        key={contact.email}
                        className={styles.searchSuggestion}
                        onClick={() => handleResultClick(contact)}
                        onMouseEnter={() => setHighlightedIndex(-1)}
                        sx={{
                          borderBottom: "1px solid #e8eaed",
                          paddingTop: "10px",
                          paddingBottom: "10px",
                          backgroundColor: isHighlighted ? "rgba(0, 0, 0, 0.04)" : "transparent",
                        }}
                      >
                        <ListItemIcon className={styles.clockIcon}>
                          <div
                            style={{
                              width: "30px",
                              height: "30px",
                              backgroundColor: "#1a73e8",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                              fontSize: "16px",
                              fontWeight: 500,
                            }}
                          >
                            {contact.name
                              ? contact.name.charAt(0).toUpperCase()
                              : contact.email.charAt(0).toUpperCase()}
                          </div>
                        </ListItemIcon>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div style={{ fontSize: "14px", color: "#202124", lineHeight: "16px" }}>
                            {highlightSearchTerm(contact.name || contact.email, searchValue)}
                          </div>
                          <div style={{ fontSize: "12px", color: "#5f6368", lineHeight: "14px" }}>
                            {highlightSearchTerm(contact.email, searchValue)}
                          </div>
                        </div>
                      </ListItem>
                    );
                  })}
                </>
              )}
              {expandedContent.length > 0 ? (
                // Show search results or suggestions
                expandedContent.map((item, contentIndex) => {
                  // Calculate the actual index considering contacts come first
                  const actualIndex = matchingContacts.length + contentIndex;
                  const isHighlighted = highlightedIndex === actualIndex;

                  // Check if it's a search result (has id) or a suggestion
                  if (typeof item === "object" && item.id) {
                    // Search result (email with id)
                    return (
                      <ListItem
                        key={item.id}
                        className={styles.searchSuggestion}
                        onClick={() => handleResultClick(item)}
                        onMouseEnter={() => setHighlightedIndex(-1)}
                        sx={{
                          backgroundColor: isHighlighted ? "rgba(0, 0, 0, 0.04)" : "transparent",
                        }}
                      >
                        <ListItemIcon className={styles.clockIcon}>
                          <span
                            className="material-symbols-outlined"
                            style={{
                              fontSize: 20,
                              color: "rgb(68, 68, 68)",
                            }}
                          >
                            mail
                          </span>
                        </ListItemIcon>

                        <div className={styles.resultText}>
                          <div className={styles.resultSubject}>{highlightSearchTerm(item.subject, searchValue)}</div>
                          <div className={styles.resultFrom}>
                            {highlightSearchTerm(`${item.fromName || item.from.name}, me`, searchValue)}
                          </div>
                        </div>

                        <div className={styles.resultTimestamp}>
                          {item.attachments && item.attachments.length > 0 && (
                            <span
                              className="material-symbols-outlined"
                              style={{
                                fontSize: 16,
                                color: "rgb(68, 68, 68)",
                                marginRight: "4px",
                              }}
                            >
                              attachment
                            </span>
                          )}
                          {`${new Date(item.timestamp).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}`}
                        </div>
                      </ListItem>
                    );
                  } else if (typeof item === "object" && item.value && item.type) {
                    // API suggestion (label, folder, category, operator, recent_search)
                    const isHovered = hoveredItemIndex === actualIndex;
                    const displayValue = item.value;
                    const displayText = item.description ? `${displayValue} - ${item.description}` : displayValue;

                    // Choose icon based on type
                    let iconName = "schedule"; // default
                    if (item.type === "label") iconName = "label";
                    else if (item.type === "folder") iconName = "folder";
                    else if (item.type === "category") iconName = "category";
                    else if (item.type === "operator") iconName = "tune";
                    else if (item.type === "recent_search") iconName = "schedule";

                    return (
                      <ListItem
                        key={`${item.type}-${contentIndex}`}
                        className={styles.searchSuggestion}
                        onClick={() => handleResultClick(item)}
                        onMouseEnter={() => {
                          setHighlightedIndex(-1);
                          setHoveredItemIndex(actualIndex);
                        }}
                        onMouseLeave={() => setHoveredItemIndex(-1)}
                        sx={{
                          backgroundColor: isHighlighted ? "rgba(0, 0, 0, 0.04)" : "transparent",
                          borderBottom:
                            activeFilters.length > 0 && expandedContent.length > 1 ? "1px solid #e0e0e0" : "none",
                        }}
                      >
                        <ListItemIcon className={styles.clockIcon}>
                          <span
                            className="material-symbols-outlined"
                            style={{
                              fontSize: 20,
                              color: "rgb(68, 68, 68)",
                            }}
                          >
                            {iconName}
                          </span>
                        </ListItemIcon>
                        <ListItemText
                          primary={highlightSearchTerm(displayText, searchValue)}
                          className={styles.suggestionText}
                          slotProps={{
                            primary: {
                              style: {
                                maxWidth: "500px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              },
                            },
                          }}
                        />
                        {isHovered && item.type === "recent_search" && (
                          <ListItemIcon
                            style={{
                              display: "flex",
                              justifyContent: "end",
                              minWidth: "auto",
                              cursor: "pointer",
                            }}
                            onClick={(e) => handleRemoveSuggestion(displayValue, e)}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{
                                fontSize: 20,
                                color: "rgb(68, 68, 68)",
                              }}
                            >
                              close_small
                            </span>
                          </ListItemIcon>
                        )}
                      </ListItem>
                    );
                  } else {
                    // Legacy string suggestions
                    const isHovered = hoveredItemIndex === actualIndex;
                    return (
                      <ListItem
                        key={contentIndex}
                        className={styles.searchSuggestion}
                        onClick={() => handleResultClick(item)}
                        onMouseEnter={() => {
                          setHighlightedIndex(-1);
                          setHoveredItemIndex(actualIndex);
                        }}
                        onMouseLeave={() => setHoveredItemIndex(-1)}
                        sx={{
                          backgroundColor: isHighlighted ? "rgba(0, 0, 0, 0.04)" : "transparent",
                          borderBottom:
                            activeFilters.length > 0 && expandedContent.length > 1 ? "1px solid #e0e0e0" : "none",
                        }}
                      >
                        <ListItemIcon className={styles.clockIcon}>
                          <span
                            className="material-symbols-outlined"
                            style={{
                              fontSize: 20,
                              color: "rgb(68, 68, 68)",
                            }}
                          >
                            schedule
                          </span>
                        </ListItemIcon>
                        <ListItemText
                          primary={highlightSearchTerm(item, searchValue)}
                          className={styles.suggestionText}
                          slotProps={{
                            primary: {
                              style: {
                                maxWidth: "500px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              },
                            },
                          }}
                        />
                        {isHovered && (
                          <ListItemIcon
                            style={{
                              display: "flex",
                              justifyContent: "end",
                              minWidth: "auto",
                              cursor: "pointer",
                            }}
                            onClick={(e) => handleRemoveSuggestion(item, e)}
                          >
                            <span
                              className="material-symbols-outlined"
                              style={{
                                fontSize: 20,
                                color: "rgb(68, 68, 68)",
                              }}
                            >
                              close_small
                            </span>
                          </ListItemIcon>
                        )}
                      </ListItem>
                    );
                  }
                })
              ) : (
                <ListItem className={styles.searchSuggestion}>
                  <ListItemText
                    primary="No recent items matched your search"
                    className={styles.suggestionText}
                    style={{ color: "#999", fontStyle: "italic" }}
                  />
                </ListItem>
              )}
            </List>
          </div>
          {/* All search result navigation */}
          {(searchValue || activeFilters.length > 0) && (
            <div className={styles.allSearchResults}>
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 20,
                  color: "rgb(68, 68, 68)",
                }}
              >
                search
              </span>
              <div style={{ color: "rgba(0, 0, 0, 0.87)" }}>
                {searchValue ? (
                  <>
                    All search results for &nbsp;<span className={styles.searchValue}>"{searchValue}</span>"
                    {activeFilters.length > 0 && (
                      <>
                        &nbsp; + {activeFilters.length} filter{activeFilters.length > 1 ? "s" : ""}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    All search results for {activeFilters.length} filter{activeFilters.length > 1 ? "s" : ""}
                  </>
                )}
              </div>

              <span style={{ marginLeft: "auto", fontSize: "12px" }}>Press ENTER</span>
            </div>
          )}
        </div>
        <AdvancedSearchOptions
          ref={advancedSearchRef}
          isOpen={showAdvancedSearch}
          searchValue={searchValue}
          onClose={() => setShowAdvancedSearch(false)}
        />
      </div>
    </ClickAwayListener>
  );
};

export default SearchBar;
