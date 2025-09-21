import React, { useContext, useMemo, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import EmailList from "../components/EmailList";
import { GlobalContext } from "../contexts/GlobalContext";
import ToolBar from "../components/ToolBar";
// switched to thread-based rows derived from raw messages
import { getThreadRows } from "../utils/emails";
import styled from "@emotion/styled";

const Container = styled.div`
  overflow: hidden;
  flex: 1;
  min-height: 795px;
  display: flex;
  max-width: 100%;
`;

const EmailListContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  background-color: #a9f3a9;
  flex: 1;
  min-width: 0; /* Allows flex item to shrink below content size */
`;

const QuickSettings = styled.div`
  width: 300px; /* Fixed width for the right panel */
  min-width: 200px; /* Minimum width */
  background-color: #f0f0f0;
  border-left: 1px solid #ddd;
  padding: 16px;
  position: relative;
  display: flex;
  flex-direction: column;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #666;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;

  &:hover {
    background-color: #e0e0e0;
    color: #333;
  }

  &:focus {
    outline: 2px solid #4285f4;
    outline-offset: 2px;
  }
`;

const QuickSettingsContent = styled.div`
  margin-top: 24px;
  flex: 1;
`;

const Inbox = () => {
  const { emails, sortOrder, currentPage, itemsPerPage, loggedInUser, showQuickSettings, setShowQuickSettings } =
    useContext(GlobalContext);

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
        <ToolBar
          totalFilteredItems={filteredRows.length}
          threads={rows}
          showQuickSettings={showQuickSettings}
          onToggleQuickSettings={() => setShowQuickSettings(!showQuickSettings)}
        />
        <EmailList emails={rows} />
      </EmailListContainer>
      {showQuickSettings && (
        <QuickSettings>
          <CloseButton
            onClick={() => setShowQuickSettings(false)}
            aria-label="Close Quick Settings"
            title="Close Quick Settings"
          >
            ×
          </CloseButton>
          <QuickSettingsContent>
            <h3 style={{ margin: 0, marginBottom: 16, fontSize: 16, fontWeight: 500 }}>Quick Settings</h3>
            <p style={{ margin: 0, color: "#666", fontSize: 14 }}>
              Configure your email preferences and settings here.
            </p>
          </QuickSettingsContent>
        </QuickSettings>
      )}
    </Container>
  );
};

export default Inbox;
