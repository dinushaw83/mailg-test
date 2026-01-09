import { fetchEmailCounts, fetchEmails, fetchLabels } from "../store/slices/mailSlice";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useMemo } from "react";

/**
 * Custom hook for managing folder-based email selection and fetching
 * 
 * @param {Object} params - Hook parameters
 * @param {string} params.activeFolder - Current active folder (e.g., "inbox", "sent", "starred")
 * @param {string} params.activeInboxTab - Current inbox category tab (e.g., "Primary", "Promotions")
 * @param {string|null} params.label - Current label parameter from route (if viewing a label)
 * @param {number} params.currentPage - Current page number for pagination
 * @param {number} params.itemsPerPage - Items per page for pagination
 * @param {Object} params.mailFolders - Redux state object containing emails by folder/category
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
  const { loading: isEmailsLoading } = useSelector((state) => state.mail);

  // Select emails from the appropriate folder/category
  const emails = useMemo(() => {
    const isInboxRoute = !label && String(activeFolder).toLowerCase() === "inbox";

    if (isInboxRoute) {
      // For inbox, use the category-specific emails (primary, promotions, social, updates)
      const categoryKey = activeInboxTab.toLowerCase();
      return mailFolders[categoryKey] || [];
    }

    // For other folders, use folder-specific emails
    // Map route names to state keys: "starred" -> "is_starred", "important" -> "is_important", "snoozed" -> "is_snoozed"
    const folderKey = activeFolder.toLowerCase();
    const stateKeyMap = {
      starred: "is_starred",
      important: "is_important",
      snoozed: "is_snoozed",
    };
    const stateKey = stateKeyMap[folderKey] || folderKey;
    return mailFolders[stateKey] || [];
  }, [mailFolders, activeFolder, activeInboxTab, label]);

  // Fetch emails based on active folder (inbox with category, starred, important, snoozed, or folder-based routes)
  useEffect(() => {
    if (!accessToken) return;
    if (label) return; // Skip if viewing a label route

    const folderKey = String(activeFolder).toLowerCase();
    const validRoutes = ["inbox", "starred", "important", "snoozed", "sent", "trash", "spam", "drafts", "all"];
    if (!validRoutes.includes(folderKey)) return;

    const promises = [];

    switch (folderKey) {
      case "starred":
        // Fetch starred emails
        promises.push(
          dispatch(
            fetchEmails({
              page: currentPage,
              pageSize: itemsPerPage,
              is_starred: true,
            })
          ).unwrap()
        );
        break;
      case "important":
        // Fetch important emails
        promises.push(
          dispatch(
            fetchEmails({
              page: currentPage,
              pageSize: itemsPerPage,
              is_important: true,
            })
          ).unwrap()
        );
        break;
      case "snoozed":
        // Fetch snoozed emails
        promises.push(
          dispatch(
            fetchEmails({
              page: currentPage,
              pageSize: itemsPerPage,
              is_snoozed: true,
            })
          ).unwrap()
        );
        break;
      case "sent":
      case "trash":
      case "spam":
      case "drafts":
        // Fetch folder-based emails (sent, trash, spam, drafts)
        promises.push(
          dispatch(
            fetchEmails({
              page: currentPage,
              pageSize: itemsPerPage,
              folder: folderKey,
            })
          ).unwrap()
        );
        break;
      case "all":
        // Fetch all mail (inbox + archived)
        promises.push(
          dispatch(
            fetchEmails({
              page: currentPage,
              pageSize: itemsPerPage,
              folder: "inbox",
              include_archived: true,
            })
          ).unwrap()
        );
        break;
      case "inbox":
        // Fetch inbox emails with category filter and counts
        const categoryParam = activeInboxTab ? activeInboxTab.toLowerCase() : null;
        promises.push(
          dispatch(
            fetchEmails({
              page: currentPage,
              pageSize: itemsPerPage,
              category: categoryParam,
            })
          ).unwrap(),
          dispatch(fetchEmailCounts()).unwrap()
        );
        break;
      default:
        return;
    }

    Promise.all(promises)
      .then((results) => {
        // First result is always the emails payload
        const emailsPayload = results[0];
        setApiPagination(emailsPayload?.pagination ?? null);
        if (emailsPayload?.pagination?.pageSize && emailsPayload.pagination.pageSize !== itemsPerPage) {
          setItemsPerPage(emailsPayload.pagination.pageSize);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch emails:", error);
      });
  }, [activeFolder, activeInboxTab, currentPage, itemsPerPage, accessToken, label]);

  // Fetch labels on mount
  useEffect(() => {
    if (!accessToken) return;

    dispatch(fetchLabels()).catch((error) => {
      console.error("Failed to fetch labels:", error);
    });
  }, [accessToken]);

  return {
    emails,
    isLoading: isEmailsLoading,
  };
}
