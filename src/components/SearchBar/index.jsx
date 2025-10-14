import { useState, useRef, useMemo } from "react";
import { Chip, List, ListItem, ListItemIcon, ListItemText, ClickAwayListener } from "@mui/material";
import styles from "./SearchBar.module.css";
import { Icon } from "../InboxView/ActionBar";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { useSearchIndex, useSearchUrlSync, useSearchNavigation, useAutocompleteState } from "./hooks";
import {
  searchEmails,
  getRecentSearchSuggestions,
  isSearchIndexReady,
  addToSearchHistory,
  searchContacts,
} from "../../utils/search";
import { useNavigate, useLocation } from "react-router-dom";
import AdvancedSearchOptions from "./AdvancedSearchOptions/AdvancedSearchOptions";
import { encodeForPath, buildSearchBarFromUrl } from "../../utils/helperFunctions";
import AutocompleteInput from "./AutocompleteInput/AutocompleteInput";

// Filter options for the search bar
const filterOptions = ["Has attachment", "Last 7 days", "From me"];

const SearchBar = () => {
  const { emails } = useGlobalContext();
  const [isFocused, setIsFocused] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);

  const searchContainerRef = useRef(null);
  const advancedSearchRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdvancedSearch = location.pathname.startsWith("/search/advanced");
  const searchQuery = useMemo(() => buildSearchBarFromUrl(location), [location]);

  // Custom hooks for managing search bar state and effects
  useSearchIndex(emails);
  useSearchUrlSync(location, searchQuery, isAdvancedSearch, setSearchValue);
  useSearchNavigation(location, searchValue, setSearchValue);
  const { autoCompleteSuggestion, setAutoCompleteSuggestion, highlightedIndex, setHighlightedIndex } =
    useAutocompleteState(searchValue, emails, isFocused);

  // Get search results
  const searchResults = useMemo(() => {
    if (!isSearchIndexReady() || !searchValue.trim()) {
      return [];
    }
    return searchEmails(searchValue, { limit: 5 });
  }, [searchValue]);

  // Get filtered emails based on active filters
  const filteredEmails = useMemo(() => {
    if (!emails || emails.length === 0) return [];

    let filtered = [...emails];

    // Apply "Has attachment" filter
    if (activeFilters.includes("Has attachment")) {
      filtered = filtered.filter((email) => email.attachments && email.attachments.length > 0);
    }

    // Apply "Last 7 days" filter
    if (activeFilters.includes("Last 7 days")) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter((email) => new Date(email.timestamp) >= sevenDaysAgo);
    }

    // Apply "From me" filter
    if (activeFilters.includes("From me")) {
      filtered = filtered.filter((email) => email.from?.email === "john.doe@example.com" || email.from?.name === "me");
    }

    // Sort by timestamp (most recent first) and limit to 5
    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
  }, [emails, activeFilters]);

  // Get recent suggestions
  const recentSuggestions = useMemo(() => {
    if (searchValue.trim() || !isSearchIndexReady()) {
      return [];
    }
    return getRecentSearchSuggestions(6);
  }, [searchValue, isFocused]);

  // Get matching contacts
  const matchingContacts = useMemo(() => {
    if (!searchValue.trim() || !emails || emails.length === 0) {
      return [];
    }
    return searchContacts(searchValue, emails, 1); // Get top 1 contact
  }, [searchValue, emails]);

  const expandedContent = useMemo(() => {
    if (searchValue.trim()) {
      return searchResults;
    } else if (activeFilters.length > 0) {
      // Show only 1 recent suggestion when filters are active, then filtered emails
      const limitedSuggestions = recentSuggestions.slice(0, 1);
      const combined = [...limitedSuggestions, ...filteredEmails];
      return combined;
    } else if (isFocused && isSearchIndexReady()) {
      return recentSuggestions;
    }
    return [];
  }, [searchValue, searchResults, recentSuggestions, isFocused, activeFilters, filteredEmails]);

  // Combined list of all navigable items (contacts + expanded content)
  const allNavigableItems = useMemo(() => {
    const items = [];
    if (matchingContacts.length > 0 && searchValue.trim()) {
      items.push(...matchingContacts.map((contact) => ({ type: "contact", data: contact.email })));
    }
    items.push(...expandedContent.map((item) => ({ type: "content", data: item })));
    return items;
  }, [matchingContacts, expandedContent, searchValue]);

  // Handle filter pill clicks
  const handleFilterClick = (filter) => {
    setActiveFilters((prev) => {
      if (prev.includes(filter)) {
        // Remove filter if already active
        return prev.filter((f) => f !== filter);
      } else {
        // Add filter if not active
        return [...prev, filter];
      }
    });
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
      if (highlightedIndex >= 0 && highlightedIndex < allNavigableItems.length) {
        e.preventDefault();
        const selectedItem = allNavigableItems[highlightedIndex];
        handleResultClick(selectedItem.data);
        setHighlightedIndex(-1);
      } else {
        // Add search query to history when submitted
        if (searchValue.trim()) {
          addToSearchHistory(searchValue);
        }

        navigate(`/search/${encodeForPath(searchValue)}`);
        setIsFocused(false);

        e.target.blur();
      }
    } else if (e.key === "Escape" || e.key === "Esc") {
      setIsFocused(false);
      setHighlightedIndex(-1);
      e.preventDefault();
      e.target.blur();
    }
  };

  const handleResultClick = (item) => {
    if (typeof item === "object" && item.id) {
      // Extract threadId from the search result
      const threadId = item.threadId ? item.threadId.split(":")[1] : item.id;
      navigate(`/inbox/${threadId}`);
    } else {
      // Add search query to history when clicked from suggestions
      if (item && item.trim()) {
        addToSearchHistory(item);
      }
      navigate(`/search/${encodeForPath(item)}`);
    }
    setIsFocused(false);
    setShowAdvancedSearch(false);
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
  };

  const handleAdvancedSearchClick = () => {
    setShowAdvancedSearch(true);
    setIsFocused(false);
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
              const isActive = activeFilters.includes(filter);
              return (
                <Chip
                  key={index}
                  label={filter}
                  size="small"
                  className={`${styles.filterChip} ${isActive ? styles.filterChipActive : ""}`}
                  variant="outlined"
                  onClick={() => handleFilterClick(filter)}
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
                        onClick={() => handleResultClick(contact.email)}
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

                  // Check if it's a search result (has id) or a suggestion (string)
                  if (typeof item === "object" && item.id) {
                    // Search result
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
                  } else {
                    // Suggestions
                    return (
                      <ListItem
                        key={contentIndex}
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
                            schedule
                          </span>
                        </ListItemIcon>
                        <ListItemText
                          primary={highlightSearchTerm(item, searchValue)}
                          className={styles.suggestionText}
                        />
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
                    All search results for <span className={styles.searchValue}>"{searchValue}"</span>
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
          onClose={() => setShowAdvancedSearch(false)}
        />
      </div>
    </ClickAwayListener>
  );
};

export default SearchBar;
