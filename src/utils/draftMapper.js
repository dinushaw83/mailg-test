import { emailAPIMapper } from "./emails";

/**
 * Transform frontend draft data to backend POST payload format
 * @param {Array} to - Array of recipient objects/strings
 * @param {Array} cc - Array of recipient objects/strings
 * @param {Array} bcc - Array of recipient objects/strings
 * @param {string} subject - Email subject
 * @param {Object} content - { html: string, plainText: string }
 * @param {string|null} scheduled_send_at - ISO date string or null
 * @returns {Object} Backend payload for POST /api/v1/emails
 */
export const feToBeDraftPayload = (to, cc, bcc, subject, content, scheduled_send_at = null) => {
  // Helper to extract email and name from recipient
  const extractRecipient = (recipient) => {
    if (typeof recipient === "string") {
      return { email: recipient, name: recipient };
    }
    return {
      email: recipient.email || recipient.name || recipient,
      name: recipient.name || recipient.email || recipient,
    };
  };

  // Combine all recipients into a single array with type field
  const recipients = [
    ...(to || []).map((r) => ({ ...extractRecipient(r), type: "to" })),
    ...(cc || []).map((r) => ({ ...extractRecipient(r), type: "cc" })),
    ...(bcc || []).map((r) => ({ ...extractRecipient(r), type: "bcc" })),
  ];

  return {
    subject: subject || "",
    recipients,
    body: content.plainText || null,
    html_body: content.html || "",
    is_draft: true,
    scheduled_send_at: scheduled_send_at || null,
  };
};

/**
 * Transform frontend reply draft data to backend POST payload format for reply endpoint
 * @param {Object} content - { html: string, plainText: string }
 * @param {boolean} replyAll - Whether this is a reply-all
 * @returns {Object} Backend payload for POST /api/v1/emails/{email_id}/reply
 */
export const feToBeReplyDraftPayload = (content, replyAll = false) => {
  return {
    body: content.plainText || null,
    html_body: content.html || "",
    reply_all: replyAll,
  };
};

/**
 * Transform frontend draft data to backend PUT payload format
 * @param {string} subject - Email subject
 * @param {Object} content - { html: string, plainText: string }
 * @param {boolean} is_read - Read status
 * @param {boolean} is_starred - Starred status
 * @param {boolean} is_important - Important status
 * @param {string} folder - Folder name (e.g., "drafts")
 * @param {string} category - Category name (e.g., "primary")
 * @returns {Object} Backend payload for PUT /api/v1/emails/:id
 */
export const feToBeDraftUpdatePayload = (
  {subject, content, is_read = true, is_starred = false, is_important = false, folder = "drafts", category = "primary", recipients}
) => {
  return {
    subject: subject || "",
    body: content.plainText || null,
    html_body: content.html || "",
    // is_read,
    // is_starred,
    // is_important,
    // folder,
    // category,
    recipients,
  };
};

/**
 * Transform backend draft response to frontend email format
 * Uses emailAPIMapper internally to ensure consistency
 * @param {Object} beDraft - Backend draft response
 * @returns {Object} Frontend email object
 */
export const beToFeDraft = (beDraft) => {
  if (!beDraft) return null;

  // Use emailAPIMapper to transform the backend response
  // It handles recipients, body/html_body, labels, etc.
  const mappedEmails = emailAPIMapper([beDraft]);
  
  if (mappedEmails.length === 0) {
    return null;
  }

  const feDraft = mappedEmails[0];

  // Ensure it has the Drafts label
  if (!feDraft.labels || !feDraft.labels.some((l) => {
    const labelName = typeof l === "string" ? l : l?.name;
    return labelName?.toLowerCase() === "drafts";
  })) {
    // Add Drafts label if not present
    const draftsLabel = typeof feDraft.labels?.[0] === "string" 
      ? "Drafts" 
      : { name: "Drafts", color: "#e1e3e1", id: null };
    
    feDraft.labels = feDraft.labels || [];
    if (Array.isArray(feDraft.labels)) {
      feDraft.labels.push(draftsLabel);
    }
  }

  return feDraft;
};
