import React, { useContext, useMemo, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import EmailList from "../components/EmailList";
import { GlobalContext } from "../contexts/GlobalContext";
import ToolBar from "../components/ToolBar";
// switched to thread-based rows derived from raw messages
import { getThreadRows } from "../utils/emails";
import styled from "@emotion/styled";
import QuickSettings from "../components/QuickSettings";

const Container = styled.div`
  overflow: hidden;
  flex: 1;
  display: flex;
  max-width: 100%;
  border-radius: 16px;
  background-color: #fff;
`;

const EmailListContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: ${(props) => `calc(100vh - ${props.vacationResponderEnabled ? "98px" : "64px"})`};
  flex: 1;
  min-width: 0; /* Allows flex item to shrink below content size */
`;

import Banner from "../components/Banners";
import { CATEGORIES } from "../utils/categories";

const Inbox = () => {
  const {
    emails,
    sortOrder,
    setCurrentPage,
    currentPage,
    itemsPerPage,
    loggedInUser,
    vacationResponder,
    setSortOrder,
  } = useContext(GlobalContext);

  const { folder, label: labelParam } = useParams();
  const label = labelParam ? decodeURIComponent(labelParam) : null;
  const activeFolder = folder || "inbox";

  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);
  const [activeInboxTab, setActiveInboxTab] = useState(CATEGORIES.Primary);

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

  // Determine what rows to display based on active folder
  let displayRows;
  if (activeFolder.toLowerCase() === "inbox") {
    displayRows = tabFilteredRows;
  } else {
    displayRows = filteredRows;
  }

  // Sort and paginate the displayRows
  const baseSource = !label && activeFolder.toLowerCase() === "inbox" ? tabFilteredRows : filteredRows;

  const rows = useMemo(() => {
    const sortedThreads = [...baseSource].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedThreads.slice(startIndex, endIndex);
  }, [baseSource, currentPage, itemsPerPage]);

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

  return (
    <Container id="cont-123">
      <EmailListContainer role="main" vacationResponderEnabled={vacationResponder.enabled}>
        <ToolBar
          totalFilteredItems={baseSource.length}
          threads={rows}
          showAdvancedMenu={showAdvancedMenu}
          setShowAdvancedMenu={setShowAdvancedMenu}
        />
        <Banner rows={filteredRows} activeInboxTab={activeInboxTab} setActiveInboxTab={setActiveInboxTab} />
        <EmailList emails={rows} setShowAdvancedMenu={setShowAdvancedMenu} /> {/* TODO: some stuff */}
      </EmailListContainer>
      <QuickSettings />
    </Container>
  );
};

export default Inbox;
