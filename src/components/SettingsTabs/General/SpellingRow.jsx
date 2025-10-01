import {
    SettingsRow, SettingsCell,
    BoldLabel, SettingsRadio, 
} from "./styles";

export default function SpellingRow() {
    return (
        <SettingsRow>
            <SettingsCell width="20%" side="left">
                <BoldLabel>Spelling:</BoldLabel>
            </SettingsCell>

            <SettingsCell side="right">
                <div>
                    <label>
                        <SettingsRadio
                            type="radio"
                            name="spellingSetting"
                            value="on"
                            defaultChecked
                        />
                        <BoldLabel>Spelling suggestions on</BoldLabel>
                    </label>
                </div>

                <div style={{ marginTop: "6px" }}>
                    <label>
                        <SettingsRadio type="radio" name="spellingSetting" value="off" />
                        <BoldLabel>Spelling suggestions off</BoldLabel>
                    </label>
                </div>
            </SettingsCell>
        </SettingsRow>
    );
}
