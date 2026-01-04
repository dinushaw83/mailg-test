import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Box,
  TextField,
  IconButton,
  Button,
  Avatar,
  Select,
  MenuItem,
  FormControl,
  Tooltip,
  Divider,
  FormHelperText,
  Chip,
} from "@mui/material";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  CustomInput,
  CustomButton,
  SectionIcon,
  CloseButton,
  LabelDropdown,
  ActionIconButton,
  LabelsDropdown,
} from "../../components/RightSidebarTabs/ContactsTab/ContactComponents";
import InfoModal from "../../components/ComposeEmail/InfoModal";
import countryCode from "../../utils/countryCode.json";
import countries from "../../utils/countries.json";
import { generateNextIntegerId, isValidEmail } from "../../utils/helperFunctions";
import { useGlobalContext } from "../../contexts/GlobalContext";
import styles from "../../components/RightSidebarTabs/ContactsTab/CreateContact.module.css";

// Style of snackbar in this screen
const snackbarStyle = {
  left: "50% !important",
  transform: "translateX(-50%) !important",
  "& .MuiSnackbarContent-root": {
    backgroundColor: "#303030",
    color: "#fff",
    minHeight: "40px",
  },
};

// Normalize contact data for consistent comparison and form population
const normalizeContact = (contact) => ({
  prefix: contact?.prefix || "",
  firstName: contact?.firstName || "",
  lastName: contact?.lastName || "",
  suffix: contact?.suffix || "",
  phoneticFirst: contact?.phoneticFirst || "",
  phoneticMiddle: contact?.phoneticMiddle || "",
  phoneticLast: contact?.phoneticLast || "",
  nickname: contact?.nickname || "",
  fileAs: contact?.fileAs || "",
  company: contact?.company || "",
  jobTitle: contact?.jobTitle || "",
  department: contact?.department || "",
  emails:
    Array.isArray(contact?.emails) && contact?.emails.length > 0 ? [...contact.emails] : [{ value: "", label: "" }],
  phones:
    Array.isArray(contact?.phones) && contact?.phones.length > 0
      ? [...contact.phones]
      : [{ countryCode: "US", dialCode: "+1", value: "", label: "" }],
  addresses: Array.isArray(contact?.addresses) && contact?.addresses.length > 0 ? [...contact.addresses] : [],
  birthday:
    contact?.birthday && Object.keys(contact.birthday).length > 0
      ? { ...contact.birthday }
      : { month: "", day: "", year: "" },
  notes: contact?.notes || "",
  significantDates:
    Array.isArray(contact?.significantDates) && contact?.significantDates.length > 0
      ? [...contact.significantDates]
      : [],
  websites: Array.isArray(contact?.websites) && contact?.websites.length > 0 ? [...contact.websites] : [],
  relatedPersons:
    Array.isArray(contact?.relatedPersons) && contact?.relatedPersons.length > 0 ? [...contact.relatedPersons] : [],
  customFields:
    Array.isArray(contact?.customFields) && contact?.customFields.length > 0 ? [...contact.customFields] : [],
  isFavorite: contact?.isFavorite || false,
  labels: contact?.labels || [],
});

const CreateContactPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { recipients, setRecipients, setSnackbar, emails, recipientLabels, hiddenRecipients, deletedRecipients } =
    useGlobalContext();

  // Check if this is edit mode based on URL
  const isEditMode = location.pathname.includes("/person/") && new URLSearchParams(location.search).get("edit") === "1";
  const contactId = location.pathname.split("/person/")[1]?.split("?")[0];

  // Get contact to update if in edit mode
  const contactToUpdate = useMemo(() => {
    if (isEditMode && contactId) {
      let found = recipients.find((recipient) => recipient.id?.toString() === contactId?.toString());

      if (!found) {
        if (isValidEmail(contactId)) {
          // Get the email object of from emails from field
          const emailObj = emails.find((email) => email.from.email === contactId);
          found = {
            id: contactId,
            email: contactId,
            name: emailObj?.from?.name ?? contactId,
            firstName: emailObj?.from?.name?.split(" ")[0] ?? contactId,
            lastName: emailObj?.from?.name?.split(" ").slice(1).join(" ") ?? "",
            emails: [{ value: contactId, label: "" }],
            isCustomContact: true,
            labels: [],
          };
        }
      }

      return found;
    }
    return null;
  }, [isEditMode, contactId, recipients, emails]);

  const [showPrefix, setShowPrefix] = useState(false);
  const [showDepartment, setShowDepartment] = useState(false);
  const [dropdownStates, setDropdownStates] = useState({
    emailLabels: {},
    phoneLabels: {},
    addressLabels: {},
    significantDateLabels: {},
    websiteLabels: {},
    relatedPersonLabels: {},
  });
  const [filterStates, setFilterStates] = useState({
    emailLabels: {},
    phoneLabels: {},
    addressLabels: {},
    significantDateLabels: {},
    websiteLabels: {},
    relatedPersonLabels: {},
  });
  const saveTimeout = useRef(null);

  // Normalize contact data for consistent comparison and form population
  const normalized = normalizeContact(contactToUpdate);

  // Auto populate form data in case of edit contact
  const [formData, setFormData] = useState(() => ({ ...normalized }));

  const [displayNotes, setDisplayNotes] = useState(true);
  const [birthdayError, setBirthdayError] = useState({
    message: "",
    fields: { month: false, day: false, year: false },
  });
  const [significantDateErrors, setSignificantDateErrors] = useState({});

  // Automatically display more fields in case of contact to update contains values of more fields
  const [showMoreFields, setShowMoreFields] = useState(
    contactToUpdate?.significantDates?.length > 0 ||
      contactToUpdate?.websites?.length > 0 ||
      contactToUpdate?.relatedPersons?.length > 0 ||
      contactToUpdate?.customFields?.length > 0
  );
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  // Reference for the saved contact
  const originalContact = useRef(null);
  const [disableHeader, setDisableHeader] = useState(false);

  // Labels state management
  const [labelsMenuAnchor, setLabelsMenuAnchor] = useState(null);
  const [tempLabels, setTempLabels] = useState(contactToUpdate?.labels || []);

  // Setting USA as user country
  const userCountry = countryCode.find((c) => c.code === "US");

  // Label options
  const emailLabelOptions = ["Home", "Work", "Other"];
  const phoneLabelOptions = ["Home", "Work", "Other", "Mobile", "Main", "Home Fax", "Work Fax", "MailG Voice", "Pager"];
  const labelOptions = ["Home", "Work", "Other"];
  const significantDateLabelOptions = ["Anniversary", "Other"];
  const websiteLabelOptions = ["Profile", "Blog", "Home Page", "Work"];
  const relatedPersonLabelOptions = [
    "Spouse",
    "Child",
    "Mother",
    "Father",
    "Parent",
    "Brother",
    "Sister",
    "Friend",
    "Relative",
    "Manager",
    "Assistant",
    "Reference",
    "Partner",
    "Domestic Partner",
  ];

  // Month options for birthday
  const monthOptions = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Get days in month helper function
  const getDaysInMonth = (month, year) => {
    const monthNum = monthOptions.indexOf(month) + 1;
    const yearNum = year ? parseInt(year) : new Date().getFullYear();
    return new Date(yearNum, monthNum, 0).getDate();
  };

  // Validate date data (used for birthday and significant dates)
  const validateDate = (month, day, year) => {
    const errors = { message: "", fields: { month: false, day: false, year: false } };

    // Check if year is not a number
    if (year && isNaN(year)) {
      errors.message = "Please enter a valid date";
      errors.fields = { month: true, day: true, year: true };
      return errors;
    }

    // Check if year has more than 4 digits
    if (year && year.toString().length > 4) {
      errors.message = "Please enter a four digit year";
      errors.fields = { month: true, day: true, year: true };
      return errors;
    }

    // Day validation based on month selection
    if (day) {
      const dayNum = parseInt(day);

      // Check if day is not a number
      if (isNaN(dayNum)) {
        errors.message = "Please enter a valid date";
        errors.fields = { month: true, day: true, year: year ? true : false };
        return errors;
      }

      if (month) {
        // Month is selected - check against actual days in month
        const maxDays = getDaysInMonth(month, year);
        if (dayNum < 1 || dayNum > maxDays) {
          errors.message = "Please enter a valid date";
          errors.fields = { month: true, day: true, year: year ? true : false };
          return errors;
        }
      } else {
        // Month is empty - only check if day > 31
        if (dayNum < 1 || dayNum > 31) {
          errors.message = "Please enter a valid date";
          errors.fields = { month: true, day: true, year: year ? true : false };
          return errors;
        }
      }
    }

    return errors;
  };

  // Clear timeout on unmount
  useEffect(
    () => () => {
      saveTimeout.current && clearTimeout(saveTimeout.current);
    },
    []
  );

  // Get the label id
  const getLabelId = (label) => recipientLabels.find((l) => l.label === label)?.id;

  // Handle labels menu open
  const handleLabelsMenuOpen = (event) => {
    setLabelsMenuAnchor(event.currentTarget);
    setTempLabels(formData.labels);
  };

  // Handle labels menu close
  const handleLabelsMenuClose = () => {
    setLabelsMenuAnchor(null);
    setTempLabels(formData.labels);
  };

  // Handle label toggle in dropdown
  const handleLabelToggle = (labelName) => {
    setTempLabels((prev) =>
      prev.includes(labelName) ? prev.filter((label) => label !== labelName) : [...prev, labelName]
    );
  };

  // Handle apply labels
  const handleApplyLabels = () => {
    setFormData((prev) => ({ ...prev, labels: tempLabels }));
    setLabelsMenuAnchor(null);
  };

  // Check if labels have changed
  const hasLabelsChanged = () => {
    return JSON.stringify([...formData.labels].sort()) !== JSON.stringify([...tempLabels].sort());
  };

  // Handle back button click
  const handleBackClick = () => {
    if (hasFieldChange()) {
      setShowUnsavedModal(true);
    } else {
      if (location.key !== "default") {
        navigate(-1);
      } else {
        navigate("/contacts", { replace: true });
      }
    }
  };

  // Check if any field has content (for create) or has changed (for edit)
  const hasFieldChange = () => {
    // If editing, compare with original contact using JSON comparison
    if (contactToUpdate) {
      const currentContact = normalizeContact({ ...formData });
      const originalContact = normalizeContact(contactToUpdate);

      // Compare JSON strings
      return JSON.stringify(currentContact) !== JSON.stringify(originalContact);
    }

    // For create contact, check if any field has content
    if (
      formData.prefix.trim() ||
      formData.firstName.trim() ||
      formData.lastName.trim() ||
      formData.company.trim() ||
      formData.jobTitle.trim() ||
      formData.department.trim() ||
      formData.notes.trim()
    ) {
      return true;
    }

    // Check emails
    if (formData.emails.some((email) => email.value.trim() || email.label.trim())) {
      return true;
    }

    // Check phones
    if (formData.phones.some((phone) => phone.value.trim() || phone.label.trim())) {
      return true;
    }

    // Check addresses
    if (
      formData.addresses.some(
        (address) =>
          address.streetAddress.trim() ||
          address.streetAddress2.trim() ||
          address.city.trim() ||
          address.zipCode.trim() ||
          address.poBox.trim() ||
          address.label.trim()
      )
    ) {
      return true;
    }

    // Check birthday
    if (formData.birthday.month.trim() || formData.birthday.day.trim() || formData.birthday.year.trim()) {
      return true;
    }

    // Check significant dates
    if (
      formData.significantDates.some(
        (date) => date.month.trim() || date.day.trim() || date.year.trim() || date.label.trim()
      )
    ) {
      return true;
    }

    // Check websites
    if (formData.websites.some((website) => website.value.trim() || website.label.trim())) {
      return true;
    }

    // Check related persons
    if (formData.relatedPersons.some((person) => person.value.trim() || person.label.trim())) {
      return true;
    }

    // Check custom fields
    if (formData.customFields.some((field) => field.value.trim() || field.label.trim())) {
      return true;
    }

    return false;
  };

  // Handle undo save
  const handleUndoSave = () => {
    // Undo the save from the recipients array
    if (originalContact.current.type === "EDIT" && !originalContact.current.contact?.isCustomContact) {
      setRecipients((prev) =>
        prev.map((recipient) =>
          recipient.id === originalContact.current.contact.id
            ? { ...originalContact.current.contact, updatedAt: new Date().toISOString() }
            : recipient
        )
      );
    } else {
      setRecipients((prev) => prev.filter((recipient) => recipient.id !== originalContact.current.contact.id));
    }

    // Display snackbar notification indicating contact saving undone
    setSnackbar({
      open: true,
      message: "Undone",
      action: null,
      autoHideDuration: 3000,
      hideClose: true,
      style: snackbarStyle,
    });

    // Navigate back to contacts list in case of create contact
    if (originalContact.current.type === "CREATE") {
      navigate("/contacts", { replace: true });
    } else if (originalContact.current.type === "EDIT" && originalContact.current.contact?.isCustomContact) {
      // Navigate to the original contact details
      navigate(`/contacts/person/${originalContact.current.contact.id}`, { replace: true, state: { from: "create" } });
    }
  };

  // Handle save
  const handleSave = () => {
    if (hasFieldChange()) {
      // Display snackbar notification
      setSnackbar({
        open: true,
        message: "Working...",
        action: null,
        autoHideDuration: 500,
        hideClose: true,
        style: snackbarStyle,
        closeIconColor: "#fff",
      });

      // Disable the header
      setDisableHeader(true);

      saveTimeout.current = setTimeout(() => {
        // Use current contact labels from formData
        let labels = [...formData.labels];

        const contact = {
          ...formData,
          name: [formData.prefix, formData.firstName, formData.lastName].filter(Boolean).join(" "),
          // Id should be from the contact to update in case of edit contact and not custom contact
          id:
            !contactToUpdate?.isCustomContact && contactToUpdate?.id
              ? contactToUpdate?.id
              : generateNextIntegerId([...recipients, ...hiddenRecipients, ...deletedRecipients]),
          avatar: contactToUpdate?.avatar || null,
          labels,
          // Set isSaved to true
          isSaved: true,
          updatedAt: new Date().toISOString(),
          createdAt: contactToUpdate?.createdAt ?? new Date().toISOString(),
          savedAt: contactToUpdate?.savedAt ?? new Date().toISOString(),
          // First email should be the primary email if it exists
          email: Array.isArray(formData.emails) && formData.emails.length > 0 ? formData.emails[0].value : null,
        };

        // Save the original contact in case of edit contact or the new contact
        originalContact.current = {
          type: contactToUpdate ? "EDIT" : "CREATE",
          contact: contactToUpdate ? contactToUpdate : contact,
        };

        // Save the contact in the recipients array
        if (contactToUpdate && !contactToUpdate.isCustomContact) {
          setRecipients((prev) => prev.map((recipient) => (recipient.id === contactToUpdate.id ? contact : recipient)));
        } else {
          setRecipients((prev) => [...prev, contact]);
        }

        // Navigate to the contact details screen
        navigate(`/contacts/person/${contact.id}`, { replace: true, state: { from: "create" } });

        // Display snackbar notification indicating contact created
        setSnackbar({
          open: true,
          message: contactToUpdate ? "Contact details updated" : "New contact created",
          action: (
            <Button
              variant="text"
              size="medium"
              onClick={handleUndoSave}
              sx={{ textTransform: "capitalize", color: "#a8c7fa", fontWeight: 400 }}
            >
              Undo
            </Button>
          ),
          autoHideDuration: 5000,
          hideClose: false,
          style: snackbarStyle,
          closeIconColor: "#fff",
        });

        // Enable the header
        setDisableHeader(false);
      }, 500);
    }
  };

  // Handle modal discard
  const handleModalDiscard = () => {
    setShowUnsavedModal(false);
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate("/contacts", { replace: true });
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        margin: "16px 16px 16px 20px",
        borderRadius: "24px",
        width: "100%",
        height: "calc(100vh - 98px)",
        overflowY: "auto",
        position: "relative",
      }}
    >
      <Box sx={{ width: "620px" }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1,
            px: 4,
            pt: 4,
            position: "fixed",
            top: "82px",
            backgroundColor: "white",
            zIndex: 2,
            width: "620px",
            borderTopLeftRadius: "24px",
          }}
        >
          {/* Back */}
          <ActionIconButton
            iconName="arrow_back"
            title="Back"
            onClick={handleBackClick}
            disabled={disableHeader}
            tooltipPlacement="top"
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {/* Favorite */}
            <ActionIconButton
              iconName="star"
              title={formData.isFavorite ? "Remove from favorites" : "Add to favorites"}
              onClick={() => setFormData((prev) => ({ ...prev, isFavorite: !prev.isFavorite }))}
              color={formData.isFavorite ? "#0b57d0" : "#4f5251"}
              iconType={formData.isFavorite ? "filled" : "outlined"}
              sx={{
                "&:hover": {
                  backgroundColor: formData.isFavorite ? "rgba(11, 87, 208, 0.08)" : "action.hover",
                },
              }}
              disabled={disableHeader}
              tooltipPlacement="top"
            />

            {/* Save */}
            <Button
              variant="contained"
              sx={{
                textTransform: "none",
                px: 3,
                borderRadius: "50px",
                fontSize: "0.875rem",
                fontWeight: 400,
                py: "7px",
                backgroundColor: "#0b57d0",
                "&:hover": {
                  opacity: 0.9,
                },
                "&:disabled": {
                  backgroundColor: "#e7e7e7",
                  color: "#9e9e9e",
                },
              }}
              disabled={!hasFieldChange() || disableHeader}
              onClick={handleSave}
            >
              Save
            </Button>
          </Box>
        </Box>

        {/* Scrollable Content */}
        <Box sx={{ py: 2, pl: 6, mt: 9 }}>
          {/* Profile Picture */}
          <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
            <Avatar
              sx={{
                width: "162px",
                height: "162px",
                bgcolor: "#e8f0fe",
                color: "#d2e3fc",
                fontSize: "200px",
              }}
            >
              <span className="material-symbols-filled" style={{ marginTop: "25px" }}>
                person
              </span>
            </Avatar>
          </Box>

          {/* Labels Section - only show if recipientLabels is not empty */}
          {recipientLabels && recipientLabels.length > 0 && (
            <Box sx={{ display: "flex", alignItems: "flex-start", mt: 3, ml: "-10px" }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
                {formData.labels.length > 0 ? (
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "flex-start",
                    }}
                  >
                    {formData.labels.map((label, index) => (
                      <Tooltip
                        key={`label-${index}`}
                        title={label}
                        placement="top"
                        slotProps={{
                          popper: {
                            sx: {
                              "& .MuiTooltip-tooltip": {
                                backgroundColor: "rgba(0, 0, 0, 0.9)",
                                color: "white",
                                fontSize: "12px",
                                fontWeight: 200,
                              },
                            },
                          },
                        }}
                      >
                        <Link
                          sx={{ textDecoration: "none" }}
                          to={`/contacts/label/${getLabelId(label)}`}
                          target="_blank"
                        >
                          <Chip
                            label={label}
                            size="small"
                            icon={
                              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                                label
                              </span>
                            }
                            sx={{
                              backgroundColor: "transparent",
                              color: "rgba(0, 0, 0, .87)",
                              border: "1px solid #c4c7c5",
                              height: "28px",
                              px: "4px",
                              "& .MuiChip-label": {
                                maxWidth: "92px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                fontSize: "0.6875rem",
                                fontWeight: 500,
                              },
                              borderRadius: "8px",
                              "& .MuiChip-icon": {
                                color: "#1f1f1f",
                                fontSize: "18px",
                              },
                              "&:hover": {
                                cursor: "pointer",
                                backgroundColor: "rgba(31, 31, 31, 0.08)",
                              },
                            }}
                          />
                        </Link>
                      </Tooltip>
                    ))}

                    {/* Edit button */}
                    <Tooltip
                      title="Manage labels"
                      placement="top"
                      slotProps={{
                        popper: {
                          sx: {
                            "& .MuiTooltip-tooltip": {
                              backgroundColor: "rgba(0, 0, 0, 0.9)",
                              color: "white",
                              fontSize: "12px",
                              fontWeight: 200,
                            },
                          },
                        },
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={handleLabelsMenuOpen}
                        sx={{
                          backgroundColor: "transparent",
                          color: "#0b57d0",
                          border: "1px solid #c4c6c5",
                          "&:hover": {
                            backgroundColor: "rgba(31, 31, 31, 0.08)",
                            cursor: "pointer",
                          },
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                          edit
                        </span>
                      </IconButton>
                    </Tooltip>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                    <Tooltip
                      title="Manage labels"
                      placement="bottom"
                      slotProps={{
                        popper: {
                          sx: {
                            "& .MuiTooltip-tooltip": {
                              backgroundColor: "#888888",
                              color: "white",
                              fontSize: "10px",
                              fontWeight: 400,
                              borderRadius: 0,
                            },
                          },
                        },
                      }}
                    >
                      <Chip
                        label="Label"
                        size="small"
                        onClick={handleLabelsMenuOpen}
                        icon={
                          <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "#0b57d0" }}>
                            add
                          </span>
                        }
                        sx={{
                          backgroundColor: "transparent",
                          color: "rgba(0, 0, 0, .87)",
                          border: "1px solid #c4c7c5",
                          height: "28px",
                          px: "4px",
                          "& .MuiChip-label": {
                            maxWidth: "92px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: "0.6875rem",
                            fontWeight: 500,
                          },
                          borderRadius: "8px",
                          "& .MuiChip-icon": {
                            color: "#1f1f1f",
                            fontSize: "18px",
                          },
                          "&:hover": {
                            cursor: "pointer",
                            backgroundColor: "rgba(31, 31, 31, 0.08)",
                          },
                        }}
                      />
                    </Tooltip>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* Personal Details Section */}
          <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2.5, mt: 4 }}>
            <SectionIcon iconName="person" title="Name" iconStyle={{ marginRight: "15px" }} />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
              {/* Prefix */}
              {showPrefix && (
                <CustomInput
                  label="Prefix"
                  value={formData.prefix}
                  onChange={(e) => setFormData((prev) => ({ ...prev, prefix: e.target.value }))}
                />
              )}
              {/* First name */}
              <CustomInput
                label="First name"
                value={formData.firstName}
                onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
              />

              {/* Last name */}
              <CustomInput
                label="Last name"
                value={formData.lastName}
                onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
              />

              {/* Additional fields when expanded */}
              {showPrefix && (
                <>
                  {/* Suffix */}
                  <CustomInput
                    label="Suffix"
                    value={formData.suffix}
                    onChange={(e) => setFormData((prev) => ({ ...prev, suffix: e.target.value }))}
                  />

                  {/* Phonetic first */}
                  <CustomInput
                    label="Phonetic first"
                    value={formData.phoneticFirst}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phoneticFirst: e.target.value }))}
                  />

                  {/* Phonetic middle */}
                  <CustomInput
                    label="Phonetic middle"
                    value={formData.phoneticMiddle}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phoneticMiddle: e.target.value }))}
                  />

                  {/* Phonetic last */}
                  <CustomInput
                    label="Phonetic last"
                    value={formData.phoneticLast}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phoneticLast: e.target.value }))}
                  />

                  {/* Nickname */}
                  <CustomInput
                    label="Nickname"
                    value={formData.nickname}
                    onChange={(e) => setFormData((prev) => ({ ...prev, nickname: e.target.value }))}
                  />

                  {/* File as */}
                  <CustomInput
                    label="File as"
                    value={formData.fileAs}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fileAs: e.target.value }))}
                  />
                </>
              )}
            </Box>

            <Tooltip
              title={showPrefix ? "Show less" : "Show more"}
              placement="top-end"
              slotProps={{
                popper: {
                  sx: {
                    "& .MuiTooltip-tooltip": {
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                      color: "white",
                      fontSize: "12px",
                      fontWeight: 200,
                    },
                  },
                },
              }}
            >
              <IconButton
                size="small"
                onClick={() => setShowPrefix((prev) => !prev)}
                sx={{
                  transform: showPrefix ? "rotate(180deg)" : "rotate(0deg)",
                  color: showPrefix ? "#0b57d0" : "#4a4d4c",
                  "&:hover": {
                    backgroundColor: showPrefix ? "rgba(11, 87, 208, 0.08)" : "action.hover",
                  },
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 23 }}>
                  keyboard_arrow_down
                </span>
              </IconButton>
            </Tooltip>
          </Box>

          {/* Company Information Section */}
          <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2.5 }}>
            <SectionIcon iconName="domain" title="Organization" iconStyle={{ marginRight: "15px" }} />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
              {/* Company */}
              <CustomInput
                label="Company"
                value={formData.company}
                onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
              />

              {/* Job title */}
              <CustomInput
                label="Job title"
                value={formData.jobTitle}
                onChange={(e) => setFormData((prev) => ({ ...prev, jobTitle: e.target.value }))}
              />

              {/* Department */}
              {showDepartment && (
                <CustomInput
                  label="Department"
                  value={formData.department}
                  onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                />
              )}
            </Box>

            <Tooltip
              title={showDepartment ? "Show less" : "Show more"}
              placement="top-end"
              slotProps={{
                popper: {
                  sx: {
                    "& .MuiTooltip-tooltip": {
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                      color: "white",
                      fontSize: "12px",
                      fontWeight: 200,
                    },
                  },
                },
              }}
            >
              <IconButton
                size="small"
                onClick={() => setShowDepartment((prev) => !prev)}
                sx={{
                  transform: showDepartment ? "rotate(180deg)" : "rotate(0deg)",
                  color: showDepartment ? "#0b57d0" : "#4a4d4c",
                  "&:hover": {
                    backgroundColor: showDepartment ? "rgba(11, 87, 208, 0.08)" : "action.hover",
                  },
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 23 }}>
                  keyboard_arrow_down
                </span>
              </IconButton>
            </Tooltip>
          </Box>

          {/* Email Section */}
          <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
            <SectionIcon
              iconName="mail"
              title="Email"
              isVisible={formData.emails.length > 0}
              iconStyle={{ marginRight: "15px" }}
            />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
              {formData.emails.map((email, index) => (
                <Box key={`email-${index}`} className={styles.inputGroup}>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "flex-start", width: "100%" }}>
                    <CustomInput
                      label="Email"
                      value={email.value}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          emails: prev.emails.map((em, i) => (i === index ? { ...em, value: e.target.value } : em)),
                        }))
                      }
                      type="email"
                      sx={{ minWidth: "200px", flex: 1 }}
                    />
                    {/* Label input - only show when email has content */}
                    {email.value.trim() && (
                      <LabelDropdown
                        value={email.label}
                        onChange={(value) => {
                          setFormData((prev) => ({
                            ...prev,
                            emails: prev.emails.map((em, i) => (i === index ? { ...em, label: value } : em)),
                          }));
                          setFilterStates((prev) => ({
                            ...prev,
                            emailLabels: { ...prev.emailLabels, [index]: value },
                          }));
                          setDropdownStates((prev) => ({
                            ...prev,
                            emailLabels: { ...prev.emailLabels, [index]: true },
                          }));
                        }}
                        onFocus={() =>
                          setDropdownStates((prev) => ({
                            ...prev,
                            emailLabels: { ...prev.emailLabels, [index]: true },
                          }))
                        }
                        onBlur={() => {
                          setTimeout(
                            () =>
                              setDropdownStates((prev) => ({
                                ...prev,
                                emailLabels: { ...prev.emailLabels, [index]: false },
                              })),
                            200
                          );
                        }}
                        options={emailLabelOptions}
                        onLabelSelect={(value) => {
                          setFormData((prev) => ({
                            ...prev,
                            emails: prev.emails.map((em, i) => (i === index ? { ...em, label: value } : em)),
                          }));
                          setDropdownStates((prev) => ({
                            ...prev,
                            emailLabels: { ...prev.emailLabels, [index]: false },
                          }));
                          setFilterStates((prev) => ({ ...prev, emailLabels: { ...prev.emailLabels, [index]: "" } }));
                        }}
                        showDropdown={dropdownStates.emailLabels[index]}
                        dropdownClassName={styles.dropdown}
                        sx={{ minWidth: "120px", flex: "0 0 auto" }}
                      />
                    )}
                  </Box>
                  <CloseButton
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        emails: prev.emails.filter((_, i) => i !== index),
                      }))
                    }
                  />
                </Box>
              ))}

              <CustomButton
                startIcon={
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: formData.emails.length > 0 ? "21px" : "20px" }}
                  >
                    {formData.emails.length > 0 ? "add" : "mail"}
                  </span>
                }
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    emails: [...prev.emails, { value: "", label: "" }],
                  }))
                }
              >
                Add email
              </CustomButton>
            </Box>
          </Box>

          {/* Phone Section */}
          <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2, mt: formData.phones.length > 0 ? "18px" : 0 }}>
            <SectionIcon
              iconName="call"
              title="Phone"
              isVisible={formData.phones.length > 0}
              iconType="filled"
              iconStyle={{ marginRight: "15px" }}
            />
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
              {formData.phones.map((phone, index) => (
                <Box key={`phone-${index}`} className={styles.inputGroup}>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "flex-start", width: "100%" }}>
                    <Box sx={{ display: "flex", gap: 1, minWidth: "200px", flex: 1 }}>
                      <FormControl
                        sx={{
                          width: "60px",
                          "& .MuiOutlinedInput-root": {
                            height: "35px",
                            "& fieldset": {
                              borderColor: "#747775",
                            },
                            "&:hover fieldset": {
                              borderColor: "black",
                            },
                            "&.Mui-focused fieldset": {
                              borderColor: "#0b57d0",
                              borderWidth: "3px",
                            },
                          },
                        }}
                      >
                        <Select
                          value={phone.countryCode}
                          onChange={(e) => {
                            const country = countryCode.find((c) => c.code === e.target.value);
                            setFormData((prev) => ({
                              ...prev,
                              phones: prev.phones.map((ph, i) =>
                                i === index
                                  ? { ...ph, countryCode: e.target.value, dialCode: country?.dial_code || "+1" }
                                  : ph
                              ),
                            }));
                          }}
                          displayEmpty
                          size="small"
                          renderValue={(value) => {
                            const country = countryCode.find((c) => c.code === value);
                            return (
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ fontSize: "18px" }}>{country?.emoji}</span>
                              </Box>
                            );
                          }}
                          sx={{
                            height: "35px",
                            "& .MuiInputBase-input": {
                              pr: "24px !important",
                            },
                            "& .MuiSelect-select": {
                              padding: "8px 14px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            },
                            "& .MuiSelect-icon": {
                              right: 0,
                              fontSize: "18px",
                            },
                          }}
                          MenuProps={{
                            anchorOrigin: {
                              vertical: "top",
                              horizontal: "left",
                            },
                            transformOrigin: {
                              vertical: "bottom",
                              horizontal: "left",
                            },
                            PaperProps: {
                              sx: {
                                backgroundColor: "#f0f4f9",
                                maxHeight: "400px",
                                maxWidth: "276px",
                                "& .MuiMenuItem-root": {
                                  padding: "2px 12px",
                                },
                              },
                            },
                          }}
                        >
                          {/* User's country first */}
                          {userCountry && (
                            <MenuItem key={userCountry.code} value={userCountry.code}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <span style={{ fontSize: "20px" }}>{userCountry.emoji}</span>
                                <span style={{ fontSize: "15px", fontWeight: 400 }}>
                                  {userCountry.name} ({userCountry.dial_code})
                                </span>
                              </Box>
                            </MenuItem>
                          )}

                          {/* Divider after user's country */}
                          {userCountry && <Divider sx={{ my: 0.5 }} />}

                          {/* All other countries */}
                          {countryCode
                            .filter((country) => country.code !== userCountry?.code)
                            .map((country) => (
                              <MenuItem key={country.code} value={country.code}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <span style={{ fontSize: "20px" }}>{country.emoji}</span>
                                  <span style={{ fontSize: "15px", fontWeight: 400 }}>
                                    {country.name} ({country.dial_code})
                                  </span>
                                </Box>
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                      <CustomInput
                        label="Phone"
                        value={phone.value}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            phones: prev.phones.map((ph, i) => (i === index ? { ...ph, value: e.target.value } : ph)),
                          }))
                        }
                        type="tel"
                        sx={{ flex: 1 }}
                      />
                    </Box>
                    {/* Label input - only show when phone has content */}
                    {phone.value.trim() && (
                      <LabelDropdown
                        value={phone.label}
                        onChange={(value) => {
                          setFormData((prev) => ({
                            ...prev,
                            phones: prev.phones.map((ph, i) => (i === index ? { ...ph, label: value } : ph)),
                          }));
                          setFilterStates((prev) => ({
                            ...prev,
                            phoneLabels: { ...prev.phoneLabels, [index]: value },
                          }));
                          setDropdownStates((prev) => ({
                            ...prev,
                            phoneLabels: { ...prev.phoneLabels, [index]: true },
                          }));
                        }}
                        onFocus={() =>
                          setDropdownStates((prev) => ({
                            ...prev,
                            phoneLabels: { ...prev.phoneLabels, [index]: true },
                          }))
                        }
                        onBlur={() => {
                          setTimeout(
                            () =>
                              setDropdownStates((prev) => ({
                                ...prev,
                                phoneLabels: { ...prev.phoneLabels, [index]: false },
                              })),
                            200
                          );
                        }}
                        options={phoneLabelOptions}
                        onLabelSelect={(value) => {
                          setFormData((prev) => ({
                            ...prev,
                            phones: prev.phones.map((ph, i) => (i === index ? { ...ph, label: value } : ph)),
                          }));
                          setDropdownStates((prev) => ({
                            ...prev,
                            phoneLabels: { ...prev.phoneLabels, [index]: false },
                          }));
                          setFilterStates((prev) => ({ ...prev, phoneLabels: { ...prev.phoneLabels, [index]: "" } }));
                        }}
                        showDropdown={dropdownStates.phoneLabels[index]}
                        dropdownClassName={styles.upwardLabelDropdown}
                        sx={{ minWidth: "120px", flex: "0 0 auto" }}
                      />
                    )}
                  </Box>

                  <CloseButton
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        phones: prev.phones.filter((_, i) => i !== index),
                      }))
                    }
                  />
                </Box>
              ))}

              <CustomButton
                startIcon={
                  <span
                    className={`material-symbols-${formData.phones.length > 0 ? "outlined" : "filled"}`}
                    style={{ fontSize: "21px" }}
                  >
                    {formData.phones.length > 0 ? "add" : "call"}
                  </span>
                }
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    phones: [...prev.phones, { countryCode: "US", dialCode: "+1", value: "", label: "" }],
                  }))
                }
              >
                Add phone
              </CustomButton>
            </Box>
          </Box>

          {/* Address Section */}
          <Box
            sx={{ display: "flex", alignItems: "flex-start", mb: 2, mt: formData.addresses.length > 0 ? "18px" : 0 }}
          >
            <SectionIcon
              iconName="location_on"
              title="Address"
              isVisible={formData.addresses.length > 0}
              iconStyle={{ marginRight: "15px" }}
            />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
              {formData.addresses.map((address, index) => (
                <Box key={`address-${index}`} className={styles.inputGroup}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
                    {/* Country/Region */}
                    <FormControl fullWidth className={styles.dropdownContainer}>
                      <Select
                        value={address.countryCode || ""}
                        onChange={(e) => {
                          const selectedCountry = countries.find((c) => c.code2 === e.target.value);
                          setFormData((prev) => ({
                            ...prev,
                            addresses: prev.addresses.map((addr, i) =>
                              i === index
                                ? {
                                    ...addr,
                                    countryCode: e.target.value,
                                    countryName: selectedCountry ? selectedCountry.name : "",
                                    stateCode: "",
                                    stateName: "",
                                  }
                                : addr
                            ),
                          }));
                        }}
                        displayEmpty
                        sx={{
                          height: "35px",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#747775",
                            borderWidth: "1px",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "black",
                            borderWidth: "1px",
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#0b57d0",
                            borderWidth: "3px",
                          },
                        }}
                        MenuProps={{
                          anchorOrigin: {
                            vertical: "top",
                            horizontal: "left",
                          },
                          transformOrigin: {
                            vertical: "bottom",
                            horizontal: "left",
                          },
                          PaperProps: {
                            sx: {
                              backgroundColor: "#f0f4f9",
                              maxHeight: "400px",
                              maxWidth: "200px",
                              "& .MuiMenuItem-root": {
                                padding: "2px 12px",
                              },
                            },
                          },
                        }}
                      >
                        {countries.map((country) => (
                          <MenuItem key={country.code2} value={country.code2}>
                            {country.name}
                          </MenuItem>
                        ))}
                      </Select>
                      <Box className={`${styles.dropdownLabel} ${address.countryCode ? styles.floating : ""}`}>
                        Country/Region
                      </Box>
                    </FormControl>

                    {/* Street address */}
                    <CustomInput
                      label="Street address"
                      value={address.streetAddress}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          addresses: prev.addresses.map((addr, i) =>
                            i === index ? { ...addr, streetAddress: e.target.value } : addr
                          ),
                        }))
                      }
                    />

                    {/* Street address line 2 */}
                    <CustomInput
                      label="Street address line 2"
                      value={address.streetAddress2}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          addresses: prev.addresses.map((addr, i) =>
                            i === index ? { ...addr, streetAddress2: e.target.value } : addr
                          ),
                        }))
                      }
                    />

                    {/* City */}
                    <CustomInput
                      label="City"
                      value={address.city}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          addresses: prev.addresses.map((addr, i) =>
                            i === index ? { ...addr, city: e.target.value } : addr
                          ),
                        }))
                      }
                    />

                    {/* State - only show if the selected country has states */}
                    {(() => {
                      const currentCountry = countries.find((c) => c.code2 === address.countryCode);
                      const availableStates = currentCountry?.states || [];
                      return availableStates.length > 0 ? (
                        <FormControl fullWidth className={styles.dropdownContainer}>
                          <Select
                            value={address.stateCode || ""}
                            onChange={(e) => {
                              const selectedState = availableStates.find((s) => s.code === e.target.value);
                              setFormData((prev) => ({
                                ...prev,
                                addresses: prev.addresses.map((addr, i) =>
                                  i === index
                                    ? {
                                        ...addr,
                                        stateCode: e.target.value,
                                        stateName: selectedState ? selectedState.name : "",
                                      }
                                    : addr
                                ),
                              }));
                            }}
                            displayEmpty
                            sx={{
                              height: "35px",
                              "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: "#747775",
                                borderWidth: "1px",
                              },
                              "&:hover .MuiOutlinedInput-notchedOutline": {
                                borderColor: "black",
                                borderWidth: "1px",
                              },
                              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                borderColor: "#0b57d0",
                                borderWidth: "3px",
                              },
                            }}
                            MenuProps={{
                              anchorOrigin: {
                                vertical: "top",
                                horizontal: "left",
                              },
                              transformOrigin: {
                                vertical: "bottom",
                                horizontal: "left",
                              },
                              PaperProps: {
                                sx: {
                                  backgroundColor: "#f0f4f9",
                                  maxHeight: "400px",
                                  maxWidth: "200px",
                                  "& .MuiMenuItem-root": {
                                    padding: "2px 12px",
                                  },
                                },
                              },
                            }}
                          >
                            {availableStates.map((state) => (
                              <MenuItem key={state.code} value={state.code}>
                                {state.name}
                              </MenuItem>
                            ))}
                          </Select>
                          <Box className={`${styles.dropdownLabel} ${address.stateCode ? styles.floating : ""}`}>
                            State
                          </Box>
                        </FormControl>
                      ) : null;
                    })()}

                    {/* ZIP code and PO Box in a row */}
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "flex-start" }}>
                      <CustomInput
                        label="ZIP code"
                        value={address.zipCode}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            addresses: prev.addresses.map((addr, i) =>
                              i === index ? { ...addr, zipCode: e.target.value } : addr
                            ),
                          }))
                        }
                        sx={{ minWidth: "150px", flex: 1 }}
                      />

                      <CustomInput
                        label="PO Box"
                        value={address.poBox}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            addresses: prev.addresses.map((addr, i) =>
                              i === index ? { ...addr, poBox: e.target.value } : addr
                            ),
                          }))
                        }
                        sx={{ minWidth: "150px", flex: 1 }}
                      />
                    </Box>

                    {/* Label with dropdown */}
                    <LabelDropdown
                      value={address.label}
                      onChange={(value) => {
                        setFormData((prev) => ({
                          ...prev,
                          addresses: prev.addresses.map((addr, i) => (i === index ? { ...addr, label: value } : addr)),
                        }));
                        setFilterStates((prev) => ({
                          ...prev,
                          addressLabels: { ...prev.addressLabels, [index]: value },
                        }));
                        setDropdownStates((prev) => ({
                          ...prev,
                          addressLabels: { ...prev.addressLabels, [index]: true },
                        }));
                      }}
                      onFocus={() =>
                        setDropdownStates((prev) => ({
                          ...prev,
                          addressLabels: { ...prev.addressLabels, [index]: true },
                        }))
                      }
                      onBlur={() => {
                        setTimeout(
                          () =>
                            setDropdownStates((prev) => ({
                              ...prev,
                              addressLabels: { ...prev.addressLabels, [index]: false },
                            })),
                          200
                        );
                      }}
                      options={labelOptions}
                      onLabelSelect={(value) => {
                        setFormData((prev) => ({
                          ...prev,
                          addresses: prev.addresses.map((addr, i) => (i === index ? { ...addr, label: value } : addr)),
                        }));
                        setDropdownStates((prev) => ({
                          ...prev,
                          addressLabels: { ...prev.addressLabels, [index]: false },
                        }));
                        setFilterStates((prev) => ({ ...prev, addressLabels: { ...prev.addressLabels, [index]: "" } }));
                      }}
                      showDropdown={dropdownStates.addressLabels[index]}
                      dropdownClassName={styles.dropdown}
                    />
                  </Box>

                  <CloseButton
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        addresses: prev.addresses.filter((_, i) => i !== index),
                      }))
                    }
                  />
                </Box>
              ))}

              <CustomButton
                startIcon={
                  <span className="material-symbols-outlined" style={{ fontSize: "21px" }}>
                    {formData.addresses.length > 0 ? "add" : "location_on"}
                  </span>
                }
                onClick={() => {
                  const defaultCountry = countries.find((c) => c.code2 === "US");
                  setFormData((prev) => ({
                    ...prev,
                    addresses: [
                      ...prev.addresses,
                      {
                        countryCode: "US",
                        countryName: defaultCountry ? defaultCountry.name : "United States",
                        streetAddress: "",
                        streetAddress2: "",
                        city: "",
                        stateCode: "",
                        stateName: "",
                        zipCode: "",
                        poBox: "",
                        label: "",
                      },
                    ],
                  }));
                }}
              >
                Add address
              </CustomButton>
            </Box>
          </Box>

          {/* Birthday Section */}
          <Box className={styles.birthdaySection}>
            <SectionIcon
              iconName="cake"
              title="Birthday"
              isVisible={Object.values(formData.birthday).length > 0}
              iconStyle={{ marginRight: "15px" }}
            />
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
              {Object.values(formData.birthday).length > 0 ? (
                <Box className={styles.inputGroup}>
                  <Box className={styles.inputFields}>
                    {/* Month, Day, and Year row */}
                    <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
                      {/* Month dropdown */}
                      <FormControl
                        sx={{ width: "40%" }}
                        className={styles.dropdownContainer}
                        error={birthdayError.fields.month}
                      >
                        <Select
                          value={formData.birthday.month}
                          onChange={(e) => {
                            const newBirthday = { ...formData.birthday, month: e.target.value };
                            setFormData((prev) => ({
                              ...prev,
                              birthday: newBirthday,
                            }));
                            // Validate the new birthday data
                            const errors = validateDate(newBirthday.month, newBirthday.day, newBirthday.year);
                            setBirthdayError(errors);
                          }}
                          displayEmpty
                          sx={{
                            height: "35px",
                            "& .MuiOutlinedInput-notchedOutline": {
                              borderColor: birthdayError.fields.month ? "#b3261f" : "#747775",
                              borderWidth: "1px",
                            },
                            "&:hover .MuiOutlinedInput-notchedOutline": {
                              borderColor: birthdayError.fields.month ? "#b3261f" : "black",
                              borderWidth: "1px",
                            },
                            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                              borderColor: birthdayError.fields.month ? "#b3261f" : "#0b57d0",
                              borderWidth: "3px",
                            },
                            "& .MuiPaper-root": {
                              backgroundColor: "#f0f4f9",
                            },
                          }}
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                backgroundColor: "#f0f4f9",
                              },
                            },
                          }}
                        >
                          {monthOptions.map((month) => (
                            <MenuItem key={month} value={month}>
                              {month}
                            </MenuItem>
                          ))}
                        </Select>
                        <Box className={`${styles.dropdownLabel} ${formData.birthday.month ? styles.floating : ""}`}>
                          Month
                        </Box>
                      </FormControl>

                      {/* Day input */}
                      <CustomInput
                        label="Day"
                        value={formData.birthday.day}
                        onChange={(e) => {
                          const newBirthday = { ...formData.birthday, day: e.target.value };
                          setFormData((prev) => ({
                            ...prev,
                            birthday: newBirthday,
                          }));
                          // Validate the new birthday data
                          const errors = validateDate(newBirthday.month, newBirthday.day, newBirthday.year);
                          setBirthdayError(errors);
                        }}
                        placeholder="DD"
                        error={birthdayError.fields.day}
                        sx={{ width: "25%" }}
                      />

                      {/* Year input */}
                      <CustomInput
                        label="Year (optional)"
                        value={formData.birthday.year}
                        onChange={(e) => {
                          const newBirthday = { ...formData.birthday, year: e.target.value };
                          setFormData((prev) => ({
                            ...prev,
                            birthday: newBirthday,
                          }));
                          // Validate the new birthday data
                          const errors = validateDate(newBirthday.month, newBirthday.day, newBirthday.year);
                          setBirthdayError(errors);
                        }}
                        placeholder="YYYY"
                        error={birthdayError.fields.year}
                        sx={{ width: "35%" }}
                      />
                    </Box>
                    <FormHelperText error={birthdayError.fields.year} sx={{ color: "#b3261f", mt: "-10px" }}>
                      {birthdayError.message}
                    </FormHelperText>
                  </Box>

                  <CloseButton
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        birthday: {},
                      }));
                      setBirthdayError({ message: "", fields: { month: false, day: false, year: false } });
                    }}
                  />
                </Box>
              ) : (
                <CustomButton
                  startIcon={
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                      cake
                    </span>
                  }
                  onClick={() => setFormData((prev) => ({ ...prev, birthday: { ...prev.birthday, month: "" } }))}
                >
                  Add birthday
                </CustomButton>
              )}
            </Box>
          </Box>

          {showMoreFields && (
            <Box sx={{ mt: 2 }}>
              {/* Significant Dates Section */}
              <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
                <SectionIcon
                  iconName="event"
                  title="Significant date"
                  isVisible={formData.significantDates.length > 0}
                  iconStyle={{ marginRight: "15px" }}
                />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
                  {formData.significantDates.map((date, index) => (
                    <Box key={`significant-date-${index}`} className={styles.inputGroup}>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
                        {/* Month, Day, and Year row */}
                        <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
                          {/* Month dropdown */}
                          <FormControl
                            sx={{ width: "40%" }}
                            className={styles.dropdownContainer}
                            error={significantDateErrors[index]?.fields?.month}
                          >
                            <Select
                              value={date.month}
                              onChange={(e) => {
                                const newDate = { ...date, month: e.target.value };
                                setFormData((prev) => ({
                                  ...prev,
                                  significantDates: prev.significantDates.map((d, i) => (i === index ? newDate : d)),
                                }));
                                // Validate the new date
                                const errors = validateDate(newDate.month, newDate.day, newDate.year);
                                setSignificantDateErrors((prev) => ({
                                  ...prev,
                                  [index]: errors,
                                }));
                              }}
                              displayEmpty
                              sx={{
                                height: "35px",
                                "& .MuiOutlinedInput-notchedOutline": {
                                  borderColor: significantDateErrors[index]?.fields?.month ? "#b3261f" : "#747775",
                                  borderWidth: "1px",
                                },
                                "&:hover .MuiOutlinedInput-notchedOutline": {
                                  borderColor: significantDateErrors[index]?.fields?.month ? "#b3261f" : "black",
                                  borderWidth: "1px",
                                },
                                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                  borderColor: significantDateErrors[index]?.fields?.month ? "#b3261f" : "#0b57d0",
                                  borderWidth: "3px",
                                },
                                "& .MuiPaper-root": {
                                  backgroundColor: "#f0f4f9",
                                },
                              }}
                              MenuProps={{
                                PaperProps: {
                                  sx: {
                                    backgroundColor: "#f0f4f9",
                                  },
                                },
                              }}
                            >
                              {monthOptions.map((month) => (
                                <MenuItem key={month} value={month}>
                                  {month}
                                </MenuItem>
                              ))}
                            </Select>
                            <Box className={`${styles.dropdownLabel} ${date.month ? styles.floating : ""}`}>Month</Box>
                          </FormControl>

                          {/* Day input */}
                          <CustomInput
                            label="Day"
                            value={date.day}
                            onChange={(e) => {
                              const newDate = { ...date, day: e.target.value };
                              setFormData((prev) => ({
                                ...prev,
                                significantDates: prev.significantDates.map((d, i) => (i === index ? newDate : d)),
                              }));
                              // Validate the new date
                              const errors = validateDate(newDate.month, newDate.day, newDate.year);
                              setSignificantDateErrors((prev) => ({
                                ...prev,
                                [index]: errors,
                              }));
                            }}
                            placeholder="DD"
                            error={significantDateErrors[index]?.fields?.day}
                            sx={{ width: "25%" }}
                          />

                          {/* Year input */}
                          <CustomInput
                            label="Year (optional)"
                            value={date.year}
                            onChange={(e) => {
                              const newDate = { ...date, year: e.target.value };
                              setFormData((prev) => ({
                                ...prev,
                                significantDates: prev.significantDates.map((d, i) => (i === index ? newDate : d)),
                              }));
                              // Validate the new date
                              const errors = validateDate(newDate.month, newDate.day, newDate.year);
                              setSignificantDateErrors((prev) => ({
                                ...prev,
                                [index]: errors,
                              }));
                            }}
                            placeholder="YYYY"
                            error={significantDateErrors[index]?.fields?.year}
                            sx={{ width: "35%" }}
                          />
                        </Box>

                        <FormHelperText
                          error={significantDateErrors[index]?.fields?.year}
                          sx={{ color: "#b3261f", mt: "-10px" }}
                        >
                          {significantDateErrors[index]?.message}
                        </FormHelperText>

                        {/* Label dropdown */}
                        <LabelDropdown
                          value={date.label}
                          onChange={(value) => {
                            setFormData((prev) => ({
                              ...prev,
                              significantDates: prev.significantDates.map((d, i) =>
                                i === index ? { ...d, label: value } : d
                              ),
                            }));
                            setFilterStates((prev) => ({
                              ...prev,
                              significantDateLabels: { ...prev.significantDateLabels, [index]: value },
                            }));
                            setDropdownStates((prev) => ({
                              ...prev,
                              significantDateLabels: { ...prev.significantDateLabels, [index]: true },
                            }));
                          }}
                          onFocus={() =>
                            setDropdownStates((prev) => ({
                              ...prev,
                              significantDateLabels: { ...prev.significantDateLabels, [index]: true },
                            }))
                          }
                          onBlur={() => {
                            setTimeout(
                              () =>
                                setDropdownStates((prev) => ({
                                  ...prev,
                                  significantDateLabels: { ...prev.significantDateLabels, [index]: false },
                                })),
                              200
                            );
                          }}
                          options={significantDateLabelOptions}
                          onLabelSelect={(value) => {
                            setFormData((prev) => ({
                              ...prev,
                              significantDates: prev.significantDates.map((d, i) =>
                                i === index ? { ...d, label: value } : d
                              ),
                            }));
                            setDropdownStates((prev) => ({
                              ...prev,
                              significantDateLabels: { ...prev.significantDateLabels, [index]: false },
                            }));
                            setFilterStates((prev) => ({
                              ...prev,
                              significantDateLabels: { ...prev.significantDateLabels, [index]: "" },
                            }));
                          }}
                          showDropdown={dropdownStates.significantDateLabels[index]}
                          dropdownClassName={styles.dropdown}
                          sx={{ minWidth: "120px", flex: "0 0 auto" }}
                        />
                      </Box>

                      <CloseButton
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            significantDates: prev.significantDates.filter((_, i) => i !== index),
                          }));
                          setSignificantDateErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors[index];
                            return newErrors;
                          });
                        }}
                      />
                    </Box>
                  ))}

                  <CustomButton
                    startIcon={
                      <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                        {formData.significantDates.length > 0 ? "add" : "event"}
                      </span>
                    }
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        significantDates: [...prev.significantDates, { month: "", day: "", year: "", label: "" }],
                      }))
                    }
                  >
                    Add significant date
                  </CustomButton>
                </Box>
              </Box>

              {/* Websites Section */}
              <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
                <SectionIcon
                  iconName="link"
                  title="Website"
                  isVisible={formData.websites.length > 0}
                  iconStyle={{ marginRight: "15px" }}
                />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
                  {formData.websites.map((website, index) => (
                    <Box key={`website-${index}`} className={styles.inputGroup}>
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "flex-start", width: "100%" }}>
                        <CustomInput
                          label="Website"
                          value={website.value}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              websites: prev.websites.map((w, i) =>
                                i === index ? { ...w, value: e.target.value } : w
                              ),
                            }))
                          }
                          type="url"
                          sx={{ minWidth: "200px", flex: 1 }}
                        />
                        {/* Label input - only show when website has content */}
                        {website.value.trim() && (
                          <LabelDropdown
                            value={website.label}
                            onChange={(value) => {
                              setFormData((prev) => ({
                                ...prev,
                                websites: prev.websites.map((w, i) => (i === index ? { ...w, label: value } : w)),
                              }));
                              setFilterStates((prev) => ({
                                ...prev,
                                websiteLabels: { ...prev.websiteLabels, [index]: value },
                              }));
                              setDropdownStates((prev) => ({
                                ...prev,
                                websiteLabels: { ...prev.websiteLabels, [index]: true },
                              }));
                            }}
                            onFocus={() =>
                              setDropdownStates((prev) => ({
                                ...prev,
                                websiteLabels: { ...prev.websiteLabels, [index]: true },
                              }))
                            }
                            onBlur={() => {
                              setTimeout(
                                () =>
                                  setDropdownStates((prev) => ({
                                    ...prev,
                                    websiteLabels: { ...prev.websiteLabels, [index]: false },
                                  })),
                                200
                              );
                            }}
                            options={websiteLabelOptions}
                            onLabelSelect={(value) => {
                              setFormData((prev) => ({
                                ...prev,
                                websites: prev.websites.map((w, i) => (i === index ? { ...w, label: value } : w)),
                              }));
                              setDropdownStates((prev) => ({
                                ...prev,
                                websiteLabels: { ...prev.websiteLabels, [index]: false },
                              }));
                              setFilterStates((prev) => ({
                                ...prev,
                                websiteLabels: { ...prev.websiteLabels, [index]: "" },
                              }));
                            }}
                            showDropdown={dropdownStates.websiteLabels[index]}
                            dropdownClassName={styles.upwardLabelDropdown}
                            sx={{ minWidth: "120px", flex: "0 0 auto" }}
                          />
                        )}
                      </Box>

                      <CloseButton
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            websites: prev.websites.filter((_, i) => i !== index),
                          }))
                        }
                      />
                    </Box>
                  ))}

                  <CustomButton
                    startIcon={
                      <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                        {formData.websites.length > 0 ? "add" : "link"}
                      </span>
                    }
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        websites: [...prev.websites, { value: "", label: "" }],
                      }))
                    }
                  >
                    Add website
                  </CustomButton>
                </Box>
              </Box>

              {/* Related Person Section */}
              <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
                <SectionIcon
                  iconName="group_work"
                  title="Related person"
                  isVisible={formData.relatedPersons.length > 0}
                  iconStyle={{ marginRight: "15px" }}
                />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
                  {formData.relatedPersons.map((person, index) => (
                    <Box key={`related-person-${index}`} className={styles.inputGroup}>
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "flex-start", width: "100%" }}>
                        <CustomInput
                          label="Related person"
                          value={person.value}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              relatedPersons: prev.relatedPersons.map((p, i) =>
                                i === index ? { ...p, value: e.target.value } : p
                              ),
                            }))
                          }
                          placeholder="Related person"
                          sx={{ minWidth: "200px", flex: 1 }}
                        />
                        {/* Label input - only show when person has content */}
                        {person.value.trim() && (
                          <LabelDropdown
                            value={person.label}
                            onChange={(value) => {
                              setFormData((prev) => ({
                                ...prev,
                                relatedPersons: prev.relatedPersons.map((p, i) =>
                                  i === index ? { ...p, label: value } : p
                                ),
                              }));
                              setFilterStates((prev) => ({
                                ...prev,
                                relatedPersonLabels: { ...prev.relatedPersonLabels, [index]: value },
                              }));
                              setDropdownStates((prev) => ({
                                ...prev,
                                relatedPersonLabels: { ...prev.relatedPersonLabels, [index]: true },
                              }));
                            }}
                            onFocus={() =>
                              setDropdownStates((prev) => ({
                                ...prev,
                                relatedPersonLabels: { ...prev.relatedPersonLabels, [index]: true },
                              }))
                            }
                            onBlur={() => {
                              setTimeout(
                                () =>
                                  setDropdownStates((prev) => ({
                                    ...prev,
                                    relatedPersonLabels: { ...prev.relatedPersonLabels, [index]: false },
                                  })),
                                200
                              );
                            }}
                            options={relatedPersonLabelOptions}
                            onLabelSelect={(value) => {
                              setFormData((prev) => ({
                                ...prev,
                                relatedPersons: prev.relatedPersons.map((p, i) =>
                                  i === index ? { ...p, label: value } : p
                                ),
                              }));
                              setDropdownStates((prev) => ({
                                ...prev,
                                relatedPersonLabels: { ...prev.relatedPersonLabels, [index]: false },
                              }));
                              setFilterStates((prev) => ({
                                ...prev,
                                relatedPersonLabels: { ...prev.relatedPersonLabels, [index]: "" },
                              }));
                            }}
                            showDropdown={dropdownStates.relatedPersonLabels[index]}
                            dropdownClassName={styles.upwardLabelDropdown}
                            sx={{ minWidth: "120px", flex: "0 0 auto" }}
                          />
                        )}
                      </Box>

                      <CloseButton
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            relatedPersons: prev.relatedPersons.filter((_, i) => i !== index),
                          }))
                        }
                      />
                    </Box>
                  ))}

                  <CustomButton
                    startIcon={
                      <span className="material-symbols-outlined" style={{ fontSize: "21px" }}>
                        {formData.relatedPersons.length > 0 ? "add" : "group_work"}
                      </span>
                    }
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        relatedPersons: [...prev.relatedPersons, { value: "", label: "" }],
                      }))
                    }
                  >
                    Add related person
                  </CustomButton>
                </Box>
              </Box>

              {/* Custom Field Section */}
              <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
                <SectionIcon
                  iconName="view_agenda"
                  title="Custom field"
                  isVisible={formData.customFields.length > 0}
                  iconStyle={{ marginRight: "15px" }}
                />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
                  {formData.customFields.map((customField, index) => (
                    <Box key={`custom-field-${index}`} className={styles.inputGroup}>
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "flex-start", width: "100%" }}>
                        <CustomInput
                          label="Custom Field"
                          value={customField.value}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              customFields: prev.customFields.map((cf, i) =>
                                i === index ? { ...cf, value: e.target.value } : cf
                              ),
                            }))
                          }
                          placeholder="Custom Field"
                          sx={{ minWidth: "200px", flex: 1 }}
                          fullWidth={false}
                        />
                        {/* Label input - only show when custom field has content */}
                        {customField.value.trim() && (
                          <CustomInput
                            label="Label"
                            value={customField.label}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                customFields: prev.customFields.map((cf, i) =>
                                  i === index ? { ...cf, label: e.target.value } : cf
                                ),
                              }))
                            }
                            placeholder="Label"
                            sx={{ minWidth: "150px", flex: "0 0 auto" }}
                            fullWidth={false}
                          />
                        )}
                      </Box>

                      <CloseButton
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            customFields: prev.customFields.filter((_, i) => i !== index),
                          }))
                        }
                      />
                    </Box>
                  ))}

                  <CustomButton
                    startIcon={
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: formData.customFields.length > 0 ? "21px" : "20px" }}
                      >
                        {formData.customFields.length > 0 ? "add" : "view_agenda"}
                      </span>
                    }
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        customFields: [...prev.customFields, { value: "", label: "" }],
                      }))
                    }
                  >
                    Add custom field
                  </CustomButton>
                </Box>
              </Box>
            </Box>
          )}

          {/* Notes Section */}
          <Box className={styles.notesSection}>
            <SectionIcon
              iconName="draft"
              title="Notes"
              isVisible={displayNotes}
              iconStyle={{ transform: "scaleX(-1) rotate(-90deg)", marginRight: "15px" }}
            />
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
              {displayNotes ? (
                <Box className={styles.inputGroup}>
                  <Box className={styles.inputFields}>
                    <TextField
                      multiline
                      minRows={2}
                      maxRows={10}
                      variant="outlined"
                      value={formData.notes}
                      onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                      label="Notes"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": {
                            borderColor: "#747775",
                          },
                          "&:hover fieldset": {
                            borderColor: "black",
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: "#0b57d0",
                            borderWidth: "3px",
                          },
                        },
                      }}
                    />
                  </Box>

                  <CloseButton
                    onClick={() => {
                      setDisplayNotes(false);
                      setFormData((prev) => ({ ...prev, notes: "" }));
                    }}
                  />
                </Box>
              ) : (
                <CustomButton
                  startIcon={
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "20px", transform: "scaleX(-1) rotate(-90deg)" }}
                    >
                      draft
                    </span>
                  }
                  onClick={() => setDisplayNotes(true)}
                >
                  Add notes
                </CustomButton>
              )}
            </Box>
          </Box>

          {/* Show more/less fields */}
          <Button
            variant="text"
            onClick={() => setShowMoreFields((prev) => !prev)}
            sx={{
              fontSize: "0.875rem",
              fontWeight: 500,
              textTransform: "none",
              alignSelf: "flex-start",
              mt: 1,
              borderRadius: "50px",
              py: 1,
              px: "10px",
              "&:hover": {
                backgroundColor: "rgba(11, 87, 208, 0.08)",
              },
            }}
          >
            {showMoreFields ? "Show less" : "Show more"}
          </Button>

          {/* Labels Dropdown Menu */}
          <LabelsDropdown
            anchorEl={labelsMenuAnchor}
            open={Boolean(labelsMenuAnchor)}
            onClose={handleLabelsMenuClose}
            recipientLabels={recipientLabels}
            tempLabels={tempLabels}
            onLabelToggle={handleLabelToggle}
            onApply={handleApplyLabels}
            hasChanged={hasLabelsChanged()}
          />

          {/* Unsaved Changes Modal */}
          <InfoModal
            isOpen={showUnsavedModal}
            onClose={() => setShowUnsavedModal(false)}
            title="You have unsaved changes"
            message="Are you sure you want to discard your unsaved changes?"
            buttons={[
              {
                text: "Cancel",
                className: "tertiary",
                onClick: () => setShowUnsavedModal(false),
              },
              {
                text: "Discard",
                className: "tertiary",
                onClick: handleModalDiscard,
              },
            ]}
            modalBoxStyle={{
              width: 360,
              backgroundColor: "#e9eef6",
              borderRadius: "28px",
              px: 3.5,
            }}
            titleStyle={{
              fontSize: "1.5rem",
              fontWeight: 400,
              lineHeight: "2rem",
              color: "#1f1f1f",
            }}
            messageStyle={{
              fontSize: "0.875rem",
              fontWeight: 400,
              lineHeight: "1.25rem",
              color: "#4d504e",
              mt: 2,
            }}
            buttonContainerStyle={{
              gap: 0.5,
              mt: 2.5,
            }}
            buttonStyle={{
              fontSize: "0.875rem",
              fontWeight: 400,
              textTransform: "none",
              color: "#0b57d0",
              borderRadius: "50px",
              px: 1.5,
              py: 1,
              "&:hover": {
                backgroundColor: "rgba(11, 87, 208, 0.08)",
              },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default CreateContactPage;
