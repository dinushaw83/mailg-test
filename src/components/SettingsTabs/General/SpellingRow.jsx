import { SettingsRow, SettingsCell, BoldLabel, SettingsRadio } from "./styles";

export default function SpellingRow() {
  return (
    <SettingsRow>
      <SettingsCell width="20%" side="left">
        <BoldLabel style={{ marginLeft: "6px" }}>Spelling:</BoldLabel>
      </SettingsCell>

      <SettingsCell side="right">
        <div>
          <label>
            <SettingsRadio
              type="radio"
              name="spellingSetting"
              value="on"
              checked={true}
              onClick={(e) => e.preventDefault()}
            />
            <BoldLabel style={{ marginLeft: "6px" }}>Spelling suggestions on</BoldLabel>
          </label>
        </div>

        <div style={{ marginTop: "6px" }}>
          <label>
            <SettingsRadio
              type="radio"
              name="spellingSetting"
              value="off"
              checked={false}
              onClick={(e) => e.preventDefault()}
            />
            <BoldLabel style={{ marginLeft: "6px" }}>Spelling suggestions off</BoldLabel>
          </label>
        </div>
      </SettingsCell>
    </SettingsRow>
  );
}
