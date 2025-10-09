import {
    SettingsRow, SettingsCell,
    BoldLabel, StyledLink, SettingsRadio, 
} from "./styles";

export function SmartComposeRow() {
    return (
        <SettingsRow>
            <SettingsCell width="20%" side="left">
                <BoldLabel>Smart Compose:</BoldLabel>
                <br />
                <span style={{ fontSize: "0.75rem" }}>
                    (predictive writing suggestions appear as you compose an email)
                </span>
            </SettingsCell>

            <SettingsCell side="right">
                <div>
                    <label>
                        <SettingsRadio
                            type="radio"
                            name="smartComposeSetting"
                            value="on"
                            checked={true}
                            onClick={(e) => e.preventDefault()}
                        />
                        <BoldLabel style={{ marginLeft: "6px" }}>Writing suggestions on</BoldLabel>
                    </label>
                </div>

                <div style={{ marginTop: "6px" }}>
                    <label>
                        <SettingsRadio type="radio" name="smartComposeSetting" value="off" checked={false} onClick={(e) => e.preventDefault()} />
                        <BoldLabel style={{ marginLeft: "6px" }}>Writing suggestions off</BoldLabel>
                    </label>
                </div>

                <div style={{ marginTop: "8px" }}>
                    <StyledLink href="#">
                        Feedback on Smart Compose suggestions
                    </StyledLink>
                </div>
            </SettingsCell>
        </SettingsRow>
    );
}
