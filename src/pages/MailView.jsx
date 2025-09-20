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
              <div id=":3" className="Tm" style={{ height: 985 }}>
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
                        <div className="Nu tf aZ6" style={{ flex: 1, display: "flex" }}>
                          <EmailList emails={rows} />

                          <div className="l2 pfiaof V4" role="contentinfo">
                            <div id=":2q" className="aeV">
                              <div>
                                <div className="ajd">
                                  <div className="aiF">
                                    <a className="bcB" href="#">
                                      <div className="aiC" jslog="108909; u014N:cOuCgd,Kr2w4b,xr6bB; 40:WzFd">
                                        <div className="aiA" style={{ width: "15%" }} />
                                      </div>
                                      <div className="aiG" jslog="108910; u014N:cOuCgd,Kr2w4b,xr6bB; 40:WzFd">
                                        <div className="aiD">
                                          <span dir="ltr">15%</span>
                                          of <span dir="ltr">15 GB</span>
                                          used
                                        </div>
                                        <div className="aiz" role="img" aria-label="Follow link to manage storage" />
                                      </div>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="aeU">
                              <div id=":2p">
                                <div>
                                  <div className="ma">
                                    <a href="#" className="l9">
                                      Terms
                                    </a>
                                    ·{" "}
                                    <a href="#" className="l9">
                                      Privacy
                                    </a>
                                    ·{" "}
                                    <a href="#" className="l9">
                                      Program Policies
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div id=":2n" className="ae3">
                              <div>
                                <div className="l6">
                                  <div>Last account activity: 25 minutes ago</div>
                                  <span id=":o8" className="l8 LJOhwe" tabIndex={0} role="link">
                                    Details
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div style={{ clear: "both" }} />
                          </div>
                        </div>
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
