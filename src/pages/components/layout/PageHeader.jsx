import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";

function PageHeader() {
  const theme = useTheme();

  return (
    <Toolbar sx={{ backgroundColor: theme.palette.background.header }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <img src="/logo-small.png" alt="999 Logo" style={{ width: 36, height: 36 }} />
        <Typography variant="h6" component="div" sx={{ color: theme.palette.text.primary }}>
          Triplenine999
        </Typography>
      </Box>
    </Toolbar>
  );
}

export default PageHeader;
