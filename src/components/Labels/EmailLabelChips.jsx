import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useLabels from "../../hooks/useLabels";
import Tooltip, { tooltipClasses } from "@mui/material/Tooltip";
import { styled } from "@mui/material/styles"
import { useGlobalContext } from "../../contexts/GlobalContext";
import { Button } from "@mui/material";

const DISPLAY_SYSTEM_LABELS = ["Inbox", "Spam", "Trash"];

const LabelContainer = styled("div")({
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
});

const LabelWrapper = styled("div")(({ bg = "#e1e3e1", text = "#444746" }) => ({
    display: "inline-flex",
    marginTop: "0.6rem",

    "--cv-colored-label-bg-color": bg,
    "--cv-colored-label-text-color": text,
}));

const LabelText = styled("div")({
    borderRadius: "4px 0 0 4px",
    padding: "0 4px",
    fontSize: "0.75rem",
    lineHeight: "18px",
    height: "18px",
    display: "flex",
    alignItems: "center",
    fontFamily: `"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif`,
    cursor: "pointer",
    WebkitFontSmoothing: "antialiased",
    backgroundColor: "var(--cv-colored-label-bg-color)",
    color: "var(--cv-colored-label-text-color)",
    "&:hover": {
        color: "var(--cv-colored-label-bg-color)",
        backgroundColor: "var(--cv-colored-label-text-color)",
    },
});

const CloseButton = styled("div")({
    borderRadius: "0 4px 4px 0",
    padding: "0 4px",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    height: "18px",
    transition: "background-color 0.2s ease",
    backgroundColor: "var(--cv-colored-label-bg-color)",
    color: "var(--cv-colored-label-text-color)",
    "&:hover": {
        color: "var(--cv-colored-label-bg-color)",
        backgroundColor: "var(--cv-colored-label-text-color)",
    },
});

const GTooltip = styled(({ className, ...props }) => (
    <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
    [`& .${tooltipClasses.tooltip}`]: {
        padding: "8px 12px",
        maxWidth: 200,
        backgroundColor: "#444746",
        color: "#e1e3e1",
        borderRadius: "4px",
    },
    [`& .${tooltipClasses.arrow}`]: {
        color: "#333",
    },
}));

export default function EmailLabelChips({ message }) {
    const { setSnackbar } = useGlobalContext()
    const labels = message.labels;

    const { labels: allLabels, removeLabelFromThread, addLabelToThread } = useLabels()
    const normalizeLabelName = (name) => name.replace(/::/g, "/");

    const navigate = useNavigate();

    const filteredLabels = useMemo(() => {
        return labels.filter((label) => {
            // Show Inbox, Spam, Trash
            if (DISPLAY_SYSTEM_LABELS.includes(label)) return true;

            // Show user-created labels
            if (allLabels[label] && !allLabels[label].system) return true;

            // Otherwise assume it other system labels we don't want to display
            return false;
        });
    }, [allLabels, labels]);
    
    const handleNavigateToLabel = (label) => {
        if (DISPLAY_SYSTEM_LABELS.includes(label)) {
            navigate(`/${label.toLowerCase()}`);
        } else {
            navigate(`/label/${encodeURIComponent(label)}`);
        }
    };

    const handleRemoveLabel = (label) => {
        removeLabelFromThread(message.threadId, label);

        setSnackbar({
            open: true,
            message: `Conversation removed from '${label}'.`,
            autoHideDuration: 4000,
            action: (
                <Button
                    size="small"
                    sx={{ textTransform: "none" }}
                    onClick={() => {
                        console.log(message.threadId, label, "<---message.threadId, label")
                        addLabelToThread(message.threadId, label);
                        setSnackbar({
                            open: true,
                            message: "Action undone.",
                            autoHideDuration: 3000,
                        });
                    }}
                >
                    Undo
                </Button>
            ),
        });
    };

    return (
        <LabelContainer>
            {filteredLabels.map((label) => (
                <LabelWrapper key={label}>
                    <GTooltip title={`Search for all messages with label ${label}`} placement="top" PopperProps={{
                        modifiers: [
                            {
                                name: "offset",
                                options: { offset: [0, -8] }, // moves tooltip closer/further
                            },
                        ],
                    }}>
                        <LabelText onClick={() => handleNavigateToLabel(label)}>{normalizeLabelName(label)}</LabelText>
                    </GTooltip>
                    <CloseButton role="button" tabIndex={0} onClick={() => handleRemoveLabel(label)}>
                        <GTooltip title={`Remove label ${label} from this conversation`} placement="top" PopperProps={{
                            modifiers: [
                                {
                                    name: "offset",
                                    options: { offset: [0, -8] }, // moves tooltip closer/further
                                },
                            ],
                        }}>
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: 16}}
                            >
                                close
                            </span>
                        </GTooltip>
                    </CloseButton>
                </LabelWrapper>
            ))}
        </LabelContainer>
    );
}
