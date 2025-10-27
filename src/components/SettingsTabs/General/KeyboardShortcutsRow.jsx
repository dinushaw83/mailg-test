import { SettingsRow, SettingsCell, BoldLabel, LearnMoreLink, SettingsRadio } from "./styles";

export default function KeyboardShortcutsRow({ localShortcuts, setLocalShortcuts }) {
  return (
    <SettingsRow>
      <SettingsCell side="left">
        <BoldLabel style={{ marginLeft: "6px" }}>Keyboard shortcuts:</BoldLabel>
        <br />
        <LearnMoreLink href="#" target="_blank">
          Learn more
        </LearnMoreLink>
      </SettingsCell>
      <SettingsCell side="right">
        <label>
          <SettingsRadio
            type="radio"
            name="shortcuts"
            value="shortcuts-off"
            defaultChecked
            checked={localShortcuts === "shortcuts-off"}
            onClick={(e) => {
              e.preventDefault();
              setLocalShortcuts("shortcuts-off");
            }}
          />
          <BoldLabel style={{ marginLeft: "6px" }}>Keyboard shortcuts off</BoldLabel>
        </label>
        <br />
        <label>
          <SettingsRadio
            type="radio"
            name="shortcuts"
            value="shortcuts-on"
            checked={localShortcuts === "shortcuts-on"}
            onClick={(e) => {
              e.preventDefault();
              setLocalShortcuts("shortcuts-on");
            }}
          />
          <BoldLabel style={{ marginLeft: "6px" }}>Keyboard shortcuts on</BoldLabel>
        </label>
      </SettingsCell>
    </SettingsRow>
  );
}
