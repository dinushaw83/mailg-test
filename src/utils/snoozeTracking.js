/**
 * Utility for tracking when emails are viewed after returning from snooze.
 * Uses localStorage to persist across page refreshes.
 */

const STORAGE_KEY = 'snoozedEmailsViewed';
const MAX_ENTRIES = 100; // Limit stored entries to prevent localStorage bloat
const CLEANUP_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours - clean up old entries

/**
 * Get all viewed snooze entries from localStorage
 * @returns {Object} Map of threadId to timestamp when viewed
 */
export const getViewedSnoozeEntries = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

/**
 * Mark a thread as viewed after returning from snooze
 * @param {string} threadId - The thread ID to mark as viewed
 */
export const markSnoozeViewed = (threadId) => {
  if (!threadId) return;
  
  try {
    const entries = getViewedSnoozeEntries();
    entries[threadId] = Date.now();
    
    // Cleanup old entries if we have too many
    const entryKeys = Object.keys(entries);
    if (entryKeys.length > MAX_ENTRIES) {
      const now = Date.now();
      // Remove entries older than 24 hours
      for (const key of entryKeys) {
        if (now - entries[key] > CLEANUP_THRESHOLD_MS) {
          delete entries[key];
        }
      }
      
      // If still too many, keep only the most recent
      const remainingKeys = Object.keys(entries);
      if (remainingKeys.length > MAX_ENTRIES) {
        const sortedKeys = remainingKeys.sort((a, b) => entries[b] - entries[a]);
        const keysToRemove = sortedKeys.slice(MAX_ENTRIES);
        for (const key of keysToRemove) {
          delete entries[key];
        }
      }
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn('Failed to mark snooze as viewed:', e);
  }
};

/**
 * Check if a thread has been viewed after snooze expired
 * @param {string} threadId - The thread ID to check
 * @returns {boolean} True if the thread has been viewed after snooze expired
 */
export const hasSnoozeBeenViewed = (threadId) => {
  if (!threadId) return false;
  
  const entries = getViewedSnoozeEntries();
  return !!entries[threadId];
};

/**
 * Remove a thread from the viewed list (e.g., when re-snoozed)
 * @param {string} threadId - The thread ID to remove
 */
export const clearSnoozeViewed = (threadId) => {
  if (!threadId) return;
  
  try {
    const entries = getViewedSnoozeEntries();
    if (entries[threadId]) {
      delete entries[threadId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
  } catch (e) {
    console.warn('Failed to clear snooze viewed:', e);
  }
};

/**
 * Check if an email has recently expired from snooze and should show badge
 * @param {Object} email - The email object
 * @param {number} windowMs - Time window in ms (default 2 minutes)
 * @returns {boolean} True if badge should be shown
 */
export const shouldShowSnoozeBadge = (email, windowMs = 2 * 60 * 1000) => {
  const snoozeTime = email?.snooze_until || email?.snoozeUntil;
  if (!snoozeTime) return false;
  
  const snoozeDate = new Date(snoozeTime);
  if (isNaN(snoozeDate.getTime())) return false;
  
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);
  
  // Check if snooze expired within the window
  const hasRecentlyExpired = snoozeDate <= now && snoozeDate >= windowStart;
  if (!hasRecentlyExpired) return false;
  
  // Check if user has already viewed this email after snooze expired
  const threadId = email?.thread_id || email?.threadId;
  if (hasSnoozeBeenViewed(threadId)) return false;
  
  return true;
};
