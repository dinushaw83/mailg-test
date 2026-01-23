import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import useLabels, { normalizeLabelName, getPathLabelFromKey } from "../../hooks/useLabels";
import Tooltip, { tooltipClasses } from "@mui/material/Tooltip";
import { styled } from "@mui/material/styles";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { Button } from "@mui/material";

const DISPLAY_SYSTEM_LABELS = ["Inbox", "Spam", "Trash"];

const LabelContainer = styled("div")({
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
  alignItems: "center",
});

const LabelWrapper = styled("div")(({ bg = "#e1e3e1", text = "#444746" }) => ({
  display: "inline-flex",
  alignItems: "center",

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

const GTooltip = styled(({ className, ...props }) => <Tooltip {...props} classes={{ popper: className }} />)(
  ({ theme }) => ({
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
  })
);

export default function EmailLabelChips({ message }) {
  const { setSnackbar } = useGlobalContext();
  const rawLabels = message?.labels || [];

  const { labels: allLabels, removeLabelFromThread, addLabelToThread } = useLabels();

  const navigate = useNavigate();

  // Get mapping to convert UUID to composite key for proper routing
  const labelIdToKeyMap = useSelector((state) => state.mail.labelIdToKeyMap || {});

  // Helper to get label key from label (handles both string and object formats)
  const getLabelKey = (label) => {
    if (typeof label === "string") return label;
    return label?.id || label?.name || "";
  };

  // Helper to get label name from label (handles both string and object formats)
  const getLabelName = (label) => {
    if (typeof label === "string") return label;
    return label?.name || label?.id || "";
  };

  const filteredLabels = useMemo(() => {
    if (!Array.isArray(rawLabels)) return [];

    return rawLabels.filter((label) => {
      const labelName = getLabelName(label);
      const labelKey = getLabelKey(label);

      // Show Inbox, Spam, Trash (these are in DISPLAY_SYSTEM_LABELS)
      if (DISPLAY_SYSTEM_LABELS.includes(labelName)) return true;

      // Get label metadata from allLabels
      const labelMeta = allLabels[labelKey] || allLabels[labelName];

      // Hide exclusive system labels that are not in DISPLAY_SYSTEM_LABELS (e.g., Starred, All Mail, Important, etc.)
      if (labelMeta?.is_exclusive) return false;

      // Show user-created labels (non-system labels)
      if (labelMeta && !labelMeta.system && !labelMeta.is_system) return true;

      // Check if it's a non-system label by its properties (for object format)
      if (typeof label === "object" && label !== null) {
        if (label.is_exclusive) return false;
        if (label.color && !label.is_system && !label.system) return true;
      }

      // Otherwise assume it's a system label we don't want to display
      return false;
    });
  }, [allLabels, rawLabels]);

  const handleNavigateToLabel = (label) => {
    const labelName = getLabelName(label);
    let labelKey = getLabelKey(label);

    if (DISPLAY_SYSTEM_LABELS.includes(labelName)) {
      navigate(`/${labelName.toLowerCase()}`);
    } else {
      // Convert UUID to composite key if needed (for proper routing like sidebar)
      const compositeKey = labelIdToKeyMap[labelKey] || labelKey;
      navigate(`/label/${encodeURIComponent(compositeKey)}`);
    }
  };

  const handleRemoveLabel = (label) => {
    const labelKey = getLabelKey(label);
    const labelName = getLabelName(label);

    // Use getDisplayName for a more robust display name
    const displayName = (() => {
      const pathFromKey = getPathLabelFromKey(allLabels, labelKey);
      if (pathFromKey && pathFromKey !== labelKey) return pathFromKey;

      const pathFromName = getPathLabelFromKey(allLabels, labelName);
      if (pathFromName && pathFromName !== labelName) return pathFromName;

      return labelName;
    })();

    removeLabelFromThread(message.thread_id, labelKey);

    setSnackbar({
      open: true,
      message: `Conversation removed from '${normalizeLabelName(displayName)}'.`,
      autoHideDuration: 4000,
      action: (
        <Button
          size="small"
          sx={{ textTransform: "none" }}
          onClick={() => {
            addLabelToThread(message.thread_id, labelKey);
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

  // Helper to get color for a label
  const getLabelColor = (label) => {
    const labelKey = getLabelKey(label);
    const labelName = getLabelName(label);

    // If label is an object with color property, use it directly first
    if (typeof label === "object" && label?.color) {
      if (typeof label.color === "string") {
        return { rgb: label.color, text: "#444746" };
      }
      return label.color;
    }

    // Check allLabels by UUID (labelKey might be UUID)
    if (allLabels[labelKey]?.color) return allLabels[labelKey].color;

    // Check allLabels by composite key if we have the mapping
    const compositeKey = labelIdToKeyMap[labelKey];
    if (compositeKey && allLabels[compositeKey]?.color) return allLabels[compositeKey].color;

    // Check by name as fallback
    if (allLabels[labelName]?.color) return allLabels[labelName].color;

    return { rgb: "#e1e3e1", text: "#444746" };
  };

  // Helper to get display name for a label
  const getDisplayName = (label) => {
    const labelKey = getLabelKey(label);
    const labelName = getLabelName(label);

    const pathFromKey = getPathLabelFromKey(allLabels, labelKey);
    if (pathFromKey && pathFromKey !== labelKey) return pathFromKey;

    const pathFromName = getPathLabelFromKey(allLabels, labelName);
    if (pathFromName && pathFromName !== labelName) return pathFromName;

    return labelName;
  };

  if (filteredLabels.length === 0) return null;

  return (
    <LabelContainer>
      {filteredLabels.map((label) => {
        const labelKey = getLabelKey(label);
        const color = getLabelColor(label);
        const displayName = getDisplayName(label);

        return (
          <LabelWrapper key={labelKey} bg={color?.rgb} text={color?.text}>
            <GTooltip
              title={`Search for all messages with label ${displayName}`}
              placement="top"
              PopperProps={{
                modifiers: [
                  {
                    name: "offset",
                    options: { offset: [0, -8] },
                  },
                ],
              }}
            >
              <LabelText onClick={() => handleNavigateToLabel(label)}>{displayName}</LabelText>
            </GTooltip>
            <CloseButton role="button" tabIndex={0} onClick={() => handleRemoveLabel(label)}>
              <GTooltip
                title={`Remove label ${displayName} from this conversation`}
                placement="top"
                PopperProps={{
                  modifiers: [
                    {
                      name: "offset",
                      options: { offset: [0, -8] },
                    },
                  ],
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  close
                </span>
              </GTooltip>
            </CloseButton>
          </LabelWrapper>
        );
      })}
    </LabelContainer>
  );
}
