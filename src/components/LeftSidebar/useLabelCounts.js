import React, { useMemo } from "react";

export default function useLabelCounts(emails = []) {
  return useMemo(() => {
    const count = (name) =>
      emails.filter((m) => (m.labels || []).includes(name)).length;
    return {
      "[Imap]/Drafts": count("[Imap]/Drafts"),
      "[Imap]/Sent": count("[Imap]/Sent"),
    };
  }, [emails]);
}
