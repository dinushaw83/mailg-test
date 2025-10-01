import {
    SettingsRow,
    SettingsCell,
    BoldLabel,
    SettingsRadio,
} from "./styles";

export default function SnippetsRow() {
    return (
        <SettingsRow>
            <SettingsCell side="left" width="20%">
                <BoldLabel>Snippets:</BoldLabel>
            </SettingsCell>

            <SettingsCell side="right">
                {/* Show snippets */}
                <table
                    style={{
                        borderSpacing: 0,
                        margin: 0,
                        borderCollapse: "separate",
                    }}
                >
                    <tbody>
                        <tr style={{ verticalAlign: "top" }}>
                            <td style={{ margin: 0, padding: 0 }}>
                                <SettingsRadio
                                    id="snippets-show"
                                    name="snippetsSetting"
                                    type="radio"
                                    defaultChecked
                                    value="0"
                                />
                            </td>
                            <td style={{ margin: 0, padding: "0 0 0 8px" }}>
                                <label htmlFor="snippets-show">
                                    <BoldLabel>Show snippets</BoldLabel>
                                </label>{" "}
                                - Show snippets of the message (like Google Web Search!).
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* No snippets */}
                <table
                    style={{
                        borderSpacing: 0,
                        margin: 0,
                        borderCollapse: "separate",
                    }}
                >
                    <tbody>
                        <tr style={{ verticalAlign: "top" }}>
                            <td style={{ margin: 0, padding: 0 }}>
                                <SettingsRadio
                                    id="snippets-none"
                                    name="snippetsSetting"
                                    type="radio"
                                    value="1"
                                />
                            </td>
                            <td style={{ margin: 0, padding: "0 0 0 8px" }}>
                                <label htmlFor="snippets-none">
                                    <BoldLabel>No snippets</BoldLabel>
                                </label>{" "}
                                - Show subject only.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </SettingsCell>
        </SettingsRow>
    );
}
