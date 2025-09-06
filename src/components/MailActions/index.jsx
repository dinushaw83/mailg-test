import React, { useState, useRef, useMemo, Fragment } from "react";
import { useParams } from "react-router-dom";
import { Button, Divider, Box } from "@mui/material";

import MoveToMenu from "./MoveToMenu";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";
import SpamOrUnsubModal from "./SpamOrUnsubModal";
import { Icon } from "../InboxView/ActionBar";
import CreateLabelDialog from "../Labels/CreateLabelDialog";
import useLabels, { flattenTreeForSelect, makeKey, getPathLabelFromKey } from "../../hooks/useLabels";

export default function MailActions() {
    const {
        moveToSpam,
        notSpam,
        moveToTrash,
        moveToLabel,
        moveToLabelFrom,
        moveToInbox
    } = useMailActions();

    const { selection, setSnackbar } = useGlobalContext();
    const { labels, labelTree } = useLabels()

    const [open, setOpen] = useState(false);
    const anchorRef = useRef(null);
    const [createOpen, setCreateOpen] = useState(false);

    const [spamModal, setSpamModal] = useState({
        open: false,
        ids: [],
    });

    const { label: labelParam, folder } = useParams();
    const currentLabel = labelParam ? decodeURIComponent(labelParam) : null;

    const inSpam = folder === "spam";

    // Check if any selected emails are not in the inbox
    const menuItems = useMemo(() => {
        const flat = flattenTreeForSelect(labelTree); // [{ key, name, depth, system }]
        return flat
            .filter(item => !labels?.[item.key]?.system)
            .map(item => ({
                id: item.key,
                name: getPathLabelFromKey(labels, item.key), // "Parent / Child / ..."
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [labelTree, labels]);

    const handleMenuItemClick = async (item) => {
        const ids = [...selection.ids]; // Set → Array

        if (item.id === "__create_label__") {
            setCreateOpen(true);
            return;
        }

        if (!ids.length) return;

        try {
            if (item.id === "__inbox__" || item.id === "inbox") {
                moveToLabel(ids, "Inbox");
            } else if (item.id === "__spam__" || item.id === "spam") {
                setSpamModal({ open: true, ids });
                // moveToSpam(ids);
            } else if (item.id === "__trash__" || item.id === "trash") {
                moveToTrash(ids);
                // Show global snackbar with Undo action
                setSnackbar({
                    open: true,
                    message: "Conversation moved to Trash.",
                    autoHideDuration: 10000,
                    action: (
                        <Button
                            sx={{ textTransform: "none" }}
                            size="small"
                            onClick={() => {
                                moveToInbox(ids);
                                // Follow-up confirmation snackbar
                                setSnackbar({
                                    open: true,
                                    message: "Action undone.",
                                    autoHideDuration: 3000,
                                    action: null,
                                });
                            }}
                        >
                            Undo
                        </Button>
                    ),
                });
            } else {
                // item.id is now the TARGET LABEL KEY
                const targetKey = item.id;
                const curMeta = currentLabel ? labels?.[currentLabel] : null;
                const inCustomLabel = curMeta && curMeta.system === false;
                if (inCustomLabel) {
                    moveToLabelFrom(ids, currentLabel, targetKey);
                } else {
                    moveToLabel(ids, targetKey); // pass key
                }
            }
            setOpen(false);
            selection.clear();
        } catch (e) {
            console.error("Move failed:", e);
        }
    };

    const handleOnAfterCreate = (childName, parentKey) => {
        const ids = [...selection.ids];
        if (!ids.length) return;

        try {
            // Perform the move after creation
            const newKey = makeKey(childName, parentKey); // build composite key
            const curMeta = currentLabel ? labels?.[currentLabel] : null;
            const inCustomLabel = curMeta && curMeta.system === false;
            if (inCustomLabel) { moveToLabelFrom(ids, currentLabel, newKey); }
            else { moveToLabel(ids, newKey); }

            selection.clear();

            // --- UNDO action ---
            setSnackbar({
                open: true,
                message: `Conversation moved to “${childName}”.`,
                autoHideDuration: 10000,
                action: (
                    <Button
                        size="small"
                        onClick={() => {
                            try {
                                if (inCustomLabel) {
                                    moveToLabelFrom(ids, newKey, currentLabel);
                                } else {
                                    if (currentLabel) moveToLabel(ids, currentLabel);
                                    else moveToInbox(ids);
                                }

                                setSnackbar({
                                    open: true,
                                    message: "Action undone.",
                                    autoHideDuration: 3000,
                                    action: null,
                                });
                            } catch {
                                setSnackbar({
                                    open: true,
                                    message: "Could not undo.",
                                    autoHideDuration: 4000,
                                    action: null,
                                });
                            }
                        }}
                    >
                        Undo
                    </Button>
                ),
            });
        } catch (e) {
            setSnackbar({
                open: true,
                message: "Could not move selected conversations.",
                autoHideDuration: 4000,
            });
        }
    };

    return (
        <div className="Cq aqL" gh="mtb">
            <div className="bzn" jslog="202616; u014N:xr6bB">
                <div className="G-tF">
                    <div className="G-Ni J-J5-Ji">
                        <div
                            id=":2u"
                            className="T-I J-J5-Ji T-Pm T-I-ax7 L3 J-JN-M-I"
                            role="button"
                            tabIndex={0}
                            aria-haspopup="true"
                            aria-expanded="false"
                            data-tooltip="Select"
                            aria-label="Select"
                            style={{ userSelect: "none" }}
                        >
                            <div className="J-J5-Ji J-JN-M-I-Jm">
                                <span
                                    className="T-Jo J-J5-Ji"
                                    jslog="170807; u014N:cOuCgd,Kr2w4b;"
                                    aria-checked="false"
                                    role="checkbox"
                                    dir="ltr"
                                    style={{ userSelect: "none" }}
                                >
                                    <div className="T-Jo-auh sf-hidden" role="presentation" />
                                </span>
                                <div className="G-asx T-I-J3 J-J5-Ji" aria-hidden="true">
                                    &nbsp;
                                </div>
                            </div>
                            <div className="J-J5-Ji J-JN-M-I-JG sf-hidden" aria-hidden="true">
                                &nbsp;
                            </div>
                        </div>
                    </div>
                    <div>
                        <Box
                            sx={{
                                display: "flex",
                                gap: 1,
                                justifyContent: "flex-end",
                                mt: -1,
                            }}
                        >
                            {/* Shows up when a mail is selected */}
                            {selection.hasSelection && (
                                <Fragment>
                                    {inSpam && <Fragment>
                                        <Button
                                            variant="text"
                                            sx={{
                                                borderRadius: "4px",
                                                fontWeight: 500,
                                                color: "rgba(0,0,0,0.87)",
                                                textTransform: "none",
                                                px: 2,
                                                "&:hover": {
                                                    backgroundColor: "rgba(0,0,0,0.1)",
                                                },
                                            }}
                                        >
                                            Delete forever
                                        </Button>
                                        <Button
                                            variant="text"
                                            sx={{
                                                borderRadius: "4px",
                                                fontWeight: 500,
                                                color: "rgba(0,0,0,0.87)",
                                                textTransform: "none",
                                                px: 2,
                                                "&:hover": {
                                                    backgroundColor: "rgba(0,0,0,0.1)",
                                                },
                                            }}
                                            onClick={() => {
                                                notSpam([...selection.ids]);
                                            }}
                                        >
                                            Not Spam
                                        </Button>
                                    </Fragment>}

                                    <Fragment>
                                        {!inSpam && <Fragment>
                                            <Icon name="archive" label="Archive" onClick={() => console.log("Archive clicked")} />
                                            <Icon name="report" label="Report" onClick={() => console.log("Report clicked")} />
                                            <Icon
                                                name="delete"
                                                label="Delete"
                                                onClick={() => {
                                                    handleMenuItemClick({ id: "trash" });
                                                }}
                                            />
                                        </Fragment>}
                                        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                                        <Icon name="mail" label="Mail" onClick={() => console.log("Mail clicked")} />
                                        <div ref={anchorRef}>
                                            <Icon name="drive_file_move" label="Move" onClick={() => setOpen((s) => !s)} />
                                        </div>
                                    </Fragment>
                                </Fragment>
                            )}
                            <Icon name="more_vert" label="More options" onClick={() => console.log("More options clicked")} />
                        </Box>
                    </div>
                    <SpamOrUnsubModal
                        open={spamModal.open}
                        onClose={() => {
                            setSpamModal({ open: false, ids: [] });
                        }}
                        onReportSpam={() => {
                            moveToSpam(spamModal.ids);
                            setSpamModal({ open: false, ids: [] });
                        }}
                        onUnsubscribe={() => {
                            moveToSpam(spamModal.ids);
                            setSpamModal({ open: false, ids: [] });
                        }}
                    />
                    {open && (
                        <MoveToMenu
                            anchorRef={anchorRef}
                            labels={menuItems}
                            onSelect={handleMenuItemClick}
                            onClose={() => setOpen(false)}
                        />
                    )}
                    <CreateLabelDialog
                        open={createOpen}
                        onClose={() => setCreateOpen(false)}
                        onAfterCreate={handleOnAfterCreate}
                    />
                </div>
            </div>
        </div>
    );
}
