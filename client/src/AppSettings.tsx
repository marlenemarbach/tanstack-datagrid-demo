import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import React from "react";

export const AppSettings = ({ children }: { children: React.ReactNode }) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null,
  );

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (anchorEl !== null) {
      handleClose();
      return;
    }

    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "app-settings-popover" : undefined;

  return (
    <>
      <Button size="small" onClick={handleClick} variant="outlined">
        App Settings
      </Button>
      <Popover
        open={open}
        id={id}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{ paper: { sx: { p: 1.5, minWidth: 240 } } }}
      >
        <Stack spacing={1.5}>
          <Typography variant="subtitle2">App Settings</Typography>
          <Stack>{children}</Stack>
        </Stack>
      </Popover>
    </>
  );
};
