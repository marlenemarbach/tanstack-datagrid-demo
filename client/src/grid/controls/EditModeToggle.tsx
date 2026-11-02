import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";

type EditModeToggleProps = {
  value: boolean;
  onChange: (editMode: boolean) => void;
};

/** Switch that turns the grid's edit mode on and off. */
export function EditModeToggle({ value, onChange }: EditModeToggleProps) {
  return (
    <FormControlLabel
      control={
        <Switch checked={value} onChange={(e) => onChange(e.target.checked)} />
      }
      label="Edit mode"
    />
  );
}
