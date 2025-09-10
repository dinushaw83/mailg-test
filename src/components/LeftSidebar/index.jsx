import React, { useState, useMemo } from "react";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailFolders from "../../hooks/useMailFolders";
import LabelItem from "./LabelItem";
import SidebarItem from "./SidebarItem";
import useLabels, { flattenTreeForSelect } from "../../hooks/useLabels";
import { useComposeModal } from "../../hooks/useComposeModal";
import CreateLabelDialog from "../Labels/CreateLabelDialog";

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

const LeftSidebar = () => {
  const [showLess, setShowLess] = useState(true);
  const { emails } = useGlobalContext();
  const folders = useMailFolders(emails);
  const { labels, labelTree, labelIndex } = useLabels();
  const { addNewComposeWindow } = useComposeModal();
  const [isCreateLabelModalOpen, setIsCreateLabelModalOpen] = useState(false);
  const { setSnackbar } = useGlobalContext()

  const customLabels = useMemo(() => {
    const flat = flattenTreeForSelect(labelTree);
    return flat
      .filter((item) => !labels?.[item.key]?.system)
      .map((item) => ({
        key: item.key, // composite key: "Work::Q4"
        name: item.name, // just this node's name (for sidebar)
        depth: item.depth, // for indent
        unread: labelIndex[item.key]?.unread ?? 0,
      }));
  }, [labelTree, labels, labelIndex]);

  // Open a new compose window
  const openComposeWindow = () => {
    addNewComposeWindow();
  };

  return (
    <div
      className="aeN WR baA nH oy8Mbf"
      role="navigation"
      jslog="88024; u014N:xr6bB;"
      style={{ width: 187, height: 1001 }}
    >
      <div className="aic" onClick={openComposeWindow}>
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
                                  item={{
                                    ...item,
                                    count: folders[item.key]?.length || 0,
                                  }}
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
                            aria-label={
                              showLess ? "More labels" : "Less labels"
                            }
                            tabIndex={0}
                            onClick={() => setShowLess(!showLess)}
                          >
                            <span className="CJ">
                              {showLess ? "More" : "Less"}
                            </span>
                            <span
                              className="ait"
                              style={{ marginRight: "18px" }}
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{
                                  fontSize: "18px",
                                  verticalAlign: "middle",
                                }}
                              >
                                {showLess ? "expand_more" : "expand_less"}
                              </span>
                            </span>
                          </span>
                        </div>
                        {!showLess && (
                          <div id=":n1" className="n3">
                            <div className="byl">
                              <div className="TK">
                                {HIDDEN_FOLDERS.map((item) => (
                                  <SidebarItem
                                    key={item.key}
                                    item={{
                                      ...item,
                                      count: folders[item.key]?.length || 0,
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
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
                      onClick={() => setIsCreateLabelModalOpen(true)}
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
                              {customLabels.map((l) => (
                                <LabelItem
                                  key={l.key}
                                  labelKey={l.key}
                                  display={l.name}
                                  depth={l.depth}
                                  count={l.unread}
                                />
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
        <CreateLabelDialog
          open={isCreateLabelModalOpen}
          onClose={() => setIsCreateLabelModalOpen(false)}
          onAfterCreate={(name) => {
            setSnackbar({
              open: true,
              message: `The label "${name}" was created.`,
              autoHideDuration: 4000,
            });
          }}
        />
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
