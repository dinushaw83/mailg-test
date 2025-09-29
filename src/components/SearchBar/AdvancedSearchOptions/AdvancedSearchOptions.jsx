import React, { useState } from "react";
// import { Icon } from "../../ui/Icon";
import styles from "./AdvancedSearchOptions.module.css";
import { Checkbox } from "@mui/material";
import { useNavigate } from "react-router-dom";

const AdvancedSearchOptions = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    from: "",
    to: "",
    subject: "",
    hasWords: "",
    doesntHave: "",
    sizeOperator: "greater than",
    sizeValue: "",
    sizeUnit: "MB",
    dateWithin: "3 days",
    dateValue: "2025/09/01",
    searchIn: "All Mail",
    hasAttachment: false,
    dontIncludeChats: false,
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
      hasWords: formData.hasWords,
      doesntHave: formData.doesntHave,
      dateWithin: formData.dateWithin,
      dateValue: formData.dateValue,
      searchIn: formData.searchIn,
      hasAttachment: formData.hasAttachment,
      dontIncludeChats: formData.dontIncludeChats,
    };

    // Create a query string from the criteria
    const queryParams = new URLSearchParams();

    // Add non-empty criteria to query params (excluding default values)
    Object.entries(searchCriteria).forEach(([key, value]) => {
      // Skip default values that shouldn't be included in URL
      const isDefaultValue =
        (key === "dateWithin" && value === "3 days") ||
        (key === "dateValue" && value === "2025/09/01") ||
        (key === "searchIn" && value === "All Mail") ||
        (key === "sizeOperator" && value === "greater than") ||
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
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalContent}>
          {/* From */}
          <div className={styles.formRow}>
            <label className={styles.label}>From:</label>
            <input
              type="text"
              className={styles.input}
              value={formData.from}
              onChange={(e) => handleInputChange("from", e.target.value)}
              placeholder=""
            />
          </div>

          {/* To */}
          <div className={styles.formRow}>
            <label className={styles.label}>To:</label>
            <input
              type="text"
              className={styles.input}
              value={formData.to}
              onChange={(e) => handleInputChange("to", e.target.value)}
              placeholder=""
            />
          </div>

          {/* Subject */}
          <div className={styles.formRow}>
            <label className={styles.label}>Subject:</label>
            <input
              type="text"
              className={styles.input}
              value={formData.subject}
              onChange={(e) => handleInputChange("subject", e.target.value)}
              placeholder=""
            />
          </div>

          {/* Has the words */}
          <div className={styles.formRow}>
            <label className={styles.label}>Has the words:</label>
            <input
              type="text"
              className={styles.input}
              value={formData.hasWords}
              onChange={(e) => handleInputChange("hasWords", e.target.value)}
              placeholder=""
            />
          </div>

          {/* Doesn't have */}
          <div className={styles.formRow}>
            <label className={styles.label}>Doesn't have:</label>
            <input
              type="text"
              className={styles.input}
              value={formData.doesntHave}
              onChange={(e) => handleInputChange("doesntHave", e.target.value)}
              placeholder=""
            />
          </div>

          {/* Size */}
          <div className={styles.formRow}>
            <label className={styles.label}>Size:</label>
            <div className={styles.sizeContainer}>
              <select
                className={styles.select}
                value={formData.sizeOperator}
                onChange={(e) => handleInputChange("sizeOperator", e.target.value)}
              >
                <option value="greater than">greater than</option>
                <option value="less than">less than</option>
                <option value="equal to">equal to</option>
              </select>
              <input
                type="number"
                className={styles.sizeInput}
                value={formData.sizeValue}
                onChange={(e) => handleInputChange("sizeValue", e.target.value)}
                placeholder=""
              />
              <select
                className={styles.select}
                value={formData.sizeUnit}
                onChange={(e) => handleInputChange("sizeUnit", e.target.value)}
              >
                <option value="B">B</option>
                <option value="KB">KB</option>
                <option value="MB">MB</option>
                <option value="GB">GB</option>
              </select>
            </div>
          </div>

          {/* Date within */}
          <div className={styles.formRow}>
            <label className={styles.label}>Date within:</label>
            <div className={styles.dateContainer}>
              <select
                className={styles.select}
                value={formData.dateWithin}
                onChange={(e) => handleInputChange("dateWithin", e.target.value)}
              >
                <option value="1 day">1 day</option>
                <option value="3 days">3 days</option>
                <option value="1 week">1 week</option>
                <option value="1 month">1 month</option>
                <option value="1 year">1 year</option>
                <option value="custom">custom</option>
              </select>
              <div className={styles.dateInputContainer}>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={formData.dateValue}
                  onChange={(e) => handleInputChange("dateValue", e.target.value)}
                />
                {/* <Icon name="calendar_today" size="small" fontSize={20} className={styles.calendarIcon} /> */}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className={styles.formRow}>
            <label className={styles.label}>Search:</label>
            <select
              className={styles.select}
              value={formData.searchIn}
              onChange={(e) => handleInputChange("searchIn", e.target.value)}
            >
              <option value="All Mail">All Mail</option>
              <option value="Inbox">Inbox</option>
              <option value="Sent">Sent</option>
              <option value="Drafts">Drafts</option>
              <option value="Spam">Spam</option>
              <option value="Trash">Trash</option>
            </select>
          </div>

          {/* Checkboxes */}
          <div className={styles.checkboxContainer}>
            <label htmlFor="hasAttachment" className={styles.checkboxLabel}>
              <Checkbox
                id="hasAttachment"
                size="small"
                checked={formData.hasAttachment}
                onChange={(e) => handleInputChange("hasAttachment", e.target.checked)}
              />
              <span className={styles.checkboxText}>Has attachment</span>
            </label>

            <label htmlFor="dontIncludeChats" className={styles.checkboxLabel}>
              <Checkbox
                id="dontIncludeChats"
                size="small"
                checked={formData.dontIncludeChats}
                onChange={(e) => handleInputChange("dontIncludeChats", e.target.checked)}
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
    </div>
  );
};

export default AdvancedSearchOptions;
