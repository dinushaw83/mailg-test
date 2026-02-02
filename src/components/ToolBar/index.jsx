import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import { ActionMenuItem } from "../MailActions/ActionMenuItem";
import Box from "@mui/material/Box";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import { Icon } from "../InboxView/ActionBar";
import IconButton from "@mui/material/IconButton";
import MailActions from "../MailActions";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreActions from "../MailActions/MoreActions";
import Pagination from "./Pagination";
import Popover from "@mui/material/Popover";
import SpamActions from "../MailActions/SpamActions";
import { buildSearchBarFromUrl } from "../../utils/helperFunctions";
import { buildSearchParams } from "../../utils/searchParams";
import { createPortal } from "react-dom";
import { fetchSearchResults } from "../../store/slices/mailSlice";
import { queryClient } from "../../lib/query-client";
import styled from "@emotion/styled";
import { useDispatch } from "react-redux";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { useHotkeys } from "react-hotkeys-hook";

const CheckboxContainer = styled.div`
  border: ${({ focused }) => (focused ? "1px solid rgb(239, 238, 237)" : "1px solid transparent")};
  border-radius: 5px;
  background-color: ${({ focused }) => (focused ? "rgba(239, 238, 237, 0.5)" : "transparent")};
`;

const MenuItemStyles = {
  fontSize: "14px",
  padding: "6px 48px",
};

const CheckBox = ({ allSelected, partialSelected, toggle, shortcutsOn, threads, selection }) => {
  const [{ focused }, setState] = useState({
    focused: false,
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const checkboxRef = useRef(null);

  const toggleFocus = () => {
    setState((prev) => ({
      ...prev,
      focused: true,
    }));
  };

  const toggleChecked = () => {
    toggle();
    setState((prev) => ({
      ...prev,
      focused: true,
    }));
  };

  const focusCheckbox = () => {
    checkboxRef?.current?.focus();
  };

  useHotkeys(shortcutsOn ? "Comma" : "", () => {
    setState((prev) => ({
      ...prev,
      focused: true,
    }));
    focusCheckbox();
  });

  const handleMenuOpen = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    toggleFocus();
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSelectAll = () => {
    const thread_ids = threads.map((email) => email.thread_id);
    selection.setMany(thread_ids);
    handleMenuClose();
  };

  const handleSelectNone = () => {
    selection.clear();
    handleMenuClose();
  };

  const handleSelectRead = () => {
    const readThreadIds = threads.filter((email) => email.unreadCount === 0).map((email) => email.thread_id);
    selection.setMany(readThreadIds);
    handleMenuClose();
  };

  const handleSelectUnread = () => {
    const unreadThreadIds = threads.filter((email) => email.unreadCount > 0).map((email) => email.thread_id);
    selection.setMany(unreadThreadIds);
    handleMenuClose();
  };

  const handleSelectStarred = () => {
    const starredThreadIds = threads.filter((email) => email.is_starred).map((email) => email.thread_id);
    selection.setMany(starredThreadIds);
    handleMenuClose();
  };

  const handleSelectUnstarred = () => {
    const unstarredThreadIds = threads.filter((email) => !email.is_starred).map((email) => email.thread_id);
    selection.setMany(unstarredThreadIds);
    handleMenuClose();
  };

  return (
    <ClickAwayListener onClickAway={() => setState((prev) => ({ ...prev, focused: false }))}>
      <Box>
        <CheckboxContainer focused={focused}>
          <IconButton
            ref={checkboxRef}
            onClick={toggleChecked}
            sx={{
              paddingTop: "8px",
              paddingBottom: "8px",
              paddingLeft: "3px",
              paddingRight: "3px",
              borderRadius: "5px",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 20,
                color: "rgb(68, 68, 68)",
              }}
            >
              {allSelected ? "check_box" : partialSelected ? "indeterminate_check_box" : "check_box_outline_blank"}
            </span>
          </IconButton>
          <IconButton
            onClick={handleMenuOpen}
            sx={{
              paddingTop: "8px",
              paddingBottom: "8px",
              paddingLeft: "1px",
              paddingRight: "1px",
              borderRadius: "5px",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 20,
                color: "rgb(68, 68, 68)",
              }}
            >
              arrow_drop_down
            </span>
          </IconButton>
        </CheckboxContainer>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "left",
          }}
          slotProps={{
            paper: {
              sx: {
                minWidth: "150px",
              },
            },
            list: {
              dense: true,
              sx: {
                padding: "4px 0",
              },
            },
          }}
        >
          <MenuItem onClick={handleSelectAll} sx={MenuItemStyles}>
            All
          </MenuItem>
          <MenuItem onClick={handleSelectNone} sx={MenuItemStyles}>
            None
          </MenuItem>
          <MenuItem onClick={handleSelectRead} sx={MenuItemStyles}>
            Read
          </MenuItem>
          <MenuItem onClick={handleSelectUnread} sx={MenuItemStyles}>
            Unread
          </MenuItem>
          <MenuItem onClick={handleSelectStarred} sx={MenuItemStyles}>
            Starred
          </MenuItem>
          <MenuItem onClick={handleSelectUnstarred} sx={MenuItemStyles}>
            Unstarred
          </MenuItem>
        </Menu>
      </Box>
    </ClickAwayListener>
  );
};

const ToggleSplitPaneButton = () => {
  const { panelState, setPanelState } = useGlobalContext();
  const [{ focused, open }, setState] = useState({
    focused: false,
    open: false,
  });
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [prevSplitPane, setPrevSplitPane] = useState(
    panelState.direction === "no-split" ? "vertical" : panelState.direction
  );

  // Sync prevSplitPane with panelState.direction when it changes from quick settings
  useEffect(() => {
    if (panelState.direction !== "no-split") {
      setPrevSplitPane(panelState.direction);
    }
  }, [panelState.direction]);

  const toggleOpen = (event) => {
    setAnchorEl(open ? null : event.currentTarget);

    setState({
      open: !open,
      focused: true,
    });
  };

  const toggleSplitPane = () => {
    const isSplit = panelState.direction === "horizontal" || panelState.direction === "vertical";

    if (isSplit) {
      // If currently split, remove the split
      setPanelState((prev) => ({
        ...prev,
        showPanel: false,
        direction: "no-split",
      }));
    } else {
      // If no split, open with the previous split direction (defaults to vertical)
      setPanelState((prev) => ({
        ...prev,
        showPanel: true,
        direction: prevSplitPane,
      }));
    }
  };

  const icon = panelState.showPanel
    ? "reorder"
    : prevSplitPane === "horizontal"
      ? "horizontal_split"
      : "vertical_split";

  const handleSplitPane = ({ direction, showPanel }) => {
    setPanelState((prev) => ({
      ...prev,
      ...(direction !== undefined ? { direction } : {}),
      ...(showPanel !== undefined ? { showPanel } : {}),
    }));

    // Update prevSplitPane when a split direction is selected
    if (direction && direction !== "no-split") {
      setPrevSplitPane(direction);
    }

    setState((prev) => ({ ...prev, open: false }));
  };

  return (
    <></>
    // <ClickAwayListener onClickAway={() => setState((prev) => ({ ...prev, focused: false, open: false }))}>
    //   {/* <Box>
    //     <CheckboxContainer focused={focused}>
    //       <IconButton
    //         onClick={toggleSplitPane}
    //         sx={{
    //           paddingTop: "8px",
    //           paddingBottom: "8px",
    //           paddingLeft: "3px",
    //           paddingRight: "3px",
    //           borderRadius: "5px",
    //         }}
    //       >
    //         <span
    //           className="material-symbols-outlined"
    //           style={{
    //             fontSize: 20,
    //             color: "rgb(68, 68, 68)",
    //           }}
    //         >
    //           {icon}
    //         </span>
    //       </IconButton>
    //       <IconButton
    //         sx={{
    //           paddingTop: "8px",
    //           paddingBottom: "8px",
    //           paddingLeft: "1px",
    //           paddingRight: "1px",
    //           borderRadius: "5px",
    //         }}
    //         onClick={toggleOpen}
    //       >
    //         <span
    //           className="material-symbols-outlined"
    //           style={{
    //             fontSize: 20,
    //             color: "rgb(68, 68, 68)",
    //           }}
    //         >
    //           {open ? "arrow_drop_up" : "arrow_drop_down"}
    //         </span>
    //       </IconButton>
    //     </CheckboxContainer>
    //     <Popover
    //       open={open}
    //       anchorEl={anchorEl}
    //       onClose={() => setState((prev) => ({ ...prev, open: false }))}
    //       anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
    //     >
    //       <ActionMenuItem
    //         label="No Split"
    //         onClick={() => {
    //           handleSplitPane({ direction: "no-split", showPanel: false });
    //         }}
    //       />
    //       <ActionMenuItem
    //         label="Vertical Split"
    //         onClick={() => {
    //           handleSplitPane({ direction: "vertical", showPanel: true });
    //         }}
    //       />
    //       <ActionMenuItem
    //         label="Horizontal Split"
    //         onClick={() => {
    //           handleSplitPane({ direction: "horizontal", showPanel: true });
    //         }}
    //       />
    //     </Popover>
    //   </Box> */}
    // </ClickAwayListener>
  );
};

const RightActionsContainer = styled.div`
  display: flex;
  align-items: center;
`;

const RightActions = ({ totalFilteredItems, showPagination = true }) => {
  return (
    <RightActionsContainer>
      {showPagination && <Pagination totalFilteredItems={totalFilteredItems} />}
      <ToggleSplitPaneButton />
    </RightActionsContainer>
  );
};

const LeftItemsContainer = ({ children }) => {
  return (
    <div className="bzn">
      <div className="G-tF" style={{ display: "flex", alignItems: "center" }}>
        {children}
      </div>
    </div>
  );
};

const ToolBar = ({
  totalFilteredItems,
  threads,
  showAdvancedMenu,
  setShowAdvancedMenu,
  showPagination = true,
  activeInboxTab = null,
  folder: folderProp = null, // Optional folder override for search context
}) => {
  const { folder: folderFromUrl = "inbox", label: labelParam } = useParams();
  const location = useLocation();
  const dispatch = useDispatch();
  // Use prop folder if provided (e.g., from search params), otherwise use URL folder
  const folder = folderProp || folderFromUrl;
  const label = labelParam ? decodeURIComponent(labelParam) : null;
  const {
    selection,
    refreshEmails,
    keyboardShortcuts,
    manualSyncCount,
    setManualSyncCount,
    currentPage,
    itemsPerPage,
  } = useGlobalContext();
  const shortcutsOn = keyboardShortcuts === "shortcuts-on";
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Check if we're on a search page
  const isSearchPage = location.pathname.startsWith("/search");

  const manualEmailSync = useCallback(async () => {
    setIsManualSyncing(true);
    setManualSyncCount((prevCount) => prevCount + 1);

    try {
      if (isSearchPage) {
        // For search pages, dispatch fetchSearchResults to refresh
        const { apiParams, originalParams } = buildSearchParams(location, {
          page: currentPage,
          pageSize: itemsPerPage,
        });
        const searchQuery = buildSearchBarFromUrl(location);
        await dispatch(fetchSearchResults({ ...apiParams, originalParams, searchQuery }));
      } else {
        // Build query key using the SAME format as useFolderEmails
        // useFolderEmails uses: ["emails", activeFolder, activeInboxTab, currentPage, itemsPerPage]
        // or for labels: ["emails", "label", label, currentPage, itemsPerPage]
        const queryKey = label
          ? ["emails", "label", label, currentPage, itemsPerPage]
          : ["emails", folder || "inbox", activeInboxTab, currentPage, itemsPerPage];

        // Force refetch - invalidateQueries marks as stale AND triggers refetch for active queries
        await queryClient.invalidateQueries({ queryKey, exact: true });
      }

      setIsManualSyncing(false);
    } catch (error) {
      console.error("Failed to refresh emails:", error);
      setIsManualSyncing(false);
    }
  }, [folder, activeInboxTab, currentPage, itemsPerPage, label, setManualSyncCount, isSearchPage, location, dispatch]);

  const thread_ids = threads.map((email) => email.thread_id);
  const { ids } = selection;
  const allSelected = thread_ids.length > 0 && thread_ids.every((thread_id) => ids.has(thread_id));
  const partialSelected = thread_ids.length > 0 && thread_ids.some((thread_id) => ids.has(thread_id));

  const toggleAllSelected = useCallback(() => {
    if (allSelected || partialSelected) {
      selection.clear();
    } else {
      selection.setMany(thread_ids);
    }
  }, [allSelected, thread_ids, selection]);

  const hasItemsSelected = allSelected || selection.hasSelection;

  const showSpamActions = (folder === "spam" || folder === "trash") && hasItemsSelected;
  const showMailActions = folder !== "spam" && folder !== "trash" && hasItemsSelected;

  return (
    <div className="G-atb">
      {isManualSyncing &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#FEF7E0", // soft yellow
              color: "#202124", // near-black text
              border: "1px solid #F1DE9A",
              borderRadius: 1,
              padding: "4px",
              fontSize: 14,
              fontWeight: 500,
              zIndex: 5000,
              pointerEvents: "none",
              boxShadow: "0 1px 2px rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)",
            }}
          >
            Loading...
          </div>,
          document.body
        )}
      <LeftItemsContainer>
        <CheckBox
          allSelected={allSelected}
          partialSelected={partialSelected}
          toggle={toggleAllSelected}
          shortcutsOn={shortcutsOn}
          threads={threads}
          selection={selection}
        />

        <SpamActions threads={threads} folder={folder} visible={showSpamActions} />
        <MailActions threads={threads} showAdvancedMenu={showAdvancedMenu} visible={showMailActions} folder={folder} />

        {!hasItemsSelected && (
          <>
            <Icon
              name="refresh"
              onClick={() => {
                manualEmailSync();
                // refreshEmails();
              }}
              label="Refresh"
            />
          </>
        )}
        <MoreActions
          hasItemsSelected={hasItemsSelected}
          threads={threads}
          showAdvancedMenu={showAdvancedMenu}
          setShowAdvancedMenu={setShowAdvancedMenu}
        />
      </LeftItemsContainer>
      {totalFilteredItems > 0 && (
        <RightActions totalFilteredItems={totalFilteredItems} showPagination={showPagination} />
      )}
    </div>
  );
};

export default ToolBar;
