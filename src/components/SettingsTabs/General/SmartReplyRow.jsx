import { SettingsRow, SettingsCell, BoldLabel, SubText, SettingsRadio } from "./styles";

export default function SmartReplyRow() {
  return (
    <SettingsRow>
      <SettingsCell side="left">
        <BoldLabel>Smart Reply:</BoldLabel>
        <br />
        <SubText>(Show suggested replies when available.)</SubText>
      </SettingsCell>
      <SettingsCell side="right">
        <label>
          <SettingsRadio
            type="radio"
            name="smartReplySetting"
            value="1"
            defaultChecked
            checked={true}
            onClick={(e) => e.preventDefault()}
          />
          <BoldLabel style={{ marginLeft: "6px" }}> Smart Reply on</BoldLabel>
        </label>
        <br />
        <label>
          <SettingsRadio
            type="radio"
            name="smartReplySetting"
            value="0"
            checked={false}
            onClick={(e) => e.preventDefault()}
          />
          <BoldLabel style={{ marginLeft: "6px" }}> Smart Reply off</BoldLabel>
        </label>
      </SettingsCell>
    </SettingsRow>
  );
}
