import React, { useContext, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import EmailList from "../components/EmailList";
import { GlobalContext } from "../contexts/GlobalContext";
import ToolBar from "../components/ToolBar";
// switched to thread-based rows derived from raw messages
import { getThreadRows } from "../utils/emails";
import { buildSearchIndex, searchEmails, isSearchIndexReady } from "../utils/search";
import SearchResultFilters from "../components/SearchResultFilters";

const SearchResultsView = () => {
  const { emails, currentPage, itemsPerPage } = useContext(GlobalContext);

  const { query } = useParams();
  const searchQuery = query ? decodeURIComponent(query) : "";

  // Build search index when emails are available
  useEffect(() => {
    if (emails && emails.length > 0) {
      buildSearchIndex(emails);
    }
  }, [emails]);

  // Get search results based on query
  const searchResults = useMemo(() => {
    if (!isSearchIndexReady() || !searchQuery.trim()) {
      return [];
    }
    // Remove limit for search results page - we want all results
    return searchEmails(searchQuery, { limit: null });
  }, [searchQuery]);

  // Convert search results to thread rows format
  const filteredRows = useMemo(() => {
    if (!searchResults.length) {
      return [];
    }
    // Convert search results back to email format and create thread rows
    const searchResultEmails = searchResults
      .map((result) => emails.find((email) => email.id === result.id))
      .filter(Boolean);

    return getThreadRows(searchResultEmails, {});
  }, [searchResults, emails]);

  const rows = useMemo(() => {
    const sortedEmails = [...filteredRows].sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB - dateA;
    });

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    return sortedEmails.slice(startIndex, endIndex);
  }, [filteredRows, currentPage, itemsPerPage]);

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
                    <SearchResultFilters />
                    <div className="bGI nH oy8Mbf aE3 S4" role="main" jslog="82433; u014N:xr6bB; 31:Wy0xLDEsNTBd">
                      <ToolBar totalFilteredItems={filteredRows.length} threads={rows} />
                      <div />
                      <div className="X3" />
                      <div className="a0V">
                        <h2 tabIndex={-1}>{searchQuery ? `Search results for "${searchQuery}"` : "Search Results"}</h2>
                      </div>
                      <div
                        className="Nr UI S2 vy"
                        jsname="zI2Cje"
                        jscontroller="o6WV1d"
                        jsaction="rcuQ6b:npT2md;jo33Se:PhqmKf;Rb1Lod:ZpywWb;J0lErd:Oyw2Hb;nGJuB:OcHC8;ZvXgGe:Csi5td;fbYNtb:.CLIENT;UGzfzc:.CLIENT;njKHYb:.CLIENT"
                        gh="tl"
                      >
                        <div className="Nu tf aZ6" jsname="xSLh2d" style={{ flexGrow: 100 }}>
                          <div jsaction="oehdpb:.CLIENT;UXdbee:.CLIENT">
                            <div className="aDP">
                              <div
                                className="ae4 aDM"
                                jslog="20294; u014N:xr6bB"
                                id=":1z"
                                role="tabpanel"
                                aria-labelledby=":23"
                              >
                                <div>
                                  <div className="Wg aAD aAz sf-hidden" />
                                  <div className="aVj" style={{ display: "none" }} />
                                </div>
                                <div className="Cp">
                                  <div>
                                    <table
                                      cellPadding={0}
                                      id=":2x"
                                      className="F cf zt"
                                      role="grid"
                                      aria-readonly="true"
                                    >
                                      <EmailList emails={rows} />
                                    </table>
                                  </div>
                                </div>
                                <div className="VNyZ8c" style={{ display: "none" }} />
                              </div>
                              <div
                                className="ae4 aDM"
                                jslog="20290; u014N:xr6bB"
                                id=":20"
                                role="tabpanel"
                                aria-labelledby=":24"
                                style={{ display: "none" }}
                              />
                              <div
                                className="ae4 aDM"
                                jslog="20292; u014N:xr6bB"
                                id=":21"
                                role="tabpanel"
                                aria-labelledby=":25"
                                style={{ display: "none" }}
                              />
                              <div
                                className="ae4 aDM"
                                jslog="20293; u014N:xr6bB"
                                id=":22"
                                role="tabpanel"
                                aria-labelledby=":26"
                                style={{ display: "none" }}
                              />
                            </div>
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

export default SearchResultsView;
