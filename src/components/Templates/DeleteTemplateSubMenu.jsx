import React from "react";
import { Popper, Paper } from "@mui/material";
import styles from "./DeleteTemplateSubMenu.module.css";

export default function DeleteTemplateSubMenu({
  open,
  anchorEl,
  templates,
  onTemplateSelect,
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
        <div className={styles.header}>DELETE TEMPLATE</div>
        {templates.length === 0 ? (
          <div className={styles.emptyState}>No templates available</div>
        ) : (
          <div className={styles.templateList}>
            {templates.map((template) => {
              const displayName = template.name.length > 30 ? `${template.name.substring(0, 30)}...` : template.name;
              return (
                <div
                  key={template.id}
                  onClick={() => {
                    onTemplateSelect(template);
                  }}
                  className={styles.templateItem}
                  title={template.name}
                >
                  {displayName}
                </div>
              );
            })}
          </div>
        )}
      </Paper>
    </Popper>
  );
}
