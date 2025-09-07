import Pagination from "./Pagination";

import React, { useState } from "react";
import MailActions from "../MailActions";
import IconButton from "@mui/material/IconButton";
import styled from "@emotion/styled";
import { Icon } from "../InboxView/ActionBar";
import ClickAwayListener from "@mui/material/ClickAwayListener";

const CheckboxContainer = styled.div`
  border: ${({ focused }) => (focused ? "1px solid rgb(239, 238, 237)" : "1px solid transparent")};
  border-radius: 5px;
  background-color: ${({ focused }) => (focused ? "rgba(239, 238, 237, 0.5)" : "transparent")};
`;

const CheckBox = () => {
  const [{ checked, open, focused }, setState] = useState({
    checked: false,
    open: false,
    focused: false,
  });

  const toggleOpen = () => {
    setState((prev) => ({
      ...prev,
      open: !prev.open,
      focused: true,
    }));
  };

  const toggle = () => {
    setState((prev) => ({
      ...prev,
      checked: !prev.checked,
      focused: true,
    }));
  };

  return (
    <ClickAwayListener onClickAway={() => setState((prev) => ({ ...prev, focused: false }))}>
      <CheckboxContainer focused={focused}>
        <IconButton
          onClick={toggle}
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
              toggleOpen();
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
  // return <MailActions />;

  return (
    <div className="G-atb">
      <LeftItemsContainer>
        <CheckBox />

        {/* Refresh button */}
        <Icon name="refresh" />

        {/* More button */}
        <Icon name="more_vert" />
      </LeftItemsContainer>
      <RightActions totalFilteredItems={totalFilteredItems} />
    </div>
  );
};

export default ToolBar;
