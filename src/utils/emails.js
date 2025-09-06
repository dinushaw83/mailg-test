// src/contexts/normalize.js
export function normalizeEmails(messages) {
  const messagesById = {};
  const threadsById = {};

  for (const m of messages) {
    const id = String(m.id); // ensure string
    const threadId = String(m.threadId);
    const ts = new Date(m.timestamp).getTime();

    const msg = {
      ...m,
      id,
      threadId,
      timestampMs: ts,
      // keep body as-is; optionally split into {html, text}
    };
    messagesById[id] = msg;

    let thread = threadsById[threadId];
    if (!thread) {
      thread = {
        id: threadId,
        messageIds: [],
        labels: new Set(),
        updatedAt: 0,
        unreadCount: 0,
        lastMessageId: null,
        subject: m.subject, // or from first message
        participants: new Set([m.from?.email, m.to].filter(Boolean)),
      };
      threadsById[threadId] = thread;
    }

    thread.messageIds.push(id);
    thread.updatedAt = Math.max(thread.updatedAt, ts);
    if (!m.read) thread.unreadCount += 1;
    (m.labels || []).forEach((l) => thread.labels.add(l));
    thread.participants.add(m.from?.email);
    if (!thread.lastMessageId || ts >= messagesById[thread.lastMessageId].timestampMs) {
      thread.lastMessageId = id;
      thread.subject = m.subject || thread.subject;
    }
  }

  // finalize sets and order messages within threads
  Object.values(threadsById).forEach((t) => {
    t.labels = Array.from(t.labels);
    t.participants = Array.from(t.participants);
    t.messageIds.sort((a, b) => messagesById[a].timestampMs - messagesById[b].timestampMs);
  });

  const threadIds = Object.values(threadsById)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((t) => t.id);

  return { messagesById, threadsById, threadIds };
}

// Build thread-level rows that look like message rows
// - One row per thread
// - Read/star/important, preview, timestamp come from last message
// - Subject comes from the first message in the thread
// - Labels are the union of all labels within the thread
export function getThreadRows(messages, { label = null, folder = "inbox" } = {}) {
  const { messagesById, threadsById, threadIds } = normalizeEmails(messages);

  const rows = threadIds.map((tid) => {
    const t = threadsById[tid];
    const firstId = t.messageIds[0];
    const lastId = t.lastMessageId || t.messageIds[t.messageIds.length - 1];
    const first = messagesById[firstId];
    const last = messagesById[lastId];

    return {
      // Keep navigation compatible with message details by using last message id
      id: last.id,
      // Preserve thread identity for attributes/analytics
      threadId: t.id,
      legacyThreadId: last.legacyThreadId,
      legacyLastMessageId: last.legacyLastMessageId,
      legacyLastNonDraftMessageId: last.legacyLastNonDraftMessageId,

      // Subject from first message, preview from last
      subject: first.subject,
      preview: last.preview,

      // Read/star/important from last message (as requested)
      read: !!last.read,
      starred: !!last.starred,
      important: !!last.important,

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
    };
  });

  // Filter by label or folder semantics
  const has = (row, name) => (row.labels || []).includes(name);

  let filtered = rows;
  if (label) {
    filtered = filtered.filter((r) => has(r, label));
  } else if (folder) {
    switch (folder) {
      case "inbox":
        filtered = filtered.filter((r) => has(r, "Inbox"));
        break;
      case "starred":
        filtered = filtered.filter((r) => r.starred && !has(r, "Spam") && !has(r, "Trash"));
        break;
      case "snoozed":
        filtered = filtered.filter((r) => has(r, "Snoozed") && !has(r, "Spam") && !has(r, "Trash"));
        break;
      case "sent":
        filtered = filtered.filter((r) => has(r, "Sent"));
        break;
      case "drafts":
        filtered = filtered.filter((r) => has(r, "Drafts"));
        break;
      case "important":
        filtered = filtered.filter((r) => r.important && !has(r, "Spam") && !has(r, "Trash"));
        break;
      case "chats":
        filtered = filtered.filter((r) => has(r, "Chats"));
        break;
      case "scheduled":
        filtered = filtered.filter((r) => has(r, "Scheduled"));
        break;
      case "spam":
        filtered = filtered.filter((r) => has(r, "Spam"));
        break;
      case "trash":
        filtered = filtered.filter((r) => has(r, "Trash"));
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
