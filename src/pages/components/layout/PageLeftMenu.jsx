import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider } from "@mui/material";
import { useTheme } from "@mui/material/styles";

// 아이콘 import
import InfoIcon from "@mui/icons-material/Info";
import HomeIcon from "@mui/icons-material/Home";
import CasinoIcon from "@mui/icons-material/Casino";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import ViewListIcon from "@mui/icons-material/ViewList";

import { useNavigate } from "react-router-dom";

function PageLeftMenu() {
  const theme = useTheme();
  const navigate = useNavigate();
  const debugMode = true;

  const handleNavClick = (path) => {
    navigate(path);
    if (isMobile && closeMobileMenu) {
      closeMobileMenu();
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
        },
        "& .MuiListItemText-primary": {
          color: "text.primary",
        },
        "& .MuiListItemButton-root": {
          "&:hover": {
            backgroundColor: "military.hover",
          },
        },
      }}
    >
      <List>
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
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleNavClick("/pick-management")}>
                <ListItemIcon>
                  <ViewListIcon />
                </ListItemIcon>
                <ListItemText primary="pick management" />
              </ListItemButton>
            </ListItem>
          </List>
        </div>
      )}
    </Box>
  );
}

export default PageLeftMenu;
