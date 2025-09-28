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
  min-height: 795px;
  display: flex;
  max-width: 100%;
  border-radius: 16px;
  background-color: #fff;
`;

const EmailListContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  flex: 1;
  min-width: 0; /* Allows flex item to shrink below content size */
`;

import Banner from "../components/Banners";

const Inbox = () => {
  const { emails, sortOrder, currentPage, itemsPerPage, loggedInUser } = useContext(GlobalContext);

  const { folder, label: labelParam } = useParams();
  const label = labelParam ? decodeURIComponent(labelParam) : null;
  const activeFolder = folder || "inbox";

  // Build thread rows: one row per thread
  const filteredRows = useMemo(() => {
    return getThreadRows(emails, { label, folder: activeFolder });
  }, [emails, label, activeFolder]);

  // pick rows based on folder/label, then sort and paginate
  const rows = useMemo(() => {
    // Sort emails based on sortOrder
    const sortedThreads = [...filteredRows].sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB - dateA;
    });

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    return sortedThreads.slice(startIndex, endIndex);
  }, [filteredRows, currentPage, itemsPerPage]);

  useEffect(() => {
    document.title = `Inbox(2) - ${loggedInUser.email} - MailG`;
  }, []);

  return (
    <Container id="cont-123">
      <EmailListContainer role="main">
        <ToolBar totalFilteredItems={filteredRows.length} threads={rows} />
        <Banner rows={rows} />
        <EmailList emails={rows} />
      </EmailListContainer>
      <QuickSettings />
    </Container>
  );
};

export default Inbox;
