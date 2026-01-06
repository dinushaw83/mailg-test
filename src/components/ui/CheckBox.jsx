export default function CheckBox({ id, labelledBy, checked, onChange }) {
  const size = 20;

  function toggle() {
    onChange?.(!checked);
  }

  function onKeyDown(e) {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggle();
    }
  }

  return (
    <div
      id={id}
      className={`oZ-jc  ${checked ? "is-checked" : "T-Jo J-J5-Ji"}`}
      role="checkbox"
      aria-labelledby={labelledBy}
      aria-checked={checked ? "true" : "false"}
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      onKeyDown={onKeyDown}
      style={{
        width: size + 2,
        height: size + 2,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: size,
          lineHeight: `${size}px`,
          userSelect: "none",
        }}
      >
        {checked ? "check_box" : "check_box_outline_blank"}
      </span>
    </div>
  );
}
