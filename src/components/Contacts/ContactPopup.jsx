import React, { useState, useRef, useMemo, useEffect } from "react";
import { Tooltip, Box, Avatar, Typography, IconButton, Button, Paper } from "@mui/material";
import { useComposeModal } from "../../hooks/useComposeModal";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { generateAvatarColor, generateNextIntegerId, getFormattedWebsiteURL } from "../../utils/helperFunctions";
import styles from "./ContactPopup.module.css";

// Snackbar style for this screen
const snackbarStyle = {
  "& .MuiSnackbarContent-root": {
    backgroundColor: "#303030",
    color: "#fff",
    minHeight: "40px",
  },
};

const ContactPopup = ({ children, contact }) => {
  const [open, setOpen] = useState(false);
  const [isEmailHovered, setIsEmailHovered] = useState(false);
  const [isPhoneHovered, setIsPhoneHovered] = useState(false);
  const [copyTooltipOpen, setCopyTooltipOpen] = useState(false);
  const [phoneCopyTooltipOpen, setPhoneCopyTooltipOpen] = useState(false);
  const [disableAddToContacts, setDisableAddToContacts] = useState(false);
  const { addNewComposeWindow } = useComposeModal();
  const { setSnackbar, setRightSidebarActiveTab, recipients, setRecipients, loggedInUser } = useGlobalContext();

  // Get the detailed contact object
  const detailedContact = useMemo(() => {
    // Check if the contact is in the recipients array
    const found = recipients.find((recipient) => recipient.id === contact.id);
    if (found) {
      return found;
    }

    // Check if the contact email is of logged in user
    if (contact.email === loggedInUser.email) {
      return { ...loggedInUser };
    }

    // Check if the contact email is present in the recipients array
    const emailFound = recipients.find((recipient) => recipient.email === contact.email);
    if (emailFound) {
      return emailFound;
    }

    // If the contact is not found, then return the contact object
    return contact;
  }, [recipients, contact]);

  const isCustomRecipient = detailedContact.id && typeof detailedContact.id === "string" && detailedContact.id.startsWith("custom-");
  const name = detailedContact.name || detailedContact.email || "";
  const email = detailedContact.email || "";
  const avatarColor = generateAvatarColor(name);
  const initials = name.charAt(0).toUpperCase();
  const timeoutsRef = useRef({});

  // Check if brief details content exists
  const hasBriefDetails = useMemo(() => {
    if (!detailedContact) return false;

    const hasCompanyInfo = detailedContact.jobTitle || detailedContact.department || detailedContact.company;
    const hasPhoneInfo =
      detailedContact.phones && detailedContact.phones.length > 0 && detailedContact.phones[0]?.value;
    const hasWebsiteInfo = detailedContact.websites && detailedContact.websites.length > 0;

    return hasCompanyInfo || hasPhoneInfo || hasWebsiteInfo;
  }, [detailedContact]);

  // Clear all timeouts on unmount
  useEffect(
    () => () => {
      Object.values(timeoutsRef.current).forEach((timeout) => {
        clearTimeout(timeout);
      });
    },
    []
  );

  // Handle mouse pointer entering the contact
  const handleMouseEnter = () => {
    // Clear any existing timeout
    if (timeoutsRef.current["mouseLeave"]) {
      clearTimeout(timeoutsRef.current["mouseLeave"]);
    }
    setOpen(true);
  };

  // Handle mouse pointer leaving the contact
  const handleMouseLeave = () => {
    // Set a timeout before closing to allow user to move to tooltip
    timeoutsRef.current["mouseLeave"] = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  // Handle mouse pointer entering the tooltip
  const handleTooltipMouseEnter = () => {
    // Clear timeout when hovering over tooltip
    if (timeoutsRef.current["mouseLeave"]) {
      clearTimeout(timeoutsRef.current["mouseLeave"]);
    }
  };

  // Handle mouse pointer leaving the tooltip
  const handleTooltipMouseLeave = () => {
    // Close immediately when leaving tooltip
    setOpen(false);
  };

  // Handle save contact
  const handleSaveContact = (e) => {
    e.stopPropagation();

    // Disable the add to contacts button
    setDisableAddToContacts(true);

    // Check if the contact is already in the recipients array
    // If it is, then set isSaved to true else create a new contact
    const existingContact = recipients.find((recipient) => recipient.id === detailedContact.id);
    if (existingContact) {
      setRecipients((prev) =>
        prev.map((recipient) => (recipient.id === detailedContact.id ? { ...recipient, isSaved: true } : recipient))
      );
    } else {
      // Create a new contact object
      const newContact = {
        ...contact,
        isSaved: true,
        id: generateNextIntegerId(recipients),
        emails: [
          {
            value: detailedContact.email,
            label: "",
          },
        ],
        isFavorite: false,
        name: detailedContact.email.split("@")[0] ?? detailedContact.email,
        firstName: detailedContact.email.split("@")[0] ?? detailedContact.email,
        lastName: "",
        avatar: null,
        labels: [],
      };
      setRecipients((prev) => [...prev, newContact]);
    }

    timeoutsRef.current["addToContacts"] = setTimeout(() => {
      setDisableAddToContacts(false);
    }, 500);
  };

  // Handle edit contact
  const handleEditContact = (e) => {
    e.stopPropagation();

    // Display coming soon snackbar notification if the contact is of logged in user
    if (detailedContact?.isLoggedInUser) {
      setSnackbar({
        open: true,
        message: "Coming soon",
        action: null,
        autoHideDuration: 2000,
        hideClose: true,
        style: snackbarStyle,
      });
    } else {
      // Navigate to the edit contact section of right sidebar
      setRightSidebarActiveTab({
        activeTab: "contact",
        contact: { screen: "EDIT_CONTACT", contactId: detailedContact.id },
      });
    }
  };

  // Handle copy email to clipboard
  const handleCopyEmail = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(email);
      setCopyTooltipOpen(true);
      timeoutsRef.current["copyEmail"] = setTimeout(() => setCopyTooltipOpen(false), 2000);
    } catch (err) {
      // Error copying to clipboard
    }
  };

  // Handle copy phone to clipboard
  const handleCopyPhone = async (phone, e) => {
    e.stopPropagation();
    try {
      const phoneText = `${phone.dialCode}${phone.value}`;
      await navigator.clipboard.writeText(phoneText);
      setPhoneCopyTooltipOpen(true);
      timeoutsRef.current["copyPhone"] = setTimeout(() => setPhoneCopyTooltipOpen(false), 2000);
    } catch (err) {
      // Error copying to clipboard
    }
  };

  // Handle send email
  const handleSendEmail = (e) => {
    e.stopPropagation();

    // Add a new compose window with to field having the contact object
    addNewComposeWindow(null, { to: [contact] });
  };

  // Handle open detailed view
  const handleOpenDetailedView = (e) => {
    e.stopPropagation();
    // Navigate to the detailed view section of right sidebar
    setRightSidebarActiveTab({ activeTab: "contact", contact: { screen: "CONTACT_DETAILS", contactId: detailedContact.id } });
  };

  const tooltipContent = (
    <Paper
      elevation={8}
      onMouseEnter={handleTooltipMouseEnter}
      onMouseLeave={handleTooltipMouseLeave}
      sx={{
        p: 2,
        minWidth: 280,
        maxWidth: 320,
        backgroundColor: "#f8fafd",
        borderRadius: "10px",
      }}
    >
      {/* First Row - Avatar, Name/Email, Add to Contact Button */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {/* Avatar */}
          <Avatar
            sx={{
              bgcolor: isCustomRecipient ? "#a0c3ff" : avatarColor,
              color: isCustomRecipient ? "#1976d2" : "white",
              fontSize: "32px",
              width: 72,
              height: 72,
            }}
          >
            {isCustomRecipient ? (
              <span className="material-symbols-filled" style={{ fontSize: "80px", marginTop: "28px" }}>
                person
              </span>
            ) : detailedContact.avatar ? (
              <img
                src={detailedContact.avatar}
                alt={detailedContact.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
              />
            ) : (
              initials
            )}
          </Avatar>

          {/* Name and Email */}
          <Box sx={{ flex: 1, minWidth: 0, width: "200px" }}>
            <Tooltip
              title={`${name} (From your MailG Contacts)`}
              placement="bottom"
              slotProps={{
                popper: {
                  sx: {
                    "& .MuiTooltip-tooltip": {
                      backgroundColor: "#333333",
                      color: "white",
                      fontSize: "12px",
                      fontWeight: 300,
                    },
                  },
                  modifiers: [
                    {
                      name: "offset",
                      options: {
                        offset: [0, -8],
                      },
                    },
                  ],
                },
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 400,
                  fontSize: "22px",
                  color: "#202124",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  "&:hover": {
                    cursor: "text",
                  },
                }}
              >
                {name}
              </Typography>
            </Tooltip>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                minHeight: "20px",
                height: "20px",
              }}
              onMouseEnter={() => setIsEmailHovered(true)}
              onMouseLeave={() => setIsEmailHovered(false)}
            >
              <Tooltip
                title="From your MailG Contacts"
                placement="top"
                slotProps={{
                  popper: {
                    sx: {
                      "& .MuiTooltip-tooltip": {
                        backgroundColor: "#333333",
                        color: "white",
                        fontSize: "12px",
                        fontWeight: 300,
                      },
                    },
                    modifiers: [
                      {
                        name: "offset",
                        options: {
                          offset: [0, -8],
                        },
                      },
                    ],
                  },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: "14px",
                    color: "#5f6368",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    "&:hover": {
                      cursor: "pointer",
                      color: "#0b57d0",
                      textDecoration: "underline",
                    },
                  }}
                  onClick={(e) => handleSendEmail(e)}
                >
                  {email}
                </Typography>
              </Tooltip>

              {isEmailHovered && (
                <Tooltip
                  title={copyTooltipOpen ? "Email copied" : "Copy Email"}
                  placement="bottom"
                  slotProps={{
                    popper: {
                      sx: {
                        "& .MuiTooltip-tooltip": {
                          borderRadius: 0,
                          fontSize: "11px",
                          fontWeight: 300,
                        },
                      },
                    },
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={handleCopyEmail}
                    sx={{
                      transition: "opacity 0.2s",
                      "&:hover": {
                        backgroundColor: "transparent",
                      },
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: "18px",
                        color: "#0b57d0",
                      }}
                    >
                      content_copy
                    </span>
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Box>

        {/* Add/Edit Contact Button */}
        {detailedContact?.isSaved || detailedContact?.isLoggedInUser ? (
          <Tooltip
            title="Edit contact"
            placement="bottom-end"
            slotProps={{
              popper: {
                sx: {
                  "& .MuiTooltip-tooltip": {
                    backgroundColor: "#333333",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: 300,
                  },
                },
              },
            }}
          >
            <IconButton
              size="medium"
              onClick={(e) => handleEditContact(e)}
              sx={{
                color: "#5f6368",
                width: "40px",
                height: "40px",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                edit
              </span>
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip
            title="Add to contacts"
            placement="bottom-end"
            slotProps={{
              popper: {
                sx: {
                  "& .MuiTooltip-tooltip": {
                    backgroundColor: "#333333",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: 300,
                  },
                },
              },
            }}
          >
            <IconButton
              size="medium"
              onClick={(e) => handleSaveContact(e)}
              sx={{
                color: "#5f6368",
                width: "40px",
                height: "40px",
                transform: "scaleX(-1)",
              }}
              disabled={disableAddToContacts}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "21px" }}>
                person_add
              </span>
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Second Row - Action Buttons */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
        {/* Send Email */}
        <Button
          size="medium"
          variant="outlined"
          startIcon={
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              mail
            </span>
          }
          onClick={(e) => handleSendEmail(e)}
          sx={{
            backgroundColor: "#c2e7ff",
            color: "#062239",
            borderRadius: "24px",
            border: "1px solid #c2e7ff",
            textTransform: "none",
            width: "100%",
            height: "40px",
            fontSize: "14px",
            fontWeight: 500,
            "&:hover": {
              boxShadow: "0 1px 4px 1px rgba(0,0,0,0.3)",
            },
          }}
        >
          Send Mail
        </Button>

        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          {/* Send Message */}
          <Tooltip
            title="Message"
            placement="bottom"
            slotProps={{
              popper: {
                sx: {
                  "& .MuiTooltip-tooltip": {
                    backgroundColor: "#333333",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: 300,
                  },
                },
              },
            }}
          >
            <IconButton
              size="medium"
              sx={{ border: "1px solid #dadce0" }}
              onClick={(e) => {
                e.stopPropagation();
                // Send message functionality can be implemented here
              }}
              disabled={!detailedContact?.isSaved}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                chat_bubble
              </span>
            </IconButton>
          </Tooltip>

          {/* Video Meeting */}
          <Tooltip
            title="Send a video meeting invite"
            placement="bottom"
            slotProps={{
              popper: {
                sx: {
                  "& .MuiTooltip-tooltip": {
                    backgroundColor: "#333333",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: 300,
                  },
                },
              },
            }}
          >
            <IconButton
              size="medium"
              sx={{ border: "1px solid #dadce0" }}
              onClick={(e) => {
                e.stopPropagation();
                // Video meeting functionality can be implemented here
              }}
              disabled={!detailedContact?.isSaved}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                videocam
              </span>
            </IconButton>
          </Tooltip>

          {/* Event Schedule */}
          <Tooltip
            title="Schedule 1:1"
            placement="bottom"
            slotProps={{
              popper: {
                sx: {
                  "& .MuiTooltip-tooltip": {
                    backgroundColor: "#333333",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: 300,
                  },
                },
              },
            }}
          >
            <IconButton
              size="medium"
              sx={{ border: "1px solid #dadce0" }}
              onClick={(e) => {
                e.stopPropagation();
                // Schedule functionality can be implemented here
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                event
              </span>
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box
        sx={{
          mt: detailedContact?.isSaved || detailedContact?.isLoggedInUser || hasBriefDetails ? 1 : 0,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
        }}
      >
        {/* Brief details */}
        {hasBriefDetails && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              backgroundColor: "#f0f4f9",
              p: 2,
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
            }}
          >
            {/* First Row - Company Info */}
            {(detailedContact?.jobTitle || detailedContact?.department || detailedContact?.company) && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "13px", color: "#5f6368" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#444746" }}>
                  domain
                </span>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  {detailedContact?.jobTitle && (
                    <Tooltip
                      title="From your MailG Contacts"
                      placement="top"
                      slotProps={{
                        popper: {
                          sx: {
                            "& .MuiTooltip-tooltip": {
                              backgroundColor: "#333333",
                              color: "white",
                              fontSize: "12px",
                              fontWeight: 200,
                            },
                          },
                        },
                      }}
                    >
                      <span className={styles.detailRowText}>{detailedContact.jobTitle}</span>
                    </Tooltip>
                  )}
                  {detailedContact?.jobTitle && (detailedContact?.department || detailedContact?.company) && (
                    <span className={styles.greyCircle}>•</span>
                  )}
                  {detailedContact?.department && (
                    <Tooltip
                      title="From your MailG Contacts"
                      placement="top"
                      slotProps={{
                        popper: {
                          sx: {
                            "& .MuiTooltip-tooltip": {
                              backgroundColor: "#333333",
                              color: "white",
                              fontSize: "12px",
                              fontWeight: 200,
                            },
                          },
                        },
                      }}
                    >
                      <span className={styles.detailRowText}>{detailedContact.department}</span>
                    </Tooltip>
                  )}
                  {detailedContact?.department && detailedContact?.company && (
                    <span className={styles.greyCircle}>•</span>
                  )}
                  {detailedContact?.company && (
                    <Tooltip
                      title="From your MailG Contacts"
                      placement="top"
                      slotProps={{
                        popper: {
                          sx: {
                            "& .MuiTooltip-tooltip": {
                              backgroundColor: "#333333",
                              color: "white",
                              fontSize: "12px",
                              fontWeight: 200,
                            },
                          },
                        },
                      }}
                    >
                      <span className={styles.detailRowText}>{detailedContact.company}</span>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            )}

            {/* Second Row - Phone Info */}
            {detailedContact?.phones && detailedContact.phones.length > 0 && detailedContact.phones[0]?.value && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  fontSize: "13px",
                  color: "#5f6368",
                  minHeight: "20px",
                  height: "20px",
                }}
                onMouseEnter={() => setIsPhoneHovered(true)}
                onMouseLeave={() => setIsPhoneHovered(false)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#444746" }}>
                  call
                </span>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Tooltip
                    title="From your MailG Contacts"
                    placement="top"
                    slotProps={{
                      popper: {
                        sx: {
                          "& .MuiTooltip-tooltip": {
                            backgroundColor: "#333333",
                            color: "white",
                            fontSize: "12px",
                            fontWeight: 200,
                          },
                        },
                      },
                    }}
                  >
                    <span
                      className={styles.detailRowText}
                    >{`${detailedContact.phones[0].dialCode}${detailedContact.phones[0].value}`}</span>
                  </Tooltip>
                  {detailedContact.phones[0].label && (
                    <>
                      <span className={styles.greyCircle}>•</span>
                      <span className={styles.detailRowText}>{detailedContact.phones[0].label}</span>
                    </>
                  )}
                  {isPhoneHovered && (
                    <Tooltip
                      title={phoneCopyTooltipOpen ? "Phone number copied" : "Copy Phone number"}
                      placement="bottom"
                      slotProps={{
                        popper: {
                          sx: {
                            "& .MuiTooltip-tooltip": {
                              borderRadius: 0,
                              fontSize: "11px",
                              fontWeight: 300,
                            },
                          },
                        },
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => handleCopyPhone(detailedContact.phones[0], e)}
                        sx={{
                          ml: 0.5,
                          transition: "opacity 0.2s",
                          "&:hover": {
                            backgroundColor: "transparent",
                          },
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontSize: "16px",
                            color: "#0b57d0",
                          }}
                        >
                          content_copy
                        </span>
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            )}

            {/* Third Row - Website Links */}
            {detailedContact?.websites && detailedContact.websites.length > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "13px", color: "#0b57d0" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#444746" }}>
                  link
                </span>
                {detailedContact.websites.map((website, index) => (
                  <Box key={`website-${index}`} sx={{ display: "flex", alignItems: "center" }}>
                    {index > 0 && <span className={styles.greyCircle}>•</span>}
                    <Tooltip
                      title="From your MailG Contacts"
                      placement="top"
                      slotProps={{
                        popper: {
                          sx: {
                            "& .MuiTooltip-tooltip": {
                              backgroundColor: "#333333",
                              color: "white",
                              fontSize: "12px",
                              fontWeight: 200,
                            },
                          },
                        },
                      }}
                    >
                      <a
                        href={getFormattedWebsiteURL(website.value)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.linkText}
                      >
                        {website.label || website.value}
                      </a>
                    </Tooltip>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* Open detailed view button */}
        {(detailedContact?.isSaved || detailedContact?.isLoggedInUser) && (
          <Button
            size="medium"
            variant="contained"
            endIcon={
              <span class="material-symbols-outlined" style={{ fontSize: "20px" }}>
                open_in_new
              </span>
            }
            sx={{
              borderRadius: hasBriefDetails ? "0 0 16px 16px" : "16px",
              textTransform: "none",
              backgroundColor: "#f0f4f9",
              color: "#0b57d0",
              boxShadow: "none",
              width: "100%",
              fontSize: "14px",
              fontWeight: 500,
              justifyContent: "flex-start",
              "&:hover": {
                backgroundColor: "#f0f4f9",
                boxShadow: "none",
              },
              "& span": {
                "&:hover": {
                  textDecoration: "underline",
                },
              },
            }}
            onClick={(e) => handleOpenDetailedView(e)}
          >
            <span>Open detailed view</span>
          </Button>
        )}
      </Box>
    </Paper>
  );

  return (
    <Tooltip
      title={tooltipContent}
      open={open}
      onOpen={handleMouseEnter}
      onClose={handleMouseLeave}
      placement="bottom"
      slotProps={{
        popper: {
          sx: {
            "& .MuiTooltip-tooltip": {
              backgroundColor: "transparent",
              padding: 0,
              maxWidth: "none",
            },
          },
        },
      }}
    >
      <Box onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} sx={{ display: "inline-block" }}>
        {children}
      </Box>
    </Tooltip>
  );
};

export default ContactPopup;
