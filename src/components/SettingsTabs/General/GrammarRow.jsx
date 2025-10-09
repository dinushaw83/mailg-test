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
                            checked={true}
                            onClick={(e) => e.preventDefault()}
                        />{" "}
                        <BoldLabel style={{ marginLeft: "6px" }}>Grammar suggestions on</BoldLabel>
                    </label>
                </div>

                <div style={{ marginTop: "6px" }}>
                    <label>
                        <SettingsRadio type="radio" name="grammarSetting" value="off" checked={false} onClick={(e) => e.preventDefault()} />{" "}
                        <BoldLabel style={{ marginLeft: "6px" }}>Grammar suggestions off</BoldLabel>
                    </label>
                </div>
            </SettingsCell>
        </SettingsRow>
    );
}
