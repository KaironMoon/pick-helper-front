import { useEffect, useState, useMemo } from "react";
import { RouterProvider } from "react-router-dom";
import { CssBaseline } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";

import router from "@/routers";
import { PALETTE_MODE } from "@/codes/theme-codes";
import { darkTheme, lightTheme } from "@/styles/theme";
import usePaletteMode from "@/hooks/ThemeHook";

function App() {
  const { paletteMode, changePaletteMode } = usePaletteMode();
  const [bgColor, setBgColor] = useState(null);

  useEffect(() => {
    setTimeout(() => {
      changePaletteMode(PALETTE_MODE.dark);
    }, 1000);
  });

  // UI 설정 불러오기
  useEffect(() => {
    fetch("/api/v1/config/ui")
      .then((res) => res.json())
      .then((data) => {
        if (data.bg_color) {
          setBgColor(data.bg_color);
        }
      })
      .catch(() => {});
  }, []);

  // 배경색이 설정되면 테마 수정
  const theme = useMemo(() => {
    const baseTheme = paletteMode === PALETTE_MODE.dark ? darkTheme : lightTheme;
    if (!bgColor) return baseTheme;

    return createTheme({
      ...baseTheme,
      palette: {
        ...baseTheme.palette,
        background: {
          ...baseTheme.palette.background,
          default: bgColor,
        },
      },
    });
  }, [paletteMode, bgColor]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
