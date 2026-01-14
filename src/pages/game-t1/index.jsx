import { useState, useCallback } from "react";
import { Box, Typography, Paper } from "@mui/material";
import { saveGame } from "@/services/game-services";
import { getPickByPattern } from "@/services/picks-services";

const GRID_ROWS = 6;
const GRID_COLS = 32;

// 원 컴포넌트
const Circle = ({ type, filled = true }) => {
  const colors = {
    P: "#1565c0",
    B: "#f44336",
  };

  return (
    <Box
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
      }}
    >
      {type}
    </Box>
  );
};

// 원 패턴 그리드 계산 (picks 페이지와 동일한 로직)
const calculateCircleGrid = (results, nextPick) => {
  const grid = Array(GRID_ROWS)
    .fill(null)
    .map(() => Array(GRID_COLS).fill(null));

  const picks = results.map(r => r.value);
  if (!picks || picks.length === 0) return grid;

  let col = 0;
  let row = 0;
  let prevValue = null;
  let verticalStartCol = 0;

  for (let i = 0; i < picks.length; i++) {
    const current = picks[i];

    if (prevValue === null) {
      grid[row][col] = { type: current, filled: true };
      verticalStartCol = col;
    } else if (current === prevValue) {
      if (row >= GRID_ROWS - 1) {
        // 맨 아래 행이면 수평 이동
        col++;
      } else if (grid[row + 1][col]) {
        // 다음 행이 이미 차있으면 수평 이동
        col++;
      } else {
        // 다음 행이 비어있으면 아래로
        row++;
      }
      if (col >= GRID_COLS) break;
      grid[row][col] = { type: current, filled: true };
    } else {
      verticalStartCol++;
      col = verticalStartCol;
      row = 0;
      if (col >= GRID_COLS) break;
      grid[row][col] = { type: current, filled: true };
    }

    prevValue = current;
  }

  // 다음 픽 표시 (빈 원)
  if (nextPick && col < GRID_COLS) {
    if (nextPick === prevValue) {
      if (row >= GRID_ROWS - 1) {
        col++;
      } else {
        row++;
      }
      if (col < GRID_COLS) {
        grid[row][col] = { type: nextPick, filled: false };
      }
    } else {
      verticalStartCol++;
      if (verticalStartCol < GRID_COLS) {
        grid[0][verticalStartCol] = { type: nextPick, filled: false };
      }
    }
  }

  return grid;
};

export default function GameT1Page() {
  const [results, setResults] = useState([]);
  const [selectedInput, setSelectedInput] = useState(null); // "P" or "B"
  const [currentPick, setCurrentPick] = useState(null); // 시스템이 제공한 픽
  const [currentPicksSeq, setCurrentPicksSeq] = useState(null); // 매칭된 picks_seq

  const currentTurn = results.length + 1;

  // 패턴으로 픽 조회
  const fetchPick = useCallback(async (pattern) => {
    if (!pattern) {
      setCurrentPick(null);
      setCurrentPicksSeq(null);
      return;
    }
    try {
      const response = await getPickByPattern(pattern);
      if (response.data.next_pick) {
        setCurrentPick(response.data.next_pick);
        setCurrentPicksSeq(response.data.seq);
      } else {
        setCurrentPick(null);
        setCurrentPicksSeq(null);
      }
    } catch {
      // 패턴 없음
      setCurrentPick(null);
      setCurrentPicksSeq(null);
    }
  }, []);

  const handleInputSelect = (value) => {
    setSelectedInput(value);
  };

  const handleEnter = () => {
    if (!selectedInput) return;

    // prev_picks 계산 (현재 결과들에서 마지막 11개)
    const allValues = results.map(r => r.value);
    const prevPicks = allValues.length >= 11
      ? allValues.slice(-11).join("")
      : allValues.length > 0 ? allValues.join("") : null;

    const newResult = {
      value: selectedInput,
      result: selectedInput,
      isCorrect: currentPick ? currentPick === selectedInput : null,
      predict: currentPick,
      picks_seq: currentPicksSeq,
      prev_picks: prevPicks,
    };

    const newResults = [...results, newResult];
    setResults(newResults);
    setSelectedInput(null);

    // 새로운 패턴으로 다음 픽 조회
    const newAllValues = newResults.map(r => r.value);
    if (newAllValues.length >= 1) {
      const newPattern = newAllValues.length >= 11
        ? newAllValues.slice(-11).join("")
        : newAllValues.join("");
      fetchPick(newPattern);
    }
  };

  const handleDeleteOne = () => {
    if (results.length > 0) {
      const newResults = results.slice(0, -1);
      setResults(newResults);

      // 픽 재계산
      if (newResults.length >= 1) {
        const allValues = newResults.map(r => r.value);
        const pattern = allValues.length >= 11
          ? allValues.slice(-11).join("")
          : allValues.join("");
        fetchPick(pattern);
      } else {
        setCurrentPick(null);
        setCurrentPicksSeq(null);
      }
    }
  };

  const handleDeleteWhole = () => {
    setResults([]);
    setCurrentPick(null);
    setCurrentPicksSeq(null);
    setSelectedInput(null);
  };

  const grid = calculateCircleGrid(results, null); // 예측 픽은 상단 격자에 표시 안함

  const handleSaveData = async () => {
    // turns 배열 생성
    const turns = results.map((r, idx) => ({
      turn_no: idx + 1,
      result: r.result,
      predict: r.predict || null,
      picks_seq: r.picks_seq || null,
      prev_picks: r.prev_picks || null,
    }));

    try {
      const response = await saveGame(null, turns);
      alert(`게임 저장 완료! (game_seq: ${response.data.game_seq}, ${response.data.turns_count}턴)`);
      handleDeleteWhole();
    } catch (error) {
      console.error("Failed to save game:", error);
      alert("저장 실패");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Save Data 버튼 */}
      <Box sx={{ mb: 2 }}>
        <Box
          onClick={results.length > 0 ? handleSaveData : undefined}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 1,
            px: 2,
            py: 1,
            backgroundColor: "background.paper",
            cursor: results.length > 0 ? "pointer" : "default",
            opacity: results.length > 0 ? 1 : 0.5,
            "&:hover": results.length > 0 ? {
              backgroundColor: "rgba(255,255,255,0.1)",
            } : {},
          }}
        >
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Save Data
          </Typography>
        </Box>
      </Box>

      {/* 상단 - 원 패턴 그리드 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_COLS}, 28px)`,
          gridTemplateRows: `repeat(${GRID_ROWS}, 28px)`,
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

      {/* 하단 - 입력 영역 */}
      <Box sx={{ display: "flex", gap: 3, width: 928 }}>
        {/* 픽 표시 영역 */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {/* pick 라벨 */}
          <Box
            sx={{
              border: "1px solid rgba(255,255,255,0.3)",
              backgroundColor: "background.paper",
              px: 2,
              py: 0.5,
              textAlign: "center",
            }}
          >
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              pick
            </Typography>
          </Box>

          {/* 1, 3, 6 버튼 */}
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {[1, 3, 6].map((n) => (
              <Box
                key={n}
                sx={{
                  width: 32,
                  height: 32,
                  border: "1px solid rgba(255,255,255,0.3)",
                  backgroundColor: n === 1 ? "rgba(255,255,255,0.2)" : "background.paper",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  cursor: "pointer",
                  color: "text.primary",
                }}
              >
                {n}
              </Box>
            ))}
          </Box>

          {/* turn 표시 */}
          <Box
            sx={{
              border: "1px solid rgba(255,255,255,0.3)",
              backgroundColor: "background.paper",
              px: 2,
              py: 0.5,
              textAlign: "center",
            }}
          >
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              turn.{currentTurn}
            </Typography>
          </Box>

          {/* 예측 픽 표시 영역 */}
          <Box
            sx={{
              width: 100,
              height: 80,
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 2,
              backgroundColor: "background.paper",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {currentPick && (
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  borderRadius: 2,
                  backgroundColor: currentPick === "P" ? "#1565c0" : "#f44336",
                  border: `3px solid ${currentPick === "P" ? "#1565c0" : "#f44336"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 24,
                  fontWeight: "bold",
                }}
              >
                {currentPick}
              </Box>
            )}
          </Box>
        </Box>

        {/* 숫자 격자 - 진행된 턴까지만 표시 (세로 6개 → 가로 이동) */}
        <Paper sx={{ p: 2, backgroundColor: "background.paper", flexGrow: 1 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateRows: "repeat(6, 32px)",
              gridAutoFlow: "column",
              gridAutoColumns: "32px",
              gap: "2px",
              minHeight: 200,
            }}
          >
            {results.map((result, idx) => {
              const turn = idx + 1;
              const borderColor = result.value === "P" ? "#1565c0" : "#f44336";
              let backgroundColor = "#9e9e9e"; // 회색 (1-4회)

              if (turn > 4) {
                if (result.isCorrect === true) {
                  backgroundColor = "#00ff00"; // 밝은 형광 녹색 (적중)
                } else if (result.isCorrect === false) {
                  backgroundColor = "#fff59d"; // 노란색 (미적중)
                }
              }

              return (
                <Box
                  key={idx}
                  sx={{
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 800,
                    border: `3px solid ${borderColor}`,
                    borderRadius: 1,
                    backgroundColor,
                    color: "#000",
                  }}
                >
                  {turn}
                </Box>
              );
            })}
            {/* 현재 턴 (결과 미입력 상태) */}
            {currentPick && (
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 800,
                  border: `3px solid ${currentPick === "P" ? "#1565c0" : "#f44336"}`,
                  borderRadius: 1,
                  backgroundColor: "#fff",
                  color: "#000",
                }}
              >
                {currentTurn}
              </Box>
            )}
          </Box>

          {/* 통계 */}
          {results.length > 0 && (
            <Box sx={{ mt: 2, display: "flex", gap: 2, fontSize: 12 }}>
              <Typography variant="caption">Total: {results.length}</Typography>
              {results.length > 4 && (
                <>
                  <Typography variant="caption" sx={{ color: "#00ff00" }}>
                    Hit: {results.filter((r, i) => i >= 4 && r.isCorrect).length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#fff59d" }}>
                    Miss: {results.filter((r, i) => i >= 4 && r.isCorrect === false).length}
                  </Typography>
                </>
              )}
            </Box>
          )}
        </Paper>

        {/* 입력 패널 */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 1,
            p: 1.5,
            backgroundColor: "background.paper",
          }}
        >
          {/* input result 라벨 */}
          <Box
            sx={{
              border: "1px solid rgba(255,255,255,0.3)",
              backgroundColor: "background.paper",
              px: 2,
              py: 0.5,
              textAlign: "center",
            }}
          >
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              input result
            </Typography>
          </Box>

          {/* P/B 선택 버튼 + 가운데 숫자 */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* P 버튼 - 사각형 */}
            <Box
              onClick={() => handleInputSelect("P")}
              sx={{
                width: 70,
                height: 70,
                borderRadius: 2,
                border: selectedInput === "P" ? "3px solid #1565c0" : "3px solid #9e9e9e",
                backgroundColor: selectedInput === "P" ? "#1565c0" : "#e0e0e0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: selectedInput === "P" ? "#fff" : "#9e9e9e",
                fontSize: 28,
                fontWeight: "bold",
                cursor: "pointer",
                "&:hover": {
                  border: "3px solid #1565c0",
                },
              }}
            >
              P
            </Box>

            {/* 가운데 숫자 - 사각형 */}
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                border: "1px solid rgba(255,255,255,0.3)",
                backgroundColor: "background.paper",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                color: "text.secondary",
              }}
            >
              {currentTurn}
            </Box>

            {/* B 버튼 - 사각형 */}
            <Box
              onClick={() => handleInputSelect("B")}
              sx={{
                width: 70,
                height: 70,
                borderRadius: 2,
                border: selectedInput === "B" ? "3px solid #f44336" : "3px solid #9e9e9e",
                backgroundColor: selectedInput === "B" ? "#f44336" : "#e0e0e0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: selectedInput === "B" ? "#fff" : "#9e9e9e",
                fontSize: 28,
                fontWeight: "bold",
                cursor: "pointer",
                "&:hover": {
                  border: "3px solid #f44336",
                },
              }}
            >
              B
            </Box>
          </Box>

          {/* Enter 버튼 - 타원형 */}
          <Box
            onClick={selectedInput ? handleEnter : undefined}
            sx={{
              border: "1px solid rgba(255,255,255,0.3)",
              backgroundColor: "background.paper",
              borderRadius: 3,
              px: 3,
              py: 1,
              textAlign: "center",
              cursor: selectedInput ? "pointer" : "default",
              opacity: selectedInput ? 1 : 0.5,
              "&:hover": selectedInput ? {
                backgroundColor: "rgba(255,255,255,0.1)",
              } : {},
            }}
          >
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Enter
            </Typography>
          </Box>

          {/* delete 영역 */}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mt: 1 }}>
            {/* delete 라벨 */}
            <Box
              sx={{
                border: "1px solid rgba(255,255,255,0.3)",
                backgroundColor: "background.paper",
                px: 2,
                py: 0.5,
              }}
            >
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                delete
              </Typography>
            </Box>

            {/* one by one / whole 버튼 */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Box
                onClick={results.length > 0 ? handleDeleteOne : undefined}
                sx={{
                  border: "1px solid rgba(255,255,255,0.3)",
                  backgroundColor: "background.paper",
                  px: 2,
                  py: 0.5,
                  cursor: results.length > 0 ? "pointer" : "default",
                  opacity: results.length > 0 ? 1 : 0.5,
                  "&:hover": results.length > 0 ? {
                    backgroundColor: "rgba(255,255,255,0.1)",
                  } : {},
                }}
              >
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  one by one
                </Typography>
              </Box>
              <Box
                onClick={results.length > 0 ? handleDeleteWhole : undefined}
                sx={{
                  border: "1px solid rgba(255,255,255,0.3)",
                  backgroundColor: "background.paper",
                  px: 2,
                  py: 0.5,
                  cursor: results.length > 0 ? "pointer" : "default",
                  opacity: results.length > 0 ? 1 : 0.5,
                  "&:hover": results.length > 0 ? {
                    backgroundColor: "rgba(255,255,255,0.1)",
                  } : {},
                }}
              >
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  whole
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
