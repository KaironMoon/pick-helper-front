import { useState, useEffect } from "react";
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Chip,
} from "@mui/material";
import { getPickDetail } from "@/services/random-pick-services";

const GRID_ROWS = 6;
const GRID_COLS = 42;

const Circle = ({ type, size = 20 }) => {
  const colors = { P: "#1565c0", B: "#f44336" };
  return (
    <Box
      sx={{
        width: size, height: size, borderRadius: "50%",
        backgroundColor: colors[type], border: "2px solid", borderColor: colors[type],
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.45, fontWeight: "bold", color: "#fff",
      }}
    >
      {type}
    </Box>
  );
};

const calculateCircleGrid = (shoes) => {
  const grid = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
  if (!shoes || shoes.length === 0) return grid;

  const picks = shoes.split("").filter((c) => c === "P" || c === "B");
  let col = 0, row = 0, prevValue = null, verticalStartCol = 0, isBent = false;

  for (let i = 0; i < picks.length; i++) {
    const current = picks[i];
    if (prevValue === null) {
      grid[row][col] = { type: current };
      verticalStartCol = col;
    } else if (current === prevValue) {
      if (isBent) col++;
      else if (row >= GRID_ROWS - 1) { col++; isBent = true; }
      else if (grid[row + 1][col]) { col++; isBent = true; }
      else row++;
      if (col >= GRID_COLS) break;
      grid[row][col] = { type: current };
    } else {
      verticalStartCol++;
      col = verticalStartCol;
      row = 0;
      isBent = false;
      if (col >= GRID_COLS) break;
      grid[row][col] = { type: current };
    }
    prevValue = current;
  }
  return grid;
};

const BigRoadGrid = ({ shoes, label }) => {
  const grid = calculateCircleGrid(shoes);
  const maxCol = grid.reduce((max, row) => {
    const lastIdx = row.reduce((li, cell, idx) => (cell ? idx : li), -1);
    return Math.max(max, lastIdx);
  }, -1);
  const displayCols = Math.min(maxCol + 2, GRID_COLS);

  return (
    <Box sx={{ mb: 0.5 }}>
      {label && (
        <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "text.secondary" }}>
          {label}
        </Typography>
      )}
      <Box sx={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        {grid.map((row, ri) => (
          <Box key={ri} sx={{ display: "flex", gap: "1px" }}>
            {row.slice(0, displayCols).map((cell, ci) => (
              <Box key={ci} sx={{ width: 20, height: 20, flexShrink: 0 }}>
                {cell && <Circle type={cell.type} size={18} />}
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default function PickDetail({ pickSeq }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pickSeq) loadDetail();
  }, [pickSeq]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await getPickDetail(pickSeq);
      setDetail(res.data);
    } catch (e) {
      console.error("Failed to load pick detail:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!pickSeq) {
    return (
      <Paper sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="caption" color="text.secondary">
          픽을 선택하세요
        </Typography>
      </Paper>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (!detail) return null;

  const { pick, matches } = detail;

  return (
    <Paper sx={{ p: 1 }}>
      {/* 픽 게임 빅로드 */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: "bold" }}>
          픽 게임 #{pick.game_seq}
        </Typography>
        {pick.is_approved && (
          <Chip label="승인" size="small" color="success" sx={{ height: 18, fontSize: "0.6rem" }} />
        )}
        <Typography variant="caption" color="text.secondary">
          승률: {pick.win_rate}% ({pick.total_hits}승 {pick.total_misses}패 / {pick.total_matches}매칭)
        </Typography>
      </Box>
      <BigRoadGrid shoes={pick.shoes} />

      {/* 매칭 결과 테이블 */}
      <Typography variant="caption" sx={{ fontWeight: "bold", mt: 1, display: "block" }}>
        매칭 결과 ({matches.length}건)
      </Typography>
      <TableContainer sx={{ maxHeight: 250 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: "0.65rem", py: 0.3, fontWeight: "bold" }}>매칭 Game</TableCell>
              <TableCell sx={{ fontSize: "0.65rem", py: 0.3, fontWeight: "bold" }} align="center">비교</TableCell>
              <TableCell sx={{ fontSize: "0.65rem", py: 0.3, fontWeight: "bold" }} align="center">승</TableCell>
              <TableCell sx={{ fontSize: "0.65rem", py: 0.3, fontWeight: "bold" }} align="center">패</TableCell>
              <TableCell sx={{ fontSize: "0.65rem", py: 0.3, fontWeight: "bold" }} align="center">승률</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {matches.map((m) => {
              const wr = m.hits + m.misses > 0
                ? ((m.hits / (m.hits + m.misses)) * 100).toFixed(1)
                : "-";
              return (
                <TableRow key={m.match_seq} hover>
                  <TableCell sx={{ fontSize: "0.65rem", py: 0.2 }}>
                    #{m.matched_game_seq}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.65rem", py: 0.2 }} align="center">
                    {m.turns_compared}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.65rem", py: 0.2, color: "#1565c0" }} align="center">
                    {m.hits}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.65rem", py: 0.2, color: "#f44336" }} align="center">
                    {m.misses}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.65rem", py: 0.2, fontWeight: "bold" }} align="center">
                    {wr}%
                  </TableCell>
                </TableRow>
              );
            })}
            {matches.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ fontSize: "0.65rem", py: 1.5 }}>
                  매칭 결과가 없습니다. 100G 매칭을 실행하세요.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
