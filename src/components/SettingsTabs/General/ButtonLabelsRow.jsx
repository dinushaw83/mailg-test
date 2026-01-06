import { SettingsRow, SettingsCell, BoldLabel, LearnMoreLink, SettingsRadio } from "./styles";

export default function ButtonLabelsRow() {
  return (
    <SettingsRow>
      <SettingsCell side="left">
        <BoldLabel style={{ marginLeft: "6px" }}>Button labels:</BoldLabel>
        <br />
        <LearnMoreLink href="#" target="_blank">
          Learn more
        </LearnMoreLink>
      </SettingsCell>
      <SettingsCell side="right">
        <label>
          <SettingsRadio
            type="radio"
            name="buttonLabels"
            value="icons"
            defaultChecked
            checked={true}
            onClick={(e) => e.preventDefault()}
          />
          <BoldLabel style={{ marginLeft: "6px" }}>Icons</BoldLabel>
        </label>
        <br />
        <label>
          <SettingsRadio
            type="radio"
            name="buttonLabels"
            value="text"
            checked={false}
            onClick={(e) => e.preventDefault()}
          />
          <BoldLabel style={{ marginLeft: "6px" }}>Text</BoldLabel>
        </label>
      </SettingsCell>
    </SettingsRow>
  );
}
