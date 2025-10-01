import { styled } from "@mui/material/styles";
import { SettingsRow, SettingsCell } from "./styles";

const SettingsButton = styled("button")({
    WebkitFontSmoothing: "antialiased",
    fontSize: "0.875rem",
    letterSpacing: "normal",
    fontFamily: `"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif`,
});

export default function SettingsFooterRow() {
    return (
        <SettingsRow>
            <SettingsCell colSpan={2} style={{ margin: 0 }}>
                <div
                    role="navigation"
                    style={{
                        padding: "5px 0px 0px",
                        textAlign: "center",
                    }}
                >
                    <SettingsButton style={{ marginRight: "8px" }}>Save Changes</SettingsButton>
                    <SettingsButton>Cancel</SettingsButton>
                </div>
            </SettingsCell>
        </SettingsRow>
    );
}
