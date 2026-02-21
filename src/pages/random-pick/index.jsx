import { useState, useEffect } from "react";
import { Box, Typography, IconButton, Paper, useTheme, useMediaQuery } from "@mui/material";
import ArrowBack from "@mui/icons-material/ArrowBack";
import ArrowForward from "@mui/icons-material/ArrowForward";
import {
  getPresets, updatePreset, getPicks, getPickDetail,
  generatePicks, generateMatches, addMatch, resetMatches, updatePickSettings, toggleApprovePick, deletePick,
  refreshStats,
} from "@/services/random-pick-services";

const GRID_ROWS = 6;
const GRID_COLS = 42;

const PATTERN_LENGTH_OPTIONS = [0, 9, 11, 15, 16, 20];
const MAX_LINES_OPTIONS = [0, 30, 36, 42, 48];
const SAME_STREAK_OPTIONS = [0, 6, 7, 8, 9, 10];
const REPEAT_OPTIONS = [0, 6, 7, 8, 9, 10];
const LOSE_STREAK_OPTIONS = [0, 2, 3, 4, 5, 6, 7, 8, 9];
const MARGIN_OPTIONS = [0, -3, -4, -5, -6, -7, -8, -9, -10];
const WAIT_OPTIONS = [0, 1, 2, 3, 4, 5];
const PICK_COUNT_OPTIONS = [10, 50, 100, 500, 1000];

// ========== 공통 컴포넌트 ==========

const Circle = ({ type, size = 24, label }) => {
  const colors = { P: "#1565c0", B: "#f44336" };
  return (
    <Box
      sx={{
        width: size, height: size, borderRadius: "50%",
        backgroundColor: colors[type], border: "2px solid", borderColor: colors[type],
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: label != null ? size * 0.35 : size * 0.4, fontWeight: "bold", color: "#fff",
      }}
    >
      {label != null ? label : type}
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
      grid[row][col] = { type: current, turn: i + 1 };
      verticalStartCol = col;
    } else if (current === prevValue) {
      if (isBent) col++;
      else if (row >= GRID_ROWS - 1) { col++; isBent = true; }
      else if (grid[row + 1][col]) { col++; isBent = true; }
      else row++;
      if (col >= GRID_COLS) break;
      grid[row][col] = { type: current, turn: i + 1 };
    } else {
      verticalStartCol++;
      col = verticalStartCol;
      row = 0;
      isBent = false;
      if (col >= GRID_COLS) break;
      grid[row][col] = { type: current, turn: i + 1 };
    }
    prevValue = current;
  }
  return grid;
};

// 매칭별 연패 계산 (4연패 이상)
const calcMatchStreaks = (pickShoes, matchShoes, gameSettings) => {
  if (!pickShoes || !matchShoes) return {};
  const pArr = pickShoes.split("").filter((c) => c === "P" || c === "B");
  const mArr = matchShoes.split("").filter((c) => c === "P" || c === "B");
  const maxLen = Math.min(pArr.length, mArr.length, 60);
  const s = gameSettings || {};
  const loseTrigger = s.lose_streak_trigger || 0;
  const marginTrigger = s.margin_trigger || 0;
  const reversePick = s.reverse_pick || false;
  const waitRounds = s.wait_rounds || 0;

  let curLose = 0, curMargin = 0, waitRem = 0, isRev = false, lastTrig = 0;
  const streaks = {};
  for (let i = 4; i < maxLen; i++) {
    if (waitRem > 0) { waitRem--; continue; }
    let predict = pArr[i];
    if (isRev) predict = predict === "P" ? "B" : "P";
    const isHit = predict === mArr[i];
    if (isHit) {
      if (curLose >= 4) streaks[curLose] = (streaks[curLose] || 0) + 1;
      curLose = 0; lastTrig = 0;
    } else { curLose++; }
    curMargin += isHit ? 1 : -1;
    let loseTrig2 = false;
    if (loseTrigger > 0 && curLose - lastTrig >= loseTrigger) { loseTrig2 = true; lastTrig = curLose; }
    const marginTrig2 = marginTrigger < 0 && curMargin <= marginTrigger;
    if (loseTrig2 || marginTrig2) { if (reversePick) isRev = true; else if (loseTrig2 && waitRounds > 0) waitRem = waitRounds; }
  }
  if (curLose >= 4) streaks[curLose] = (streaks[curLose] || 0) + 1;
  return streaks;
};

const BigRoadGrid = ({ shoes, isMobile, comparison, missStreakTurns, showTurnNum, hoveredTurn, onHoverTurn }) => {
  const grid = calculateCircleGrid(shoes);
  return (
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
      {grid.map((row, ri) =>
        row.map((cell, ci) => {
          let cellBg = "background.default";
          if (comparison && cell) {
            const r = comparison[cell.turn];
            if (r === "hit") cellBg = "#4caf50";
            else if (r === "miss") cellBg = "#ffeb3b";
            else if (r === "rev_hit") cellBg = "#00897b";
            else if (r === "rev_miss") cellBg = "#ffa726";
          }
          const isHovered = cell && hoveredTurn != null && cell.turn === hoveredTurn;
          return (
            <Box
              key={`${ri}-${ci}`}
              onMouseEnter={() => cell && onHoverTurn && onHoverTurn(cell.turn)}
              onMouseLeave={() => onHoverTurn && onHoverTurn(null)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: cellBg,
                boxShadow: missStreakTurns && cell && missStreakTurns.has(cell.turn)
                  ? "inset 0 0 0 2px #f44336"
                  : "none",
                outline: isHovered ? "2px solid #00ff00" : "none",
                zIndex: isHovered ? 2 : "auto",
                position: isHovered ? "relative" : "static",
              }}
            >
              {cell && (
                <Circle
                  type={cell.type}
                  size={isMobile ? 12 : 22}
                  label={showTurnNum ? cell.turn % 100 : undefined}
                />
              )}
            </Box>
          );
        })
      )}
    </Box>
  );
};

const ConditionChip = ({ label, active, onClick, small }) => (
  <Box
    onClick={onClick}
    sx={{
      border: active ? "1px solid #4caf50" : "1px solid rgba(255,255,255,0.3)",
      borderRadius: 0.5,
      px: small ? 0.75 : 1,
      py: 0.25,
      cursor: "pointer",
      backgroundColor: active ? "rgba(76, 175, 80, 0.2)" : "transparent",
      "&:hover": {
        backgroundColor: active ? "rgba(76, 175, 80, 0.3)" : "rgba(255,255,255,0.1)",
      },
    }}
  >
    <Typography
      variant="caption"
      sx={{ fontSize: small ? "0.6rem" : "0.7rem", color: active ? "#4caf50" : "text.primary" }}
    >
      {label}
    </Typography>
  </Box>
);

const ActionBtn = ({ label, onClick, color, active, disabled }) => (
  <Box
    onClick={disabled ? undefined : onClick}
    sx={{
      px: 1,
      py: 0.25,
      textAlign: "center",
      border: active ? `1px solid ${color || "#4caf50"}` : "1px solid rgba(255,255,255,0.3)",
      borderRadius: 0.5,
      cursor: disabled ? "default" : "pointer",
      backgroundColor: active ? `${color || "#4caf50"}33` : "transparent",
      opacity: disabled ? 0.5 : 1,
      "&:hover": disabled ? {} : { backgroundColor: "rgba(255,255,255,0.1)" },
    }}
  >
    <Typography variant="caption" sx={{ fontSize: "0.65rem", color: color || "text.primary" }}>
      {label}
    </Typography>
  </Box>
);

// ========== 메인 페이지 ==========

export default function RandomPickPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [presets, setPresets] = useState([]);
  const [presetIndex, setPresetIndex] = useState(0);
  const [picks, setPicks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPickIndex, setSelectedPickIndex] = useState(null);
  const [pickDetail, setPickDetail] = useState(null);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(null);
  const [hoveredTurn, setHoveredTurn] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [matchLoading, setMatchLoading] = useState({});
  const [dirtyPicks, setDirtyPicks] = useState(new Set()); // 게임설정 변경된 픽
  const [matchStreakFilter, setMatchStreakFilter] = useState(null); // 매칭 연패 필터
  const [matchPage, setMatchPage] = useState(1);
  const [matchTotalPages, setMatchTotalPages] = useState(1);
  const [matchTotalCount, setMatchTotalCount] = useState(0);

  const [pageSize, setPageSize] = useState(20);
  const currentPreset = presets[presetIndex] || null;
  const selectedPick = selectedPickIndex !== null ? picks[selectedPickIndex] : null;
  const selectedMatch = pickDetail?.matches?.[selectedMatchIndex] || null;

  // 프리셋 로드
  useEffect(() => {
    (async () => {
      try {
        const res = await getPresets();
        setPresets(res.data);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // 프리셋 변경 시 픽 목록 로드
  useEffect(() => {
    if (currentPreset) fetchPicks(1);
    else { setPicks([]); setTotalCount(0); setTotalPages(1); }
    setCurrentPage(1);
    setSelectedPickIndex(null);
    setPickDetail(null);
    setSelectedMatchIndex(null);
  }, [currentPreset?.preset_seq]);

  // 페이지 변경 시 로드
  useEffect(() => {
    if (currentPreset) fetchPicks(currentPage);
  }, [currentPage, pageSize]);

  const fetchPicks = async (page) => {
    if (!currentPreset) return;
    setLoading(true);
    try {
      const res = await getPicks(currentPreset.preset_seq, page, pageSize);
      setPicks(res.data.items || []);
      setTotalPages(res.data.total_pages || 1);
      setTotalCount(res.data.total_count || 0);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // ========== 프리셋 네비게이션 ==========

  const navigatePreset = async (newIndex) => {
    // 프리셋 전환 시 DB에서 다시 불러와서 로컬 변경 초기화
    try {
      const res = await getPresets();
      setPresets(res.data);
    } catch (e) {}
    setPresetIndex(newIndex);
  };

  const handlePrevPreset = () => {
    navigatePreset(presetIndex > 0 ? presetIndex - 1 : presets.length - 1);
  };

  const handleNextPreset = () => {
    navigatePreset(presetIndex < presets.length - 1 ? presetIndex + 1 : 0);
  };

  // ========== 픽 상세 보기 ==========

  const fetchMatchPage = async (pickSeq, pg = 1, sf = matchStreakFilter) => {
    try {
      const res = await getPickDetail(pickSeq, pg, 100, sf);
      setPickDetail(res.data);
      setMatchPage(pg);
      setMatchTotalPages(res.data.total_pages || 1);
      setMatchTotalCount(res.data.total_count || 0);
      setSelectedMatchIndex(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePickView = async (index) => {
    if (selectedPickIndex === index) {
      setSelectedPickIndex(null);
      setPickDetail(null);
      setSelectedMatchIndex(null);
      return;
    }
    setSelectedPickIndex(index);
    setSelectedMatchIndex(null);
    setMatchStreakFilter(null);
    const pick = picks[index];
    if (pick) {
      await fetchMatchPage(pick.pick_seq, 1, null);
    }
  };

  // ========== 액션 ==========

  const handleGeneratePicks = async () => {
    if (!currentPreset || generating) return;
    setGenerating(true);
    try {
      // 조건설정 DB 저장 후 픽 생성
      await updatePreset(currentPreset.preset_seq, {
        pattern_length: currentPreset.pattern_length,
        max_lines: currentPreset.max_lines,
        max_same_streak: currentPreset.max_same_streak,
        repeat_alt: currentPreset.repeat_alt,
        repeat_pair: currentPreset.repeat_pair,
        repeat_21: currentPreset.repeat_21,
        repeat_12: currentPreset.repeat_12,
      });
      const res = await generatePicks(currentPreset.preset_seq, 0);
      alert(`${res.data.count}개 픽 생성`);
      fetchPicks(1);
      setCurrentPage(1);
    } catch (e) {
      alert("픽 생성 실패");
    }
    setGenerating(false);
  };

  const handleGenerateMatches = async (e, pickSeq) => {
    e.stopPropagation();
    if (matchLoading[pickSeq]) return;
    const needReset = dirtyPicks.has(pickSeq);
    setMatchLoading((prev) => ({ ...prev, [pickSeq]: true }));
    try {
      const res = await generateMatches(pickSeq, 1000, needReset);
      alert(`${res.data.count}개 매칭 ${needReset ? "리셋 후 " : ""}생성`);
      // dirty 플래그 해제
      setDirtyPicks((prev) => { const s = new Set(prev); s.delete(pickSeq); return s; });
      fetchPicks(currentPage);
      if (selectedPick?.pick_seq === pickSeq) {
        await fetchMatchPage(pickSeq, 1, matchStreakFilter);
      }
    } catch (err) {
      alert("매칭 생성 실패");
    }
    setMatchLoading((prev) => ({ ...prev, [pickSeq]: false }));
  };

  const handleResetMatches = async (pickSeq) => {
    if (!confirm("매칭을 모두 삭제하시겠습니까?")) return;
    try {
      const res = await resetMatches(pickSeq);
      alert(`${res.data.deleted}개 매칭 삭제`);
      fetchPicks(currentPage);
      setMatchStreakFilter(null);
      await fetchMatchPage(pickSeq, 1, null);
    } catch (err) {
      alert("매칭 삭제 실패");
    }
  };

  const handleToggleApprove = async (e, pickSeq) => {
    e.stopPropagation();
    try {
      await toggleApprovePick(pickSeq);
      fetchPicks(currentPage);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelePick = async (e, pickSeq) => {
    e.stopPropagation();
    if (!confirm("퇴출하시겠습니까?")) return;
    try {
      await deletePick(pickSeq);
      fetchPicks(currentPage);
      if (selectedPick?.pick_seq === pickSeq) {
        setSelectedPickIndex(null);
        setPickDetail(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ========== 조건 설정 사이클 ==========

  const cycleOption = (field, options) => {
    if (!currentPreset) return;
    const currentVal = currentPreset[field] ?? 0;
    const idx = options.indexOf(currentVal);
    const nextIdx = (idx + 1) % options.length;
    // 로컬 상태만 변경 (픽생성 시 DB 저장)
    setPresets((prev) =>
      prev.map((p) =>
        p.preset_seq === currentPreset.preset_seq
          ? { ...p, [field]: options[nextIdx] }
          : p
      )
    );
  };

  // ========== 픽별 게임설정 사이클 ==========

  const cyclePickOption = async (pickSeq, field, options) => {
    const pick = picks.find((p) => p.pick_seq === pickSeq);
    if (!pick) return;
    const currentVal = pick[field] ?? 0;
    const idx = options.indexOf(currentVal);
    const nextIdx = (idx + 1) % options.length;
    const newVal = options[nextIdx];
    // 로컬 즉시 반영
    setPicks((prev) => prev.map((p) => p.pick_seq === pickSeq ? { ...p, [field]: newVal } : p));
    // 설정 변경 플래그
    setDirtyPicks((prev) => new Set(prev).add(pickSeq));
    try {
      await updatePickSettings(pickSeq, { [field]: newVal });
    } catch (e) {
      console.error(e);
      fetchPicks(currentPage);
    }
  };

  const togglePickReverse = async (pickSeq) => {
    const pick = picks.find((p) => p.pick_seq === pickSeq);
    if (!pick) return;
    const newVal = !pick.reverse_pick;
    // 로컬 즉시 반영
    setPicks((prev) => prev.map((p) => p.pick_seq === pickSeq ? { ...p, reverse_pick: newVal } : p));
    // 설정 변경 플래그
    setDirtyPicks((prev) => new Set(prev).add(pickSeq));
    try {
      await updatePickSettings(pickSeq, { reverse_pick: newVal });
    } catch (e) {
      console.error(e);
      fetchPicks(currentPage);
    }
  };

  const handleRefreshStats = async () => {
    if (!currentPreset) return;
    try {
      await refreshStats(currentPreset.preset_seq);
      fetchPicks(currentPage);
    } catch (e) {
      console.error(e);
    }
  };

  // ========== 파생 데이터 ==========

  const pickShoesFull = pickDetail?.pick?.shoes || selectedPick?.shoes;
  const matchShoes = selectedMatch?.matched_shoes;

  // 픽은 60턴까지만 표시
  const pickShoes = (() => {
    if (!pickShoesFull) return "";
    const chars = pickShoesFull.split("").filter((c) => c === "P" || c === "B");
    return chars.slice(0, 60).join("");
  })();

  // 턴별 적중/미스 비교 (게임설정 반영: 연패/마진/반대픽/대기)
  const comparison = (() => {
    if (!pickShoes || !matchShoes) return null;
    const pickArr = pickShoes.split("").filter((c) => c === "P" || c === "B");
    const matchArr = matchShoes.split("").filter((c) => c === "P" || c === "B");
    const result = {};
    const maxLen = Math.min(pickArr.length, matchArr.length, 60);

    const s = selectedPick || {};
    const loseStreakTrigger = s.lose_streak_trigger || 0;
    const marginTrigger = s.margin_trigger || 0;
    const reversePick = s.reverse_pick || false;
    const waitRounds = s.wait_rounds || 0;

    let curLoseStreak = 0, curMargin = 0, waitRemaining = 0, isReversed = false;
    let lastTriggeredStreak = 0;

    for (let i = 0; i < maxLen; i++) {
      if (i < 4) { result[i + 1] = null; continue; }

      // 대기 중이면 스킵
      if (waitRemaining > 0) {
        waitRemaining--;
        result[i + 1] = "wait";
        continue;
      }

      // 반전 적용
      let predict = pickArr[i];
      if (isReversed) predict = predict === "P" ? "B" : "P";

      const isHit = predict === matchArr[i];
      if (isHit) { curLoseStreak = 0; lastTriggeredStreak = 0; }
      else { curLoseStreak++; }
      curMargin += isHit ? 1 : -1;
      result[i + 1] = isReversed ? (isHit ? "rev_hit" : "rev_miss") : (isHit ? "hit" : "miss");

      // 트리거 체크
      let loseTrig = false;
      if (loseStreakTrigger > 0 && curLoseStreak - lastTriggeredStreak >= loseStreakTrigger) {
        loseTrig = true;
        lastTriggeredStreak = curLoseStreak;
      }
      const marginTrig = marginTrigger < 0 && curMargin <= marginTrigger;
      if (loseTrig || marginTrig) {
        if (reversePick) isReversed = true;
        else if (loseTrig && waitRounds > 0) waitRemaining = waitRounds;
      }
    }
    return result;
  })();

  // 4연패 이상 턴 표시 (빨간 테두리용)
  const missStreakTurns = (() => {
    if (!comparison) return new Set();
    const set = new Set();
    let missTurns = [];
    for (let t = 5; t <= 60; t++) {
      const r = comparison[t];
      if (r === "miss" || r === "rev_miss") {
        missTurns.push(t);
      } else if (r === "wait") {
        // wait는 연패 카운트에서 무시 (끊지 않음)
        continue;
      } else {
        if (missTurns.length >= 4) for (const mt of missTurns) set.add(mt);
        missTurns = [];
      }
    }
    if (missTurns.length >= 4) for (const mt of missTurns) set.add(mt);
    return set;
  })();

  // ========== 렌더 ==========

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
      {/* 상단: 게임상황 (매칭 게임) 빅로드 - 적중/미스 배경색 */}
      <BigRoadGrid shoes={matchShoes || ""} isMobile={isMobile} comparison={comparison} missStreakTurns={missStreakTurns} showTurnNum hoveredTurn={hoveredTurn} onHoverTurn={setHoveredTurn} />
      {selectedMatch && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            #{selectedMatch.matched_game_seq}{" "}
            <span style={{ color: "#4caf50" }}>{selectedMatch.hits}</span>:
            <span style={{ color: "#ffeb3b" }}>{selectedMatch.misses}</span> (
            {selectedMatch.turns_compared}턴)
          </Typography>
        </Box>
      )}

      {/* 통계 라인: DB1: {count} + sel: {T:H:M} + game_seq */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {currentPreset && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            <span style={{ color: "#4caf50", fontWeight: "bold" }}>{currentPreset.name}</span>
            : <span style={{ color: "#fff" }}>{totalCount}</span>
          </Typography>
        )}
        {selectedPick && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            sel:
            <span style={{ color: "#fff" }}>{selectedPick.total_matches}</span>:
            <span style={{ color: "#4caf50" }}>{selectedPick.total_hits}</span>:
            <span style={{ color: "#ffeb3b" }}>{selectedPick.total_misses}</span>
          </Typography>
        )}
        {selectedPick && (
          <Box
            sx={{
              ml: "auto",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 1,
              px: 2,
              py: 0.5,
            }}
          >
            <Typography variant="body2">{selectedPick.game_seq}</Typography>
          </Box>
        )}
      </Box>

      {/* 하단: 선택된 픽 빅로드 */}
      <BigRoadGrid shoes={pickShoes || ""} isMobile={isMobile} showTurnNum hoveredTurn={hoveredTurn} onHoverTurn={setHoveredTurn} />

      {/* 프리셋 선택 + 조건 칩 + 게임 설정 */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        {/* 프리셋 화살표 선택 */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton size="small" onClick={handlePrevPreset} disabled={presets.length <= 1}>
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
            <Typography variant="body2">{currentPreset?.name || "-"}</Typography>
          </Box>
          <IconButton size="small" onClick={handleNextPreset} disabled={presets.length <= 1}>
            <ArrowForward sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* 조건 칩 (클릭 시 사이클) */}
        {currentPreset && (
          <>
            <ConditionChip label={`${currentPreset.min_turns}회`} active={true} onClick={() => {}} />
            <ConditionChip
              label={currentPreset.pattern_length > 0 ? `${currentPreset.pattern_length}패턴` : "패턴OFF"}
              active={currentPreset.pattern_length > 0}
              onClick={() => cycleOption("pattern_length", PATTERN_LENGTH_OPTIONS)}
            />
            <ConditionChip
              label={currentPreset.max_lines > 0 ? `${currentPreset.max_lines}라인` : "라인OFF"}
              active={currentPreset.max_lines > 0}
              onClick={() => cycleOption("max_lines", MAX_LINES_OPTIONS)}
            />
            <ConditionChip
              label={
                currentPreset.max_same_streak > 0
                  ? `동A${currentPreset.max_same_streak}`
                  : "동AOFF"
              }
              active={currentPreset.max_same_streak > 0}
              onClick={() => cycleOption("max_same_streak", SAME_STREAK_OPTIONS)}
            />
            <ConditionChip
              label={currentPreset.repeat_alt > 0 ? `PB${currentPreset.repeat_alt}` : "PB:off"}
              active={currentPreset.repeat_alt > 0}
              onClick={() => cycleOption("repeat_alt", REPEAT_OPTIONS)}
            />
            <ConditionChip
              label={currentPreset.repeat_pair > 0 ? `PPBB${currentPreset.repeat_pair}` : "PPBB:off"}
              active={currentPreset.repeat_pair > 0}
              onClick={() => cycleOption("repeat_pair", REPEAT_OPTIONS)}
            />
            <ConditionChip
              label={currentPreset.repeat_21 > 0 ? `PPB${currentPreset.repeat_21}` : "PPB:off"}
              active={currentPreset.repeat_21 > 0}
              onClick={() => cycleOption("repeat_21", REPEAT_OPTIONS)}
            />
            <ConditionChip
              label={currentPreset.repeat_12 > 0 ? `PBB${currentPreset.repeat_12}` : "PBB:off"}
              active={currentPreset.repeat_12 > 0}
              onClick={() => cycleOption("repeat_12", REPEAT_OPTIONS)}
            />
            <ConditionChip
              label={generating ? "생성중..." : "픽생성"}
              active={true}
              onClick={handleGeneratePicks}
            />
          </>
        )}

      </Box>

      {/* 픽 테이블 (픽 선택 시 숨김) */}
      <Paper sx={{ backgroundColor: "background.paper", overflow: "hidden", display: selectedPick ? "none" : "block" }}>
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
              px: 1, py: 0.25, fontSize: 11,
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
              px: 1, py: 0.25, fontSize: 11,
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
                  px: 1, py: 0.25, fontSize: 11, cursor: "pointer", borderRadius: 0.5,
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
              px: 1, py: 0.25, fontSize: 11,
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
              px: 1, py: 0.25, fontSize: 11,
              cursor: currentPage < totalPages ? "pointer" : "default",
              color: currentPage < totalPages ? "text.primary" : "text.disabled",
              "&:hover": currentPage < totalPages ? { backgroundColor: "rgba(255,255,255,0.1)" } : {},
            }}
          >
            {">>"}
          </Box>
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" sx={{ color: "#4caf50", fontWeight: "bold" }}>
            {currentPreset?.name} : {totalCount} Pick
          </Typography>
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
          <Typography variant="caption" sx={{ width: 60, textAlign: "center" }}>
            번호
          </Typography>
          <Typography variant="caption" sx={{ width: 65, textAlign: "center" }}>
            저장
          </Typography>
          <Typography variant="caption" sx={{ width: 50, textAlign: "center" }}>
            id
          </Typography>
          <Typography variant="caption" sx={{ width: 45, textAlign: "center" }}>
            match
          </Typography>
          <Typography variant="caption" sx={{ width: 40, textAlign: "center" }}>
            +1K
          </Typography>
          <Typography variant="caption" sx={{ width: 40, textAlign: "center" }}>
            리셋
          </Typography>
          <Typography variant="caption" sx={{ width: 40, textAlign: "center" }}>
            Del
          </Typography>
          <Typography variant="caption" sx={{ width: 35, textAlign: "center" }}>
            play
          </Typography>
          <Typography variant="caption" sx={{ flex: 1, textAlign: "center" }}>
            게임설정
          </Typography>
          <Typography variant="caption" sx={{ width: 45, textAlign: "center" }}>
            Data
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
          ) : picks.length > 0 ? (
            picks.map((pick, index) => {
              const isSelected = selectedPickIndex === index;
              return (
                <Box
                  key={pick.pick_seq}
                  onClick={() => handlePickView(index)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    p: 1,
                    cursor: "pointer",
                    backgroundColor: isSelected
                      ? "rgba(76, 175, 80, 0.2)"
                      : "transparent",
                    "&:hover": {
                      backgroundColor: isSelected
                        ? "rgba(76, 175, 80, 0.3)"
                        : "rgba(255,255,255,0.05)",
                    },
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    gap: 0.5,
                  }}
                >
                  {/* 번호 = game_seq */}
                  <Typography variant="caption" sx={{ width: 60, textAlign: "center" }}>
                    {pick.game_seq}
                  </Typography>
                  {/* 저장 = 날짜 */}
                  <Typography variant="caption" sx={{ width: 65, textAlign: "center", color: "text.secondary", fontSize: "0.6rem" }}>
                    {pick.created_at
                      ? new Date(pick.created_at).toLocaleDateString("ko-KR", { year: "2-digit", month: "numeric", day: "numeric" }).replace(/\s/g, " ")
                      : "-"}
                  </Typography>
                  {/* id */}
                  <Typography variant="caption" sx={{ width: 50, textAlign: "center", color: "text.secondary" }}>
                    admin
                  </Typography>
                  {/* match */}
                  <Typography variant="caption" sx={{ width: 45, textAlign: "center" }}>
                    {pick.total_matches}
                  </Typography>
                  {/* +1KG = 추가 생성 */}
                  <Box sx={{ width: 40, display: "flex", justifyContent: "center" }} onClick={(e) => e.stopPropagation()}>
                    <ActionBtn
                      label={matchLoading[pick.pick_seq] ? "..." : "+1K"}
                      onClick={(e) => handleGenerateMatches(e, pick.pick_seq)}
                      disabled={matchLoading[pick.pick_seq]}
                    />
                  </Box>
                  {/* 리셋 */}
                  <Box sx={{ width: 40, display: "flex", justifyContent: "center" }} onClick={(e) => e.stopPropagation()}>
                    <ActionBtn
                      label="리셋"
                      onClick={(e) => { e.stopPropagation(); handleResetMatches(pick.pick_seq); }}
                      color="#f44336"
                    />
                  </Box>
                  {/* Del */}
                  <Box sx={{ width: 40, display: "flex", justifyContent: "center" }} onClick={(e) => e.stopPropagation()}>
                    <ActionBtn
                      label="Dele"
                      onClick={(e) => handleDelePick(e, pick.pick_seq)}
                      color="#f44336"
                    />
                  </Box>
                  {/* play = 승인 토글 */}
                  <Box sx={{ width: 35, display: "flex", justifyContent: "center" }} onClick={(e) => e.stopPropagation()}>
                    <ActionBtn
                      label={pick.is_approved ? "ON" : "off"}
                      onClick={(e) => handleToggleApprove(e, pick.pick_seq)}
                      active={pick.is_approved}
                      color={pick.is_approved ? "#4caf50" : undefined}
                    />
                  </Box>
                  {/* 게임설정 */}
                  <Box sx={{ display: "flex", gap: 0.5, flex: 1, justifyContent: "center" }} onClick={(e) => e.stopPropagation()}>
                    <ConditionChip
                      label={pick.lose_streak_trigger > 0 ? `${pick.lose_streak_trigger}패시` : "사용안"}
                      active={pick.lose_streak_trigger > 0}
                      onClick={() => cyclePickOption(pick.pick_seq, "lose_streak_trigger", LOSE_STREAK_OPTIONS)}
                      small
                    />
                    <ConditionChip
                      label={pick.margin_trigger < 0 ? `마진${pick.margin_trigger}` : "사용안"}
                      active={pick.margin_trigger < 0}
                      onClick={() => cyclePickOption(pick.pick_seq, "margin_trigger", MARGIN_OPTIONS)}
                      small
                    />
                    <ConditionChip
                      label={pick.reverse_pick ? "반대픽" : "사용안"}
                      active={pick.reverse_pick}
                      onClick={() => togglePickReverse(pick.pick_seq)}
                      small
                    />
                    <ConditionChip
                      label={pick.wait_rounds > 0 ? `대기${pick.wait_rounds}` : "사용안"}
                      active={pick.wait_rounds > 0}
                      onClick={() => cyclePickOption(pick.pick_seq, "wait_rounds", WAIT_OPTIONS)}
                      small
                    />
                  </Box>
                  {/* Data = 보기 */}
                  <Box sx={{ width: 45, display: "flex", justifyContent: "center" }} onClick={(e) => e.stopPropagation()}>
                    <ActionBtn
                      label="보기"
                      onClick={(e) => handlePickView(index)}
                      active={isSelected}
                    />
                  </Box>
                </Box>
              );
            })
          ) : (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                픽 없음
              </Typography>
            </Box>
          )}
        </Box>

        {/* 하단: 페이지사이즈 + 통계갱신 */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 1,
            p: 1,
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "inherit",
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            {[5, 10, 20, 50].map((s) => (
              <option key={s} value={s} style={{ background: "#333" }}>{s}</option>
            ))}
          </select>
          <ActionBtn label="통계갱신" onClick={handleRefreshStats} />
        </Box>
      </Paper>

      {/* 매칭 결과 테이블 */}
      {pickDetail && (
        <Paper sx={{ backgroundColor: "background.paper", overflow: "hidden" }}>
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
            <Typography
              variant="caption"
              onClick={() => { setSelectedPickIndex(null); setPickDetail(null); setSelectedMatchIndex(null); setMatchStreakFilter(null); }}
              sx={{ cursor: "pointer", color: "#f44336", mr: 0.5 }}
            >
              ◀ 돌아가기
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: "bold" }}>
              매칭 ({matchTotalCount}건)
            </Typography>
            <ActionBtn label="+1KG" onClick={(e) => handleGenerateMatches(e, pickDetail.pick.pick_seq)} />
            <ActionBtn label="리셋" onClick={() => handleResetMatches(pickDetail.pick.pick_seq)} color="#f44336" />
            <input
              type="number"
              placeholder="게임번호"
              style={{ width: 70, fontSize: 11, padding: "2px 4px", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: 3 }}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && e.target.value) {
                  try {
                    const res = await addMatch(pickDetail.pick.pick_seq, Number(e.target.value));
                    e.target.value = "";
                    fetchPicks(currentPage);
                    await fetchMatchPage(pickDetail.pick.pick_seq, 1, matchStreakFilter);
                  } catch (err) {
                    alert(err.response?.data?.detail || "추가 실패");
                  }
                }
              }}
            />
            <Box sx={{ flex: 1 }} />
            <Typography variant="caption" sx={{ width: 55, textAlign: "center" }}>
              게임
            </Typography>
            <Typography variant="caption" sx={{ width: 35, textAlign: "center" }}>
              비교
            </Typography>
            <Typography variant="caption" sx={{ width: 35, textAlign: "center" }}>
              승
            </Typography>
            <Typography variant="caption" sx={{ width: 35, textAlign: "center" }}>
              패
            </Typography>
            <Typography variant="caption" sx={{ width: 50, textAlign: "center" }}>
              승률
            </Typography>
            {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, "15+"].map((n) => (
              <Box
                key={n}
                onClick={() => {
                  const newFilter = matchStreakFilter === n ? null : n;
                  setMatchStreakFilter(newFilter);
                  fetchMatchPage(pickDetail.pick.pick_seq, 1, newFilter);
                }}
                sx={{
                  width: n === "15+" ? 22 : 18,
                  textAlign: "center",
                  cursor: "pointer",
                  border: matchStreakFilter === n ? "1px solid #4caf50" : "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 0.5,
                  backgroundColor: matchStreakFilter === n ? "rgba(76, 175, 80, 0.2)" : "transparent",
                  color: matchStreakFilter === n ? "#4caf50" : (n === "15+" || n >= 7) ? "#f44336" : "text.primary",
                  "&:hover": { backgroundColor: matchStreakFilter === n ? "rgba(76, 175, 80, 0.3)" : "rgba(255,255,255,0.1)" },
                }}
              >
                <Typography variant="caption" sx={{ fontSize: 9 }}>{n}</Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ maxHeight: 200, overflow: "auto" }}>
            {pickDetail.matches.map((m, idx) => {
              const streaks = calcMatchStreaks(pickShoesFull, m.matched_shoes, selectedPick);
              const cnt15plus = Object.entries(streaks).filter(([k]) => Number(k) >= 15).reduce((s, [, v]) => s + v, 0);
              const isMatchSel = selectedMatchIndex === idx;
              const wr =
                m.hits + m.misses > 0
                  ? ((m.hits / (m.hits + m.misses)) * 100).toFixed(1)
                  : "-";
              return (
                <Box
                  key={m.match_seq}
                  onClick={() =>
                    setSelectedMatchIndex((prev) => (prev === idx ? null : idx))
                  }
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    p: 1,
                    cursor: "pointer",
                    backgroundColor: isMatchSel
                      ? "rgba(76, 175, 80, 0.2)"
                      : "transparent",
                    "&:hover": {
                      backgroundColor: isMatchSel
                        ? "rgba(76, 175, 80, 0.3)"
                        : "rgba(255,255,255,0.05)",
                    },
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    gap: 0.5,
                  }}
                >
                  <Box sx={{ flex: 1 }} />
                  <Typography
                    variant="caption"
                    sx={{ width: 55, textAlign: "center" }}
                  >
                    {m.matched_game_seq}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ width: 35, textAlign: "center", color: "text.secondary" }}
                  >
                    {m.turns_compared}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ width: 35, textAlign: "center", color: "#4caf50" }}
                  >
                    {m.hits}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ width: 35, textAlign: "center", color: "#ffeb3b" }}
                  >
                    {m.misses}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ width: 50, textAlign: "center", fontWeight: "bold" }}
                  >
                    {wr}%
                  </Typography>
                  {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((n) => (
                    <Typography
                      key={n}
                      variant="caption"
                      sx={{ width: 18, textAlign: "center", fontSize: 9, color: streaks[n] ? (n >= 7 ? "#f44336" : "#ffeb3b") : "text.secondary" }}
                    >
                      {streaks[n] || 0}
                    </Typography>
                  ))}
                  <Typography
                    variant="caption"
                    sx={{ width: 22, textAlign: "center", fontSize: 9, color: cnt15plus ? "#f44336" : "text.secondary", fontWeight: cnt15plus ? "bold" : "normal" }}
                  >
                    {cnt15plus}
                  </Typography>
                </Box>
              );
            })}
          </Box>
          {matchTotalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 1, gap: 1, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <ActionBtn label="◀" onClick={() => { if (matchPage > 1) fetchMatchPage(pickDetail.pick.pick_seq, matchPage - 1); }} />
              <Typography variant="caption">{matchPage} / {matchTotalPages}</Typography>
              <ActionBtn label="▶" onClick={() => { if (matchPage < matchTotalPages) fetchMatchPage(pickDetail.pick.pick_seq, matchPage + 1); }} />
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}
