import {
    SettingsRow, SettingsCell,
    BoldLabel, SubNote,
} from "./styles";


export function DefaultTextStyleRow() {
    return (
        <SettingsRow>
            <SettingsCell width="20%" side="left">
                <BoldLabel>Default text style:</BoldLabel>
                <SubNote>
                    (Use the 'Remove formatting' button on the toolbar to reset the default text style)
                </SubNote>
            </SettingsCell>
            <SettingsCell side="right">
                <div
                    style={{
                        background: "rgba(255, 255, 255, 0.95)",
                        padding: "2px",
                        width: "405px",
                        boxShadow:
                            "rgba(0,0,0,0.14) 0px 4px 5px, rgba(0,0,0,0.12) 0px 1px 10px, rgba(0,0,0,0.2) 0px 2px 4px -1px",
                    }}
                >
                    {/* Toolbar placeholder */}
                    <div
                        style={{
                            border: "1px solid #e5e5e5",
                            padding: "6px",
                            fontSize: "13px",
                            marginBottom: "4px",
                        }}
                    >
                        Formatting toolbar (Font, Size, Color, Clear)
                    </div>

                    {/* Preview */}
                    <div
                        style={{
                            border: "1px solid #cfcfcf",
                            padding: "6px",
                            fontSize: "13px",
                            background: "#fff",
                        }}
                    >
                        This is what your body text will look like.
                    </div>
                </div>
            </SettingsCell>
        </SettingsRow>
    );
}
