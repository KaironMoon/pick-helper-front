import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useTheme } from "@mui/material/styles";
import { useAtom, useAtomValue } from "jotai";
import { currentSetIdAtom, pickSetListAtom } from "../../../store/pick-set-store";
import { getPickSetList } from "../../../services/pick-set-services";
import { parsePickExcelTsv, serializePickExcelTsv, writePickExcelClipboard } from "../../pick-management/pick-excel";

function PageHeader({ isMobile, onMenuToggle }) {
  const theme = useTheme();
  const currentSetId = useAtomValue(currentSetIdAtom);
  const [setList, setSetList] = useAtom(pickSetListAtom);
  const location = useLocation();
  const isPickManagement = location.pathname === "/pick-management";
  const [excelBusy, setExcelBusy] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const [excelText, setExcelText] = useState("");
  const [excelRows, setExcelRows] = useState([]);
  const [excelResult, setExcelResult] = useState(null);

  useEffect(() => {
    getPickSetList()
      .then((res) => setSetList(res.data))
      .catch(() => {});
  }, []);

  const fetchAllExcelRows = async () => {
    const response = await fetch(`/api/v1/picks2/excel?set_id=${currentSetId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "전체 패턴을 불러오지 못했습니다.");
    return data;
  };

  const handleExcelCopy = async () => {
    if (excelBusy) return;
    setExcelBusy(true);
    try {
      const rows = await fetchAllExcelRows();
      await writePickExcelClipboard(serializePickExcelTsv(rows));
      alert("선택한 세트의 전체 패턴을 복사했습니다. 엑셀 셀을 한 번 선택한 뒤 붙여넣어주세요.");
    } catch (error) {
      alert(error.message || "클립보드 복사에 실패했습니다. 브라우저의 클립보드 권한을 확인해주세요.");
    } finally {
      setExcelBusy(false);
    }
  };

  const openExcelPaste = async () => {
    if (excelBusy) return;
    setExcelBusy(true);
    try {
      const rows = await fetchAllExcelRows();
      setExcelRows(rows);
      setExcelText("");
      setExcelResult(null);
      setExcelOpen(true);
    } catch (error) {
      alert(error.message || "전체 패턴을 불러오지 못했습니다.");
    } finally {
      setExcelBusy(false);
    }
  };

  const validateExcelPaste = () => {
    const result = parsePickExcelTsv(excelText, excelRows);
    setExcelResult(result);
    return result;
  };

  const applyExcelPaste = async () => {
    const result = excelResult || validateExcelPaste();
    if (!result.rows || result.errors.length || excelBusy) return;
    setExcelBusy(true);
    try {
      const response = await fetch(`/api/v1/picks2/excel?set_id=${currentSetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: result.rows }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "엑셀 데이터를 저장하지 못했습니다.");
      alert(`선택한 세트의 전체 ${data.updated}개 패턴을 저장했습니다.`);
      window.location.reload();
    } catch (error) {
      alert(error.message || "엑셀 데이터를 저장하지 못했습니다.");
      setExcelBusy(false);
    }
  };

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
        <Box sx={{ display: "flex", alignItems: "center", gap: isMobile ? 0.5 : 1 }}>
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
          {isPickManagement && (
            <>
              <Box onClick={excelBusy ? undefined : handleExcelCopy} sx={{ border: "1px solid #2e7d32", borderRadius: 1, px: isMobile ? 0.75 : 1.25, py: 0.5, cursor: excelBusy ? "default" : "pointer", backgroundColor: "rgba(46,125,50,0.16)", opacity: excelBusy ? 0.5 : 1, whiteSpace: "nowrap", "&:hover": excelBusy ? {} : { backgroundColor: "rgba(46,125,50,0.3)" } }}>
                <Typography sx={{ fontSize: isMobile ? 9 : 12 }}>엑셀로 복사</Typography>
              </Box>
              <Box onClick={excelBusy ? undefined : openExcelPaste} sx={{ border: "1px solid #1565c0", borderRadius: 1, px: isMobile ? 0.75 : 1.25, py: 0.5, cursor: excelBusy ? "default" : "pointer", backgroundColor: "rgba(21,101,192,0.16)", opacity: excelBusy ? 0.5 : 1, whiteSpace: "nowrap", "&:hover": excelBusy ? {} : { backgroundColor: "rgba(21,101,192,0.3)" } }}>
                <Typography sx={{ fontSize: isMobile ? 9 : 12 }}>엑셀에서 붙여넣기</Typography>
              </Box>
            </>
          )}
        </Box>
      )}
      <Dialog open={excelOpen} onClose={() => !excelBusy && setExcelOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>선택한 세트 전체 패턴 붙여넣기</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
            ‘엑셀로 복사’로 만든 표를 엑셀에서 수정한 뒤 머리글부터 마지막 행까지 붙여넣어주세요.
          </Typography>
          <TextField autoFocus fullWidth multiline minRows={9} maxRows={14}
            placeholder="엑셀 표의 머리글부터 전체 4,080개 행을 여기에 붙여넣기"
            value={excelText}
            onChange={(event) => { setExcelText(event.target.value); setExcelResult(null); }}
            sx={{ "& .MuiInputBase-root": { fontFamily: "D2Coding, Consolas, Menlo, monospace", fontSize: 12 } }}
          />
          {excelResult && excelResult.errors.length === 0 && (
            <Alert severity="success" sx={{ mt: 2 }}>전체 {excelResult.rowCount}개 패턴을 확인했습니다.</Alert>
          )}
          {excelResult?.errors?.length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: "bold", mb: 0.5 }}>{excelResult.errors.length}개 오류가 있어 저장할 수 없습니다.</Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5, maxHeight: 220, overflowY: "auto" }}>
                {excelResult.errors.slice(0, 100).map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}
              </Box>
              {excelResult.errors.length > 100 && <Typography variant="caption">나머지 {excelResult.errors.length - 100}개 오류는 먼저 표시된 오류를 수정한 뒤 다시 검사해주세요.</Typography>}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExcelOpen(false)} disabled={excelBusy}>취소</Button>
          <Button onClick={validateExcelPaste} variant="outlined" disabled={!excelText.trim() || excelBusy}>검사</Button>
          <Button onClick={applyExcelPaste} variant="contained" disabled={!excelResult?.rows || excelResult.errors.length > 0 || excelBusy}>{excelBusy ? "저장 중..." : "전체 저장"}</Button>
        </DialogActions>
      </Dialog>
    </Toolbar>
  );
}

export default PageHeader;
