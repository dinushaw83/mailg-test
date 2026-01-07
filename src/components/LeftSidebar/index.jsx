import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailFolders from "../../hooks/useMailFolders";
import LabelItem from "./LabelItem";
import SidebarItem from "./SidebarItem";
import useLabels, { flattenTreeForSelect } from "../../hooks/useLabels";
import { useComposeModal } from "../../hooks/useComposeModal";
import CreateLabelDialog from "../Labels/CreateLabelDialog";
import ShortcutsModal from "./ShortcutsModal";
import { useHotkeys } from "react-hotkeys-hook";
import { useNavigate } from "react-router-dom";
import { fetchLabels } from "../../store/slices/mailSlice";

function findNode(tree, key) {
  for (const node of tree) {
    if (node.key === key) return node;
    const child = findNode(node.children || [], key);
    if (child) return child;
  }
  return null;
}

function collectSubtree(node, labelIndex, isRoot = true) {
  const entry = {
    key: node.key,
    name: node.name,
    fullPath: isRoot ? node.key.replace(/::/g, "/") : node.name,
    depth: node.key.split("::").length - 1,
    count: labelIndex[node.key]?.total ?? 0,
  };

  const all = [entry];

  node.children?.forEach((child) => {
    all.push(...collectSubtree(child, labelIndex, false));
  });

  return all;
}

const DEFAULT_FOLDERS = [
  { key: "inbox", label: "Inbox", icon: "inbox", count: 0 },
  { key: "starred", label: "Starred", icon: "star" },
  { key: "snoozed", label: "Snoozed", icon: "schedule" },
  { key: "sent", label: "Sent", icon: "send" },
  { key: "drafts", label: "Drafts", icon: "draft", count: 0 },
];

export const useJumpToHotKeys = () => {
  const { keyboardShortcuts } = useGlobalContext();
  const navigate = useNavigate();
  const shortcutsOn = keyboardShortcuts === "shortcuts-on";

  useHotkeys(shortcutsOn ? "g>i" : "", () => {
    navigate("/inbox");
  });

  useHotkeys(shortcutsOn ? "g>s" : "", () => {
    navigate("/starred");
  });

  useHotkeys(shortcutsOn ? "g>b" : "", () => {
    navigate("/snoozed");
  });

  useHotkeys(shortcutsOn ? "g>t" : "", () => {
    navigate("/sent");
  });

  useHotkeys(shortcutsOn ? "g>d" : "", () => {
    navigate("/drafts");
  });

  useHotkeys(shortcutsOn ? "g>a" : "", () => {
    navigate("/all");
  });

  useHotkeys(shortcutsOn ? "g>c" : "", () => {
    navigate("/contacts");
  });

  useHotkeys(shortcutsOn ? "g>f" : "", () => {
    navigate("/search");
  });
};

const useCustomHotKeys = ({
  keyboardShortcuts,
  openComposeWindow,
  removeComposeWindow,
  composeWindows,
  setShowShortCutsModal,
}) => {
  const shortcutsOn = keyboardShortcuts === "shortcuts-on";
  const lastGAt = useRef(0);
  useHotkeys(shortcutsOn ? "g" : "", () => {
    lastGAt.current = Date.now();
  });

  useHotkeys(shortcutsOn ? "c" : "", () => {
    if (Date.now() - lastGAt.current > 1000) {
      openComposeWindow();
    }
  });

  useHotkeys(shortcutsOn ? "esc" : "", () => {
    const openComposeWindowId = composeWindows[composeWindows.length - 1].id;
    removeComposeWindow(openComposeWindowId);
  });

  useHotkeys("Shift+Slash", () => {
    setShowShortCutsModal(true);
  });
};

const LeftSidebar = () => {
  const dispatch = useDispatch();
  const [showLess, setShowLess] = useState(true);
  const {
    emails,
    setSnackbar,
    isLeftSidebarExpanded,
    vacationResponder,
    keyboardShortcuts,
    showShortCutsModal,
    setShowShortCutsModal,
  } = useGlobalContext();
  const folders = useMailFolders(emails);
  const { labels, labelTree, labelIndex } = useLabels();

  // Fetch labels on mount using React Query
  const { isLoading: labelsLoading } = useQuery({
    queryKey: ["labels"],
    queryFn: () => dispatch(fetchLabels()).unwrap(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!localStorage.getItem("accessToken"), // Only fetch if authenticated
  });
  const { addNewComposeWindow, composeWindows, removeComposeWindow } = useComposeModal();
  const [isCreateLabelModalOpen, setIsCreateLabelModalOpen] = useState(false);
  const [isLeftSidebarHovered, setIsLeftSidebarHovered] = useState(false);
  // Sidebar is expanded if it is expanded or hovered
  const sidebarExpanded = isLeftSidebarExpanded || isLeftSidebarHovered;

  const [defaultParentKey, setDefaultParentKey] = useState(null);

  const customLabels = useMemo(() => {
    const flat = flattenTreeForSelect(labelTree);
    return flat
      .filter((item) => !labels?.[item.key]?.system)
      .map((item) => ({
        key: item.key, // composite key: "Work::Q4"
        name: item.name, // just this node's name (for sidebar)
        depth: item.depth, // for indent
        unread: labelIndex[item.key]?.unread ?? 0,
        total: labelIndex[item.key]?.total ?? 0,
        children: item.children,
      }));
  }, [labelTree, labels, labelIndex]);

  // Build a Set of keys that have children
  const parentsWithChildren = useMemo(() => {
    const set = new Set();
    const walk = (nodes) => {
      nodes?.forEach((n) => {
        if (n.children && n.children.length > 0) set.add(n.key);
        walk(n.children);
      });
    };
    walk(labelTree);
    return set;
  }, [labelTree]);

  // Keep collapsed state (collapsed[key] === true means closed)
  const [collapsed, setCollapsed] = useState({}); // key -> boolean

  const toggleOpen = (key) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Get ancestors from a composite key like "Work::kjj::kkk"
  const getAncestors = (key) => {
    const parts = key.split("::");
    const acc = [];
    for (let i = 0; i < parts.length - 1; i++) {
      acc.push(parts.slice(0, i + 1).join("::"));
    }
    return acc;
  };

  // Only show items whose ancestors are all open (not collapsed)
  const visibleCustomLabels = useMemo(() => {
    return customLabels.filter((item) => {
      const ancestors = getAncestors(item.key);
      return ancestors.every((a) => !collapsed[a]); // default open if not in map
    });
  }, [customLabels, collapsed]);

  // Open a new compose window
  const openComposeWindow = (e) => {
    // If called as an event handler, e will be the event object.
    // We want to pass true for autoFocus, not the event object.
    const autoFocus = typeof e === "boolean" ? e : true;
    addNewComposeWindow(null, {}, autoFocus);
  };

  const handleCreateNewLabel = () => {
    setIsCreateLabelModalOpen(true);
    setDefaultParentKey(null);
  };

  const manageLabels = () => {
    return null;
  };

  const manageSubscriptions = () => {
    return null;
  };

  useJumpToHotKeys();
  useCustomHotKeys({
    openComposeWindow,
    removeComposeWindow,
    composeWindows,
    keyboardShortcuts,
    setShowShortCutsModal,
  });

  const HIDDEN_FOLDERS = [
    { key: "important", label: "Important", icon: "label_important" },
    { key: "chats", label: "Chats", icon: "chat" },
    { key: "scheduled", label: "Scheduled", icon: "schedule_send" },
    { key: "all", label: "All Mail", icon: "mail" },
    { key: "spam", label: "Spam", icon: "report", count: 0 },
    { key: "trash", label: "Trash", icon: "delete" },
    { key: "categories", label: "Categories", icon: "label" },
    { key: "manage-subscriptions", label: "Manage subscriptions", icon: "unsubscribe", onClick: manageSubscriptions },
    { key: "manage-labels", label: "Manage labels", icon: "settings", onClick: manageLabels },
    { key: "create-new-label", label: "Create new label", icon: "add", onClick: handleCreateNewLabel },
  ];

  return (
    <div
      className={`${sidebarExpanded ? "aeN" : ""} WR baA nH oy8Mbf`}
      role="navigation"
      jslog="88024; u014N:xr6bB;"
      style={{
        width: 187,
        height: `calc(100vh - ${vacationResponder.enabled ? "98px" : "64px"})`,
        ...(sidebarExpanded
          ? {}
          : {
              width: "72px",
              minWidth: "72px",
              maxWidth: "72px",
            }),
        transition: "width 0.3s ease-in-out",
        backgroundColor: "#f8fafd",
        ...(!isLeftSidebarExpanded && { position: "absolute", zIndex: 900 }),
      }}
      onMouseEnter={() => setIsLeftSidebarHovered(true)}
      onMouseLeave={() => setIsLeftSidebarHovered(false)}
    >
      <div className="aic">
        <div className="z0">
          <div
            onClick={openComposeWindow}
            className="T-I T-I-KE L3"
            style={{
              userSelect: "none",
              ...(sidebarExpanded ? {} : { width: "56px", minWidth: "56px", padding: 0 }),
            }}
            role="button"
            tabIndex={0}
            jscontroller="eIu7Db"
            jsaction="click:dlrqf; clickmod:dlrqf"
            jslog="20510; u014N:cOuCgd,Kr2w4b"
            gh="cm"
          >
            {sidebarExpanded ? "Compose" : ""}
          </div>
        </div>
      </div>
      <div className="V3 aam">
        <div className="at9">
          <div className="Ls77Lb aZ6">
            <div jscontroller="DUNnfe" className="pp" style={{ userSelect: "none" }}>
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
                                    // For inbox the count should be the number of unread emails
                                    count:
                                      item.key === "inbox"
                                        ? folders[item.key]?.filter((email) => email.unreadCount > 0).length || 0
                                        : folders[item.key]?.length || 0,
                                  }}
                                  expanded={sidebarExpanded}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="byl aJZ a0L TA sf-hidden" />
                        </div>
                        <div
                          className="n6"
                          style={
                            sidebarExpanded
                              ? {}
                              : { width: "32px", borderRadius: "50%", marginLeft: "20px", overflowX: "hidden" }
                          }
                        >
                          <span
                            role="button"
                            className="J-Ke n4 ah9"
                            aria-label={showLess ? "More labels" : "Less labels"}
                            tabIndex={0}
                            onClick={() => setShowLess(!showLess)}
                            style={sidebarExpanded ? {} : { padding: 0 }}
                          >
                            <span className="CJ" style={sidebarExpanded ? {} : { display: "none" }}>
                              {showLess ? "More" : "Less"}
                            </span>
                            <span
                              className="ait"
                              style={{ marginRight: "18px", ...(sidebarExpanded ? {} : { paddingLeft: "6px" }) }}
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
                                    expanded={sidebarExpanded}
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
                    <span className="aAv" role="heading" style={sidebarExpanded ? {} : { display: "none" }}>
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
                              {visibleCustomLabels.map((l) => {
                                const node = findNode(labelTree, l.key); // full tree node
                                const multipleLabels = collectSubtree(node, labelIndex);
                                return (
                                  <LabelItem
                                    key={l.key}
                                    labelKey={l.key}
                                    display={l.name}
                                    depth={l.depth}
                                    count={l.unread}
                                    childrenArray={l.children}
                                    hasChildren={parentsWithChildren.has(l.key)}
                                    isOpen={!collapsed[l.key]}
                                    onToggle={() => toggleOpen(l.key)}
                                    expanded={sidebarExpanded}
                                    conversationCount={l.total}
                                    multipleLabels={multipleLabels}
                                    setIsCreateLabelModalOpen={setIsCreateLabelModalOpen}
                                    setDefaultParentKey={setDefaultParentKey}
                                  />
                                );
                              })}
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
          defaultParentKey={defaultParentKey}
          labelDefaultName=""
          onAfterCreate={(name) => {
            setSnackbar({
              open: true,
              message: `The label "${name}" was created.`,
              autoHideDuration: 4000,
            });
          }}
        />
        <ShortcutsModal open={showShortCutsModal} onClose={() => setShowShortCutsModal(false)} />
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
