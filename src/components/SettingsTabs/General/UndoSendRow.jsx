import {
    SettingsRow, SettingsCell,
    BoldLabel, InlineSelect
} from "./styles";


export default function UndoSendRow() {
    return (
        <SettingsRow>
            <SettingsCell width="20%" side="left">
                <BoldLabel>Undo Send:</BoldLabel>
            </SettingsCell>
            <SettingsCell side="right">
                <div style={{ fontWeight: "bold", overflowWrap: "break-word" }}>
                    Send cancellation period:{" "}
                    <InlineSelect defaultValue="5">
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="30">30</option>
                    </InlineSelect>{" "}
                    seconds
                </div>
            </SettingsCell>
        </SettingsRow>
    );
}
