/** Native tri-state checkbox, cheap enough to render in every row. */
export function Checkbox(props: { checked: boolean; indeterminate?: boolean; label: string; onToggle: (checked: boolean) => void }) {
  return (
    <input
      type="checkbox"
      className="tg-checkbox"
      aria-label={props.label}
      ref={(el) => {
        if (el) el.indeterminate = !!props.indeterminate
      }}
      checked={props.checked}
      onChange={(e) => props.onToggle(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
    />
  )
}
