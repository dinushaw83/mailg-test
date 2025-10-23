import React, { useCallback, useRef, useState, useEffect, useMemo } from "react";
import {
  Stack,
  Popper,
  Paper,
  ClickAwayListener,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Menu,
  Typography,
  IconButton,
  Divider,
} from "@mui/material";
import { LinkBubbleMenu, MenuButton, RichTextEditor, TableBubbleMenu, insertImages } from "mui-tiptap";
import FormatColorText from "@mui/icons-material/FormatColorText";
import InsertLink from "@mui/icons-material/InsertLink";
import InsertPhoto from "@mui/icons-material/InsertPhoto";
import EditorMenuControls from "./EditorMenuControls";
import useExtensions from "./useExtensions";
import ScheduleEmailModal from "../ScheduleEmail/ScheduleEmailModal";
import DateTimePickerModal from "../ScheduleEmail/DateTimePickerModal";
import InsertPhotoModal from "./InsertPhotoModal";
import styles from "../ComposeEmail/ComposeEmail.module.css";
import Attachments from "./Attachments";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { generateRandomId } from "../../utils/helperFunctions";
import LargeFileModal from "../ComposeEmail/LargeFileModal";
import {
  storeEmbeddedImage,
  processHtmlForStorage,
  extractEmbeddedImageIds,
  getEmbeddedImage,
  processHtmlForDisplay,
} from "../../utils/embeddedImages";
import { useNavigate } from "react-router-dom";

function fileListToImageFiles(fileList) {
  return Array.from(fileList).filter((file) => {
    const mimeType = (file.type || "").toLowerCase();
    return mimeType.startsWith("image/");
  });
}

const AttachmentIcon = () => {
  return (
    <span
      className="material-symbols-outlined"
      style={{ fontSize: "20px", color: "rgb(95, 99, 104)", transform: "rotate(270deg)" }}
    >
      attachment
    </span>
  );
};

export default function Editor({
  content,
  onChange,
  onSend,
  onDelete,
  onSchedule,
  textEditorMinHeight,
  textEditorMaxHeight,
  useCompactFormatting = false,
  messageId,
}) {
  const extensions = useExtensions({
    placeholder: "",
  });
  const rteRef = useRef(null);
  const [isEditable, setIsEditable] = useState(true);
  const [showMenuBar, setShowMenuBar] = useState(false);
  const [linkAnchorEl, setLinkAnchorEl] = useState(null);
  const [linkText, setLinkText] = useState("");
  const [linkHref, setLinkHref] = useState("");
  const [hasTextSelection, setHasTextSelection] = useState(false);
  const [sendOptionsAnchorEl, setSendOptionsAnchorEl] = useState(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [dateTimePickerOpen, setDateTimePickerOpen] = useState(false);
  const nativeFilePickerRef = useRef(null);

  const [attachments, setAttachments] = useState([]);
  const [embeddedImages, setEmbeddedImages] = useState([]);
  const embeddedImagesRef = useRef([]);
  const { db, setSnackbar, signaturesState } = useGlobalContext();
  const attachmentsContainerRef = useRef(null);
  const [attachmentsHeight, setAttachmentsHeight] = useState(0);
  const isRestoringImages = useRef(false);

  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [largeFileModal, setLargeFileModal] = useState({ open: false, file: null });

  const [signaturePopoverOpen, setSignaturePopoverOpen] = useState(false);
  const [signatureAnchorEl, setSignatureAnchorEl] = useState(null);
  const [selectedSignature, setSelectedSignature] = useState(null);

  const signatures = useMemo(() => {
    const signatures = signaturesState.list.map((signature) => signature.name);
    return ["No signature", ...signatures];
  }, []);

  const navigate = useNavigate();

  // Derive editor height so total space stays fixed when toolbars/attachments appear
  const parsePx = (value) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const match = value.match(/^(\d+)(px)?$/);
      if (match) return parseInt(match[1], 10);
    }
    return 390; // sensible default
  };
  const baseEditorHeightPx = parsePx(textEditorMinHeight);
  const maxEditorHeightPx = textEditorMaxHeight ? parsePx(textEditorMaxHeight) : null;
  const toolbarSpacerHeightPx = showMenuBar ? 51 : 0; // matches spacer div height
  const computedEditorHeightPx = Math.max(210, baseEditorHeightPx - toolbarSpacerHeightPx - (attachmentsHeight || 0));
  const computedMaxEditorHeightPx = maxEditorHeightPx
    ? Math.max(210, maxEditorHeightPx - toolbarSpacerHeightPx - (attachmentsHeight || 0))
    : null;

  const handleNewImageFiles = useCallback(
    async (files, insertPosition) => {
      if (!rteRef.current?.editor || !db) {
        return;
      }

      const attributesForImageFiles = await Promise.all(
        files.map(async (file) => {
          // Store the image in IndexedDB with a temporary ID for now
          // We'll update the emailId when the email is actually sent
          const { id } = await storeEmbeddedImage(db, file, "temp");

          // Create a temporary image to get dimensions
          const img = new Image();
          const objectURL = URL.createObjectURL(file);

          return new Promise((resolve) => {
            img.onload = () => {
              // Scale down large images to max 562px (Gmail's behavior)
              const maxSize = 562;
              let { width, height } = img;

              if (width > maxSize || height > maxSize) {
                const aspectRatio = width / height;
                if (width > height) {
                  width = maxSize;
                  height = maxSize / aspectRatio;
                } else {
                  height = maxSize;
                  width = maxSize * aspectRatio;
                }
              }

              // Store the image metadata for later use
              const imageMetadata = {
                id,
                file,
                name: file.name,
                size: file.size,
                type: file.type,
                url: objectURL,
                width: Math.round(width),
                height: Math.round(height),
              };

              setEmbeddedImages((prev) => {
                const newState = [...prev, imageMetadata];
                embeddedImagesRef.current = newState;
                return newState;
              });

              resolve({
                src: objectURL,
                alt: file.name,
                width: Math.round(width),
                height: Math.round(height),
              });
            };
            img.src = objectURL;
          });
        })
      );

      // Wait for all images to load and get their dimensions
      insertImages({
        images: attributesForImageFiles,
        editor: rteRef.current.editor,
        position: insertPosition,
      });

      // Move cursor to the next line after inserting images
      const editor = rteRef.current?.editor;
      if (editor) {
        // Use setTimeout to ensure the image insertion is complete
        setTimeout(() => {
          // Move cursor to the end of the document
          const endPos = editor.state.doc.content.size;
          editor.commands.setTextSelection(endPos);
          // Insert a line break to move to next line
          editor.commands.insertContent("<br>");
          // Focus the editor
          editor.commands.focus();
        }, 10);
      }
    },
    [db, messageId]
  );

  // Allow for dropping images into the editor
  const handleDrop = useCallback(
    (view, event, _slice, _moved) => {
      if (!(event instanceof DragEvent) || !event.dataTransfer) {
        return false;
      }

      const imageFiles = fileListToImageFiles(event.dataTransfer.files);
      if (imageFiles.length > 0) {
        const insertPosition = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        })?.pos;

        handleNewImageFiles(imageFiles, insertPosition);

        event.preventDefault();
        return true;
      }

      return false;
    },
    [handleNewImageFiles]
  );

  // Allow for pasting images
  const handlePaste = useCallback(
    (_view, event, _slice) => {
      if (!event.clipboardData) {
        return false;
      }

      const pastedImageFiles = fileListToImageFiles(event.clipboardData.files);
      if (pastedImageFiles.length > 0) {
        handleNewImageFiles(pastedImageFiles);
        // Return true to mark the paste event as handled. This can for
        // instance prevent redundant copies of the same image showing up,
        // like if you right-click and copy an image from within the editor
        // (in which case it will be added to the clipboard both as a file and
        // as HTML, which Tiptap would otherwise separately parse.)
        return true;
      }

      // We return false here to allow the standard paste-handler to run.
      return false;
    },
    [handleNewImageFiles]
  );

  // Track attachments area height so we can reduce editor height accordingly
  useEffect(() => {
    if (!attachmentsContainerRef.current) return;
    const el = attachmentsContainerRef.current;
    const update = () => setAttachmentsHeight(el.clientHeight || 0);
    update();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [attachments]);

  // Set up editor change handler
  const handleEditorChange = useCallback(
    ({ editor }) => {
      // Skip processing if we're currently restoring images to prevent infinite loops
      if (isRestoringImages.current) {
        return;
      }

      const html = editor.getHTML();
      const plainText = editor.getText();

      // Process HTML to replace blob URLs with IndexedDB references for draft saving
      const imageMap = {};
      embeddedImagesRef.current.forEach((img) => {
        if (img && img.url && img.id) {
          imageMap[img.url] = img.id;
        }
      });

      const processedHtml = processHtmlForStorage(html, imageMap);

      onChange?.(processedHtml, plainText);
    },
    [onChange, embeddedImages]
  );

  // Function to restore embedded images from IndexedDB
  const restoreEmbeddedImages = useCallback(
    async (htmlContent) => {
      if (!db || !htmlContent) {
        return htmlContent;
      }

      const imageIds = extractEmbeddedImageIds(htmlContent);

      if (imageIds.length === 0) {
        return htmlContent;
      }

      try {
        const embeddedImagesData = await Promise.all(
          imageIds.map(async (imageId) => {
            try {
              const result = await getEmbeddedImage(db, imageId);
              return result;
            } catch (error) {
              console.warn(`Failed to load embedded image ${imageId}:`, error);
              return null;
            }
          })
        );

        const validImages = embeddedImagesData.filter(Boolean);

        // Update the embedded images state with the restored images
        setEmbeddedImages(validImages);
        embeddedImagesRef.current = validImages;

        const processedHtml = processHtmlForDisplay(htmlContent, validImages);

        return processedHtml;
      } catch (error) {
        console.error("Failed to restore embedded images:", error);
        return htmlContent;
      }
    },
    [db]
  );

  // Handle content prop updates after initial render
  useEffect(() => {
    if (rteRef.current?.editor && content !== undefined) {
      const currentContent = rteRef.current.editor.getHTML();

      // Only update if the content has actually changed to avoid unnecessary updates
      if (currentContent !== content) {
        // Set flag to prevent infinite loops
        isRestoringImages.current = true;

        // Restore embedded images before setting content
        restoreEmbeddedImages(content).then((restoredContent) => {
          rteRef.current.editor.commands.setContent(restoredContent, false);

          // Reset flag after a short delay to allow the editor to update
          setTimeout(() => {
            isRestoringImages.current = false;
          }, 100);
        });
      }
    }
  }, [content, restoreEmbeddedImages]);

  useEffect(() => {
    // If no signatures exist at all
    if (!signaturesState?.list || signaturesState.list.length === 0) {
      setSelectedSignature("No signature");
      return;
    }

    const activeId = messageId
      ? signaturesState?.useForRepliesAndForwards
      : signaturesState?.useForNewEmails;

    if (activeId === null || activeId === "" || activeId === undefined) {
      setSelectedSignature("No signature");
      return;
    }

    const index = Number(activeId);
    if (Number.isNaN(index) || index < 0 || index >= signaturesState.list.length) {
      setSelectedSignature("No signature");
      return;
    }

    const sig = signaturesState.list[index];
    setSelectedSignature(sig?.name || "No signature");
  }, [signaturesState, messageId]);

  const openLinkPopover = (event) => {
    const editor = rteRef.current?.editor;
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    const currentHref = editor.getAttributes("link")?.href || "";
    setLinkText(selectedText || "");
    setLinkHref(currentHref || "");
    setHasTextSelection(from !== to);
    setLinkAnchorEl(event.currentTarget);
  };

  const closeLinkPopover = () => {
    setLinkAnchorEl(null);
  };

  const applyLink = () => {
    const editor = rteRef.current?.editor;
    if (!editor) return;
    if (!linkHref) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      closeLinkPopover();
      return;
    }
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    if (hasSelection) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkHref }).run();
    } else {
      const displayText = linkText || linkHref;
      editor.chain().focus().insertContent(`<a href="${linkHref}">${displayText}</a>`).run();
    }
    closeLinkPopover();
  };

  const canApply = hasTextSelection
    ? linkHref.trim().length > 0
    : linkText.trim().length > 0 && linkHref.trim().length > 0;

  const openSendOptionsPopover = (event) => {
    setSendOptionsAnchorEl(event.currentTarget);
  };

  const closeSendOptionsPopover = () => {
    setSendOptionsAnchorEl(null);
  };

  const handleScheduleSend = () => {
    setScheduleModalOpen(true);
    closeSendOptionsPopover();
  };

  const handleCloseScheduleModal = () => {
    setScheduleModalOpen(false);
  };

  const handleSelectSchedule = (scheduleOption) => {
    console.log("Schedule selected:", scheduleOption);
    if (onSchedule) {
      onSchedule({
        scheduledDate: scheduleOption.date.toLocaleDateString(),
        scheduledTime: scheduleOption.date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      });
    }
    setScheduleModalOpen(false);
  };

  const handleOpenDateTimePicker = () => {
    setDateTimePickerOpen(true);
    setScheduleModalOpen(false);
  };

  const handleCloseDateTimePicker = () => {
    setDateTimePickerOpen(false);
  };

  const handleDateTimeSchedule = (scheduleOption) => {
    console.log("Date/Time scheduled:", scheduleOption);
    if (onSchedule) {
      onSchedule({
        scheduledDate: scheduleOption.date.toLocaleDateString(),
        scheduledTime: scheduleOption.date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      });
    }
    setDateTimePickerOpen(false);
  };

  const openNativeFilePicker = () => {
    nativeFilePickerRef.current?.click();
  };

  const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25MB

  // Block only these dangerous file extensions, everything else is allowed
  const BLOCKED_EXTENSIONS = new Set([
    "ade",
    "adp",
    "apk",
    "appx",
    "appxbundle",
    "bat",
    "cab",
    "chm",
    "cmd",
    "com",
    "cpl",
    "diagcab",
    "diagcfg",
    "diagpkg",
    "dll",
    "dmg",
    "exe",
    "hta",
    "img",
    "ins",
    "iso",
    "isp",
    "jar",
    "jnlp",
    "js",
    "jse",
    "lib",
    "lnk",
    "mde",
    "mjs",
    "msc",
    "msi",
    "msix",
    "msixbundle",
    "msp",
    "mst",
    "nsh",
    "pif",
    "ps1",
    "scr",
    "sct",
    "shb",
    "sys",
    "vb",
    "vbe",
  ]);

  const getFileExtension = (filename) => {
    const lastDot = filename.lastIndexOf(".");
    if (lastDot === -1) return "";
    return filename.substring(lastDot + 1).toLowerCase();
  };

  const handleNativeFilePickerChange = (e) => {
    const { files = [] } = e.target;

    const newFiles = [];

    for (const file of files) {
      // Size validation - show modal for large files instead of blocking
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setLargeFileModal({ open: true, file });
        // Clear the file input after setting the modal
        if (e.target) {
          e.target.value = "";
        }
        return; // Exit early for large files
      }

      // Check if file already exists to prevent duplicates
      const fileExists = attachments.some((attachment) => attachment.name === file.name);
      if (fileExists) {
        setSnackbar({
          open: true,
          message: "File already attached.",
          autoHideDuration: 3000,
        });
        continue;
      }

      const id = generateRandomId();
      const url = URL.createObjectURL(file);

      // Block only specific dangerous file extensions
      const extension = getFileExtension(file.name);
      const isBlocked = extension && BLOCKED_EXTENSIONS.has(extension);

      const metadata = {
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        url,
        isBlocked,
      };
      newFiles.push(metadata);

      db.put("attachments", { id, file });

      // Show Gmail-style dark snackbar when any file is blocked
      if (isBlocked) {
        setSnackbar({
          open: true,
          severity: "error",
          message: "There were errors attaching your file(s).",
          autoHideDuration: 6000,
        });
      }
    }

    // Only add regular files if there are any
    if (newFiles.length > 0) {
      setAttachments((prevAttachments) => [...prevAttachments, ...newFiles]);
    }

    // Clear the file input at the end
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleLargeFileAccept = () => {
    if (largeFileModal.file) {
      // Check if file already exists to prevent duplicates
      const fileExists = attachments.some((attachment) => attachment.name === largeFileModal.file.name);

      if (!fileExists) {
        // Create Drive link instead of regular attachment
        const driveLink = `drive.mailg.com/file/d/${encodeURIComponent(largeFileModal.file.name)}`;

        // Add as attachment with Drive link metadata
        const id = generateRandomId();
        const url = URL.createObjectURL(largeFileModal.file);
        const metadata = {
          id,
          name: largeFileModal.file.name,
          size: largeFileModal.file.size,
          type: largeFileModal.file.type,
          url,
          isDriveFile: true, // Special flag to indicate it's a "Drive" file
          driveLink: `https://${driveLink}`, // Store the Drive link
        };

        // Add to attachments array
        setAttachments((prevAttachments) => [...prevAttachments, metadata]);

        // Also store in IndexedDB
        db.put("attachments", { id, file: largeFileModal.file });

        setSnackbar({
          open: true,
          message: "File uploaded to MailG Drive. Download link will be included in your email.",
          autoHideDuration: 4000,
        });
      } else {
        setSnackbar({
          open: true,
          message: "File already attached.",
          autoHideDuration: 3000,
        });
      }
    }
    setLargeFileModal({ open: false, file: null });
  };

  const formatFileSize = (size) => {
    if (size < 1024) {
      return `${size}B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)}K`;
    } else if (size < 1024 * 1024 * 1024) {
      return `${(size / 1024 / 1024).toFixed(1)}M`;
    } else {
      return `${(size / 1024 / 1024 / 1024).toFixed(1)}G`;
    }
  };

  const handleLargeFileCancel = () => {
    setLargeFileModal({ open: false, file: null });
  };

  const handleEditorClick = (event) => {
    // Check if clicked element is a Drive link
    const target = event.target;
    if (target.tagName === "A" && target.getAttribute("data-drive-link") === "true") {
      event.preventDefault();
      event.stopPropagation();
      // Show a message that this is a Drive link
      setSnackbar({
        open: true,
        message: "This is a MailG Drive link. It will be accessible to recipients.",
        autoHideDuration: 3000,
      });
    }
  };

  const openPhotoModal = () => {
    setPhotoModalOpen(true);
  };

  const closePhotoModal = () => {
    setPhotoModalOpen(false);
  };

  const handleInsertImages = (imageFiles) => {
    if (!rteRef.current?.editor) {
      return;
    }

    // Get current cursor position
    const { from } = rteRef.current.editor.state.selection;

    // Use the existing handleNewImageFiles function
    handleNewImageFiles(imageFiles, from);
  };

  const openSignaturePopover = (event) => {
    setSignatureAnchorEl(event.currentTarget);
    setSignaturePopoverOpen(true);
  };

  const closeSignaturePopover = () => {
    setSignatureAnchorEl(null);
    setSignaturePopoverOpen(false);
  };

  const replaceSignature = (editor, html) => {
    if (!editor) return;

    const src = (html || "").trim();
    const { doc } = editor.state;

    // Collect ALL deletable nodes (separators + signature) first
    const toDelete = [];
    doc.descendants((node, pos) => {
      if (node.attrs && node.attrs["data-signature"] === "true") {
        toDelete.push({ pos, size: node.nodeSize });
      }
      if (node.type?.name === "paragraph" && node.textContent.trim() === "--") {
        toDelete.push({ pos, size: node.nodeSize });
      }
    });

    // Sort by pos descending to avoid shifting
    toDelete.sort((a, b) => b.pos - a.pos);

    // Delete them all safely
    toDelete.forEach(({ pos, size }) => {
      editor
        .chain()
        .focus()
        .deleteRange({ from: pos, to: pos + size })
        .run();
    });

    // If no new signature, stop here
    if (!src) return;

    // Build new signature block
    let toInsert;
    if (/^\s*<p(\s|>)/i.test(src)) {
      toInsert = src.replace(/<p([^>]*)>/i, '<p data-signature="true"$1>');
    } else {
      toInsert = `<p><br></p><p data-signature="true">${src}</p>`;
    }

    // Add separator if needed
    if (!signaturesState?.insertSignatureBeforeQuotedText) {
      toInsert = `<p>--</p>${toInsert}`;
    }

    // Determine insert position (end or before blockquote)
    let insertAt = editor.state.doc.content.size;
    if (signaturesState?.insertSignatureBeforeQuotedText) {
      let quotePos = null;
      editor.state.doc.descendants((node, pos) => {
        if (node.type?.name === "blockquote") {
          quotePos = pos;
          return false;
        }
        return true;
      });
      if (quotePos !== null) insertAt = quotePos;
    }

    // Insert new signature
    editor.chain().focus().insertContentAt(insertAt, toInsert).run();
  };

  return (
    <>
      <RichTextEditor
        ref={rteRef}
        extensions={extensions}
        content={content}
        onUpdate={handleEditorChange}
        editable={isEditable}
        editorProps={{
          handleDrop: handleDrop,
          handlePaste: handlePaste,
        }}
        onClick={handleEditorClick}
        RichTextFieldProps={{
          variant: "standard",
          MenuBarProps: {
            hide: !showMenuBar,
          },
          _footer: (
            <Stack
              direction="column"
              spacing={2}
              sx={{
                py: 1,
              }}
            >
              {showMenuBar && <div style={{ width: "100%", height: "35px" }}></div>}
              {/* Measure attachments height to shrink editor accordingly */}
              <div ref={attachmentsContainerRef} style={{ position: "relative" }}>
                <Attachments attachments={attachments} setAttachments={setAttachments} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", position: "relative", width: "100%" }}>
                  <div className={styles.sendButtonContainer}>
                    <div
                      aria-label="Send ‪(⌘Enter)‬"
                      role="button"
                      tabIndex="1"
                      style={{
                        whiteSpace: "nowrap",
                        textAlign: "center",
                        verticalAlign: "middle",
                        boxShadow: "none",
                        WebkitUserDrag: "none",
                        lineHeight: "18px",
                        outline: "none",
                        padding: "0px 16px",
                        border: "none",
                        WebkitBoxAlign: "center",
                        alignItems: "center",
                        display: "inline-flex",
                        WebkitBoxPack: "center",
                        justifyContent: "center",
                        position: "relative",
                        zIndex: 0,
                        WebkitFontSmoothing: "antialiased",
                        fontSize: "0.875rem",
                        letterSpacing: "normal",
                        backgroundImage: "none",
                        boxSizing: "border-box",
                        fontWeight: 500,
                        height: "36px",
                        color: "rgb(255, 255, 255)",
                        margin: "0px",
                        marginRight: "0px",
                        maxWidth: "104px",
                        minWidth: "72px",
                        cursor: "pointer",
                        borderRadius: "18px 0px 0px 18px",
                        userSelect: "none",
                      }}
                      onClick={async () => {
                        // Process HTML to replace object URLs with IndexedDB references
                        const html = rteRef.current?.editor?.getHTML() || "";
                        const imageMap = {};

                        // Create a map of object URLs to image IDs
                        embeddedImages.forEach((image) => {
                          imageMap[image.url] = image.id;
                        });

                        const processedHtml = processHtmlForStorage(html, imageMap);
                        onSend({ attachments, embeddedImages, processedHtml });
                      }}
                    >
                      Send
                    </div>
                    <div
                      aria-expanded={Boolean(sendOptionsAnchorEl)}
                      aria-haspopup="true"
                      aria-label="More send options"
                      role="button"
                      tabIndex="1"
                      onClick={openSendOptionsPopover}
                      style={{
                        whiteSpace: "nowrap",
                        textAlign: "center",
                        boxShadow: "none",
                        WebkitUserDrag: "none",
                        lineHeight: "18px",
                        outline: "none",
                        border: "none",
                        WebkitBoxAlign: "center",
                        alignItems: "center",
                        display: "inline-flex",
                        WebkitBoxPack: "center",
                        justifyContent: "center",
                        position: "relative",
                        zIndex: 0,
                        WebkitFontSmoothing: "antialiased",
                        fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                        fontSize: "0.875rem",
                        letterSpacing: "normal",
                        backgroundImage: "none",
                        boxSizing: "border-box",
                        fontWeight: 500,
                        height: "36px",
                        color: "rgb(255, 255, 255)",
                        padding: "0px 8px",
                        minWidth: "24px",
                        borderLeft: "1px solid rgb(6, 46, 111)",
                        cursor: "pointer",
                        borderRadius: "0px 18px 18px 0px",
                        userSelect: "none",
                      }}
                    >
                      <span className="material-symbols-outlined">arrow_drop_down</span>
                    </div>
                  </div>

                  {/* Hidden input for native file picker */}
                  <input
                    type="file"
                    ref={nativeFilePickerRef}
                    style={{ display: "none" }}
                    multiple
                    onChange={handleNativeFilePickerChange}
                  />

                  {showMenuBar && (
                    <EditorMenuControls editor={rteRef.current?.editor} useCompactFormatting={useCompactFormatting} />
                  )}
                  <MenuButton
                    value="formatting"
                    tooltipLabel={showMenuBar ? "Hide formatting" : "Show formatting"}
                    size="small"
                    onClick={() => setShowMenuBar((currentState) => !currentState)}
                    selected={showMenuBar}
                    IconComponent={FormatColorText}
                  />

                  <MenuButton
                    tooltipLabel="Attach files"
                    size="small"
                    onClick={openNativeFilePicker}
                    IconComponent={AttachmentIcon}
                  />

                  <MenuButton
                    tooltipLabel="Insert link"
                    size="small"
                    onClick={openLinkPopover}
                    IconComponent={InsertLink}
                  />

                  <MenuButton
                    tooltipLabel="Insert photo"
                    size="small"
                    onClick={openPhotoModal}
                    IconComponent={InsertPhoto}
                  />

                  <IconButton onClick={openSignaturePopover}>
                    <img src="/assets/images/ink_pen.png" alt="Insert Signature" style={{ width: 20, height: 20 }} />
                  </IconButton>

                  <Popper open={Boolean(linkAnchorEl)} anchorEl={linkAnchorEl} placement="top" style={{ zIndex: 1500 }}>
                    <ClickAwayListener
                      onClickAway={closeLinkPopover}
                      mouseEvent="onMouseDown"
                      touchEvent="onTouchStart"
                    >
                      <Paper
                        elevation={5}
                        sx={{
                          p: 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                          padding: "16px 32px 16px 16px",
                        }}
                      >
                        {!hasTextSelection && (
                          <div style={{ position: "relative", width: 260 }}>
                            <input
                              type="text"
                              value={linkText}
                              onChange={(e) => setLinkText(e.target.value)}
                              placeholder="Text"
                              onFocus={(e) => {
                                e.target.placeholder = "";
                              }}
                              onBlur={(e) => {
                                if (!e.target.value) e.target.placeholder = "Text";
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") applyLink();
                              }}
                              style={{
                                width: "80%",
                                padding: "6px 10px 6px 34px",
                                fontSize: "14px",
                                border: "1px solid rgba(0,0,0,0.23)",
                                borderRadius: 4,
                                outline: "none",
                                marginBottom: "4px",
                              }}
                            />
                            <svg
                              focusable="false"
                              viewBox="0 -960 960 960"
                              height="20"
                              width="20"
                              style={{
                                position: "absolute",
                                left: 8,
                                top: "46%",
                                transform: "translateY(-50%)",
                                userSelect: "none",
                                pointerEvents: "none",
                                color: "rgba(0,0,0,0.6)",
                              }}
                            >
                              <path d="M192-360v-72H576v72H192Zm0-168v-72H768v72H192Z" />
                            </svg>
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ position: "relative", width: 260 }}>
                            <input
                              type="text"
                              value={linkHref}
                              onChange={(e) => setLinkHref(e.target.value)}
                              placeholder="URL"
                              onFocus={(e) => {
                                e.target.placeholder = "";
                              }}
                              onBlur={(e) => {
                                if (!e.target.value) e.target.placeholder = "URL";
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") applyLink();
                              }}
                              style={{
                                width: "80%",
                                padding: "6px 10px 6px 34px",
                                fontSize: "14px",
                                border: "1px solid rgba(0,0,0,0.23)",
                                borderRadius: 4,
                                outline: "none",
                              }}
                            />
                            <svg
                              focusable="false"
                              viewBox="0 -960 960 960"
                              height="20"
                              width="20"
                              style={{
                                position: "absolute",
                                left: 8,
                                top: "50%",
                                transform: "translateY(-50%)",
                                userSelect: "none",
                                pointerEvents: "none",
                                color: "rgba(0,0,0,0.6)",
                              }}
                            >
                              <path d="M432-288H288q-79.68,0-135.84-56.23T96-480.23T152.16-616T288-672H432v72H288q-50,0-85,35t-35,85t35,85t85,35H432v72ZM336-444v-72H624v72H336ZM528-288v-72H672q50,0 85-35t35-85t-35-85t-85-35H528v-72H672q79.68,0 135.84,56.23t56.16,136T807.84-344T672-288H528Z"></path>
                            </svg>
                          </div>
                          <button
                            type="button"
                            disabled={!canApply}
                            onClick={applyLink}
                            style={{
                              background: "transparent",
                              border: "none",
                              padding: "4px 6px",
                              fontSize: 14,
                              fontWeight: 500,
                              color: canApply ? "#1a73e8" : "rgba(0,0,0,0.38)",
                              cursor: canApply ? "pointer" : "default",
                            }}
                          >
                            Apply
                          </button>
                        </div>
                      </Paper>
                    </ClickAwayListener>
                  </Popper>

                  {/* Send Options Dropdown */}
                  <Popper
                    open={Boolean(sendOptionsAnchorEl)}
                    anchorEl={sendOptionsAnchorEl}
                    placement="top"
                    style={{ zIndex: 1500 }}
                  >
                    <ClickAwayListener
                      onClickAway={closeSendOptionsPopover}
                      mouseEvent="onMouseDown"
                      touchEvent="onTouchStart"
                    >
                      <Paper elevation={5} sx={{ p: 0, minWidth: 160 }}>
                        <div
                          onClick={handleScheduleSend}
                          style={{
                            padding: "12px 16px",
                            cursor: "pointer",
                            fontSize: "14px",
                            color: "rgb(60, 64, 67)",
                            borderBottom: "1px solid rgba(0,0,0,0.1)",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            transition: "background-color 0.1s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "rgba(0,0,0,0.04)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "transparent";
                          }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: "20px", color: "rgb(95, 99, 104)" }}
                          >
                            schedule
                          </span>
                          Schedule send
                        </div>
                      </Paper>
                    </ClickAwayListener>
                  </Popper>

                  <Menu
                    anchorEl={signatureAnchorEl}
                    open={signaturePopoverOpen}
                    onClose={closeSignaturePopover}
                    anchorOrigin={{ vertical: "top", horizontal: "left" }}
                    transformOrigin={{ vertical: "bottom", horizontal: "left" }}
                    keepMounted
                    slotProps={{
                      paper: {
                        sx: {
                          minWidth: 200,
                          py: 0.5,
                        },
                      },
                    }}
                  >
                    <MenuItem
                      onClick={() => {
                        closeSignaturePopover();
                        navigate("/settings/general");
                      }}
                      sx={{ py: 0.8 }}
                    >
                      <Typography fontSize={14} style={{ marginLeft: "20%" }}>
                        Manage signatures
                      </Typography>
                    </MenuItem>
                    <Divider />

                    {signatures.map((name) => (
                      <MenuItem
                        key={name}
                        onClick={() => {
                          if (name === "No signature") {
                            replaceSignature(rteRef.current?.editor, "");
                            setSelectedSignature(name);
                            closeSignaturePopover();
                            return;
                          }

                          const sig = signaturesState.list.find((sig) => sig.name === name);
                          replaceSignature(rteRef.current?.editor, sig.content);
                          setSelectedSignature(name);
                          closeSignaturePopover();
                        }}
                        selected={selectedSignature === name}
                        sx={{ py: 0.8 }}
                      >
                        <span style={{ width: "20%" }}>
                          {selectedSignature === name && (
                            <ListItemIcon sx={{ minWidth: 24 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                                check
                              </span>
                            </ListItemIcon>
                          )}
                        </span>
                        <ListItemText
                          primary={
                            <Typography
                              fontSize={14}
                              sx={{
                                color: selectedSignature === name ? "text.primary" : "text.secondary",
                              }}
                            >
                              {name}
                            </Typography>
                          }
                        />
                      </MenuItem>
                    ))}
                  </Menu>
                </div>

                <div style={{ marginLeft: "auto", display: "flex", gap: "12px", alignItems: "center" }}>
                  <button className={styles.deleteButton} onClick={onDelete} title="Delete">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            </Stack>
          ),
          get footer() {
            return this._footer;
          },
          set footer(value) {
            this._footer = value;
          },
        }}
        sx={{
          px: 1,
          mb: 1,
          "& .ProseMirror": {
            "& h1, & h2, & h3, & h4, & h5, & h6": {
              scrollMarginTop: showMenuBar ? 50 : 0,
            },
            "& img": {
              maxWidth: "100%",
              height: "auto",
              display: "block",
              margin: "8px 0",
              borderRadius: "4px",
            },
            minHeight: `${computedEditorHeightPx}px`,
            ...(computedMaxEditorHeightPx && {
              maxHeight: `${computedMaxEditorHeightPx}px`,
              overflowY: "auto",
            }),
          },
        }}
      >
        {() => (
          <>
            <LinkBubbleMenu />
            <TableBubbleMenu />
          </>
        )}
      </RichTextEditor>

      {/* Schedule Email Modal */}
      <ScheduleEmailModal
        open={scheduleModalOpen}
        onClose={handleCloseScheduleModal}
        onSelectSchedule={handleSelectSchedule}
        onOpenDateTimePicker={handleOpenDateTimePicker}
      />

      {/* Date Time Picker Modal */}
      <DateTimePickerModal
        open={dateTimePickerOpen}
        onClose={handleCloseDateTimePicker}
        onSchedule={handleDateTimeSchedule}
      />

      {/* Insert Photo Modal */}
      <InsertPhotoModal open={photoModalOpen} onClose={closePhotoModal} onInsertImages={handleInsertImages} />

      {/* Large File Modal */}
      <LargeFileModal
        open={largeFileModal.open}
        onClose={handleLargeFileCancel}
        onAccept={handleLargeFileAccept}
        fileName={largeFileModal.file?.name}
        fileSize={largeFileModal.file?.size}
      />
    </>
  );
}
