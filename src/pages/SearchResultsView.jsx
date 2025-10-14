import React, { useContext, useMemo, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Stack, Button } from "@mui/material";
import EmailList from "../components/EmailList";
import { GlobalContext } from "../contexts/GlobalContext";
import ToolBar from "../components/ToolBar";
// switched to thread-based rows derived from raw messages
import { getThreadRows } from "../utils/emails";
import {
  buildSearchIndex,
  searchEmails,
  isSearchIndexReady,
  initializeSearchIndex,
  advancedSearchWithFullData,
  createSearchSummary,
} from "../utils/search";
import { buildSearchBarFromUrl } from "../utils/helperFunctions";
import SearchResultFilters from "../components/SearchResultFilters";

const SearchResultsView = () => {
  const { emails, currentPage, itemsPerPage } = useContext(GlobalContext);
  const location = useLocation();

  const searchQuery = useMemo(() => buildSearchBarFromUrl(location), [location]);

  // Check if this is an advanced search
  const isAdvancedSearch = location.pathname.startsWith("/search/advanced");
  const searchParams = new URLSearchParams(location.search);

  // Initialize search index on component mount
  useEffect(() => {
    // Try to restore from localStorage first
    initializeSearchIndex();
  }, []);

  // Build search index when emails are available
  useEffect(() => {
    if (emails && emails.length > 0) {
      buildSearchIndex(emails);
    }
  }, [emails]);

  // Get search results based on query type
  const searchResults = useMemo(() => {
    if (isAdvancedSearch) {
      // Handle advanced search with criteria from URL params
      const sizeOperator = searchParams.get("sizeOperator") || "less than";
      const searchCriteria = {
        from: searchParams.get("from") || "",
        to: searchParams.get("to") || "",
        subject: searchParams.get("subject") || "",
        has: searchParams.get("has") || "",
        hasnot: searchParams.get("hasnot") || "",
        size: searchParams.get("size") || "",
        sizeOperator: sizeOperator.replace(/_/g, " "), // Convert underscores to spaces
        sizeUnit: searchParams.get("sizeUnit") || "MB",
        within: searchParams.get("within") || "",
        date: searchParams.get("date") || "",
        subset: searchParams.get("subset") || "",
        attachment: searchParams.get("attachment") === "true",
        excludeChats: searchParams.get("excludeChats") === "true",
      };

      // Use advanced search with full email data
      return advancedSearchWithFullData(searchCriteria, emails, { limit: null });
    } else {
      // Handle regular text search
      if (!isSearchIndexReady() || !searchQuery.trim()) {
        return [];
      }
      // Remove limit for search results page - we want all results
      return searchEmails(searchQuery, { limit: null });
    }
  }, [searchQuery, emails, isAdvancedSearch, searchParams]); // Add dependencies

  // Convert search results to thread rows format
  const filteredRows = useMemo(() => {
    if (!searchResults.length) {
      return [];
    }

    // For advanced search, searchResults are already full email objects
    // For regular search, they might be search index results that need to be mapped
    const searchResultEmails = isAdvancedSearch
      ? searchResults // Already full email objects
      : searchResults.map((result) => emails.find((email) => email.id === result.id)).filter(Boolean);

    // Pass folder: null to prevent getThreadRows from filtering by folder
    const threadRows = getThreadRows(searchResultEmails, { folder: null });

    return threadRows;
  }, [searchResults, emails, isAdvancedSearch]);

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
                    {rows.length > 0 && <SearchResultFilters />}

                    <div className="bGI nH oy8Mbf aE3 S4" role="main" jslog="82433; u014N:xr6bB; 31:Wy0xLDEsNTBd">
                      <ToolBar totalFilteredItems={filteredRows.length} threads={rows} />
                      <div />
                      <div className="X3" />
                      <div className="a0V">
                        <h2 tabIndex={-1}>
                          {isAdvancedSearch
                            ? `Advanced Search Results (${createSearchSummary({
                                from: searchParams.get("from") || "",
                                to: searchParams.get("to") || "",
                                subject: searchParams.get("subject") || "",
                                has: searchParams.get("has") || "",
                                hasnot: searchParams.get("hasnot") || "",
                                within: searchParams.get("within") || "",
                                date: searchParams.get("date") || "",
                                subset: searchParams.get("subset") || "",
                                attachment: searchParams.get("attachment") === "true",
                                excludeChats: searchParams.get("excludeChats") === "true",
                              })})`
                            : searchQuery
                            ? `Search results for "${searchQuery}"`
                            : "Search Results"}
                        </h2>
                      </div>
                      <div
                        className="Nr UI S2 vy"
                        jsname="zI2Cje"
                        jscontroller="o6WV1d"
                        jsaction="rcuQ6b:npT2md;jo33Se:PhqmKf;Rb1Lod:ZpywWb;J0lErd:Oyw2Hb;nGJuB:OcHC8;ZvXgGe:Csi5td;fbYNtb:.CLIENT;UGzfzc:.CLIENT;njKHYb:.CLIENT"
                        gh="tl"
                      >
                        {rows.length > 0 ? (
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
                                        <EmailList emails={rows} showFooter={false} />
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
                        ) : (
                          <Stack
                            sx={{ bgcolor: "ffffffcc", width: "100%", textAlign: "center", py: 2, fontSize: "14px" }}
                          >
                            <p>
                              No messages matched your search. You can{" "}
                              <Button
                                variant="text"
                                sx={{
                                  height: "16px",
                                  textDecoration: "underline",
                                  color: "#1a73e8",
                                  fontSize: "14px",
                                  textTransform: "none",
                                  fontWeight: "400",
                                  p: 0,
                                  "&:hover": {
                                    textDecoration: "underline !important",
                                  },
                                }}
                              >
                                broaden your search
                              </Button>{" "}
                              to look in "Mail &amp; Spam &amp; Trash".
                            </p>
                            <Button
                              variant="text"
                              href="https://support.google.com/mail/answer/6593?hl=en"
                              aria-label="Learn more about broadening your search"
                              target="_blank"
                              sx={{
                                color: "#1a73e8",
                                fontSize: "14px",
                                textTransform: "none",
                                fontWeight: "400",
                                width: "fit-content",
                                mx: "auto",
                              }}
                            >
                              Learn more
                            </Button>
                          </Stack>
                        )}
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
