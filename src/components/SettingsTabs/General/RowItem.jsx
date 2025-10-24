import { Box, Divider } from "@mui/material";
import React from "react";

// Layout constants
const COLUMN_RATIOS = {
  LEFT: 25,
  RIGHT: 75,
};

const TOTAL_RATIO = COLUMN_RATIOS.LEFT + COLUMN_RATIOS.RIGHT;

const LAYOUT_STYLES = {
  container: {
    display: "flex",
    width: "100%",
    minHeight: "48px",
    py: 1,
  },
  leftColumn: {
    width: `${(COLUMN_RATIOS.LEFT / TOTAL_RATIO) * 100}%`,
    pr: 2,
  },
  rightColumn: {
    width: `${(COLUMN_RATIOS.RIGHT / TOTAL_RATIO) * 100}%`,
    pl: 2,
  },
  divider: {
    borderColor: "#e8eaed",
  },
};

/**
 * Row item component for settings layout
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.leftItem - Content for the left column
 * @param {React.ReactNode} props.rightItem - Content for the right column
 */
const RowItem = ({ leftItem, rightItem }) => {
  return (
    <Box>
      <Box sx={LAYOUT_STYLES.container}>
        <Box sx={LAYOUT_STYLES.leftColumn}>{leftItem}</Box>
        <Box sx={LAYOUT_STYLES.rightColumn}>{rightItem}</Box>
      </Box>
      <Divider sx={LAYOUT_STYLES.divider} />
    </Box>
  );
};

export default RowItem;
