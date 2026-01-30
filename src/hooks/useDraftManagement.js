import {
  beToFeDraft,
  feToBeDraftPayload,
  feToBeDraftUpdatePayload,
  feToBeReplyDraftPayload,
} from "../utils/draftMapper";
import { createAttachmentThunk, deleteAttachmentThunk } from "../store/slices/attachmentSlice";
import {
  createDraftThunk,
  createReplyDraftThunk,
  fetchEmailByIdThunk,
  setEmailsForCategory,
  updateDraftThunk,
} from "../store/slices/mailSlice";
import {
  generateLegacyThreadId,
  generateNextIntegerId,
  generateThreadId,
  isValidEmail,
} from "../utils/helperFunctions";
import { useCallback, useEffect, useRef, useState } from "react";

import { store } from "../store";
import { useDispatch } from "react-redux";
import { useGlobalContext } from "../contexts/GlobalContext";

// Helper to check if a string is a UUID
const isUUID = (str) => {
  if (!str || typeof str !== "string") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const useDraftManagement = ({
  to,
  cc,
  bcc,
  subject,
  content,
  currentDraftId,
  parentEmail,
  replyType,
  composeWindowId,
  setComposeWindows,
  isReply = false,
  replyAll = false,
} = {}) => {
  const { mailFolders, loggedInUser } = useGlobalContext();
  const emails = mailFolders.drafts || [];
  const dispatch = useDispatch();

  const [draftSaved, setDraftSaved] = useState(false);
  const [isDraft, setIsDraft] = useState(currentDraftId ? true : false);
  const [draftId, setDraftId] = useState(currentDraftId || null);
  const [hasPutUpdateCompleted, setHasPutUpdateCompleted] = useState(false);

  const autoSaveTimeoutRef = useRef(null);
  const draftSavedTimeoutRef = useRef(null);
  const previousContentRef = useRef(null);
  // API call refs
  const apiCallTimeoutRef = useRef(null);
  const isFirstSaveRef = useRef(true); // Start as true for new drafts
  const backendDraftIdRef = useRef(null);
  const lastApiContentRef = useRef(null); // Track last content sent to API
  const isSavingRef = useRef(false); // Prevent concurrent saves (race condition)
  const localDraftIdRef = useRef(null); // Track local draft ID to avoid stale closure issues
  // Filter valid recipients
  const getValidRecipients = (recipients) => {
    return recipients.filter((recipient) => {
      const email = recipient.email || recipient.name || recipient;
      return isValidEmail(email);
    });
  };

  // Check if there's content worth saving as draft
  const hasDraftContent = useCallback(() => {
    const hasValidRecipients =
      getValidRecipients(to).length > 0 || getValidRecipients(cc).length > 0 || getValidRecipients(bcc).length > 0;

    const hasSubject = subject.trim().length > 0;
    const hasBody = content.html.trim().length > 0 || content.plainText.trim().length > 0;

    return hasValidRecipients || hasSubject || hasBody;
  }, [to, cc, bcc, subject, content]);

  // Check if content has changed since last save
  const hasContentChanged = useCallback(() => {
    const currentContent = {
      to: to.map((r) => r.email || r.name || r).sort(),
      cc: cc.map((r) => r.email || r.name || r).sort(),
      bcc: bcc.map((r) => r.email || r.name || r).sort(),
      subject: subject.trim(),
      html: content.html.trim(),
      plainText: content.plainText.trim(),
    };

    // If previous content is not set, but currentDraftId is passed, the content may be available in the drafts state
    if (!previousContentRef.current && currentDraftId) {
      const draftEmail = emails.find((email) => email.id?.toString() === currentDraftId?.toString());
      if (draftEmail) {
        previousContentRef.current = {
          to: draftEmail.to,
          cc: draftEmail.cc,
          bcc: draftEmail.bcc,
          subject: draftEmail.subject === "(no subject)" ? "" : draftEmail.subject,
          html: draftEmail.body,
          plainText: draftEmail.preview,
        };
      }
    }

    // Check if the previous content is set
    if (!previousContentRef.current) {
      return true; // First time saving
    }

    const previousContent = previousContentRef.current;

    return (
      JSON.stringify(currentContent.to) !== JSON.stringify(previousContent.to) ||
      JSON.stringify(currentContent.cc) !== JSON.stringify(previousContent.cc) ||
      JSON.stringify(currentContent.bcc) !== JSON.stringify(previousContent.bcc) ||
      currentContent.subject !== previousContent.subject ||
      currentContent.html !== previousContent.html ||
      currentContent.plainText !== previousContent.plainText
    );
  }, [to, cc, bcc, subject, content]);

  // Initialize backend draft ID if currentDraftId is a UUID
  useEffect(() => {
    // For compose windows (with composeWindowId), reset refs when window changes
    if (composeWindowId) {
      if (currentDraftId && isUUID(currentDraftId.toString())) {
        // Existing draft - fetch from backend
        backendDraftIdRef.current = currentDraftId.toString();
        localDraftIdRef.current = currentDraftId.toString(); // Track in local ref too
        isFirstSaveRef.current = false;
        isSavingRef.current = false; // Reset saving lock
        lastApiContentRef.current = null; // Reset to allow fetching fresh content
        setHasPutUpdateCompleted(true); // Existing draft already has PUT update completed
      } else {
        // New draft - reset everything
        backendDraftIdRef.current = null;
        localDraftIdRef.current = null; // Reset local draft ID
        isFirstSaveRef.current = true;
        isSavingRef.current = false; // Reset saving lock
        lastApiContentRef.current = null;
        setHasPutUpdateCompleted(false); // New draft hasn't had PUT update yet
      }
      return;
    }

    // For ReplyContainer (no composeWindowId), reset refs when currentDraftId changes to null
    // This handles the case when a draft is deleted and we're switching to reply to a different email
    // Also reset when parentEmail changes (switching to reply to different email)
    if (!currentDraftId) {
      // No draft ID - reset everything to treat as new draft
      backendDraftIdRef.current = null;
      localDraftIdRef.current = null; // Reset local draft ID
      isFirstSaveRef.current = true;
      isSavingRef.current = false; // Reset saving lock
      lastApiContentRef.current = null;
      setHasPutUpdateCompleted(false); // New draft hasn't had PUT update yet
    } else if (currentDraftId && isUUID(currentDraftId.toString())) {
      // Existing draft - set refs
      backendDraftIdRef.current = currentDraftId.toString();
      localDraftIdRef.current = currentDraftId.toString(); // Track in local ref too
      isFirstSaveRef.current = false;
      isSavingRef.current = false; // Reset saving lock
      lastApiContentRef.current = null;
      setHasPutUpdateCompleted(true); // Existing draft already has PUT update completed
    }
  }, [currentDraftId, composeWindowId, parentEmail]); // Add parentEmail to dependencies to reset refs when switching reply target

  // Save draft to backend API using Redux thunks
  const saveDraftToBackend = useCallback(
    async (isFirstSave) => {
      // Prevent concurrent saves - if already saving, skip this call
      // This prevents race condition where multiple POSTs create duplicate drafts
      if (isSavingRef.current) {
        return;
      }

      // Set saving flag immediately to prevent concurrent calls
      isSavingRef.current = true;

      try {
        let action;

        if (isFirstSave) {
          // Only create if no draft exists yet (prevents double POST from stale callbacks or saveToBackendNow + debounce)
          const draftAlreadyExists =
            backendDraftIdRef.current !== null ||
            (currentDraftId && isUUID(currentDraftId.toString()));
          if (draftAlreadyExists) {
            isSavingRef.current = false;
            return saveDraftToBackend(false);
          }

          // IMPORTANT: Set isFirstSaveRef to false BEFORE the API call to prevent
          // race conditions where another save triggers while this one is in flight
          isFirstSaveRef.current = false;

          // Determine if this is a reply from replyType (if isReply not explicitly set)
          const isReplyMode =
            isReply || (replyType && (replyType === "reply" || replyType === "replyAll") && parentEmail?.id);
          const isReplyAllMode = replyAll || replyType === "replyAll";

          // POST to create new draft
          if (isReplyMode && parentEmail?.id) {
            // Use reply endpoint for replies - payload only needs body, html_body, reply_all
            const payload = feToBeReplyDraftPayload(content, isReplyAllMode);
            action = await dispatch(createReplyDraftThunk({ emailId: parentEmail.id, draftData: payload })).unwrap();
                      setHasPutUpdateCompleted(true);

          } else if (!currentDraftId ) {
            // Use regular draft endpoint for compose emails
            const payload = feToBeDraftPayload(to, cc, bcc, subject, content, null);
            action = await dispatch(createDraftThunk(payload)).unwrap();
            setHasPutUpdateCompleted(true);
          }
        } else {
          // PUT to update existing draft
          // Use currentDraftId if it's a UUID (from backend), otherwise fallback to backendDraftIdRef
          const backendId =
            currentDraftId && isUUID(currentDraftId.toString()) ? currentDraftId.toString() : backendDraftIdRef.current;
          if (!backendId) {
            console.warn("Cannot update draft: no backend draft ID");
            return;
          }
          // Combine all recipients into a single array with type field
          const recipients = [
            ...(to || []).map((r) => ({
              email: r.email || r.name || r,
              name: r.name || r.email || r,
              type: "to",
            })),
            ...(cc || []).map((r) => ({
              email: r.email || r.name || r,
              name: r.name || r.email || r,
              type: "cc",
            })),
            ...(bcc || []).map((r) => ({
              email: r.email || r.name || r,
              name: r.name || r.email || r,
              type: "bcc",
            })),
          ];
          const payload = feToBeDraftUpdatePayload({
            subject,
            content,
            is_read: true,
            is_starred: false,
            is_important: false,
            folder: "drafts",
            category: "primary",
            recipients,
          });
          action = await dispatch(updateDraftThunk({ emailId: backendId, draftData: payload })).unwrap();
          // Mark PUT update as completed after successful update
          setHasPutUpdateCompleted(true);
        }

        // Show "Draft saved" only on backend success; auto-hide after 2.5s
        if (draftSavedTimeoutRef.current) {
          clearTimeout(draftSavedTimeoutRef.current);
        }
        setDraftSaved(true);
        draftSavedTimeoutRef.current = setTimeout(() => {
          setDraftSaved(false);
        }, 1000);

        const backendDraft = action;
        const newBackendId = backendDraft.id;

        try {
          // Fetch the created draft using unwrap() - throws if rejected
          const fetchedDraft = await dispatch(fetchEmailByIdThunk(newBackendId)).unwrap();

          // Transform fetched draft data
          const feDraft = beToFeDraft(fetchedDraft);
          if (!feDraft) {
            console.warn("Failed to transform fetched draft response");
            // Fallback to POST response
            const feDraftFallback = beToFeDraft(backendDraft);
            if (feDraftFallback) {
              // Update Redux drafts array with POST response
              const state = store.getState();
              const currentDrafts = state.mail.drafts || [];
              // Use localDraftIdRef to get current local draft ID (avoids stale closure issue)
              const currentLocalDraftId = localDraftIdRef.current;
              const filteredDrafts = currentDrafts.filter(
                (email) =>
                  email.id?.toString() !== currentLocalDraftId?.toString() && 
                  email.id?.toString() !== draftId?.toString() && 
                  email.id?.toString() !== backendDraft.id?.toString()
              );
              const updatedDrafts = [feDraftFallback, ...filteredDrafts];
              dispatch(setEmailsForCategory({ category: "drafts", emails: updatedDrafts }));

              // Update draft ID to backend UUID
              setDraftId(newBackendId);
              localDraftIdRef.current = newBackendId; // Update ref to backend ID
              backendDraftIdRef.current = newBackendId;
              isFirstSaveRef.current = false;

              // Update last API content reference
              lastApiContentRef.current = {
                to: to.map((r) => (typeof r === "string" ? r : r.email || r.name || r)).sort(),
                cc: cc.map((r) => (typeof r === "string" ? r : r.email || r.name || r)).sort(),
                bcc: bcc.map((r) => (typeof r === "string" ? r : r.email || r.name || r)).sort(),
                subject: subject.trim(),
                html: content.html.trim(),
                plainText: content.plainText.trim(),
              };

              // Update compose window draft ID
              if (composeWindowId && setComposeWindows) {
                setComposeWindows((prev) =>
                  prev.map((window) => (window.id === composeWindowId ? { ...window, draftId: newBackendId } : window))
                );
              }
            }
            return;
          }
          // Update Redux drafts array with fetched draft
          const state = store.getState();
          const currentDrafts = state.mail.drafts || [];
          // Use localDraftIdRef to get current local draft ID (avoids stale closure issue)
          const currentLocalDraftId = localDraftIdRef.current;
          const filteredDrafts = currentDrafts.filter(
            (email) =>
              email.id?.toString() !== currentLocalDraftId?.toString() && 
              email.id?.toString() !== draftId?.toString() && 
              email.id?.toString() !== fetchedDraft.id?.toString()
          );
          const updatedDrafts = [feDraft, ...filteredDrafts];
          dispatch(setEmailsForCategory({ category: "drafts", emails: updatedDrafts }));

          // Update draft ID to backend UUID
          setDraftId(newBackendId);
          localDraftIdRef.current = newBackendId; // Update ref to backend ID
          backendDraftIdRef.current = newBackendId;
          isFirstSaveRef.current = false;

          // Update lastApiContentRef with CURRENT form values (what we sent in POST)
          // This prevents unnecessary PUT calls when form fields match what we sent
          lastApiContentRef.current = {
            to: to.map((r) => (typeof r === "string" ? r : r.email || r.name || r)).sort(),
            cc: cc.map((r) => (typeof r === "string" ? r : r.email || r.name || r)).sort(),
            bcc: bcc.map((r) => (typeof r === "string" ? r : r.email || r.name || r)).sort(),
            subject: subject.trim(),
            html: content.html.trim(),
            plainText: content.plainText.trim(),
            attachments: feDraft.attachments,
          };

          // Update compose window draft ID
          if (composeWindowId && setComposeWindows) {
            setComposeWindows((prev) =>
              prev.map((window) => (window.id === composeWindowId ? { ...window, draftId: newBackendId } : window))
            );
          }
        } catch (error) {
          console.error("Failed to fetch draft details:", error);
          // Fallback: use POST response data
          const feDraft = beToFeDraft(backendDraft);
          if (feDraft) {
            // Update Redux drafts array with POST response
            const state = store.getState();
            const currentDrafts = state.mail.drafts || [];
            // Use localDraftIdRef to get current local draft ID (avoids stale closure issue)
            const currentLocalDraftId = localDraftIdRef.current;
            const filteredDrafts = currentDrafts.filter(
              (email) =>
                email.id?.toString() !== currentLocalDraftId?.toString() && 
                email.id?.toString() !== draftId?.toString() && 
                email.id?.toString() !== backendDraft.id?.toString()
            );
            const updatedDrafts = [feDraft, ...filteredDrafts];
            dispatch(setEmailsForCategory({ category: "drafts", emails: updatedDrafts }));

            // Update draft ID to backend UUID
            setDraftId(newBackendId);
            localDraftIdRef.current = newBackendId; // Update ref to backend ID
            backendDraftIdRef.current = newBackendId;
            isFirstSaveRef.current = false;

            // Update last API content reference
            lastApiContentRef.current = {
              to: to.map((r) => (typeof r === "string" ? r : r.email || r.name || r)).sort(),
              cc: cc.map((r) => (typeof r === "string" ? r : r.email || r.name || r)).sort(),
              bcc: bcc.map((r) => (typeof r === "string" ? r : r.email || r.name || r)).sort(),
              subject: subject.trim(),
              html: content.html.trim(),
              plainText: content.plainText.trim(),
              attachments: feDraft.attachments,
            };

            // Update compose window draft ID
            if (composeWindowId && setComposeWindows) {
              setComposeWindows((prev) =>
                prev.map((window) => (window.id === composeWindowId ? { ...window, draftId: newBackendId } : window))
              );
            }
          }
        }
      } catch (error) {
        console.error("Error saving draft to backend:", error);
        // If first save failed, reset the flag so it can be retried
        if (!backendDraftIdRef.current) {
          isFirstSaveRef.current = true;
        }
        throw error;
      } finally {
        // Always release the saving lock
        isSavingRef.current = false;
      }
    },
    [
      to,
      cc,
      bcc,
      subject,
      content,
      draftId,
      composeWindowId,
      setComposeWindows,
      dispatch,
      isReply,
      parentEmail,
      replyAll,
      replyType,
    ]
  );

  // Force actual save to backend NOW (used for attachments)
  const saveToBackendNow = useCallback(async () => {
    // Determine if this is first save
    const hasBackendDraft = backendDraftIdRef.current !== null;
    const hasCurrentDraftId = currentDraftId && isUUID(currentDraftId.toString());
    const isFirstSave = !hasBackendDraft && !hasCurrentDraftId && isFirstSaveRef.current;

    // Clear existing API call timeout
    if (apiCallTimeoutRef.current) {
      clearTimeout(apiCallTimeoutRef.current);
    }

    try {
      await saveDraftToBackend(isFirstSave);
      return backendDraftIdRef.current;
    } catch (error) {
      console.error("Manual save to backend failed:", error);
      return null;
    }
  }, [currentDraftId, saveDraftToBackend]);

  // Create draft email object
  const createDraftEmail = useCallback(
    (id = null) => {
      const validTo = getValidRecipients(to);
      const validCc = getValidRecipients(cc);
      const validBcc = getValidRecipients(bcc);

      const timestamp = new Date().toISOString();
      const timeDisplay = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      // Reuse existing thread identifiers if updating an existing draft
      const effectiveId = id || null;
      const existingDraft = effectiveId
        ? emails.find((email) => email.id?.toString() === effectiveId?.toString())
        : null;

      // Resolve thread identifiers
      const resolvedThreadId = existingDraft?.thread_id || parentEmail?.thread_id || generateThreadId();
      const resolvedLegacyThreadId =
        existingDraft?.legacyThreadId || parentEmail?.legacyThreadId || generateLegacyThreadId();
      const resolvedLegacyLastMessageId = existingDraft?.legacyLastMessageId || resolvedLegacyThreadId;

      const draftEmail = {
        id: effectiveId || generateNextIntegerId(emails),
        thread_id: resolvedThreadId,
        legacyThreadId: resolvedLegacyThreadId,
        legacyLastMessageId: resolvedLegacyLastMessageId,
        replyType: replyType || existingDraft?.replyType,
        legacyLastNonDraftMessageId: null, // Drafts don't have non-draft messages
        from: {
          name: loggedInUser.name,
          email: loggedInUser.email,
        },
        to: validTo.map((recipient) => recipient.email),
        cc: validCc.length > 0 ? validCc.map((recipient) => recipient.email) : [],
        bcc: validBcc.length > 0 ? validBcc.map((recipient) => recipient.email) : [],
        subject: subject.trim() || "(no subject)",
        body: content.html,
        preview: content.plainText,
        timestamp: timestamp,
        timeDisplay: timeDisplay,
        read: true,
        starred: false,
        important: false,
        labels: ["Drafts"],
        labelColor: "#e1e3e1",
      };

      return draftEmail;
    },
    [to, cc, bcc, subject, content, emails, loggedInUser]
  );

  // Save draft to emails state
  const saveDraft = useCallback(
    (isAutoSave = false) => {
      if (!hasDraftContent()) {
        return false;
      }

      // Only save if content has changed or it's the first time
      if (!hasContentChanged() && currentDraftId) {
        return false;
      }

      const draftEmail = createDraftEmail(draftId);
      const newDraftId = draftEmail.id;

      // Update Redux drafts array
      const state = store.getState();
      const currentDrafts = state.mail.drafts || [];

      // Remove existing draft if updating (use ref to get current value, avoiding stale closure)
      const currentLocalDraftId = localDraftIdRef.current || draftId;
      const filteredDrafts = currentLocalDraftId
        ? currentDrafts.filter((email) => email.id?.toString() !== currentLocalDraftId?.toString())
        : currentDrafts;

      // Add new/updated draft at the beginning
      const updatedDrafts = [draftEmail, ...filteredDrafts];
      dispatch(setEmailsForCategory({ category: "drafts", emails: updatedDrafts }));

      setDraftId(newDraftId);
      localDraftIdRef.current = newDraftId; // Track in ref for backend save to use
      setIsDraft(true);

      // Update previous content reference
      previousContentRef.current = {
        to: to.map((r) => r.email || r.name || r).sort(),
        cc: cc.map((r) => r.email || r.name || r).sort(),
        bcc: bcc.map((r) => r.email || r.name || r).sort(),
        subject: subject.trim(),
        html: content.html.trim(),
        plainText: content.plainText.trim(),
      };

      // Note: "Draft saved" is shown only on backend API success (see saveDraftToBackend), not on local save.

      return true;
    },
    [
      hasDraftContent,
      hasContentChanged,
      createDraftEmail,
      draftId,
      dispatch,
      to,
      cc,
      bcc,
      subject,
      content,
      saveDraftToBackend,
    ]
  );

  // Auto-save functionality - Local save (1 second debounce)
  useEffect(() => {
    // Check if there's content worth saving
    const hasValidRecipients =
      getValidRecipients(to).length > 0 || getValidRecipients(cc).length > 0 || getValidRecipients(bcc).length > 0;

    const hasSubject = subject.trim().length > 0;
    const hasBody = content.html.trim().length > 0 || content.plainText.trim().length > 0;

    const hasContent = hasValidRecipients || hasSubject || hasBody;

    if (!hasContent) {
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for local auto-save (1 second after last activity)
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveDraft(true);
    }, 400);

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [to, cc, bcc, subject, content, saveDraft]);

  // Clear "Draft saved" as soon as the user edits (to, cc, bcc, subject, or content)
  useEffect(() => {
    setDraftSaved(false);
    if (draftSavedTimeoutRef.current) {
      clearTimeout(draftSavedTimeoutRef.current);
      draftSavedTimeoutRef.current = null;
    }
  }, [to, cc, bcc, subject, content]);

  // Check if content has changed since last API call
  const hasApiContentChanged = useCallback(() => {
    const currentContent = {
      to: to.map((r) => r.email || r.name || r).sort(),
      cc: cc.map((r) => r.email || r.name || r).sort(),
      bcc: bcc.map((r) => r.email || r.name || r).sort(),
      subject: subject.trim(),
      html: content.html.trim(),
      plainText: content.plainText.trim(),
    };

    // If no previous API content, it's a change (first save)
    if (!lastApiContentRef.current) {
      return true;
    }

    const previousApiContent = lastApiContentRef.current;

    return (
      JSON.stringify(currentContent.to) !== JSON.stringify(previousApiContent.to) ||
      JSON.stringify(currentContent.cc) !== JSON.stringify(previousApiContent.cc) ||
      JSON.stringify(currentContent.bcc) !== JSON.stringify(previousApiContent.bcc) ||
      currentContent.subject !== previousApiContent.subject ||
      currentContent.html !== previousApiContent.html ||
      currentContent.plainText !== previousApiContent.plainText
    );
  }, [to, cc, bcc, subject, content]);

  // Debounced API call - triggers directly on input changes
  useEffect(() => {
    // Determine if this is first save
    // Check if we have a backend draft ID from a previous POST (for reply drafts without composeWindowId)
    const hasBackendDraft = backendDraftIdRef.current !== null;
    // Check if currentDraftId prop indicates an existing draft (for drafts loaded from parent)
    const hasCurrentDraftId = currentDraftId && isUUID(currentDraftId.toString());
    // It's first save only if we have neither AND isFirstSaveRef is still true
    const isFirstSave = !hasBackendDraft && !hasCurrentDraftId && isFirstSaveRef.current;

    // Determine if this is a reply from replyType (if isReply not explicitly set)
    const isReplyMode =
      isReply || (replyType && (replyType === "reply" || replyType === "replyAll") && parentEmail?.id);

    // For reply drafts on first save, check body content AND valid recipients AND content changed
    if (isReplyMode && isFirstSave) {
      const hasBody = content.html.trim().length > 0 || content.plainText.trim().length > 0;
      const hasValidRecipients =
        getValidRecipients(to).length > 0 || getValidRecipients(cc).length > 0 || getValidRecipients(bcc).length > 0;

      // Only create draft if user typed something AND there are valid recipients
      if (!hasBody || !hasValidRecipients) {
        return;
      }

      // For existing drafts that were already saved, check if content actually changed
      // This prevents API calls on scroll when content reference changes but values are the same
      if (lastApiContentRef.current && !hasApiContentChanged()) {
        return;
      }

      // Clear existing API call timeout
      if (apiCallTimeoutRef.current) {
        clearTimeout(apiCallTimeoutRef.current);
      }
      // 1 second delay for reply drafts
      apiCallTimeoutRef.current = setTimeout(() => {
        saveDraftToBackend(isFirstSave);
      }, 400);
      // Cleanup timeout on unmount or dependency change
      return () => {
        if (apiCallTimeoutRef.current) {
          clearTimeout(apiCallTimeoutRef.current);
        }
      };
    }

    // For regular drafts or updates, use existing logic
    // Check if there's content worth saving
    const hasValidRecipients =
      getValidRecipients(to).length > 0 || getValidRecipients(cc).length > 0 || getValidRecipients(bcc).length > 0;

    const hasSubject = subject.trim().length > 0;
    const hasBody = content.html.trim().length > 0 || content.plainText.trim().length > 0;

    const hasContent = hasValidRecipients || hasSubject || hasBody;

    if (!hasContent) {
      return;
    }

    // For PUT calls (updates), only proceed if content has changed
    if (!isFirstSave && !hasApiContentChanged()) {
      return;
    }

    // Clear existing API call timeout
    if (apiCallTimeoutRef.current) {
      clearTimeout(apiCallTimeoutRef.current);
    }

    // 500ms for first save, 1s for subsequent updates
    const delay = isFirstSave ? 100 : 400;

    // Debounce API call - triggers after delay of no input changes
    apiCallTimeoutRef.current = setTimeout(() => {
      saveDraftToBackend(isFirstSave);
    }, delay);

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (apiCallTimeoutRef.current) {
        clearTimeout(apiCallTimeoutRef.current);
      }
    };
  }, [to, cc, bcc, subject, content, hasApiContentChanged, isReply, parentEmail, replyAll, replyType, currentDraftId]);

  // Initialize previous content reference when form state is loaded for existing draft
  useEffect(() => {
    if (isDraft && draftId && !previousContentRef.current && hasDraftContent()) {
      // Initialize previous content reference with current form state
      const initialContent = {
        to: to.map((r) => r.email || r.name || r).sort(),
        cc: cc.map((r) => r.email || r.name || r).sort(),
        bcc: bcc.map((r) => r.email || r.name || r).sort(),
        subject: subject.trim(),
        html: content.html.trim(),
        plainText: content.plainText.trim(),
      };

      previousContentRef.current = initialContent;
    }
  }, [isDraft, draftId, to, cc, bcc, subject, content, hasDraftContent]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (draftSavedTimeoutRef.current) {
        clearTimeout(draftSavedTimeoutRef.current);
      }
      if (apiCallTimeoutRef.current) {
        clearTimeout(apiCallTimeoutRef.current);
      }
    };
  }, []);

  // Manual save (for close button)
  const saveDraftManually = useCallback(() => {
    return saveDraft(false);
  }, [saveDraft]);

  // Delete draft
  const deleteDraft = useCallback(() => {
    if (draftId) {
      const state = store.getState();
      const currentDrafts = state.mail.drafts || [];
      const filteredDrafts = currentDrafts.filter((email) => email.id?.toString() !== draftId?.toString());
      dispatch(setEmailsForCategory({ category: "drafts", emails: filteredDrafts }));
      setDraftId(null);
      setIsDraft(false);
    }
  }, [draftId, dispatch]);

  const saveAttachment = useCallback(
    async (attachmentData) => {
      let activeDraftId = draftId;

      // If we don't have a backend draft ID, force-save now to get one
      if (!activeDraftId || !isUUID(activeDraftId.toString())) {
        activeDraftId = await saveToBackendNow();
      }

      if (activeDraftId && isUUID(activeDraftId.toString())) {
        const data = await dispatch(createAttachmentThunk({ emailId: activeDraftId, attachmentData })).unwrap();
        return { error: null, data };
      } else {
        return { error: "No draft found", data: null };
      }
    },
    [dispatch, createAttachmentThunk, draftId, saveToBackendNow]
  );

  const removeAttachment = useCallback(
    async ({ attachmentId }) => {
      if (draftId && attachmentId) {
        try {
          await dispatch(deleteAttachmentThunk({ attachmentId, emailId: draftId })).unwrap();
          return { error: null };
        } catch (error) {
          console.error("Failed to delete attachment:", error);
          return { error: error.message || "Failed to delete attachment" };
        }
      }
      return { error: "Missing draft ID or attachment ID" };
    },
    [dispatch, deleteAttachmentThunk, draftId]
  );

  return {
    saveDraftManually,
    saveToBackendNow,
    deleteDraft,
    isDraft,
    draftId,
    draftSaved,
    hasDraftContent,
    saveAttachment,
    removeAttachment,
    attachments: lastApiContentRef.current?.attachments || [],
    hasPutUpdateCompleted,
  };
};
