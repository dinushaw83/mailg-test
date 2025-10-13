import { useState, useEffect, useRef, useCallback, useContext } from "react";
import { GlobalContext } from "../contexts/GlobalContext";
import {
  generateNextIntegerId,
  generateThreadId,
  generateLegacyThreadId,
  isValidEmail,
} from "../utils/helperFunctions";

export const useDraftManagement = ({ to, cc, bcc, subject, content, currentDraftId, parentEmail, replyType }) => {
  const { emails, setEmails, loggedInUser } = useContext(GlobalContext);
  const [draftSaved, setDraftSaved] = useState(false);
  const [isDraft, setIsDraft] = useState(currentDraftId ? true : false);
  const [draftId, setDraftId] = useState(currentDraftId || null);

  const autoSaveTimeoutRef = useRef(null);
  const draftSavedTimeoutRef = useRef(null);
  const previousContentRef = useRef(null);

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

    // If previous content is not set, but currentDraftId is passed, the content may be available in the emails state
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

  // Create draft email object
  const createDraftEmail = useCallback(
    (id = null) => {
      console.log("📝 createDraftEmail - Creating draft with content:", content);

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
      const resolvedThreadId = existingDraft?.threadId || parentEmail?.threadId || generateThreadId();
      const resolvedLegacyThreadId =
        existingDraft?.legacyThreadId || parentEmail?.legacyThreadId || generateLegacyThreadId();
      const resolvedLegacyLastMessageId = existingDraft?.legacyLastMessageId || resolvedLegacyThreadId;

      const draftEmail = {
        id: effectiveId || generateNextIntegerId(emails),
        threadId: resolvedThreadId,
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

      console.log("📝 createDraftEmail - Created draft email:", draftEmail);
      return draftEmail;
    },
    [to, cc, bcc, subject, content, emails, loggedInUser]
  );

  // Save draft to emails state
  const saveDraft = useCallback(
    (isAutoSave = false) => {
      console.log("💾 saveDraft - Called with isAutoSave:", isAutoSave);
      console.log("💾 saveDraft - Current content:", content);

      if (!hasDraftContent()) {
        console.log("💾 saveDraft - No draft content, skipping save");
        return false;
      }

      // Only save if content has changed or it's the first time
      if (!hasContentChanged()) {
        console.log("💾 saveDraft - Content unchanged, skipping save");
        return false;
      }

      console.log("💾 saveDraft - Creating draft email...");
      const draftEmail = createDraftEmail(draftId);
      const newDraftId = draftEmail.id;

      console.log("💾 saveDraft - Saving draft with ID:", newDraftId);
      setEmails((prevEmails) => {
        // Remove existing draft if updating
        const filteredEmails = draftId
          ? prevEmails.filter((email) => email.id?.toString() !== draftId?.toString())
          : prevEmails;

        // Add new/updated draft at the beginning
        const updatedEmails = [draftEmail, ...filteredEmails];
        console.log("💾 saveDraft - Updated emails list:", updatedEmails);
        return updatedEmails;
      });

      setDraftId(newDraftId);
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

      if (isAutoSave) {
        setDraftSaved(true);

        // Clear any existing timeout
        if (draftSavedTimeoutRef.current) {
          clearTimeout(draftSavedTimeoutRef.current);
        }

        // Reset draft saved state after 1 second
        draftSavedTimeoutRef.current = setTimeout(() => {
          setDraftSaved(false);
        }, 1000);
      }

      console.log("💾 saveDraft - Draft saved successfully");
      return true;
    },
    [hasDraftContent, hasContentChanged, createDraftEmail, draftId, setEmails, to, cc, bcc, subject, content]
  );

  // Auto-save functionality
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

    // Set new timeout for auto-save (1 second after last activity)
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveDraft(true);
    }, 1000);

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [to, cc, bcc, subject, content]);

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
    };
  }, []);

  // Manual save (for close button)
  const saveDraftManually = useCallback(() => {
    return saveDraft(false);
  }, [saveDraft]);

  // Delete draft
  const deleteDraft = useCallback(() => {
    if (draftId) {
      setEmails((prevEmails) => prevEmails.filter((email) => email.id?.toString() !== draftId?.toString()));
      setDraftId(null);
      setIsDraft(false);
    }
  }, [draftId, setEmails]);

  return {
    saveDraftManually,
    deleteDraft,
    isDraft,
    draftId,
    draftSaved,
    hasDraftContent,
  };
};
