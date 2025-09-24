import Pagination from "./Pagination";

import styled from "@emotion/styled";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import IconButton from "@mui/material/IconButton";
import React, { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { Icon } from "../InboxView/ActionBar";
import MailActions from "../MailActions";
import SpamActions from "../MailActions/SpamActions";
import MoreActions from "../MailActions/MoreActions";
import Popover from "@mui/material/Popover";
import Box from "@mui/material/Box";
import { ActionMenuItem } from "../MailActions/ActionMenuItem";

const CheckboxContainer = styled.div`
  border: ${({ focused }) => (focused ? "1px solid rgb(239, 238, 237)" : "1px solid transparent")};
  border-radius: 5px;
  background-color: ${({ focused }) => (focused ? "rgba(239, 238, 237, 0.5)" : "transparent")};
`;

const CheckBox = ({ allSelected, partialSelected, toggle }) => {
  const [{ focused }, setState] = useState({
    focused: false,
  });

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

  return (
    <ClickAwayListener onClickAway={() => setState((prev) => ({ ...prev, focused: false }))}>
      <CheckboxContainer focused={focused}>
        <IconButton
          onClick={toggleChecked}
          sx={{ paddingTop: "8px", paddingBottom: "8px", paddingLeft: "3px", paddingRight: "3px", borderRadius: "5px" }}
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
          sx={{ paddingTop: "8px", paddingBottom: "8px", paddingLeft: "1px", paddingRight: "1px", borderRadius: "5px" }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 20,
              color: "rgb(68, 68, 68)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              toggleFocus();
            }}
          >
            arrow_drop_down
          </span>
        </IconButton>
      </CheckboxContainer>
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

  const toggleOpen = (event) => {
    setAnchorEl(open ? null : event.currentTarget);

    setState({
      open: !open,
      focused: true,
    });
  };

  const toggleSplitPane = () => {
    setPanelState((prev) => ({
      ...prev,
      showPanel: !prev.showPanel,
    }));
  };

  const icon = panelState.showPanel
    ? "reorder"
    : panelState.direction === "horizontal"
    ? "horizontal_split"
    : "vertical_split";

  const handleSplitPane = ({ direction, showPanel }) => {
    setPanelState((prev) => ({
      ...prev,
      ...(direction !== undefined ? { direction } : {}),
      ...(showPanel !== undefined ? { showPanel } : {}),
    }));
    setState((prev) => ({ ...prev, open: false }));
  };

  return (
    <ClickAwayListener onClickAway={() => setState((prev) => ({ ...prev, focused: false, open: false }))}>
      <Box>
        <CheckboxContainer focused={focused}>
          <IconButton
            onClick={toggleSplitPane}
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
              {icon}
            </span>
          </IconButton>
          <IconButton
            sx={{
              paddingTop: "8px",
              paddingBottom: "8px",
              paddingLeft: "1px",
              paddingRight: "1px",
              borderRadius: "5px",
            }}
            onClick={toggleOpen}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 20,
                color: "rgb(68, 68, 68)",
              }}
            >
              {open ? "arrow_drop_up" : "arrow_drop_down"}
            </span>
          </IconButton>
        </CheckboxContainer>
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={() => setState((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <ActionMenuItem
            label="No split"
            onClick={() => {
              handleSplitPane({ direction: "vertical", showPanel: false });
            }}
          />
          <ActionMenuItem
            label="Vertical split"
            onClick={() => {
              handleSplitPane({ direction: "vertical", showPanel: true });
            }}
          />
          <ActionMenuItem
            label="Horizontal split"
            onClick={() => {
              handleSplitPane({ direction: "horizontal", showPanel: true });
            }}
          />
        </Popover>
      </Box>
    </ClickAwayListener>
  );
};

const RightActionsContainer = styled.div`
  display: flex;
  align-items: center;
`;

const RightActions = ({ totalFilteredItems }) => {
  return (
    <RightActionsContainer>
      <Pagination totalFilteredItems={totalFilteredItems} />
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

const ToolBar = ({ totalFilteredItems, threads }) => {
  const { folder = "inbox" } = useParams();
  const { selection, refreshEmails } = useGlobalContext();
  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);

  const threadIds = threads.map((email) => email.threadId.split(":")[1]);
  const { ids } = selection;
  const allSelected = threadIds.length > 0 && threadIds.every((threadId) => ids.has(threadId));
  const partialSelected = threadIds.length > 0 && threadIds.some((threadId) => ids.has(threadId));

  const toggleAllSelected = useCallback(() => {
    if (allSelected || partialSelected) {
      selection.clear();
    } else {
      selection.setMany(threadIds);
    }
  }, [allSelected, threadIds, selection]);

  const hasItemsSelected = allSelected || selection.hasSelection;

  return (
    <div className="G-atb">
      <LeftItemsContainer>
        <CheckBox allSelected={allSelected} partialSelected={partialSelected} toggle={toggleAllSelected} />

        {hasItemsSelected ? (
          <>
            {folder === "spam" || folder === "trash" ? (
              <SpamActions threads={threads} folder={folder} />
            ) : (
              <MailActions threads={threads} showAdvancedMenu={showAdvancedMenu} />
            )}
          </>
        ) : (
          <>
            <Icon name="refresh" onClick={refreshEmails} label="Refresh" />
          </>
        )}

        <MoreActions
          hasItemsSelected={hasItemsSelected}
          threads={threads}
          showAdvancedMenu={showAdvancedMenu}
          setShowAdvancedMenu={setShowAdvancedMenu}
        />
      </LeftItemsContainer>
      {totalFilteredItems > 0 && <RightActions totalFilteredItems={totalFilteredItems} />}
    </div>
  );
};

export default ToolBar;
