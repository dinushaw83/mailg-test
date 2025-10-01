import Button from "@mui/material/Button";

import {
    SettingsRow,
    SettingsCell,
    BoldLabel,
    LearnMoreLink,
    SubNote,
} from "./styles";

export default function SignatureRow() {
    return (
        <SettingsRow>
            <SettingsCell side="left" width="20%">
                <BoldLabel>Signature:</BoldLabel>
                <SubNote>(appended at the end of all outgoing messages)</SubNote>
                <LearnMoreLink
                    href="#"
                    target="_blank"
                >
                    Learn more
                </LearnMoreLink>
            </SettingsCell>

            <SettingsCell side="right">
                <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
                    No signatures
                </div>
                <Button
                    variant="outlined"
                    size="small"
                    sx={{
                        color: "rgb(26, 115, 232)",
                        borderColor: "rgb(218, 220, 224)",
                        textTransform: "none",
                        fontWeight: 500,
                        marginTop: "10px",
                    }}
                >
                    <span
                        style={{
                            fontSize: "18px",
                            fontWeight: "bold",
                            marginRight: "6px",
                            lineHeight: 1,
                        }}
                    >
                        +
                    </span>

                    Create new
                </Button>
            </SettingsCell>
        </SettingsRow>
    );
}