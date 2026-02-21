import { useState, useEffect } from "react";
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button, IconButton, Chip, CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AddIcon from "@mui/icons-material/Add";
import {
  getPicks, generatePicks, generateMatches, approvePick, deletePick,
} from "@/services/random-pick-services";

export default function PickList({ presetSeq, onPickSelect, refreshKey }) {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState({});

  useEffect(() => {
    if (presetSeq) fetchPicks();
    else setPicks([]);
  }, [presetSeq, refreshKey]);

  const fetchPicks = async () => {
    try {
      const res = await getPicks(presetSeq);
      setPicks(res.data);
    } catch (e) {
      console.error("Failed to load picks:", e);
    }
  };

  const onRefresh = () => fetchPicks();

  const handleGeneratePicks = async () => {
    if (!presetSeq) return;
    setLoading((prev) => ({ ...prev, generatePicks: true }));
    try {
      const res = await generatePicks(presetSeq, 10);
      alert(`${res.data.count}개 픽 생성`);
      onRefresh();
    } catch (e) {
      console.error(e);
      alert("픽 생성 실패");
    }
    setLoading((prev) => ({ ...prev, generatePicks: false }));
  };

  const handleGenerateMatches = async (pickSeq) => {
    setLoading((prev) => ({ ...prev, [`match_${pickSeq}`]: true }));
    try {
      const res = await generateMatches(pickSeq, 100);
      alert(`${res.data.created}개 매칭 생성`);
      onRefresh();
    } catch (e) {
      console.error(e);
      alert("매칭 생성 실패");
    }
    setLoading((prev) => ({ ...prev, [`match_${pickSeq}`]: false }));
  };

  const handleApprove = async (pickSeq) => {
    try {
      await approvePick(pickSeq);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (pickSeq) => {
    if (!confirm("이 픽을 퇴출하시겠습니까?")) return;
    try {
      await deletePick(pickSeq);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const getWinRate = (hits, misses) => {
    const total = hits + misses;
    if (total === 0) return "-";
    return `${((hits / total) * 100).toFixed(1)}%`;
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle2" fontWeight="bold">
          픽 목록 ({picks.length}개)
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={loading.generatePicks ? <CircularProgress size={16} /> : <AddIcon />}
          onClick={handleGeneratePicks}
          disabled={!presetSeq || loading.generatePicks}
        >
          픽 생성 (10개)
        </Button>
      </Box>

      <TableContainer sx={{ maxHeight: 400 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold", fontSize: 11 }}>Game</TableCell>
              <TableCell sx={{ fontWeight: "bold", fontSize: 11 }} align="center">매칭수</TableCell>
              <TableCell sx={{ fontWeight: "bold", fontSize: 11 }} align="center">승</TableCell>
              <TableCell sx={{ fontWeight: "bold", fontSize: 11 }} align="center">패</TableCell>
              <TableCell sx={{ fontWeight: "bold", fontSize: 11 }} align="center">승률</TableCell>
              <TableCell sx={{ fontWeight: "bold", fontSize: 11 }} align="center">상태</TableCell>
              <TableCell sx={{ fontWeight: "bold", fontSize: 11 }} align="center">액션</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {picks.map((pick) => (
              <TableRow
                key={pick.pick_seq}
                hover
                selected={false}
                onClick={() => onPickSelect(pick)}
                sx={{ cursor: "pointer" }}
              >
                <TableCell sx={{ fontSize: 11 }}>{pick.game_seq}</TableCell>
                <TableCell sx={{ fontSize: 11 }} align="center">{pick.total_matches}</TableCell>
                <TableCell sx={{ fontSize: 11, color: "#1565c0" }} align="center">{pick.total_hits}</TableCell>
                <TableCell sx={{ fontSize: 11, color: "#f44336" }} align="center">{pick.total_misses}</TableCell>
                <TableCell sx={{ fontSize: 11, fontWeight: "bold" }} align="center">
                  {getWinRate(pick.total_hits, pick.total_misses)}
                </TableCell>
                <TableCell align="center">
                  {pick.is_approved ? (
                    <Chip label="승인" size="small" color="success" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                  ) : (
                    <Chip label="대기" size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                  )}
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                    <IconButton
                      size="small"
                      title="100G 매칭"
                      onClick={(e) => { e.stopPropagation(); handleGenerateMatches(pick.pick_seq); }}
                      disabled={loading[`match_${pick.pick_seq}`]}
                    >
                      {loading[`match_${pick.pick_seq}`] ? <CircularProgress size={16} /> : <PlayArrowIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                    {!pick.is_approved && (
                      <IconButton
                        size="small"
                        title="승인"
                        color="success"
                        onClick={(e) => { e.stopPropagation(); handleApprove(pick.pick_seq); }}
                      >
                        <CheckCircleIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      title="퇴출"
                      color="error"
                      onClick={(e) => { e.stopPropagation(); handleDelete(pick.pick_seq); }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {picks.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3, color: "text.secondary" }}>
                  픽이 없습니다. "픽 생성" 버튼을 눌러주세요.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
