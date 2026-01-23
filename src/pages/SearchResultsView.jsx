import { Button, Stack } from "@mui/material";
import React, { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { createSearchSummary } from "../utils/search";
import { buildSearchParams } from "../utils/searchParams";
import { fetchSearchResults } from "../store/slices/mailSlice";

import EmailList from "../components/EmailList";
import SearchResultFilters from "../components/SearchResultFilters";
import ToolBar from "../components/ToolBar";
import { buildSearchBarFromUrl } from "../utils/helperFunctions";
// switched to thread-based rows derived from raw messages
import { getThreadRows } from "../utils/emails";
import { useGlobalContext } from "../contexts/GlobalContext";

const SearchResultsView = () => {
  const { currentPage, itemsPerPage } = useGlobalContext();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const searchQuery = useMemo(() => buildSearchBarFromUrl(location), [location.search, location.pathname]);
  const { apiParams, originalParams } = useMemo(
    () =>
      buildSearchParams(location, {
        page: currentPage,
        pageSize: itemsPerPage,
      }),
    [location.search, location.pathname, currentPage, itemsPerPage]
  );

  // Get search results from Redux store
  const { searchResults, searchLoading, searchError, searchPagination, searchOriginalParams } = useSelector(
    (state) => state.mail
  );

  // Check if this is an advanced search
  const isAdvancedSearch = location.pathname.startsWith("/search/advanced");
  const searchParams = new URLSearchParams(location.search);

  // Fetch search results from backend when URL changes
  useEffect(() => {
    // Reroute user to /inbox if no query or params are present
    // if (!searchQuery) {
    //   navigate("/inbox", { replace: true });
    //   return;
    // }

    // Dispatch search action
    dispatch(fetchSearchResults({ ...apiParams, originalParams }));
  }, [currentPage, searchQuery, apiParams, originalParams]);

  // Convert search results to thread rows format
  const rows = useMemo(() => {
    if (!searchResults?.length) {
      return [];
    }

    // Pass folder: null to prevent getThreadRows from filtering by folder
    let threadRows = getThreadRows(searchResults, { folder: null });

    // If filtering by "is unread", ensure thread has unread messages
    // (thread.is_read is based on last message, but we want threads with ANY unread messages)
    if (searchParams.get("is_unread") === "true") {
      threadRows = threadRows.filter((thread) => thread.unreadCount > 0);
    }

    return threadRows;
  }, [searchResults, searchParams]);

  const showSearchFilters = useMemo(() => {
    return rows.length > 0 || searchParams.get("isrefinement") === "true";
  }, [rows, searchParams]);

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
                    {showSearchFilters && <SearchResultFilters />}

                    <div className="bGI nH oy8Mbf aE3 S4" role="main" jslog="82433; u014N:xr6bB; 31:Wy0xLDEsNTBd">
                      <ToolBar totalFilteredItems={rows.length} threads={rows} />
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
                        {searchLoading && (
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
                                            <Stack
                                              sx={{ bgcolor: "ffffffcc", width: "100%", textAlign: "center", py: 4 }}
                                            >
                                              <p>Searching...</p>
                                            </Stack>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {searchError && (
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
                                            <Stack
                                              sx={{ bgcolor: "ffffffcc", width: "100%", textAlign: "center", py: 4 }}
                                            >
                                              <p>Error: {searchError}</p>
                                            </Stack>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {!searchLoading &&
                          !searchError &&
                          (rows.length > 0 ? (
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
                                          <EmailList emails={rows} showFooter={false} searchQuery={searchQuery} />
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
                                href="#"
                                aria-label="Learn more about broadening your search"
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
                          ))}
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
