import {
    SettingsRow, SettingsCell,
    BoldLabel, SettingsRadio, 
} from "./styles";

export default function GrammarRow() {
    return (
        <SettingsRow>
            <SettingsCell width="20%" side="left">
                <BoldLabel>Grammar:</BoldLabel>
            </SettingsCell>

            <SettingsCell side="right">
                <div>
                    <label>
                        <SettingsRadio
                            type="radio"
                            name="grammarSetting"
                            value="on"
                            defaultChecked
                        />{" "}
                        <BoldLabel>Grammar suggestions on</BoldLabel>
                    </label>
                </div>

                <div style={{ marginTop: "6px" }}>
                    <label>
                        <SettingsRadio type="radio" name="grammarSetting" value="off" />{" "}
                        <BoldLabel>Grammar suggestions off</BoldLabel>
                    </label>
                </div>
            </SettingsCell>
        </SettingsRow>
    );
}
