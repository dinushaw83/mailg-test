import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";

const StyledIconButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== "shape",
})(({ theme, shape }) => ({
  width: 36,
  height: 36,
  marginRight: "10px",
  transition: "all 0.3s ease",
  backgroundColor: "transparent",
  borderRadius: shape === "round" ? "50%" : "4px",

  "&:hover": {
    backgroundColor: theme.palette.action.hover,
    borderRadius: shape === "round" ? "50% !important" : "0% !important",
  },
}));

const Icon = ({
  name,
  label,
  onClick,
  style,
  disabled,
  placement = "bottom",
  size = "small",
  shape = "round", // "round" or "square"
  marginRight = "10px",
  _ref,
}) => {
  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!disabled && onClick) {
      onClick(e);
    }
  };

  // Wrap in a span to capture clicks even when IconButton is disabled
  // (disabled IconButton has pointer-events: none)
  return (
    <span
      onClick={handleClick}
      style={{ display: "inline-flex", cursor: disabled ? "default" : "pointer" }}
    >
      <Tooltip title={disabled ? "" : label} placement={placement}>
        <StyledIconButton
          size={size}
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            marginRight: marginRight,
            pointerEvents: disabled ? "none" : "auto",
            ...style,
          }}
          ref={_ref}
          disabled={disabled}
          shape={shape} // Custom prop used in styled()
          style={style}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 20,
              color: disabled ? "#b8b8b8" : "rgb(68, 68, 68)",
            }}
          >
            {name}
          </span>
        </StyledIconButton>
      </Tooltip>
    </span>
  );
};

export default Icon;
