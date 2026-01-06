import { SettingsRow, SettingsCell, BoldLabel, StyledLink, SettingsRadio } from "./styles";

export function ImagesRow() {
  return (
    <SettingsRow>
      <SettingsCell width="20%" side="left">
        <BoldLabel>Images:</BoldLabel>
      </SettingsCell>
      <SettingsCell side="right">
        <div>
          <label>
            <SettingsRadio
              type="radio"
              name="imagesSetting"
              value="always"
              checked={true}
              onClick={(e) => e.preventDefault()}
            />{" "}
            <BoldLabel style={{ marginLeft: "6px" }}>Always display external images</BoldLabel> –{" "}
            <StyledLink href="#" target="_blank">
              Learn more
            </StyledLink>
          </label>
        </div>

        <div style={{ marginTop: "6px" }}>
          <label>
            <SettingsRadio
              type="radio"
              name="imagesSetting"
              value="ask"
              checked={false}
              onClick={(e) => e.preventDefault()}
            />{" "}
            <BoldLabel>Ask before displaying external images</BoldLabel> – This option also disables dynamic email.
          </label>
        </div>
      </SettingsCell>
    </SettingsRow>
  );
}
