import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Box, Checkbox, ClickAwayListener, MenuItem, Select, TextField } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import DatePicker from "./DatePicker";
import EmailField from "./EmailField";
import styles from "./AdvancedSearchOptions.module.css";
import { addAdvancedSearchQuery } from "../../../utils/search";
import {
  dateWithinOptions,
  subsetOptions,
  AdvancedSearchSelectHoverStyle,
  AdvancedSearchTextFieldInputStyle,
} from "./constants";
import { useGlobalContext } from "../../../contexts/GlobalContext";
import { buildSearchParams, getDateString } from "../../../utils/searchParams";

const AdvancedSearchOptions = forwardRef(({ isOpen, onClose, searchValue, trigger }, ref) => {
  const navigate = useNavigate();
  const fromFieldRef = useRef(null);
  const location = useLocation();
  const [previousLocation, setPreviousLocation] = useState(null);
  const { setSnackbar } = useGlobalContext();

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
    date: "",
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

  const handleSearch = () => {
    // Check if form has any values (excluding default values)
    const hasSearchCriteria =
      formData.from.trim() ||
      formData.to.trim() ||
      formData.subject.trim() ||
      formData.has.trim() ||
      formData.hasnot.trim() ||
      formData.size.trim() ||
      formData.attachment ||
      formData.excludeChats ||
      formData.subset !== "All Mail" ||
      formData.date;
    // If no search criteria provided, show snackbar and return
    if (!hasSearchCriteria) {
      setSnackbar({
        open: true,
        message: "Invalid search query - returning all mail.",
        autoHideDuration: 4000,
      });
    }
    // Track advanced search query in localStorage
    addAdvancedSearchQuery(formData);

    // Create search criteria object
    const searchCriteria = {
      from: formData.from
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean),
      to: formData.to
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean),
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
    let searchQuery = [];

    if (searchCriteria.from.length > 0) {
      queryParams.append("from", searchCriteria.from.join(","));
      searchQuery.push(`from:(${searchCriteria.from.join(",")})`);
    }
    if (searchCriteria.to.length > 0) {
      queryParams.append("to", searchCriteria.to.join(","));
      searchQuery.push(`to:(${searchCriteria.to.join(",")})`);
    }

    if (searchCriteria.subject) {
      queryParams.append("subject", searchCriteria.subject);
      searchQuery.push(`subject:(${searchCriteria.subject})`);
    }

    if (searchCriteria.hasnot) {
      searchQuery.push(`-{${searchCriteria.hasnot}}`);
      queryParams.append("hasnot", searchCriteria.hasnot);
    }
    if (searchCriteria.size) {
      if (searchCriteria.sizeOperator === "less than") {
        searchQuery.push(`smaller:${searchCriteria.size}${searchCriteria.sizeUnit}`);
      } else {
        searchQuery.push(`larger:${searchCriteria.size}${searchCriteria.sizeUnit}`);
      }
      queryParams.append("size", searchCriteria.size);
      queryParams.append("sizeUnit", searchCriteria.sizeUnit);
      queryParams.append("sizeOperator", searchCriteria.sizeOperator);
    }
    if (searchCriteria.within && searchCriteria.date) {
      const startDate = new Date(searchCriteria.date);
      const endDate = new Date(searchCriteria.date);
      switch (searchCriteria.within) {
        case "1 day":
          endDate.setDate(endDate.getDate() + 1);
          startDate.setDate(startDate.getDate() - 1);
          break;
        case "3 days":
          endDate.setDate(endDate.getDate() + 3);
          startDate.setDate(startDate.getDate() - 3);
          break;
        case "1 week":
          endDate.setDate(endDate.getDate() + 7);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "2 weeks":
          endDate.setDate(endDate.getDate() + 14);
          startDate.setDate(startDate.getDate() - 14);
          break;
        case "1 month":
          endDate.setMonth(endDate.getMonth() + 1);
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case "2 months":
          endDate.setMonth(endDate.getMonth() + 2);
          startDate.setMonth(startDate.getMonth() - 2);
          break;
        case "3 months":
          endDate.setMonth(endDate.getMonth() + 3);
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case "6 months":
          endDate.setMonth(endDate.getMonth() + 6);
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case "1 year":
          endDate.setFullYear(endDate.getFullYear() + 1);
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }
      searchQuery.push(`before:${getDateString(endDate)}`);
      searchQuery.push(`after:${getDateString(startDate)}`);
      queryParams.append("before", getDateString(endDate));
      queryParams.append("after", getDateString(startDate));
    }

    if (searchCriteria.subset !== "All Mail") {
      searchQuery.push(`in:${searchCriteria.subset}`);
      queryParams.append("subset", searchCriteria.subset);
    }

    if (searchCriteria.attachment) {
      searchQuery.push("has:attachment");
      queryParams.append("attachment", "true");
    }

    if (searchCriteria.excludeChats) {
      searchQuery.push("hasnot:chat");
      queryParams.append("excludeChats", "true");
    }
    if (searchCriteria.has) {
      searchQuery.push(searchCriteria.has);
    }

    if (searchQuery.length > 0) {
      searchQuery = searchQuery.join(" ");
      queryParams.append("q", searchQuery);
    }

    // Navigate to search results with advanced criteria
    const queryString = queryParams.toString();
    if (queryString) {
      navigate(
        {
          pathname: `/search/advanced`,
          search: queryString,
        },
        {
          replace: true,
        }
      );
    } else {
      navigate(
        {
          pathname: `/search/advanced`,
        },
        {
          replace: true,
        }
      );
    }

    onClose();
  };

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
      // Use buildSearchParams to get parsed data from URL and search query
      const { apiParams } = buildSearchParams(location);
      // Helper function to extract advanced search fields from buildSearchParams response
      const extractAdvancedSearchFields = () => {
        const fields = {};

        // Extract from - use apiParams.from (already merged from URL and search query)
        if (apiParams.from) {
          fields.from = apiParams.from;
        }

        // Extract to - use apiParams.to (already merged from URL and search query)
        if (apiParams.to) {
          fields.to = apiParams.to;
        }
        // Extract subject - use apiParams.subject (already merged from URL and search query)
        if (apiParams.subject) {
          fields.subject = apiParams.subject;
        }

        // Extract hasnot - use apiParams.hasnot (already merged from URL and search query)
        if (apiParams.hasnot) {
          fields.hasnot = apiParams.hasnot;
        }

        if (apiParams.folder) {
          // Map folder back to subset (capitalize first letter)
          const folderName = apiParams.folder;
          fields.subset = folderName.charAt(0).toUpperCase() + folderName.slice(1);
        } else if (apiParams.label_name) {
          fields.subset = apiParams.label_name;
        }

        // Extract attachment - use apiParams.has_attachment
        if (apiParams.has_attachment === true) {
          fields.attachment = true;
        }

        if (apiParams.q) {
          fields.has = apiParams.q;
        }

        if (apiParams.date_from && apiParams.date_to) {
          const beforeDate = new Date(apiParams.date_to);
          const afterDate = new Date(apiParams.date_from);

          const middleDate = new Date((beforeDate.getTime() + afterDate.getTime()) / 2);
          let foundMatch = false;
          const oneDayBeforeDate = new Date(middleDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          const oneDayAfterDate = new Date(middleDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          if (
            oneDayBeforeDate.toISOString().split("T")[0] === afterDate.toISOString().split("T")[0] &&
            oneDayAfterDate.toISOString().split("T")[0] === beforeDate.toISOString().split("T")[0]
          ) {
            foundMatch = true;
            fields.within = "1 day";
          }
          const threeDaysBeforeDate = new Date(middleDate.getTime() - 3 * 24 * 60 * 60 * 1000);
          const threeDaysAfterDate = new Date(middleDate.getTime() + 3 * 24 * 60 * 60 * 1000);
          if (
            threeDaysBeforeDate.toISOString().split("T")[0] === afterDate.toISOString().split("T")[0] &&
            threeDaysAfterDate.toISOString().split("T")[0] === beforeDate.toISOString().split("T")[0]
          ) {
            foundMatch = true;
            fields.within = "3 days";
          }
          const weekBeforeDate = new Date(middleDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          const weekAfterDate = new Date(middleDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          if (
            weekBeforeDate.toISOString().split("T")[0] === afterDate.toISOString().split("T")[0] &&
            weekAfterDate.toISOString().split("T")[0] === beforeDate.toISOString().split("T")[0]
          ) {
            foundMatch = true;
            fields.within = "1 week";
          }
          const twoWeeksBeforeDate = new Date(middleDate.getTime() - 14 * 24 * 60 * 60 * 1000);
          const twoWeeksAfterDate = new Date(middleDate.getTime() + 14 * 24 * 60 * 60 * 1000);
          if (
            twoWeeksBeforeDate.toISOString().split("T")[0] === afterDate.toISOString().split("T")[0] &&
            twoWeeksAfterDate.toISOString().split("T")[0] === beforeDate.toISOString().split("T")[0]
          ) {
            foundMatch = true;
            fields.within = "2 weeks";
          }
          const monthBeforeDate = new Date(middleDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          const monthAfterDate = new Date(middleDate.getTime() + 30 * 24 * 60 * 60 * 1000);
          if (
            monthBeforeDate.toISOString().split("T")[0] === afterDate.toISOString().split("T")[0] &&
            monthAfterDate.toISOString().split("T")[0] === beforeDate.toISOString().split("T")[0]
          ) {
            foundMatch = true;
            fields.within = "1 month";
          }
          const twoMonthsBeforeDate = new Date(middleDate.getTime() - 60 * 24 * 60 * 60 * 1000);
          const twoMonthsAfterDate = new Date(middleDate.getTime() + 60 * 24 * 60 * 60 * 1000);
          if (
            twoMonthsBeforeDate.toISOString().split("T")[0] === afterDate.toISOString().split("T")[0] &&
            twoMonthsAfterDate.toISOString().split("T")[0] === beforeDate.toISOString().split("T")[0]
          ) {
            foundMatch = true;
            fields.within = "2 months";
          }
          const threeMonthsBeforeDate = new Date(middleDate.getTime() - 90 * 24 * 60 * 60 * 1000);
          const threeMonthsAfterDate = new Date(middleDate.getTime() + 90 * 24 * 60 * 60 * 1000);
          if (
            threeMonthsBeforeDate.toISOString().split("T")[0] === afterDate.toISOString().split("T")[0] &&
            threeMonthsAfterDate.toISOString().split("T")[0] === beforeDate.toISOString().split("T")[0]
          ) {
            foundMatch = true;
            fields.within = "3 months";
          }
          const sixMonthsBeforeDate = new Date(middleDate.getTime() - 180 * 24 * 60 * 60 * 1000);
          const sixMonthsAfterDate = new Date(middleDate.getTime() + 180 * 24 * 60 * 60 * 1000);
          if (
            sixMonthsBeforeDate.toISOString().split("T")[0] === afterDate.toISOString().split("T")[0] &&
            sixMonthsAfterDate.toISOString().split("T")[0] === beforeDate.toISOString().split("T")[0]
          ) {
            foundMatch = true;
            fields.within = "6 months";
          }
          const yearBeforeDate = new Date(middleDate.getTime() - 365 * 24 * 60 * 60 * 1000);
          const yearAfterDate = new Date(middleDate.getTime() + 365 * 24 * 60 * 60 * 1000);
          if (
            yearBeforeDate.toISOString().split("T")[0] === afterDate.toISOString().split("T")[0] &&
            yearAfterDate.toISOString().split("T")[0] === beforeDate.toISOString().split("T")[0]
          ) {
            foundMatch = true;
            fields.within = "1 year";
          }
          if (!foundMatch) {
            fields.within = "1 day";
          } else {
            fields.date = middleDate.toISOString().split("T")[0];
          }
        }

        return fields;
      };

      const urlFields = extractAdvancedSearchFields();
      setFormData({
        ...getDefaultFormData(),
        ...urlFields,
      });
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

  // Handle escape key to close modal and Enter key to submit
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (event) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }

      // Handle Enter key to submit the form
      if (event.key === "Enter" && isOpen) {
        handleSearch();
      }
    };

    document.addEventListener("keydown", handleKeyPress);

    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [isOpen, onClose, formData, navigate, setSnackbar]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      // If changing the "within" field and no date is set, auto-populate with current date
      if (field === "within" && value !== "1 day" && !prev.date) {
        return {
          ...prev,
          [field]: value,
          date: new Date().toISOString().split("T")[0],
        };
      }

      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const handleCreateFilter = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <ClickAwayListener onClickAway={onClose}>
      <div className={`${styles.modal} ${trigger === "filter-chips" ? styles.filterChips : ""}`}>
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
          <div className={styles.formRow} style={{ width: "100%" }}>
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
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    date: prev.date || new Date().toISOString().split("T")[0],
                  }));
                }}
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
          </div>
        </div>

        {/* Modal Footer */}
        <div className={styles.modalFooter}>
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
