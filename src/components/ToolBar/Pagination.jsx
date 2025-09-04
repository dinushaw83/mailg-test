import { useContext, useState, useRef } from "react";
import {
  Button,
  Box,
  MenuItem,
  Popper,
  Grow,
  Paper,
  ClickAwayListener,
  MenuList,
} from "@mui/material";
import { GlobalContext } from "../../contexts/GlobalContext";
import { Icon } from "../InboxView/ActionBar";
const Pagination = () => {
  const { state } = useContext(GlobalContext);
  const anchorRef = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const emails = state?.emails || [];
  const totalItems = emails.length;
  const currentPage = 1;
  const itemsPerPage = 50;
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = (event) => {
    // Check if it's a click event and if the clicked element is the button that triggered the popper
    if (
      event &&
      event.type === "click" &&
      anchorRef.current &&
      anchorRef.current.contains(event.target)
    ) {
      return; // Don't close if clicking on the button itself
    }
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  console.log(state);
  return (
    <span className="Di">
      <Box onMouseEnter={handleOpenMenu}>
        <Button
          ref={anchorRef}
          variant="text"
          id=":mt"
          className="J-J5-Ji amH J-JN-I"
          aria-controls={open ? "sort-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "sort-menu" : undefined}
          aria-label="Show more messages"
          disableRipple
          sx={{
            userSelect: "none",
            textTransform: "none",
            fontWeight: "400",
            "&:hover": {
              backgroundColor: "#07070714",
              border: "1px solid #0000005e",
            },
          }}
        >
          <span className="Dj">
            <span>
              <span className="ts">{startIndex}</span>–
              <span className="ts">{endIndex}</span>{" "}
            </span>
            of <span className="ts">{totalItems}</span>
          </span>
        </Button>

        <Popper
          open={open}
          anchorEl={anchorRef.current}
          role={undefined}
          placement="bottom-start"
          transition
          disablePortal
        >
          {({ TransitionProps, placement }) => (
            <Grow
              {...TransitionProps}
              style={{
                transformOrigin:
                  placement === "bottom-start" ? "left top" : "left bottom",
              }}
            >
              <Paper
                sx={{
                  width: "145px",
                  padding: "6px 0px",
                  boxShadow:
                    "0px 8px 10px 1px rgba(0,0,0,.14),0px 3px 14px 2px rgba(0,0,0,.12),0px 5px 5px -3px rgba(0,0,0,.2)",
                }}
              >
                <ClickAwayListener onClickAway={handleCloseMenu}>
                  <MenuList
                    id="sort-menu"
                    aria-labelledby="sort-menu"
                    sx={{
                      padding: "0px",
                      "& .MuiMenuItem-root": {
                        fontSize: "14px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: "6px 48px",
                      },
                    }}
                  >
                    <MenuItem onClick={handleCloseMenu}>Newest</MenuItem>
                    <MenuItem onClick={handleCloseMenu}>Oldest</MenuItem>
                  </MenuList>
                </ClickAwayListener>
              </Paper>
            </Grow>
          )}
        </Popper>
      </Box>

      <Icon
        name="chevron_left"
        label="Newer"
        disabled={true}
        // onClick={() => navigate(`/inbox/${Number(inboxId) - 1}`)}
      />
      <Icon
        name="chevron_right"
        label="Older"
        disabled={false}
        // onClick={() => navigate(`/inbox/${Number(inboxId) + 1}`)}
      />
    </span>
  );
};

export default Pagination;
