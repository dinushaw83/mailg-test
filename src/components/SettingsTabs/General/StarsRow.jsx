import { SettingsRow, SettingsCell, BoldLabel, LearnMoreLink } from "./styles";

export default function StarsRow() {
  return (
    <SettingsRow>
      <SettingsCell side="left">
        <BoldLabel>Stars:</BoldLabel>
      </SettingsCell>
      <SettingsCell side="right">
        <BoldLabel>Drag the stars between the lists.</BoldLabel> They’ll rotate in the order shown when you click.{" "}
        <br />
        {/* Presets (simplified version) */}
        <div style={{ marginTop: "8px" }}>
          <LearnMoreLink as="span">1 star</LearnMoreLink> | <LearnMoreLink as="span">4 stars</LearnMoreLink> |{" "}
          <LearnMoreLink as="span">all stars</LearnMoreLink>
        </div>
      </SettingsCell>
    </SettingsRow>
  );
}
