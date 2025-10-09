import { useState, useEffect } from "react";
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
import DeleteSignatureDialog from "./DeleteSignatureDialog";

export default function SignatureRow({
    localSignatures,
    setLocalSignatures
}) {
    const [openDialog, setOpenDialog] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [activeSignature, setActiveSignature] = useState(null);
    const [editingSignature, setEditingSignature] = useState(null);

    const signatures = localSignatures?.list ?? [];
    const editingSignatureData = signatures[editingSignature];

    const handleAfterCreate = (name, editingSignatureIndex) => {
        // Copy current list
        const updatedSignatures = [...signatures];

        if (editingSignatureIndex !== undefined && editingSignatureIndex !== null) {
            // EDIT MODE: update name only
            updatedSignatures[editingSignatureIndex] = {
                ...updatedSignatures[editingSignatureIndex],
                name,
            };
        } else {
            // CREATE MODE: add new signature
            updatedSignatures.push({ name, content: "" });
        }

        setLocalSignatures({
            ...localSignatures,
            list: updatedSignatures,
        });

        setActiveSignature(signatures.length)
    }
    
    const handleAfterDelete = (name, editingSignatureIndex) => {
        setOpenDeleteDialog(false);
        const updatedSignatures = [...signatures];
        updatedSignatures.splice(editingSignatureIndex, 1);
        setLocalSignatures({
            ...localSignatures,
            list: updatedSignatures,
        });
    }

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
                {signatures?.length === 0 ? <>
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
                </> : <SignaturesForm
                    signatures={signatures}
                    activeSignature={activeSignature}
                    setActiveSignature={setActiveSignature}
                    setOpenDialog={setOpenDialog}
                    setEditingSignature={setEditingSignature}
                    editingSignature={editingSignature}
                    editingSignatureData={editingSignatureData}
                    setSignaturesState={setLocalSignatures}
                    setOpenDeleteDialog={setOpenDeleteDialog}
                    signaturesState={localSignatures}
                />}
            </SettingsCell>
            <NewSignatureDialog
                open={openDialog}
                onClose={() => {
                    setOpenDialog(false);
                    setEditingSignature(null); // reset edit mode on close
                }}
                onAfterCreate={handleAfterCreate}
                editingSignatureIndex={editingSignature}
                editingSignatureData={editingSignatureData}
            />
            <DeleteSignatureDialog
                open={openDeleteDialog}
                onClose={() => setOpenDeleteDialog(false)}
                onAfterDelete={handleAfterDelete}
                editingSignatureIndex={editingSignature}
                editingSignatureData={editingSignatureData}
            />
        </SettingsRow>
    );
}