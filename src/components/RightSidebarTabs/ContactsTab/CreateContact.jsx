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
import { Link } from "react-router-dom";
import {
  CustomInput,
  CustomButton,
  SectionIcon,
  CloseButton,
  LabelDropdown,
  ActionIconButton,
  LabelsDropdown,
} from "./ContactComponents";
import ScopedInfoModal from "../../common/ScopedInfoModal";
import countryCode from "../../../utils/countryCode.json";
import countries from "../../../utils/countries.json";
import { generateNextIntegerId, isValidEmail } from "../../../utils/helperFunctions";
import { useGlobalContext } from "../../../contexts/GlobalContext";
import styles from "./CreateContact.module.css";

// Style of snackbar in this screen
const snackbarStyle = {
  left: "auto !important",
  right: "60px !important",
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

const CreateContact = ({ onClose, onTabClose }) => {
  const {
    recipients,
    setRecipients,
    setSnackbar,
    rightSidebarActiveTab,
    setRightSidebarActiveTab,
    emails,
    recipientLabels,
    hiddenRecipients,
    deletedRecipients,
  } = useGlobalContext();

  // Check if contact to update is present in recipients or create a custom contact if it is a valid email in case of edit contact
  const contactToUpdate = useMemo(() => {
    if (rightSidebarActiveTab.contact.screen === "EDIT_CONTACT" && rightSidebarActiveTab.contact.contactId) {
      const contactId = rightSidebarActiveTab.contact.contactId;
      let found = recipients.find((recipient) => recipient.id === contactId);

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
  }, [rightSidebarActiveTab.contact.screen, rightSidebarActiveTab.contact.contactId, recipients, emails]);

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

  // Clear timeout on unmount
  useEffect(
    () => () => {
      saveTimeout.current && clearTimeout(saveTimeout.current);
    },
    []
  );

  // Handle form input changes for basic fields
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle email input changes for specific email index
  const handleEmailChange = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      emails: prev.emails.map((email, i) => (i === index ? { ...email, value } : email)),
    }));
  };

  // Handle email label changes for specific email index
  const handleEmailLabelChange = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      emails: prev.emails.map((email, i) => (i === index ? { ...email, label: value } : email)),
    }));
  };

  // Handle email label dropdown selection
  const handleEmailLabelSelect = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      emails: prev.emails.map((email, i) => (i === index ? { ...email, label: value } : email)),
    }));
    setDropdownStates((prev) => ({ ...prev, emailLabels: { ...prev.emailLabels, [index]: false } }));
    setFilterStates((prev) => ({ ...prev, emailLabels: { ...prev.emailLabels, [index]: "" } }));
  };

  // Add a new email input field
  const addEmail = () => {
    setFormData((prev) => ({
      ...prev,
      emails: [...prev.emails, { value: "", label: "" }],
    }));
  };

  // Remove email input field
  const removeEmail = (index) => {
    setFormData((prev) => ({
      ...prev,
      emails: prev.emails.filter((_, i) => i !== index),
    }));
  };

  // Handle phone input changes for specific phone index and field
  const handlePhoneChange = (index, field, value) => {
    setFormData((prev) => {
      const newPhones = [...prev.phones];
      newPhones[index] = { ...newPhones[index], [field]: value };

      // If country code changes, update the dial code as well
      if (field === "countryCode") {
        const country = countryCode.find((c) => c.code === value);
        newPhones[index].dialCode = country?.dial_code || "+1";
      }

      return { ...prev, phones: newPhones };
    });
  };

  // Handle phone label changes for specific phone index
  const handlePhoneLabelChange = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      phones: prev.phones.map((phone, i) => (i === index ? { ...phone, label: value } : phone)),
    }));
  };

  // Handle phone label dropdown selection
  const handlePhoneLabelSelect = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      phones: prev.phones.map((phone, i) => (i === index ? { ...phone, label: value } : phone)),
    }));
    setDropdownStates((prev) => ({ ...prev, phoneLabels: { ...prev.phoneLabels, [index]: false } }));
    setFilterStates((prev) => ({ ...prev, phoneLabels: { ...prev.phoneLabels, [index]: "" } }));
  };

  // Handle significant date label dropdown selection
  const handleSignificantDateLabelSelect = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      significantDates: prev.significantDates.map((date, i) => (i === index ? { ...date, label: value } : date)),
    }));
    setDropdownStates((prev) => ({
      ...prev,
      significantDateLabels: { ...prev.significantDateLabels, [index]: false },
    }));
    setFilterStates((prev) => ({ ...prev, significantDateLabels: { ...prev.significantDateLabels, [index]: "" } }));
  };

  // Handle website label dropdown selection
  const handleWebsiteLabelSelect = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      websites: prev.websites.map((website, i) => (i === index ? { ...website, label: value } : website)),
    }));
    setDropdownStates((prev) => ({ ...prev, websiteLabels: { ...prev.websiteLabels, [index]: false } }));
    setFilterStates((prev) => ({ ...prev, websiteLabels: { ...prev.websiteLabels, [index]: "" } }));
  };

  // Generic field change handler
  const handleFieldChange = (fieldType, index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldType]: prev[fieldType].map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  // Generic add handler
  const addField = (fieldType) => {
    const defaultValues = {
      emails: { value: "", label: "" },
      phones: { countryCode: "US", dialCode: "+1", value: "", label: "" },
      addresses: {
        countryCode: "",
        countryName: "",
        stateCode: "",
        stateName: "",
        streetAddress: "",
        streetAddress2: "",
        city: "",
        zipCode: "",
        poBox: "",
        label: "",
      },
      significantDates: { month: "", day: "", year: "", label: "" },
      websites: { value: "", label: "" },
      relatedPersons: { value: "", label: "" },
      customFields: { value: "", label: "" },
    };

    setFormData((prev) => ({
      ...prev,
      [fieldType]: [...prev[fieldType], defaultValues[fieldType]],
    }));
  };

  // Generic remove handler
  const removeField = (fieldType, index) => {
    setFormData((prev) => ({
      ...prev,
      [fieldType]: prev[fieldType].filter((_, i) => i !== index),
    }));

    // Clean up dropdown states for fields that have them
    const dropdownFields = ["emails", "phones", "addresses", "significantDates", "websites", "relatedPersons"];
    if (dropdownFields.includes(fieldType)) {
      const dropdownKey = `${fieldType.slice(0, -1)}Labels`; // Remove 's' and add 'Labels'
      setDropdownStates((prev) => ({
        ...prev,
        [dropdownKey]: { ...prev[dropdownKey], [index]: false },
      }));
    }
  };

  // Generic label select handler
  const handleLabelSelect = (fieldType, index, value) => {
    const fieldName = fieldType.slice(0, -1); // Remove 's' from fieldType
    setFormData((prev) => ({
      ...prev,
      [fieldType]: prev[fieldType].map((item, i) => (i === index ? { ...item, label: value } : item)),
    }));

    const dropdownKey = `${fieldName}Labels`;
    setDropdownStates((prev) => ({
      ...prev,
      [dropdownKey]: { ...prev[dropdownKey], [index]: false },
    }));
    setFilterStates((prev) => ({ ...prev, [dropdownKey]: { ...prev[dropdownKey], [index]: "" } }));
  };

  // Handle back button click
  const handleBackClick = () => {
    if (hasFieldChange()) {
      setShowUnsavedModal(true);
    } else {
      onClose();
    }
  };

  // Handle modal discard
  const handleModalDiscard = () => {
    setShowUnsavedModal(false);
    onClose();
  };

  // Handle address field changes for specific address index
  const handleAddressChange = (index, field, value) => {
    setFormData((prev) => {
      const newAddresses = [...prev.addresses];
      newAddresses[index][field] = value;

      // If country changes, update country name and reset state
      if (field === "countryCode") {
        const selectedCountry = countries.find((c) => c.code2 === value);
        newAddresses[index].countryName = selectedCountry ? selectedCountry.name : "";
        newAddresses[index].stateCode = "";
        newAddresses[index].stateName = "";
      }

      // If state changes, update state name
      if (field === "stateCode") {
        const availableStates = getAvailableStates(index);
        const selectedState = availableStates.find((s) => s.code === value);
        newAddresses[index].stateName = selectedState ? selectedState.name : "";
      }

      return { ...prev, addresses: newAddresses };
    });
  };

  // Add a new address input field
  const addAddress = () => {
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
  };

  // Remove address input field
  const removeAddress = (index) => {
    setFormData((prev) => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index),
    }));
  };

  // Get days in month helper function
  const getDaysInMonth = (month, year) => {
    const monthNum = monthOptions.indexOf(month) + 1;
    const yearNum = year ? parseInt(year) : new Date().getFullYear();
    return new Date(yearNum, monthNum, 0).getDate();
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

  // Handle birthday field changes
  const handleBirthdayChange = (field, value) => {
    const newBirthday = { ...formData.birthday, [field]: value };
    setFormData((prev) => ({
      ...prev,
      birthday: newBirthday,
    }));

    // Validate the new birthday data
    const errors = validateDate(newBirthday.month, newBirthday.day, newBirthday.year);
    setBirthdayError(errors);
  };

  // Remove birthday
  const removeBirthday = () => {
    setFormData((prev) => ({
      ...prev,
      birthday: {},
    }));
    setBirthdayError({ message: "", fields: { month: false, day: false, year: false } });
  };

  // Handle notes change
  const handleNotesChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      notes: value,
    }));
  };

  // Remove notes
  const removeNotes = () => {
    setDisplayNotes(false);
    setFormData((prev) => ({
      ...prev,
      notes: "",
    }));
  };

  // Handle significant date changes
  const handleSignificantDateChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      significantDates: prev.significantDates.map((date, i) => (i === index ? { ...date, [field]: value } : date)),
    }));

    if (field === "month" || field === "day" || field === "year") {
      const updatedDate = { ...formData.significantDates[index], [field]: value };
      const errors = validateDate(updatedDate.month, updatedDate.day, updatedDate.year);
      setSignificantDateErrors((prev) => ({
        ...prev,
        [index]: errors,
      }));
    }
  };

  // Add significant date
  const addSignificantDate = () => {
    setFormData((prev) => ({
      ...prev,
      significantDates: [...prev.significantDates, { month: "", day: "", year: "", label: "" }],
    }));
  };

  // Remove significant date
  const removeSignificantDate = (index) => {
    setFormData((prev) => ({
      ...prev,
      significantDates: prev.significantDates.filter((_, i) => i !== index),
    }));
    setSignificantDateErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
  };

  // Handle website changes
  const handleWebsiteChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      websites: prev.websites.map((website, i) => (i === index ? { ...website, [field]: value } : website)),
    }));
  };

  // Add website
  const addWebsite = () => {
    setFormData((prev) => ({
      ...prev,
      websites: [...prev.websites, { value: "", label: "" }],
    }));
  };

  // Remove website
  const removeWebsite = (index) => {
    setFormData((prev) => ({
      ...prev,
      websites: prev.websites.filter((_, i) => i !== index),
    }));
  };

  // Get current country object for specific address
  const getCurrentCountry = (index) => {
    return countries.find((c) => c.code2 === formData.addresses[index]?.countryCode);
  };

  // Get available states for specific address
  const getAvailableStates = (index) => {
    const currentCountry = getCurrentCountry(index);
    return currentCountry?.states || [];
  };

  // Label options
  const labelOptions = ["Home", "Work", "Other"];
  const emailLabelOptions = ["Home", "Work", "Other"];
  const phoneLabelOptions = ["Home", "Work", "Other", "Mobile", "Main", "Home Fax", "Work Fax", "MailG Voice", "Pager"];
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

  const getFilteredLabelOptions = (index) => {
    const filter = filterStates.addressLabels[index] || "";
    return labelOptions.filter((option) => option.toLowerCase().includes(filter.toLowerCase()));
  };

  const getFilteredEmailLabelOptions = (index) => {
    const filter = filterStates.emailLabels[index] || "";
    return emailLabelOptions.filter((option) => option.toLowerCase().includes(filter.toLowerCase()));
  };

  const getFilteredPhoneLabelOptions = (index) => {
    const filter = filterStates.phoneLabels[index] || "";
    return phoneLabelOptions.filter((option) => option.toLowerCase().includes(filter.toLowerCase()));
  };

  const getFilteredSignificantDateLabelOptions = (index) => {
    const filter = filterStates.significantDateLabels[index] || "";
    return significantDateLabelOptions.filter((option) => option.toLowerCase().includes(filter.toLowerCase()));
  };

  const getFilteredWebsiteLabelOptions = (index) => {
    const filter = filterStates.websiteLabels[index] || "";
    return websiteLabelOptions.filter((option) => option.toLowerCase().includes(filter.toLowerCase()));
  };

  const getFilteredRelatedPersonLabelOptions = (index) => {
    const filter = filterStates.relatedPersonLabels[index] || "";
    return relatedPersonLabelOptions.filter((option) => option.toLowerCase().includes(filter.toLowerCase()));
  };

  // Add a new phone input field
  const addPhone = () => {
    setFormData((prev) => ({
      ...prev,
      phones: [...prev.phones, { countryCode: "US", dialCode: "+1", value: "", label: "" }],
    }));
  };

  // Remove phone input field
  const removePhone = (index) => {
    setFormData((prev) => ({
      ...prev,
      phones: prev.phones.filter((_, i) => i !== index),
    }));
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

    // Go back to the contacts screen in case of create contact
    if (originalContact.current.type === "CREATE") {
      setRightSidebarActiveTab((prev) => ({ ...prev, contact: { screen: "CONTACTS" } }));
    } else if (originalContact.current.type === "EDIT" && originalContact.current.contact?.isCustomContact) {
      // Reset the contact id to the original contact id
      setRightSidebarActiveTab((prev) => ({
        ...prev,
        contact: { screen: "CONTACT_DETAILS", contactId: originalContact.current.contact.id },
      }));
    }
  };

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

  // Get the label id
  const getLabelId = (label) => recipientLabels.find((l) => l.label === label)?.id;

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
        setRightSidebarActiveTab((prev) => ({
          ...prev,
          contact: { screen: "CONTACT_DETAILS", contactId: contact.id },
        }));

        // Display snackbar notification indicating contact created
        setSnackbar({
          open: true,
          message: contactToUpdate ? "Contact details saved" : "New contact created",
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

  return (
    <Box sx={{ overflow: "hidden", height: "calc(100vh - 130px)", position: "relative" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1,
          position: "fixed",
          backgroundColor: "white",
          zIndex: 2,
          width: "288px",
        }}
      >
        {/* Back */}
        <ActionIconButton iconName="arrow_back" title="Back" onClick={handleBackClick} disabled={disableHeader} />

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

          {/* Close */}
          <ActionIconButton
            iconName="close"
            title="Close"
            onClick={onTabClose}
            iconSize={22}
            disabled={disableHeader}
          />
        </Box>
      </Box>

      {/* Scrollable Content */}
      <Box sx={{ overflowY: "auto", py: 2, px: 1, mt: 7, height: "calc(100vh - 218px)" }}>
        {/* Profile Picture */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: recipientLabels?.length > 0 ? 2 : 3 }}>
          <Avatar
            sx={{
              width: "88px",
              height: "88px",
              bgcolor: "#e8f0fe",
              color: "#d2e3fc",
              fontSize: "110px",
            }}
          >
            <span className="material-symbols-filled" style={{ marginTop: "15px" }}>
              person
            </span>
          </Avatar>
        </Box>

        {/* Labels Section - only show if recipientLabels is not empty */}
        {recipientLabels && recipientLabels.length > 0 && (
          <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2.5 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
              {formData.labels.length > 0 ? (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
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
                      <Link sx={{ textDecoration: "none" }} to={`/contacts/label/${getLabelId(label)}`} target="_blank">
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
                <Box sx={{ display: "flex", justifyContent: "center" }}>
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
        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2.5 }}>
          <SectionIcon iconName="person" title="Name" />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
            {/* Prefix */}
            {showPrefix && (
              <CustomInput
                label="Prefix"
                value={formData.prefix}
                onChange={(e) => handleInputChange("prefix", e.target.value)}
              />
            )}
            {/* First name */}
            <CustomInput
              label="First name"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
            />

            {/* Last name */}
            <CustomInput
              label="Last name"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
            />

            {/* Additional fields when expanded */}
            {showPrefix && (
              <>
                {/* Suffix */}
                <CustomInput
                  label="Suffix"
                  value={formData.suffix}
                  onChange={(e) => handleInputChange("suffix", e.target.value)}
                />

                {/* Phonetic first */}
                <CustomInput
                  label="Phonetic first"
                  value={formData.phoneticFirst}
                  onChange={(e) => handleInputChange("phoneticFirst", e.target.value)}
                />

                {/* Phonetic middle */}
                <CustomInput
                  label="Phonetic middle"
                  value={formData.phoneticMiddle}
                  onChange={(e) => handleInputChange("phoneticMiddle", e.target.value)}
                />

                {/* Phonetic last */}
                <CustomInput
                  label="Phonetic last"
                  value={formData.phoneticLast}
                  onChange={(e) => handleInputChange("phoneticLast", e.target.value)}
                />

                {/* Nickname */}
                <CustomInput
                  label="Nickname"
                  value={formData.nickname}
                  onChange={(e) => handleInputChange("nickname", e.target.value)}
                />

                {/* File as */}
                <CustomInput
                  label="File as"
                  value={formData.fileAs}
                  onChange={(e) => handleInputChange("fileAs", e.target.value)}
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
          <SectionIcon iconName="domain" title="Organization" />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
            {/* Company */}
            <CustomInput
              label="Company"
              value={formData.company}
              onChange={(e) => handleInputChange("company", e.target.value)}
            />

            {/* Job title */}
            <CustomInput
              label="Job title"
              value={formData.jobTitle}
              onChange={(e) => handleInputChange("jobTitle", e.target.value)}
            />

            {/* Department */}
            {showDepartment && (
              <CustomInput
                label="Department"
                value={formData.department}
                onChange={(e) => handleInputChange("department", e.target.value)}
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
          <SectionIcon iconName="mail" title="Email" isVisible={formData.emails.length > 0} />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
            {formData.emails.map((email, index) => (
              <Box key={`email-${index}`} className={styles.inputGroup}>
                <Box className={styles.inputFields}>
                  <CustomInput
                    label="Email"
                    value={email.value}
                    onChange={(e) => handleEmailChange(index, e.target.value)}
                    type="email"
                  />
                  {/* Label input - only show when email has content */}
                  {email.value.trim() && (
                    <LabelDropdown
                      value={email.label}
                      onChange={(value) => {
                        handleEmailLabelChange(index, value);
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
                      options={getFilteredEmailLabelOptions(index)}
                      onLabelSelect={(value) => handleEmailLabelSelect(index, value)}
                      showDropdown={dropdownStates.emailLabels[index]}
                      dropdownClassName={styles.dropdown}
                    />
                  )}
                </Box>
                <CloseButton onClick={() => removeEmail(index)} />
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
              onClick={addEmail}
            >
              Add email
            </CustomButton>
          </Box>
        </Box>

        {/* Phone Section */}
        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2, mt: formData.phones.length > 0 ? "18px" : 0 }}>
          <SectionIcon iconName="call" title="Phone" isVisible={formData.phones.length > 0} iconType="filled" />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
            {formData.phones.map((phone, index) => (
              <Box key={`phone-${index}`} className={styles.inputGroup}>
                <Box className={styles.inputFields}>
                  <Box className={styles.phoneInputRow}>
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
                        onChange={(e) => handlePhoneChange(index, "countryCode", e.target.value)}
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
                              "&::-webkit-scrollbar": {
                                display: "none",
                              },
                              scrollbarWidth: "none",
                              msOverflowStyle: "none",
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
                      onChange={(e) => handlePhoneChange(index, "value", e.target.value)}
                      type="tel"
                    />
                  </Box>
                  {/* Label input - only show when phone has content */}
                  {phone.value.trim() && (
                    <LabelDropdown
                      value={phone.label}
                      onChange={(value) => {
                        handlePhoneLabelChange(index, value);
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
                      options={getFilteredPhoneLabelOptions(index)}
                      onLabelSelect={(value) => handlePhoneLabelSelect(index, value)}
                      showDropdown={dropdownStates.phoneLabels[index]}
                      dropdownClassName={styles.upwardLabelDropdown}
                    />
                  )}
                </Box>

                <CloseButton onClick={() => removePhone(index)} />
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
              onClick={addPhone}
            >
              Add phone
            </CustomButton>
          </Box>
        </Box>

        {/* Address Section */}
        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2, mt: formData.addresses.length > 0 ? "18px" : 0 }}>
          <SectionIcon iconName="location_on" title="Address" isVisible={formData.addresses.length > 0} />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
            {formData.addresses.map((address, index) => (
              <Box key={`address-${index}`} className={styles.inputGroup}>
                <Box className={styles.inputFields}>
                  {/* Country/Region */}
                  <FormControl fullWidth className={styles.dropdownContainer}>
                    <Select
                      value={address.countryCode || ""}
                      onChange={(e) => handleAddressChange(index, "countryCode", e.target.value)}
                      displayEmpty
                      sx={{
                        height: "35px",
                        maxWidth: "200px",
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
                    onChange={(e) => handleAddressChange(index, "streetAddress", e.target.value)}
                  />

                  {/* Street address line 2 */}
                  <CustomInput
                    label="Street address line 2"
                    value={address.streetAddress2}
                    onChange={(e) => handleAddressChange(index, "streetAddress2", e.target.value)}
                  />

                  {/* City */}
                  <CustomInput
                    label="City"
                    value={address.city}
                    onChange={(e) => handleAddressChange(index, "city", e.target.value)}
                  />

                  {/* State - only show if the selected country has states */}
                  {getAvailableStates(index).length > 0 && (
                    <FormControl fullWidth className={styles.dropdownContainer}>
                      <Select
                        value={address.stateCode || ""}
                        onChange={(e) => handleAddressChange(index, "stateCode", e.target.value)}
                        displayEmpty
                        sx={{
                          height: "35px",
                          maxWidth: "200px",
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
                        {getAvailableStates(index).map((state) => (
                          <MenuItem key={state.code} value={state.code}>
                            {state.name}
                          </MenuItem>
                        ))}
                      </Select>
                      <Box className={`${styles.dropdownLabel} ${address.stateCode ? styles.floating : ""}`}>State</Box>
                    </FormControl>
                  )}

                  {/* ZIP code */}
                  <CustomInput
                    label="ZIP code"
                    value={address.zipCode}
                    onChange={(e) => handleAddressChange(index, "zipCode", e.target.value)}
                  />

                  {/* PO Box */}
                  <CustomInput
                    label="PO Box"
                    value={address.poBox}
                    onChange={(e) => handleAddressChange(index, "poBox", e.target.value)}
                  />

                  {/* Label with dropdown */}
                  <LabelDropdown
                    value={address.label}
                    onChange={(value) => {
                      handleAddressChange(index, "label", value);
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
                    options={getFilteredLabelOptions(index)}
                    onLabelSelect={(value) => handleLabelSelect("addresses", index, value)}
                    showDropdown={dropdownStates.addressLabels[index]}
                    dropdownClassName={styles.dropdown}
                  />
                </Box>

                <CloseButton onClick={() => removeAddress(index)} />
              </Box>
            ))}

            <CustomButton
              startIcon={
                <span className="material-symbols-outlined" style={{ fontSize: "21px" }}>
                  {formData.addresses.length > 0 ? "add" : "location_on"}
                </span>
              }
              onClick={addAddress}
            >
              Add address
            </CustomButton>
          </Box>
        </Box>

        {/* Birthday Section */}
        <Box className={styles.birthdaySection}>
          <SectionIcon iconName="cake" title="Birthday" isVisible={Object.values(formData.birthday).length > 0} />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
            {Object.values(formData.birthday).length > 0 ? (
              <Box className={styles.inputGroup}>
                <Box className={styles.inputFields}>
                  {/* Month and Day row */}
                  <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
                    {/* Month dropdown */}
                    <FormControl
                      sx={{ width: "60%" }}
                      className={styles.dropdownContainer}
                      error={birthdayError.fields.month}
                    >
                      <Select
                        value={formData.birthday.month}
                        onChange={(e) => handleBirthdayChange("month", e.target.value)}
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
                      onChange={(e) => handleBirthdayChange("day", e.target.value)}
                      placeholder="DD"
                      error={birthdayError.fields.day}
                      sx={{ width: "40%" }}
                    />
                  </Box>

                  {/* Year input */}
                  <CustomInput
                    label="Year (optional)"
                    value={formData.birthday.year}
                    onChange={(e) => handleBirthdayChange("year", e.target.value)}
                    placeholder="YYYY"
                    error={birthdayError.fields.year}
                  />
                  <FormHelperText error={birthdayError.fields.year} sx={{ color: "#b3261f", mt: "-10px" }}>
                    {birthdayError.message}
                  </FormHelperText>
                </Box>

                <CloseButton onClick={removeBirthday} />
              </Box>
            ) : (
              <CustomButton
                startIcon={
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                    cake
                  </span>
                }
                onClick={() => handleBirthdayChange("month", "")}
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
              <SectionIcon iconName="event" title="Significant date" isVisible={formData.significantDates.length > 0} />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
                {formData.significantDates.map((date, index) => (
                  <Box key={`significant-date-${index}`} className={styles.inputGroup}>
                    <Box className={styles.inputFields}>
                      {/* Month and Day row */}
                      <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
                        {/* Month dropdown */}
                        <FormControl
                          sx={{ width: "60%" }}
                          className={styles.dropdownContainer}
                          error={significantDateErrors[index]?.fields?.month}
                        >
                          <Select
                            value={date.month}
                            onChange={(e) => handleSignificantDateChange(index, "month", e.target.value)}
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
                          onChange={(e) => handleSignificantDateChange(index, "day", e.target.value)}
                          placeholder="DD"
                          error={significantDateErrors[index]?.fields?.day}
                          sx={{ width: "40%" }}
                        />
                      </Box>

                      {/* Year input */}
                      <CustomInput
                        label="Year (optional)"
                        value={date.year}
                        onChange={(e) => handleSignificantDateChange(index, "year", e.target.value)}
                        placeholder="YYYY"
                        error={significantDateErrors[index]?.fields?.year}
                      />
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
                          handleSignificantDateChange(index, "label", value);
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
                        options={getFilteredSignificantDateLabelOptions(index)}
                        onLabelSelect={(value) => handleSignificantDateLabelSelect(index, value)}
                        showDropdown={dropdownStates.significantDateLabels[index]}
                        dropdownClassName={styles.dropdown}
                      />
                    </Box>

                    <CloseButton onClick={() => removeSignificantDate(index)} />
                  </Box>
                ))}

                <CustomButton
                  startIcon={
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                      {formData.significantDates.length > 0 ? "add" : "event"}
                    </span>
                  }
                  onClick={addSignificantDate}
                >
                  Add significant date
                </CustomButton>
              </Box>
            </Box>

            {/* Websites Section */}
            <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
              <SectionIcon iconName="link" title="Website" isVisible={formData.websites.length > 0} />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
                {formData.websites.map((website, index) => (
                  <Box key={`website-${index}`} className={styles.inputGroup}>
                    <Box className={styles.inputFields}>
                      <CustomInput
                        label="Website"
                        value={website.value}
                        onChange={(e) => handleWebsiteChange(index, "value", e.target.value)}
                        type="url"
                      />
                      {/* Label input - only show when website has content */}
                      {website.value.trim() && (
                        <LabelDropdown
                          value={website.label}
                          onChange={(value) => {
                            handleWebsiteChange(index, "label", value);
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
                          options={getFilteredWebsiteLabelOptions(index)}
                          onLabelSelect={(value) => handleWebsiteLabelSelect(index, value)}
                          showDropdown={dropdownStates.websiteLabels[index]}
                          dropdownClassName={styles.upwardLabelDropdown}
                        />
                      )}
                    </Box>

                    <CloseButton onClick={() => removeWebsite(index)} />
                  </Box>
                ))}

                <CustomButton
                  startIcon={
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                      {formData.websites.length > 0 ? "add" : "link"}
                    </span>
                  }
                  onClick={addWebsite}
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
              />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
                {formData.relatedPersons.map((person, index) => (
                  <Box key={`related-person-${index}`} className={styles.inputGroup}>
                    <Box className={styles.inputFields}>
                      <CustomInput
                        label="Related person"
                        value={person.value}
                        onChange={(e) => handleFieldChange("relatedPersons", index, "value", e.target.value)}
                        placeholder="Related person"
                      />
                      {person.value.trim() && (
                        <LabelDropdown
                          value={person.label}
                          onChange={(value) => {
                            handleFieldChange("relatedPersons", index, "label", value);
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
                          options={getFilteredRelatedPersonLabelOptions(index)}
                          onLabelSelect={(value) => handleLabelSelect("relatedPersons", index, value)}
                          showDropdown={dropdownStates.relatedPersonLabels[index]}
                          dropdownClassName={styles.upwardLabelDropdown}
                        />
                      )}
                    </Box>
                    <CloseButton onClick={() => removeField("relatedPersons", index)} />
                  </Box>
                ))}

                <CustomButton
                  startIcon={
                    <span className="material-symbols-outlined" style={{ fontSize: "21px" }}>
                      {formData.relatedPersons.length > 0 ? "add" : "group_work"}
                    </span>
                  }
                  onClick={() => addField("relatedPersons")}
                >
                  Add related person
                </CustomButton>
              </Box>
            </Box>

            {/* Custom Field Section */}
            <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2 }}>
              <SectionIcon iconName="view_agenda" title="Custom field" isVisible={formData.customFields.length > 0} />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
                {formData.customFields.map((customField, index) => (
                  <Box key={`custom-field-${index}`} className={styles.inputGroup}>
                    <Box className={styles.inputFields}>
                      <CustomInput
                        label="Custom Field"
                        value={customField.value}
                        onChange={(e) => handleFieldChange("customFields", index, "value", e.target.value)}
                        placeholder="Custom Field"
                      />
                      {customField.value.trim() && (
                        <CustomInput
                          label="Label"
                          value={customField.label}
                          onChange={(e) => handleFieldChange("customFields", index, "label", e.target.value)}
                          placeholder="Label"
                        />
                      )}
                    </Box>
                    <CloseButton onClick={() => removeField("customFields", index)} />
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
                  onClick={() => addField("customFields")}
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
            iconStyle={{ transform: "scaleX(-1) rotate(-90deg)" }}
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
                    onChange={(e) => handleNotesChange(e.target.value)}
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

                <CloseButton onClick={removeNotes} />
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
      </Box>

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
      <ScopedInfoModal
        open={showUnsavedModal}
        onClose={() => setShowUnsavedModal(false)}
        title="You have unsaved changes"
        description="Are you sure you want to discard your unsaved changes?"
        primaryButtonText="Discard"
        secondaryButtonText="Cancel"
        onPrimaryAction={handleModalDiscard}
      />
    </Box>
  );
};

export default CreateContact;
