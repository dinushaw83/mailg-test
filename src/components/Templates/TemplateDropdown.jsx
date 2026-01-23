import React, { useState, useRef, useEffect } from "react";
import { Popper, Paper, ClickAwayListener } from "@mui/material";
import { MenuButton } from "mui-tiptap";
import useTemplates from "../../hooks/useTemplates";
import CreateTemplateDialog from "./CreateTemplateDialog";
import OverwriteTemplateDialog from "./OverwriteTemplateDialog";
import DeleteTemplateDialog from "./DeleteTemplateDialog";
import SaveDraftSubMenu from "./SaveDraftSubMenu";
import DeleteTemplateSubMenu from "./DeleteTemplateSubMenu";
import { useGlobalContext } from "../../contexts/GlobalContext";
import templateService from "../../services/templateService";
import styles from "./TemplateDropdown.module.css";

const TemplateIcon = () => {
  return <span className={`material-symbols-outlined ${styles.templateIcon}`}>description</span>;
};

export default function TemplateDropdown({ subject = "", content = "", onContentChange, onSubjectChange }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [hoveredSubmenu, setHoveredSubmenu] = useState(null);
  const [hoveredSubmenuAnchor, setHoveredSubmenuAnchor] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [overwriteDialogOpen, setOverwriteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplateForOverwrite, setSelectedTemplateForOverwrite] = useState(null);
  const [selectedTemplateForDelete, setSelectedTemplateForDelete] = useState(null);
  const [loadingTemplateId, setLoadingTemplateId] = useState(null);
  const saveDraftItemRef = useRef(null);
  const deleteTemplateItemRef = useRef(null);
  const { setSnackbar } = useGlobalContext();

  const {
    templates,
    isLoadingList,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    isCreating,
    isUpdating,
    isDeleting,
  } = useTemplates({ include_shared: false });

  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setHoveredSubmenu(null);
    setHoveredSubmenuAnchor(null);
  };

  // Helper function to check if content is blank
  const isContentBlank = (htmlContent) => {
    if (!htmlContent) return true;
    // Strip HTML tags
    const textContent = htmlContent.replace(/<[^>]*>/g, "");
    // Remove whitespace and check if empty
    return !textContent.trim();
  };

  // Get default template name from subject or content
  const getDefaultTemplateName = () => {
    if (subject && subject.trim()) {
      return subject.trim();
    }
    if (content) {
      // Strip HTML tags and get first 50 characters
      const textContent = content.replace(/<[^>]*>/g, "").trim();
      if (textContent) {
        return textContent.substring(0, 50);
      }
    }
    return "Untitled template";
  };

  // Handle template insertion
  const handleInsertTemplate = async (template) => {
    if (!template) return;

    // Set loading state for this template
    setLoadingTemplateId(template.id);

    try {
      // Fetch the full template details to get body and html_body
      const fullTemplate = await templateService.getTemplate(template.id);

      const templateContent = fullTemplate.html_body || fullTemplate.body || "";

      if (onContentChange) {
        onContentChange(templateContent);
      }

      // Update subject if template has a name and current subject is empty
      if (fullTemplate.name && onSubjectChange && !subject) {
        // Only update if current subject is empty
        onSubjectChange(fullTemplate.name);
      }

      setTimeout(() => {
        handleClose();
      }, 100);
      setSnackbar({
        open: true,
        message: `Template "${fullTemplate.name}" inserted.`,
        autoHideDuration: 3000,
      });
    } catch (error) {
      console.error("Error fetching template:", error);
      setSnackbar({
        open: true,
        message: "Failed to load template. Please try again.",
        autoHideDuration: 4000,
      });
    } finally {
      // Clear loading state
      setLoadingTemplateId(null);
    }
  };

  // Handle create new template
  const handleCreateNewTemplate = () => {
    setCreateDialogOpen(true);
    handleClose();
  };

  // Handle save as new template
  const handleSaveAsNewTemplate = async (templateName) => {
    // Validate that content is not blank
    if (isContentBlank(content)) {
      setSnackbar({
        open: true,
        message: "Cannot save template with empty content. Please add some content before saving.",
        autoHideDuration: 4000,
      });
      return;
    }

    try {
      await createTemplate({
        name: templateName,
        html_body: content,
        body: content.replace(/<[^>]*>/g, ""), // Plain text version
        is_shared: false,
      });
      setCreateDialogOpen(false);
      setSnackbar({
        open: true,
        message: `Template "${templateName}" saved.`,
        autoHideDuration: 3000,
      });
    } catch (error) {
      console.error("Error creating template:", error);
      setSnackbar({
        open: true,
        message: "Failed to save template. Please try again.",
        autoHideDuration: 4000,
      });
    }
  };

  // Handle overwrite template
  const handleOverwriteTemplate = () => {
    setOverwriteDialogOpen(true);
    setHoveredSubmenu(null);
    setHoveredSubmenuAnchor(null);
  };

  // Handle confirm overwrite
  const handleConfirmOverwrite = async () => {
    if (!selectedTemplateForOverwrite) return;

    // Validate that content is not blank
    if (isContentBlank(content)) {
      setSnackbar({
        open: true,
        message: "Cannot save template with empty content. Please add some content before saving.",
        autoHideDuration: 4000,
      });
      return;
    }

    try {
      await updateTemplate(selectedTemplateForOverwrite.id, {
        html_body: content,
        body: content.replace(/<[^>]*>/g, ""),
      });
      setOverwriteDialogOpen(false);
      setSelectedTemplateForOverwrite(null);
      setSnackbar({
        open: true,
        message: `Template "${selectedTemplateForOverwrite.name}" updated.`,
        autoHideDuration: 3000,
      });
    } catch (error) {
      console.error("Error updating template:", error);
      setSnackbar({
        open: true,
        message: "Failed to update template. Please try again.",
        autoHideDuration: 4000,
      });
    }
  };

  // Handle delete template
  const handleDeleteTemplate = (template) => {
    setDeleteDialogOpen(true);
    setHoveredSubmenu(null);
    setHoveredSubmenuAnchor(null);
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!selectedTemplateForDelete) return;

    try {
      await deleteTemplate(selectedTemplateForDelete.id);
      setDeleteDialogOpen(false);
      const deletedName = selectedTemplateForDelete.name;
      setSelectedTemplateForDelete(null);
      setSnackbar({
        open: true,
        message: `Template "${deletedName}" deleted.`,
        autoHideDuration: 3000,
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      setSnackbar({
        open: true,
        message: "Failed to delete template. Please try again.",
        autoHideDuration: 4000,
      });
    }
  };

  // Handle hover on save draft item
  const handleSaveDraftHover = (event) => {
    setHoveredSubmenu("saveDraft");
    setHoveredSubmenuAnchor(event.currentTarget);
  };

  // Handle hover on delete template item
  const handleDeleteTemplateHover = (event) => {
    setHoveredSubmenu("deleteTemplate");
    setHoveredSubmenuAnchor(event.currentTarget);
  };

  // Handle mouse leave from submenu items
  const handleSubmenuLeave = (subMenu) => {
    // Delay to allow moving to submenu
    setTimeout(() => {
      if (!document.querySelector(".template-submenu-popper:hover")) {
        setHoveredSubmenu((currentSubMenu) => {
          if (currentSubMenu === subMenu) {
            return null;
          }
          setHoveredSubmenuAnchor((currentAnchor) => {
            if (currentAnchor === event.currentTarget) {
              return null;
            }
            return currentAnchor;
          });
          return currentSubMenu;
        });
      }
    }, 100);
  };

  // Close submenu when clicking away
  useEffect(() => {
    if (hoveredSubmenu) {
      const handleClickOutside = (event) => {
        if (
          hoveredSubmenuAnchor &&
          !hoveredSubmenuAnchor.contains(event.target) &&
          !event.target.closest(".template-submenu-popper")
        ) {
          setHoveredSubmenu(null);
          setHoveredSubmenuAnchor(null);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [hoveredSubmenu, hoveredSubmenuAnchor]);

  return (
    <>
      <MenuButton tooltipLabel="Templates" size="small" onClick={handleClick} IconComponent={TemplateIcon} />

      <Popper
        open={open}
        anchorEl={anchorEl}
        placement="top-start"
        className={styles.popper}
        modifiers={[
          {
            name: "offset",
            options: {
              offset: [0, 8],
            },
          },
        ]}
      >
        <ClickAwayListener onClickAway={handleClose} mouseEvent="onMouseDown" touchEvent="onTouchStart">
          <Paper elevation={5} className={styles.paper}>
            {/* INSERT TEMPLATES Section */}
            <div className={styles.sectionHeader}>INSERT TEMPLATES</div>

            {/* Template List */}
            {isLoadingList ? (
              <div className={styles.loadingState}>Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className={styles.emptyState}>No templates available</div>
            ) : (
              <div className={styles.templateList}>
                {templates.map((template) => {
                  const isLoading = loadingTemplateId === template.id;
                  const displayName =
                    template.name.length > 30 ? `${template.name.substring(0, 30)}...` : template.name;
                  return (
                    <div
                      key={template.id}
                      onClick={(e) => {
                        if (!isLoading) {
                          e.preventDefault();
                          handleInsertTemplate(template);
                        }
                      }}
                      className={`${styles.templateItem} ${isLoading ? styles.templateItemLoading : ""}`}
                      title={template.name}
                    >
                      {displayName}
                    </div>
                  );
                })}
              </div>
            )}

            <div className={styles.separator} />

            {/* Save Draft as template */}
            <div
              ref={saveDraftItemRef}
              onMouseEnter={handleSaveDraftHover}
              onMouseLeave={() => handleSubmenuLeave("saveDraft")}
              className={`${styles.menuItem} ${hoveredSubmenu === "saveDraft" ? styles.hovered : ""}`}
            >
              <span>Save Draft as template</span>
              <span className={`material-symbols-outlined ${styles.arrowIcon}`}>arrow_right</span>
            </div>

            {/* Delete template */}
            <div
              ref={deleteTemplateItemRef}
              onMouseEnter={handleDeleteTemplateHover}
              onMouseLeave={() => handleSubmenuLeave("deleteTemplate")}
              className={`${styles.menuItem} ${hoveredSubmenu === "deleteTemplate" ? styles.hovered : ""}`}
            >
              <span>Delete template</span>
              <span className={`material-symbols-outlined ${styles.arrowIcon}`}>arrow_right</span>
            </div>

            {/* Save Draft Submenu */}
            {hoveredSubmenu === "saveDraft" && hoveredSubmenuAnchor && (
              <SaveDraftSubMenu
                open={true}
                anchorEl={hoveredSubmenuAnchor}
                templates={templates}
                onTemplateSelect={(template) => {
                  setSelectedTemplateForOverwrite(template);
                  handleOverwriteTemplate();
                }}
                onCreateNew={handleCreateNewTemplate}
                onMouseEnter={() => setHoveredSubmenu("saveDraft")}
                onMouseLeave={handleSubmenuLeave}
              />
            )}

            {/* Delete Template Submenu */}
            {hoveredSubmenu === "deleteTemplate" && hoveredSubmenuAnchor && (
              <DeleteTemplateSubMenu
                open={true}
                anchorEl={hoveredSubmenuAnchor}
                templates={templates}
                onTemplateSelect={(template) => {
                  setSelectedTemplateForDelete(template);
                  handleDeleteTemplate();
                }}
                onMouseEnter={() => setHoveredSubmenu("deleteTemplate")}
                onMouseLeave={handleSubmenuLeave}
              />
            )}
          </Paper>
        </ClickAwayListener>
      </Popper>

      {/* Dialogs */}
      <CreateTemplateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onConfirm={handleSaveAsNewTemplate}
        defaultName={getDefaultTemplateName()}
        isLoading={isCreating}
      />

      <OverwriteTemplateDialog
        open={overwriteDialogOpen}
        onClose={() => {
          setOverwriteDialogOpen(false);
          setSelectedTemplateForOverwrite(null);
        }}
        onConfirm={handleConfirmOverwrite}
        templateName={selectedTemplateForOverwrite?.name || ""}
        isLoading={isUpdating}
      />

      <DeleteTemplateDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedTemplateForDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        templateName={selectedTemplateForDelete?.name || ""}
        isLoading={isDeleting}
      />
    </>
  );
}
