import React, { useEffect } from "react";
import { IconButton, Tooltip } from "@mui/material";
import { useGlobalContext } from "../contexts/GlobalContext";
import RightSideBarTabs from "./RightSidebarTabs/RightSideBarTabs";
import styles from "./RightSidebar.module.css";

const RightSidebar = () => {
  const { rightSidebarExpanded, setRightSidebarExpanded, rightSidebarActiveTab, setRightSidebarActiveTab, vacationResponder } =
    useGlobalContext();

  useEffect(
    () => () => {
      // If active right sidebar tab screen is CREATE_CONTACT or EDIT_CONTACT, set it to null on unmount
      if (
        rightSidebarActiveTab.contact.screen === "CREATE_CONTACT" ||
        rightSidebarActiveTab.contact.screen === "EDIT_CONTACT"
      ) {
        setRightSidebarActiveTab((prev) => ({ ...prev, contact: { screen: null } }));
      }
    },
    []
  );

  // Handle the right sidebar tab icon click
  const handleTabIconClick = (tabName) => {
    if (tabName === rightSidebarActiveTab.activeTab) {
      setRightSidebarActiveTab((prev) => ({ ...prev, activeTab: null }));
    } else {
      setRightSidebarActiveTab((prev) => ({ ...prev, activeTab: tabName }));
    }
  };

  return (
    <div
      className={`nH ${styles.rightSidebar}`}
      style={{
        width: rightSidebarExpanded ? (rightSidebarActiveTab.activeTab ? "376px" : "56px") : "16px",
        height: `calc(100vh - ${vacationResponder.enabled ? '64px' : '98px'})`,
      }}
    >
      {/* Tab Content Area - Left side */}
      <div
        className={`${styles.rightSidebarContentTabsWrapper} ${
          (!rightSidebarActiveTab.activeTab || !rightSidebarExpanded) && styles.hideContent
        }`}
      >
        <RightSideBarTabs />
      </div>

      {/* Sidebar Icons - Right side */}
      <div className="aUx" style={{ width: "56px" }}>
        <div className="WN9Ejb br3" jsaction="oqYoCb:.CLIENT;LbSNDf:.CLIENT;ETEZVb:.CLIENT">
          <div className="brC-brG" style={{ display: "none" }}>
            <div className="brC-brG-bsf-Jz-Jw">
              <div className="brC-brG-bsf-Jz-Jw">
                <div className="brC-brG-bsf-Jw" />
              </div>
            </div>
            <div className="brC-brG-bvJ-Jz-Jw">
              <div className="Xc" />
            </div>
            <div className="brC-brG-a9i-Jz-Jw" />
          </div>
        </div>
        <div 
          className={`bAw bcf it ${styles.rightSidebarContent}`} 
          style={{
            height: `calc(100vh - ${vacationResponder.enabled ? '45px' : '79px'})`,
          }}
          jsaction="cZRHAe:.CLIENT"
        >
          <div className="brC-aT5-aOt-Jw" role="complementary" aria-label="Side panel">
            <div className="brC-aT5-aOt-bsf-Jw">
              <div className={`brC-bsf-aT5-aOt ${styles.rightSidebarContentTabs}`} role="tablist" tabIndex={0}>
                <div
                  id="gsc-gab-6"
                  className="bse-bvF-I aT5-aOt-I bse-bvF-aLp"
                  data-guest-app-id={6}
                  role="tab"
                  aria-label="Calendar"
                  aria-disabled="false"
                  aria-selected="false"
                  style={{ userSelect: "none", display: "none" }}
                >
                  <div className="aT5-aOt-I-JX-atM aT5-aOt-I-JX-atM-Kv" style={{ userSelect: "none" }} />
                  <div className="aT5-aOt-I-JX-atM aT5-aOt-I-JX-atM-J6" style={{ userSelect: "none" }} />
                  <div
                    className="aT5-aOt-I-JX-Jw"
                    style={{
                      backgroundImage: 'url("https://www.gstatic.com/companion/icon_assets/calendar_2020q4_2x.png")',
                      userSelect: "none",
                    }}
                  />
                  <div className="bse-bvF-JX-axQ-avS Gs-avS" style={{ userSelect: "none" }} />
                </div>
                <div
                  id="gsc-gab-2"
                  className="bse-bvF-I aT5-aOt-I bse-bvF-a9p"
                  data-guest-app-id={2}
                  role="tab"
                  aria-label="Keep"
                  aria-disabled="false"
                  aria-selected="false"
                  style={{ userSelect: "none", display: "none" }}
                >
                  <div className="aT5-aOt-I-JX-atM aT5-aOt-I-JX-atM-Kv" style={{ userSelect: "none" }} />
                  <div className="aT5-aOt-I-JX-atM aT5-aOt-I-JX-atM-J6" style={{ userSelect: "none" }} />
                  <div
                    className="aT5-aOt-I-JX-Jw"
                    style={{
                      backgroundImage: 'url("https://www.gstatic.com/companion/icon_assets/keep_2020q4v3_2x.png")',
                      userSelect: "none",
                    }}
                  />
                  <div className="bse-bvF-JX-axQ-avS Gs-avS" style={{ userSelect: "none" }} />
                </div>
                <div
                  id="gsc-gab-4"
                  className="bse-bvF-I aT5-aOt-I bse-bvF-aLp"
                  data-guest-app-id={4}
                  role="tab"
                  aria-label="Tasks"
                  aria-disabled="false"
                  aria-selected="false"
                  style={{ userSelect: "none", display: "none" }}
                >
                  <div className="aT5-aOt-I-JX-atM aT5-aOt-I-JX-atM-Kv" style={{ userSelect: "none" }} />
                  <div className="aT5-aOt-I-JX-atM aT5-aOt-I-JX-atM-J6" style={{ userSelect: "none" }} />
                  <div
                    className="aT5-aOt-I-JX-Jw"
                    style={{
                      backgroundImage: 'url("https://www.gstatic.com/companion/icon_assets/tasks_2021_2x.png")',
                      userSelect: "none",
                    }}
                  />
                  <div className="bse-bvF-JX-axQ-avS Gs-avS" style={{ userSelect: "none" }} />
                </div>
                {/* Contacts */}
                <div className={styles.rightSidebarTabIconWrapper}>
                  <div className={styles.tabIconBorder} data-active={rightSidebarActiveTab.activeTab === "contact"} />
                  <Tooltip title="Contacts" placement="bottom">
                    <IconButton
                      size="medium"
                      onClick={() => handleTabIconClick("contact")}
                      sx={{
                        color: "#1f58cc",
                        backgroundColor: rightSidebarActiveTab.activeTab === "contact" ? "#e8f0fe" : "transparent",
                        "&:hover": {
                          backgroundColor: rightSidebarActiveTab.activeTab === "contact" ? "#d2e3fc" : "action.hover",
                        },
                      }}
                    >
                      <span class="material-symbols-filled" style={{ fontSize: "21px" }}>
                        contact_page
                      </span>
                    </IconButton>
                  </Tooltip>
                </div>
                <div
                  className="brC-aT5-aOt-axR"
                  role="separator"
                  style={{ userSelect: "none", display: "none" }}
                  aria-hidden="false"
                  aria-disabled="true"
                  id=":o7"
                />
                <div
                  className="brC-aT5-aOt-awd-avS"
                  role="presentation"
                  style={{ display: "none", userSelect: "none" }}
                  aria-hidden="true"
                  aria-disabled="true"
                  id=":o8"
                >
                  <div className="brC-aT5-aOt-awd-avS-dD brC-aT5-aOt-awd-avS-dD-a6" style={{ userSelect: "none" }} />
                  <div className="brC-aT5-aOt-awd-avS-dD brC-aT5-aOt-awd-avS-dD-Mz" style={{ userSelect: "none" }} />
                  <div className="brC-aT5-aOt-awd-avS-dD brC-aT5-aOt-awd-avS-dD-MC" style={{ userSelect: "none" }} />
                </div>
                <div
                  className="bse-bvF-I aT5-aOt-I"
                  role="tab"
                  aria-label="Get Add-ons"
                  aria-selected="false"
                  id="qJTzr"
                  style={{ userSelect: "none", display: "none" }}
                  aria-hidden="true"
                >
                  <div className="aT5-aOt-I-JX-atM aT5-aOt-I-JX-atM-Kv" />
                  <div className="aT5-aOt-I-JX-atM aT5-aOt-I-JX-atM-J6" />
                  <div
                    className="aT5-aOt-I-JX-Jw"
                    style={{
                      backgroundImage:
                        "url(https://fonts.gstatic.com/s/i/googlematerialicons/add/v21/black-24dp/1x/gm_add_black_24dp.png)",
                    }}
                  />
                  <div className="bse-bvF-JX-axQ-avS Gs-avS" style={{ backgroundColor: "#ffffff" }} />
                </div>
                <div
                  className="bse-bvF-I aT5-aOt-I brC-oH-M-I"
                  role="tab"
                  aria-label="More Add-ons"
                  aria-selected="false"
                  aria-expanded="false"
                  aria-haspopup="true"
                  id=":os"
                  style={{ userSelect: "none", display: "none" }}
                  aria-hidden="false"
                >
                  <div className="aT5-aOt-I-JX-atM aT5-aOt-I-JX-atM-Kv" />
                  <div className="aT5-aOt-I-JX-atM aT5-aOt-I-JX-atM-J6" />
                  <div
                    className="aT5-aOt-I-JX-Jw"
                    style={{
                      backgroundImage:
                        "url(//www.gstatic.com/images/icons/material/system/2x/more_horiz_grey600_24dp.png)",
                    }}
                  />
                  <div className="bse-bvF-JX-axQ-avS" style={{ backgroundColor: "#333" }} />
                </div>
              </div>
            </div>
          </div>

          {rightSidebarActiveTab.activeTab ? (
            // About
            <div style={{ marginBottom: "12px" }}>
              <Tooltip title="About" placement="top">
                <IconButton size="medium">
                  <span className="material-symbols-outlined" style={{ fontSize: 21 }}>
                    info
                  </span>
                </IconButton>
              </Tooltip>
            </div>
          ) : (
            // Show/Hide Sidebar
            <div className={styles.showHideSidebar} data-expanded={rightSidebarExpanded}>
              <Tooltip title={rightSidebarExpanded ? "Hide side panel" : "Show side panel"} placement="top">
                <IconButton
                  size="medium"
                  onClick={() => setRightSidebarExpanded((prev) => !prev)}
                  className={styles.showHideSidebarIcon}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      transform: rightSidebarExpanded ? "rotate(-180deg)" : "rotate(0deg)",
                      transition: "transform 0.3s ease-in-out",
                      fontSize: 22,
                      color: "#000",
                    }}
                  >
                    chevron_left
                  </span>
                </IconButton>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;
