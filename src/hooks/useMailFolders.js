import { useMemo } from "react";

export default function useMailFolders(emails = []) {
    return useMemo(() => {
        const folders = {
            inbox: [],
            starred: [],
            snoozed: [],
            sent: [],
            drafts: [],
            important: [],
            chats: [],
            scheduled: [],
            allmail: [],
            spam: [],
            trash: [],
            categories: [],
        };

        emails.forEach((mail) => {
            // Inbox → unread messages
            if ((mail.labels || []).includes("Inbox")) {
                folders.inbox.push(mail);
            }

            if (mail.starred) {
                folders.starred.push(mail);
            }

            if ((mail.labels || []).includes("Snoozed")) {
                folders.snoozed.push(mail);
            }

            if ((mail.labels || []).includes("Sent")) {
                folders.sent.push(mail);
            }

            if ((mail.labels || []).includes("Drafts")) {
                folders.drafts.push(mail);
            }

            if (mail.important) {
                folders.important.push(mail);
            }

            if ((mail.labels || []).includes("Chats")) {
                folders.chats.push(mail);
            }

            if ((mail.labels || []).includes("Scheduled")) {
                folders.scheduled.push(mail);
            }

            if ((mail.labels || []).includes("All Mail")) {
                folders.allmail.push(mail);
            }

            if ((mail.labels || []).includes("Spam")) {
                folders.spam.push(mail);
            }

            if ((mail.labels || []).includes("Trash")) {
                folders.trash.push(mail);
            }

            if ((mail.labels || []).includes("Categories")) {
                folders.categories.push(mail);
            }
        });

        return folders;
    }, [emails]);
}
