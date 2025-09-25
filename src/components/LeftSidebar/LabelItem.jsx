import React, { useState, useRef } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { NavLink, useMatch } from "react-router-dom";
import Icon from "../ui/Icon";
import { MenuItem, ListItemIcon, Divider, ListItemText } from "@mui/material";
import { Menu } from "@mui/material";
import { styled } from "@mui/material/styles";
import useLabels from "../../hooks/useLabels";
import ChangeLabelColorModal, { SCOPES } from "./ChangeLabelColorModal";
import { useGlobalContext } from "../../contexts/GlobalContext";
import RemoveLabelModal from "./RemoveLabelModal";
import EditLabelDialog from "../Labels/EditLabelDialog";

const Swatch = styled("div")(({ theme, rgb, text }) => ({
  height: 20,
  width: 20,
  borderRadius: "50%",
  backgroundColor: rgb,
  color: text,
  fontSize: "0.875rem",
  fontWeight: 500,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: "19px",
  cursor: "pointer",
  transition: "box-shadow 0.2s ease",
  boxShadow: "inset 0 0 1px 0 rgba(0,0,0,.26)",
  "&:hover": {
    boxShadow: `0 0 0 3px ${theme.palette.action.hover}`,
  },
}));

function ColorCell({ rgb, text, check, onClick = () => { } }) {
  return (
    <td role="gridcell" style={{ padding: 2, textAlign: "center" }} onClick={onClick}>
      <Swatch rgb={rgb} text={text} style={{ position: "relative" }}>
        {check ? (
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 20,
              color: text,
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            check
          </span>
        ) : "a"}
      </Swatch>
    </td>
  );
}

export default function LabelItem({
  labelKey,
  display,
  depth = 0,
  count = 0,
  hasChildren = false,
  isOpen = true,
  onToggle, // () => void
  expanded = true,
  conversationCount = 0,
  multipleLabels = [],
  setIsCreateLabelModalOpen = () => {},
  setDefaultParentKey = () => {},
  setLabelDefaultName = () => { },
  setLabelDefaultKey = () => {},
}) {
  const { setLabelColor, labels, deleteLabel } = useLabels();
  const { setLabels, setSnackbar } = useGlobalContext()
  const label = labels[labelKey];
  const selectedColor = label?.color;

  const isParent = !labelKey?.includes("::");

  // Route like /label/:label where :label is encodeURIComponent(labelKey)
  const match = useMatch("/label/:label");
  const currentKey = match?.params?.label ? decodeURIComponent(match.params.label) : "";
  const active = currentKey === labelKey;
  const inLabelList = label?.inLabelList ?? "show";
  const inMessageList = label?.inMessageList ?? "show";
  const [pendingColor, setPendingColor] = useState(null);

  const parentKey = label?.parentKey;

  // Main menu
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  // Submenu (Label color)
  const [colorAnchorEl, setColorAnchorEl] = useState(null);
  const colorOpen = Boolean(colorAnchorEl);
  const [colorModalOpen, setColorModalOpen] = useState(false);

  // remove label modal
  const [removeModalOpen, setRemoveModalOpen] = useState(false);

  const [editLabelModalOpen, setEditLabelModalOpen] = useState(false);

  const handleMenuButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setColorAnchorEl(null); // ensure submenu closes too
  };

  const handleColorMenuClose = () => {
    setColorAnchorEl(null);
  };

  const timerRef = useRef(null);

  const openColorMenu = (el) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setColorAnchorEl(el);
  };

  const closeColorMenuWithDelay = () => {
    timerRef.current = setTimeout(() => {
      setColorAnchorEl(null);
    }, 500); // 250ms feels Gmail-like
  };

  const cancelClose = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const IN_LABEL_LIST = [
    { key: "show", label: "Show" },
    { key: "show_if_unread", label: "Show if unread" },
    { key: "hide", label: "Hide" },
  ];

  const IN_MESSAGE_LIST = [
    { key: "show", label: "Show" },
    { key: "hide", label: "Hide" },
  ];

  const COLORS = [
    // row 1
    [
      { rgb: "rgb(231, 231, 231)", text: "rgb(70, 70, 70)" },
      { rgb: "rgb(182, 207, 245)", text: "rgb(13, 52, 114)" },
      {
        rgb: "rgb(152, 215, 228)",
        text: "rgb(13, 59, 68)",
        selected: true,
        check: true,
      },
      { rgb: "rgb(227, 215, 255)", text: "rgb(61, 24, 142)" },
      { rgb: "rgb(251, 211, 224)", text: "rgb(113, 26, 54)" },
      { rgb: "rgb(242, 178, 168)", text: "rgb(138, 28, 10)" },
    ],
    // row 2
    [
      { rgb: "rgb(194, 194, 194)", text: "rgb(255, 255, 255)" },
      { rgb: "rgb(73, 134, 231)", text: "rgb(255, 255, 255)" },
      { rgb: "rgb(45, 162, 187)", text: "rgb(255, 255, 255)" },
      { rgb: "rgb(185, 154, 255)", text: "rgb(255, 255, 255)" },
      { rgb: "rgb(246, 145, 178)", text: "rgb(153, 74, 100)" },
      { rgb: "rgb(251, 76, 47)", text: "rgb(255, 255, 255)" },
    ],
    // row 3
    [
      { rgb: "rgb(255, 200, 175)", text: "rgb(122, 46, 11)" },
      { rgb: "rgb(255, 222, 181)", text: "rgb(122, 71, 6)" },
      { rgb: "rgb(251, 233, 131)", text: "rgb(89, 76, 5)" },
      { rgb: "rgb(253, 237, 193)", text: "rgb(104, 78, 7)" },
      { rgb: "rgb(179, 239, 211)", text: "rgb(11, 79, 48)" },
      { rgb: "rgb(162, 220, 193)", text: "rgb(4, 80, 46)" },
    ],
    // row 4
    [
      { rgb: "rgb(255, 117, 55)", text: "rgb(255, 255, 255)" },
      { rgb: "rgb(255, 173, 70)", text: "rgb(255, 255, 255)" },
      { rgb: "rgb(235, 219, 222)", text: "rgb(102, 46, 55)" },
      { rgb: "rgb(204, 166, 172)", text: "rgb(255, 255, 255)" },
      { rgb: "rgb(66, 214, 146)", text: "rgb(9, 66, 40)" },
      { rgb: "rgb(22, 167, 101)", text: "rgb(255, 255, 255)" },
    ],
  ];

  return (
    <>
      <NavLink
        to={`/label/${encodeURIComponent(labelKey)}`}
        className="J-Ke n0"
        style={{ textDecoration: "none", color: "inherit" }}
        aria-label={`${display} label`}
      >
        <div
          className={`aim n6 ${active ? "ain" : ""}`}
          style={
            expanded
              ? {}
              : {
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                overflowX: "hidden",
                marginLeft: "20px",
              }
          }
        >
          <div className={`TO ah9 ${active ? "aBP nZ aiq" : ""}`}>
            <div
              className="TN aY7xie aEc aHS-bnr"
              style={{ marginLeft: 12 + depth * 16, ...(expanded ? {} : { paddingLeft: "6px", marginLeft: 0 }) }}
            >
              {/* Arrow (only if it has children) */}
              {hasChildren && (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggle?.();
                  }}
                  style={{ cursor: "pointer", display: "inline-flex" }}
                  aria-label={isOpen ? "Collapse" : "Expand"}
                  role="button"
                >
                  {!isOpen
                    ? <Icon name="arrow_right" style={{ width: 12, height: 12, marginRight: "2px", marginLeft: "-16px", shape: "square" }} />
                    : <Icon name="arrow_drop_down" style={{ width: 12, height: 12, marginRight: "2px", marginLeft: "-16px", shape: "square" }} />
                  }
                </span>
              )}

              <div className="qj aEe qr" style={{ backgroundColor: selectedColor?.rgb, opacity: selectedColor?.rgb ? 1 : 0.5 }} />

              <div className="aio aip">
                <span className="nU">{display}</span>
              </div>

              <div className="nL aig group">
                <div className="pM aj0">
                  <IconButton
                    size="small"
                    aria-controls={menuOpen ? `label-menu-${labelKey}` : undefined}
                    onClick={handleMenuButtonClick}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </NavLink>

      <Menu
        id={`label-menu-${labelKey}`}
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        keepMounted
        slotProps={{
          paper: {
            sx: {
              minWidth: 230,
            },
          },
        }}
      >
        {/* Opens the color submenu – keep the main menu open */}
        <MenuItem
          onMouseEnter={(e) => openColorMenu(e.currentTarget)}
          onClick={(e) => {
            e.stopPropagation();
            openColorMenu(e.currentTarget);
          }}
          aria-haspopup="menu"
          aria-controls={colorOpen ? `label-color-${labelKey}` : undefined}
          sx={{
            "&:hover": { backgroundColor: (theme) => theme.palette.action.hover },
            ...(colorOpen && {
              backgroundColor: (theme) => theme.palette.action.hover,
            }),
          }}
        >
          <ListItemIcon>
            <ColorCell rgb={selectedColor?.rgb} text={selectedColor?.text} check={selectedColor?.check} />
          </ListItemIcon>
          <ListItemText primary={<Typography fontSize={14}>Label color</Typography>} />
          <ListItemIcon sx={{ justifyContent: "flex-end", minWidth: "auto" }}>
            <Icon name="arrow_right" style={{ width: 20, height: 20 }} />
          </ListItemIcon>
        </MenuItem>

        <Divider />

        {isParent && [
          <Typography key="label-list-title" sx={{ px: 2, pt: 1, pb: 0.5, fontSize: 14, color: "text.secondary" }}>
            In label list
          </Typography>,

          ...IN_LABEL_LIST.map((opt) => {
            const selected = inLabelList === opt.key;
            return (
              <MenuItem
                key={opt.key}
                onClick={() => {
                  setLabels(prev => {
                    const next = { ...prev };
                    next[labelKey] = { ...next[labelKey], inLabelList: opt.key };
                    return next;
                  });
                  handleMenuClose()
                }}
                // selected={selected}
                role="menuitemradio"
                aria-checked={selected}
              >
                <ListItemIcon sx={{ minWidth: 28 }}>
                  {selected && (
                    <span className="material-symbols-outlined" style={{ fontSize: 24 }}>check</span>
                  )}
                </ListItemIcon>
                <ListItemText primary={<Typography fontSize={14}>{opt.label}</Typography>} />
              </MenuItem>
            );
          }),

          <Divider key="label-list-divider" />
        ]}

        <Typography sx={{ px: 2, pt: 1, pb: 0.5, fontSize: 14, color: "text.secondary" }}>
          In message list
        </Typography>
        {IN_MESSAGE_LIST.map((opt) => {
          const selected = inMessageList === opt.key;
          return (
            <MenuItem
              key={opt.key}
              onClick={() => {
                setLabels(prev => {
                  const next = { ...prev };
                  next[labelKey] = { ...next[labelKey], inMessageList: opt.key };
                  return next;
                });
                handleMenuClose()
              }}
              // selected={selected}
              role="menuitemradio"
              aria-checked={selected}
            >
              <ListItemIcon sx={{ minWidth: 28 }}>
                {selected && (
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>check</span>
                )}
              </ListItemIcon>
              <ListItemText primary={<Typography fontSize={14}>{opt.label}</Typography>} />
            </MenuItem>
          );
        })}

        <Divider />

        <MenuItem>
          <ListItemText primary={<Typography fontSize={14}>Edit</Typography>} sx={{ ml: 5 }} onClick={() => {
            handleMenuClose()
            setEditLabelModalOpen(true)
          }} />
        </MenuItem>
        <MenuItem>
          <ListItemText primary={<Typography fontSize={14}>Remove label</Typography>} sx={{ ml: 5 }} onClick={() => {
            handleMenuClose()
            setRemoveModalOpen(true)
          }} />
        </MenuItem>
        <MenuItem>
          <ListItemText
            primary={<Typography fontSize={14}>Add sublabel</Typography>}
            sx={{ ml: 5 }}
            onClick={() => {
              handleMenuClose()
              setIsCreateLabelModalOpen(true)
              setDefaultParentKey(labelKey)
            }}
          />
        </MenuItem>
      </Menu>

      {/* Color submenu */}
      <Menu
        id={`label-color-${labelKey}`}
        anchorEl={colorAnchorEl}
        open={colorOpen}
        onClose={handleColorMenuClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        MenuListProps={{
          onMouseEnter: cancelClose,
          onMouseLeave: closeColorMenuWithDelay,
        }}
        keepMounted
      >
        <Typography sx={{ px: 2, py: 1 }}>Label color</Typography>
        <div style={{ padding: "0 48px", fontSize: "0.875rem" }}>
          <table style={{ borderCollapse: "collapse" }}>
            <tbody>
              {COLORS.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <ColorCell
                      key={j}
                      {...cell}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setPendingColor(cell);
                        handleColorMenuClose();
                        handleMenuClose()
                        if (hasChildren) {
                          setColorModalOpen(true);
                        } else {
                          setLabelColor(labelKey, cell);
                        }
                      }}
                      check={selectedColor && selectedColor.rgb === cell.rgb && selectedColor.text === cell.text}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Box sx={{ py: 1 }}></Box>
        <MenuItem sx={{ fontSize: 14, pl: 6 }}>Add custom color</MenuItem>
        <MenuItem sx={{ fontSize: 14, pl: 6 }}>Remove color</MenuItem>
      </Menu>

      <ChangeLabelColorModal
        open={colorModalOpen}
        onClose={() => setColorModalOpen(false)}
        labelName={display}
        onConfirm={(scope) => {
          if (pendingColor) {
            if (scope === SCOPES.SINGLE) {
              setLabelColor(labelKey, pendingColor);
            } else if (scope === SCOPES.WITH_SUBLABELS) {
              setLabelColor(labelKey, pendingColor, { withSublabels: true });
            }
          }
          setPendingColor(null);
        }}
      />

      <RemoveLabelModal
        open={removeModalOpen}
        onClose={() => setRemoveModalOpen(false)}
        labelName={display}
        conversationCount={conversationCount}
        multipleLabels={multipleLabels}
        onConfirm={() => {
          deleteLabel(labelKey);
          setRemoveModalOpen(false);

          setSnackbar({
            open: true,
            message: `${multipleLabels.length > 1
              ? `${multipleLabels.length} labels were removed`
              : `The label ${multipleLabels[0].fullPath} was removed.`}`,
            action: (
              null
            ),
            autoHideDuration: 4000,
          });
        }}
      />

      {editLabelModalOpen && <EditLabelDialog
        open={editLabelModalOpen}
        onClose={() => setEditLabelModalOpen(false)}
        defaultParentKey={parentKey}
        labelDefaultName={display}
        labelDefaultKey={labelKey}
        onAfterCreate={(name) => {
          setSnackbar({
            open: true,
            message: `The label "${name}" was saved.`,
            autoHideDuration: 4000,
          });
        }}
      />}
    </>
  );
}
