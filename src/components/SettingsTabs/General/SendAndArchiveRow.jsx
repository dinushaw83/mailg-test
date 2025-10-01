import {
    SettingsRow, SettingsCell,
    BoldLabel, StyledLink, SettingsRadio, 
} from "./styles";

export function SendAndArchiveRow() {
    return (
        <SettingsRow>
            <SettingsCell width="20%" side="left">
                <BoldLabel>Send and Archive:</BoldLabel>
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
                        <SettingsRadio type="radio" name="sendArchive" value="show" />{" "}
                        <BoldLabel>Show "Send & Archive" button in reply</BoldLabel>
                    </label>
                </div>
                <div style={{ marginTop: "6px" }}>
                    <label>
                        <SettingsRadio
                            type="radio"
                            name="sendArchive"
                            value="hide"
                            defaultChecked
                        />{" "}
                        <BoldLabel>Hide "Send & Archive" button in reply</BoldLabel>
                    </label>
                </div>
            </SettingsCell>
        </SettingsRow>
    );
}
