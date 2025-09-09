import { useState, useRef, useEffect, useMemo } from "react";
import { Box, Chip, List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import styles from "./SearchBar.module.css";
import { Icon } from "../InboxView/ActionBar";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { buildSearchIndex, searchEmails, getRecentSearchSuggestions, isSearchIndexReady } from "../../utils/search";

const SearchBar = () => {
  const [isFocused, setIsFocused] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const searchContainerRef = useRef(null);
  const { emails } = useGlobalContext();

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = (e) => {
    // Only blur if the click is outside the search container
    if (searchContainerRef.current && !searchContainerRef.current.contains(e.relatedTarget)) {
      setIsFocused(false);
    }
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
  }, [searchValue]);

  // What to show in expanded content
  const expandedContent = useMemo(() => {
    if (searchValue.trim()) {
      return searchResults;
    } else if (isFocused && isSearchIndexReady()) {
      return recentSuggestions;
    }
    return [];
  }, [searchValue, searchResults, recentSuggestions, isFocused]);

  const filterOptions = ["Has attachment", "Last 7 days", "From me"];

  return (
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
            onFocus={handleFocus}
            onBlur={handleBlur}
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
            onClick={() => setIsFocused(true)}
          />
        </div>
      </div>

      {/* Expanded content overlay */}
      <div className={`${styles.expandedContent} ${isFocused ? styles.expanded : ""}`}>
        {/* Filter pills */}
        <div className={styles.filterPills}>
          {filterOptions.map((filter, index) => (
            <Chip key={index} label={filter} size="small" className={styles.filterChip} variant="outlined" />
          ))}
        </div>

        {/* Search results or recent suggestions */}
        <div className={styles.recentSearches}>
          <List dense>
            {expandedContent.length > 0 ? (
              // Show search results or recent suggestions
              expandedContent.map((item, index) => {
                // Check if it's a search result (has id) or a suggestion (string)
                if (typeof item === "object" && item.id) {
                  // Search result
                  return (
                    <ListItem key={item.id} className={styles.searchSuggestion}>
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
                      <ListItemText
                        primary={item.subject}
                        secondary={`${item.fromName} • ${new Date(item.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}`}
                        className={styles.suggestionText}
                      />
                    </ListItem>
                  );
                } else {
                  // Recent suggestion (string)
                  return (
                    <ListItem key={index} className={styles.searchSuggestion}>
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
                      <ListItemText primary={item} className={styles.suggestionText} />
                    </ListItem>
                  );
                }
              })
            ) : (
              // Show placeholder when no results
              <ListItem className={styles.searchSuggestion}>
                <ListItemText
                  primary="No recent searches"
                  className={styles.suggestionText}
                  style={{ color: "#999", fontStyle: "italic" }}
                />
              </ListItem>
            )}
          </List>
        </div>

        {/* TODO: Add description when no recent searches or top 5   results from emails */}

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
            <div>
              All search results for <span className={styles.searchValue}>"{searchValue}"</span>
            </div>

            <span>Press ENTER</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
