export const initialLabels = {
  // system "folders" (don't delete/rename in UI)
  Inbox: { system: true, exclusive: false, color: null },
  Sent: { system: true, exclusive: false, color: null },
  Drafts: { system: true, exclusive: false, color: null },
  Scheduled: { system: true, exclusive: false, color: null },
  Spam: { system: true, exclusive: true, color: null },
  Trash: { system: true, exclusive: true, color: null },

  // top-level custom labels
  Work: { system: false, color: null, parentKey: null },
  Personal: { system: false, color: null, parentKey: null },
  Newsletters: { system: false, color: null, parentKey: null },
  Projects: { system: false, color: null, parentKey: null },

  // nested labels under Work
  "Work::Clients": { system: false, color: null, parentKey: "Work" },
  "Work::Clients::Invoices": { system: false, color: null, parentKey: "Work::Clients" },
  "Work::Reports": { system: false, color: null, parentKey: "Work" },

  // nested labels under Personal
  "Personal::Travel": { system: false, color: null, parentKey: "Personal" },
  "Personal::Receipts": { system: false, color: null, parentKey: "Personal" },

  // nested labels under Projects
  "Projects::2025": { system: false, color: null, parentKey: "Projects" },
  "Projects::2025::Website Redesign": { system: false, color: null, parentKey: "Projects::2025" },
  "Projects::2025::App Launch": { system: false, color: null, parentKey: "Projects::2025" },
};
