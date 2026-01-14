import { useState, useEffect, useRef } from "react";
import { Box, Typography, Paper, IconButton, TextField } from "@mui/material";
import { ArrowBack, ArrowForward } from "@mui/icons-material";

// 원 컴포넌트 (패턴 표시용)
const Circle = ({ type, filled = true, size = 24 }) => {
  const colors = {
    P: "#1565c0",
    B: "#f44336",
  };

  if (!type) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.3)",
          backgroundColor: "transparent",
        }}
      />
    );
  }

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: filled ? colors[type] : "#fff",
        border: `2px solid ${colors[type]}`,
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

// Pick 원 컴포넌트 (두 개의 원 - 외곽선 + 내부 원)
const PickCircle = ({ type, size = 24 }) => {
  const colors = {
    P: "#3399fe",
    B: "#fe5050",
  };

  // 선택 안됨 - 회색 테두리
  if (!type) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            width: size * 0.5,
            height: size * 0.5,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.3)",
          }}
        />
      </Box>
    );
  }

  // P 또는 B 선택됨 - 테두리만 색칠, 중심은 비움
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${colors[type]}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          width: size * 0.5,
          height: size * 0.5,
          borderRadius: "50%",
          border: `2px solid ${colors[type]}`,
        }}
      />
    </Box>
  );
};

// 패턴 생성 함수 (128개)
const generatePatterns = (rangeNum) => {
  const patterns = [];
  for (let i = 0; i < 128; i++) {
    // 7비트 이진수로 변환 (B=0, P=1)
    const binary = i.toString(2).padStart(7, '0');
    const patternStr = 'BBBB' + binary.split('').map(b => b === '0' ? 'B' : 'P').join('');
    patterns.push({
      abbr: "",
      code: `${rangeNum}-${i + 1}`,
      pattern: patternStr,
    });
  }
  return patterns;
};

// 원 패턴 그리드 계산 (game-t1과 동일한 로직, 18컬럼용)
const calculateCircleGrid = (prevPicks, gridRows, gridCols) => {
  const grid = Array(gridRows)
    .fill(null)
    .map(() => Array(gridCols).fill(null));

  const picks = prevPicks ? prevPicks.split("") : [];
  if (picks.length === 0) return grid;

  let col = 0;
  let row = 0;
  let prevValue = null;
  let verticalStartCol = 0;
  let isBent = false;

  for (let i = 0; i < picks.length; i++) {
    const current = picks[i];

    if (prevValue === null) {
      grid[row][col] = { type: current, filled: true };
      verticalStartCol = col;
    } else if (current === prevValue) {
      if (isBent) {
        col++;
      } else if (row >= gridRows - 1) {
        col++;
        isBent = true;
      } else if (grid[row + 1][col]) {
        col++;
        isBent = true;
      } else {
        row++;
      }
      if (col >= gridCols) break;
      grid[row][col] = { type: current, filled: true };
    } else {
      verticalStartCol++;
      col = verticalStartCol;
      row = 0;
      isBent = false;
      if (col >= gridCols) break;
      grid[row][col] = { type: current, filled: true };
    }

    prevValue = current;
  }

  return grid;
};

export default function PickManagementPage() {
  const [formatRange, setFormatRange] = useState(1); // 1-1~1-128, 2-1~2-128, etc.
  const [fetchCode, setFetchCode] = useState("");
  const [selectedTab, setSelectedTab] = useState("1pick");
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState(null); // 선택된 패턴
  const [dlNickname, setDlNickname] = useState(""); // DL 표시용 약칭
  const [scrollTargetCode, setScrollTargetCode] = useState(null); // 스크롤 대상 코드
  const [currentPick1, setCurrentPick1] = useState(null); // 현재 1pick 예측
  const rowRefs = useRef({}); // 행 refs

  // API에서 picks2 데이터 로드
  useEffect(() => {
    const fetchPatterns = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v1/picks2/list/${formatRange}`);
        if (response.ok) {
          const data = await response.json();
          setPatterns(data);
        } else {
          // API 실패 시 빈 배열 또는 생성된 패턴 사용
          setPatterns(generatePatterns(formatRange));
        }
      } catch (error) {
        console.error("Failed to fetch patterns:", error);
        // 에러 시 생성된 패턴 사용
        setPatterns(generatePatterns(formatRange));
      }
      setLoading(false);
    };

    fetchPatterns();
  }, [formatRange]);

  // 스크롤 대상으로 이동
  useEffect(() => {
    if (scrollTargetCode && rowRefs.current[scrollTargetCode]) {
      setTimeout(() => {
        rowRefs.current[scrollTargetCode]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  }, [scrollTargetCode, patterns]);

  const handlePrevFormat = () => {
    setFormatRange(formatRange === 1 ? 16 : formatRange - 1);
  };

  const handleNextFormat = () => {
    setFormatRange(formatRange === 16 ? 1 : formatRange + 1);
  };

  // 패턴 클릭 핸들러
  const handlePatternClick = (item) => {
    const code = item.code1 ? `${item.code1}-${item.code2}` : item.code;
    const prevPicks = item.prev_picks || item.pattern || "";
    const nickname = item.shortname || item.nickname || item.abbr || "";
    const pick1 = item.next_pick_1 || null;

    setFetchCode(code);
    setDlNickname(nickname);
    setSelectedPattern(prevPicks);
    setScrollTargetCode(code); // 하이라이트 표시
    setCurrentPick1(pick1); // 1pick 예측 설정
  };

  // 가져오기 버튼 핸들러
  const handleFetchByCode = async () => {
    if (!fetchCode) return;

    // "1-29" 형식 파싱
    const parts = fetchCode.split("-");
    if (parts.length !== 2) {
      alert("올바른 형식으로 입력해주세요 (예: 1-29)");
      return;
    }

    const code1 = parseInt(parts[0], 10);
    const code2 = parseInt(parts[1], 10);

    if (isNaN(code1) || isNaN(code2)) {
      alert("올바른 숫자를 입력해주세요");
      return;
    }

    try {
      const response = await fetch(`/api/v1/picks2/code/${code1}/${code2}`);
      if (response.ok) {
        const data = await response.json();
        const prevPicks = data.prev_picks || "";
        const nickname = data.shortname || data.nickname || "";
        const pick1 = data.next_pick_1 || null;

        setDlNickname(nickname);
        setSelectedPattern(prevPicks);
        setCurrentPick1(pick1); // 1pick 예측 설정

        // 스크롤 대상 설정
        setScrollTargetCode(`${code1}-${code2}`);

        // 해당 범위로 이동
        if (code1 !== formatRange) {
          setFormatRange(code1);
        }
      } else {
        alert("패턴을 찾을 수 없습니다");
      }
    } catch (error) {
      console.error("Failed to fetch pattern:", error);
      alert("패턴 로딩 실패");
    }
  };

  // DL 약칭 저장 (blur 시)
  const handleDlBlur = async () => {
    if (!fetchCode) return;

    const parts = fetchCode.split("-");
    if (parts.length !== 2) return;

    const code1 = parseInt(parts[0], 10);
    const code2 = parseInt(parts[1], 10);
    if (isNaN(code1) || isNaN(code2)) return;

    try {
      const response = await fetch(`/api/v1/picks2/code/${code1}/${code2}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortname: dlNickname }),
      });

      if (response.ok) {
        // 로컬 데이터 직접 업데이트
        setPatterns(prev => prev.map(p => {
          const pCode = p.code1 ? `${p.code1}-${p.code2}` : p.code;
          if (pCode === fetchCode) {
            return { ...p, shortname: dlNickname, nickname: dlNickname };
          }
          return p;
        }));
      }
    } catch (error) {
      console.error("Failed to save nickname:", error);
    }
  };

  // 1pick 저장 (P/B 버튼 클릭)
  const handleSavePick1 = async (pick) => {
    if (!fetchCode) return;

    const parts = fetchCode.split("-");
    if (parts.length !== 2) return;

    const code1 = parseInt(parts[0], 10);
    const code2 = parseInt(parts[1], 10);
    if (isNaN(code1) || isNaN(code2)) return;

    try {
      const response = await fetch(`/api/v1/picks2/code/${code1}/${code2}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next_pick_1: pick }),
      });

      if (response.ok) {
        setCurrentPick1(pick);
        // 로컬 데이터 업데이트
        setPatterns(prev => prev.map(p => {
          const pCode = p.code1 ? `${p.code1}-${p.code2}` : p.code;
          if (pCode === fetchCode) {
            return { ...p, next_pick_1: pick };
          }
          return p;
        }));
      }
    } catch (error) {
      console.error("Failed to save 1pick:", error);
    }
  };

  // 예측 삭제
  const handleDeletePick1 = async () => {
    if (!fetchCode) return;

    const parts = fetchCode.split("-");
    if (parts.length !== 2) return;

    const code1 = parseInt(parts[0], 10);
    const code2 = parseInt(parts[1], 10);
    if (isNaN(code1) || isNaN(code2)) return;

    try {
      const response = await fetch(`/api/v1/picks2/code/${code1}/${code2}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next_pick_1: null }),
      });

      if (response.ok) {
        setCurrentPick1(null);
        // 로컬 데이터 업데이트
        setPatterns(prev => prev.map(p => {
          const pCode = p.code1 ? `${p.code1}-${p.code2}` : p.code;
          if (pCode === fetchCode) {
            return { ...p, next_pick_1: null };
          }
          return p;
        }));
      }
    } catch (error) {
      console.error("Failed to delete 1pick:", error);
    }
  };

  const GRID_ROWS = 6;
  const GRID_COLS = 18;

  // 그리드 계산
  const grid = calculateCircleGrid(selectedPattern, GRID_ROWS, GRID_COLS);

  // 전체 너비 계산: 격자(18*28 + 17gap + 2border) + gap(24) + 컨트롤영역
  const CONTENT_WIDTH = 850;

  return (
    <Box sx={{ p: 2, height: "calc(100vh - 164px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* 상단 영역 */}
      <Box sx={{ flexShrink: 0, width: CONTENT_WIDTH }}>
      {/* 격자 + 입력 컨트롤 */}
      <Box sx={{ display: "flex", gap: 3, mb: 2, alignItems: "stretch" }}>
        {/* 좌측: 격자 (18x6) */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${GRID_COLS}, 28px)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, 28px)`,
            gap: "1px",
            backgroundColor: "#fff",
            border: "1px solid #fff",
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
                {cell && <Circle type={cell.type} filled={cell.filled} size={24} />}
              </Box>
            ))
          )}
        </Box>

        {/* 우측: 입력 컨트롤 */}
        <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", width: 300 }}>
          {/* 상단: Row 1 + Row 2 */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {/* Row 1: P, B, 예측 삭제 */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
            <Box
              onClick={() => handleSavePick1("P")}
              sx={{
                width: 80,
                height: 45,
                borderRadius: 2,
                backgroundColor: currentPick1 === "P" ? "#1565c0" : "#9e9e9e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 20,
                fontWeight: "bold",
                cursor: fetchCode ? "pointer" : "default",
                opacity: fetchCode ? 1 : 0.5,
                "&:hover": fetchCode ? { opacity: 0.8 } : {},
              }}
            >
              P
            </Box>
            <Box
              onClick={() => handleSavePick1("B")}
              sx={{
                width: 80,
                height: 45,
                borderRadius: 2,
                backgroundColor: currentPick1 === "B" ? "#f44336" : "#9e9e9e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 20,
                fontWeight: "bold",
                cursor: fetchCode ? "pointer" : "default",
                opacity: fetchCode ? 1 : 0.5,
                "&:hover": fetchCode ? { opacity: 0.8 } : {},
              }}
            >
              B
            </Box>
            <Box
              onClick={handleDeletePick1}
              sx={{
                flex: 1,
                height: 45,
                border: "2px solid rgba(255,255,255,0.5)",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: fetchCode && currentPick1 ? "pointer" : "default",
                opacity: fetchCode && currentPick1 ? 1 : 0.5,
                "&:hover": fetchCode && currentPick1 ? { backgroundColor: "rgba(255,255,255,0.1)" } : {},
              }}
            >
              <Typography>예측 삭제</Typography>
            </Box>
          </Box>

          {/* Row 2: 입력필드, 가져오기, DL */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
            <TextField
              size="small"
              placeholder="1-1"
              value={fetchCode}
              onChange={(e) => setFetchCode(e.target.value)}
              sx={{
                width: 100,
                "& .MuiOutlinedInput-root": {
                  height: 45,
                  borderRadius: 2,
                  "& fieldset": {
                    borderColor: "#1565c0",
                    borderWidth: 2,
                  },
                  "&:hover fieldset": {
                    borderColor: "#1976d2",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#1565c0",
                  },
                },
                "& .MuiInputBase-input": {
                  textAlign: "center",
                  fontSize: 18,
                },
              }}
            />
            <Box
              onClick={handleFetchByCode}
              sx={{
                height: 45,
                border: "2px solid #4caf50",
                borderRadius: 2,
                px: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                "&:hover": { backgroundColor: "rgba(76,175,80,0.1)" },
              }}
            >
              <Typography sx={{ color: "#fff", whiteSpace: "nowrap" }}>가져오기</Typography>
            </Box>
            <TextField
              size="small"
              placeholder="DL"
              value={dlNickname}
              onChange={(e) => setDlNickname(e.target.value)}
              onBlur={handleDlBlur}
              sx={{
                flex: 1,
                "& .MuiOutlinedInput-root": {
                  height: 45,
                  borderRadius: 2,
                  "& fieldset": {
                    borderColor: "rgba(255,255,255,0.5)",
                    borderWidth: 2,
                  },
                  "&:hover fieldset": {
                    borderColor: "rgba(255,255,255,0.7)",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "rgba(255,255,255,0.8)",
                  },
                },
                "& .MuiInputBase-input": {
                  textAlign: "center",
                  fontSize: 14,
                },
              }}
            />
          </Box>
          </Box>

          {/* Row 3: P/B 퍼센트 표시 - P | P% | B% | B */}
          <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1.5, mt: 2, width: "100%" }}>
            <Box
              sx={{
                width: 55,
                height: 55,
                borderRadius: 2,
                border: "3px solid #0d47a1",
                backgroundColor: "#3399fe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 24,
                fontWeight: "bold",
              }}
            >
              P
            </Box>
            <Box sx={{ display: "flex", flex: 1 }}>
              <Box
                sx={{
                  flex: 1,
                  height: 55,
                  backgroundColor: "#3399fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography sx={{ color: "#fff", fontSize: 16 }}>-%</Typography>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  height: 55,
                  backgroundColor: "#fe5050",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography sx={{ color: "#fff", fontSize: 16 }}>-%</Typography>
              </Box>
            </Box>
            <Box
              sx={{
                width: 55,
                height: 55,
                borderRadius: 2,
                border: "3px solid #b71c1c",
                backgroundColor: "#fe5050",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 24,
                fontWeight: "bold",
              }}
            >
              B
            </Box>
          </Box>
        </Box>
      </Box>

      {/* 서식 범위 선택 */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <IconButton size="small" onClick={handlePrevFormat}>
          <ArrowBack />
        </IconButton>
        <Box
          sx={{
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 1,
            px: 2,
            py: 0.5,
            minWidth: 120,
            textAlign: "center",
          }}
        >
          <Typography variant="body2">{formatRange}-1~{formatRange}-128</Typography>
        </Box>
        <IconButton size="small" onClick={handleNextFormat}>
          <ArrowForward />
        </IconButton>
      </Box>
      </Box>

      {/* 패턴 테이블 */}
      <Paper sx={{ backgroundColor: "background.paper", overflow: "hidden", flex: 1, display: "flex", flexDirection: "column", width: CONTENT_WIDTH }}>
        {/* 테이블 헤더 - 고정 */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 1,
            borderBottom: "1px solid rgba(255,255,255,0.2)",
            backgroundColor: "rgba(255,255,255,0.05)",
          }}
        >
          <Typography variant="caption" sx={{ width: 45, textAlign: "center" }}>약칭</Typography>
          <Typography variant="caption" sx={{ width: 50, textAlign: "center" }}>번호</Typography>
          <Typography variant="caption" sx={{ width: 250, textAlign: "center" }}>패턴</Typography>
          <Box sx={{ width: 36, textAlign: "center", border: "2px solid #4caf50", borderRadius: 1, py: 0.5, backgroundColor: "rgba(76, 175, 80, 0.15)" }}>
            <Typography variant="caption" sx={{ color: "#4caf50", fontWeight: "bold" }}>1pick</Typography>
          </Box>
          <Box sx={{ width: 85, textAlign: "center", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 1, py: 0.5 }}>
            <Typography variant="caption">3pick</Typography>
          </Box>
          <Box sx={{ width: 170, textAlign: "center", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 1, py: 0.5 }}>
            <Typography variant="caption">6pick</Typography>
          </Box>
        </Box>

        {/* 테이블 바디 - 스크롤 영역 */}
        <Box sx={{ flex: 1, overflowY: "auto" }}>
        {patterns.map((item, idx) => {
          // API 응답 또는 생성된 패턴 둘 다 지원
          const nickname = item.nickname || item.abbr || "";
          const code = item.code1 ? `${item.code1}-${item.code2}` : item.code;
          const prevPicks = item.prev_picks || item.pattern || "";
          const pick1 = item.next_pick_1 || null;
          const pick3 = item.next_pick_3 || "";
          const pick6 = item.next_pick_6 || "";

          return (
            <Box
              key={idx}
              ref={(el) => (rowRefs.current[code] = el)}
              onClick={() => handlePatternClick(item)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                p: 1,
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                backgroundColor: scrollTargetCode === code ? "rgba(51, 153, 254, 0.15)" : "transparent",
                cursor: "pointer",
                "&:hover": { backgroundColor: "rgba(255,255,255,0.08)" },
              }}
            >
              <Typography variant="body2" sx={{ width: 45, textAlign: "center" }}>{nickname}</Typography>
              <Typography variant="body2" sx={{ width: 50, textAlign: "center" }}>{code}</Typography>
              <Box sx={{ width: 250, display: "flex", gap: 0.3 }}>
                {prevPicks.split("").map((p, i) => (
                  <Circle key={i} type={p} filled={true} size={20} />
                ))}
              </Box>
              {/* 1pick (1개) */}
              <Box sx={{ width: 36, display: "flex", justifyContent: "center", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 1, py: 0.5 }}>
                <PickCircle type={pick1} size={20} />
              </Box>
              {/* 3pick (3개) */}
              <Box sx={{ width: 85, display: "flex", justifyContent: "center", gap: 0.5, border: "1px solid rgba(255,255,255,0.2)", borderRadius: 1, py: 0.5 }}>
                <PickCircle type={pick3[0] || null} size={20} />
                <PickCircle type={pick3[1] || null} size={20} />
                <PickCircle type={pick3[2] || null} size={20} />
              </Box>
              {/* 6pick (6개) */}
              <Box sx={{ width: 170, display: "flex", justifyContent: "center", gap: 0.5, border: "1px solid rgba(255,255,255,0.2)", borderRadius: 1, py: 0.5 }}>
                <PickCircle type={pick6[0] || null} size={20} />
                <PickCircle type={pick6[1] || null} size={20} />
                <PickCircle type={pick6[2] || null} size={20} />
                <PickCircle type={pick6[3] || null} size={20} />
                <PickCircle type={pick6[4] || null} size={20} />
                <PickCircle type={pick6[5] || null} size={20} />
              </Box>
            </Box>
          );
        })}
        </Box>
      </Paper>

      {/* 하단 안내 */}
      <Box sx={{ mt: 1, flexShrink: 0 }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          * 번호 클릭 시 패턴이 격자에 표시됩니다. 코드 입력 후 "가져오기"로 특정 패턴을 불러올 수 있습니다.
        </Typography>
      </Box>
    </Box>
  );
}
