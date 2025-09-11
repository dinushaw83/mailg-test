import React, { useContext, useMemo } from "react";
import { useParams } from "react-router-dom";

import EmailList from "../components/EmailList";
import { GlobalContext } from "../contexts/GlobalContext";
import ToolBar from "../components/ToolBar";
// switched to thread-based rows derived from raw messages
import { getThreadRows } from "../utils/emails";

const Inbox = () => {
  const { emails, sortOrder, currentPage, itemsPerPage } = useContext(GlobalContext);

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
    const sortedEmails = [...filteredRows].sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);

      if (sortOrder === "newest") {
        return dateB - dateA;
      } else {
        return dateA - dateB;
      }
    });

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    return sortedEmails.slice(startIndex, endIndex);
  }, [filteredRows, sortOrder, currentPage, itemsPerPage]);

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
                      <div className="aKh" jsaction="taiVP:.CLIENT">
                        <table className="aKk">
                          <tbody>
                            <tr
                              className="aAA J-KU-Jg J-KU-Jg-K9"
                              role="tablist"
                              aria-activedescendant=""
                              style={{ userSelect: "none" }}
                            >
                              <td
                                className="aRz J-KU"
                                role="heading"
                                aria-level={3}
                                style={{
                                  userSelect: "none",
                                  width: 253,
                                }}
                              >
                                <div
                                  className="aAy J-KU-KO aIf-aLe"
                                  tabIndex={0}
                                  role="tab"
                                  jslog="162884; u014N:xr6bB; 16:WzFd"
                                  aria-selected="true"
                                  id=":27"
                                  aria-controls=":1z"
                                  aria-label="Primary"
                                  style={{
                                    userSelect: "none",
                                    width: 251,
                                    borderLeftWidth: 1,
                                  }}
                                >
                                  <div className="aKu aKo aKq sf-hidden" style={{ userSelect: "none" }} />
                                  <div className="aKo sf-hidden" style={{ userSelect: "none" }} />
                                  <div className="aKu aKo aKr sf-hidden" style={{ userSelect: "none" }} />
                                  <div className="aKp aIf-aLf" style={{ userSelect: "none" }} />
                                  <div className="aKw" style={{ userSelect: "none" }}>
                                    <div className="aKy" style={{ userSelect: "none" }}>
                                      <div className="aKx" style={{ userSelect: "none" }}>
                                        <div
                                          className="aDG"
                                          style={{
                                            display: "none",
                                            userSelect: "none",
                                          }}
                                          data-tooltip-align="t,l"
                                        />
                                        <div
                                          id=":23"
                                          className="aKz"
                                          data-tooltip-align="t,l"
                                          data-tooltip="Person-to-person conversations and messages that don't appear in other tabs."
                                          style={{ userSelect: "none" }}
                                        >
                                          Primary
                                        </div>
                                      </div>
                                      <div className="aKv" style={{ userSelect: "none" }} />
                                    </div>
                                    <div className="aKn" style={{ userSelect: "none" }} />
                                    <div className="aKs" style={{ userSelect: "none" }} />
                                  </div>
                                </div>
                              </td>
                              <td
                                className="aRz J-KU"
                                role="heading"
                                aria-level={3}
                                style={{
                                  userSelect: "none",
                                  width: 253,
                                }}
                              >
                                <div
                                  className="aAy aJi-aLe aE2"
                                  tabIndex={0}
                                  role="tab"
                                  jslog="162884; u014N:xr6bB; 16:WzNd"
                                  aria-selected="false"
                                  id=":28"
                                  aria-controls=":20"
                                  aria-label="Promotions, one new message,"
                                  style={{
                                    userSelect: "none",
                                    width: 252,
                                  }}
                                >
                                  <div className="aKu aKo aKq sf-hidden" style={{ userSelect: "none" }} />
                                  <div className="aKo sf-hidden" style={{ userSelect: "none" }} />
                                  <div className="aKu aKo aKr sf-hidden" style={{ userSelect: "none" }} />
                                  <div className="aKp aJi-aLf" style={{ userSelect: "none" }} />
                                  <div className="aKw" style={{ userSelect: "none" }}>
                                    <div className="aKy" style={{ userSelect: "none" }}>
                                      <div className="aKx" style={{ userSelect: "none" }}>
                                        <div className="aDG" style={{ userSelect: "none" }} data-tooltip-align="t,l">
                                          1 new
                                        </div>
                                        <div
                                          id=":24"
                                          className="aKz"
                                          data-tooltip-align="t,l"
                                          data-tooltip="Marketing, interests, social and political causes, and other promotional emails."
                                          style={{ userSelect: "none" }}
                                        >
                                          Promotions
                                        </div>
                                      </div>
                                      <div className="aKv" style={{ userSelect: "none" }} />
                                    </div>
                                    <div className="aKn" style={{ userSelect: "none" }} />
                                    <div className="aKs" style={{ userSelect: "none" }}>
                                      Ethiopian Airlines — Skip the Rush, Savor the Trip – 10% Off Now
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td
                                className="aRz J-KU"
                                role="heading"
                                aria-level={3}
                                style={{
                                  userSelect: "none",
                                  width: 253,
                                }}
                              >
                                <div
                                  className="aAy aKe-aLe"
                                  tabIndex={0}
                                  role="tab"
                                  jslog="162884; u014N:xr6bB; 16:WzJd"
                                  aria-selected="false"
                                  id=":29"
                                  aria-controls=":21"
                                  aria-label="Social"
                                  style={{
                                    userSelect: "none",
                                    width: 252,
                                  }}
                                >
                                  <div className="aKu aKo aKq sf-hidden" style={{ userSelect: "none" }} />
                                  <div className="aKo sf-hidden" style={{ userSelect: "none" }} />
                                  <div className="aKu aKo aKr sf-hidden" style={{ userSelect: "none" }} />
                                  <div className="aKp aKe-aLf" style={{ userSelect: "none" }} />
                                  <div className="aKw" style={{ userSelect: "none" }}>
                                    <div className="aKy" style={{ userSelect: "none" }}>
                                      <div className="aKx" style={{ userSelect: "none" }}>
                                        <div
                                          className="aDG"
                                          style={{
                                            display: "none",
                                            userSelect: "none",
                                          }}
                                          data-tooltip-align="t,l"
                                        />
                                        <div
                                          id=":25"
                                          className="aKz"
                                          data-tooltip-align="t,l"
                                          data-tooltip="Messages from social networks, media-sharing sites, online dating services, and other social websites."
                                          style={{ userSelect: "none" }}
                                        >
                                          Social
                                        </div>
                                      </div>
                                      <div className="aKv" style={{ userSelect: "none" }} />
                                    </div>
                                    <div className="aKn" style={{ userSelect: "none" }} />
                                    <div className="aKs" style={{ userSelect: "none" }} />
                                  </div>
                                </div>
                              </td>
                              <td
                                className="aRz J-KU"
                                role="heading"
                                aria-level={3}
                                style={{
                                  userSelect: "none",
                                  width: 253,
                                }}
                              >
                                <div
                                  className="aAy aH2-aLe aE2"
                                  tabIndex={0}
                                  role="tab"
                                  jslog="162884; u014N:xr6bB; 16:WzRd"
                                  aria-selected="false"
                                  id=":2a"
                                  aria-controls=":22"
                                  aria-label="Updates, 2 new messages,"
                                  style={{
                                    userSelect: "none",
                                    width: 252,
                                  }}
                                >
                                  <div className="aKu aKo aKq sf-hidden" style={{ userSelect: "none" }} />
                                  <div className="aKo sf-hidden" style={{ userSelect: "none" }} />
                                  <div className="aKu aKo aKr sf-hidden" style={{ userSelect: "none" }} />
                                  <div className="aKp aH2-aLf" style={{ userSelect: "none" }} />
                                  <div className="aKw" style={{ userSelect: "none" }}>
                                    <div className="aKy" style={{ userSelect: "none" }}>
                                      <div className="aKx" style={{ userSelect: "none" }}>
                                        <div className="aDG" style={{ userSelect: "none" }} data-tooltip-align="t,l">
                                          2 new
                                        </div>
                                        <div
                                          id=":26"
                                          className="aKz"
                                          data-tooltip-align="t,l"
                                          data-tooltip="Personal, auto-generated updates including confirmations, receipts, bills, and statements."
                                          style={{ userSelect: "none" }}
                                        >
                                          Updates
                                        </div>
                                      </div>
                                      <div className="aKv" style={{ userSelect: "none" }} />
                                    </div>
                                    <div className="aKn" style={{ userSelect: "none" }} />
                                    <div className="aKs" style={{ userSelect: "none" }}>
                                      Superlist Team — Back to School Special: Save 25% 🎉
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="aRy" style={{ userSelect: "none" }}>
                                <div
                                  className="aKj jOWHyd sf-hidden"
                                  tabIndex={0}
                                  role="button"
                                  aria-label="Select which tabs to show or hide."
                                  style={{ userSelect: "none" }}
                                />
                              </td>
                              <td className="aRx" style={{ userSelect: "none" }}>
                                <div className="aKi" style={{ userSelect: "none" }} />
                              </td>
                            </tr>
                            <tr>
                              <td className="aKl sf-hidden" colSpan={6}></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div />
                      <div className="aKB afn sf-hidden" />
                      <div
                        className="Nr UI S2 vy"
                        jsname="zI2Cje"
                        jscontroller="o6WV1d"
                        jsaction="rcuQ6b:npT2md;jo33Se:PhqmKf;Rb1Lod:ZpywWb;J0lErd:Oyw2Hb;nGJuB:OcHC8;ZvXgGe:Csi5td;fbYNtb:.CLIENT;UGzfzc:.CLIENT;njKHYb:.CLIENT"
                        gh="tl"
                      >
                        <div className="Nu tf aZ6" jsname="xSLh2d" style={{ flexGrow: 100, height: 897 }}>
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
