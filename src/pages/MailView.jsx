import React, { useContext, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";

import EmailList from "../components/EmailList";
import { GlobalContext } from "../contexts/GlobalContext";
import ToolBar from "../components/ToolBar";
// switched to thread-based rows derived from raw messages
import { getThreadRows } from "../utils/emails";

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
    <div className="nH bkK">
      <div className="nH">
        <div className="nH ar4 z">
          <div>
            <div id=":4" className="aeH" />
            <div className="AO">
              <div id=":3" className="Tm">
                <div id=":1" className="aeF" style={{ minHeight: 795 }}>
                  <div className="nH">
                    <div className="bGI nH oy8Mbf aE3 S4" role="main">
                      <ToolBar totalFilteredItems={filteredRows.length} threads={rows} />
                      <div />
                      <div className="X3" />
                      <div className="a0V">
                        <h2 tabIndex={-1}>Conversations</h2>
                      </div>
                      <div className="afn sf-hidden" />

                      <div />
                      <div className="aKB afn sf-hidden" />
                      <div className="Nr UI S2 vy">
                        <EmailList emails={rows} />

                        <div className="Nt sf-hidden" jsname="dt0bVc" />
                        <div
                          className="Nu S3 aZ6 sf-hidden"
                          id=":1d"
                          jsname="h50Ewe"
                          style={{ flexGrow: 0, height: 0 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div id=":2" className="aeG" style={{ display: "none" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inbox;
