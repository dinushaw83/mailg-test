import { fetchEmailCounts, fetchLabels, setEmails, setEmailsForCategory } from "../store/slices/mailSlice";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import emailService from "../services/emailService";

/**
 * Custom hook for managing folder-based email selection and fetching using React Query
 *
 * @param {Object} params - Hook parameters
 * @param {string} params.activeFolder - Current active folder (e.g., "inbox", "sent", "starred")
 * @param {string} params.activeInboxTab - Current inbox category tab (e.g., "Primary", "Promotions")
 * @param {string|null} params.label - Current label parameter from route (if viewing a label)
 * @param {number} params.currentPage - Current page number for pagination
 * @param {number} params.itemsPerPage - Items per page for pagination
 * @param {Object} params.mailFolders - Redux state object containing emails by folder/category (unused now)
 * @param {Function} params.setApiPagination - Setter for API pagination state
 * @param {Function} params.setItemsPerPage - Setter for items per page
 *
 * @returns {Object} - Returns emails array and loading state
 * @returns {Array} returns.emails - Array of emails for the current folder/category
 * @returns {boolean} returns.isLoading - Whether emails are currently being fetched
 */
export default function useFolderEmails({
  activeFolder,
  activeInboxTab,
  label,
  currentPage,
  itemsPerPage,
  mailFolders,
  setApiPagination,
  setItemsPerPage,
}) {
  const dispatch = useDispatch();
  const { accessToken } = useSelector((state) => state.user);
  const labels = useSelector((state) => state.mail.labels || {});
  const keyToLabelIdMap = useSelector((state) => state.mail.keyToLabelIdMap || {});

  // Helper function to get label UUID from label key
  const getLabelId = (labelKey) => {
    // Try composite key lookup first
    const labelId = keyToLabelIdMap[labelKey];
    if (labelId) return labelId;

    // Try direct UUID lookup (if labelKey is already a UUID)
    if (labels[labelKey]) return labelKey;

    // Fallback: search by name (case-insensitive)
    const matchingLabel = Object.values(labels).find((l) => l.name?.toLowerCase() === labelKey.toLowerCase());
    return matchingLabel?.id || null;
  };

  // Build query key and fetch function based on active folder
  const queryKey = label
    ? ["emails", "label", label, currentPage, itemsPerPage]
    : ["emails", activeFolder, activeInboxTab, currentPage, itemsPerPage];

  const { data: emailsData, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let baseResult;

      // Handle label routes
      if (label) {
        const labelId = getLabelId(label);

        if (!labelId) {
          console.error(`Label ID not found for label key: ${label}`);
          return { results: [], pagination: null };
        }

        baseResult = await emailService.getThreadsByLabel(labelId, currentPage, itemsPerPage);
      } else {
        const folderKey = String(activeFolder).toLowerCase();
        const validRoutes = ["inbox", "starred", "important", "snoozed", "sent", "trash", "spam", "drafts", "all"];
        if (!validRoutes.includes(folderKey)) {
          return { results: [], pagination: null };
        }

        switch (folderKey) {
          case "starred":
            baseResult = await emailService.getEmailsByFilter({
              page: currentPage,
              pageSize: itemsPerPage,
              is_starred: true,
            });
            break;
          case "important":
            baseResult = await emailService.getEmailsByFilter({
              page: currentPage,
              pageSize: itemsPerPage,
              is_important: true,
            });
            break;
          case "snoozed":
            baseResult = await emailService.getEmailsByFilter({
              page: currentPage,
              pageSize: itemsPerPage,
              is_snoozed: true,
            });
            break;
          case "sent":
          case "trash":
          case "spam":
          case "drafts":
            baseResult = await emailService.getEmailsByFilter({
              page: currentPage,
              pageSize: itemsPerPage,
              folder: folderKey,
            });
            break;
          case "all":
            baseResult = await emailService.getEmailsByFilter({
              page: currentPage,
              pageSize: itemsPerPage,
              folder: "inbox",
              include_archived: true,
            });
            break;
          case "inbox": {
            const categoryParam = activeInboxTab ? activeInboxTab.toLowerCase() : null;
            baseResult = await emailService.getEmailsByFilter({
              page: currentPage,
              pageSize: itemsPerPage,
              folder: "inbox",
              category: categoryParam,
              is_snoozed: false, // Exclude snoozed emails from inbox
            });
            break;
          }
          default:
            return { results: [], pagination: null };
        }
      }

      // If no results, return early
      if (!baseResult?.results?.length) {
        return baseResult;
      }

      // Map results to use thread_is_starred for the list display
      // The backend now provides thread_is_starred which is true if ANY email in the thread is starred
      const updatedResults = baseResult.results.map((email) => ({
        ...email,
        // Use thread_is_starred from backend for list display (true if any email in thread is starred)
        is_starred: email.thread_is_starred ?? email.is_starred,
        // Use thread_email_count from backend if available
        messageCount: email.thread_email_count || 1,
      }));

      return {
        ...baseResult,
        results: updatedResults,
      };
    },
    enabled: !!accessToken,
    staleTime: 30 * 1000, // 30 seconds - list data is fresh for 30s
  });

  // Sync React Query data to Redux for backward compatibility
  useEffect(() => {
    if (emailsData?.results) {
      const results = emailsData.results;
      const isInboxRoute = !label && String(activeFolder).toLowerCase() === "inbox";

      if (isInboxRoute) {
        // For inbox, sync to category-specific state
        const categoryKey = activeInboxTab.toLowerCase();
        dispatch(setEmailsForCategory({ category: categoryKey, emails: results }));
      } else {
        // For other folders, sync to Redux state
        dispatch(setEmails(results));
      }

      // Update pagination
      if (emailsData.pagination) {
        setApiPagination(emailsData.pagination);
        if (emailsData.pagination.pageSize && emailsData.pagination.pageSize !== itemsPerPage) {
          setItemsPerPage(emailsData.pagination.pageSize);
        }
      }
    }
  }, [emailsData, activeFolder, activeInboxTab, label, dispatch, setApiPagination, setItemsPerPage, itemsPerPage]);

  // Fetch labels on mount
  useEffect(() => {
    if (!accessToken) return;

    dispatch(fetchLabels()).catch((error) => {
      console.error("Failed to fetch labels:", error);
    });
  }, [accessToken, dispatch]);

  // Fetch email counts for inbox
  useEffect(() => {
    if (!accessToken) return;
    if (activeFolder.toLowerCase() === "inbox") {
      dispatch(fetchEmailCounts()).catch((error) => {
        console.error("Failed to fetch email counts:", error);
      });
    }
  }, [accessToken, activeFolder, dispatch]);

  return {
    emails: emailsData?.results || [],
    isLoading,
  };
}
