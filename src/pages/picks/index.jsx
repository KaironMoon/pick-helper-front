import { useState, useEffect, useCallback } from "react";
import { Box, TextField, IconButton, Button, Typography } from "@mui/material";
import { ArrowBack, ArrowForward } from "@mui/icons-material";
import { getPickBySeq, getPickByPattern, setPick, deleteNextPick, deletePattern, addPattern } from "@/services/picks-services";

const ROWS = 6;
const COLS = 20;

const Circle = ({ type, filled = true, onClick }) => {
  const colors = {
    P: "#1565c0",
    B: "#f44336",
  };

  return (
    <Box
      onClick={onClick}
      sx={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        backgroundColor: filled ? colors[type] : "#fff",
        border: `3px solid ${colors[type]}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: "bold",
        color: filled ? "#fff" : colors[type],
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {type}
    </Box>
  );
};

const calculateGrid = (picks, nextPick) => {
  const grid = Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill(null));

  if (!picks || picks.length === 0) return grid;

  let col = 0;
  let row = 0;
  let prevValue = null;
  let verticalStartCol = 0;

  for (let i = 0; i < picks.length; i++) {
    const current = picks[i];

    if (prevValue === null) {
      grid[row][col] = { type: current, filled: true, pickIndex: i };
      verticalStartCol = col;
    } else if (current === prevValue) {
      if (row >= ROWS - 1) {
        col++;
      } else {
        row++;
      }
      if (col >= COLS) break;
      grid[row][col] = { type: current, filled: true, pickIndex: i };
    } else {
      verticalStartCol++;
      col = verticalStartCol;
      row = 0;
      if (col >= COLS) break;
      grid[row][col] = { type: current, filled: true, pickIndex: i };
    }

    prevValue = current;
  }

  if (nextPick && col < COLS) {
    if (nextPick === prevValue) {
      if (row >= ROWS - 1) {
        col++;
      } else {
        row++;
      }
      if (col < COLS) {
        grid[row][col] = { type: nextPick, filled: false, pickIndex: picks.length };
      }
    } else {
      verticalStartCol++;
      if (verticalStartCol < COLS) {
        grid[0][verticalStartCol] = { type: nextPick, filled: false, pickIndex: picks.length };
      }
    }
  }

  return grid;
};

export default function PicksPage() {
  const [seq, setSeq] = useState(1);
  const [inputSeq, setInputSeq] = useState("1");
  const [picks, setPicks] = useState([]);
  const [nextPick, setNextPick] = useState(null);
  const [matchedSeq, setMatchedSeq] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPick = useCallback(async (targetSeq, direction = null) => {
    setLoading(true);
    try {
      const response = await getPickBySeq(targetSeq, false, direction);
      const data = response.data;
      setSeq(data.seq);
      setInputSeq(String(data.seq));
      setPicks(data.prev_picks?.split("") || []);
      setNextPick(data.next_pick);
      setMatchedSeq(data.seq);
    } catch (error) {
      console.error("Failed to fetch pick:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchPattern = useCallback(async (pattern) => {
    if (!pattern) {
      setMatchedSeq(null);
      return;
    }
    try {
      const response = await getPickByPattern(pattern);
      setMatchedSeq(response.data.seq);
      setNextPick(response.data.next_pick);
      setSeq(response.data.seq);
      setInputSeq(String(response.data.seq));
    } catch (error) {
      setMatchedSeq(null);
      setNextPick(null);
    }
  }, []);

  useEffect(() => {
    fetchPick(1);
  }, [fetchPick]);

  useEffect(() => {
    const filledPicks = picks.filter(p => p);
    if (filledPicks.length > 0) {
      const pattern = filledPicks.join("");
      searchPattern(pattern);
    } else {
      setMatchedSeq(null);
    }
  }, [picks, searchPattern]);

  const handleSeqSubmit = (e) => {
    e.preventDefault();
    const newSeq = parseInt(inputSeq, 10);
    if (!isNaN(newSeq) && newSeq > 0) {
      fetchPick(newSeq);
    }
  };

  const handlePrev = () => {
    if (seq > 1) {
      fetchPick(seq, "prev");
    }
  };

  const handleNext = () => {
    fetchPick(seq, "next");
  };

  const handlePickToggle = (index) => {
    const newPicks = [...picks];
    // 11개 슬롯 보장
    while (newPicks.length < 11) {
      newPicks.push(null);
    }
    // 토글: null → B → P → null
    const current = newPicks[index];
    if (current === null) {
      newPicks[index] = "B";
    } else if (current === "B") {
      newPicks[index] = "P";
    } else {
      newPicks[index] = null;
    }
    setPicks(newPicks);
  };

  const handleSetPick = async (pick) => {
    const filledPicks = picks.filter(p => p);
    if (filledPicks.length === 0) return;
    const pattern = filledPicks.join("");
    try {
      const response = await setPick(pattern, pick);
      setNextPick(response.data.next_pick);
      setMatchedSeq(response.data.seq);
    } catch (error) {
      console.error("Failed to set pick:", error);
    }
  };

  const handleDeleteNextPick = async () => {
    const filledPicks = picks.filter(p => p);
    if (filledPicks.length === 0) return;
    const pattern = filledPicks.join("");
    try {
      const response = await deleteNextPick(pattern);
      setNextPick(response.data.next_pick);
      setMatchedSeq(response.data.seq);
    } catch (error) {
      console.error("Failed to delete next pick:", error);
    }
  };

  const handleDeletePattern = async () => {
    const filledPicks = picks.filter(p => p);
    if (filledPicks.length === 0) return;
    const pattern = filledPicks.join("");
    const currentSeq = seq;
    try {
      await deletePattern(pattern);
      fetchPick(currentSeq, "prev");
    } catch (error) {
      console.error("Failed to delete pattern:", error);
    }
  };

  const hasGapInMiddle = () => {
    let foundNull = false;
    for (const p of picks) {
      if (p === null) {
        foundNull = true;
      } else if (foundNull) {
        return true;
      }
    }
    return false;
  };

  const handleAddPattern = async () => {
    const filledPicks = picks.filter(p => p);
    if (filledPicks.length === 0 || hasGapInMiddle()) return;
    const pattern = filledPicks.join("");
    try {
      const response = await addPattern(pattern, nextPick);
      setMatchedSeq(response.data.seq);
      setNextPick(response.data.next_pick);
      setSeq(response.data.seq);
      setInputSeq(String(response.data.seq));
    } catch (error) {
      console.error("Failed to add pattern:", error);
    }
  };

  const filledPicks = picks.filter(p => p);
  const grid = calculateGrid(filledPicks, nextPick);

  return (
    <Box sx={{ p: 3 }}>
      <Box
        component="form"
        onSubmit={handleSeqSubmit}
        sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
      >
        <IconButton onClick={handlePrev} disabled={loading || seq <= 1}>
          <ArrowBack />
        </IconButton>
        <TextField
          value={inputSeq}
          onChange={(e) => setInputSeq(e.target.value)}
          size="small"
          sx={{ width: 100 }}
          slotProps={{ input: { style: { textAlign: "center" } } }}
        />
        <IconButton onClick={handleNext} disabled={loading}>
          <ArrowForward />
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 2 }}>
        {Array.from({ length: 11 }).map((_, index) => {
          const pick = picks[index];
          return (
            <Box
              key={index}
              onClick={() => handlePickToggle(index)}
              sx={{ cursor: "pointer" }}
            >
              {pick ? (
                <Circle type={pick} filled={true} />
              ) : (
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.5)",
                    backgroundColor: "transparent",
                  }}
                />
              )}
            </Box>
          );
        })}
        <Typography variant="body2" sx={{ ml: 2, color: "text.secondary" }}>
          ({filledPicks.length})
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={handleDeletePattern}
          disabled={filledPicks.length === 0 || !matchedSeq}
          sx={{
            ml: 2,
            borderColor: "#f44336",
            color: "#f44336",
            "&:hover": { borderColor: "#d32f2f", backgroundColor: "rgba(244,67,54,0.1)" },
          }}
        >
          패턴 제거
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 28px)`,
          gridTemplateRows: `repeat(${ROWS}, 28px)`,
          gap: "1px",
          mb: 3,
          p: 0,
          backgroundColor: "#fff",
          border: "1px solid #fff",
          width: "fit-content",
          "& > div": {
            backgroundColor: "background.default",
          },
        }}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <Box
              key={`${rowIndex}-${colIndex}`}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {cell && <Circle type={cell.type} filled={cell.filled} />}
            </Box>
          ))
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        <Button
          variant="contained"
          onClick={() => handleSetPick("P")}
          disabled={filledPicks.length === 0 || !matchedSeq}
          sx={{
            backgroundColor: "#1565c0",
            "&:hover": { backgroundColor: "#0d47a1" },
            color: "#fff",
            minWidth: 80,
            fontWeight: "bold",
          }}
        >
          P
        </Button>
        <Button
          variant="contained"
          onClick={() => handleSetPick("B")}
          disabled={filledPicks.length === 0 || !matchedSeq}
          sx={{
            backgroundColor: "#f44336",
            "&:hover": { backgroundColor: "#d32f2f" },
            color: "#fff",
            minWidth: 80,
            fontWeight: "bold",
          }}
        >
          B
        </Button>
        <Button
          variant="outlined"
          onClick={handleDeleteNextPick}
          disabled={filledPicks.length === 0 || !matchedSeq || !nextPick}
          sx={{
            borderColor: "#9e9e9e",
            color: "#9e9e9e",
            "&:hover": { borderColor: "#757575", color: "#757575" },
            minWidth: 80,
          }}
        >
          예측 삭제
        </Button>
        <Box
          onClick={!matchedSeq && filledPicks.length > 0 && !hasGapInMiddle() ? handleAddPattern : undefined}
          sx={{
            ml: 2,
            px: 2,
            py: 1,
            border: "2px solid",
            borderColor: matchedSeq ? "#4caf50" : "#ff9800",
            borderRadius: 1,
            minWidth: 80,
            textAlign: "center",
            fontWeight: "bold",
            color: matchedSeq ? "#4caf50" : "#ff9800",
            cursor: !matchedSeq && filledPicks.length > 0 && !hasGapInMiddle() ? "pointer" : "default",
            "&:hover": !matchedSeq && filledPicks.length > 0 && !hasGapInMiddle() ? {
              backgroundColor: "rgba(255, 152, 0, 0.1)",
            } : {},
          }}
        >
          {filledPicks.length > 0 ? (matchedSeq ? matchedSeq : (hasGapInMiddle() ? "중간공백" : "추가")) : "-"}
        </Box>
      </Box>

      <Typography variant="body2" sx={{ mt: 4, color: "text.secondary", whiteSpace: "pre-line" }}>
        1. 현재 BBBBBBBBBBB ~ PPPPPPPPPPP 패턴이 입력되어있습니다.<br/>
        2. 상단의 좌우 버튼을 누르면 한칸씩 이동합니다. 원하시는 픽을 넣은 후에 하단의 P 또는 B 버튼을 누르면 패턴이 추가됩니다.<br/>
        3. 잘못 넣으신 경우 예측 삭제를 누르면 에측 픽이 삭제됩니다.<br/>
        4. 특정 패턴을 넣고 싶으면 표 상단의 픽을 클릭하면 빈칸-&gt;B-&gt;P-&gt;빈칸 순으로 토글됩니다.<br/>
      </Typography>
    </Box>
  );
}
