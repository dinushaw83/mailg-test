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

        const has = (m, name) => (m.labels || []).includes(name);

        emails.forEach((m) => {
            if (has(m, "Inbox")) folders.inbox.push(m);
            if (m.starred) folders.starred.push(m);
            if (has(m, "Snoozed")) folders.snoozed.push(m);
            if (has(m, "Sent")) folders.sent.push(m);
            if (has(m, "Drafts")) folders.drafts.push(m);
            if (m.important) folders.important.push(m);
            if (has(m, "Chats")) folders.chats.push(m);
            if (has(m, "Scheduled")) folders.scheduled.push(m);
            if (has(m, "Spam")) folders.spam.push(m);
            if (has(m, "Trash")) folders.trash.push(m);
            if (has(m, "Categories")) folders.categories.push(m);
        });

        // All Mail = everything except Spam/Trash
        folders.all = emails.filter((m) => !has(m, "Spam") && !has(m, "Trash"));

        return folders;
    }, [emails]);
}
