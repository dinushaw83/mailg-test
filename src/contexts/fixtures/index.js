// Fixtures index file - exports all fixture data

import { initialUser } from './me'
import { initialEmails } from './emails'

export const initialState = {
  user: initialUser,
  emails: initialEmails,
  currentView: 'inbox',
  selectedEmails: [],
  composeOpen: false
}

// Re-export individual fixtures for convenience
export { initialUser, initialEmails }
