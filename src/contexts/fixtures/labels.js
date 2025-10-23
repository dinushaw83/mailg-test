export const initialLabels = {
  // system "folders" (don't delete/rename in UI)
  Inbox: { system: true, exclusive: false, color: null },
  Sent: { system: true, exclusive: false, color: null },
  Drafts: { system: true, exclusive: false, color: null },
  Scheduled: { system: true, exclusive: false, color: null },
  Spam: { system: true, exclusive: true, color: null },
  Trash: { system: true, exclusive: true, color: null },

  // top-level custom labels
  Work: { system: false, color: null },
  Personal: { system: false, color: null },
  Newsletters: { system: false, color: null },
  Projects: { system: false, color: null },

  // nested labels under Work
  "Work::Clients": { system: false, color: null },
  "Work::Clients::Invoices": { system: false, color: null },
  "Work::Reports": { system: false, color: null },

  // nested labels under Personal
  "Personal::Travel": { system: false, color: null },
  "Personal::Receipts": { system: false, color: null },

  // nested labels under Projects
  "Projects::2025": { system: false, color: null },
  "Projects::2025::Website Redesign": { system: false, color: null },
  "Projects::2025::App Launch": { system: false, color: null },
};
