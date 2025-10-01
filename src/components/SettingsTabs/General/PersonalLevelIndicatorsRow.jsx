import {
    SettingsRow,
    SettingsCell,
    BoldLabel,
    SettingsRadio,
} from "./styles";

export default function PersonalLevelIndicatorsRow() {
    return (
        <SettingsRow>
            <SettingsCell side="left" width="20%">
                <BoldLabel>Personal level indicators:</BoldLabel>
            </SettingsCell>

            <SettingsCell side="right">
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
                                    id="pli-none"
                                    name="personalIndicators"
                                    type="radio"
                                    defaultChecked
                                    value="0"
                                />
                            </td>
                            <td style={{ margin: 0, padding: "0 0 0 8px" }}>
                                <label htmlFor="pli-none">
                                    <BoldLabel>No indicators</BoldLabel>
                                </label>
                            </td>
                        </tr>
                    </tbody>
                </table>

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
                                    id="pli-show"
                                    name="personalIndicators"
                                    type="radio"
                                    value="1"
                                />
                            </td>
                            <td style={{ margin: 0, padding: "0 0 0 8px" }}>
                                <label htmlFor="pli-show">
                                    <BoldLabel>Show indicators</BoldLabel>
                                </label>{" "}
                                - Display an arrow (<b>›</b>) by messages sent to my
                                address (not a mailing list), and a double arrow (
                                <b>»</b>) by messages sent only to me.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </SettingsCell>
        </SettingsRow>
    );
}
