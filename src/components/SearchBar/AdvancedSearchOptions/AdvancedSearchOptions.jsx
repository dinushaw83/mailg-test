import React, { useState } from "react";
import { Box, Checkbox, ClickAwayListener, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { useNavigate } from "react-router-dom";
import DatePicker from "./DatePicker";
import dayjs from "dayjs";
import styles from "./AdvancedSearchOptions.module.css";

const InputStyle = {
  "& .MuiInput-root": {
    fontSize: "14px",
  },
  "& .MuiInputBase-input": {
    height: "20px !important",
    padding: 0,
  },
  // override hover underline
  "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
    borderBottom: "1px solid rgba(0,0,0,0.42)",
  },
  // override the focused/active line color
  "& .MuiInput-underline:after": {
    borderBottom: "1px solid #4285f4",
  },
};

const SelectHoverStyle = {
  "&:hover:not(.Mui-disabled, .Mui-error):before": {
    borderBottom: "1px solid rgba(0, 0, 0, 0.42)",
  },
};

const dateWithinOptions = [
  { value: "1 day", label: "1 day" },
  { value: "3 days", label: "3 days" },
  { value: "1 week", label: "1 week" },
  { value: "2 weeks", label: "2 weeks" },
  { value: "1 month", label: "1 month" },
  { value: "2 months", label: "2 months" },
  { value: "3 months", label: "3 months" },
  { value: "6 months", label: "6 months" },
  { value: "1 year", label: "1 year" },
];

const subsetOptions = [
  { value: "All Mail", label: "All Mail" },
  { value: "Inbox", label: "Inbox" },
  { value: "Sent", label: "Sent" },
  { value: "Drafts", label: "Drafts" },
  { value: "Spam", label: "Spam" },
  { value: "Trash", label: "Trash" },
];

const AdvancedSearchOptions = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
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
    includeChats: false,
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSearch = () => {
    // Create search criteria object
    const searchCriteria = {
      from: formData.from,
      to: formData.to,
      subject: formData.subject,
      has: formData.has,
      hasnot: formData.hasnot,
      within: formData.within,
      date: formData.date,
      subset: formData.subset,
      attachment: formData.attachment,
      includeChats: formData.includeChats,
    };

    // Create a query string from the criteria
    const queryParams = new URLSearchParams();

    // Add non-empty criteria to query params (excluding default values)
    Object.entries(searchCriteria).forEach(([key, value]) => {
      // Skip default values that shouldn't be included in URL
      const isDefaultValue =
        (key === "within" && value === "3 days") ||
        (key === "date" && value === "2025/09/01") ||
        (key === "subset" && value === "All Mail") ||
        (key === "sizeOperator" && value === "less than") ||
        (key === "sizeUnit" && value === "MB");

      // Include boolean true values, non-empty strings, and other truthy values (but not default values)
      if (!isDefaultValue && (value === true || (value && value !== ""))) {
        queryParams.append(key, value);
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
            <label htmlFor="from" className={styles.label}>
              From:
            </label>
            <TextField
              fullWidth
              variant="standard"
              id="from"
              value={formData.from}
              onChange={(e) => handleInputChange("from", e.target.value)}
              sx={InputStyle}
            />
          </div>

          {/* To */}
          <div className={styles.formRow}>
            <label htmlFor="to" className={styles.label}>
              To:
            </label>
            <TextField
              fullWidth
              variant="standard"
              id="to"
              value={formData.to}
              onChange={(e) => handleInputChange("to", e.target.value)}
              sx={InputStyle}
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
              sx={InputStyle}
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
              sx={InputStyle}
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
              sx={InputStyle}
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
                  ...SelectHoverStyle,
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
                sx={InputStyle}
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
                  ...SelectHoverStyle,
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
                  ...SelectHoverStyle,
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
                ...SelectHoverStyle,
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

            <label htmlFor="includeChats" className={styles.checkboxLabel}>
              <Checkbox
                id="includeChats"
                size="small"
                checked={formData.includeChats}
                onChange={(e) => handleInputChange("includeChats", e.target.checked)}
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
};

export default AdvancedSearchOptions;
