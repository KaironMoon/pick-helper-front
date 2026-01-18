import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

function PageFooter() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        py: 1,
        px: 2,
        backgroundColor: theme.palette.background.footer,
        color: theme.palette.text.secondary,
        textAlign: "center",
      }}
    >
      <Typography variant="caption">
        © {new Date().getFullYear()} Triplenine999
      </Typography>
    </Box>
  );
}

export default PageFooter;
