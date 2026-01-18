import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import InfoIcon from "@mui/icons-material/Info";
import HomeIcon from "@mui/icons-material/Home";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import ViewListIcon from "@mui/icons-material/ViewList";

import { useNavigate } from "react-router-dom";

function PageLeftMenu({ isMobile, onMenuClose }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const debugMode = true;

  const handleNavClick = (path) => {
    navigate(path);
    if (isMobile && onMenuClose) {
      onMenuClose();
    }
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: theme.palette.background.leftMenu,
        "& .MuiListItemIcon-root": {
          color: "military.text",
          minWidth: 40,
        },
        "& .MuiListItemText-primary": {
          color: "text.primary",
          fontSize: isMobile ? "0.9rem" : "1rem",
        },
        "& .MuiListItemButton-root": {
          py: isMobile ? 1 : 1.5,
          "&:hover": {
            backgroundColor: "military.hover",
          },
        },
      }}
    >
      <List disablePadding>
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavClick("/")}>
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary="Home" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavClick("/game-t1")}>
            <ListItemIcon>
              <SportsEsportsIcon />
            </ListItemIcon>
            <ListItemText primary="Game T1" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNavClick("/info")}>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText primary="Info" />
          </ListItemButton>
        </ListItem>
      </List>
      {debugMode && (
        <div style={{ flex: 1 }}>
          <Divider
            sx={{
              bgcolor: "military.border",
              my: 1,
            }}
          />
          <List disablePadding>
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleNavClick("/pick-management")}>
                <ListItemIcon>
                  <ViewListIcon />
                </ListItemIcon>
                <ListItemText primary="Pick Mgmt" />
              </ListItemButton>
            </ListItem>
          </List>
        </div>
      )}
    </Box>
  );
}

export default PageLeftMenu;
