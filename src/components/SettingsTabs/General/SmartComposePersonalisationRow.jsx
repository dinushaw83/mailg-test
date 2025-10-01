import {
    SettingsRow, SettingsCell,
    BoldLabel, SettingsRadio, 
} from "./styles";

export default function SmartComposePersonalisationRow() {
    return (
        <SettingsRow>
            <SettingsCell width="20%" side="left">
                <BoldLabel>Smart Compose personalisation:</BoldLabel>
                <br />
                <span style={{ fontSize: "0.75rem" }}>
                    (Smart Compose is personalised to your writing style)
                </span>
            </SettingsCell>

            <SettingsCell side="right">
                <div>
                    <label>
                        <SettingsRadio
                            type="radio"
                            name="smartComposePersonalSetting"
                            value="on"
                            defaultChecked
                        />
                        <BoldLabel>Personalisation on</BoldLabel>
                    </label>
                </div>

                <div style={{ marginTop: "6px" }}>
                    <label>
                        <SettingsRadio
                            type="radio"
                            name="smartComposePersonalSetting"
                            value="off"
                        />
                        <BoldLabel>Personalisation off</BoldLabel>
                    </label>
                </div>
            </SettingsCell>
        </SettingsRow>
    );
}
