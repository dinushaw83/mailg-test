import { SettingsRow, SettingsCell, BoldLabel, SettingsRadio } from "./styles";

export function AutoCorrectRow() {
  return (
    <SettingsRow>
      <SettingsCell width="20%" side="left">
        <BoldLabel>Auto-correct:</BoldLabel>
      </SettingsCell>

      <SettingsCell side="right">
        <div>
          <label>
            <SettingsRadio
              type="radio"
              name="autocorrectSetting"
              value="on"
              checked={true}
              onClick={(e) => e.preventDefault()}
            />
            <BoldLabel style={{ marginLeft: "6px" }}>Auto-correct on</BoldLabel>
          </label>
        </div>

        <div style={{ marginTop: "6px" }}>
          <label>
            <SettingsRadio
              type="radio"
              name="autocorrectSetting"
              value="off"
              checked={false}
              onClick={(e) => e.preventDefault()}
            />
            <BoldLabel style={{ marginLeft: "6px" }}>Auto-correct off</BoldLabel>
          </label>
        </div>
      </SettingsCell>
    </SettingsRow>
  );
}
