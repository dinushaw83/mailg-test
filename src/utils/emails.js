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
