import { useContext, useState, useRef, useEffect } from "react";
import { Button, Box, MenuItem, Popper, Grow, Paper, ClickAwayListener, MenuList } from "@mui/material";
import { GlobalContext, useGlobalContext } from "../../contexts/GlobalContext";
import { Icon } from "../InboxView/ActionBar";
import { useHotkeys } from "react-hotkeys-hook";
import React from "react";

const useCustomHotKeys = ({ handlePreviousPage, handleNextPage }) => {
  const { keyboardShortcuts } = useGlobalContext();
  const shortcutsOn = keyboardShortcuts === "shortcuts-on";

  useHotkeys(shortcutsOn ? "g>n" : "", () => {
    handleNextPage();
  });
  useHotkeys(shortcutsOn ? "g>p" : "", () => {
    handlePreviousPage();
  });
};

const Pagination = ({
  totalFilteredItems,
  overwriteItemsPerPage = null,
  showNavigationButtons = true,
}) => {
  const { currentPage, setCurrentPage, itemsPerPage, setSortOrder } = useContext(GlobalContext);
  const anchorRef = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const totalItems = totalFilteredItems;
  const totalPages = Math.ceil(totalItems / (overwriteItemsPerPage || itemsPerPage));

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage, setCurrentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * (overwriteItemsPerPage || itemsPerPage), totalItems);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const handleOpenMenu = (event) => {
    if (!showNavigationButtons) return;
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = (event) => {
    // Check if it's a click event and if the clicked element is the button that triggered the popper
    if (event && event.type === "click" && anchorRef.current && anchorRef.current.contains(event.target)) {
      return; // Don't close if clicking on the button itself
    }
    setAnchorEl(null);
  };

  const handleSortChange = (newSortOrder) => {
    setSortOrder(newSortOrder);
    if (newSortOrder === "oldest") {
      setCurrentPage(totalPages);
    } else {
      setCurrentPage(1);
    }
    setAnchorEl(null);
  };

  const handlePreviousPage = () => {
    if (hasPreviousPage) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(currentPage + 1);
    }
  };

  const open = Boolean(anchorEl);

  useCustomHotKeys({ handlePreviousPage, handleNextPage });

  return (
    <span className="Di">
      <Box onMouseEnter={handleOpenMenu} onMouseLeave={handleCloseMenu}>
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
              <span className="ts">{startIndex}</span>–<span className="ts">{endIndex}</span>{" "}
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
                transformOrigin: placement === "bottom-start" ? "left top" : "left bottom",
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
                    <MenuItem
                      onClick={() => handleSortChange("newest")}
                      sx={{
                        color: hasPreviousPage ? "#484747" : "#cccccc",
                      }}
                      disabled={!hasPreviousPage}
                    >
                      Newest
                    </MenuItem>
                    <MenuItem
                      onClick={() => handleSortChange("oldest")}
                      sx={{
                        color: hasNextPage ? "#484747" : "#cccccc",
                      }}
                      disabled={!hasNextPage}
                    >
                      Oldest
                    </MenuItem>
                  </MenuList>
                </ClickAwayListener>
              </Paper>
            </Grow>
          )}
        </Popper>
      </Box>

      {showNavigationButtons && (
        <>
          <Icon name="chevron_left" label="Newer" disabled={!hasPreviousPage} onClick={handlePreviousPage} />
          <Icon name="chevron_right" label="Older" disabled={!hasNextPage} onClick={handleNextPage} />
        </>
      )}
    </span>
  );
};

export default Pagination;
