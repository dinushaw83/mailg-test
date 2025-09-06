import { useMemo } from "react";
import { getThreadRows } from "../utils/emails";

export default function useMailFolders(emails = []) {
  const rows = getThreadRows(emails);

  return useMemo(() => {
    const folders = {
      inbox: getThreadRows(emails, { folder: "inbox" }),
      starred: getThreadRows(emails, { folder: "starred" }),
      snoozed: getThreadRows(emails, { folder: "snoozed" }),
      sent: getThreadRows(emails, { folder: "sent" }),
      drafts: getThreadRows(emails, { folder: "drafts" }),
      important: getThreadRows(emails, { folder: "important" }),
      chats: getThreadRows(emails, { folder: "chats" }),
      scheduled: getThreadRows(emails, { folder: "scheduled" }),
      all: getThreadRows(emails, { folder: "all" }),
      spam: getThreadRows(emails, { folder: "spam" }),
      trash: getThreadRows(emails, { folder: "trash" }),
      categories: getThreadRows(emails, { folder: "categories" }),
    };

    return folders;
  }, [emails]);
}
