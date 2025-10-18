/**
 * Utility functions for exporting contacts in different formats
 */

/**
 * Generate Google CSV format for contacts
 * @param {Array} contacts - Array of contact objects
 * @returns {string} CSV content
 */
export const generateGoogleCSV = (contacts) => {
  const headers = [
    "First Name",
    "Middle Name",
    "Last Name",
    "Phonetic First Name",
    "Phonetic Middle Name",
    "Phonetic Last Name",
    "Name Prefix",
    "Name Suffix",
    "Nickname",
    "File As",
    "Organization Name",
    "Organization Title",
    "Organization Department",
    "Birthday",
    "Notes",
    "Photo",
    "Labels",
    "E-mail 1 - Label",
    "E-mail 1 - Value",
    "Phone 1 - Label",
    "Phone 1 - Value",
  ];

  const rows = contacts.map((contact) => {
    const firstName = contact.firstName || "";
    const lastName = contact.lastName || "";
    const middleName = "";
    const phoneticFirstName = "";
    const phoneticMiddleName = "";
    const phoneticLastName = "";
    const namePrefix = "";
    const nameSuffix = "";
    const nickname = "";
    const fileAs = contact.name || "";
    const organizationName = contact.company || "";
    const organizationTitle = contact.jobTitle || "";
    const organizationDepartment = "";
    const birthday = "";
    const notes = "";
    const photo = "";
    const labels = contact.labels ? contact.labels.join(", ") : "";
    const emailLabel = contact.emails && contact.emails[0] ? contact.emails[0].label || "" : "";
    const emailValue = contact.email || "";
    const phoneLabel = contact.phones && contact.phones[0] ? contact.phones[0].label || "" : "";
    const phoneValue =
      contact.phones && contact.phones[0] ? `${contact.phones[0].dialCode || ""}${contact.phones[0].value || ""}` : "";

    return [
      firstName,
      middleName,
      lastName,
      phoneticFirstName,
      phoneticMiddleName,
      phoneticLastName,
      namePrefix,
      nameSuffix,
      nickname,
      fileAs,
      organizationName,
      organizationTitle,
      organizationDepartment,
      birthday,
      notes,
      photo,
      labels,
      emailLabel,
      emailValue,
      phoneLabel,
      phoneValue,
    ];
  });

  // Combine headers and rows
  const csvContent = [headers, ...rows].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n");

  return csvContent;
};

/**
 * Generate Outlook CSV format for contacts
 * @param {Array} contacts - Array of contact objects
 * @returns {string} CSV content
 */
export const generateOutlookCSV = (contacts) => {
  const headers = [
    "First Name",
    "Middle Name",
    "Last Name",
    "Title",
    "Suffix",
    "Web Page",
    "Birthday",
    "Anniversary",
    "Notes",
    "E-mail Address",
    "E-mail 2 Address",
    "E-mail 3 Address",
    "Primary Phone",
    "Home Phone",
    "Home Phone 2",
    "Mobile Phone",
    "Pager",
    "Home Fax",
    "Home Address",
    "Home Street",
    "Home Street 2",
    "Home Street 3",
    "Home Address PO Box",
    "Home City",
    "Home State",
    "Home Postal Code",
    "Home Country",
    "Spouse",
    "Children",
    "Manager's Name",
    "Assistant's Name",
    "Referred By",
    "Company Main Phone",
    "Business Phone",
    "Business Phone 2",
    "Business Fax",
    "Assistant's Phone",
    "Company",
    "Job Title",
    "Department",
    "Business Address",
    "Business Street",
    "Business Street 2",
    "Business Street 3",
    "Business Address PO Box",
    "Business City",
    "Business State",
    "Business Postal Code",
    "Business Country",
    "Other Phone",
    "Other Fax",
    "Other Address",
    "Other Street",
    "Other Street 2",
    "Other Street 3",
    "Other Address PO Box",
    "Other City",
    "Other State",
    "Other Postal Code",
    "Other Country",
    "Callback",
    "Car Phone",
    "ISDN",
    "Radio Phone",
    "TTY/TDD Phone",
    "Telex",
    "Categories",
  ];

  const rows = contacts.map((contact) => {
    const firstName = contact.firstName || "";
    const middleName = "";
    const lastName = contact.lastName || "";
    const title = contact.jobTitle || "";
    const suffix = "";
    const webPage = "";
    const birthday = "";
    const anniversary = "";
    const notes = "";
    const emailAddress = contact.email || "";
    const email2Address = contact.emails && contact.emails[1] ? contact.emails[1].value : "";
    const email3Address = contact.emails && contact.emails[2] ? contact.emails[2].value : "";
    const primaryPhone =
      contact.phones && contact.phones[0] ? `${contact.phones[0].dialCode || ""}${contact.phones[0].value || ""}` : "";
    const homePhone = "";
    const homePhone2 = "";
    const mobilePhone = "";
    const pager = "";
    const homeFax = "";
    const homeAddress = "";
    const homeStreet = "";
    const homeStreet2 = "";
    const homeStreet3 = "";
    const homeAddressPOBox = "";
    const homeCity = "";
    const homeState = "";
    const homePostalCode = "";
    const homeCountry = "";
    const spouse = "";
    const children = "";
    const managersName = "";
    const assistantsName = "";
    const referredBy = "";
    const companyMainPhone = "";
    const businessPhone = "";
    const businessPhone2 = "";
    const businessFax = "";
    const assistantsPhone = "";
    const company = contact.company || "";
    const jobTitle = contact.jobTitle || "";
    const department = "";
    const businessAddress = "";
    const businessStreet = "";
    const businessStreet2 = "";
    const businessStreet3 = "";
    const businessAddressPOBox = "";
    const businessCity = "";
    const businessState = "";
    const businessPostalCode = "";
    const businessCountry = "";
    const otherPhone = "";
    const otherFax = "";
    const otherAddress = "";
    const otherStreet = "";
    const otherStreet2 = "";
    const otherStreet3 = "";
    const otherAddressPOBox = "";
    const otherCity = "";
    const otherState = "";
    const otherPostalCode = "";
    const otherCountry = "";
    const callback = "";
    const carPhone = "";
    const isdn = "";
    const radioPhone = "";
    const ttyTddPhone = "";
    const telex = "";
    const categories = contact.labels ? contact.labels.join(", ") : "";

    return [
      firstName,
      middleName,
      lastName,
      title,
      suffix,
      webPage,
      birthday,
      anniversary,
      notes,
      emailAddress,
      email2Address,
      email3Address,
      primaryPhone,
      homePhone,
      homePhone2,
      mobilePhone,
      pager,
      homeFax,
      homeAddress,
      homeStreet,
      homeStreet2,
      homeStreet3,
      homeAddressPOBox,
      homeCity,
      homeState,
      homePostalCode,
      homeCountry,
      spouse,
      children,
      managersName,
      assistantsName,
      referredBy,
      companyMainPhone,
      businessPhone,
      businessPhone2,
      businessFax,
      assistantsPhone,
      company,
      jobTitle,
      department,
      businessAddress,
      businessStreet,
      businessStreet2,
      businessStreet3,
      businessAddressPOBox,
      businessCity,
      businessState,
      businessPostalCode,
      businessCountry,
      otherPhone,
      otherFax,
      otherAddress,
      otherStreet,
      otherStreet2,
      otherStreet3,
      otherAddressPOBox,
      otherCity,
      otherState,
      otherPostalCode,
      otherCountry,
      callback,
      carPhone,
      isdn,
      radioPhone,
      ttyTddPhone,
      telex,
      categories,
    ];
  });

  // Combine headers and rows
  const csvContent = [headers, ...rows].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n");

  return csvContent;
};

/**
 * Generate vCard format for contacts
 * @param {Array} contacts - Array of contact objects
 * @returns {string} vCard content
 */
export const generateVCard = (contacts) => {
  const vCards = contacts.map((contact) => {
    const fullName = contact.name || "";
    const firstName = contact.firstName || "";
    const lastName = contact.lastName || "";
    const email = contact.email || "";
    const phone =
      contact.phones && contact.phones[0] ? `${contact.phones[0].dialCode || ""}${contact.phones[0].value || ""}` : "";
    const organization = contact.company || "";
    const title = contact.jobTitle || "";
    const categories = contact.labels ? contact.labels.join(",") : "";

    let vcard = "BEGIN:VCARD\n";
    vcard += "VERSION:3.0\n";
    vcard += `FN:${fullName}\n`;
    vcard += `N:${lastName};${firstName};;;\n`;

    if (email) {
      vcard += `item1.EMAIL;TYPE=INTERNET:${email}\n`;
      vcard += "item1.X-ABLabel:\n";
    }

    if (phone) {
      vcard += `item2.TEL:${phone}\n`;
      vcard += "item2.X-ABLabel:\n";
    }

    if (organization) {
      vcard += `ORG:${organization}\n`;
    }

    if (title) {
      vcard += `TITLE:${title}\n`;
    }

    if (categories) {
      vcard += `CATEGORIES:${categories}\n`;
    }

    vcard += "END:VCARD\n";

    return vcard;
  });

  return vCards.join("\n");
};

/**
 * Download a file with the given content and filename
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @param {string} mimeType - MIME type
 */
export const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Filter contacts based on the selected group
 * @param {Array} allContacts - All available contacts
 * @param {string} selectedGroup - Selected group ('all', 'selected', 'frequent', or 'label-{id}')
 * @param {Set} selectedContactIds - Set of selected contact IDs
 * @param {Array} availableLabels - Available labels with counts
 * @returns {Array} Filtered contacts
 */
export const filterContactsByGroup = (allContacts, selectedGroup, selectedContactIds, availableLabels) => {
  switch (selectedGroup) {
    case "all":
      return allContacts;

    case "selected":
      return allContacts.filter((contact) => selectedContactIds.has(contact.id));

    case "frequent":
      // For now, return empty array since we don't have frequency data
      return [];

    default:
      if (selectedGroup.startsWith("label-")) {
        const labelName = selectedGroup.replace("label-", "");

        // Filter contacts that have this label
        const filteredContacts = allContacts.filter((contact) => contact.labels && contact.labels.includes(labelName));
        return filteredContacts;
      }
      return allContacts;
  }
};
