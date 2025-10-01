import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip,
  IconButton,
  Avatar,
  Checkbox,
} from "@mui/material";
import { generateAvatarColor } from "../../utils/helperFunctions";
import styles from "./ContactsTable.module.css";

const ContactsTable = ({ contacts = [] }) => {
  const tableHeaders = ["Name", "Email", "Phone number", "Job title & company", "Labels", "Actions"];

  // Get contact data for a specific column
  const getContactColumnData = (contact, header) => {
    switch (header) {
      case "Name":
        return {
          type: "name",
          data: contact,
        };
      case "Email":
        return {
          type: "text",
          data: contact.email || "—",
        };
      case "Phone number":
        return {
          type: "text",
          data:
            contact.phones?.length > 0 && contact.phones[0].value
              ? `${contact.phones[0].dialCode}${contact.phones[0].value}`
              : "—",
        };
      case "Job title & company":
        return {
          type: "text",
          data:
            contact.jobTitle && contact.company
              ? `${contact.jobTitle}, ${contact.company}`
              : contact.jobTitle || contact.company || "—",
        };
      case "Labels":
        return {
          type: "labels",
          // Exclude Favorites and My contacts labels
          data: contact.labels?.filter((label) => label !== "Favorites" && label !== "My contacts") || [],
        };
      case "Actions":
        return {
          type: "actions",
          data: contact,
        };
      default:
        return {
          type: "text",
          data: "—",
        };
    }
  };

  // Render a single contact row
  const renderContactRow = (contact, index) => {
    const avatarColor = generateAvatarColor(contact.name);
    const initials = contact.name ? contact.name.charAt(0).toUpperCase() : "";

    return (
      <TableRow key={`contact-row-${index}`} className={styles.contactRow}>
        {tableHeaders.map((header, headerIndex) => {
          const columnData = getContactColumnData(contact, header);

          return (
            <TableCell
              key={`contact-cell-${headerIndex}`}
              sx={{
                border: 0,
                py: 1,
                borderRadius:
                  headerIndex === 0
                    ? "4px 0px 0px 4px"
                    : headerIndex === tableHeaders.length - 1
                    ? "0px 4px 4px 0px"
                    : 0,
              }}
            >
              {columnData.type === "name" && (
                <Box className={styles.avatarContainer}>
                  <Box className={styles.avatarCheckboxWrapper}>
                    <Avatar
                      className={styles.avatar}
                      sx={{
                        bgcolor: contact.avatar ? "transparent" : avatarColor,
                        color: contact.avatar ? "inherit" : "white",
                        width: 36,
                        height: 36,
                        fontSize: "14px",
                      }}
                    >
                      {contact.avatar ? (
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                        />
                      ) : (
                        initials
                      )}
                    </Avatar>

                    {/* Drag indicator */}
                    <span className={`material-symbols-outlined ${styles.dragIndicator}`}>drag_indicator</span>

                    {/* Checkbox */}
                    <Checkbox
                      className={styles.checkbox}
                      size="medium"
                      sx={{
                        "&.Mui-checked": {
                          color: "#0b57d0",
                        },
                      }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 400, fontSize: "0.875rem", ml: 0.5 }}>
                    {contact.name || "—"}
                  </Typography>
                </Box>
              )}

              {columnData.type === "text" && (
                <Typography variant="body2" sx={{ fontWeight: 400, fontSize: "0.875rem" }}>
                  {columnData.data}
                </Typography>
              )}

              {columnData.type === "labels" && (
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                  {columnData.data && columnData.data.length > 0 ? (
                    columnData.data.map((label, labelIndex) => (
                      <Chip
                        key={labelIndex}
                        label={label}
                        size="small"
                        sx={{
                          height: "30px",
                          px: 1,
                          backgroundColor: "#fff",
                          color: "#1f1f1f",
                          fontWeight: 400,
                          fontSize: "0.6875rem",
                          borderRadius: "8px",
                          border: "1px solid #c4c7c5",
                          "&:hover": {
                            backgroundColor: "rgba(31, 31, 31, 0.08)",
                            cursor: "pointer",
                          },
                        }}
                      />
                    ))
                  ) : (
                    <Typography variant="body2" sx={{ fontWeight: 400, fontSize: "0.875rem", color: "#9aa0a6" }}>
                      —
                    </Typography>
                  )}
                </Box>
              )}

              {columnData.type === "actions" && (
                <IconButton size="small" sx={{ color: "#444746" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                    more_vert
                  </span>
                </IconButton>
              )}
            </TableCell>
          );
        })}
      </TableRow>
    );
  };

  return (
    <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <TableContainer
        sx={{
          backgroundColor: "transparent",
          flex: 1,
          overflowY: "auto",
          maxHeight: "calc(100vh - 160px)",
        }}
      >
        <Table sx={{ borderCollapse: "separate", borderSpacing: 0, width: "calc(100vw - 346px)" }}>
          {/* Single table header */}
          <TableHead sx={{ backgroundColor: "#fff", position: "sticky", top: 0, zIndex: 1 }}>
            <TableRow>
              {tableHeaders.map((header, index) => (
                <TableCell
                  key={`table-header-${index}`}
                  sx={{
                    border: 0,
                    borderBottom: "1px solid #c4c7c5",
                    py: 1.5,
                    px: 1,
                    backgroundColor: "transparent",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      color: "#444746",
                    }}
                  >
                    {header}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          {/* Table body with sections - scrollable */}
          <TableBody>
            {contacts.map((section, sectionIndex) => (
              <React.Fragment key={`ContactsTable-section-${sectionIndex}`}>
                {/* Section heading row */}
                {section.heading && (
                  <TableRow>
                    <TableCell
                      colSpan={tableHeaders.length}
                      sx={{
                        border: 0,
                        backgroundColor: "transparent",
                        pt: 0.5,
                        pb: 0,
                      }}
                    >
                      {section.heading}
                    </TableCell>
                  </TableRow>
                )}

                {/* Section contacts */}
                {section.data && section.data.length > 0 ? (
                  section.data.map((contact, index) => renderContactRow(contact, `${sectionIndex}-${index}`))
                ) : section.heading ? (
                  <TableRow>
                    <TableCell
                      colSpan={tableHeaders.length}
                      sx={{
                        border: 0,
                        py: 4,
                        textAlign: "center",
                        backgroundColor: "transparent",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#9aa0a6",
                          fontSize: "0.875rem",
                          fontWeight: 400,
                        }}
                      >
                        No contacts found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </React.Fragment>
            ))}

            {/* Empty state when no sections have data */}
            {contacts.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={tableHeaders.length}
                  sx={{
                    border: 0,
                    py: 4,
                    textAlign: "center",
                    backgroundColor: "transparent",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#9aa0a6",
                      fontSize: "0.875rem",
                      fontWeight: 400,
                    }}
                  >
                    No contacts found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ContactsTable;
