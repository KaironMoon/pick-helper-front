import { useEffect } from "react";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { useTheme } from "@mui/material/styles";
import { useAtom } from "jotai";
import { currentSetIdAtom, pickSetListAtom } from "../../../store/pick-set-store";
import { getPickSetList } from "../../../services/pick-set-services";

function PageHeader({ isMobile, onMenuToggle }) {
  const theme = useTheme();
  const [currentSetId, setCurrentSetId] = useAtom(currentSetIdAtom);
  const [setList, setSetList] = useAtom(pickSetListAtom);

  useEffect(() => {
    getPickSetList()
      .then((res) => setSetList(res.data))
      .catch(() => {});
  }, []);

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
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexGrow: 1 }}>
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
      {setList.length > 0 && (
        <Select
          value={currentSetId}
          onChange={(e) => {
            localStorage.setItem("pickSetId", JSON.stringify(e.target.value));
            // 세트 변경 시 gamedata 상태 초기화
            localStorage.removeItem("gamedata_last_game");
            window.location.reload();
          }}
          size="small"
          sx={{
            minWidth: isMobile ? 80 : 120,
            color: theme.palette.text.primary,
            fontSize: isMobile ? 12 : 14,
            ".MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(255,255,255,0.3)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(255,255,255,0.5)",
            },
            ".MuiSvgIcon-root": {
              color: theme.palette.text.primary,
            },
          }}
        >
          {setList.map((item) => (
            <MenuItem key={item.set_id} value={item.set_id}>
              {item.set_name}
            </MenuItem>
          ))}
        </Select>
      )}
    </Toolbar>
  );
}

export default PageHeader;
