import { useCallback } from "react";
import { useSelector } from "react-redux";

/**
 * Normalizes IDs into a Set for fast lookup.
 * Handles single values, arrays, and Sets.
 */
const buildIdIndex = (selection) => {
  let arr;
  if (!selection) arr = [];
  else if (Array.isArray(selection)) arr = selection;
  else if (selection instanceof Set) arr = [...selection];
  else arr = [selection];

  return new Set(arr.map((x) => String(x ?? "").trim()).filter(Boolean));
};

/**
 * Collects all possible ID keys from a message object for matching.
 * This allows matching by email ID, thread ID, or legacy IDs.
 */
const collectKeysFromMessage = (m) => {
  const out = [];
  const add = (v) => {
    if (v == null) return;
    const s = String(v).trim();
    if (s) out.push(s);
  };
  add(m.id);
  add(m.messageId);
  add(m.threadId);
  add(m.thread_id);
  add(m.legacyThreadId);
  add(m.legacyLastMessageId);
  add(m.legacyLastNonDraftMessageId);
  add(m.legacy_thread_id);
  add(m.legacy_last_message_id);
  add(m.legacy_last_non_draft_message_id);
  return out;
};

/**
 * Creates a matcher function that checks if a message matches any of the given IDs.
 * @param {Array|string} selection - ID(s) to match against
 * @returns {Function} Matcher function that takes a message and returns boolean
 */
export const makeMatch = (selection) => {
  const index = buildIdIndex(selection);
  return (m) => collectKeysFromMessage(m).some((k) => index.has(k));
};

/**
 * Hook for resolving and normalizing email/thread IDs.
 * Centralizes the logic for converting between email IDs and thread IDs,
 * and provides utilities for cache matching.
 *
 * @returns {Object} Object containing resolver functions
 */
export function useIdResolver() {
  const emails = useSelector((state) => state.mail.inbox || []);

  /**
   * Resolves input IDs to get both email IDs and thread IDs.
   * This is the core function that handles the ID duality.
   *
   * @param {Array|string} ids - Email ID(s) to resolve
   * @param {Array|string|null} providedThreadIds - Optional pre-resolved thread IDs
   * @returns {Object} Resolved IDs and utility functions
   */
  const resolveIds = useCallback(
    (ids, providedThreadIds = null) => {
      // Normalize email IDs to array (handle Array, Set, or single value)
      const normalizeToArray = (input) => {
        if (!input) return [];
        if (Array.isArray(input)) return input.filter(Boolean);
        if (input instanceof Set) return [...input].filter(Boolean);
        return [input];
      };
      const emailIds = normalizeToArray(ids);

      // Create matcher for the input IDs
      const match = makeMatch(ids);

      // Resolve thread IDs - use provided ones or extract from emails
      let threadIds;
      if (providedThreadIds && (Array.isArray(providedThreadIds) ? providedThreadIds.length > 0 : providedThreadIds)) {
        threadIds = Array.isArray(providedThreadIds) ? providedThreadIds.filter(Boolean) : [providedThreadIds];
      } else {
        // Extract thread IDs from matching emails
        threadIds = [
          ...new Set(
            emails
              .filter((m) => match(m))
              .map((m) => m.thread_id)
              .filter(Boolean)
          ),
        ];

        if (threadIds.length === 0 && emailIds.length > 0) {
          threadIds = emailIds;
        }
      }

      const allIds = [...new Set([...emailIds, ...threadIds])];

      // Create a matcher that matches against all IDs
      const matchAll = makeMatch(allIds);

      return {
        emailIds, // Array of email IDs
        threadIds, // Array of thread IDs
        allIds, // Combined array for cache matching
        match, // Matcher for original input IDs
        matchAll, // Matcher for all IDs (email + thread)
        hasEmailIds: emailIds.length > 0,
        hasThreadIds: threadIds.length > 0,
        isSingle: emailIds.length === 1,
        isBulk: emailIds.length > 1,
      };
    },
    [emails]
  );

  /**
   * Resolves thread IDs only (for actions that operate at thread level).
   *
   * @param {Array|string} threadIds - Thread ID(s)
   * @returns {Object} Resolved thread IDs and utilities
   */
  const resolveThreadIds = useCallback((threadIds) => {
    const ids = Array.isArray(threadIds) ? threadIds.filter(Boolean) : threadIds ? [threadIds] : [];
    const match = makeMatch(ids);

    return {
      threadIds: ids,
      match,
      hasThreadIds: ids.length > 0,
      isSingle: ids.length === 1,
      isBulk: ids.length > 1,
    };
  }, []);

  /**
   * Gets thread IDs for given email IDs by looking them up in the emails array.
   *
   * @param {Array|string} emailIds - Email ID(s) to look up
   * @returns {Array} Array of corresponding thread IDs
   */
  const getThreadIdsForEmails = useCallback(
    (emailIds) => {
      const match = makeMatch(emailIds);
      return [
        ...new Set(
          emails
            .filter((m) => match(m))
            .map((m) => m.thread_id)
            .filter(Boolean)
        ),
      ];
    },
    [emails]
  );

  /**
   * Gets email IDs for given thread IDs by looking them up in the emails array.
   *
   * @param {Array|string} threadIds - Thread ID(s) to look up
   * @returns {Array} Array of corresponding email IDs
   */
  const getEmailIdsForThreads = useCallback(
    (threadIds) => {
      const threadIdSet = new Set(Array.isArray(threadIds) ? threadIds : [threadIds]);
      return emails
        .filter((m) => threadIdSet.has(m.thread_id))
        .map((m) => m.id)
        .filter(Boolean);
    },
    [emails]
  );

  return {
    resolveIds,
    resolveThreadIds,
    getThreadIdsForEmails,
    getEmailIdsForThreads,
    makeMatch,
    emails,
  };
}

export default useIdResolver;
