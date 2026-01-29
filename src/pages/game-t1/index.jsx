import { useState, useCallback } from "react";
import { Box, Typography, Paper, useMediaQuery, useTheme } from "@mui/material";
import { saveGameV2 } from "@/services/game-services";
import { getPick2WithAdjustment } from "@/services/picks-services";

const GRID_ROWS = 6;
const GRID_COLS = 42;

// 원 컴포넌트
const Circle = ({ type, filled = true, size = 24 }) => {
  const colors = {
    P: "#1565c0",
    B: "#f44336",
  };

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: filled ? colors[type] : "#fff",
        border: "3px solid",
        borderColor: colors[type],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.5,
        fontWeight: "bold",
        color: filled ? "#fff" : colors[type],
      }}
    >
      {type}
    </Box>
  );
};

// 원 패턴 그리드 계산 (picks 페이지와 동일한 로직)
const calculateCircleGrid = (results, nextPicks = []) => {
  const grid = Array(GRID_ROWS)
    .fill(null)
    .map(() => Array(GRID_COLS).fill(null));

  const picks = results.map(r => r.value);
  if (!picks || picks.length === 0) return grid;

  let col = 0;
  let row = 0;
  let prevValue = null;
  let verticalStartCol = 0;
  let isBent = false; // 꺾임 상태 추적

  for (let i = 0; i < picks.length; i++) {
    const current = picks[i];

    if (prevValue === null) {
      grid[row][col] = { type: current, filled: true };
      verticalStartCol = col;
    } else if (current === prevValue) {
      if (isBent) {
        // 이미 꺾였으면 계속 수평 이동
        col++;
      } else if (row >= GRID_ROWS - 1) {
        // 맨 아래 행이면 수평 이동 (꺾임)
        col++;
        isBent = true;
      } else if (grid[row + 1][col]) {
        // 다음 행이 이미 차있으면 수평 이동 (꺾임)
        col++;
        isBent = true;
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
      isBent = false; // 새 값이면 꺾임 상태 초기화
      if (col >= GRID_COLS) break;
      grid[row][col] = { type: current, filled: true };
    }

    prevValue = current;
  }

  // 예상픽 표시 (filled: false로 표시)
  for (const nextPick of nextPicks) {
    if (!nextPick || col >= GRID_COLS) break;

    if (nextPick === prevValue) {
      if (isBent) {
        col++;
      } else if (row >= GRID_ROWS - 1) {
        col++;
        isBent = true;
      } else if (grid[row + 1] && grid[row + 1][col]) {
        col++;
        isBent = true;
      } else {
        row++;
      }
    } else {
      verticalStartCol++;
      col = verticalStartCol;
      row = 0;
      isBent = false;
    }

    if (col < GRID_COLS) {
      grid[row][col] = { type: nextPick, filled: false };
      prevValue = nextPick;
    }
  }

  return grid;
};

export default function GameT1Page() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [results, setResults] = useState([]);
  const [currentPick, setCurrentPick] = useState(null); // 시스템이 제공한 픽 (1pick용)
  const [currentPick3, setCurrentPick3] = useState([]); // 3pick 배열
  const [currentPick6, setCurrentPick6] = useState([]); // 6pick 배열
  const [currentPicksSeq, setCurrentPicksSeq] = useState(null); // 매칭된 picks2_seq
  const [currentPickCode, setCurrentPickCode] = useState(null); // pick_code (예: "1-29")
  const [currentNickname, setCurrentNickname] = useState(null); // 약칭
  const [pickMode, setPickMode] = useState(1); // 1, 3, 6
  const [predictOrder, setPredictOrder] = useState(0); // 3pick/6pick에서 현재 순서 (0, 1, 2 또는 0~5)

  const currentTurn = results.length + 1;

  // 패턴으로 픽 조회 (picks2 테이블 사용, jcn/jck 보정 포함)
  const fetchPick = useCallback(async (pattern, prevResults) => {
    if (!pattern) {
      setCurrentPick(null);
      setCurrentPick3([]);
      setCurrentPick6([]);
      setCurrentPicksSeq(null);
      setCurrentPickCode(null);
      setCurrentNickname(null);
      return;
    }
    try {
      const response = await getPick2WithAdjustment(pattern, prevResults);
      const pickCode = `${response.data.code1}-${response.data.code2}`;
      setCurrentPicksSeq(response.data.picks2_seq);
      setCurrentPickCode(pickCode);
      setCurrentNickname(response.data.nickname || null);

      // 1pick
      setCurrentPick(response.data.next_pick_1 || null);
      // 3pick
      setCurrentPick3(response.data.next_pick_3 ? response.data.next_pick_3.split("") : []);
      // 6pick
      setCurrentPick6(response.data.next_pick_6 ? response.data.next_pick_6.split("") : []);
    } catch {
      // 패턴 없음
      setCurrentPick(null);
      setCurrentPick3([]);
      setCurrentPick6([]);
      setCurrentPicksSeq(null);
      setCurrentPickCode(null);
      setCurrentNickname(null);
    }
  }, []);

  // 현재 모드에 따른 예측 픽 가져오기 (predictOrder 반영)
  const getCurrentPredict = () => {
    if (pickMode === 1) return currentPick;
    if (pickMode === 3) return currentPick3[predictOrder] || null;
    if (pickMode === 6) return currentPick6[predictOrder] || null;
    return null;
  };

  // 현재 모드에 따른 예측 배열 가져오기
  const getCurrentPredictArray = () => {
    if (pickMode === 1) return currentPick ? [currentPick] : [];
    if (pickMode === 3) return currentPick3;
    if (pickMode === 6) return currentPick6;
    return [];
  };

  const handleInput = (inputValue) => {
    // prev_picks 계산 (현재 결과들에서 마지막 11개)
    const allValues = results.map(r => r.value);
    const prevPicks = allValues.length >= 11
      ? allValues.slice(-11).join("")
      : allValues.length > 0 ? allValues.join("") : null;

    const predict = getCurrentPredict();
    const predictType = predict ? `${pickMode}pick` : null;
    const isCorrect = predict ? predict === inputValue : null;

    const newResult = {
      value: inputValue,
      result: inputValue,
      isCorrect: isCorrect,
      predict: predict,
      picks_seq: currentPicksSeq,
      prev_picks: prevPicks,
      pick_code: currentPickCode,
      nickname: currentNickname,
      predict_type: predictType,
      predict_order: predict ? predictOrder + 1 : null, // 1-based로 저장
      // 삭제 시 복원을 위해 현재 picks 상태 저장
      _savedPicks: {
        pick1: currentPick,
        pick3: [...currentPick3],
        pick6: [...currentPick6],
        picksSeq: currentPicksSeq,
        pickCode: currentPickCode,
        nickname: currentNickname,
      },
    };

    const newResults = [...results, newResult];
    setResults(newResults);

    // 맞았고 multi-pick 모드이면서 다음 순서가 남아있으면 순서만 증가
    const maxOrder = pickMode === 3 ? 2 : pickMode === 6 ? 5 : 0;
    if (isCorrect && pickMode > 1 && predictOrder < maxOrder) {
      setPredictOrder(predictOrder + 1);
    } else {
      // 틀렸거나 1pick이거나 시퀀스 끝이면 새로 조회
      setPredictOrder(0);
      const newAllValues = newResults.map(r => r.value);
      if (newAllValues.length >= 1) {
        const prevResults = newAllValues.join("");
        const newPattern = newAllValues.length >= 11
          ? newAllValues.slice(-11).join("")
          : prevResults;
        fetchPick(newPattern, prevResults);
      }
    }
  };

  const handleDeleteOne = () => {
    if (results.length > 0) {
      const deletedResult = results[results.length - 1];
      const newResults = results.slice(0, -1);
      setResults(newResults);

      // 삭제된 결과에 저장된 picks 상태로 복원
      if (deletedResult._savedPicks) {
        const saved = deletedResult._savedPicks;
        setCurrentPick(saved.pick1);
        setCurrentPick3(saved.pick3);
        setCurrentPick6(saved.pick6);
        setCurrentPicksSeq(saved.picksSeq);
        setCurrentPickCode(saved.pickCode);
        setCurrentNickname(saved.nickname);
      }

      // predictOrder 복원: 삭제된 턴이 사용한 order의 이전 값
      const deletedOrder = deletedResult.predict_order;
      if (deletedOrder && deletedOrder > 0) {
        setPredictOrder(deletedOrder - 1);
      } else {
        setPredictOrder(0);
      }
    }
  };

  const handleDeleteWhole = () => {
    setResults([]);
    setCurrentPick(null);
    setCurrentPick3([]);
    setCurrentPick6([]);
    setCurrentPicksSeq(null);
    setCurrentPickCode(null);
    setCurrentNickname(null);
    setPredictOrder(0);
  };

  const grid = calculateCircleGrid(results, getCurrentPredict() ? [getCurrentPredict()] : []);

  const handleSaveData = async () => {
    // turns 배열 생성 (V2: 새 필드 포함)
    const turns = results.map((r, idx) => ({
      turn_no: idx + 1,
      result: r.result,
      predict: r.predict || null,
      picks_seq: r.picks_seq || null,
      prev_picks: r.prev_picks || null,
      predict_type: r.predict_type || null,
      predict_order: r.predict_order || null,
      pick_code: r.pick_code || null,
      nickname: r.nickname || null,
    }));

    try {
      const response = await saveGameV2(null, turns);
      alert(`게임 저장 완료! (game_seq: ${response.data.game_seq}, ${response.data.turns_count}턴)`);
      handleDeleteWhole();
    } catch (error) {
      console.error("Failed to save game:", error);
      alert("저장 실패");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Save Data 버튼 - 데스크톱만 */}
      <Box sx={{ mb: 2, display: { xs: "none", md: "block" } }}>
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
          gridTemplateColumns: {
            xs: `repeat(${GRID_COLS}, 18px)`,
            md: `repeat(${GRID_COLS}, 28px)`,
          },
          gridTemplateRows: {
            xs: `repeat(${GRID_ROWS}, 18px)`,
            md: `repeat(${GRID_ROWS}, 28px)`,
          },
          gap: "1px",
          mb: 3,
          p: 0,
          backgroundColor: "#616161",
          border: "1px solid #616161",
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
              {cell && <Circle type={cell.type} filled={cell.filled} size={isMobile ? 14 : 24} />}
            </Box>
          ))
        )}
      </Box>

      {/* 모바일 - 한줄 입력 영역 */}
      <Box
        sx={{
          display: { xs: "flex", md: "none" },
          alignItems: "center",
          gap: 0.5,
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        {/* 1, 3, 6 버튼 */}
        {[1, 3, 6].map((n) => (
          <Box
            key={n}
            onClick={() => { setPickMode(n); setPredictOrder(0); }}
            sx={{
              width: 32,
              height: 32,
              border: pickMode === n ? "2px solid #4caf50" : "1px solid rgba(255,255,255,0.3)",
              backgroundColor: pickMode === n ? "#4caf50" : "background.paper",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: pickMode === n ? "bold" : "normal",
              cursor: "pointer",
              color: pickMode === n ? "#fff" : "text.primary",
              borderRadius: 1,
            }}
          >
            {n}
          </Box>
        ))}

        {/* 예상 픽 (6개 공간) */}
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const predict = idx === 0 ? getCurrentPredict() : null;
            return (
              <Box
                key={idx}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  backgroundColor: "#fff",
                  border: predict
                    ? `3px solid ${predict === "P" ? "#1565c0" : "#f44336"}`
                    : "1px solid rgba(255,255,255,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: predict === "P" ? "#1565c0" : "#f44336",
                  fontSize: 14,
                  fontWeight: "bold",
                }}
              >
                {predict || ""}
              </Box>
            );
          })}
        </Box>

        {/* turn 번호 */}
        <Box
          sx={{
            minWidth: 32,
            height: 32,
            px: 1,
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 1,
            backgroundColor: "background.paper",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="body2" sx={{ fontSize: 12 }}>{currentTurn}</Typography>
        </Box>

        {/* P 버튼 */}
        <Box
          onClick={() => handleInput("P")}
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1,
            backgroundColor: "#1565c0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 18,
            fontWeight: "bold",
            cursor: "pointer",
            "&:active": { transform: "scale(0.95)" },
          }}
        >
          P
        </Box>

        {/* B 버튼 */}
        <Box
          onClick={() => handleInput("B")}
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1,
            backgroundColor: "#f44336",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 18,
            fontWeight: "bold",
            cursor: "pointer",
            "&:active": { transform: "scale(0.95)" },
          }}
        >
          B
        </Box>

        {/* 간격 */}
        <Box sx={{ width: 32 }} />

        {/* delete 라벨 */}
        <Box
          sx={{
            height: 32,
            display: "flex",
            alignItems: "center",
            ml: 0.5,
          }}
        >
          <Typography variant="body2" sx={{ fontSize: 11, color: "text.secondary" }}>
            del
          </Typography>
        </Box>

        {/* one by one */}
        <Box
          onClick={results.length > 0 ? handleDeleteOne : undefined}
          sx={{
            height: 32,
            px: 1,
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 1,
            backgroundColor: "background.paper",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: results.length > 0 ? "pointer" : "default",
            opacity: results.length > 0 ? 1 : 0.5,
          }}
        >
          <Typography variant="body2" sx={{ fontSize: 11 }}>one</Typography>
        </Box>

        {/* whole */}
        <Box
          onClick={results.length > 0 ? handleDeleteWhole : undefined}
          sx={{
            height: 32,
            px: 1,
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 1,
            backgroundColor: "background.paper",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: results.length > 0 ? "pointer" : "default",
            opacity: results.length > 0 ? 1 : 0.5,
          }}
        >
          <Typography variant="body2" sx={{ fontSize: 11 }}>all</Typography>
        </Box>

        {/* Save 버튼 */}
        <Box
          onClick={results.length > 0 ? handleSaveData : undefined}
          sx={{
            height: 32,
            px: 1.5,
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 1,
            backgroundColor: "background.paper",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: results.length > 0 ? "pointer" : "default",
            opacity: results.length > 0 ? 1 : 0.5,
            ml: "auto",
          }}
        >
          <Typography variant="body2" sx={{ fontSize: 11 }}>save</Typography>
        </Box>
      </Box>

      {/* 하단 - 입력 영역 */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: { xs: 2, md: 3 }, width: { xs: "100%", md: 928 } }}>
        {/* 픽 표시 영역 - 데스크톱만 */}
        <Box sx={{ display: { xs: "none", md: "flex" }, flexDirection: "column", gap: 1 }}>
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
                onClick={() => { setPickMode(n); setPredictOrder(0); }}
                sx={{
                  width: 32,
                  height: 32,
                  border: "1px solid rgba(255,255,255,0.3)",
                  backgroundColor: pickMode === n ? "rgba(255,255,255,0.2)" : "background.paper",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  cursor: "pointer",
                  color: "text.primary",
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.15)",
                  },
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
              width: { xs: 80, md: 100 },
              height: { xs: 60, md: 80 },
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 2,
              backgroundColor: "background.paper",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {getCurrentPredict() && (
              <Box
                sx={{
                  width: { xs: 36, md: 50 },
                  height: { xs: 36, md: 50 },
                  borderRadius: 2,
                  backgroundColor: getCurrentPredict() === "P" ? "#1565c0" : "#f44336",
                  border: `3px solid ${getCurrentPredict() === "P" ? "#1565c0" : "#f44336"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: { xs: 18, md: 24 },
                  fontWeight: "bold",
                }}
              >
                {getCurrentPredict()}
              </Box>
            )}
          </Box>
        </Box>

        {/* 숫자 격자 - 진행된 턴까지만 표시 (세로 6개 → 가로 이동) */}
        <Paper sx={{ p: { xs: 1, md: 2 }, backgroundColor: "background.paper", flexGrow: 1, order: { xs: -1, md: 0 } }}>
          {/* 통계 - 상단 */}
          {results.length > 0 && (
            <Box sx={{ mb: 1, display: "flex", gap: 2, fontSize: 12 }}>
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
          <Box
            sx={{
              display: "grid",
              gridTemplateRows: { xs: "repeat(6, 24px)", md: "repeat(6, 32px)" },
              gridAutoFlow: "column",
              gridAutoColumns: { xs: "24px", md: "32px" },
              gap: "2px",
              minHeight: { xs: 150, md: 200 },
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
                    width: { xs: 24, md: 32 },
                    height: { xs: 24, md: 32 },
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: { xs: 11, md: 14 },
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
            {getCurrentPredict() && (
              <Box
                sx={{
                  width: { xs: 24, md: 32 },
                  height: { xs: 24, md: 32 },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: { xs: 11, md: 14 },
                  fontWeight: 800,
                  border: `3px solid ${getCurrentPredict() === "P" ? "#1565c0" : "#f44336"}`,
                  borderRadius: 1,
                  backgroundColor: "#fff",
                  color: "#000",
                }}
              >
                {currentTurn}
              </Box>
            )}
          </Box>
        </Paper>

        {/* 입력 패널 - 데스크톱만 */}
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
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
              onClick={() => handleInput("P")}
              sx={{
                width: { xs: 50, md: 70 },
                height: { xs: 50, md: 70 },
                borderRadius: 2,
                border: "3px solid #1565c0",
                backgroundColor: "#1565c0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: { xs: 20, md: 28 },
                fontWeight: "bold",
                cursor: "pointer",
                "&:hover": {
                  opacity: 0.8,
                },
                "&:active": {
                  transform: "scale(0.95)",
                },
              }}
            >
              P
            </Box>

            {/* 가운데 숫자 - 사각형 */}
            <Box
              sx={{
                width: { xs: 24, md: 32 },
                height: { xs: 24, md: 32 },
                borderRadius: 1,
                border: "1px solid rgba(255,255,255,0.3)",
                backgroundColor: "background.paper",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: { xs: 10, md: 12 },
                color: "text.secondary",
              }}
            >
              {currentTurn}
            </Box>

            {/* B 버튼 - 사각형 */}
            <Box
              onClick={() => handleInput("B")}
              sx={{
                width: { xs: 50, md: 70 },
                height: { xs: 50, md: 70 },
                borderRadius: 2,
                border: "3px solid #f44336",
                backgroundColor: "#f44336",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: { xs: 20, md: 28 },
                fontWeight: "bold",
                cursor: "pointer",
                "&:hover": {
                  opacity: 0.8,
                },
                "&:active": {
                  transform: "scale(0.95)",
                },
              }}
            >
              B
            </Box>
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
