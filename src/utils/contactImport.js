/**
 * Utility functions for importing contacts from different formats
 */

/**
 * Parse CSV content and convert to contact objects
 * @param {string} csvContent - CSV content as string
 * @returns {Array} Array of contact objects
 */
export const parseCSV = (csvContent) => {
  const lines = csvContent.split("\n");

  if (lines.length < 2) return [];

  // Parse CSV headers
  const headers = parseCSVLine(lines[0]);

  // Detect CSV format and set appropriate field mapping
  const isGoogleCSV = headers.includes("E-mail 1 - Value");
  const isOutlookCSV = headers.includes("E-mail Address");

  let fieldMap;

  if (isGoogleCSV) {
    // Google CSV export format
    fieldMap = {
      firstName: findColumnIndex(headers, ["First Name"]),
      lastName: findColumnIndex(headers, ["Last Name"]),
      name: findColumnIndex(headers, ["File As"]),
      email: findColumnIndex(headers, ["E-mail 1 - Value"]),
      phone: findColumnIndex(headers, ["Phone 1 - Value"]),
      company: findColumnIndex(headers, ["Organization Name"]),
      jobTitle: findColumnIndex(headers, ["Organization Title"]),
      labels: findColumnIndex(headers, ["Labels"]),
    };
  } else if (isOutlookCSV) {
    // Outlook CSV export format
    fieldMap = {
      firstName: findColumnIndex(headers, ["First Name"]),
      lastName: findColumnIndex(headers, ["Last Name"]),
      name: findColumnIndex(headers, ["First Name", "Last Name"]), // Will be constructed from first + last
      email: findColumnIndex(headers, ["E-mail Address"]),
      phone: findColumnIndex(headers, ["Primary Phone"]),
      company: findColumnIndex(headers, ["Company"]),
      jobTitle: findColumnIndex(headers, ["Job Title"]),
      labels: findColumnIndex(headers, ["Categories"]),
    };
  } else {
    // Generic CSV format - try common field names
    fieldMap = {
      firstName: findColumnIndex(headers, ["First Name", "first_name", "firstName", "firstname"]),
      lastName: findColumnIndex(headers, ["Last Name", "last_name", "lastName", "lastname"]),
      name: findColumnIndex(headers, ["Name", "Full Name", "full_name", "fullName", "fullname"]),
      email: findColumnIndex(headers, ["Email", "E-mail", "email", "Email Address", "email_address"]),
      phone: findColumnIndex(headers, ["Phone", "Phone Number", "phone_number", "phoneNumber"]),
      company: findColumnIndex(headers, ["Company", "Organization", "organization"]),
      jobTitle: findColumnIndex(headers, ["Job Title", "Title", "Position", "job_title", "jobTitle"]),
      labels: findColumnIndex(headers, ["Labels", "Categories", "labels", "categories", "Tags", "tags"]),
    };
  }

  const contacts = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) {
      continue; // Skip empty lines
    }

    const values = parseCSVLine(line);

    if (values.length === 0) {
      continue;
    }

    const dateString = new Date().toISOString();
    const contact = {
      id: generateContactId(),
      isSaved: true,
      isFavorite: false,
      createdAt: dateString,
      updatedAt: dateString,
      savedAt: dateString,
    };

    // Map CSV fields to contact object
    if (fieldMap.firstName !== -1 && values[fieldMap.firstName]) {
      contact.firstName = values[fieldMap.firstName].trim();
    }
    if (fieldMap.lastName !== -1 && values[fieldMap.lastName]) {
      contact.lastName = values[fieldMap.lastName].trim();
    }
    if (fieldMap.name !== -1 && values[fieldMap.name]) {
      contact.name = values[fieldMap.name].trim();
    }
    // Map email early so name fallback can use it
    if (fieldMap.email !== -1 && values[fieldMap.email]) {
      contact.email = values[fieldMap.email].trim();
    }

    // If no name field but we have firstName/lastName, construct the full name
    if (!contact.name && (contact.firstName || contact.lastName)) {
      const nameParts = [];
      if (contact.firstName) nameParts.push(contact.firstName);
      if (contact.lastName) nameParts.push(contact.lastName);
      contact.name = nameParts.join(" ");
    }

    // If still no name but we have email, use email prefix as fallback
    if (!contact.name && contact.email) {
      contact.name = contact.email.split("@")[0];
    }

    // Debug log for first few contacts removed

    // If first/last are missing but we now have a name, try to derive them
    if ((!contact.firstName || !contact.lastName) && contact.name) {
      const parts = contact.name.trim().split(/\s+/);
      if (parts.length === 1) {
        if (!contact.firstName) contact.firstName = parts[0];
      } else if (parts.length >= 2) {
        if (!contact.firstName) contact.firstName = parts[0];
        if (!contact.lastName) contact.lastName = parts.slice(1).join(" ");
      }
    }
    if (fieldMap.phone !== -1 && values[fieldMap.phone]) {
      const phoneValue = values[fieldMap.phone].trim();
      if (phoneValue) {
        contact.phones = [
          {
            value: phoneValue.replace(/\D/g, ""), // Remove non-digits
            dialCode: "+1", // Default dial code
            label: "Work",
          },
        ];
      }
    }
    if (fieldMap.company !== -1 && values[fieldMap.company]) {
      contact.company = values[fieldMap.company].trim();
    }
    if (fieldMap.jobTitle !== -1 && values[fieldMap.jobTitle]) {
      contact.jobTitle = values[fieldMap.jobTitle].trim();
    }

    // Fix: Check if labels are at the next index due to extra empty element
    const labelsIndex = fieldMap.labels !== -1 ? fieldMap.labels : -1;
    const actualLabelsIndex =
      labelsIndex !== -1 && values.length > labelsIndex + 1 && values[labelsIndex] === ""
        ? labelsIndex + 1
        : labelsIndex;

    if (actualLabelsIndex !== -1 && values[actualLabelsIndex]) {
      const labelsString = values[actualLabelsIndex].trim();
      if (labelsString) {
        contact.labels = labelsString
          .split(",")
          .map((label) => label.trim())
          .filter((label) => label);
      }
    }

    // Generate name if not provided (especially for Outlook CSV which doesn't have a separate name field)
    if (!contact.name && (contact.firstName || contact.lastName)) {
      contact.name = `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
    }

    // Only add contact if it has at least a name or email

    if (contact.name || contact.email) {
      contacts.push(contact);
    }
  }

  return contacts;
};

/**
 * Parse vCard content and convert to contact objects
 * @param {string} vcardContent - vCard content as string
 * @returns {Array} Array of contact objects
 */
export const parseVCard = (vcardContent) => {
  const vcards = vcardContent.split("BEGIN:VCARD");
  const contacts = [];

  for (let vcardIndex = 0; vcardIndex < vcards.length; vcardIndex++) {
    const vcard = vcards[vcardIndex];
    if (!vcard.trim() || !vcard.includes("END:VCARD")) {
      continue;
    }

    const contact = {
      id: generateContactId(),
      isSaved: true,
      isFavorite: false,
    };

    const lines = vcard.split("\n");

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const [key, ...valueParts] = line.split(":");
      const value = valueParts.join(":").trim();

      if (!value) {
        continue;
      }

      // Handle phone numbers - check if key contains TEL anywhere
      if (key.toUpperCase().includes("TEL")) {
        if (!contact.phones) contact.phones = [];
        // Extract dial code and phone number from the value
        let phoneValue = value.replace(/\D/g, "");
        let dialCode = "+1"; // Default dial code

        // If the value starts with +1, extract it as dial code
        if (value.startsWith("+1")) {
          dialCode = "+1";
          phoneValue = phoneValue.substring(1); // Remove the 1
        } else if (value.startsWith("+")) {
          // Extract any other dial code
          const match = value.match(/^\+(\d{1,3})/);
          if (match) {
            dialCode = "+" + match[1];
            phoneValue = phoneValue.substring(match[1].length);
          }
        }

        // Determine phone label based on the key
        let phoneLabel = "Work";
        if (key.toUpperCase().includes("MOBILE")) {
          phoneLabel = "Mobile";
        } else if (key.toUpperCase().includes("HOME")) {
          phoneLabel = "Home";
        } else if (key.toUpperCase().includes("WORK")) {
          phoneLabel = "Work";
        }

        const phoneObj = {
          value: phoneValue,
          dialCode: dialCode,
          label: phoneLabel,
        };

        contact.phones.push(phoneObj);
      }
      // Handle other fields
      else {
        switch (key.toUpperCase()) {
          case "FN":
            contact.name = value;
            break;
          case "N":
            const nameParts = value.split(";");
            if (nameParts.length >= 2) {
              contact.lastName = nameParts[0];
              contact.firstName = nameParts[1];
              if (!contact.name) {
                contact.name = `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
              }
            }
            break;
          case "EMAIL":
          case "ITEM1.EMAIL;TYPE=INTERNET":
            contact.email = value;
            break;
          case "ORG":
            contact.company = value;
            break;
          case "TITLE":
            contact.jobTitle = value;
            break;
          case "CATEGORIES":
            contact.labels = value
              .split(",")
              .map((label) => label.trim())
              .filter((label) => label);
            break;
        }
      }
    }

    // Only add contact if it has at least a name or email
    if (contact.name || contact.email) {
      contacts.push(contact);
    }
  }

  return contacts;
};

/**
 * Parse a single CSV line, handling quoted fields
 * @param {string} line - CSV line
 * @returns {Array} Array of field values
 */
const parseCSVLine = (line) => {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
};

/**
 * Find the index of a column by checking multiple possible names
 * @param {Array} headers - Array of header names
 * @param {Array} possibleNames - Array of possible names to match
 * @returns {number} Column index or -1 if not found
 */
const findColumnIndex = (headers, possibleNames) => {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase().trim();
    for (const possibleName of possibleNames) {
      if (header === possibleName.toLowerCase()) {
        return i;
      }
    }
  }
  return -1;
};

/**
 * Generate a unique contact ID
 * @returns {string} Unique contact ID
 */
const generateContactId = () => {
  return `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
