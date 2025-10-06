import { useTheme, Popper, Paper, Stack, Typography, ClickAwayListener } from "@mui/material";
import { useState } from "react";
import FormatColorText from "@mui/icons-material/FormatColorText";
import KeyboardArrowUp from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import {
  MenuButtonBlockquote,
  MenuButtonBold,
  MenuButtonBulletedList,
  MenuButtonCode,
  MenuButtonCodeBlock,
  MenuButtonEditLink,
  MenuButtonHighlightColor,
  MenuButtonHorizontalRule,
  MenuButtonImageUpload,
  MenuButtonItalic,
  MenuButtonOrderedList,
  MenuButtonRedo,
  MenuButtonRemoveFormatting,
  MenuButtonStrikethrough,
  MenuButtonUnderline,
  MenuButtonUndo,
  MenuButtonUnindent,
  MenuControlsContainer,
  MenuDivider,
  MenuSelectFontFamily,
  MenuSelectFontSize,
  MenuSelectTextAlign,
  MenuButton,
  ColorPicker,
  MenuButtonIndent,
} from "mui-tiptap";

import "./styles.css";

export default function EditorMenuControls({ editor, useCompactFormatting = false, containerClass = "container" }) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [moreAnchorEl, setMoreAnchorEl] = useState(null);
  const [textColor, setTextColor] = useState("");
  const [bgColor, setBgColor] = useState("");
  const open = Boolean(anchorEl);
  const isMoreOpen = Boolean(moreAnchorEl);

  const swatches = [
    // Grayscale
    "rgb(0, 0, 0)",
    "rgb(68, 68, 68)",
    "rgb(102, 102, 102)",
    "rgb(153, 153, 153)",
    "rgb(204, 204, 204)",
    "rgb(238, 238, 238)",
    "rgb(243, 243, 243)",
    "rgb(255, 255, 255)",
    // Brights
    "rgb(255, 0, 0)",
    "rgb(255, 153, 0)",
    "rgb(255, 255, 0)",
    "rgb(0, 255, 0)",
    "rgb(0, 255, 255)",
    "rgb(0, 0, 255)",
    "rgb(153, 0, 255)",
    "rgb(255, 0, 255)",
    // Row 3 (light tints)
    "rgb(244, 204, 204)",
    "rgb(252, 229, 205)",
    "rgb(255, 242, 204)",
    "rgb(217, 234, 211)",
    "rgb(208, 224, 227)",
    "rgb(207, 226, 243)",
    "rgb(217, 210, 233)",
    "rgb(234, 209, 220)",
    // Row 4
    "rgb(234, 153, 153)",
    "rgb(249, 203, 156)",
    "rgb(255, 229, 153)",
    "rgb(182, 215, 168)",
    "rgb(162, 196, 201)",
    "rgb(159, 197, 232)",
    "rgb(180, 167, 214)",
    "rgb(213, 166, 189)",
    // Row 5
    "rgb(224, 102, 102)",
    "rgb(246, 178, 107)",
    "rgb(255, 217, 102)",
    "rgb(147, 196, 125)",
    "rgb(118, 165, 175)",
    "rgb(111, 168, 220)",
    "rgb(142, 124, 195)",
    "rgb(194, 123, 160)",
    // Row 6
    "rgb(204, 0, 0)",
    "rgb(230, 145, 56)",
    "rgb(241, 194, 50)",
    "rgb(106, 168, 79)",
    "rgb(69, 129, 142)",
    "rgb(61, 133, 198)",
    "rgb(103, 78, 167)",
    "rgb(166, 77, 121)",
    // Row 7
    "rgb(153, 0, 0)",
    "rgb(180, 95, 6)",
    "rgb(191, 144, 0)",
    "rgb(56, 118, 29)",
    "rgb(19, 79, 92)",
    "rgb(11, 83, 148)",
    "rgb(53, 28, 117)",
    "rgb(116, 27, 71)",
    // Row 8
    "rgb(102, 0, 0)",
    "rgb(120, 63, 4)",
    "rgb(127, 96, 0)",
    "rgb(39, 78, 19)",
    "rgb(12, 52, 61)",
    "rgb(7, 55, 99)",
    "rgb(32, 18, 77)",
    "rgb(76, 17, 48)",
  ];

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleMoreOpen = (event) => {
    setMoreAnchorEl(event.currentTarget);
  };
  const handleMoreClose = () => {
    setMoreAnchorEl(null);
  };
  
  if (!editor) {
    return null;
  }
  return (
    <MenuControlsContainer editor={editor} className={containerClass}>
      <MenuButtonUndo />
      <MenuButtonRedo />

      <MenuDivider />

      <MenuSelectFontFamily
        style={{
          width: "80px",
          outline: "none"
        }}
        options={[
          { label: "Sans Serif", value: "Arial, Helvetica, sans-serif" },
          { label: "Serif", value: "Times New Roman, Times, serif" },
          { label: "Fixed width", value: "Courier New, Courier, monospace" },
          { label: "Wide", value: "Arial Black, Arial, sans-serif" },
          { label: "Narrow", value: "Arial Narrow, Arial, sans-serif" },
          { label: "Comic Sans MS", value: "Comic Sans MS, Comic Sans, cursive" },
          { label: "Garamond", value: "Garamond, serif" },
          { label: "Georgia", value: "Georgia, serif" },
          { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
          { label: "Trebuchet MS", value: "Trebuchet MS, Helvetica, sans-serif" },
          { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
        ]}
        hideUnsetOption
      />

      <MenuDivider />

      <MenuSelectFontSize
        hideUnsetOption
        options={[
          { value: "10px", label: <span style={{ fontSize: "10px" }}>Small</span> },
          { value: "13px", label: <span style={{ fontSize: "13px" }}>Normal</span> },
          { value: "18px", label: <span style={{ fontSize: "18px" }}>Large</span> },
          { value: "32px", label: <span style={{ fontSize: "32px" }}>Huge</span> },
        ]}
      />

      <MenuDivider />

      <MenuButtonBold />
      <MenuButtonItalic />
      <MenuButtonUnderline />

      {/* Colors (single button opens dual selectors) */}
      <MenuButton
        tooltipLabel="Colors"
        onClick={(e) => (open ? handleClose() : handleOpen(e))}
        IconComponent={FormatColorText}
        aria-describedby="dual-color-picker"
      />
      <Popper
        id="dual-color-picker"
        open={open}
        anchorEl={anchorEl}
        placement="top"
        style={{ zIndex: theme.zIndex.tooltip }}
        className="dual-color-picker"
      >
        <ClickAwayListener onClickAway={handleClose} mouseEvent="onMouseDown" touchEvent="onTouchStart">
          <Paper elevation={5} sx={{ p: 2.5, pb: 1 }}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <div>
                <Typography variant="caption" sx={{ display: "block", mb: 2, fontSize: 14 }}>
                  Background color
                </Typography>
                <ColorPicker
                  value={bgColor}
                  onChange={(color) => {
                    setBgColor(color);
                    editor?.chain().focus().setHighlight({ color }).run();
                  }}
                  swatchColors={swatches}
                />
              </div>
              <div>
                <Typography variant="caption" sx={{ display: "block", mb: 2,  fontSize: 14 }}>
                  Text color
                </Typography>
                <ColorPicker
                  value={textColor}
                  onChange={(color) => {
                    setTextColor(color);
                    editor?.chain().focus().setColor(color).run();
                  }}
                  swatchColors={swatches}
                />
              </div>
            </Stack>
          </Paper>
        </ClickAwayListener>
      </Popper>

      <MenuDivider />

      <MenuSelectTextAlign/>
      {useCompactFormatting ? (
        <>
          <MenuButton
            tooltipLabel="More formatting"
            onClick={(e) => (isMoreOpen ? handleMoreClose() : handleMoreOpen(e))}
            IconComponent={isMoreOpen ? KeyboardArrowUp : KeyboardArrowDown}
            aria-describedby="more-formatting-controls"
          />
          <Popper
            id="more-formatting-controls"
            open={isMoreOpen}
            anchorEl={moreAnchorEl}
            placement="top"
            style={{ zIndex: theme.zIndex.tooltip }}
          >
            <ClickAwayListener onClickAway={handleMoreClose} mouseEvent="onMouseDown" touchEvent="onTouchStart">
              <Paper elevation={5} sx={{ py: 0.5 }}>
                <Stack direction="column" spacing={0} alignItems="flex-start">
                  <MenuButtonOrderedList />
                  <MenuButtonBulletedList />
                  <MenuButtonUnindent />
                  <MenuButtonIndent />
                  <MenuButtonBlockquote />
                  <MenuButtonStrikethrough />
                  <MenuButtonRemoveFormatting />
                </Stack>
              </Paper>
            </ClickAwayListener>
          </Popper>
        </>
      ) : (
        <>
          <MenuButtonOrderedList />
          <MenuButtonBulletedList />
          <MenuButtonUnindent />
          <MenuButtonIndent />
          <MenuButtonBlockquote />

          <MenuDivider />

          <MenuButtonStrikethrough />
          <MenuButtonRemoveFormatting />
        </>
      )}

    </MenuControlsContainer>
  );
}
