import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Paper, IconButton, Select, MenuItem, useMediaQuery, useTheme, CircularProgress } from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import ArrowForward from "@mui/icons-material/ArrowForward";
import { deleteGame, getGameV2, getGameStat, getGamesPaginated, getGamesByPatternPaginated, getTurnDetail } from "@/services/game-services";

const GRID_ROWS = 6;
const GRID_COLS = 42;

// 17가지 패턴 (전체 + 1~16 순서)
const PATTERNS = [
  { pattern: "ALL", label: "전체" },  // 0 - 전체
  { pattern: "PPPP" },  // 1
  { pattern: "PPPB" },  // 2
  { pattern: "PPBP" },  // 3
  { pattern: "PPBB" },  // 4
  { pattern: "PBPP" },  // 5
  { pattern: "PBBP" },  // 6
  { pattern: "PBPB" },  // 7
  { pattern: "PBBB" },  // 8
  { pattern: "BBBB" },  // 9
  { pattern: "BBBP" },  // 10
  { pattern: "BBPB" },  // 11
  { pattern: "BBPP" },  // 12
  { pattern: "BPBB" },  // 13
  { pattern: "BPPB" },  // 14
  { pattern: "BPBP" },  // 15
  { pattern: "BPPP" },  // 16
];

// 원 컴포넌트 - nickname 표시, P/B는 색상으로만
const Circle = ({ type, nickname, size = 24 }) => {
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
        backgroundColor: colors[type],
        border: "2px solid",
        borderColor: colors[type],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: "bold",
        color: "#fff",
      }}
    >
      {nickname || ""}
    </Box>
  );
};

// 4연패 이상 구간 계산
const calculateStreakTurns = (turns) => {
  const streakTurns = new Set();
  let missStart = -1;
  let missCount = 0;

  for (let i = 0; i < turns.length; i++) {
    const t = turns[i];
    if (!t.predict) continue; // 픽 없으면 판정 안함, 연패 유지
    if (t.predict !== t.result) {
      if (missStart === -1) missStart = i;
      missCount++;
    } else {
      if (missCount >= 4) {
        for (let j = missStart; j < missStart + missCount; j++) {
          streakTurns.add(turns[j].turn_no);
        }
      }
      missStart = -1;
      missCount = 0;
    }
  }
  // 마지막 연패 체크
  if (missCount >= 4) {
    for (let j = missStart; j < missStart + missCount; j++) {
      streakTurns.add(turns[j].turn_no);
    }
  }
  return streakTurns;
};

// 슈 격자 계산 (shoe_grid_display.md 참조) + 적중/미스 표시 + 약칭 + 연패 표시
const calculateCircleGrid = (shoes, turns = []) => {
  const grid = Array(GRID_ROWS)
    .fill(null)
    .map(() => Array(GRID_COLS).fill(null));

  if (!shoes || shoes.length === 0) return grid;

  const picks = shoes.split("");

  // turns를 turn_no 기준 맵으로 변환
  const turnsMap = {};
  turns.forEach(t => {
    turnsMap[t.turn_no] = t;
  });

  // 4연패 이상 턴 계산
  const streakTurns = calculateStreakTurns(turns);

  let col = 0;
  let row = 0;
  let prevValue = null;
  let verticalStartCol = 0;
  let isBent = false;

  for (let i = 0; i < picks.length; i++) {
    const current = picks[i];
    const turnNo = i + 1;
    const turn = turnsMap[turnNo];

    // 적중 여부: predict와 result가 같으면 hit, 다르면 miss, predict가 없으면 null
    let status = null;
    if (turn && turn.predict) {
      status = turn.predict === turn.result ? "hit" : "miss";
    }

    // 약칭: nickname이 있으면 사용, 픽 있는데 약칭 없으면 "[ ]", 픽 없으면 "N"
    const nickname = turn?.nickname || (turn?.predict ? "[ ]" : "N");

    // 연패 여부
    const inStreak = streakTurns.has(turnNo);

    const cellData = { type: current, filled: true, status, nickname, inStreak, turnNo };

    if (prevValue === null) {
      grid[row][col] = cellData;
      verticalStartCol = col;
    } else if (current === prevValue) {
      if (isBent) {
        col++;
      } else if (row >= GRID_ROWS - 1) {
        col++;
        isBent = true;
      } else if (grid[row + 1][col]) {
        col++;
        isBent = true;
      } else {
        row++;
      }
      if (col >= GRID_COLS) break;
      grid[row][col] = cellData;
    } else {
      verticalStartCol++;
      col = verticalStartCol;
      row = 0;
      isBent = false;
      if (col >= GRID_COLS) break;
      grid[row][col] = cellData;
    }

    prevValue = current;
  }

  return grid;
};

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const STORAGE_KEY = "gamedata_page_size";
const LAST_GAME_KEY = "gamedata_last_game";

export default function GamedataPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();

  // localStorage에서 마지막 게임 상태 복원
  const savedLastGame = useRef(() => {
    try { return JSON.parse(localStorage.getItem(LAST_GAME_KEY)); } catch { return null; }
  });
  const lastGameState = savedLastGame.current();
  const restoreGameSeq = useRef(lastGameState?.game_seq || null);

  const [patternIndex, setPatternIndex] = useState(lastGameState?.patternIndex ?? 0);
  const [pickMode, setPickMode] = useState(lastGameState?.pickMode ?? 1); // 1, 3, 6
  const [games, setGames] = useState([]);
  const [selectedGameIndex, setSelectedGameIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(lastGameState?.currentPage ?? 1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 10;
  });
  const [selectedGameTurns, setSelectedGameTurns] = useState([]);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcProgress, setRecalcProgress] = useState(0);
  const [patternStat, setPatternStat] = useState(null);
  const [streakFilter, setStreakFilter] = useState(lastGameState?.streakFilter ?? null); // 연패 필터 (4~14 또는 "15+")
  const [selectedTurnNo, setSelectedTurnNo] = useState(null); // 격자에서 선택된 턴
  const [turnDetail, setTurnDetail] = useState(null); // 서버에서 조회한 턴 상세

  // 통계 재계산 (SSE)
  const handleRecalculateStats = () => {
    if (recalculating) return;
    if (!confirm("전체 게임 통계를 재계산합니다. 진행하시겠습니까?")) return;

    setRecalculating(true);
    setRecalcProgress(0);

    const eventSource = new EventSource("/api/v1/game/recalculate-stats/stream");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setRecalcProgress(data.progress);

      if (data.done) {
        eventSource.close();
        setRecalculating(false);
        alert(`완료: ${data.total}개 게임 업데이트`);
        fetchGames(currentPattern.pattern, currentPage, streakFilter, pickMode);
        fetchPatternStat(currentPattern.pattern, pickMode);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setRecalculating(false);
      alert("재계산 실패");
    };
  };

  const handlePageSizeChange = (e) => {
    const newSize = e.target.value;
    setItemsPerPage(newSize);
    localStorage.setItem(STORAGE_KEY, newSize);
    setCurrentPage(1);
  };

  const currentPattern = PATTERNS[patternIndex];

  // 15+ 연패 카운트
  const get15PlusCount = (streaks) => {
    if (!streaks) return 0;
    return streaks["15+_count"] || 0;
  };

  // 선택된 게임
  const selectedGame = selectedGameIndex !== null ? games[selectedGameIndex] : null;

  // 연패 필터 토글
  const handleStreakFilter = (n) => {
    if (streakFilter === n) {
      setStreakFilter(null);
    } else {
      setStreakFilter(n);
    }
    setCurrentPage(1);
    setSelectedGameIndex(null);
  };

  // 서버에서 게임 목록 조회 (페이지네이션)
  const fetchGames = useCallback(async (pattern, page, streak, mode) => {
    setLoading(true);
    try {
      let response;
      if (pattern === "ALL") {
        response = await getGamesPaginated(page, itemsPerPage, streak, mode);
      } else {
        response = await getGamesByPatternPaginated(pattern, page, itemsPerPage, streak, mode);
      }
      const data = response.data;
      setGames(data.items || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.total_count || 0);
      if (!restoreGameSeq.current) {
        setSelectedGameIndex(null);
        setSelectedGameTurns([]);
      }
    } catch (error) {
      console.error("Failed to fetch games:", error);
      setGames([]);
      setTotalPages(1);
      setTotalCount(0);
    }
    setLoading(false);
  }, [itemsPerPage]);

  // 패턴 통계 조회 (game_stat 테이블)
  const fetchPatternStat = useCallback(async (pattern, mode) => {
    try {
      const response = await getGameStat(pattern, mode);
      setPatternStat(response.data);
    } catch (error) {
      console.error("Failed to fetch pattern stat:", error);
      setPatternStat(null);
    }
  }, []);

  // pickMode 변경 시 선택된 게임의 turns 재조회
  useEffect(() => {
    if (selectedGameIndex !== null && games[selectedGameIndex]) {
      const game = games[selectedGameIndex];
      getGameV2(game.game_seq, pickMode).then(res => {
        setSelectedGameTurns(res.data?.turns || []);
      }).catch(() => setSelectedGameTurns([]));
    }
  }, [pickMode]);

  // 패턴 또는 페이지 변경시 데이터 조회
  useEffect(() => {
    fetchGames(currentPattern.pattern, currentPage, streakFilter, pickMode);
  }, [patternIndex, currentPage, itemsPerPage, streakFilter, pickMode, fetchGames, currentPattern.pattern]);

  // 패턴 변경시 통계 조회
  useEffect(() => {
    fetchPatternStat(currentPattern.pattern, pickMode);
  }, [patternIndex, pickMode, fetchPatternStat, currentPattern.pattern]);

  // 이전 패턴
  const handlePrevPattern = () => {
    setPatternIndex((prev) => (prev > 0 ? prev - 1 : PATTERNS.length - 1));
    setCurrentPage(1);
  };

  // 다음 패턴
  const handleNextPattern = () => {
    setPatternIndex((prev) => (prev < PATTERNS.length - 1 ? prev + 1 : 0));
    setCurrentPage(1);
  };

  // 게임 목록 로드 후 마지막 게임 복원
  useEffect(() => {
    if (restoreGameSeq.current && games.length > 0) {
      const idx = games.findIndex(g => g.game_seq === restoreGameSeq.current);
      restoreGameSeq.current = null;
      if (idx !== -1) {
        handleGameSelect(idx);
      }
    }
  }, [games]);

  // 게임 선택
  const handleGameSelect = async (index) => {
    setSelectedGameIndex(index);
    setSelectedTurnNo(null);
    setTurnDetail(null);

    // 게임 상세 조회 (turns 포함)
    const game = games[index];
    if (game) {
      // localStorage에 마지막 게임 상태 저장
      localStorage.setItem(LAST_GAME_KEY, JSON.stringify({
        game_seq: game.game_seq,
        patternIndex,
        currentPage,
        streakFilter,
        pickMode,
      }));

      try {
        const response = await getGameV2(game.game_seq, pickMode);
        setSelectedGameTurns(response.data?.turns || []);
      } catch (error) {
        console.error("Failed to fetch game detail:", error);
        setSelectedGameTurns([]);
      }
    }
  };

  // 게임 삭제
  const handleDelete = async () => {
    if (selectedGame === null) return;
    if (!confirm(`게임 #${selectedGame.game_seq}을 삭제하시겠습니까?`)) return;

    try {
      await deleteGame(selectedGame.game_seq);
      // 목록 새로고침
      fetchGames(currentPattern.pattern, currentPage, streakFilter, pickMode);
    } catch (error) {
      console.error("Failed to delete game:", error);
      alert("삭제 실패");
    }
  };

  // 선택된 게임의 격자
  const grid = selectedGame ? calculateCircleGrid(selectedGame.shoes, selectedGameTurns) : calculateCircleGrid("");

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
      {/* 슈 격자 - hit/miss는 배경색, P/B는 원 색상, 글자는 nickname */}
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
          backgroundColor: "#616161",
          border: "1px solid #616161",
          width: "fit-content",
        }}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <Box
              key={`${rowIndex}-${colIndex}`}
              onClick={async () => {
                if (!cell?.turnNo || !selectedGame) return;
                setSelectedTurnNo(cell.turnNo);
                try {
                  const res = await getTurnDetail(selectedGame.game_seq, cell.turnNo);
                  setTurnDetail(res.data);
                } catch (e) {
                  console.error("Failed to fetch turn detail:", e);
                  setTurnDetail(null);
                }
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: cell?.status === "hit"
                  ? "#4caf50"
                  : cell?.status === "miss"
                    ? "#ffeb3b"
                    : "background.default",
                border: cell?.turnNo === selectedTurnNo
                  ? "2px solid #fff"
                  : cell?.inStreak ? "2px solid #ff5722" : "none",
                boxSizing: "border-box",
                cursor: cell ? "pointer" : "default",
              }}
            >
              {cell && <Circle type={cell.type} nickname={cell.nickname} size={isMobile ? 12 : 22} />}
            </Box>
          ))
        )}
      </Box>

      {/* 턴 상세: prev_picks + predict + 실제결과 (한줄) */}
      {turnDetail && (() => {
        const prevPicks = (turnDetail.prev_picks || "").split("").filter(c => c === "P" || c === "B");
        const predict = turnDetail.predict;
        const result = turnDetail.result;
        const cellSize = isMobile ? 18 : 28;
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: "2px", py: 0.5 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", mr: 0.5 }}>
              T{selectedTurnNo}
            </Typography>
            {/* prev_picks + predict + 실제결과 격자 */}
            <Box sx={{
              display: "flex", alignItems: "center",
              gap: "1px", backgroundColor: "#616161",
              border: "1px solid #616161",
            }}>
              {/* prev_picks (11칸 고정, 좌측 정렬) */}
              {Array.from({ length: 11 }, (_, i) => {
                const c = i < prevPicks.length ? prevPicks[i] : null;
                return (
                  <Box key={`pp-${i}`} sx={{
                    width: cellSize, height: cellSize,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    backgroundColor: "background.default",
                  }}>
                    {c && <Circle type={c} nickname="" size={cellSize - 4} />}
                  </Box>
                );
              })}
              {/* 구분 (빈칸) */}
              <Box sx={{ width: cellSize / 2, height: cellSize, backgroundColor: "#616161" }} />
              {/* predict */}
              <Box sx={{
                width: cellSize, height: cellSize,
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: predict ? (predict === result ? "#4caf50" : "#ffeb3b") : "background.default",
              }}>
                {predict ? <Circle type={predict} nickname="" size={cellSize - 4} /> : <Typography variant="caption" sx={{ color: "#999" }}>-</Typography>}
              </Box>
              {/* 구분 (빈칸) */}
              <Box sx={{ width: cellSize / 2, height: cellSize, backgroundColor: "#616161" }} />
              {/* 실제 결과 */}
              <Box sx={{
                width: cellSize, height: cellSize,
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: "background.default",
              }}>
                {result ? <Circle type={result} nickname="" size={cellSize - 4} /> : <Typography variant="caption" sx={{ color: "#999" }}>-</Typography>}
              </Box>
            </Box>
            {/* 추가 정보 */}
            <Typography variant="caption" sx={{ color: "text.secondary", ml: 1 }}>
              {turnDetail.nickname || "-"} {turnDetail.pick_code || ""}
            </Typography>
            {turnDetail.pick_code && (
              <Box
                onClick={() => navigate(`/pick-management?code=${turnDetail.pick_code}`)}
                sx={{
                  ml: 1, px: 1, py: 0.25,
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 0.5, cursor: "pointer",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                }}
              >
                <Typography variant="caption">이동</Typography>
              </Box>
            )}
          </Box>
        );
      })()}

      {/* 중간 - 모드 선택 + 패턴 선택 + 통계 + 선택번호 + Delete */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {/* 1/3/6 모드 선택 */}
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {[1, 3, 6].map((n) => (
            <Box
              key={n}
              onClick={() => {
                setPickMode(n);
                setSelectedGameIndex(null);
                setSelectedGameTurns([]);
              }}
              sx={{
                width: 28,
                height: 28,
                border: pickMode === n ? "2px solid #4caf50" : "1px solid rgba(255,255,255,0.3)",
                backgroundColor: pickMode === n ? "rgba(76, 175, 80, 0.3)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: pickMode === n ? "bold" : "normal",
                cursor: "pointer",
                color: pickMode === n ? "#4caf50" : "text.primary",
                borderRadius: 0.5,
              }}
            >
              {n}
            </Box>
          ))}
        </Box>

        {/* 패턴 선택 */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton size="small" onClick={handlePrevPattern}>
            <ArrowBack sx={{ fontSize: 18 }} />
          </IconButton>
          <Box
            sx={{
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 1,
              px: 2,
              py: 0.5,
              minWidth: 50,
              textAlign: "center",
            }}
          >
            <Typography variant="body2">{currentPattern.label || currentPattern.pattern}</Typography>
          </Box>
          <IconButton size="small" onClick={handleNextPattern}>
            <ArrowForward sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* 전체 통계 (game_stat 테이블) */}
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          game:<span style={{ color: "#fff" }}>{patternStat?.game_count || 0}</span>
          {" "}
          <span style={{ color: "#fff" }}>{patternStat?.total_turns || 0}</span>
          :<span style={{ color: "#4caf50" }}>{patternStat?.total_hit || 0}</span>
          :<span style={{ color: "#ffeb3b" }}>{patternStat?.total_miss || 0}</span>
        </Typography>

        {/* 선택된 게임 통계 */}
        {selectedGame && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            sel:<span style={{ color: "#fff" }}>{selectedGameTurns.filter(t => t.predict).length}</span>
            :<span style={{ color: "#4caf50" }}>{selectedGameTurns.filter(t => t.predict && t.predict === t.result).length}</span>
            :<span style={{ color: "#ffeb3b" }}>{selectedGameTurns.filter(t => t.predict && t.predict !== t.result).length}</span>
          </Typography>
        )}

        {/* 선택된 번호 + Delete - 게임 선택 후에만 표시 */}
        {selectedGame && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto" }}>
            <Box
              sx={{
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 1,
                px: 2,
                py: 0.5,
                minWidth: 40,
                textAlign: "center",
              }}
            >
              <Typography variant="body2">
                {selectedGame.game_seq}
              </Typography>
            </Box>
            <Box
              onClick={handleDelete}
              sx={{
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 1,
                px: 2,
                py: 0.5,
                cursor: "pointer",
                "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
              }}
            >
              <Typography variant="body2">Delete</Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* 하단 - 게임 테이블 */}
      <Paper sx={{ backgroundColor: "background.paper", overflow: "hidden" }}>
        {/* 페이지네이션 */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 0.5,
            p: 1,
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Typography variant="caption" sx={{ mr: 1, color: "text.secondary" }}>
            {totalCount}건
          </Typography>
          <Box
            onClick={() => currentPage > 1 && setCurrentPage(1)}
            sx={{
              px: 1,
              py: 0.25,
              fontSize: 11,
              cursor: currentPage > 1 ? "pointer" : "default",
              color: currentPage > 1 ? "text.primary" : "text.disabled",
              "&:hover": currentPage > 1 ? { backgroundColor: "rgba(255,255,255,0.1)" } : {},
            }}
          >
            {"<<"}
          </Box>
          <Box
            onClick={() => {
              const startPage = Math.floor((currentPage - 1) / 10) * 10 + 1;
              if (startPage > 1) setCurrentPage(startPage - 10);
            }}
            sx={{
              px: 1,
              py: 0.25,
              fontSize: 11,
              cursor: Math.floor((currentPage - 1) / 10) > 0 ? "pointer" : "default",
              color: Math.floor((currentPage - 1) / 10) > 0 ? "text.primary" : "text.disabled",
              "&:hover": Math.floor((currentPage - 1) / 10) > 0 ? { backgroundColor: "rgba(255,255,255,0.1)" } : {},
            }}
          >
            {"<"}
          </Box>
          {(() => {
            const startPage = Math.floor((currentPage - 1) / 10) * 10 + 1;
            const endPage = Math.min(startPage + 9, totalPages);
            return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((page) => (
              <Box
                key={page}
                onClick={() => setCurrentPage(page)}
                sx={{
                  px: 1,
                  py: 0.25,
                  fontSize: 11,
                  cursor: "pointer",
                  borderRadius: 0.5,
                  backgroundColor: page === currentPage ? "rgba(76, 175, 80, 0.3)" : "transparent",
                  color: page === currentPage ? "#4caf50" : "text.primary",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                }}
              >
                {page}
              </Box>
            ));
          })()}
          <Box
            onClick={() => {
              const startPage = Math.floor((currentPage - 1) / 10) * 10 + 1;
              const nextStart = startPage + 10;
              if (nextStart <= totalPages) setCurrentPage(nextStart);
            }}
            sx={{
              px: 1,
              py: 0.25,
              fontSize: 11,
              cursor: Math.floor((currentPage - 1) / 10) * 10 + 11 <= totalPages ? "pointer" : "default",
              color: Math.floor((currentPage - 1) / 10) * 10 + 11 <= totalPages ? "text.primary" : "text.disabled",
              "&:hover": Math.floor((currentPage - 1) / 10) * 10 + 11 <= totalPages ? { backgroundColor: "rgba(255,255,255,0.1)" } : {},
            }}
          >
            {">"}
          </Box>
          <Box
            onClick={() => currentPage < totalPages && setCurrentPage(totalPages)}
            sx={{
              px: 1,
              py: 0.25,
              fontSize: 11,
              cursor: currentPage < totalPages ? "pointer" : "default",
              color: currentPage < totalPages ? "text.primary" : "text.disabled",
              "&:hover": currentPage < totalPages ? { backgroundColor: "rgba(255,255,255,0.1)" } : {},
            }}
          >
            {">>"}
          </Box>
        </Box>

        {/* 테이블 헤더 */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            p: 1,
            borderBottom: "1px solid rgba(255,255,255,0.2)",
            backgroundColor: "rgba(255,255,255,0.05)",
            gap: 0.5,
          }}
        >
          <Typography variant="caption" sx={{ width: 50, textAlign: "center" }}>
            번호
          </Typography>
          <Typography variant="caption" sx={{ width: 70, textAlign: "center" }}>
            저장
          </Typography>
          <Typography variant="caption" sx={{ width: 45, textAlign: "center" }}>
            id
          </Typography>
          <Typography variant="caption" sx={{ width: 70, textAlign: "center" }}>
            T-H-M
          </Typography>
          {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, "15+", "7+7"].map((n) => (
            <Box
              key={n}
              onClick={() => handleStreakFilter(n)}
              sx={{
                width: n === "15+" || n === "7+7" ? 28 : 22,
                textAlign: "center",
                cursor: "pointer",
                border: streakFilter === n ? "1px solid #4caf50" : "1px solid rgba(255,255,255,0.3)",
                borderRadius: 0.5,
                py: 0.25,
                backgroundColor: streakFilter === n ? "rgba(76, 175, 80, 0.2)" : "transparent",
                color: streakFilter === n ? "#4caf50" : (n === "15+" || n === "7+7") ? "#f44336" : "text.primary",
                "&:hover": { backgroundColor: streakFilter === n ? "rgba(76, 175, 80, 0.3)" : "rgba(255,255,255,0.1)" },
              }}
            >
              <Typography variant="caption">{n === "7+7" ? "폭" : n}</Typography>
            </Box>
          ))}
        </Box>

        {/* 테이블 바디 */}
        <Box sx={{ maxHeight: 300, overflow: "auto" }}>
          {loading ? (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                로딩중...
              </Typography>
            </Box>
          ) : games.length > 0 ? (
            games.map((game, index) => {
              const isSelected = selectedGameIndex === index;
              const streaks = game.streaks || {};

              return (
                <Box
                  key={game.game_seq}
                  onClick={() => handleGameSelect(index)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    p: 1,
                    cursor: "pointer",
                    backgroundColor: isSelected ? "rgba(76, 175, 80, 0.2)" : "transparent",
                    "&:hover": {
                      backgroundColor: isSelected ? "rgba(76, 175, 80, 0.3)" : "rgba(255,255,255,0.05)",
                    },
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    gap: 0.5,
                  }}
                >
                  <Typography variant="body2" sx={{ width: 50, textAlign: "center" }}>
                    {game.game_seq}
                  </Typography>
                  <Typography variant="caption" sx={{ width: 70, textAlign: "center", color: "text.secondary" }}>
                    {game.date ? new Date(game.date).toLocaleDateString().slice(2) : "-"}
                  </Typography>
                  <Typography variant="caption" sx={{ width: 45, textAlign: "center", color: "text.secondary" }}>
                    admin
                  </Typography>
                  <Typography variant="caption" sx={{ width: 70, textAlign: "center", color: "text.secondary" }}>
                    {`${game.total || 0}-${game.hit || 0}-${game.miss || 0}`}
                  </Typography>
                  {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((n) => (
                    <Typography
                      key={n}
                      variant="caption"
                      sx={{
                        width: 22,
                        textAlign: "center",
                        color: streaks[n] ? "#ffeb3b" : "text.secondary",
                      }}
                    >
                      {streaks[n] || 0}
                    </Typography>
                  ))}
                  <Typography
                    variant="caption"
                    sx={{
                      width: 28,
                      textAlign: "center",
                      color: get15PlusCount(streaks) ? "#f44336" : "text.secondary",
                      fontWeight: get15PlusCount(streaks) ? "bold" : "normal",
                    }}
                  >
                    {get15PlusCount(streaks)}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      width: 28,
                      textAlign: "center",
                      color: game.is_pok ? "#f44336" : "text.secondary",
                      fontWeight: game.is_pok ? "bold" : "normal",
                    }}
                  >
                    {game.is_pok ? "1" : "-"}
                  </Typography>
                </Box>
              );
            })
          ) : (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                데이터 없음
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* 하단 - 페이지당 개수 + 통계갱신 */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1, mt: 1 }}>
        <Select
          value={itemsPerPage}
          onChange={handlePageSizeChange}
          size="small"
          sx={{
            minWidth: 60,
            fontSize: 12,
            "& .MuiSelect-select": { py: 0.5, px: 1 },
          }}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <MenuItem key={size} value={size} sx={{ fontSize: 12 }}>
              {size}
            </MenuItem>
          ))}
        </Select>
        <Box
          onClick={handleRecalculateStats}
          sx={{
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 1,
            px: 1.5,
            py: 0.5,
            cursor: recalculating ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 1,
            minWidth: 80,
            "&:hover": !recalculating ? { backgroundColor: "rgba(255,255,255,0.1)" } : {},
          }}
        >
          {recalculating ? (
            <>
              <CircularProgress size={12} sx={{ color: "#4caf50" }} />
              <Typography variant="caption" sx={{ color: "#4caf50" }}>{recalcProgress}%</Typography>
            </>
          ) : (
            <Typography variant="caption">통계갱신</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
