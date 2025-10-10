import {
    SettingsRow, SettingsCell,
    BoldLabel, LearnMoreLink, SettingsRadio, 
} from "./styles";

export default function KeyboardShortcutsRow() {
    return (
        <SettingsRow>
            <SettingsCell side="left">
                <BoldLabel style={{ marginLeft: "6px" }}>Keyboard shortcuts:</BoldLabel>
                <br />
                <LearnMoreLink
                    href="#"
                    target="_blank"
                >
                    Learn more
                </LearnMoreLink>
            </SettingsCell>
            <SettingsCell side="right">
                <label>
                    <SettingsRadio type="radio" name="shortcuts" value="off" defaultChecked checked={true} onClick={(e) => e.preventDefault()} />
                    <BoldLabel style={{ marginLeft: "6px" }}>Keyboard shortcuts off</BoldLabel>
                </label>
                <br />
                <label>
                    <SettingsRadio type="radio" name="shortcuts" value="on" checked={false} onClick={(e) => e.preventDefault()} />
                    <BoldLabel style={{ marginLeft: "6px" }}>Keyboard shortcuts on</BoldLabel>
                </label>
            </SettingsCell>
        </SettingsRow>
    );
}