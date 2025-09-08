import Box from "@mui/material/Box";
import { Icon } from "../InboxView/ActionBar";
import React, { Fragment, useMemo, useRef, useState } from "react";
import Divider from "@mui/material/Divider";
import MoveToMenu from "./MoveToMenu";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";
import { useParams } from "react-router-dom";
import Button from "@mui/material/Button";
import SpamOrUnsubModal from "./SpamOrUnsubModal";
import useLabels, { flattenTreeForSelect, getPathLabelFromKey } from "../../hooks/useLabels";
import CreateLabelDialog from "../Labels/CreateLabelDialog";

export default function MailActions() {
  const { moveToSpam, notSpam, moveToTrash, moveToLabel, moveToLabelFrom, moveToInbox, archive, deleteForever } =
    useMailActions();

  const { emails, selection, setSnackbar } = useGlobalContext();
  const { labels, labelTree } = useLabels();

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
  const inAllMail = folder === "all";
  const inTrash = folder === "trash";

  // Check if any selected emails are not in the inbox
  const menuItems = useMemo(() => {
    const flat = flattenTreeForSelect(labelTree); // [{ key, name, depth, system }]
    return flat
      .filter((item) => !labels?.[item.key]?.system)
      .map((item) => ({
        id: item.key,
        name: getPathLabelFromKey(labels, item.key), // "Parent / Child / ..."
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [labelTree, labels]);

  const shouldDisableArchiveButton = useMemo(() => {
    // No selection → disable
    if (!selection?.ids?.size) return true;

    // Normalise selected ids (can be message id, '#thread-f:...' or bare thread key)
    const targets = new Set([...selection.ids].map((id) => String(id).trim()));

    const matchesSelection = (m) => {
      const keys = [
        String(m.id),
        String(m.threadId),
        m.threadId && String(m.threadId).replace("#thread-f:", ""),
      ].filter(Boolean);
      return keys.some((k) => targets.has(k));
    };

    // Enable Archive if ANY matched message is in Inbox
    const hasAnyInInbox = emails.some((m) => matchesSelection(m) && (m.labels || []).includes("Inbox"));

    // Disable only when none of the selected items are in Inbox
    return !hasAnyInInbox;
  }, [emails, selection?.ids]);

  const onArchive = () => {
    const ids = [...selection.ids];
    if (!ids.length) return;
    try {
      archive(ids);
      setSnackbar({
        open: true,
        message: "Conversation archived.",
        autoHideDuration: 3000,
        action: (
          <Button
            sx={{ textTransform: "none" }}
            size="small"
            onClick={() => {
              moveToInbox(ids);
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
      selection.clear();
    } catch (e) {
      console.error("Archive failed:", e);
    }
  };

  const onMoveArchivedMailToInbox = () => {
    const ids = [...selection.ids];
    if (!ids.length) return;
    try {
      moveToInbox(ids);
      setSnackbar({
        open: true,
        message: "Conversation moved to Inbox.",
        autoHideDuration: 3000,
        action: null,
      });
      selection.clear();
    } catch (e) {
      console.error("Move to Inbox failed:", e);
    }
  };

  const onDeleteForever = () => {
    const ids = [...selection.ids];
    if (!ids.length) return;

    try {
      deleteForever(ids);
      setSnackbar({
        open: true,
        message: "Conversation deleted forever.",
        autoHideDuration: 3000,
        action: null,
      });
      selection.clear();
    } catch (e) {
      console.error("Delete forever failed:", e);
    }
  };

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
      if (inCustomLabel) {
        moveToLabelFrom(ids, currentLabel, newKey);
      } else {
        moveToLabel(ids, newKey);
      }

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
                  {(inSpam || inTrash) && (
                    <Fragment>
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
                        onClick={onDeleteForever}
                      >
                        Delete forever
                      </Button>
                      <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 24, alignSelf: "center" }} />
                      {inSpam && (
                        <>
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
                          <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 24, alignSelf: "center" }} />
                        </>
                      )}
                    </Fragment>
                  )}

                  <Fragment>
                    {!inSpam && (
                      <>
                        <Fragment>
                          {!inTrash && (
                            <Icon
                              name="archive"
                              label="Archive"
                              onClick={onArchive}
                              disabled={shouldDisableArchiveButton}
                            />
                          )}
                          <Icon name="report" label="Report spam" onClick={() => console.log("Report clicked")} />
                          {!inTrash && (
                            <Icon
                              name="delete"
                              label="Delete"
                              onClick={() => {
                                handleMenuItemClick({ id: "trash" });
                              }}
                            />
                          )}
                        </Fragment>
                        {!inTrash && (
                          <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 24, alignSelf: "center" }} />
                        )}
                      </>
                    )}
                    <Icon name="mail" label="Mark as read" onClick={() => console.log("Mail clicked")} />
                    {!inAllMail && (
                      <div ref={anchorRef}>
                        <Icon name="drive_file_move" label="Move to" onClick={() => setOpen((s) => !s)} />
                      </div>
                    )}
                    {inAllMail && (
                      <Icon name="move_to_inbox" label="Move to Inbox" onClick={onMoveArchivedMailToInbox} />
                    )}
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
