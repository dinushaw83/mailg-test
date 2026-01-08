import { SettingsRow, SettingsCell, BoldLabel, StyledLink } from "./styles";

export default function AdsImportanceSignalsRow() {
  return (
    <SettingsRow>
      <SettingsCell side="left">
        <BoldLabel style={{ marginLeft: "6px" }}>Importance signals for ads:</BoldLabel>
      </SettingsCell>
      <SettingsCell side="right">
        You can view and change your preferences{" "}
        <StyledLink href="#" target="_blank">
          here
        </StyledLink>
        .
      </SettingsCell>
    </SettingsRow>
  );
}
