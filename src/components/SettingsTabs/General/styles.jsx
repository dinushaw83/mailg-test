import { styled } from "@mui/material/styles";
import { EditorContent } from "@tiptap/react";
import { Tooltip, tooltipClasses } from "@mui/material";

export const Container = styled("div")(({ theme }) => ({
  padding: 0,
  verticalAlign: "bottom",
  minHeight: 297,
}));

export const MainContainer = styled("div")({
  padding: "inherit",
});

export const MainBody = styled("div")({
  overflow: "auto",
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  padding: "0px 24px 40px",
});

export const StyledTable = styled("table")({
  width: "100%",
  borderCollapse: "collapse",
  margin: 0,
  lineHeight: "20px",
  tableLayout: "fixed",
});

export const SettingsRow = styled("tr")({
  WebkitFontSmoothing: "antialiased",
  fontFamily: `"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif`,
  fontSize: "0.875rem",
  letterSpacing: "normal",
  borderBottom: "none",
});

export const SettingsCell = styled("td")(({ width, side }) => ({
  margin: 0,
  verticalAlign: "top",
  width: width || "auto",
  borderBottom: "1px solid rgb(229, 229, 229)",
  padding: "10px 0px",
  ...(side === "left" && { paddingLeft: 0 }),
  ...(side === "right" && { paddingRight: 0 }),
}));

export const BoldLabel = styled("span")({
  fontWeight: "bold",
  overflowWrap: "break-word",
});

//
// Controls
//
export const InlineSelect = styled("select")({
  fontFamily: `"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif`,
  margin: 0,
  fontSize: "100%",
});

export const StyledLink = styled("a")({
  whiteSpace: "nowrap",
  cursor: "pointer",
  textDecoration: "none",
  color: "rgb(17, 85, 204)",
});

export const SettingsCheckbox = styled("input")({
  fontFamily: `"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif`,
  margin: 0,
  fontSize: "100%",
  float: "left",
  verticalAlign: "middle",
  display: "inline-block",
  height: "20px",
  fontWeight: "normal",
});

export const SettingsRadio = styled("input")({
  fontFamily: `"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif`,
  margin: 0,
  fontSize: "100%",
  position: "relative",
  fontWeight: "normal",
  height: "15px",
  verticalAlign: "middle",
});

export const LearnMoreLink = styled("a")({
  whiteSpace: "nowrap",
  cursor: "pointer",
  textDecoration: "none",
  color: "rgb(17, 85, 204)",
});

export const SubNote = styled("span")({
  WebkitFontSmoothing: "auto",
  fontFamily: `"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif`,
  fontSize: "0.75rem",
  letterSpacing: "normal",
  display: "block",
  marginTop: "4px",
});

export const SubText = styled("span")({
  WebkitFontSmoothing: "auto",
  fontSize: "0.75rem",
  letterSpacing: "normal",
});

export const SignaturesFormContainer = styled("div")({
  borderCollapse: "collapse",
  borderSpacing: "2px",
  fontSize: "14px",
  font: '14px / 20px "Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
  lineHeight: "20px",
});

export const ToolbarSeparator = styled("div")({
  borderLeft: "1px solid rgba(100, 121, 143, 0.12)",
  height: "20px",
  // margin: "0 2px",
  display: "inline-block",
  verticalAlign: "middle",
});

export const SignaturesListContainer = styled("div")({
  borderRight: "1px solid rgb(218, 220, 224)",
  flex: "1 0 240px",
  overflow: "auto",
  padding: "8px 0px",
  WebkitFontSmoothing: "antialiased",
  fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
  fontSize: "0.875rem",
  letterSpacing: "normal",
  color: "rgb(32, 33, 36)",
  WebkitBoxFlex: "1",
});

export const SignatureName = styled("span")({
  overflow: "hidden",
  whiteSpace: "nowrap",
  flex: "1 1 auto",
  margin: "8px 0px 8px 16px",
  textOverflow: "ellipsis",
  WebkitBoxFlex: "1",
  width: "168px",
});

export const SignatureItem = styled("div")({
  WebkitBoxAlign: "center",
  alignItems: "center",
  cursor: "pointer",
  display: "flex",
  height: "40px",
  // backgroundColor: "rgba(66, 133, 244, 0.12)",
  paddingRight: "8px",
  paddingLeft: "8px",

  "&:hover": {
    backgroundColor: "rgba(60,64,67,.12)",
  },

  "&.active": {
    backgroundColor: "rgba(66, 133, 244, 0.2)",
  },

  "&:focus": {
    backgroundColor: "rgba(60,64,67,.12)",
  },
});

export const SignatureContainer = styled("div")({
  flex: "2 2 480px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",

  // Safari/WebKit flexbox compatibility
  WebkitBoxFlex: "2",
  WebkitBoxOrient: "vertical",
  WebkitBoxDirection: "normal",
  WebkitBoxPack: "justify",
});

export const StyledSignatureTable = styled("table")({
  width: "100%",
  tableLayout: "fixed",
  borderCollapse: "collapse",
  borderSpacing: 0,
});

export const SignatureEditableBox = styled("div")({
  border: 0,
  overflow: "visible",
  width: "100%",
  background: "#fff",
  font: "small / 1.5 Arial, Helvetica, sans-serif",
  letterSpacing: "normal",
  height: "100px",
  overflowY: "auto",
  direction: "ltr",

  // Accessibility consistency
  outline: "none", // usually Gmail removes outline on focus
});

export const SignatureToolbarContainer = styled("div")({
  backgroundColor: "transparent",
  fontSize: "medium",
  maxWidth: "612px",
  // position: "absolute",
  overflow: "hidden",
  alignItems: "center",
  display: "flex",
  height: "48px",

  padding: 0,
  width: "100%",
  boxShadow: "inset 0 1px rgb(218, 220, 224)",
  bottom: 0,

  // Safari/WebKit flexbox fallback
  WebkitBoxAlign: "center",
});

export const MailGToolbarButton = styled("div")({
  borderRadius: "2px",
  background: "transparent",
  border: "none",

  listStyle: "none",
  textDecoration: "none",
  height: "20px",
  color: "rgb(68, 68, 68)",
  lineHeight: "20px",
  fontSize: "0.875rem",
  fontWeight: 500,
  verticalAlign: "middle",
  cursor: "pointer",
  outline: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  zIndex: 0,
  margin: "0px 3px",
  userSelect: "none",
});

export const ToolbarButton = styled("div")({
  borderRadius: "2px",
  background: "transparent",
  border: "none",
  padding: 0,
  height: "20px",
  color: "rgb(68, 68, 68)",
  lineHeight: "20px",
  fontSize: "0.875rem",
  fontWeight: 500,
  verticalAlign: "middle",
  cursor: "pointer",
  outline: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  zIndex: 0,
  margin: "0px 6px",
  userSelect: "none",

  "&:active": {
    backgroundColor: "rgba(60,64,67,0.15)",
  },
});

export const FontSelectContainer = styled("div")({
  borderRadius: "2px",
  height: "20px",
  color: "rgb(68, 68, 68)",
  lineHeight: "20px",
  fontSize: "0.875rem",
  fontWeight: 500,
  verticalAlign: "middle",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 2px",
  userSelect: "none",
  position: "relative",
  zIndex: 0,
});

export const StyledEditorContent = styled(EditorContent)({
  "& .tiptap": {
    border: 0,
    overflow: "visible",
    width: "100%",
    background: "#fff",
    font: "small / 1.5 Arial, Helvetica, sans-serif",
    letterSpacing: "normal",
    direction: "ltr",
    outline: "none",
    minHeight: "100px",
    maxHeight: "200px",
    overflowY: "auto",
  },
});

export const CreateNewButton = styled("button")(() => ({
  border: "none",
  background: "none",
  borderRadius: "4px",
  outline: "none",
  padding: "0px 16px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  zIndex: 0,
  WebkitFontSmoothing: "antialiased",
  fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
  fontSize: "0.875rem",
  letterSpacing: "normal",
  boxSizing: "border-box",
  cursor: "pointer",
  fontWeight: 500,
  height: "36px",
  minWidth: "80px",
  boxShadow: "rgb(218, 220, 224) 0px 0px 0px 1px inset",
  color: "rgb(26, 115, 232)",
  marginBottom: "32px",
  marginTop: "8px",
  width: "240px",
  transition: "background-color 0.2s ease, box-shadow 0.2s ease",

  "&:hover": {
    backgroundColor: "rgba(26, 115, 232, 0.05)",
  },

  "&:focus-visible": {
    outline: "2px solid rgba(26, 115, 232, 0.5)",
    outlineOffset: "2px",
  },

  "& .material-symbols-outlined": {
    fontSize: 20,
    marginRight: 6,
  },
}));

export const StyledTooltip = styled(({ className, ...props }) => (
  <Tooltip
    placement="right"
    slotProps={{
      popper: {
        modifiers: [
          {
            name: "offset",
            options: { offset: [0, -3] },
          },
        ],
      },
    }}
    {...props}
    classes={{ popper: className }}
  />
))(() => ({
  [`& .${tooltipClasses.tooltip}`]: {
    fontSize: "0.75rem",
    padding: "4px 8px",
    borderRadius: "4px",
  },
}));
