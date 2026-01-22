import { useState, useEffect, useCallback } from "react";
import { Box, Typography, Paper, IconButton, Select, MenuItem, useMediaQuery, useTheme } from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import ArrowForward from "@mui/icons-material/ArrowForward";
import { getGamesByPattern, deleteGame, getGameV2 } from "@/services/game-services";

const GRID_ROWS = 6;
const GRID_COLS = 42;

// 16가지 패턴 (1~16 순서)
const PATTERNS = [
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

// 원 컴포넌트
const Circle = ({ type, size = 24 }) => {
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
        fontSize: size * 0.5,
        fontWeight: "bold",
        color: "#fff",
      }}
    >
      {type}
    </Box>
  );
};

// 슈 격자 계산 (shoe_grid_display.md 참조) + 적중/미스 표시 + 약칭
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

    // 약칭: nickname이 있으면 사용, 없으면 "N"
    const nickname = turn?.nickname || "N";

    const cellData = { type: current, filled: true, status, nickname };

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

// 미니 격자 컴포넌트 (테이블용)
const MiniGrid = ({ shoes }) => {
  const grid = calculateCircleGrid(shoes);
  const cellSize = 8;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_COLS}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${GRID_ROWS}, ${cellSize}px)`,
        gap: "1px",
        backgroundColor: "rgba(255,255,255,0.1)",
      }}
    >
      {grid.map((row, rowIndex) =>
        row.map((cell, colIndex) => (
          <Box
            key={`${rowIndex}-${colIndex}`}
            sx={{
              width: cellSize,
              height: cellSize,
              backgroundColor: cell ? (cell.type === "P" ? "#1565c0" : "#f44336") : "transparent",
              borderRadius: "50%",
            }}
          />
        ))
      )}
    </Box>
  );
};

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const STORAGE_KEY = "gamedata_page_size";

export default function GamedataPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [patternIndex, setPatternIndex] = useState(0);
  const [allGames, setAllGames] = useState([]);
  const [selectedGameIndex, setSelectedGameIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 10;
  });
  const [selectedGameTurns, setSelectedGameTurns] = useState([]);

  const handlePageSizeChange = (e) => {
    const newSize = e.target.value;
    setItemsPerPage(newSize);
    localStorage.setItem(STORAGE_KEY, newSize);
    setCurrentPage(1);
  };

  const currentPattern = PATTERNS[patternIndex];

  // 페이지네이션 계산
  const totalPages = Math.ceil(allGames.length / itemsPerPage);
  const games = allGames.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 선택된 게임
  const selectedGame = selectedGameIndex !== null ? allGames[selectedGameIndex] : null;

  // 패턴별 게임 목록 조회
  const fetchGamesByPattern = useCallback(async (pattern) => {
    setLoading(true);
    try {
      const response = await getGamesByPattern(pattern, 500);
      setAllGames(response.data || []);
      setCurrentPage(1);
      setSelectedGameIndex(null);
      setSelectedGameTurns([]);
    } catch (error) {
      console.error("Failed to fetch games:", error);
      setAllGames([]);
    }
    setLoading(false);
  }, []);

  // 패턴 변경시 데이터 조회
  useEffect(() => {
    fetchGamesByPattern(currentPattern.pattern);
  }, [patternIndex, fetchGamesByPattern, currentPattern.pattern]);

  // 이전 패턴
  const handlePrevPattern = () => {
    setPatternIndex((prev) => (prev > 0 ? prev - 1 : PATTERNS.length - 1));
  };

  // 다음 패턴
  const handleNextPattern = () => {
    setPatternIndex((prev) => (prev < PATTERNS.length - 1 ? prev + 1 : 0));
  };

  // 게임 선택
  const handleGameSelect = async (index) => {
    const globalIndex = (currentPage - 1) * itemsPerPage + index;
    setSelectedGameIndex(globalIndex);

    // 게임 상세 조회 (turns 포함)
    const game = allGames[globalIndex];
    if (game) {
      try {
        const response = await getGameV2(game.game_seq);
        console.log("Game detail response:", response.data);
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
      fetchGamesByPattern(currentPattern.pattern);
    } catch (error) {
      console.error("Failed to delete game:", error);
      alert("삭제 실패");
    }
  };

  // 선택된 게임의 격자
  const grid = selectedGame ? calculateCircleGrid(selectedGame.shoes, selectedGameTurns) : calculateCircleGrid("");

  // 통계 계산 (임시 - turns 데이터 필요)
  const totalCount = allGames.length;

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
      {/* 상단 - 약칭 격자 */}
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
          backgroundColor: "#fff",
          border: "1px solid #fff",
          width: "fit-content",
        }}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <Box
              key={`nick-${rowIndex}-${colIndex}`}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "background.default",
              }}
            >
              {cell && (
                <Typography
                  sx={{
                    fontSize: { xs: 8, md: 10 },
                    fontWeight: "bold",
                    color: cell.status === "hit"
                      ? "#4caf50"
                      : cell.status === "miss"
                        ? "#ffeb3b"
                        : "text.secondary",
                  }}
                >
                  {cell.nickname}
                </Typography>
              )}
            </Box>
          ))
        )}
      </Box>

      {/* 슈 격자 */}
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
          backgroundColor: "#fff",
          border: "1px solid #fff",
          width: "fit-content",
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
                backgroundColor: "background.default",
              }}
            >
              {cell && <Circle type={cell.type} size={isMobile ? 14 : 24} />}
            </Box>
          ))
        )}
      </Box>

      {/* 중간 - 패턴 선택 + 통계 + 선택번호 + Delete */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
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
            <Typography variant="body2">{currentPattern.pattern}</Typography>
          </Box>
          <IconButton size="small" onClick={handleNextPattern}>
            <ArrowForward sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* 페이지당 개수 선택 */}
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

        {/* 통계 - 게임 선택 후에만 표시 */}
        {selectedGame && (
          <Box sx={{ display: "flex", gap: 2, ml: 2 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              total: <span style={{ color: "#fff" }}>{selectedGameTurns.length}</span>
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              hit: <span style={{ color: "#4caf50" }}>{selectedGameTurns.filter(t => t.predict && t.predict === t.result).length}</span>
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              miss: <span style={{ color: "#ffeb3b" }}>{selectedGameTurns.filter(t => t.predict && t.predict !== t.result).length}</span>
            </Typography>
          </Box>
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
        {/* 테이블 헤더 */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            p: 1,
            borderBottom: "1px solid rgba(255,255,255,0.2)",
            backgroundColor: "rgba(255,255,255,0.05)",
          }}
        >
          <Typography variant="caption" sx={{ width: 60, textAlign: "center" }}>
            번호
          </Typography>
          <Typography variant="caption" sx={{ width: 80, textAlign: "center" }}>
            저장
          </Typography>
          <Typography variant="caption" sx={{ flex: 1 }}>
            data
          </Typography>
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
              const globalIndex = (currentPage - 1) * itemsPerPage + index;
              const isSelected = selectedGameIndex === globalIndex;

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
                  }}
                >
                  <Typography variant="body2" sx={{ width: 60, textAlign: "center" }}>
                    {game.game_seq}
                  </Typography>
                  <Typography variant="caption" sx={{ width: 80, textAlign: "center", color: "text.secondary" }}>
                    {game.date ? new Date(game.date).toLocaleDateString().slice(2) : "-"}
                  </Typography>
                  <Box sx={{ flex: 1, display: "flex", gap: "2px", flexWrap: "wrap" }}>
                    {game.shoes ? (
                      game.shoes.split("").map((char, i) => (
                        <Box
                          key={i}
                          sx={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            backgroundColor: char === "P" ? "#1565c0" : "#f44336",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: "bold",
                            color: "#fff",
                          }}
                        >
                          {char}
                        </Box>
                      ))
                    ) : (
                      "-"
                    )}
                  </Box>
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

        {/* 페이지네이션 */}
        <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 0.5,
              p: 1,
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}
          >
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
      </Paper>
    </Box>
  );
}
