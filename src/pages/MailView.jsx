import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import QuickSettings, { INBOX_TYPE } from "../components/QuickSettings";
import React, { useEffect, useMemo, useState } from "react";
import { fetchEmailCounts, fetchEmails, fetchLabels } from "../store/slices/mailSlice";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useParams } from "react-router-dom";

import Banner from "../components/Banners";
import { CATEGORIES } from "../utils/categories";
import { EmailContent } from "../components/InboxView";
import EmailList from "../components/EmailList";
import InboxSection from "./InboxSection";
import LinearProgress from "@mui/material/LinearProgress";
import SearchResultFilters from "../components/SearchResultFilters";
import ToolBar from "../components/ToolBar";
// switched to thread-based rows derived from raw messages
import { getThreadRows } from "../utils/emails";
import { normalizeLabelName } from "../hooks/useLabels";
import styled from "@emotion/styled";
import { useGlobalContext } from "../contexts/GlobalContext";

const Container = styled.div`
  overflow: hidden;
  flex: 1;
  display: flex;
  max-width: 100%;
  border-radius: 16px;
  background-color: #fff;
  flex-direction: row;
`;

const EmailListContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: ${(props) => `calc(100vh - ${props.vacationResponderEnabled ? "98px" : "64px"})`};
  flex: 1;
  min-width: 0; /* Allows flex item to shrink below content size */
  position: relative;
`;

// Mapping of folder keys to display names for document title
const FOLDER_DISPLAY_NAMES = {
  inbox: "Inbox",
  starred: "Starred",
  snoozed: "Snoozed",
  sent: "Sent",
  drafts: "Drafts",
  important: "Important",
  chats: "Chats",
  scheduled: "Scheduled",
  all: "All Mail",
  spam: "Spam",
  trash: "Trash",
};

// Folders that should display unread count in document title
const FOLDERS_WITH_UNREAD_COUNT = new Set(["inbox", "starred", "snoozed", "important", "chats", "all"]);

const Inbox = () => {
  const {
    mailFolders,
    setCurrentPage,
    currentPage,
    inboxType,
    itemsPerPage,
    setItemsPerPage,
    loggedInUser,
    vacationResponder,
    setSortOrder,
    previewEmailId,
    setPreviewEmailId,
    panelState,
  } = useGlobalContext();
  const dispatch = useDispatch();
  const { accessToken } = useSelector((state) => state.user);
  const { loading: isEmailsLoading, lastMutationTime } = useSelector((state) => state.mail);

  const { folder, label: labelParam } = useParams();
  const label = labelParam ? decodeURIComponent(labelParam) : null;
  const activeFolder = folder || "inbox";
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);
  const [activeInboxTab, setActiveInboxTab] = useState(CATEGORIES.Primary);
  const [apiPagination, setApiPagination] = useState(null);

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
    const validRoutes = ["inbox", "starred", "important", "snoozed", "sent", "trash", "spam", "drafts"];
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
  }, [activeFolder, activeInboxTab, currentPage, itemsPerPage, accessToken, label, dispatch, lastMutationTime]);

  // Fetch labels on mount
  useEffect(() => {
    if (!accessToken) return;

    dispatch(fetchLabels()).catch((error) => {
      console.error("Failed to fetch labels:", error);
    });
  }, [accessToken]);

  const direction = panelState.direction;
  const showSplit = direction !== "no-split";
  const panelDirection = direction === "vertical" ? "horizontal" : "vertical";

  // Build thread rows: one row per thread
  const filteredRows = useMemo(() => {
    let rows = getThreadRows(emails, { label, folder: activeFolder });
    // Apply URL filter parameters (from SearchResultFilters)
    // Only apply if filters are present
    if (
      searchParams.has("from") ||
      searchParams.has("to") ||
      searchParams.has("attach_or_drive") ||
      searchParams.has("is_unread") ||
      searchParams.has("datestart") ||
      searchParams.has("dateend")
    ) {
      // Apply "From" filter
      if (searchParams.has("from")) {
        const fromEmails = searchParams
          .get("from")
          .split(",")
          .map((email) => email.trim().toLowerCase());
        rows = rows.filter((thread) => fromEmails.some((fromEmail) => thread.from?.email?.toLowerCase() === fromEmail));
      }

      // Apply "To" filter
      if (searchParams.has("to")) {
        const toEmails = searchParams
          .get("to")
          .split(",")
          .map((email) => email.trim().toLowerCase());
        rows = rows.filter((thread) => {
          const threadToList = thread.to || [];
          return threadToList.some((recipient) => toEmails.includes(recipient.email?.toLowerCase()));
        });
      }

      // Apply "Has attachment" filter
      if (searchParams.get("attach_or_drive") === "true") {
        rows = rows.filter((thread) => {
          const hasAttachments = thread.attachments && thread.attachments.length > 0;
          return hasAttachments;
        });
      }

      // Apply "Is unread" filter
      if (searchParams.get("is_unread") === "true") {
        rows = rows.filter((thread) => thread.unreadCount > 0);
      }

      // Apply date range filters
      if (searchParams.get("daterangetype") === "custom_range") {
        if (searchParams.has("datestart")) {
          const dateStart = new Date(searchParams.get("datestart"));
          rows = rows.filter((thread) => new Date(thread.timestamp) >= dateStart);
        }
        if (searchParams.has("dateend")) {
          const dateEnd = new Date(searchParams.get("dateend"));
          rows = rows.filter((thread) => new Date(thread.timestamp) <= dateEnd);
        }
      }
    }

    return rows;
  }, [emails, label, activeFolder, searchParams]);

  // Filter again by activeInboxTab (Primary, Promotions, Social, Updates)
  // When using API category filtering, emails are already filtered server-side
  const tabFilteredRows = useMemo(() => {
    const isInboxRoute = !label && String(activeFolder).toLowerCase() === "inbox";

    // If we're in inbox, the API has already filtered by category, so return filteredRows as-is
    if (isInboxRoute) {
      return filteredRows;
    }

    // For non-inbox routes, apply client-side label filtering
    const isInbox = (r) => (r.labels || []).includes("Inbox");
    const has = (r, name) => (r.labels || []).includes(name);
    const NON_PRIMARY = new Set([CATEGORIES.Promotions, CATEGORIES.Social, CATEGORIES.Updates, CATEGORIES.Forums]);

    if (activeInboxTab === CATEGORIES.Primary) {
      // Primary = Inbox only, without Social/Promotions/Updates/Forums
      return filteredRows.filter((r) => isInbox(r) && !(r.labels || []).some((l) => NON_PRIMARY.has(l)));
    }

    // Other tabs
    return filteredRows.filter((r) => isInbox(r) && has(r, activeInboxTab));
  }, [filteredRows, activeInboxTab, activeFolder, label]);

  // Sort and paginate the displayRows
  const baseSource = !label && activeFolder.toLowerCase() === "inbox" ? tabFilteredRows : filteredRows;
  const useServerPagination = !!apiPagination;

  // ────────── Helper to sort threads
  const sortRows = (arr) => [...arr].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const sortedBase = useMemo(() => sortRows(baseSource), [baseSource]);

  // ────────── Split rows based on inboxType
  const sortedImportant = useMemo(() => sortedBase.filter((r) => r.is_important), [sortedBase]);

  const sortedUnread = useMemo(() => sortedBase.filter((r) => r.unreadCount > 0), [sortedBase]);

  const sortedStarred = useMemo(() => sortedBase.filter((r) => r.is_starred), [sortedBase]);

  const everythingElse = useMemo(() => {
    switch (inboxType) {
      case INBOX_TYPE.IMPORTANT_FIRST:
        return sortedBase.filter((r) => !r.is_important);
      case INBOX_TYPE.UNREAD_FIRST:
        return sortedBase.filter((r) => r.unreadCount === 0);
      case INBOX_TYPE.STARRED_FIRST:
        return sortedBase.filter((r) => !r.is_starred);
      default:
        return sortedBase;
    }
  }, [sortedBase, inboxType]);

  // ────────── Paginate only the "everything else" section
  const paginatedOthers = useMemo(() => {
    if (useServerPagination) return everythingElse;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return everythingElse.slice(startIndex, endIndex);
  }, [everythingElse, currentPage, itemsPerPage, useServerPagination]);

  const rows = useMemo(() => {
    if (useServerPagination) return sortedBase;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedBase.slice(startIndex, endIndex);
  }, [sortedBase, currentPage, itemsPerPage, useServerPagination]);

  const showMailBanner = useMemo(() => {
    return inboxType === INBOX_TYPE.DEFAULT;
  }, [inboxType]);

  useEffect(() => {
    let titleText;

    // Handle label routes
    if (label) {
      const unreadCount = filteredRows.filter((thread) => thread.unreadCount > 0).length;
      const unreadText = unreadCount > 0 ? ` (${unreadCount})` : "";
      titleText = `"${normalizeLabelName(label)}"${unreadText}`;
    } else {
      // Handle folder routes
      const folderDisplayName = FOLDER_DISPLAY_NAMES[activeFolder] || activeFolder;

      // Calculate unread count only for folders that should show it
      if (FOLDERS_WITH_UNREAD_COUNT.has(activeFolder)) {
        const unreadCount = filteredRows.filter((thread) => thread.unreadCount > 0).length;
        const unreadText = unreadCount > 0 ? ` (${unreadCount})` : "";
        titleText = `${folderDisplayName}${unreadText}`;
      } else {
        titleText = folderDisplayName;
      }
    }

    document.title = `${titleText} - ${loggedInUser.email} - MailG`;
  }, [filteredRows, loggedInUser.email, activeFolder, label]);

  useEffect(() => {
    setCurrentPage(1);
    setSortOrder("newest");
  }, [activeInboxTab, activeFolder]);

  // Show filters for all folders except inbox and categories
  // Keep showing filters if they're active (even with 0 results) or if there are emails
  const showFilters = useMemo(() => {
    const excludedFolders = ["inbox", "categories"];
    if (excludedFolders.includes(activeFolder.toLowerCase())) {
      return false;
    }

    // Check if any filters are active
    const hasActiveFilters =
      searchParams.has("from") ||
      searchParams.has("to") ||
      searchParams.has("attach_or_drive") ||
      searchParams.has("is_unread") ||
      searchParams.has("datestart") ||
      searchParams.has("dateend") ||
      searchParams.has("daterangetype");

    // Show filters if there are emails OR if filters are active
    const hasEmails = filteredRows.length > 0;
    return hasEmails || hasActiveFilters;
  }, [activeFolder, filteredRows, searchParams]);
  useEffect(() => {
    setPreviewEmailId(null);
  }, [activeFolder, label]);

  console.log({ tabFilteredRows });
  console.log("filteredRows", filteredRows);
  console.log("sortedImportant", sortedImportant);
  console.log("sortedUnread", sortedUnread);
  console.log("sortedStarred", sortedStarred);
  console.log("paginatedOthers", paginatedOthers);
  console.log("rows", rows);
  const renderEmailListPanel = () => (
    <>
      {inboxType !== INBOX_TYPE.DEFAULT && activeFolder.toLowerCase() === "inbox" && (
        <div style={{ flex: 1, height: "100%", overflowY: "auto" }}>
          {inboxType === INBOX_TYPE.IMPORTANT_FIRST && (
            <InboxSection title="Important" emails={sortedImportant} setShowAdvancedMenu={setShowAdvancedMenu}>
              <EmailList
                emails={sortedImportant.slice(0, 25)}
                setShowAdvancedMenu={setShowAdvancedMenu}
                showFooter={false}
              />
            </InboxSection>
          )}

          {inboxType === INBOX_TYPE.UNREAD_FIRST && (
            <InboxSection title="Unread" emails={sortedUnread} setShowAdvancedMenu={setShowAdvancedMenu}>
              <EmailList
                emails={sortedUnread.slice(0, 25)}
                setShowAdvancedMenu={setShowAdvancedMenu}
                showFooter={false}
              />
            </InboxSection>
          )}

          {inboxType === INBOX_TYPE.STARRED_FIRST && (
            <InboxSection title="Starred" emails={sortedStarred} setShowAdvancedMenu={setShowAdvancedMenu}>
              <EmailList
                emails={sortedStarred.slice(0, 25)}
                setShowAdvancedMenu={setShowAdvancedMenu}
                showFooter={false}
              />
            </InboxSection>
          )}

          <InboxSection
            title="Everything else"
            emails={paginatedOthers}
            setShowAdvancedMenu={setShowAdvancedMenu}
            overwriteItemsPerPage={10}
            sectionStyle={{ marginTop: "16px", padding: "8px" }}
          >
            <EmailList
              emails={paginatedOthers.slice(0, 10)}
              setShowAdvancedMenu={setShowAdvancedMenu}
              showFooter={false}
            />
          </InboxSection>
        </div>
      )}

      {(inboxType === INBOX_TYPE.DEFAULT || activeFolder.toLowerCase() !== "inbox") && (
        <EmailList emails={rows} setShowAdvancedMenu={setShowAdvancedMenu} showFooter={!showSplit} />
      )}
    </>
  );

  return (
    <Container id="cont-123">
      <EmailListContainer role="main" vacationResponderEnabled={vacationResponder.enabled}>
        {isEmailsLoading && (
          <LinearProgress
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 5,
            }}
          />
        )}
        {showFilters && <SearchResultFilters pt={2} pb={1} activeFolder={activeFolder} />}
        <ToolBar
          // If server pagination is available, use server "total" so the toolbar shows correct "1–20 of N".
          totalFilteredItems={apiPagination?.total ?? baseSource.length}
          threads={rows}
          showAdvancedMenu={showAdvancedMenu}
          setShowAdvancedMenu={setShowAdvancedMenu}
          showPagination={inboxType === INBOX_TYPE.DEFAULT}
        />

        {showMailBanner && (
          <Banner rows={filteredRows} activeInboxTab={activeInboxTab} setActiveInboxTab={setActiveInboxTab} />
        )}

        {showSplit ? (
          <PanelGroup direction={panelDirection} id="inbox-root-panel-group">
            <Panel
              defaultSize={50}
              minSize={25}
              style={{
                minWidth: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
              }}
            >
              {renderEmailListPanel()}
            </Panel>

            <PanelResizeHandle
              style={{
                width: panelDirection === "horizontal" ? "4px" : "100%",
                backgroundColor: "#e0e0e0",
                cursor: panelDirection === "horizontal" ? "col-resize" : "row-resize",
              }}
            />

            <Panel
              defaultSize={50}
              id="email-content-panel"
              style={{
                height: "calc(100vh - 64px)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              <EmailContent
                threadId={previewEmailId}
                folder={activeFolder}
                label={label}
                showActionBar={false}
                isPreview
              />
            </Panel>
          </PanelGroup>
        ) : (
          renderEmailListPanel()
        )}
      </EmailListContainer>

      <QuickSettings />
    </Container>
  );
};

export default Inbox;
