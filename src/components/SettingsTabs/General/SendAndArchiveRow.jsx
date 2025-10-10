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
                        <SettingsRadio type="radio" name="sendArchive" value="show" checked={true} onClick={(e) => e.preventDefault()} />{" "}
                        <BoldLabel style={{ marginLeft: "6px" }}>Show "Send & Archive" button in reply</BoldLabel>
                    </label>
                </div>
                <div style={{ marginTop: "6px" }}>
                    <label>
                        <SettingsRadio
                            type="radio"
                            name="sendArchive"
                            value="hide"
                            checked={false}
                            onClick={(e) => e.preventDefault()}
                        />{" "}
                        <BoldLabel style={{ marginLeft: "6px" }}>Hide "Send & Archive" button in reply</BoldLabel>
                    </label>
                </div>
            </SettingsCell>
        </SettingsRow>
    );
}
