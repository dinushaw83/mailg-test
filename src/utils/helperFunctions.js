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

  // Handle undefined, null, or non-string names
  if (!name || typeof name !== "string") {
    return colors[0];
  }

  // Normalize the string (trim whitespace and convert to lowercase for consistency)
  const normalizedName = name.trim().toLowerCase();

  // If empty string after normalization, return default color
  if (normalizedName.length === 0) {
    return colors[0];
  }

  // Generate a hash using a more robust algorithm
  let hash = 0;
  for (let i = 0; i < normalizedName.length; i++) {
    const char = normalizedName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Ensure positive number and get color index
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
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

export const encodeForPath = (raw) => {
  // encode everything, then convert encoded spaces (%20) to +
  return encodeURIComponent(raw).replace(/%20/g, "+");
};

/**
 * Build search URL with refinement filters
 * @param {string} searchQuery - The search query
 * @param {Array} activeFilters - Array of active filter names
 * @param {string} loggedInUserEmail - Optional logged-in user's email for "From me" filter
 * @returns {string} - The constructed URL
 */
export const buildSearchUrlWithFilters = (searchQuery, activeFilters, loggedInUserEmail = null) => {
  // Check if we have URL parameters from current location (for contact filters, etc.)
  const currentParams = new URLSearchParams(window.location.search);
  const hasUrlFilters =
    currentParams.has("from") ||
    currentParams.has("to") ||
    currentParams.has("attach_or_drive") ||
    currentParams.has("is_unread") ||
    currentParams.has("datestart") ||
    currentParams.has("dateend") ||
    currentParams.has("daterangetype");

  // If no filters and no URL filters, return regular search URL
  if ((!activeFilters || activeFilters.length === 0) && !hasUrlFilters) {
    return `/search/${encodeForPath(searchQuery)}`;
  }

  // Build URL with filters
  const params = new URLSearchParams(currentParams);

  // Always add isrefinement=true when filters are active
  params.set("isrefinement", "true");

  // Map filter names to URL parameters
  if (activeFilters.includes("Has attachment")) {
    params.set("attach_or_drive", "true");
  } else if (!currentParams.has("attach_or_drive")) {
    params.delete("attach_or_drive");
  }

  if (activeFilters.includes("Is unread")) {
    params.set("is_unread", "true");
  } else if (!currentParams.has("is_unread")) {
    params.delete("is_unread");
  }

  if (activeFilters.includes("Last 7 days")) {
    // Calculate last 7 days including today (today - 6 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const dateString = sevenDaysAgo.toISOString().split("T")[0]; // Format: YYYY-MM-DD

    params.set("datestart", dateString);
    params.set("daterangetype", "custom_range");
    // Remove dateend if it exists
    params.delete("dateend");
  } else if (!currentParams.has("datestart") && !currentParams.has("dateend") && !currentParams.has("daterangetype")) {
    params.delete("datestart");
    params.delete("dateend");
    params.delete("daterangetype");
  }

  // Handle "From me" filter by setting "from" parameter to logged-in user's email
  if (activeFilters.includes("From me") && loggedInUserEmail) {
    params.set("from", loggedInUserEmail);
  } else if (activeFilters.includes("From me") && !loggedInUserEmail) {
    // If "From me" is active but no email provided, keep existing "from" param if any
    // This handles the case where the filter was set elsewhere (like SearchResultFilters)
  } else if (!activeFilters.includes("From me") && currentParams.has("from")) {
    // Only delete "from" param if it matches the logged-in user (i.e., it was set by "From me")
    // Keep it if it was set by contact filter
    if (loggedInUserEmail && currentParams.get("from")?.toLowerCase() === loggedInUserEmail.toLowerCase()) {
      params.delete("from");
    }
  }

  // Build the URL - if no search query, use /search?params, otherwise /search/query?params
  if (searchQuery && searchQuery.trim()) {
    return `/search/${encodeForPath(searchQuery)}?${params.toString()}`;
  } else {
    return `/search?${params.toString()}`;
  }
};

export const queryToSearchBarString = (queryString) => {
  const params = new URLSearchParams(queryString);

  // Order: from > to > subject > has words > doesn't have > size > dates
  const subsetParts = [];
  const fromParts = [];
  const toParts = [];
  const subjectParts = [];
  const hasParts = [];
  const hasnotParts = [];
  const attachmentParts = [];
  const excludeChatsParts = [];
  const sizeParts = [];
  const dateParts = [];

  // Handle date range first but store in dateParts
  const within = params.get("within");
  const date = params.get("date");

  if (within && date) {
    const selectedDate = new Date(date + "T00:00:00");
    let daysOffset = 1; // default to 1 day

    switch (within) {
      case "1 day":
        daysOffset = 1;
        break;
      case "3 days":
        daysOffset = 3;
        break;
      case "1 week":
        daysOffset = 7;
        break;
      case "2 weeks":
        daysOffset = 14;
        break;
      case "1 month":
        daysOffset = 30;
        break;
      case "2 months":
        daysOffset = 60;
        break;
      case "3 months":
        daysOffset = 90;
        break;
      case "6 months":
        daysOffset = 180;
        break;
      case "1 year":
        daysOffset = 365;
        break;
    }

    // Calculate after and before dates (same logic as before)
    const afterDate = new Date(selectedDate.getTime() - daysOffset * 24 * 60 * 60 * 1000);
    const beforeDate = new Date(selectedDate.getTime() + (daysOffset + 1) * 24 * 60 * 60 * 1000);

    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();
      return `${year}/${month}/${day}`;
    };

    dateParts.push(`after:${formatDate(afterDate)}`);
    dateParts.push(`before:${formatDate(beforeDate)}`);
  }

  // Handle other search criteria, distributing to the right bucket
  for (const [key, value] of params.entries()) {
    if (key.toLowerCase() === "advanced") continue;
    if (key === "within" || key === "date") continue; // already handled

    if (value == null || value === "") continue; // skip empty values

    // has -> has words
    if (key === "has" && value.trim()) {
      hasParts.push(value.trim());
      continue;
    }

    // from
    if (key === "from" && value && value.trim()) {
      const emails = value
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      // Check if all values are valid emails
      const allAreEmails = emails.every((e) => isValidEmail(e));

      if (emails.length >= 1) {
        if (allAreEmails) {
          fromParts.push(`from:(${emails.join(",")})`);
        } else {
          // Just a keyword, no parentheses
          fromParts.push(`from:${emails[0]}`);
        }
      }
      continue;
    }

    // to
    if (key === "to" && value && value.trim()) {
      const emails = value
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      // Check if all values are valid emails
      const allAreEmails = emails.every((e) => isValidEmail(e));

      if (emails.length >= 1) {
        if (allAreEmails) {
          toParts.push(`to:(${emails.join(",")})`);
        } else {
          // Just a keyword, no parentheses
          toParts.push(`to:${emails[0]}`);
        }
      }
      continue;
    }

    // subset
    if (key === "subset" && value && value.trim()) {
      subsetParts.push(`in:${value}`);
      continue;
    }

    // subject
    if (key === "subject" && value && value.trim()) {
      const trimmedValue = value.trim();
      // If multiple words, wrap in parentheses
      const hasMultipleWords = trimmedValue.includes(" ");
      if (hasMultipleWords) {
        subjectParts.push(`subject:(${trimmedValue})`);
      } else {
        subjectParts.push(`subject:${trimmedValue}`);
      }
      continue;
    }

    // Handle size filters
    if (key === "size" && value && value.trim()) {
      const sizeOperatorRaw = params.get("sizeOperator") || "less_than";
      const sizeOperator = sizeOperatorRaw.replace(/_/g, " "); // Convert underscores to spaces
      const sizeUnit = params.get("sizeUnit") || "MB";
      const operatorText = sizeOperator === "greater than" ? "larger" : "smaller";

      // Format unit: MB -> M, KB -> K, Bytes -> (no suffix)
      let unitSuffix = "";
      if (sizeUnit === "MB") {
        unitSuffix = "M";
      } else if (sizeUnit === "KB") {
        unitSuffix = "K";
      }
      // Bytes has no suffix

      sizeParts.push(`${operatorText}:${value}${unitSuffix}`);
      continue;
    }

    // Skip sizeOperator and sizeUnit as they're handled with size
    if (key === "sizeOperator" || key === "sizeUnit") {
      continue;
    }

    // doesn't have (hasnot)
    if (key === "hasnot" && value && value.trim()) {
      const trimmedValue = value.trim();
      // If multiple words, wrap in curly braces
      const hasMultipleWords = trimmedValue.includes(" ");
      if (hasMultipleWords) {
        hasnotParts.push(`-{${trimmedValue}}`);
      } else {
        hasnotParts.push(`-${trimmedValue}`);
      }
    } else if (key === "attachment" && value === "true") {
      attachmentParts.push("has:attachment");
    } else if (key === "excludeChats" && value === "true") {
      excludeChatsParts.push("-in:chats");
    }
  }

  // Compose final string
  const parts = [
    ...subsetParts,
    ...fromParts,
    ...toParts,
    ...subjectParts,
    ...hasParts,
    ...hasnotParts,
    ...attachmentParts,
    ...excludeChatsParts,
    ...sizeParts,
    ...dateParts,
  ];
  return parts.join(" ");
};

// decode a path segment like "John+Doe" or "John%20Doe" -> "John Doe"
function decodePathSegment(segment) {
  if (!segment) return null;
  try {
    // Convert + to %20 then decode percent-escapes
    return decodeURIComponent(segment.replace(/\+/g, "%20"));
  } catch (err) {
    // fallback: replace + with space
    return segment.replace(/\+/g, " ");
  }
}

// convert query param key/value into a search token
function paramToToken(key, value) {
  if (!key) return null;
  const k = key.trim();
  if (k.toLowerCase() === "advanced") return null; // always exclude 'advanced'

  // booleans
  if (value === "true") {
    // If key starts with "has" (e.g. hasAttachment), transform to "has:attachment"
    if (/^has[A-Z_]/.test(k) || /^has_/.test(k) || /^has[A-Za-z]/i.test(k)) {
      const rest = k.replace(/^has/i, "");
      // normalize camelCase / snake_case / kebab-case to single lowercase token
      const normalized = rest
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // split camelCase
        .replace(/[_-]/g, " ")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-"); // join multiword with - (or change to '' if you prefer)
      return `has:${normalized}`;
    }

    // fallback: has:<key>
    return `has:${k.toLowerCase()}`;
  }

  if (value === "false") {
    // optional: represent negation. You can change behavior if you don't want negatives.
    return `-has:${k.replace(/^has/i, "").toLowerCase()}`;
  }

  // Handle from/to with parentheses only if it's an email
  if (k === "from" || k === "to") {
    // Check if it contains email(s)
    const values = value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const allAreEmails = values.every((v) => isValidEmail(v));

    if (allAreEmails) {
      return `${k}:(${value})`;
    }
  }

  // default: key:value
  return `${k}:${value}`;
}

/**
 * Build the string to show in the search bar from either:
 *  - a full URL string,
 *  - or an object with { pathname, search } (e.g. React Router location).
 *
 * Behavior:
 *  - If pathname contains /search/<term> and <term> !== "advanced", decode and include it.
 *  - Then append tokens built from query params (excluding "advanced").
 */
export function buildSearchBarFromUrl(urlOrLocation) {
  // Normalize to a URL object
  let urlObj;
  if (typeof urlOrLocation === "string") {
    urlObj = new URL(urlOrLocation, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  } else {
    // Ensure search starts with "?"
    const search = urlOrLocation.search ?? "";
    urlObj = new URL(
      (urlOrLocation.pathname || "") + (search || ""),
      typeof window !== "undefined" ? window.location.origin : "http://localhost"
    );
  }

  const pathSegments = urlObj.pathname.split("/").filter(Boolean); // ["search", "advanced"] or ["search", "John+Doe"]
  const parts = [];

  // Check if this is a refinement search
  const params = new URLSearchParams(urlObj.search);
  const isRefinementSearch = params.get("isrefinement") === "true";

  // If path is /search/<term> and term is not 'advanced', decode it and add first
  if (pathSegments.length >= 2 && pathSegments[0].toLowerCase() === "search") {
    const maybeTerm = pathSegments[1];
    if (maybeTerm && maybeTerm.toLowerCase() !== "advanced") {
      const decoded = decodePathSegment(maybeTerm);
      if (decoded) parts.push(decoded);
    }
  }

  // If it's a refinement search, only return the search query (skip filter params)
  if (isRefinementSearch) {
    return parts.join(" ").trim();
  }

  // Otherwise, process query params (skip "advanced")
  for (const [k, v] of params.entries()) {
    const token = paramToToken(k, v);
    if (token) parts.push(token);
  }

  return parts.join(" ").trim();
}
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
            isSaved: recipient.isSaved,
            isFavorite: recipient.isFavorite,
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
export const generateAddressString = (address, returnType = "string") => {
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
  return returnType === "array" ? parts : parts.join(" ");
};

// Get formatted website URL
export const getFormattedWebsiteURL = (website) => {
  // Ensure the website has a protocol prefix
  let url = website;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url;
};

/**
 * Check if a search string contains any search operators
 * @param {string} str - The string to check
 * @returns {boolean} - True if the string contains search operators
 */
export const containsSearchOperators = (str) => {
  if (!str || typeof str !== "string") {
    return false;
  }

  // Check for common search operators
  const operatorPatterns = [
    /\bin:/, // in:
    /\bfrom:/, // from:
    /\bto:/, // to:
    /\bsubject:/, // subject:
    /\bhas:/, // has:
    /\blarger:/, // larger:
    /\bsmaller:/, // smaller:
    /\bafter:/, // after: (date operator)
    /\bbefore:/, // before: (date operator)
    /^-\w+/, // -word (negation)
    /-\{/, // -{phrase}
  ];

  return operatorPatterns.some((pattern) => pattern.test(str));
};

/**
 * Parse a search string (like "in:Inbox from:(jane@example.com) has:attachment smaller:12M after:2025/10/8 before:2025/10/11")
 * and convert it to formData object for the advanced search form
 *
 * @param {string} searchString - The search query string to parse
 * @returns {object} - Form data object with parsed values
 */
export const parseSearchStringToFormData = (searchString) => {
  if (!searchString || typeof searchString !== "string") {
    return null;
  }

  // Valid options for validation
  const validSubsets = ["All Mail", "Inbox", "Sent", "Drafts", "Spam", "Trash"];

  const formData = {
    from: "",
    to: "",
    subject: "",
    has: "",
    hasnot: "",
    sizeOperator: "less than",
    size: "",
    sizeUnit: "MB",
    within: "1 day",
    date: null,
    subset: "All Mail",
    attachment: false,
    excludeChats: false,
  };

  // Tokenize the search string
  // Handle patterns like: in:value, from:(email), subject:(multiple words), -word, -{multiple words}, etc.
  const tokens = [];
  let currentPos = 0;

  while (currentPos < searchString.length) {
    // Skip whitespace
    if (/\s/.test(searchString[currentPos])) {
      currentPos++;
      continue;
    }

    // Check for operators: in:, from:, to:, subject:, has:, after:, before:, larger:, smaller:
    const remaining = searchString.slice(currentPos);

    // Match operator patterns like "operator:(value)" or "operator:value"
    const operatorMatch = remaining.match(/^(-)?(\w+):((?:\([^)]*\)|[^\s]+))/);

    if (operatorMatch) {
      const [fullMatch, negation, operator, value] = operatorMatch;
      tokens.push({
        type: "operator",
        negation: !!negation,
        operator: operator.toLowerCase(),
        value: value.replace(/^\(|\)$/g, ""), // Remove surrounding parentheses
      });
      currentPos += fullMatch.length;
      continue;
    }

    // Match negated words or phrases like "-word" or "-{multiple words}"
    const negatedMatch = remaining.match(/^-(?:\{([^}]*)\}|(\S+))/);
    if (negatedMatch) {
      const [fullMatch, bracedValue, simpleValue] = negatedMatch;
      tokens.push({
        type: "negated",
        value: bracedValue || simpleValue,
      });
      currentPos += fullMatch.length;
      continue;
    }

    // Match regular words
    const wordMatch = remaining.match(/^(\S+)/);
    if (wordMatch) {
      tokens.push({
        type: "word",
        value: wordMatch[1],
      });
      currentPos += wordMatch[1].length;
      continue;
    }

    // Safety break
    currentPos++;
  }

  // Process tokens and populate formData
  const hasWords = [];
  const hasnotWords = [];

  tokens.forEach((token) => {
    if (token.type === "operator") {
      const { operator, value, negation } = token;

      switch (operator) {
        case "in":
          if (negation && value.toLowerCase() === "chats") {
            // Handle -in:chats -> excludeChats
            formData.excludeChats = true;
          } else if (!negation) {
            // Validate and set subset - capitalize first letter
            const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
            // Only set if it's a valid subset option, otherwise keep default "All Mail"
            if (validSubsets.includes(capitalizedValue)) {
              formData.subset = capitalizedValue;
            }
            // If invalid, formData.subset remains "All Mail" (default)
          }
          break;

        case "from":
          formData.from = value;
          break;

        case "to":
          formData.to = value;
          break;

        case "subject":
          formData.subject = value;
          break;

        case "has":
          if (value === "attachment") {
            formData.attachment = true;
          } else {
            hasWords.push(value);
          }
          break;

        case "larger":
          formData.sizeOperator = "greater than";
          parseSizeValue(value, formData);
          break;

        case "smaller":
          formData.sizeOperator = "less than";
          parseSizeValue(value, formData);
          break;

        case "after":
        case "before":
          // Skip date operators - we don't parse them
          break;

        default:
          // Unknown operator, treat value as a word
          if (negation) {
            hasnotWords.push(value);
          } else {
            hasWords.push(value);
          }
          break;
      }
    } else if (token.type === "negated") {
      hasnotWords.push(token.value);
    } else if (token.type === "word") {
      // Regular words go to "has"
      hasWords.push(token.value);
    }
  });

  // Combine has words
  if (hasWords.length > 0) {
    formData.has = hasWords.join(" ");
  }

  // Combine hasnot words
  if (hasnotWords.length > 0) {
    formData.hasnot = hasnotWords.join(" ");
  }

  // Note: date range (after:/before:) parsing has been removed
  // formData.date and formData.within will remain at their default values

  return formData;
};

/**
 * Parse size value like "12M", "500K", "1000" and populate formData
 */
function parseSizeValue(sizeStr, formData) {
  const match = sizeStr.match(/^([\d.]+)([MKB]?)$/i);
  if (match) {
    formData.size = match[1];
    const unit = match[2].toUpperCase();
    // Validate and set size unit
    if (unit === "M") {
      formData.sizeUnit = "MB";
    } else if (unit === "K") {
      formData.sizeUnit = "KB";
    } else if (unit === "B" || !unit) {
      formData.sizeUnit = "Bytes";
    }
    // If unit doesn't match M, K, or B, sizeUnit remains at default "MB"
  }
}
