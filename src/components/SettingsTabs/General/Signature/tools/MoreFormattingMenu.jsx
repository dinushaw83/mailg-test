import { useState } from "react";
import { ToolbarButton } from "../../styles";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { Menu, MenuItem, ListItemIcon } from "@mui/material";
import FormatStrikethroughIcon from "@mui/icons-material/FormatStrikethrough";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import FormatIndentIncreaseIcon from "@mui/icons-material/FormatIndentIncrease";
import FormatIndentDecreaseIcon from "@mui/icons-material/FormatIndentDecrease";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";

export default function MoreFormattingMenu({ editor }) {
  const [anchorEl, setAnchorEl] = useState(null);

  const open = Boolean(anchorEl);
  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <ToolbarButton
        role="button"
        aria-label="More formatting options"
        aria-haspopup="true"
        aria-expanded={open ? "true" : "false"}
        onClick={handleOpen}
        className="J-Z-M-I J-J5-Ji"
      >
        <ArrowDropDownIcon sx={{ fontSize: 20 }} />
      </ToolbarButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        PaperProps={{
          sx: {
            padding: 0,
            minWidth: "auto",
            "& .MuiMenuItem-root": {
              padding: "2px 6px",
              minHeight: "24px",
            },
            "& .MuiListItemIcon-root": {
              minWidth: "20px",
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            editor.chain().focus().toggleStrike().run();
            handleClose();
          }}
        >
          <ListItemIcon>
            <FormatStrikethroughIcon fontSize="small" />
          </ListItemIcon>
        </MenuItem>

        <MenuItem
          onClick={() => {
            editor.chain().focus().toggleBlockquote().run();
            handleClose();
          }}
        >
          <ListItemIcon>
            <FormatQuoteIcon fontSize="small" />
          </ListItemIcon>
        </MenuItem>

        <MenuItem
          onClick={() => {
            editor.chain().focus().sinkListItem("listItem").run();
            handleClose();
          }}
        >
          <ListItemIcon>
            <FormatIndentIncreaseIcon fontSize="small" />
          </ListItemIcon>
        </MenuItem>

        <MenuItem
          onClick={() => {
            editor.chain().focus().liftListItem("listItem").run();
            handleClose();
          }}
        >
          <ListItemIcon>
            <FormatIndentDecreaseIcon fontSize="small" />
          </ListItemIcon>
        </MenuItem>

        <MenuItem
          onClick={() => {
            editor.chain().focus().toggleBulletList().run();
            handleClose();
          }}
        >
          <ListItemIcon>
            <FormatListBulletedIcon fontSize="small" />
          </ListItemIcon>
        </MenuItem>

        <MenuItem
          onClick={() => {
            editor.chain().focus().toggleOrderedList().run();
            handleClose();
          }}
        >
          <ListItemIcon>
            <FormatListNumberedIcon fontSize="small" />
          </ListItemIcon>
        </MenuItem>
      </Menu>
    </>
  );
}
