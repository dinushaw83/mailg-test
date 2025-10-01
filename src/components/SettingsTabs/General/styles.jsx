import { styled } from "@mui/material/styles";

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
    padding: "0px 24px 24px",
});

export const StyledTable = styled("table")({
    width: "100%",
    borderCollapse: "collapse",
    margin: 0,
    lineHeight: "20px",
});


export const SettingsRow = styled("tr")({
    WebkitFontSmoothing: "antialiased",
    fontFamily: `"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif`,
    fontSize: "0.875rem",
    letterSpacing: "normal",
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

