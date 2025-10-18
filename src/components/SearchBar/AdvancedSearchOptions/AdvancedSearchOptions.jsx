import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Box, Checkbox, ClickAwayListener, MenuItem, Select, TextField } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import DatePicker from "./DatePicker";
import EmailField from "./EmailField";
import dayjs from "dayjs";
import styles from "./AdvancedSearchOptions.module.css";
import { addAdvancedSearchQuery } from "../../../utils/search";
import {
  parseSearchStringToFormData,
  buildSearchBarFromUrl,
  containsSearchOperators,
} from "../../../utils/helperFunctions";
import {
  dateWithinOptions,
  subsetOptions,
  AdvancedSearchSelectHoverStyle,
  AdvancedSearchTextFieldInputStyle,
} from "./constants";

const AdvancedSearchOptions = forwardRef(({ isOpen, onClose, searchValue }, ref) => {
  const navigate = useNavigate();
  const fromFieldRef = useRef(null);
  const location = useLocation();
  const [previousLocation, setPreviousLocation] = useState(null);

  const getDefaultFormData = () => ({
    from: "",
    to: "",
    subject: "",
    has: "",
    hasnot: "",
    sizeOperator: "less than",
    size: "",
    sizeUnit: "MB",
    within: "1 day",
    date: dayjs().format("YYYY-MM-DD"),
    subset: "All Mail",
    attachment: false,
    excludeChats: false,
  });

  const [formData, setFormData] = useState(getDefaultFormData());

  // Expose resetForm method to parent component
  useImperativeHandle(ref, () => ({
    resetForm: () => {
      setFormData(getDefaultFormData());
    },
  }));

  useEffect(() => {
    const currentPath = location.pathname;
    const isCurrentlyOnSearchResults = currentPath.startsWith("/search/");
    const wasOnSearchResults = previousLocation && previousLocation.startsWith("/search/");

    // If we were on search results page and now we're not, clear the search input
    if (wasOnSearchResults && !isCurrentlyOnSearchResults) {
      setFormData(getDefaultFormData());
    }

    // Update previous location for next comparison
    setPreviousLocation(currentPath);
  }, [location.pathname, previousLocation, formData, setFormData]);

  // Sync formData with search string/URL parameters when modal opens
  useEffect(() => {
    if (isOpen) {
      // If searchValue prop is explicitly empty (user cleared the search bar),
      // prioritize that over URL to maintain sync with the visible search bar state
      if (searchValue === "") {
        setFormData(getDefaultFormData());
        return;
      }

      // If searchValue prop exists, use it (user typed but hasn't searched yet)
      if (searchValue && searchValue.trim()) {
        const searchValueHasOperators = containsSearchOperators(searchValue);

        if (searchValueHasOperators) {
          // searchValue has operators, parse it
          const parsedData = parseSearchStringToFormData(searchValue);
          if (parsedData) {
            setFormData({
              ...parsedData,
              date: parsedData.date || dayjs().format("YYYY-MM-DD"),
            });
          } else {
            setFormData(getDefaultFormData());
          }
        } else {
          // searchValue is plain text
          setFormData({
            ...getDefaultFormData(),
            has: searchValue,
          });
        }
        return;
      }

      // No searchValue prop, so check the URL (e.g., after page reload)
      const searchString = buildSearchBarFromUrl(location);

      // Check if the search string contains operators
      const hasOperators = searchString && containsSearchOperators(searchString);

      // If searchString has operators, parse it completely
      if (hasOperators) {
        const parsedData = parseSearchStringToFormData(searchString);

        if (parsedData) {
          setFormData({
            ...parsedData,
            // Keep date as current date if not parsed
            date: parsedData.date || dayjs().format("YYYY-MM-DD"),
          });
        } else {
          // Parsing failed, use defaults
          setFormData(getDefaultFormData());
        }
      } else if (searchString && searchString.trim()) {
        // searchString exists but has no operators - treat as plain text for "has"
        setFormData({
          ...getDefaultFormData(),
          has: searchString,
        });
      } else {
        // No search string, use defaults
        setFormData(getDefaultFormData());
      }
    }
  }, [isOpen, location.search, location.pathname, searchValue]);

  // Auto-focus the "from" field when modal opens
  useEffect(() => {
    if (isOpen && fromFieldRef.current) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        fromFieldRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscapeKey = (event) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);

    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [isOpen, onClose]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSearch = () => {
    // Track advanced search query in localStorage
    addAdvancedSearchQuery(formData);

    // Create search criteria object
    const searchCriteria = {
      from: formData.from,
      to: formData.to,
      subject: formData.subject,
      has: formData.has,
      hasnot: formData.hasnot,
      size: formData.size,
      sizeOperator: formData.sizeOperator,
      sizeUnit: formData.sizeUnit,
      within: formData.within,
      date: formData.date,
      subset: formData.subset,
      attachment: formData.attachment,
      excludeChats: formData.excludeChats,
    };

    // Create a query string from the criteria
    const queryParams = new URLSearchParams();

    // Add non-empty criteria to query params (excluding default values)
    const hasSize = searchCriteria.size && searchCriteria.size.trim();

    Object.entries(searchCriteria).forEach(([key, value]) => {
      // Skip default values that shouldn't be included in URL
      // BUT include sizeOperator and sizeUnit if size is provided
      const isDefaultValue =
        (key === "subset" && value === "All Mail") ||
        (key === "sizeOperator" && value === "less than" && !hasSize) ||
        (key === "sizeUnit" && value === "MB" && !hasSize);

      // Include boolean true values, non-empty strings, and other truthy values (but not default values)
      if (!isDefaultValue && (value === true || (value && value !== ""))) {
        // Convert sizeOperator spaces to underscores for URL
        if (key === "sizeOperator") {
          queryParams.append(key, value.replace(/ /g, "_"));
        } else {
          queryParams.append(key, value);
        }
      }
    });

    // Navigate to search results with advanced criteria
    const queryString = queryParams.toString();
    if (queryString) {
      navigate(`/search/advanced?${queryString}`);
    } else {
      navigate(`/search/advanced`);
    }

    onClose();
  };

  const handleCreateFilter = () => {
    // TODO: Implement create filter functionality
    console.log("Create filter with:", formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ClickAwayListener onClickAway={onClose}>
      <div className={styles.modal}>
        <div className={styles.modalContent}>
          {/* From */}
          <div className={styles.formRow}>
            <EmailField
              ref={fromFieldRef}
              label="From:"
              value={formData.from}
              onChange={(value) => handleInputChange("from", value)}
              placeholder="Enter email addresses"
            />
          </div>

          {/* To */}
          <div className={styles.formRow}>
            <EmailField
              label="To:"
              value={formData.to}
              onChange={(value) => handleInputChange("to", value)}
              placeholder="Enter email addresses"
            />
          </div>

          {/* Subject */}
          <div className={styles.formRow}>
            <label htmlFor="subject" className={styles.label}>
              Subject:
            </label>
            <TextField
              fullWidth
              variant="standard"
              id="subject"
              value={formData.subject}
              onChange={(e) => handleInputChange("subject", e.target.value)}
              sx={AdvancedSearchTextFieldInputStyle}
            />
          </div>

          {/* Has the words */}
          <div className={styles.formRow}>
            <label htmlFor="has" className={styles.label}>
              Has the words:
            </label>
            <TextField
              fullWidth
              variant="standard"
              id="has"
              value={formData.has}
              onChange={(e) => handleInputChange("has", e.target.value)}
              sx={AdvancedSearchTextFieldInputStyle}
            />
          </div>

          {/* Doesn't have */}
          <div className={styles.formRow}>
            <label htmlFor="hasnot" className={styles.label}>
              Doesn't have:
            </label>
            <TextField
              id="hasnot"
              fullWidth
              variant="standard"
              value={formData.hasnot}
              onChange={(e) => handleInputChange("hasnot", e.target.value)}
              sx={AdvancedSearchTextFieldInputStyle}
            />
          </div>

          {/* Size */}
          <div className={styles.formRow}>
            <label htmlFor="size" className={styles.label}>
              Size:
            </label>
            <Box sx={{ display: "flex", alignItems: "center", gap: "20px" }} className={styles.sizeContainer}>
              <Select
                id="size"
                variant="standard"
                value={formData.sizeOperator}
                onChange={(e) => handleInputChange("sizeOperator", e.target.value)}
                MenuProps={{
                  disablePortal: true,
                }}
                sx={{
                  ...AdvancedSearchSelectHoverStyle,
                  fontSize: "14px",
                  width: "250px !important",
                  "& .MuiSelect-select": {
                    width: "250px",
                    padding: "0",
                    height: "20px",
                  },
                }}
              >
                <MenuItem value="less than" sx={{ fontSize: "14px" }}>
                  less than
                </MenuItem>
                <MenuItem value="greater than" sx={{ fontSize: "14px" }}>
                  greater than
                </MenuItem>
              </Select>

              <TextField
                fullWidth
                variant="standard"
                value={formData.size}
                onChange={(e) => handleInputChange("size", e.target.value)}
                sx={AdvancedSearchTextFieldInputStyle}
              />

              <Select
                id="sizeUnit"
                variant="standard"
                value={formData.sizeUnit}
                onChange={(e) => handleInputChange("sizeUnit", e.target.value)}
                MenuProps={{
                  disablePortal: true,
                }}
                sx={{
                  ...AdvancedSearchSelectHoverStyle,
                  fontSize: "14px",
                  width: "118px !important",
                  "& .MuiSelect-select": {
                    width: "118px",
                    padding: "0",
                    height: "20px",
                  },
                }}
              >
                <MenuItem value="MB" sx={{ fontSize: "14px" }}>
                  MB
                </MenuItem>
                <MenuItem value="KB" sx={{ fontSize: "14px" }}>
                  KB
                </MenuItem>
                <MenuItem value="Bytes" sx={{ fontSize: "14px" }}>
                  Bytes
                </MenuItem>
              </Select>
            </Box>
          </div>

          {/* Date within */}
          <div className={styles.formRow}>
            <label htmlFor="within" className={styles.label}>
              Date within:
            </label>
            <div className={styles.dateContainer}>
              <Select
                id="within"
                variant="standard"
                value={formData.within}
                onChange={(e) => handleInputChange("within", e.target.value)}
                MenuProps={{
                  disablePortal: true,
                }}
                sx={{
                  ...AdvancedSearchSelectHoverStyle,
                  fontSize: "14px",
                  flex: 1,
                  "& .MuiSelect-select": {
                    padding: "0",
                    height: "20px",
                  },
                }}
              >
                {dateWithinOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value} sx={{ fontSize: "14px" }}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <DatePicker
                value={formData.date}
                onChange={(value) => handleInputChange("date", value)}
                placeholder="Select date"
              />
            </div>
          </div>

          {/* Search */}
          <div className={styles.formRow}>
            <label className={styles.label}>Search:</label>
            <Select
              id="subset"
              variant="standard"
              MenuProps={{
                disablePortal: true,
              }}
              sx={{
                ...AdvancedSearchSelectHoverStyle,
                fontSize: "14px",
                flex: 1,
                "& .MuiSelect-select": {
                  padding: "0",
                  height: "20px",
                },
              }}
              value={formData.subset}
              onChange={(e) => handleInputChange("subset", e.target.value)}
            >
              {subsetOptions.map((option) => (
                <MenuItem key={option.value} value={option.value} sx={{ fontSize: "14px" }}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </div>

          {/* Checkboxes */}
          <div className={styles.checkboxContainer}>
            <label htmlFor="attachment" className={styles.checkboxLabel}>
              <Checkbox
                id="attachment"
                size="small"
                checked={formData.attachment}
                onChange={(e) => handleInputChange("attachment", e.target.checked)}
              />
              <span className={styles.checkboxText}>Has attachment</span>
            </label>

            <label htmlFor="excludeChats" className={styles.checkboxLabel}>
              <Checkbox
                id="excludeChats"
                size="small"
                checked={formData.excludeChats}
                onChange={(e) => handleInputChange("excludeChats", e.target.checked)}
              />
              <span className={styles.checkboxText}>Don't include chats</span>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={styles.modalFooter}>
          <button className={styles.createFilterButton} onClick={handleCreateFilter}>
            Create filter
          </button>
          <button className={styles.searchButton} onClick={handleSearch}>
            Search
          </button>
        </div>
      </div>
    </ClickAwayListener>
  );
});

AdvancedSearchOptions.displayName = "AdvancedSearchOptions";

export default AdvancedSearchOptions;
