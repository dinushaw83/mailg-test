import React, { useContext, useMemo, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import EmailList from "../components/EmailList";
import { GlobalContext } from "../contexts/GlobalContext";
import ToolBar from "../components/ToolBar";
// switched to thread-based rows derived from raw messages
import { getThreadRows } from "../utils/emails";
import styled from "@emotion/styled";
import QuickSettings, { INBOX_TYPE } from "../components/QuickSettings";
import Banner from "../components/Banners";
import { CATEGORIES } from "../utils/categories";
import InboxSection from "./InboxSection";

import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { EmailContent } from "../components/InboxView";

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
`;

const Inbox = () => {
  const {
    emails,
    setCurrentPage,
    currentPage,
    inboxType,
    itemsPerPage,
    loggedInUser,
    vacationResponder,
    setSortOrder,
    previewEmailId,
    panelState,
    setPreviewEmailId,
  } = useContext(GlobalContext);

  const { folder, label: labelParam } = useParams();
  const label = labelParam ? decodeURIComponent(labelParam) : null;
  const activeFolder = folder || "inbox";

  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);
  const [activeInboxTab, setActiveInboxTab] = useState(CATEGORIES.Primary);

  const direction = panelState.direction;
  const showSplit = direction !== "no-split";
  const panelDirection = direction === "vertical" ? "horizontal" : "vertical";

  // Build thread rows: one row per thread
  const filteredRows = useMemo(() => {
    return getThreadRows(emails, { label, folder: activeFolder });
  }, [emails, label, activeFolder]);

  // Filter again by activeInboxTab (Primary, Promotions, Social, Updates)
  const tabFilteredRows = useMemo(() => {
    const isInbox = (r) => (r.labels || []).includes("Inbox");
    const has = (r, name) => (r.labels || []).includes(name);
    const NON_PRIMARY = new Set([CATEGORIES.Promotions, CATEGORIES.Social, CATEGORIES.Updates, CATEGORIES.Forums]);

    if (activeInboxTab === CATEGORIES.Primary) {
      // Primary = Inbox only, without Social/Promotions/Updates/Forums
      return filteredRows.filter((r) => isInbox(r) && !(r.labels || []).some((l) => NON_PRIMARY.has(l)));
    }

    // Other tabs
    return filteredRows.filter((r) => isInbox(r) && has(r, activeInboxTab));
  }, [filteredRows, activeInboxTab]);

  // Sort and paginate the displayRows
  const baseSource = !label && activeFolder.toLowerCase() === "inbox" ? tabFilteredRows : filteredRows;

  // ────────── Helper to sort threads
  const sortRows = (arr) =>
    [...arr].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const sortedBase = useMemo(() => sortRows(baseSource), [baseSource]);

  // ────────── Split rows based on inboxType
  const sortedImportant = useMemo(
    () => sortedBase.filter((r) => r.important),
    [sortedBase]
  );

  const sortedUnread = useMemo(
    () => sortedBase.filter((r) => !r.read),
    [sortedBase]
  );

  const sortedStarred = useMemo(
    () => sortedBase.filter((r) => r.starred),
    [sortedBase]
  );

  const everythingElse = useMemo(() => {
    switch (inboxType) {
      case INBOX_TYPE.IMPORTANT_FIRST:
        return sortedBase.filter((r) => !r.important);
      case INBOX_TYPE.UNREAD_FIRST:
        return sortedBase.filter((r) => r.read);
      case INBOX_TYPE.STARRED_FIRST:
        return sortedBase.filter((r) => !r.starred);
      default:
        return sortedBase;
    }
  }, [sortedBase, inboxType]);

  // ────────── Paginate only the "everything else" section
  const paginatedOthers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return everythingElse.slice(startIndex, endIndex);
  }, [everythingElse, currentPage, itemsPerPage]);

  const rows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedBase.slice(startIndex, endIndex);
  }, [sortedBase, currentPage, itemsPerPage]);

  const showMailBanner = useMemo(() => {
    return inboxType === INBOX_TYPE.DEFAULT
  }, [inboxType]);

  useEffect(() => {
    // Calculate total unread emails count
    const unreadCount = emails.filter((email) => !email.read).length;
    const unreadText = unreadCount > 0 ? `(${unreadCount})` : "";
    document.title = `Inbox ${unreadText} - ${loggedInUser.email} - MailG`;
  }, [emails, loggedInUser.email]);

  useEffect(() => {
    setCurrentPage(1);
    setSortOrder("newest");
  }, [activeInboxTab, activeFolder]);

  useEffect(() => {
    setPreviewEmailId(null);
  }, [activeFolder, label]);

  const renderEmailListPanel = () => (
    <>
      {(inboxType !== INBOX_TYPE.DEFAULT &&
        activeFolder.toLowerCase() === "inbox") && (
          <div style={{ flex: 1, height: "100%", overflowY: "auto" }}>
            {inboxType === INBOX_TYPE.IMPORTANT_FIRST && (
              <InboxSection
                title="Important"
                emails={sortedImportant}
                setShowAdvancedMenu={setShowAdvancedMenu}
              >
                <EmailList
                  emails={sortedImportant.slice(0, 25)}
                  setShowAdvancedMenu={setShowAdvancedMenu}
                  showFooter={false}
                />
              </InboxSection>
            )}

            {inboxType === INBOX_TYPE.UNREAD_FIRST && (
              <InboxSection
                title="Unread"
                emails={sortedUnread}
                setShowAdvancedMenu={setShowAdvancedMenu}
              >
                <EmailList
                  emails={sortedUnread.slice(0, 25)}
                  setShowAdvancedMenu={setShowAdvancedMenu}
                  showFooter={false}
                />
              </InboxSection>
            )}

            {inboxType === INBOX_TYPE.STARRED_FIRST && (
              <InboxSection
                title="Starred"
                emails={sortedStarred}
                setShowAdvancedMenu={setShowAdvancedMenu}
              >
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
        <ToolBar
          totalFilteredItems={baseSource.length}
          threads={rows}
          showAdvancedMenu={showAdvancedMenu}
          setShowAdvancedMenu={setShowAdvancedMenu}
          showPagination={inboxType === INBOX_TYPE.DEFAULT}
        />

        {showMailBanner && (
          <Banner
            rows={filteredRows}
            activeInboxTab={activeInboxTab}
            setActiveInboxTab={setActiveInboxTab}
          />
        )}

      {showSplit ? (
        <PanelGroup direction={panelDirection} id="inbox-root-panel-group">
            <Panel defaultSize={50} minSize={25} style={{
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}>
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
              minHeight: 0
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
