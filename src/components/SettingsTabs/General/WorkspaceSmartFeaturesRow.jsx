import { SettingsRow, SettingsCell, BoldLabel, LearnMoreLink } from "./styles";

export default function WorkspaceSmartFeaturesRow() {
  return (
    <SettingsRow>
      <SettingsCell side="left">
        <BoldLabel style={{ marginLeft: "6px" }}>MailG Workspace smart features:</BoldLabel>
      </SettingsCell>
      <SettingsCell side="right">
        <span>
          Choose to personalise your experience with smart features across Workspace and other MailG products. Workspace
          includes MailG, Chat, Meet and Drive.{" "}
          <LearnMoreLink href="#" target="_blank">
            Learn more
          </LearnMoreLink>
        </span>
        <br />
        <button style={{ cursor: "pointer", color: "#0b57d0", fontSize: ".875rem" }}>
          Manage Workspace smart feature settings
        </button>
      </SettingsCell>
    </SettingsRow>
  );
}
