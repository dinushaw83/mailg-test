import { useState } from "react";
import Button from "@mui/material/Button";

import {
    SettingsRow,
    SettingsCell,
    BoldLabel,
    LearnMoreLink,
    SubNote,
} from "../styles";
import NewSignatureDialog from "./NewSignatureDialog";
import SignaturesForm from "./SignaturesForm";

export default function SignatureRow() {
    const [openDialog, setOpenDialog] = useState(false);
    const [signatures, setSignatures] = useState([]);

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
                {signatures.length === 0 ? <>
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
                        onClick={() => setOpenDialog(true)}
                    >
                        <span
                            className="material-symbols-outlined"
                            style={{
                                fontSize: 20,
                                color: 'rgb(26,115,232)',
                            }}
                        >
                            add
                        </span>

                        Create new
                    </Button>
                </> : <SignaturesForm signatures={signatures} />}
            </SettingsCell>
            <NewSignatureDialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                onAfterCreate={(name) => {
                    console.log("New signature created:", name);
                    setSignatures([...signatures, name]);
                }}
            />
        </SettingsRow>
    );
}