// Generate a consistent color based on the name
export const generateAvatarColor = (name) => {
  const colors = [
    "#f44336",
    "#e91e63",
    "#9c27b0",
    "#673ab7",
    "#3f51b5",
    "#2196f3",
    "#03a9f4",
    "#00bcd4",
    "#009688",
    "#4caf50",
    "#8bc34a",
    "#cddc39",
    "#ffeb3b",
    "#ffc107",
    "#ff9800",
    "#ff5722",
    "#795548",
    "#607d8b",
  ];

  // Handle undefined or null names
  if (!name || typeof name !== "string") {
    return colors[0];
  }

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const generateRandomId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000000000000000);
  return `${timestamp}${random}`;
};

// Generate a random thread ID
export const generateThreadId = () => {
  return `#thread-f:${generateRandomId()}`;
};

// Generate a random legacy thread ID
export const generateLegacyThreadId = () => {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate the next integer ID (highest existing ID + 1)
export const generateNextIntegerId = (arr) => {
  if (!arr || arr.length === 0) return 1;
  const maxId = Math.max(...arr.map((item) => item.id));
  return maxId + 1;
};

export const sortObjectKeys = (obj) => {
  // Handle null, undefined and non-objects
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    // Check if array items are primitive values (not arrays or objects)
    const hasPrimitiveItems = obj.some((item) => item !== null && typeof item !== "object");

    if (hasPrimitiveItems) {
      // Sort the array if it contains primitive values
      return [...obj].sort();
    } else {
      // Recursively sort array elements if they are objects/arrays
      return obj.map(sortObjectKeys);
    }
  }

  // Sort object keys and build new object
  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      result[key] = sortObjectKeys(obj[key]);
      return result;
    }, {});
};

export const processJsonWithHtmlTags = (obj, keysToProcess = []) => {
  // Handle null, undefined and non-objects
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => processJsonWithHtmlTags(item, keysToProcess));
  }

  // Process object
  return Object.keys(obj).reduce((result, key) => {
    const value = obj[key];

    // If this is a key we should process and the value is a string
    if (keysToProcess.includes(key) && typeof value === "string") {
      result[key] = removeHtmlTags(value);
    } else {
      // Recursively process nested objects/arrays
      result[key] = processJsonWithHtmlTags(value, keysToProcess);
    }

    return result;
  }, {});
};

export const removeHtmlTags = (content) => {
  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = content;
    return div.textContent.trim();
  }
};

export const stringifyReplacer = (key, value) => {
  const ignoredFields = [
    "createdAt",
    "updatedAt",
    "lastUpdated",
    "created_at",
    "updated_at",
    "last_updated",
    "last_login_at",
    "id",
    "snapshots",
    "versions",
    "suspendedAt",
    "time",
    "html_body",
    "timezone",
    "timezoneOffset",
    "timestamp",
    "editedAt",
    "solvedAt",
    "timeDisplay",
  ];
  if (ignoredFields.includes(key) || /id$/i.test(key)) {
    return undefined;
  }
  return value;
};

// Validate email format
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Function to restructure recipients to expand multiple emails into separate items
export const restructureRecipients = (recipients) => {
  const restructured = [];

  recipients.forEach((recipient) => {
    if (recipient.emails && recipient.emails.length > 0) {
      // Track seen emails for this specific user to avoid duplicates within the same user
      const seenEmailsForUser = new Set();

      // If recipient has multiple emails, create separate items for each
      recipient.emails.forEach((emailObj) => {
        // Only include if the email is valid and not already seen for this user
        if (isValidEmail(emailObj.value) && !seenEmailsForUser.has(emailObj.value.toLowerCase())) {
          seenEmailsForUser.add(emailObj.value.toLowerCase());
          restructured.push({
            id: recipient.id, // Use same ID for both emails
            name: recipient.name,
            firstName: recipient.firstName,
            lastName: recipient.lastName,
            email: emailObj.value,
            avatar: recipient.avatar,
            labels: recipient.labels,
            emailLabel: emailObj.label,
          });
        }
      });
    } else if (recipient.email && isValidEmail(recipient.email)) {
      // If recipient has only one email (legacy structure), keep as is only if valid
      restructured.push({
        ...recipient,
      });
    }
  });
  return restructured;
};

// Generate address string
export const generateAddressString = (address) => {
  const parts = [];
  if (address.streetAddress) parts.push(address.streetAddress);
  if (address.poBox) parts.push(address.poBox);
  if (address.streetAddress2) parts.push(address.streetAddress2);
  if (address.city) parts.push(`${address.city},`);
  const stateZip = [];
  if (address.stateName) stateZip.push(address.stateName);
  if (address.zipCode) stateZip.push(address.zipCode);
  if (stateZip.length > 0) parts.push(stateZip.join(" "));
  if (address.countryCode) parts.push(address.countryCode);
  return parts.join(" ");
};
