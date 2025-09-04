// Fixtures index file - exports all fixture data

import { initialUser } from "./me";
import { initialEmails } from "./emails";
import { recipients } from "./recipients";
import { recipientLabels } from "./recipientLabels";

export const initialState = {
  user: initialUser,
  emails: initialEmails,
  currentView: "inbox",
  selectedEmails: [],
  composeOpen: false,
  labels: {
    // system "folders" (don’t delete/rename in UI)
    Inbox: { system: true, exclusive: false, color: null },
    Sent: { system: true, exclusive: false, color: null },
    Drafts: { system: true, exclusive: false, color: null },
    Spam: { system: true, exclusive: true, color: null },
    Trash: { system: true, exclusive: true, color: null },

    // default custom examples
    "[Imap]/Drafts": { system: false, color: "#e1e3e1" },
    "[Imap]/Sent": { system: false, color: "#e1e3e1" },
    Work: { system: false, color: "#e1e3e1" },
  },
  recipients,
  recipientLabels,
};

// Re-export individual fixtures for convenience
export { initialUser, initialEmails, recipients, recipientLabels };
