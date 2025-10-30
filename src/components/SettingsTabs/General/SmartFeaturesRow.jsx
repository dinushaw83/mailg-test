import { SettingsRow, SettingsCell, BoldLabel, LearnMoreLink, SettingsCheckbox } from "./styles";

export default function SmartFeaturesRow() {
  return (
    <SettingsRow>
      <SettingsCell side="left">
        <BoldLabel>Smart features:</BoldLabel>
        <br />
        <LearnMoreLink href="#" target="_blank">
          Learn more
        </LearnMoreLink>
      </SettingsCell>
      <SettingsCell side="right">
        <label>
          <SettingsCheckbox type="checkbox" defaultChecked checked={true} onClick={(e) => e.preventDefault()} />{" "}
          <strong style={{ marginLeft: "6px" }}>Turn on smart features in MailG, Chat and Meet - </strong>
          When you turn this setting on, you agree to let MailG, Chat and Meet use your content and activity to provide
          smart features and personalise your experience.
        </label>
      </SettingsCell>
    </SettingsRow>
  );
}
