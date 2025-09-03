import React from "react";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailFolders from "../../hooks/useMailFolders";
import useLabelCounts from "./../LeftSidebar/useLabelCounts";
import LabelItem from "./LabelItem";
import SidebarItem from "./SidebarItem";

const DEFAULT_FOLDERS = [
  { key: "inbox", label: "Inbox", icon: "inbox", count: 0 },
  { key: "starred", label: "Starred", icon: "star" },
  { key: "snoozed", label: "Snoozed", icon: "schedule" },
  { key: "sent", label: "Sent", icon: "send" },
  { key: "drafts", label: "Drafts", icon: "draft", count: 0 },
];

const HIDDEN_FOLDERS = [
  { key: "important", label: "Important", icon: "label_important" },
  { key: "chats", label: "Chats", icon: "chat" },
  { key: "scheduled", label: "Scheduled", icon: "schedule_send" },
  { key: "all", label: "All Mail", icon: "mail" },
  { key: "spam", label: "Spam", icon: "report", count: 0 },
  { key: "trash", label: "Trash", icon: "delete" },
  { key: "categories", label: "Categories", icon: "label" },
];

const LABELS = ["[Imap]/Drafts", "[Imap]/Sent"];

const LeftSidebar = () => {
  const [showLess, setShowLess] = React.useState(true);
  const { state } = useGlobalContext();
  const emails = state?.emails || [];
  const folders = useMailFolders(emails);

  const counts = useLabelCounts(emails)

  return (
    <div
      className="aeN WR baA nH oy8Mbf"
      role="navigation"
      jslog="88024; u014N:xr6bB;"
      style={{ width: 187, height: 1001 }}
    >
      <div className="aic">
        <div className="z0">
          <div
            className="T-I T-I-KE L3"
            style={{ userSelect: "none" }}
            role="button"
            tabIndex={0}
            jscontroller="eIu7Db"
            jsaction="click:dlrqf; clickmod:dlrqf"
            jslog="20510; u014N:cOuCgd,Kr2w4b"
            gh="cm"
          >
            Compose
          </div>
        </div>
      </div>
      <div className="V3 aam">
        <div className="at9">
          <div className="Ls77Lb aZ6">
            <div
              jscontroller="DUNnfe"
              className="pp"
              style={{ userSelect: "none" }}
            >
              <div id=":n8">
                <div className="nM">
                  <div id=":mz" className="aic" />
                  <div className="yJ">
                    <div className="ajl aib aZ6" aria-labelledby=":nk">
                      <h2 className="aWk" id=":nk">
                        Labels
                      </h2>
                      <div className="wT">
                        <div id=":n9" className="n3">
                          <div className="byl">
                            <div className="TK">
                              {DEFAULT_FOLDERS.map((item) => (
                                <SidebarItem
                                  key={item.key}
                                  item={{ ...item, count: folders[item.key]?.length || 0 }}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="byl aJZ a0L TA sf-hidden" />
                        </div>
                        <div className="n6">
                          <span
                            role="button"
                            className="J-Ke n4 ah9"
                            aria-label={showLess ? "More labels" : "Less labels"}
                            tabIndex={0}
                            onClick={() => setShowLess(!showLess)}
                          >
                            <span className="CJ">{showLess ? "More" : "Less"}</span>
                            <span className="ait" style={{ marginLeft: "6px" }}>
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: "18px", verticalAlign: "middle" }}
                              >
                                {showLess ? "expand_more" : "expand_less"}
                              </span>
                            </span>
                          </span>
                        </div>
                        {!showLess && <div id=":n1" className="n3"> 
                          <div className="byl">
                            <div className="TK">
                              {HIDDEN_FOLDERS.map((item) => (
                                <SidebarItem
                                  key={item.key}
                                  item={{ ...item, count: folders[item.key]?.length || 0 }}
                                />
                              ))}
                             </div>
                          </div>
                        </div>}
                      </div>
                    </div>
                  </div>
                  <div className="aAw FgKVne">
                    <span className="aAv" role="heading">
                      Labels
                    </span>
                    <div
                      className="aAu arN"
                      jsname="dlrqf"
                      aria-label="Create new label"
                      data-tooltip="Create new label"
                      role="button"
                      tabIndex={0}
                      type="button"
                      jslog="167296; u014N:cOuCgd,Kr2w4b,xr6bB;"
                    />
                  </div>
                  <div className="yJ">
                    <div className="ajl aib aZ6" aria-labelledby=":nl">
                      <h2 className="aWk" id=":nl">
                        Labels
                      </h2>
                      <div className="wT">
                        <div className="n3">
                          <div className="zw" gh="cl">
                            <div className="TK">
                              {LABELS.map((name) => (
                                <LabelItem key={name} name={name} count={counts[name]} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <span className="I6agWe">
        <div className="Od0X9">
          <div
            jscontroller="YbzfXd"
            jsaction="rcuQ6b:npT2md"
            data-rp-onramp-input={357}
            data-button-classes="M1LkOe"
            data-icon-classes="kaUFz"
            data-img-classes="E00Cxb"
            className="pt0Pr"
          >
            <div jsname="z1ikhe" />
          </div>
        </div>
      </span>
    </div>
  );
};

export default LeftSidebar;
