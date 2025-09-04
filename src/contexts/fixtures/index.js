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
  recipients,
  recipientLabels,
};

// Re-export individual fixtures for convenience
export { initialUser, initialEmails, recipients, recipientLabels };
