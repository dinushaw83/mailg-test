import Pagination from "./Pagination";

import React, { useState } from "react";
import MailActions from "../MailActions";
import IconButton from "@mui/material/IconButton";
import styled from "@emotion/styled";
import { Icon } from "../InboxView/ActionBar";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import BulkActions from "./BulkActions";
import { useGlobalContext } from "../../contexts/GlobalContext";

const CheckboxContainer = styled.div`
  border: ${({ focused }) => (focused ? "1px solid rgb(239, 238, 237)" : "1px solid transparent")};
  border-radius: 5px;
  background-color: ${({ focused }) => (focused ? "rgba(239, 238, 237, 0.5)" : "transparent")};
`;

const CheckBox = ({ checked, toggle }) => {
  console.log("CheckBox");
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
            {checked ? "check_box" : "check_box_outline_blank"}
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

const ToolBar = ({ totalFilteredItems }) => {
  console.log({ totalFilteredItems });
  const [{ allSelected }, setState] = useState({
    allSelected: false,
  });
  const { selection } = useGlobalContext();

  const toggleAllSelected = () => {
    selection.clear();
    setState((prev) => ({
      ...prev,
      allSelected: !prev.allSelected,
    }));
  };

  const hasItemsSelected = allSelected || selection.hasSelection;

  return (
    <div className="G-atb">
      <LeftItemsContainer>
        <CheckBox checked={allSelected} toggle={toggleAllSelected} />

        {/* Refresh button */}
        {hasItemsSelected ? <BulkActions isSpam /> : <Icon name="refresh" />}

        {/* More button */}
        <Icon name="more_vert" />
      </LeftItemsContainer>
      <RightActions totalFilteredItems={totalFilteredItems} />
    </div>
  );
};

export default ToolBar;
