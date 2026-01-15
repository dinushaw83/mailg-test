import { emailToUsernameMap } from "../contexts/fixtures/emails.js";

const PERSONAL_EMAIL = "john.doe@example.com";

const normalizeLabelKey = (label) => {
  const name = typeof label === "string" ? label : label?.name;
  if (!name) return null;
  return String(name).trim().replace(/\//g, "::");
};

const titleCase = (value) => {
  const s = String(value || "").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const categoryToLabel = (category) => {
  const c = String(category || "").toLowerCase();
  if (!c) return null;
  if (c === "primary") return "Primary";
  if (c === "promotions") return "Promotions";
  if (c === "updates") return "Updates";
  if (c === "social") return "Social";
  if (c === "forums") return "Forums";
  return titleCase(c);
};

export const emailAPIMapper = (emails) => {
  return emails
    .map((email) => {
      // Transform recipients array into to, cc, bcc arrays
      const recipients = email?.recipients || [];
      const to = recipients
        .filter((r) => r.type === "to")
        .map((r) => ({
          email: r.email,
          name: r.name || null,
          id: r.id || null,
        }));
      const cc = recipients
        .filter((r) => r.type === "cc")
        .map((r) => ({
          email: r.email,
          name: r.name || null,
          id: r.id || null,
        }));
      const bcc = recipients
        .filter((r) => r.type === "bcc")
        .map((r) => ({
          email: r.email,
          name: r.name || null,
          id: r.id || null,
        }));

      return {
        ...email,
        id: email?.id,
        from: {
          name: email?.sender_name,
          email: email?.sender_email,
          id: email.sender_id,
        },
        to,
        cc,
        bcc,
        beFormattedEMailLabels: email?.labels,
        folderId: email?.folder_id,
        thread_id: email?.thread_id || null,
        timestamp: email?.sent_at || email?.received_at || email?.created_at,
        // Use html_body if available (for display), fallback to body
        body: email?.html_body || email?.body || "",
        preview: email?.snippet || email?.preview || email?.body?.substring(0, 100),
        status: email?.status || "inbox",
        is_read: email?.is_read !== undefined ? email.is_read : false,
        is_starred: email?.is_starred || false,
        is_important: email?.is_important || false,
        scheduled_send_at: email?.scheduled_send_at,
        snooze_until: email?.snooze_until,
        attachment_count: email?.attachment_count || email?.attachments?.length || 0,
        has_attachments: email?.has_attachments !== undefined ? email.has_attachments : email?.attachments?.length > 0,
        attachments: email?.attachments || [],
        system_labels: email?.system_labels,
        can_undo_send: email?.can_undo_send,
        // Preserve parent_email_id for thread hierarchy
        parent_email_id: email?.parent_email_id,
      };
    })
    .filter((email) => email.thread_id);
};
// src/contexts/normalize.js
export function normalizeEmails(messages) {
  const messagesById = {};
  const threadsById = {};
  const normalizeEmailAddress = (value) => {
    if (!value) return "";
    // Handle string
    if (typeof value === "string") return value.toLowerCase();
    // Handle object with email property
    if (typeof value === "object" && value.email) return String(value.email || "").toLowerCase();
    // Fallback: convert to string
    return String(value).toLowerCase();
  };
  const isLikelyEmail = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const getParticipantScore = (participant) => {
    if (!participant) return 0;
    const name = (participant.name || "").trim();
    if (!name) return 0;
    if (isLikelyEmail(name)) return 1;
    const email = normalizeEmailAddress(participant.email);
    if (email && name.toLowerCase() === email) return 1;
    return 2;
  };
  const upsertParticipant = (map, participant) => {
    if (!participant) return;
    const email = normalizeEmailAddress(participant.email);
    if (!email) return;

    const existing = map.get(email);
    if (!existing) {
      map.set(email, participant);
      return;
    }

    const existingScore = getParticipantScore(existing);
    const incomingScore = getParticipantScore(participant);
    if (incomingScore > existingScore) {
      map.set(email, participant);
      return;
    }

    if (incomingScore === existingScore) {
      const existingNameLength = (existing.name || "").trim().length;
      const incomingNameLength = (participant.name || "").trim().length;
      if (incomingNameLength > existingNameLength) {
        map.set(email, participant);
      }
    }
  };
  const toParticipant = (address) => {
    if (!address) return null;

    // Handle object format (from API): {email, name, id}
    if (typeof address === "object" && address.email) {
      return {
        email: address.email,
        name: address.name || emailToUsernameMap[address.email] || address.email,
        id: address.id || null,
      };
    }

    // Handle string format (legacy): just email address
    if (typeof address === "string") {
      return {
        email: address,
        name: emailToUsernameMap[address] || address,
      };
    }

    return null;
  };
  const collectParticipantsForMessage = (message) => {
    const list = [];
    if (message.from) {
      list.push(message.from);
    }
    (message.to || []).forEach((addr) => {
      const participant = toParticipant(addr);
      if (participant) list.push(participant);
    });
    (message.cc || []).forEach((addr) => {
      const participant = toParticipant(addr);
      if (participant) list.push(participant);
    });
    return list;
  };

  for (const m of messages) {
    const id = String(m.id); // ensure string
    const thread_id = String(m.thread_id);
    const ts = new Date(m.timestamp).getTime();

    // Preserve full label objects with id, name, and color
    // Convert string labels to objects for consistency
    let enrichedLabels = (m.labels || [])
      .map((l) => {
        if (typeof l === "string") {
          // Convert string to object format
          return { name: l, color: null, id: null };
        }
        // Keep object format with id, name, color
        return { id: l.id || null, name: l.name, color: l.color || null };
      })
      .filter((l) => l.name);

    const msg = {
      ...m,
      id,
      thread_id,
      timestampMs: ts,
      labels: enrichedLabels,
    };
    messagesById[id] = msg;

    let thread = threadsById[thread_id];
    if (!thread) {
      thread = {
        id: thread_id,
        messageIds: [],
        labels: new Set(),
        updatedAt: 0,
        unreadCount: 0,
        lastMessageId: null,
        subject: m.subject, // or from first message
        participants: new Map(),
        personalEmailSent: false,
      };
      threadsById[thread_id] = thread;
    }

    const messageParticipants = collectParticipantsForMessage(m);
    messageParticipants.forEach((participant) => {
      upsertParticipant(thread.participants, participant);
    });

    thread.messageIds.push(id);
    thread.updatedAt = Math.max(thread.updatedAt, ts);
    if (!m.is_read) thread.unreadCount += 1;
    // Add label objects to thread (use Set to deduplicate by name)
    enrichedLabels.forEach((labelObj) => {
      // Check if label with same name already exists in thread
      const existing = Array.from(thread.labels).find((l) => l.name === labelObj.name);
      if (!existing) {
        thread.labels.add(labelObj);
      }
    });
    const messageIsDraft = (m.labels || []).some(
      (label) => (label?.name?.toLowerCase?.() || label?.toLowerCase?.()) === "drafts"
    );
    if (!thread.personalEmailSent && !messageIsDraft && (m.from?.email || "").toLowerCase() === PERSONAL_EMAIL) {
      thread.personalEmailSent = true;
    }
    if (!thread.lastMessageId || ts >= messagesById[thread.lastMessageId].timestampMs) {
      thread.lastMessageId = id;
      thread.subject = m.subject || thread.subject;
    }
  }

  // finalize sets and order messages within threads
  Object.values(threadsById).forEach((t) => {
    t.labels = Array.from(t.labels);
    t.messageIds.sort((a, b) => messagesById[a].timestampMs - messagesById[b].timestampMs);

    const firstMessageId = t.messageIds[0];
    const firstSenderEmail = firstMessageId ? (messagesById[firstMessageId]?.from?.email || "").toLowerCase() : "";

    const participantsArray = Array.from(t.participants.values());
    const participantsWithMeta = participantsArray.map((participant, index) => {
      const email = (participant?.email || "").toLowerCase();
      return {
        participant,
        index,
        isFirstSender: firstSenderEmail && email === firstSenderEmail,
      };
    });

    participantsWithMeta.sort((a, b) => {
      if (a.isFirstSender && !b.isFirstSender) return -1;
      if (!a.isFirstSender && b.isFirstSender) return 1;
      return a.index - b.index;
    });

    t.participants = participantsWithMeta.map(({ participant }) => participant);
  });

  const thread_ids = Object.values(threadsById)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((t) => t.id);

  return { messagesById, threadsById, thread_ids };
}

const LABEL_MAX_WIDTH = 168;
const HIDDEN_SEPARATOR = " .. ";

const SINGLE_NAME_LIMIT = 20;
const SINGLE_EMAIL_LIMIT = 26;
const TWO_NAME_LIMIT = 12;
const THREE_NAME_LIMIT = 8;
const MANY_NAME_LIMIT = 6;

const cleanWhitespace = (value = "") => value.replace(/\s+/g, " ").trim();

const sanitizeText = (value = "") => cleanWhitespace(value.replace(/\[[^\]]*]/g, "[").replace(/["“”]/g, ""));

const isEmailLike = (value) => value.includes("@") && !value.includes(" ");

const markTruncationIfNeeded = (original, formatted, { treatAsEmail = false } = {}) => {
  if (!formatted || treatAsEmail) return formatted;

  const trimmed = formatted.trimEnd();
  if (!trimmed) return formatted;
  if (trimmed.endsWith(".") || trimmed.endsWith("...")) return formatted;

  const sanitizedOriginal = sanitizeText(original);
  if (!sanitizedOriginal) return formatted;

  const formattedBase = trimmed.replace(/\.+$/u, "");
  if (sanitizedOriginal.length > formattedBase.length) {
    return `${trimmed}.`;
  }

  return formatted;
};

const approximateWidth = (value) => {
  if (!value) return 0;
  const narrow = /[ilI1\.,:;'`]/;
  return Array.from(value).reduce((sum, ch) => {
    if (ch === " ") return sum + 4;
    if (/[MW@#%&]/.test(ch)) return sum + 10;
    if (/[A-Z0-9]/.test(ch)) return sum + 9;
    if (/[a-z]/.test(ch)) return sum + 8;
    if (narrow.test(ch)) return sum + 5;
    return sum + 8;
  }, 8);
};

const shouldClamp = (value) => approximateWidth(value) > LABEL_MAX_WIDTH;

const truncateWithDot = (value, limit) => {
  const source = sanitizeText(value);
  if (!source) return "";
  if (source.length <= limit && !shouldClamp(source)) {
    return source;
  }

  const sliceLength = Math.max(1, limit - 1);
  let head = source.slice(0, sliceLength).replace(/[\s\-_,]+$/u, "");
  if (!head) {
    head = source.slice(0, sliceLength);
  }
  return `${head}.`;
};

const clampEmailByDomain = (email, limit) => {
  const [local, domain] = email.split("@");
  if (!local || !domain) return null;

  const parts = domain.split(".");
  if (parts.length <= 3) {
    for (let keep = parts.length - 1; keep >= 1; keep -= 1) {
      const kept = parts.slice(0, keep).join(".");
      let candidate = `${local}@${kept}`;
      if (keep < parts.length) candidate += ".";
      const withDot = candidate.endsWith(".") ? candidate : `${candidate}.`;
      if (withDot.length <= limit && !shouldClamp(withDot)) {
        return withDot;
      }
    }
  }

  return null;
};

const truncateEmail = (email, limit) => {
  const trimmed = cleanWhitespace(email);
  if (!trimmed) return "";
  if (trimmed.length <= limit && !shouldClamp(trimmed)) {
    return trimmed;
  }

  const domainClamped = clampEmailByDomain(trimmed, limit);
  if (domainClamped && (!shouldClamp(domainClamped) || domainClamped.length <= limit)) {
    return domainClamped;
  }

  const [local, domain] = trimmed.split("@");
  if (!domain) {
    return truncateWithDot(trimmed, limit);
  }

  const suffixLen = Math.min(14, Math.max(3, domain.length));
  const prefixLen = Math.min(4, Math.max(1, limit - suffixLen - 7));

  const candidate = `${local.slice(0, prefixLen)}...@...${domain.slice(-suffixLen)}`;
  if (candidate.length <= limit + 1) {
    return candidate;
  }

  return truncateWithDot(trimmed, limit);
};

const normalizeParticipantName = (participant) => {
  if (!participant) return null;
  if (typeof participant === "string") return sanitizeText(participant);

  const email = cleanWhitespace(participant.email || "");
  if (email && email.toLowerCase() === PERSONAL_EMAIL) {
    return "me";
  }

  if (participant.name && participant.name.trim()) {
    return cleanWhitespace(participant.name);
  }

  if (email) {
    return email;
  }

  return null;
};

const pickDisplayBase = (name, preferFirstWord) => {
  const normalized = cleanWhitespace(name);
  if (!normalized) {
    return {
      original: "",
      display: "",
      emailLike: false,
      truncatedByWord: false,
    };
  }

  if (normalized.toLowerCase() === "me") {
    return {
      original: "me",
      display: "me",
      emailLike: false,
      truncatedByWord: false,
    };
  }

  const emailLike = isEmailLike(normalized);
  const shouldUseFirstWord = preferFirstWord && /\s/.test(normalized) && !emailLike;
  const display = shouldUseFirstWord ? normalized.split(/\s+/u)[0] : normalized;

  return {
    original: normalized,
    display,
    emailLike,
    truncatedByWord: shouldUseFirstWord,
  };
};

const formatMultiName = (entry, limit) => {
  if (!entry) return "";
  if (entry.display === "me") return "me";
  if (entry.emailLike) {
    return truncateEmail(entry.original, limit + 4);
  }

  const sanitized = sanitizeText(entry.display);
  const base = sanitized || entry.display;
  const needsHint = base !== cleanWhitespace(entry.display);

  let formatted;
  if (base.length <= limit && !shouldClamp(base)) {
    formatted = needsHint && !base.endsWith(".") ? `${base}.` : base;
  } else {
    formatted = truncateWithDot(base, limit);
  }

  return markTruncationIfNeeded(entry.original, formatted);
};

const formatSingle = (entry) => {
  if (!entry) return "";
  if (entry.display === "me") return "me";
  if (entry.emailLike) {
    return truncateEmail(entry.original, SINGLE_EMAIL_LIMIT);
  }

  const sanitized = sanitizeText(entry.display);
  const base = sanitized || entry.display;
  const needsHint = base !== cleanWhitespace(entry.display);

  let formatted;
  if (base.length <= SINGLE_NAME_LIMIT && !shouldClamp(base)) {
    formatted = needsHint && !base.endsWith(".") ? `${base}.` : base;
  } else {
    formatted = truncateWithDot(base, SINGLE_NAME_LIMIT);
  }

  return markTruncationIfNeeded(entry.original, formatted);
};

const formatPair = (first, second) => {
  const formattedFirst = formatMultiName(first, TWO_NAME_LIMIT);
  const formattedSecond = formatMultiName(second, TWO_NAME_LIMIT);
  return `${formattedFirst}, ${formattedSecond}`;
};

const formatTriplet = (first, last) => {
  const lastLimit = /\[/.test(last.display || "") ? THREE_NAME_LIMIT + 2 : THREE_NAME_LIMIT;
  const formattedFirst = formatMultiName(first, THREE_NAME_LIMIT);
  const formattedLast = formatMultiName(last, lastLimit);
  return `${formattedFirst}${HIDDEN_SEPARATOR}${formattedLast}`;
};

const formatGroup = (first, middle, last) => {
  const middleLimit = MANY_NAME_LIMIT;
  const lastLimit = /\[/.test(last.display || "") ? MANY_NAME_LIMIT + 2 : MANY_NAME_LIMIT;
  const formattedFirst = formatMultiName(first, MANY_NAME_LIMIT);
  const formattedMiddle = formatMultiName(middle, middleLimit);
  const formattedLast = formatMultiName(last, lastLimit);
  return `${formattedFirst}${HIDDEN_SEPARATOR}${formattedMiddle}, ${formattedLast}`;
};

export const getLabel = (participants, { includePersonal = true } = {}) => {
  const normalizedParticipants = (participants || []).filter((participant) => {
    if (includePersonal) return true;
    const email = (participant?.email || "").toLowerCase();
    return email !== PERSONAL_EMAIL;
  });

  const names = normalizedParticipants.map(normalizeParticipantName).filter(Boolean);
  if (!names.length) return "";

  const entries = names.map((name) => pickDisplayBase(name, names.length > 1));
  if (!entries.length) return "";

  if (entries.length === 1) {
    return formatSingle(entries[0]);
  }

  if (entries.length === 2) {
    return formatPair(entries[0], entries[1]);
  }

  if (entries.length === 3) {
    return formatTriplet(entries[0], entries[2]);
  }

  const middle = entries[entries.length - 2];
  const last = entries[entries.length - 1];
  return formatGroup(entries[0], middle, last);
};

// Build thread-level rows that look like message rows
// - One row per thread
// - Read/star/important, preview, timestamp come from last message
// - Subject comes from the first message in the thread
// - Labels are the union of all labels within the thread
export function getThreadRows(messages, { label = null, folder = "inbox" } = {}) {
  const { messagesById, threadsById, thread_ids } = normalizeEmails(messages);

  // Build a label for the Sent folder that lists only recipient first names
  // - Excludes the sender (john.doe@example.com)
  // - If the email is sent only to self, show "me"
  const toFirstName = (address) => {
    const email = (address || "").toLowerCase();
    if (!email) return "";
    if (email === PERSONAL_EMAIL) return "me";

    const mapped = emailToUsernameMap[email] || emailToUsernameMap[address] || null;
    if (mapped && mapped.trim()) {
      return mapped.trim().split(/\s+/u)[0];
    }

    const local = (address.split("@")[0] || "").split(/[.\-+_]/u)[0] || "";
    if (!local) return address;
    return local.charAt(0).toUpperCase() + local.slice(1);
  };

  const buildSentToLabel = (thread) => {
    // Find the last non-draft message sent by PERSONAL_EMAIL
    for (let i = thread.messageIds.length - 1; i >= 0; i -= 1) {
      const msg = messagesById[thread.messageIds[i]];
      const isDraft = (msg.labels || []).some((l) => (l?.name?.toLowerCase?.() || l?.toLowerCase?.()) === "drafts");
      const fromPersonal = (msg.from?.email || "").toLowerCase() === PERSONAL_EMAIL;
      if (!isDraft && fromPersonal) {
        const toList = Array.isArray(msg.to) ? msg.to : [];
        if (!toList.length) return "";

        const recipientsExcludingSelf = toList.filter((addr) => (addr || "").toLowerCase() !== PERSONAL_EMAIL);
        const useList = recipientsExcludingSelf.length ? recipientsExcludingSelf : [PERSONAL_EMAIL];
        const names = useList.map(toFirstName).filter(Boolean);
        return names.join(", ");
      }
    }
    return "";
  };

  const rows = thread_ids.map((tid) => {
    const t = threadsById[tid];
    const firstId = t.messageIds[0];
    const lastId = t.lastMessageId || t.messageIds[t.messageIds.length - 1];
    const first = messagesById[firstId];
    const last = messagesById[lastId];

    const defaultLabel = getLabel(t.participants, { includePersonal: t.personalEmailSent });
    const sentToLabel = folder === "sent" ? buildSentToLabel(t) : null;
    const label = sentToLabel || defaultLabel;

    return {
      // Keep navigation compatible with message details by using last message id
      id: last.id,
      // Preserve thread identity for attributes/analytics
      thread_id: t.id,
      legacyThreadId: last.legacyThreadId,
      legacyLastMessageId: last.legacyLastMessageId,
      legacyLastNonDraftMessageId: last.legacyLastNonDraftMessageId,

      // Subject from first message, preview from last
      subject: first.subject,
      preview: last.preview,

      // Read/star/important from last message (as requested)
      is_read: !!last.is_read,
      is_starred: !!last.is_starred,
      is_important: !!last.is_important,

      // Display info
      timestamp: last.timestamp,
      labelColor: last.labelColor,
      from: last.from,
      to: last.to,

      // Aggregates
      labels: t.labels, // union
      messageCount: t.messageIds.length,
      unreadCount: t.unreadCount,
      updatedAt: t.updatedAt,

      // Attachments
      attachments: last.attachments || [],
      embeddedImages: last.embeddedImages || [],
      label,
    };
  });

  // Filter by label or folder semantics
  const has = (row, name) => {
    // Labels are now objects with { id, name, color }
    // Label names from backend use "/" for hierarchy (e.g., "Work/Projects")
    // Composite keys from frontend use "::" (e.g., "Work::Projects")
    // Normalize both to use "/" for comparison
    const normalizedName = String(name || "").replace(/::/g, "/");

    const labels = row.labels;
    if (Array.isArray(labels)) {
      return labels.some((l) => {
        const labelName = String(l.name || "").replace(/::/g, "/");
        return labelName === normalizedName;
      });
    }
    if (labels instanceof Set) {
      return Array.from(labels).some((l) => {
        const labelName = String(l.name || "").replace(/::/g, "/");
        return labelName === normalizedName;
      });
    }
    return false;
  };
  let filtered = rows;
  if (label) {
    // Filter by label, but exclude Spam and Trash
    filtered = filtered.filter((r) => has(r, label) && !has(r, "Spam") && !has(r, "Trash"));
  } else if (folder) {
    switch (folder) {
      case "inbox":
        // Skip filtering for inbox since API already returns category-specific emails
        // The emails are already filtered by category (primary, promotions, social, updates)
        break;
      case "starred":
        filtered = filtered.filter((r) => r.is_starred && !has(r, "Spam") && !has(r, "Trash"));
        break;
      case "snoozed":
        filtered = filtered.filter((r) => has(r, "Snoozed") && !has(r, "Spam") && !has(r, "Trash"));
        break;
      case "sent":
        // Backend already filters by folder=sent, so skip client-side label filtering
        // filtered = filtered.filter((r) => has(r, "Sent"));
        break;
      case "drafts":
        // Backend already filters by folder=drafts, so skip client-side label filtering
        // filtered = filtered.filter((r) => has(r, "Drafts"));
        break;
      case "important":
        filtered = filtered.filter((r) => r.is_important && !has(r, "Spam") && !has(r, "Trash"));
        break;
      case "chats":
        filtered = filtered.filter((r) => has(r, "Chats"));
        break;
      case "scheduled":
        filtered = filtered.filter((r) => has(r, "Scheduled"));
        break;
      case "spam":
        // Backend already filters by folder=spam, so skip client-side label filtering
        // filtered = filtered.filter((r) => has(r, "Spam"));
        break;
      case "trash":
        // Backend already filters by folder=trash, so skip client-side label filtering
        // filtered = filtered.filter((r) => has(r, "Trash"));
        break;
      case "categories":
        filtered = filtered.filter((r) => has(r, "Categories"));
        break;
      case "all":
        filtered = filtered.filter((r) => !has(r, "Spam") && !has(r, "Trash"));
        break;
      default:
        // fallback: no additional filtering
        break;
    }
  }

  // Sort by last update desc (last message timestamp)
  filtered.sort((a, b) => b.updatedAt - a.updatedAt);

  return filtered;
}

// get a single thread row
export const getThread = (messages, { thread_id }) => {
  const { messagesById, threadsById } = normalizeEmails(messages);
  const thread = threadsById[thread_id];
  if (!thread) {
    return null;
  }

  const firstId = thread.messageIds[0];
  const lastId = thread.lastMessageId || thread.messageIds[thread.messageIds.length - 1];
  const first = messagesById[firstId];
  const last = messagesById[lastId];

  return {
    // Keep navigation compatible with message details by using last message id
    id: last.id,
    // Preserve thread identity for attributes/analytics
    thread_id: thread.id,
    legacyThreadId: last.legacyThreadId,
    legacyLastMessageId: last.legacyLastMessageId,
    legacyLastNonDraftMessageId: last.legacyLastNonDraftMessageId,

    // Subject from first message, preview from last
    subject: first.subject,
    preview: last.preview,

    // Read/star/important from last message (as requested)
    is_read: !!last.is_read,
    is_starred: !!last.is_starred,
    is_important: !!last.is_important,

    // Display info
    timestamp: last.timestamp,
    labelColor: last.labelColor,
    from: last.from,
    to: last.to,

    // Aggregates
    labels: thread.labels, // union
    messageCount: thread.messageIds.length,
    unreadCount: thread.unreadCount,
    updatedAt: thread.updatedAt,

    messageIds: thread.messageIds,

    // Attachments
    attachments: last.attachments || [],
  };
};
