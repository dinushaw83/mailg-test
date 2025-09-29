import { useState, useRef, useEffect, useMemo } from "react";
import { Chip, List, ListItem, ListItemIcon, ListItemText, ClickAwayListener } from "@mui/material";
import styles from "./SearchBar.module.css";
import { Icon } from "../InboxView/ActionBar";
import { useGlobalContext } from "../../contexts/GlobalContext";
import {
  buildSearchIndex,
  searchEmails,
  getRecentSearchSuggestions,
  isSearchIndexReady,
  addToSearchHistory,
} from "../../utils/search";
import { useNavigate, useLocation } from "react-router-dom";
import AdvancedSearchOptions from "./AdvancedSearchOptions/AdvancedSearchOptions";
import {
  encodeForPath,
  // decodeFromPath,
  queryToSearchBarString,
  buildSearchBarFromUrl,
} from "../../utils/helperFunctions";

const SearchBar = () => {
  const { emails } = useGlobalContext();
  const [isFocused, setIsFocused] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [previousLocation, setPreviousLocation] = useState(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const searchContainerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdvancedSearch = location.pathname.startsWith("/search/advanced");

  const searchQuery = useMemo(() => buildSearchBarFromUrl(location), [location]);

  const handleSearchBarFocus = () => {
    setShowAdvancedSearch(false);
    setIsFocused(true);
  };

  const handleAdvancedSearchClick = () => {
    setShowAdvancedSearch(true);
    setIsFocused(false); // Close the default expanded overlay
  };

  const handleCloseAdvancedSearch = () => {
    setShowAdvancedSearch(false);
  };

  const handleInputChange = (e) => {
    setSearchValue(e.target.value);
  };

  // Build search index when emails are available
  useEffect(() => {
    if (emails && emails.length > 0) {
      buildSearchIndex(emails);
    }
  }, [emails]);

  // Set search value when search query is present in the url
  useEffect(() => {
    if (searchQuery && isAdvancedSearch) {
      setSearchValue(queryToSearchBarString(searchQuery));
    } else if (searchQuery) {
      setSearchValue(searchQuery);
    }
  }, [searchQuery, isAdvancedSearch]);

  // Track location changes and clear search input when navigating away from search results
  useEffect(() => {
    const currentPath = location.pathname;
    const isCurrentlyOnSearchResults = currentPath.startsWith("/search/");
    const wasOnSearchResults = previousLocation && previousLocation.startsWith("/search/");

    // If we were on search results page and now we're not, clear the search input
    if (wasOnSearchResults && !isCurrentlyOnSearchResults && searchValue.trim()) {
      setSearchValue("");
    }

    // Update previous location for next comparison
    setPreviousLocation(currentPath);
  }, [location.pathname, previousLocation, searchValue]);

  // Get search results
  const searchResults = useMemo(() => {
    if (!isSearchIndexReady() || !searchValue.trim()) {
      return [];
    }
    return searchEmails(searchValue, { limit: 5 });
  }, [searchValue]);

  // Get recent suggestions
  const recentSuggestions = useMemo(() => {
    if (searchValue.trim() || !isSearchIndexReady()) {
      return [];
    }
    return getRecentSearchSuggestions(6);
  }, [searchValue, isFocused]);

  const expandedContent = useMemo(() => {
    if (searchValue.trim()) {
      return searchResults;
    } else if (isFocused && isSearchIndexReady()) {
      return recentSuggestions;
    }
    return [];
  }, [searchValue, searchResults, recentSuggestions, isFocused]);

  const filterOptions = ["Has attachment", "Last 7 days", "From me"];

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
    if (e.key === "Enter") {
      // Add search query to history when submitted
      if (searchValue.trim()) {
        addToSearchHistory(searchValue);
      }

      navigate(`/search/${encodeForPath(searchValue)}`);
      setIsFocused(false);

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
            <input
              className={styles.searchInput}
              placeholder="Search mail"
              value={searchValue}
              onChange={handleInputChange}
              onFocus={handleSearchBarFocus}
              onKeyDown={handleKeyDown}
              autoComplete="off"
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
                onClick={() => setSearchValue("")}
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
            {filterOptions.map((filter, index) => (
              <Chip
                key={index}
                label={filter}
                size="small"
                className={styles.filterChip}
                variant="outlined"
                onClick={() => console.log("filter clicked")}
              />
            ))}
          </div>

          {/* Search results or suggestions */}
          <div className={styles.recentSearches}>
            <List dense>
              {expandedContent.length > 0 ? (
                // Show search results or suggestions
                expandedContent.map((item, index) => {
                  // Check if it's a search result (has id) or a suggestion (string)
                  if (typeof item === "object" && item.id) {
                    // Search result
                    return (
                      <ListItem
                        key={item.id}
                        className={styles.searchSuggestion}
                        onClick={() => handleResultClick(item)}
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
                            {highlightSearchTerm(`${item.fromName}, me`, searchValue)}
                          </div>
                        </div>

                        <div className={styles.resultTimestamp}>{`${new Date(item.timestamp).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                          }
                        )}`}</div>
                      </ListItem>
                    );
                  } else {
                    // Suggestions
                    return (
                      <ListItem key={index} className={styles.searchSuggestion} onClick={() => handleResultClick(item)}>
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
          {searchValue && (
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
                All search results for <span className={styles.searchValue}>"{searchValue}"</span>
              </div>

              <span style={{ marginLeft: "auto", fontSize: "12px" }}>Press ENTER</span>
            </div>
          )}
        </div>
        <AdvancedSearchOptions isOpen={showAdvancedSearch} onClose={handleCloseAdvancedSearch} />
      </div>

      {/* Advanced Search Options Modal */}
    </ClickAwayListener>
  );
};

export default SearchBar;
