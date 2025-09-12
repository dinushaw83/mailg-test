import Pagination from "./Pagination";

import styled from "@emotion/styled";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import IconButton from "@mui/material/IconButton";
import React, { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { Icon } from "../InboxView/ActionBar";
import BulkActions from "../MailActions";

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
  const [{ focused, open, splitPane }, setState] = useState({
    focused: false,
    open: false,
    splitPane: false,
  });

  const toggleOpen = () => {
    setState((prev) => ({
      ...prev,
      open: !prev.open,
      focused: true,
    }));
  };

  const toggleSplitPane = () => {
    setState((prev) => ({
      ...prev,
      splitPane: !prev.splitPane,
      focused: true,
    }));
  };

  return (
    <ClickAwayListener onClickAway={() => setState((prev) => ({ ...prev, focused: false }))}>
      <CheckboxContainer focused={focused}>
        <IconButton
          onClick={toggleSplitPane}
          sx={{ paddingTop: "8px", paddingBottom: "8px", paddingLeft: "3px", paddingRight: "3px", borderRadius: "5px" }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 20,
              color: "rgb(68, 68, 68)",
            }}
          >
            vertical_split
          </span>
        </IconButton>
        <IconButton
          sx={{ paddingTop: "8px", paddingBottom: "8px", paddingLeft: "1px", paddingRight: "1px", borderRadius: "5px" }}
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

const ToolBar = ({ totalFilteredItems, emails }) => {
  const { folder = "inbox" } = useParams();
  const { selection } = useGlobalContext();

  const threadIds = emails.map((email) => email.threadId.split(":")[1]);
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
          <BulkActions isSpam={folder === "spam"} />
        ) : (
          <>
            <Icon name="refresh" />
            <Icon name="more_vert" />
          </>
        )}
      </LeftItemsContainer>
      {totalFilteredItems > 0 && <RightActions totalFilteredItems={totalFilteredItems} />}
    </div>
  );
};

export default ToolBar;
