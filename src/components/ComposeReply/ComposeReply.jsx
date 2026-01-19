import React, { useEffect, useRef, useState } from "react";
import { deleteEmailThunk, setEmailsForCategory } from "../../store/slices/mailSlice";

import ActionButton from "../common/ActionButton";
import ReplyContainer from "./ReplyContainer";
import forwardImage from "../../icons/forward.png";
import replyAllImage from "../../icons/replyall.png";
import replyImage from "../../icons/reply.png";
import { useDispatch } from "react-redux";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { useHotkeys } from "react-hotkeys-hook";

// Helper to check if a string is a UUID
const isUUID = (str) => {
  if (!str || typeof str !== "string") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const useCustomHotKeys = ({ handleReply, handleReplyAll, handleForward }) => {
  const { keyboardShortcuts } = useGlobalContext();
  const shortcutsOn = keyboardShortcuts === "shortcuts-on";

  useHotkeys(shortcutsOn ? "r" : "", () => {
    handleReply();
  });

  useHotkeys(shortcutsOn ? "a" : "", () => {
    handleReplyAll();
  });

  useHotkeys(shortcutsOn ? "f" : "", () => {
    handleForward();
  });
};

const ComposeReply = React.forwardRef(({ email, draft }, ref) => {
  const replyContainerRef = useRef();
  const dispatch = useDispatch();
  const { mailFolders } = useGlobalContext();

  const [showReplyContainer, setShowReplyContainer] = useState(Boolean(draft));
  const [replyType, setReplyType] = useState(null);
  const [currentDraftId, setCurrentDraftId] = useState(draft ? draft.id : null);
  const [replyToEmail, setReplyToEmail] = useState(null);

  // Helper to find draft by thread_id
  const findDraftForThread = (thread_id) => {
    const drafts = mailFolders.drafts || [];
    return drafts.find((draft) => draft.thread_id === thread_id && draft.labels?.includes("Drafts"));
  };

  const handleReplyToEmail = async (clickedEmail) => {
    if (!clickedEmail) return;

    // Find existing draft for this thread
    const existingDraft = findDraftForThread(clickedEmail.thread_id);

    if (existingDraft) {
      // Flow 2: Delete existing draft
      try {
        // Only try to delete if draft has a valid ID
        if (existingDraft.id && isUUID(existingDraft.id.toString())) {
          try {
            await dispatch(
              deleteEmailThunk({
                emailId: existingDraft.id,
                thread_id: clickedEmail.thread_id,
              })
            ).unwrap();
          } catch (deleteError) {
            // If draft doesn't exist (404), that's fine - it's already deleted
            // Check for 404 in both error response formats
            const is404 =
              deleteError?.statusCode === 404 ||
              deleteError?.response?.status === 404 ||
              deleteError?.message?.includes("not found");

            // Only log non-404 errors
            if (!is404) {
              console.error("Failed to delete existing draft:", deleteError);
            }
            // Continue anyway - we'll remove from Redux below
          }
        }

        // Always remove from Redux state (even if API delete failed, returned 404, or draft had no ID)
        // This cleans up stale drafts that don't exist in backend or have invalid IDs
        const drafts = mailFolders.drafts || [];
        const filteredDrafts = drafts.filter((d) => {
          // Safely compare IDs - exclude the draft we're deleting
          if (!existingDraft?.id) {
            // If existingDraft has no ID, we can't match it, so keep all drafts
            return true;
          }
          if (!d?.id) {
            // If current draft has no ID but existingDraft does, keep it (it's not the one we're deleting)
            return true;
          }
          // Both have IDs - exclude if they match
          return d.id.toString() !== existingDraft.id.toString();
        });
        dispatch(setEmailsForCategory({ category: "drafts", emails: filteredDrafts }));
      } catch (error) {
        // Fallback error handler (shouldn't reach here, but just in case)
        console.error("Unexpected error while deleting draft:", error);
        // Still remove from Redux to clean up stale data
        const drafts = mailFolders.drafts || [];
        const filteredDrafts = drafts.filter((d) => {
          // Safely compare IDs - exclude the draft we're deleting
          if (!existingDraft?.id) {
            // If existingDraft has no ID, we can't match it, so keep all drafts
            return true;
          }
          if (!d?.id) {
            // If current draft has no ID but existingDraft does, keep it (it's not the one we're deleting)
            return true;
          }
          // Both have IDs - exclude if they match
          return d.id.toString() !== existingDraft.id.toString();
        });
        dispatch(setEmailsForCategory({ category: "drafts", emails: filteredDrafts }));
      }
    }

    // Set the clicked email as reply target
    setReplyToEmail(clickedEmail);
    setReplyType("reply");
    setShowReplyContainer(true);
    setCurrentDraftId(null);
  };

  const handleReply = () => {
    setReplyToEmail(null); // Reset to use default email prop
    setReplyType("reply");
    setShowReplyContainer(true);
    setCurrentDraftId(null);
  };

  const handleReplyAll = () => {
    setReplyToEmail(null); // Reset to use default email prop
    setReplyType("replyAll");
    setShowReplyContainer(true);
    setCurrentDraftId(null);
  };

  const handleForward = () => {
    setReplyToEmail(null); // Reset to use default email prop
    setReplyType("forward");
    setShowReplyContainer(true);
    setCurrentDraftId(null);
  };

  React.useImperativeHandle(ref, () => ({
    handleReply,
    handleReplyToEmail,
  }));

  useEffect(() => {
    setShowReplyContainer(Boolean(draft));
    setCurrentDraftId(draft ? draft.id : null);
    setReplyToEmail(null); // Reset when draft changes
  }, [draft]);

  // Focus the editor when a draft is loaded
  useEffect(() => {
    if (draft && replyContainerRef.current) {
      // Small delay to ensure the editor is fully rendered
      setTimeout(() => {
        replyContainerRef.current?.focusEditor?.();
      }, 100);
    }
  }, [draft]);

  useCustomHotKeys({ handleReply, handleReplyAll, handleForward });

  return (
    <div data-testid="email-response-view" style={{ marginTop: "4rem", marginBottom: "2rem" }}>
      {!showReplyContainer && !draft && (
        <div style={{ marginLeft: "78px" }}>
          <ActionButton text="Reply" onClick={handleReply} icon={<img src={replyImage} alt="Reply" />} />
          <ActionButton text="Reply all" onClick={handleReplyAll} icon={<img src={replyAllImage} alt="Reply all" />} />
          <ActionButton text="Forward" onClick={handleForward} icon={<img src={forwardImage} alt="Forward" />} />
        </div>
      )}
      {(showReplyContainer || !!draft) && (
        <ReplyContainer
          ref={replyContainerRef}
          email={email}
          replyToEmail={replyToEmail}
          draft={draft}
          replyType={draft ? draft.replyType || "reply" : replyType}
          currentDraftId={draft ? draft.id : currentDraftId}
          onClose={() => {
            setShowReplyContainer(false);
            setReplyToEmail(null); // Reset on close
          }}
          onUndoDelete={(restoredId) => {
            setCurrentDraftId(restoredId);
            setShowReplyContainer(true);
          }}
        />
      )}
    </div>
  );
});

export default React.memo(ComposeReply);
