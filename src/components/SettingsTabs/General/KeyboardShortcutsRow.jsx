import {
    SettingsRow, SettingsCell,
    BoldLabel, LearnMoreLink, SettingsRadio, 
} from "./styles";

export default function KeyboardShortcutsRow() {
    return (
        <SettingsRow>
            <SettingsCell side="left">
                <BoldLabel>Keyboard shortcuts:</BoldLabel>
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
                    <SettingsRadio type="radio" name="shortcuts" value="off" defaultChecked />{" "}
                    <BoldLabel>Keyboard shortcuts off</BoldLabel>
                </label>
                <br />
                <label>
                    <SettingsRadio type="radio" name="shortcuts" value="on" />{" "}
                    <BoldLabel>Keyboard shortcuts on</BoldLabel>
                </label>
            </SettingsCell>
        </SettingsRow>
    );
}