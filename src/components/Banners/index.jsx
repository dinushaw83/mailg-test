import { useParams } from "react-router-dom";
import InboxBanner from "./InboxBanner";
import ScheduledBanner from "./ScheduledBanner";
import SpamBanner from "./SpamBanner";
import TrashBanner from "./TrashBanner";
import LabelBanner from "./LabelBanner";

export default function Banner({ rows, activeInboxTab, setActiveInboxTab }) {
    const { folder, label: labelParam } = useParams();
    const label = labelParam ? decodeURIComponent(labelParam) : null;
    const activeFolder = folder || (label ? "label" : "inbox");

    if (activeFolder === "inbox") {
        return <InboxBanner activeInboxTab={activeInboxTab} setActiveInboxTab={setActiveInboxTab} rows={rows} />;
    } else if (activeFolder === "scheduled") {
        return <ScheduledBanner />;
    } else if (activeFolder === "spam") {
        return <SpamBanner />;
    } else if (activeFolder === "trash") {
        return <TrashBanner />;
    } else if (activeFolder === "label") {
        if (rows.length > 0) return null
        return <LabelBanner />;
    }

    return null;
}