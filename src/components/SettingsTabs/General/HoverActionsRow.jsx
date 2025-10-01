import {
    SettingsRow, SettingsCell,
    BoldLabel, SettingsRadio, 
} from "./styles";

export function HoverActionsRow() {
    return (
        <SettingsRow>
            <SettingsCell width="20%" side="left">
                <BoldLabel>Hover actions:</BoldLabel>
            </SettingsCell>
            <SettingsCell side="right">
                <div>
                    <label>
                        <SettingsRadio
                            type="radio"
                            name="hoverActions"
                            value="enable"
                            defaultChecked
                        />{" "}
                        <BoldLabel>Enable hover actions</BoldLabel> – Quickly gain access to
                        archive, delete, mark as read and snooze controls on hover.
                    </label>
                </div>
                <div style={{ marginTop: "6px" }}>
                    <label>
                        <SettingsRadio type="radio" name="hoverActions" value="disable" />{" "}
                        <BoldLabel>Disable hover actions</BoldLabel>
                    </label>
                </div>
            </SettingsCell>
        </SettingsRow>
    );
}
