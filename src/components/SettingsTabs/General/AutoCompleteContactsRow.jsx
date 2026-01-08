import { SettingsRow, SettingsCell, BoldLabel } from "./styles";

export default function AutoCompleteContactsRow() {
  return (
    <SettingsRow>
      <SettingsCell side="left">
        <BoldLabel style={{ marginLeft: "6px" }}>Create contacts for auto-complete:</BoldLabel>
      </SettingsCell>
      <SettingsCell side="right">
        <table cellPadding="0" cellSpacing="0" style={{ borderSpacing: 0, margin: 0, borderCollapse: "separate" }}>
          <tbody>
            <tr style={{ verticalAlign: "top" }}>
              <td style={{ margin: 0, padding: 0 }}>
                <input
                  id="auto-complete-yes"
                  name="autoCompleteContacts"
                  type="radio"
                  defaultChecked
                  value="1"
                  style={{
                    fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                    margin: 0,
                    fontSize: "100%",
                    fontWeight: "normal",
                    height: "15px",
                    verticalAlign: "middle",
                  }}
                  checked={true}
                  onClick={(e) => e.preventDefault()}
                />
              </td>
              <td style={{ margin: 0, padding: "0 0 0 8px" }}>
                <label htmlFor="auto-complete-yes">
                  <BoldLabel style={{ marginLeft: "6px" }}>
                    When I send a message to a new person, add them to Other Contacts so that I can auto-complete to
                    them next time.
                  </BoldLabel>
                </label>
              </td>
            </tr>
          </tbody>
        </table>

        <table cellPadding="0" cellSpacing="0" style={{ borderSpacing: 0, margin: 0, borderCollapse: "separate" }}>
          <tbody>
            <tr style={{ verticalAlign: "top" }}>
              <td style={{ margin: 0, padding: 0 }}>
                <input
                  id="auto-complete-no"
                  name="autoCompleteContacts"
                  type="radio"
                  value="0"
                  style={{
                    fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                    margin: 0,
                    fontSize: "100%",
                    fontWeight: "normal",
                    height: "15px",
                    verticalAlign: "middle",
                  }}
                  checked={false}
                  onClick={(e) => e.preventDefault()}
                />
              </td>
              <td style={{ margin: 0, padding: "0 0 0 8px" }}>
                <label htmlFor="auto-complete-no">
                  <BoldLabel style={{ marginLeft: "6px" }}>I'll add contacts myself</BoldLabel>
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      </SettingsCell>
    </SettingsRow>
  );
}
