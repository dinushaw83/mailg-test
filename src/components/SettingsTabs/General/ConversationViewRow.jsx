import { SettingsRow, SettingsCell, BoldLabel, SettingsRadio } from "./styles";

export default function ConversationViewRow() {
  return (
    <SettingsRow>
      <SettingsCell width="20%" side="left">
        <BoldLabel>Conversation view:</BoldLabel>
        <br />
        <span style={{ fontSize: "0.75rem" }}>(sets whether emails of the same topic are grouped together)</span>
      </SettingsCell>

      <SettingsCell side="right">
        <div>
          <label>
            <SettingsRadio
              type="radio"
              name="conversationView"
              value="on"
              checked={true}
              onClick={(e) => e.preventDefault()}
            />
            <BoldLabel style={{ marginLeft: "6px" }}>Conversation view on</BoldLabel>
          </label>
        </div>

        <div style={{ marginTop: "6px" }}>
          <label>
            <SettingsRadio
              type="radio"
              name="conversationView"
              value="off"
              checked={false}
              onClick={(e) => e.preventDefault()}
            />
            <BoldLabel style={{ marginLeft: "6px" }}>Conversation view off</BoldLabel>
          </label>
        </div>
      </SettingsCell>
    </SettingsRow>
  );
}
