import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";

const ShortcutsModal = ({ open, onClose }) => {
  const isMac = navigator.userAgent.includes("Mac");
  const meta = isMac ? "⌘" : "Ctrl";
  const shortcutsData = [
    {
      subsections: [
        {
          groups: [
            [
              { subsection: "Compose and Chat" },
              // { key: "Shift + Esc", description: "Focus main window" },
              // { key: "Esc", description: "Focus latest chat or compose" },
              // { key: "Ctrl + .", description: "Advance to next chat or compose" },
              // { key: "Ctrl + ,", description: "Advance to previous chat or compose" },
            ],
            [{ key: `${meta} + Enter`, description: "Send" }],
            [
              { key: `${meta} + Shift + c`, description: "Add Cc recipients" },
              { key: `${meta} + Shift + b`, description: "Add Bcc recipients" },
              // { key: `${meta} + Shift + f`, description: "Access custom from" },
              { key: `${meta} + Shift + d`, description: "Discard draft" },
            ],
          ],
        },
        {
          groups: [
            [
              { subsection: "Formatting" },
              { key: `${meta} + z`, description: "Undo" },
              { key: `${meta} + y`, description: "Redo" },
              { key: `${meta} + b`, description: "Bold" },
              { key: `${meta} + i`, description: "Italics" },
              { key: `${meta} + u`, description: "Underline" },
            ],
            [
              { key: `${meta} + Shift + 7`, description: "Numbered list" },
              { key: `${meta} + Shift + 8`, description: "Bulleted list" },
              { key: `${meta} + Shift + 9`, description: "Quote" },
              { key: `${meta} + [`, description: "Indent less" },
              { key: `${meta} + ]`, description: "Indent more" },
              { key: `${meta} + Shift + l`, description: "Align left" },
              { key: `${meta} + Shift + e`, description: "Align centre" },
              { key: `${meta} + Shift + r`, description: "Align right" },
            ],
            [
              { key: "Alt + Shift + 5", description: "Strikethrough" },
              { key: `${meta} + \\`, description: "Remove formatting" },
            ],
          ],
        },
      ],
    },
    {
      title: (
        <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#fff" }}>
          The following keyboard shortcuts are currently enabled.{" "}
          <Typography
            component="span"
            sx={{
              color: "#dd0",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Disable
          </Typography>
        </Typography>
      ),
    },
    {
      subsections: [
        {
          groups: [
            [
              { subsection: "Jumping" },
              { key: "g then i", description: "Go to Inbox" },
              { key: "g then s", description: "Go to Starred conversations" },
              { key: "g then b", description: "Go to Snoozed conversations" },
              { key: "g then t", description: "Go to Sent messages" },
              { key: "g then d", description: "Go to Drafts" },
              { key: "g then a", description: "Go to All mail" },
              { key: "g then c", description: "Go to Contacts" },
              { key: "g then l", description: "Go to Label" },
              // { key: "g then k", description: "Go to Tasks" },
              // { key: "g then f", description: "Go to search filters" },
            ],
          ],
        },
        {
          groups: [
            [
              { subsection: "Threadlist selection" },
              { key: "* then a", description: "Select all conversations" },
              { key: "* then n", description: "Deselect all conversations" },
              { key: "* then r", description: "Select read conversations" },
              { key: "* then u", description: "Select unread conversations" },
              { key: "* then s", description: "Select starred conversations" },
              { key: "* then t", description: "Select unstarred conversations" },
            ],
          ],
        },
        {
          groups: [
            [
              { subsection: "Navigation" },
              { key: "u", description: "Back to threadlist" },
              { key: "k / j", description: "Newer/older conversation" },
              // { key: "o or Enter", description: "Open conversation; collapse/expand conversation" },
              // { key: "p / n", description: "Read previous/next message" },
            ],
            [
              { key: "g then n", description: "Go to next page" },
              { key: "g then p", description: "Go to previous page" },
              // { key: "`", description: "Go to next inbox section" },
              // { key: "~", description: "Go to previous inbox section" },
            ],
          ],
        },
        {
          groups: [
            [
              { subsection: "Application" },
              { key: "/", description: "Search email" },
              { key: "?", description: "Open keyboard shortcut help" },
              // { key: "q", description: "Start or continue a chat" },
              { key: "c", description: "Compose" },
              // { key: "d", description: "Compose in a tab" },
              { key: ".", description: "Open 'more actions' menu" },
              { key: "v", description: "Open 'move to' menu" },
              { key: "l", description: "Open 'label as' menu" },
            ],
          ],
        },
        {
          groups: [
            [
              { subsection: "Actions" },
              { key: ",", description: "Move focus to toolbar" },
              { key: "x", description: "Select conversation" },
              { key: "s", description: "Toggle star/Rotate between superstars" },
              // { key: "y", description: "Remove label" },
              { key: "e", description: "Archive" },
              { key: "m", description: "Mute conversation" },
              { key: "!", description: "Report as spam" },
              { key: "#", description: "Delete" },
              { key: "r", description: "Reply" },
              // { key: "Shift + r", description: "Reply in a new window" },
              { key: "a", description: "Reply all" },
              // { key: "Shift + a", description: "Reply all in a new window" },
              { key: "f", description: "Forward" },
              // { key: "Shift + f", description: "Forward in a new window" },
              // { key: "Shift + n", description: "Update conversation" },
              // { key: "] / [", description: "Remove conversation from current view and go newer/older" },
              { key: "} / {", description: "Archive conversation and go newer/older" },
              // { key: "z", description: "Undo last action" },
              { key: "Shift + i", description: "Mark as read" },
              { key: "Shift + u", description: "Mark as unread" },
              // { key: "_", description: "Mark unread from the selected message" },
              { key: "+ or =", description: "Mark as important" },
              { key: "-", description: "Mark as not important" },
              // { key: ";", description: "Expand entire conversation" },
              // { key: ":", description: "Collapse entire conversation" ,
              { key: "b", description: "Snooze" },
              // { key: "Shift + t", description: "Add conversation to Tasks" },
            ],
          ],
        },
      ],
    },
  ];

  const KeyDisplay = ({ keyText }) => {
    const parts = keyText.split(/(\s+then\s+|\s+\/\s+|\s+or\s+|\s+\+\s+)/);

    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        {parts.map((part, index) => {
          if (part.match(/\s+then\s+|\s+\/\s+|\s+or\s+|\s+\+\s+/)) {
            return (
              <Typography key={index} variant="body2" sx={{ color: "#fff", fontSize: "0.875rem" }}>
                {part.trim()}
              </Typography>
            );
          } else if (part.trim()) {
            return (
              <Typography
                key={index}
                variant="body2"
                sx={{
                  color: "#dd0",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                {part.trim()}
              </Typography>
            );
          }
          return null;
        })}
      </Box>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="shortcuts-modal"
      disableAutoFocus
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          width: "90vw",
          height: "90vh",
          bgcolor: "white",
          borderRadius: "8px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#222",
          opacity: 0.85,
          color: "#fff",
          padding: "16px",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            borderBottom: "1px solid #dadce0",
            paddingBottom: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography sx={{ color: "#fff", fontSize: "16px", fontWeight: "bold" }}>Keyboard shortcuts</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              sx={{
                color: "#dd0",
                fontSize: "16px",
                fontWeight: "bold",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              Open in a new window
            </Typography>
            <Typography sx={{ color: "#dd0", fontSize: "16px" }}>|</Typography>
            <Typography
              sx={{
                color: "#dd0",
                fontSize: "16px",
                fontWeight: "bold",
                textDecoration: "underline",
                cursor: "pointer",
              }}
              onClick={onClose}
            >
              Close
            </Typography>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
          {shortcutsData.map((row, rowIndex) => (
            <React.Fragment key={rowIndex}>
              {row.title ? (
                <Box sx={{ display: "flex", alignSelf: "center", py: 0.05 }}>{row.title}</Box>
              ) : (
                <Box sx={{ display: "flex", gap: 3 }}>
                  {/* Left Column */}
                  <Box sx={{ flex: 1 }}>
                    {row.subsections
                      .slice(0, Math.ceil(row.subsections.length / 2))
                      .map((subsection, subsectionIndex) => (
                        <Box
                          key={subsectionIndex}
                          sx={{ mb: subsectionIndex < Math.ceil(row.subsections.length / 2) - 1 ? 3 : 0 }}
                        >
                          {subsection.groups.map((group, groupIndex) => (
                            <Box key={groupIndex} sx={{ mb: groupIndex < subsection.groups.length - 1 ? 1 : 0 }}>
                              {group.map((item, index) => (
                                <Box key={index} sx={{ display: "flex", alignItems: "flex-start", py: 0.05 }}>
                                  {item.subsection ? (
                                    <>
                                      <Box
                                        sx={{
                                          minWidth: "180px",
                                          pr: 2,
                                        }}
                                      />
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          fontSize: "0.875rem",
                                          color: "#dd0",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {item.subsection}
                                      </Typography>
                                    </>
                                  ) : (
                                    <>
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          minWidth: "180px",
                                          justifyContent: "flex-end",
                                          pr: 2,
                                        }}
                                      >
                                        <KeyDisplay keyText={item.key} />
                                        <Typography sx={{ color: "#fff", ml: 1 }}>:</Typography>
                                      </Box>
                                      <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#fff" }}>
                                        {item.description}
                                      </Typography>
                                    </>
                                  )}
                                </Box>
                              ))}
                            </Box>
                          ))}
                        </Box>
                      ))}
                  </Box>

                  {/* Right Column */}
                  <Box sx={{ flex: 1 }}>
                    {row.subsections.slice(Math.ceil(row.subsections.length / 2)).map((subsection, subsectionIndex) => (
                      <Box
                        key={subsectionIndex}
                        sx={{
                          mb:
                            subsectionIndex < row.subsections.slice(Math.ceil(row.subsections.length / 2)).length - 1
                              ? 3
                              : 0,
                        }}
                      >
                        {subsection.groups.map((group, groupIndex) => (
                          <Box key={groupIndex} sx={{ mb: groupIndex < subsection.groups.length - 1 ? 2 : 0 }}>
                            {group.map((item, index) => (
                              <Box key={index} sx={{ display: "flex", alignItems: "flex-start", py: 0.05 }}>
                                {item.subsection ? (
                                  <>
                                    <Box
                                      sx={{
                                        minWidth: "180px",
                                        pr: 2,
                                      }}
                                    />
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontSize: "0.875rem",
                                        color: "#dd0",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {item.subsection}
                                    </Typography>
                                  </>
                                ) : (
                                  <>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        minWidth: "180px",
                                        justifyContent: "flex-end",
                                        pr: 2,
                                      }}
                                    >
                                      <KeyDisplay keyText={item.key} />
                                      <Typography sx={{ color: "#fff", ml: 1 }}>:</Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ fontSize: "0.875rem", color: "#fff" }}>
                                      {item.description}
                                    </Typography>
                                  </>
                                )}
                              </Box>
                            ))}
                          </Box>
                        ))}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Row Divider - Full Width */}
              {rowIndex < shortcutsData.length - 1 && (
                <Box sx={{ py: 2 }}>
                  <Box sx={{ height: "1px", bgcolor: "gray" }} />
                </Box>
              )}
            </React.Fragment>
          ))}
        </Box>
      </Box>
    </Modal>
  );
};

export default ShortcutsModal;
