import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import { useTheme } from "@mui/material/styles";

function PageHeader({ isMobile, onMenuToggle }) {
  const theme = useTheme();

  return (
    <Toolbar
      variant={isMobile ? "dense" : "regular"}
      sx={{
        backgroundColor: theme.palette.background.header,
        minHeight: isMobile ? 48 : 64,
      }}
    >
      {isMobile && (
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={onMenuToggle}
          sx={{ mr: 1, color: theme.palette.text.primary }}
        >
          <MenuIcon />
        </IconButton>
      )}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <img
          src="/logo-small.png"
          alt="Triple Nine Logo"
          style={{ width: isMobile ? 28 : 36, height: 'auto' }}
        />
        {!isMobile && (
          <Typography variant="h6" component="div" sx={{ color: theme.palette.text.primary }}>
            Triplenine999
          </Typography>
        )}
      </Box>
    </Toolbar>
  );
}

export default PageHeader;
