import {
    SettingsRow, SettingsCell,
    BoldLabel, StyledLink, SettingsCheckbox, 
} from "./styles";

export default function NudgesRow() {
    return (
        <SettingsRow>
            <SettingsCell width="20%" side="left">
                <BoldLabel>Nudges:</BoldLabel>
                <br />
                <StyledLink
                    href="#"
                    target="_blank"
                >
                    Learn more
                </StyledLink>
            </SettingsCell>

            <SettingsCell side="right">
                <div>
                    <label>
                        <SettingsCheckbox type="checkbox" defaultChecked checked={true} onClick={(e) => e.preventDefault()} />
                        <BoldLabel style={{ marginLeft: "6px" }}>Suggest emails to reply to</BoldLabel> – Emails you might have
                        forgotten to respond to will appear at the top of your inbox
                    </label>
                </div>

                <div style={{ marginTop: "8px" }}>
                    <label>
                        <SettingsCheckbox type="checkbox" defaultChecked checked={true} onClick={(e) => e.preventDefault()} />
                        <BoldLabel style={{ marginLeft: "6px" }}>Suggest emails to follow up on</BoldLabel> – Sent emails you
                        might need to follow up on will appear at the top of your inbox
                    </label>
                </div>
            </SettingsCell>
        </SettingsRow>
    );
}
