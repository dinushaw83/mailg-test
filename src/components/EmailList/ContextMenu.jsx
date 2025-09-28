import React from "react";
import { Menu, Item, Separator, Submenu, useContextMenu } from "react-contexify";
import "react-contexify/ReactContexify.css";

const ContextMenu = ({ menuId, handleArchive, handleDelete, handleReadAction, handleSnoozeAction }) => {
  const handleItemClick = ({ id, event, props }) => {
    const threadId = props.thread.threadId.split(":")[1];
    switch (id) {
      case "archive":
        handleArchive(threadId);
        break;
      case "delete":
        handleDelete(threadId);
        break;
      case "mark_as_read":
      case "mark_as_unread":
        handleReadAction(props.thread);
        break;
      case "snooze":
        handleSnoozeAction(threadId);
        break;
      //etc...
    }
  };

  const sectionOneItems = [
    {
      id: "reply",
      label: "Reply",
      icon: "reply",
    },
    {
      id: "reply_all",
      label: "Reply all",
      icon: "reply_all",
    },
    {
      id: "forward",
      label: "Forward",
      icon: "forward",
    },
    {
      id: "forward_as_attachment",
      label: "Forward as attachment",
      icon: "attachment",
    },
  ];

  const sectionTwoItems = [
    {
      id: "archive",
      label: "Archive",
      icon: "archive",
    },
    {
      id: "delete",
      label: "Delete",
      icon: "delete",
    },
    {
      id: "mark_as_read",
      label: "Mark as read",
      icon: "drafts",
    },
    {
      id: "mark_as_unread",
      label: "Mark as unread",
      icon: "mark_email_unread",
    },
    {
      id: "snooze",
      label: "Snooze",
      icon: "schedule",
    },
    {
      id: "add_to_tasks",
      label: "Add to task",
      icon: "task_alt",
    },
  ];

  return (
    <Menu
      id={menuId}
      style={{
        padding: 0,
        paddingTop: "4px",
        paddingBottom: "4px",
        fontSize: "14px",
      }}
    >
      {sectionOneItems.map((item) => (
        <Item id={item.id} onClick={handleItemClick}>
          <span className="material-symbols-outlined" style={{ fontSize: "18px", marginRight: "8px" }}>
            {item.icon}
          </span>
          {item.label}
        </Item>
      ))}

      <Separator />

      {sectionTwoItems.map((item) => (
        <Item id={item.id} onClick={handleItemClick}>
          <span className="material-symbols-outlined" style={{ fontSize: "18px", marginRight: "8px" }}>
            {item.icon}
          </span>
          {item.label}
        </Item>
      ))}

      <Separator />

      <Submenu
        label="Move to"
        style={{ padding: 0, paddingTop: "4px", paddingBottom: "4px" }}
        arrow={
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: "20px",
              fontVariationSettings: "'FILL' 1", // Makes it solid
            }}
          >
            arrow_right
          </span>
        }
      >
        <div>Hello world</div>
        <Item id="reload" onClick={handleItemClick}>
          <span className="material-symbols-outlined" style={{ fontSize: "18px", marginRight: "8px" }}>
            refresh
          </span>
          Reload
        </Item>
        <Item id="something" onClick={handleItemClick}>
          <span className="material-symbols-outlined" style={{ fontSize: "18px", marginRight: "8px" }}>
            settings
          </span>
          Do something else
        </Item>
      </Submenu>

      <Submenu
        label="Label as"
        style={{ padding: 0, paddingTop: "4px", paddingBottom: "4px" }}
        arrow={
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: "20px",
              fontVariationSettings: "'FILL' 1", // Makes it solid
            }}
          >
            arrow_right
          </span>
        }
      >
        <Item id="reload" onClick={handleItemClick}>
          <span className="material-symbols-outlined" style={{ fontSize: "18px", marginRight: "8px" }}>
            refresh
          </span>
          Reload
        </Item>
        <Item id="something" onClick={handleItemClick}>
          <span className="material-symbols-outlined" style={{ fontSize: "18px", marginRight: "8px" }}>
            settings
          </span>
          Do something else
        </Item>
      </Submenu>
      <Item id="mute" onClick={handleItemClick}>
        <span className="material-symbols-outlined" style={{ fontSize: "18px", marginRight: "8px" }}>
          volume_off
        </span>
        Mute
      </Item>

      <Separator />

      <Item id="search" onClick={handleItemClick}>
        <span className="material-symbols-outlined" style={{ fontSize: "18px", marginRight: "8px" }}>
          search
        </span>
        Find emails from this sender
      </Item>

      <Separator />

      <Item id="new_tab" onClick={handleItemClick}>
        <span className="material-symbols-outlined" style={{ fontSize: "18px", marginRight: "8px" }}>
          open_in_new
        </span>
        Open in new tab
      </Item>
    </Menu>
  );
};

export default ContextMenu;
