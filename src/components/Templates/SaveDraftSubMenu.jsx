import React from "react";
import { Popper, Paper } from "@mui/material";
import styles from "./SaveDraftSubMenu.module.css";

export default function SaveDraftSubMenu({
  open,
  anchorEl,
  templates,
  onTemplateSelect,
  onCreateNew,
  onMouseEnter,
  onMouseLeave,
}) {
  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement="right-start"
      className={`template-submenu-popper ${styles.popper}`}
      modifiers={[
        {
          name: "offset",
          options: {
            offset: [0, 0],
          },
        },
      ]}
    >
      <Paper elevation={5} className={styles.paper} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        <div className={styles.header}>OVERWRITE templates</div>
        {templates.length === 0 ? (
          <div className={styles.emptyState}>No templates available</div>
        ) : (
          <div className={styles.templateList}>
            {templates.map((template) => (
              <div key={template.id} onClick={() => onTemplateSelect(template)} className={styles.templateItem}>
                {template.name}
              </div>
            ))}
          </div>
        )}
        <div className={styles.separator} />
        <div onClick={onCreateNew} className={styles.createNewItem}>
          Save as template (new template)
        </div>
      </Paper>
    </Popper>
  );
}
