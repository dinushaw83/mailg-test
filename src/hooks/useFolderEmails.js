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

  // Build query key and fetch function based on active folder
  const queryKey = label
    ? ["emails", "label", label, currentPage, itemsPerPage]
    : ["emails", activeFolder, activeInboxTab, currentPage, itemsPerPage];

  const { data: emailsData, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (label) return { results: [], pagination: null }; // Skip label routes for now

      const folderKey = String(activeFolder).toLowerCase();
      const validRoutes = ["inbox", "starred", "important", "snoozed", "sent", "trash", "spam", "drafts", "all"];
      if (!validRoutes.includes(folderKey)) {
        return { results: [], pagination: null };
      }

      switch (folderKey) {
        case "starred":
          return emailService.getEmailsByFilter({
            page: currentPage,
            pageSize: itemsPerPage,
            is_starred: true,
          });
        case "important":
          return emailService.getEmailsByFilter({
            page: currentPage,
            pageSize: itemsPerPage,
            is_important: true,
          });
        case "snoozed":
          return emailService.getEmailsByFilter({
            page: currentPage,
            pageSize: itemsPerPage,
            is_snoozed: true,
          });
        case "sent":
        case "trash":
        case "spam":
        case "drafts":
          return emailService.getEmailsByFilter({
            page: currentPage,
            pageSize: itemsPerPage,
            folder: folderKey,
          });
        case "all":
          return emailService.getEmailsByFilter({
            page: currentPage,
            pageSize: itemsPerPage,
            folder: "inbox",
            include_archived: true,
          });
        case "inbox":
          const categoryParam = activeInboxTab ? activeInboxTab.toLowerCase() : null;
          return emailService.getEmailsByFilter({
            page: currentPage,
            pageSize: itemsPerPage,
            category: categoryParam,
          });
        default:
          return { results: [], pagination: null };
      }
    },
    enabled: !!accessToken && !label,
    staleTime: 0, // Always refetch when query is invalidated
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
