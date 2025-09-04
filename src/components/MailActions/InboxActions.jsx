import React, { useState, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import Tooltip from "@mui/material/Tooltip";

import MoveToMenu from "./MoveToMenu";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";
import SpamOrUnsubModal from "./SpamOrUnsubModal";
import UndoToast from "./UndoToast";
import { Icon } from "../InboxView/ActionBar";
import { Divider } from "@mui/material";

export default function InboxActions() {
  const { moveToSpam, moveToTrash, moveToLabel, moveToLabelFrom, moveToInbox } = useMailActions();
  const { selection, labels, emails } = useGlobalContext();

  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);

  const [toast, setToast] = useState({ open: false, ids: [] });
  const [toastUndone, setToastUndone] = useState(false);
  const [isSpamModalOpen, setIsSpamModalOpen] = useState(false);
  const [spamModal, setSpamModal] = useState({
    open: false,
    ids: [],
  });

  const { label: labelParam } = useParams();
  const currentLabel = labelParam ? decodeURIComponent(labelParam) : null;

  const customLabels = useMemo(() => {
    const map = labels || {};
    return Object.entries(map)
      .filter(([, meta]) => !meta.system)
      .map(([name]) => ({ id: "__label__" + name, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [labels]);

  // Check if any selected emails are not in the inbox
  const showInboxOption = useMemo(() => {
    if (!selection.hasSelection) return false;
    const selectedIds = [...selection.ids];
    return selectedIds.some((id) => {
      const email = emails.find((e) => e.id === id);
      return email && !email.labels?.includes("Inbox");
    });
  }, [selection.ids, selection.hasSelection, emails]);

  const handleMenuItemClick = async (item) => {
    const ids = [...selection.ids]; // Set → Array
    if (!ids.length) return;

    try {
      if (item.id === "__inbox__" || item.id === "inbox") {
        moveToLabel(ids, "Inbox");
      } else if (item.id === "__spam__" || item.id === "spam") {
        setSpamModal({ open: true, ids });
        // moveToSpam(ids);
      } else if (item.id === "__trash__" || item.id === "trash") {
        setToast({ open: true, ids });
        moveToTrash(ids);
      } else if (item.id.startsWith("__label__")) {
        // moving between labels:
        if (currentLabel && labels?.[currentLabel] && labels?.[currentLabel]["system"] === false) {
          moveToLabelFrom(ids, currentLabel, item.name);
        } else {
          moveToLabel(ids, item.name);
        }
      }
      setOpen(false);
      selection.clear();
    } catch (e) {
      console.error("Move failed:", e);
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
            <div>
              {/* Shows up when a mail is selected */}
              {selection.hasSelection && (
                <React.Fragment>
                  <div className="T-I J-J5-Ji nu T-I-ax7 L3">
                    <Icon name="archive" label="Archive" onClick={() => console.log("Archive clicked")} />

                    <Icon name="report" label="Report" onClick={() => console.log("Report clicked")} />

                    <Icon
                      name="delete"
                      label="Delete"
                      onClick={() => {
                        handleMenuItemClick({ id: "trash" });
                      }}
                    />

                    <Divider orientation="vertical" sx={{ mr: 1 }} />

                    <Icon name="mail" label="Mail" onClick={() => console.log("Mail clicked")} />

                    <div ref={anchorRef}>
                      <Icon name="drive_file_move" label="Move" onClick={() => setOpen((s) => !s)} />
                    </div>
                  </div>

                  {open && (
                    <MoveToMenu
                      anchorRef={anchorRef}
                      labels={customLabels}
                      onSelect={handleMenuItemClick}
                      onClose={() => setOpen(false)}
                    />
                  )}
                </React.Fragment>
              )}

              <div className="G-Ni J-J5-Ji">
                <div
                  id=":2w"
                  className="T-I J-J5-Ji nf T-I-ax7 L3"
                  role="button"
                  tabIndex={0}
                  aria-label="More email options"
                  aria-haspopup="false"
                  aria-expanded="false"
                  data-tooltip="More"
                >
                  <div className="asa">
                    <div className="bjy T-I-J3 J-J5-Ji" />
                  </div>
                  <div className="G-asx T-I-J3 J-J5-Ji sf-hidden">&nbsp;</div>
                </div>
              </div>
              <div
                className="J-M jQjAxd"
                role="menu"
                aria-haspopup="true"
                style={{
                  display: "none",
                  userSelect: "none",
                }}
              />
            </div>
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
          <UndoToast
            autoHideMs={10000}
            open={toast.open}
            message="Conversation moved to Trash."
            onUndo={() => {
              moveToInbox(toast.ids);
              setToast({ open: false, ids: [] });
              setToastUndone(true);
            }}
            onClose={() => setToast({ open: false, ids: [] })}
          />

          <UndoToast
            open={toastUndone}
            message="Action undone."
            showLink={false}
            onClose={() => setToastUndone(false)}
          />
        </div>
      </div>
    </div>
  );
}
