import React from "react"
import { useParams } from "react-router-dom";

import InboxActions from "./InboxActions";
import SpamActions from "./SpamActions";

export default function MailActions() {
    const { folder = "inbox" } = useParams();
    return folder === "spam" ? <SpamActions /> : <InboxActions />;
}
