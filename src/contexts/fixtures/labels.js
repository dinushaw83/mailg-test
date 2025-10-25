export const initialLabels = {
  // system "folders" (don't delete/rename in UI)
  Inbox: { system: true, exclusive: false, color: null },
  Sent: { system: true, exclusive: false, color: null },
  Drafts: { system: true, exclusive: false, color: null },
  Scheduled: { system: true, exclusive: false, color: null },
  Spam: { system: true, exclusive: true, color: null },
  Trash: { system: true, exclusive: true, color: null },

  // top-level custom labels
  Work: { system: false, color: { rgb: "rgb(227, 215, 255)", text: "rgb(61, 24, 142)" }, parentKey: null },
  Personal: { system: false, color: { rgb: "rgb(73, 134, 231)", text: "rgb(255, 255, 255)" }, parentKey: null },
  Newsletters: { system: false, color: { rgb: "rgb(45, 162, 187)", text: "rgb(255, 255, 255)" }, parentKey: null },
  Projects: { system: false, color: { rgb: "rgb(246, 145, 178)", text: "rgb(153, 74, 100)" }, parentKey: null },

  // nested labels under Work
  "Work::Clients": { system: false, color: { rgb: "rgb(255, 200, 175)", text: "rgb(122, 46, 11)" }, parentKey: "Work" },
  "Work::Clients::Invoices": { system: false, color: null, parentKey: "Work::Clients" },
  "Work::Reports": { system: false, color: { rgb: "rgb(179, 239, 211)", text: "rgb(11, 79, 48)" }, parentKey: "Work" },

  // nested labels under Personal
  "Personal::Travel": {
    system: false,
    color: { rgb: "rgb(182, 207, 245)", text: "rgb(13, 52, 114)" },
    parentKey: "Personal",
  },
  "Personal::Receipts": {
    system: false,
    color: { rgb: "rgb(231, 231, 231)", text: "rgb(70, 70, 70)" },
    parentKey: "Personal",
  },

  // nested labels under Projects
  "Projects::2025": { system: false, color: null, parentKey: "Projects" },
  "Projects::2025::Website Redesign": { system: false, color: null, parentKey: "Projects::2025" },
  "Projects::2025::App Launch": { system: false, color: null, parentKey: "Projects::2025" },
};
