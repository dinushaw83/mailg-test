import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
} from "@mui/material";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { generateAvatarColor } from "../../utils/helperFunctions";
import { format, isToday, isYesterday, isThisWeek, isThisYear as isCurrentYear } from "date-fns";

const ContactTrash = () => {
  const { deletedRecipients, setDeletedRecipients, recipients, setRecipients, setSnackbar } = useGlobalContext();
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [hoveredId, setHoveredId] = useState(null);
  useEffect(() => {
    // Update the document title
    document.title = "Trash";
  }, []);

  const count = deletedRecipients?.length || 0;
  const allIds = useMemo(() => new Set(deletedRecipients.map((c) => c.id)), [deletedRecipients]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const selectAll = () => {
    setSelectedIds((prev) => (prev.size === allIds.size ? new Set() : new Set(allIds)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const snackbarStyle = {
    "& .MuiSnackbarContent-root": { backgroundColor: "#303030", color: "#fff", minHeight: "40px" },
  };
  const showToast = (message) =>
    setSnackbar?.({ open: true, message, autoHideDuration: 3000, hideClose: true, style: snackbarStyle });

  const handleRecover = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const now = new Date().toISOString();
    const toRecover = deletedRecipients.filter((c) => ids.includes(c.id));
    if (toRecover.length === 0) return;
    setRecipients((prev) => [
      ...prev,
      ...toRecover.map((c) => ({ ...c, isSaved: true, savedAt: now, updatedAt: now })),
    ]);
    setDeletedRecipients((prev) => prev.filter((c) => !ids.includes(c.id)));
    clearSelection();
    showToast(
      toRecover.length === 1
        ? `Recovered ${toRecover[0].name || toRecover[0].email || "contact"}`
        : `Recovered ${toRecover.length} contacts`
    );
  };

  const handleRecoverSingle = (id) => {
    const now = new Date().toISOString();
    const contact = deletedRecipients.find((c) => c.id === id);
    if (!contact) return;
    setRecipients((prev) => [...prev, { ...contact, isSaved: true, savedAt: now, updatedAt: now }]);
    setDeletedRecipients((prev) => prev.filter((c) => c.id !== id));
    showToast(`Recovered ${contact.name || contact.email || "contact"}`);
  };

  const handleDeleteForever = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const removedCount = deletedRecipients.filter((c) => ids.includes(c.id)).length;
    setDeletedRecipients((prev) => prev.filter((c) => !ids.includes(c.id)));
    clearSelection();
    showToast(removedCount === 1 ? "Deleted forever" : `Deleted ${removedCount} contacts forever`);
  };

  const handleEmptyTrash = () => {
    if (deletedRecipients.length === 0) return;
    setDeletedRecipients([]);
    clearSelection();
    showToast("Trash emptied");
  };

  const formatTrashDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";
    if (isToday(date)) return `Today, ${format(date, "h:mm a")}`;
    if (isYesterday(date)) return `Yesterday, ${format(date, "h:mm a")}`;
    if (isThisWeek(date)) return `${format(date, "EEE")}, ${format(date, "h:mm a")}`;
    if (isCurrentYear(date)) return format(date, "MMM d");
    return format(date, "MMM d, yyyy");
  };

  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        margin: "16px 16px 16px 20px",
        borderRadius: "24px",
        width: "100%",
        height: "calc(100vh - 146px)",
        pl: 1.5,
        py: 3,
      }}
    >
      {/* Banner */}
      <Box
        sx={{
          backgroundColor: "#e8eaed",
          color: "#1f1f1f",
          mx: 1.5,
          mb: 2,
          borderRadius: "8px",
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 2,
        }}
      >
        <Typography variant="body2" sx={{ fontSize: "0.875rem" }}>
          Contacts that have been in Trash more than 30 days will be deleted forever
        </Typography>
        <Button onClick={handleEmptyTrash} sx={{ textTransform: "none", color: "#1a73e8", borderRadius: "20px" }}>
          Empty Trash now
        </Button>
      </Box>

      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 400, fontSize: "1.5rem", color: "#444746" }}>
            Trash
          </Typography>
          {count > 0 ? <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>({count})</span> : ""}
        </Box>
        {/* No top-level action buttons; actions appear in selection header */}
      </Box>

      {/* Deleted contacts list */}
      {deletedRecipients?.length > 0 ? (
        <TableContainer
          sx={{
            backgroundColor: "transparent",
            flex: 1,
            overflowY: "auto",
            maxHeight: "calc(100vh - 200px)",
            width: "100%",
            mt: 1,
          }}
        >
          <Table sx={{ borderCollapse: "separate", borderSpacing: 0, width: "100%" }}>
            <TableHead sx={{ backgroundColor: "#fff", position: "sticky", top: 0, zIndex: 1 }}>
              {selectedIds.size === 0 ? (
                <TableRow>
                  <TableCell
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
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.875rem", color: "#444746" }}>
                      Name
                    </Typography>
                  </TableCell>
                  <TableCell
                    sx={{
                      border: 0,
                      borderBottom: "1px solid #c4c7c5",
                      py: 1.5,
                      px: 1,
                      backgroundColor: "transparent",
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.875rem", color: "#444746" }}>
                      Why in Trash?
                    </Typography>
                  </TableCell>
                  <TableCell
                    sx={{
                      border: 0,
                      borderBottom: "1px solid #c4c7c5",
                      py: 1.5,
                      px: 1,
                      backgroundColor: "transparent",
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.875rem", color: "#444746" }}>
                      Date deleted
                    </Typography>
                  </TableCell>
                  <TableCell
                    sx={{
                      border: 0,
                      borderBottom: "1px solid #c4c7c5",
                      py: 1.5,
                      px: 1,
                      backgroundColor: "transparent",
                      width: 120,
                      textAlign: "right",
                    }}
                  >
                    {/* Intentionally empty header for hover Recover action */}
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    sx={{
                      border: 0,
                      borderBottom: "1px solid #e0e0e0",
                      py: 1.5,
                      px: 2,
                      backgroundColor: "transparent",
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Checkbox
                          size="medium"
                          checked={false}
                          indeterminate={selectedIds.size > 0}
                          onChange={selectAll}
                          sx={{ "&.Mui-checked": { color: "#0b57d0" } }}
                        />
                        <Typography variant="body2" sx={{ color: "#0b57d0", fontWeight: 500, fontSize: "0.875rem" }}>
                          {selectedIds.size} selected
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Button onClick={handleDeleteForever} sx={{ textTransform: "none", color: "#1a73e8" }}>
                          Delete forever
                        </Button>
                        <Button onClick={handleRecover} sx={{ textTransform: "none", color: "#1a73e8" }}>
                          Recover
                        </Button>
                      </Box>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableHead>
            <TableBody>
              {deletedRecipients.map((c, idx) => {
                const avatarColor = generateAvatarColor(c.name);
                const initials = c.name ? c.name.charAt(0).toUpperCase() : "";
                return (
                  <TableRow
                    key={c.id || idx}
                    sx={{ cursor: "pointer", backgroundColor: selectedIds.has(c.id) ? "#eaf1fb" : "transparent" }}
                    onClick={() => toggleSelect(c.id)}
                    onMouseEnter={() => setHoveredId(c.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <TableCell sx={{ border: 0, py: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Checkbox
                          size="medium"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ "&.Mui-checked": { color: "#0b57d0" } }}
                        />
                        <Avatar
                          sx={{
                            bgcolor: c.avatar ? "transparent" : avatarColor,
                            color: c.avatar ? "inherit" : "white",
                            width: 36,
                            height: 36,
                            fontSize: "14px",
                          }}
                        >
                          {c.avatar ? (
                            <img
                              src={c.avatar}
                              alt={c.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                            />
                          ) : (
                            initials
                          )}
                        </Avatar>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 400,
                            fontSize: "0.875rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c?.name || c?.email || "—"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ border: 0, py: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 400, fontSize: "0.875rem" }}>
                        Deleted in MailG Contacts (Web)
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ border: 0, py: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 400, fontSize: "0.875rem" }}>
                        {formatTrashDate(c.updatedAt || Date.now())}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ border: 0, py: 1, textAlign: "right", width: 120 }}>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRecoverSingle(c.id);
                        }}
                        sx={{
                          textTransform: "none",
                          color: "#1a73e8",
                          fontSize: "0.875rem",
                          opacity: hoveredId === c.id ? 1 : 0,
                          transition: "opacity 120ms ease",
                          visibility: hoveredId === c.id ? "visible" : "hidden",
                          pointerEvents: hoveredId === c.id ? "auto" : "none",
                        }}
                      >
                        Recover
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            width: "100%",
          }}
        >
          <Box
            sx={{
              backgroundColor: "#e0e0e0",
              borderRadius: "50%",
              width: "150px",
              height: "150px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              mb: 3.5,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "120px", color: "#9e9e9e" }}>
              delete
            </span>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 400, fontSize: "1rem", color: "#1f1f1f" }}>
            No contacts in trash
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ContactTrash;
