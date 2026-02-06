import { useState, useEffect, useRef } from "react";
import { Box, Typography, Paper, IconButton, TextField, useMediaQuery, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { ArrowBack, ArrowForward } from "@mui/icons-material";

// 순회 순서: A1 → B1 → C1 → D1 → E1 → E2 → F1~F4 → G1~G8 → 1~8 → A1
// (9~16은 1~8의 거울상이므로 제외)
const FORMAT_SEQUENCE = [
  "A1", "B1", "C1", "D1",
  "E1", "E2",
  "F1", "F2", "F3", "F4",
  "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8",
  "1", "2", "3", "4", "5", "6", "7", "8"
];

// 각 code1별 패턴 정보
const PATTERN_CONFIG = {
  "A1": { length: 4, count: 16, offset: 0 },
  "B1": { length: 5, count: 32, offset: 0 },
  "C1": { length: 6, count: 64, offset: 0 },
  "D1": { length: 7, count: 128, offset: 0 },
  "E1": { length: 8, count: 128, offset: 0 },
  "E2": { length: 8, count: 128, offset: 128 },
  "F1": { length: 9, count: 128, offset: 0 },
  "F2": { length: 9, count: 128, offset: 128 },
  "F3": { length: 9, count: 128, offset: 256 },
  "F4": { length: 9, count: 128, offset: 384 },
  "G1": { length: 10, count: 128, offset: 0 },
  "G2": { length: 10, count: 128, offset: 128 },
  "G3": { length: 10, count: 128, offset: 256 },
  "G4": { length: 10, count: 128, offset: 384 },
  "G5": { length: 10, count: 128, offset: 512 },
  "G6": { length: 10, count: 128, offset: 640 },
  "G7": { length: 10, count: 128, offset: 768 },
  "G8": { length: 10, count: 128, offset: 896 },
};

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

// 거울상 패턴 생성 (P↔B 스왑)
const getMirrorPattern = (pattern) => {
  if (!pattern) return "";
  return pattern.split("").map(c => c === "P" ? "B" : "P").join("");
};

// 패턴 생성 함수
// code1이 숫자(1~16)면 11자리 패턴, 문자열(A1~G8)이면 4~10자리 패턴
const generatePatterns = (code1) => {
  const patterns = [];

  // A1~G8 (4~10자리 패턴)
  if (PATTERN_CONFIG[code1]) {
    const config = PATTERN_CONFIG[code1];
    for (let i = 0; i < config.count; i++) {
      const patternIndex = config.offset + i;
      const bits = patternIndex.toString(2).padStart(config.length, '0');
      const patternStr = bits.split('').map(b => b === '0' ? 'B' : 'P').join('');
      patterns.push({
        abbr: "",
        code: `${code1}-${i + 1}`,
        pattern: patternStr,
      });
    }
    return patterns;
  }

  // 1~16 (11자리 패턴)
  const rangeNum = parseInt(code1, 10);
  if (!isNaN(rangeNum) && rangeNum >= 1 && rangeNum <= 16) {
    const prefixBits = (rangeNum - 1).toString(2).padStart(4, '0');
    const prefix = prefixBits.split('').map(b => b === '0' ? 'B' : 'P').join('');

    for (let i = 0; i < 128; i++) {
      const suffixBits = i.toString(2).padStart(7, '0');
      const suffix = suffixBits.split('').map(b => b === '0' ? 'B' : 'P').join('');
      const patternStr = prefix + suffix;
      patterns.push({
        abbr: "",
        code: `${rangeNum}-${i + 1}`,
        pattern: patternStr,
      });
    }
  }

  return patterns;
};

// 원 패턴 그리드 계산 (game-t1과 동일한 로직, 18컬럼용) + 예상픽 표시
const calculateCircleGrid = (prevPicks, gridRows, gridCols, nextPicks = []) => {
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

  // 예상픽 추가 (filled: false로 표시)
  for (const nextPick of nextPicks) {
    if (!nextPick || col >= gridCols) break;

    if (nextPick === prevValue) {
      if (isBent) {
        col++;
      } else if (row >= gridRows - 1) {
        col++;
        isBent = true;
      } else if (grid[row + 1] && grid[row + 1][col]) {
        col++;
        isBent = true;
      } else {
        row++;
      }
      if (col >= gridCols) break;
      grid[row][col] = { type: nextPick, filled: false };
    } else {
      verticalStartCol++;
      col = verticalStartCol;
      row = 0;
      isBent = false;
      if (col >= gridCols) break;
      grid[row][col] = { type: nextPick, filled: false };
    }

    prevValue = nextPick;
  }

  return grid;
};

export default function PickManagementPage() {
  const [formatRange, setFormatRange] = useState(() => {
    const saved = localStorage.getItem("pickManagement_formatRange");
    return saved && FORMAT_SEQUENCE.includes(saved) ? saved : "A1";
  });
  const [half, setHalf] = useState(() => {
    const saved = localStorage.getItem("pickManagement_half");
    return saved ? parseInt(saved, 10) : 1;
  }); // 1=전반(1-64), 2=후반(65-128), 11자리 패턴(1~8)에만 적용
  const [fetchCode, setFetchCode] = useState("");
  const [selectedTab, setSelectedTab] = useState("1pick");
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState(null); // 선택된 패턴
  const [dlNickname, setDlNickname] = useState(""); // DL 표시용 약칭
  const [scrollTargetCode, setScrollTargetCode] = useState(null); // 스크롤 대상 코드
  const [pickMode, setPickMode] = useState(1); // 1, 3, 6
  const [currentPick1, setCurrentPick1] = useState(null); // 현재 1pick 예측
  const [currentPick3, setCurrentPick3] = useState(["", "", ""]); // 3pick 배열
  const [currentPick6, setCurrentPick6] = useState(["", "", "", "", "", ""]); // 6pick 배열
  const [currentPickIndex, setCurrentPickIndex] = useState(0); // 현재 입력 위치
  const [pickStat, setPickStat] = useState(null); // 선택된 패턴의 통계
  const [recalculating, setRecalculating] = useState(false); // 통계 갱신 중
  const [recalculateProgress, setRecalculateProgress] = useState(0); // 갱신 진행률
  // 조건 패턴 상태
  const [condPattern1, setCondPattern1] = useState("");
  const [condReverse1, setCondReverse1] = useState(false);
  const [condEnabled1, setCondEnabled1] = useState(false);
  const [condPattern2, setCondPattern2] = useState("");
  const [condReverse2, setCondReverse2] = useState(false);
  const [condEnabled2, setCondEnabled2] = useState(false);
  const rowRefs = useRef({}); // 행 refs
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isLandscape = useMediaQuery("(orientation: landscape)");

  // 로컬 스토리지에 마지막 페이지 저장
  useEffect(() => {
    localStorage.setItem("pickManagement_formatRange", formatRange);
  }, [formatRange]);

  useEffect(() => {
    localStorage.setItem("pickManagement_half", half.toString());
  }, [half]);

  // 128개 패턴으로 절반 분할이 필요한지 확인 (code1이 1~8 또는 G1~G8)
  const shouldSplitIntoHalves = (code1) => {
    // 숫자 1~8 (11자리 패턴)
    const num = parseInt(code1, 10);
    if (!isNaN(num) && num >= 1 && num <= 8) return true;
    // G1~G8 (10자리 패턴)
    if (typeof code1 === "string" && /^G[1-8]$/.test(code1)) return true;
    return false;
  };

  // API에서 picks2 데이터 로드 (재사용 가능한 함수)
  const fetchPatterns = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // 11자리 패턴(1~8)인 경우 half 파라미터 추가
      const halfParam = shouldSplitIntoHalves(formatRange) ? `?half=${half}` : "";
      const response = await fetch(`/api/v1/picks2/list/${formatRange}${halfParam}`);
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
    if (showLoading) setLoading(false);
  };

  // 초기 로드 및 formatRange/half 변경 시
  useEffect(() => {
    fetchPatterns();
  }, [formatRange, half]);

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
    const currentIndex = FORMAT_SEQUENCE.indexOf(String(formatRange));

    // 11자리 패턴(1~8)인 경우: half도 고려
    if (shouldSplitIntoHalves(formatRange)) {
      if (half === 2) {
        // 후반 → 전반
        setHalf(1);
        return;
      } else {
        // 전반 → 이전 범위의 후반
        if (currentIndex <= 0) {
          // 맨 앞이면 맨 뒤로
          const lastFormat = FORMAT_SEQUENCE[FORMAT_SEQUENCE.length - 1];
          setFormatRange(lastFormat);
          if (shouldSplitIntoHalves(lastFormat)) {
            setHalf(2);
          }
        } else {
          const prevFormat = FORMAT_SEQUENCE[currentIndex - 1];
          setFormatRange(prevFormat);
          if (shouldSplitIntoHalves(prevFormat)) {
            setHalf(2);
          }
        }
        return;
      }
    }

    // 비-11자리 패턴: 이전 범위로 이동
    if (currentIndex <= 0) {
      const lastFormat = FORMAT_SEQUENCE[FORMAT_SEQUENCE.length - 1];
      setFormatRange(lastFormat);
      if (shouldSplitIntoHalves(lastFormat)) {
        setHalf(2);
      }
    } else {
      const prevFormat = FORMAT_SEQUENCE[currentIndex - 1];
      setFormatRange(prevFormat);
      if (shouldSplitIntoHalves(prevFormat)) {
        setHalf(2);
      }
    }
  };

  const handleNextFormat = () => {
    const currentIndex = FORMAT_SEQUENCE.indexOf(String(formatRange));

    // 11자리 패턴(1~8)인 경우: half도 고려
    if (shouldSplitIntoHalves(formatRange)) {
      if (half === 1) {
        // 전반 → 후반
        setHalf(2);
        return;
      } else {
        // 후반 → 다음 범위의 전반
        if (currentIndex >= FORMAT_SEQUENCE.length - 1) {
          setFormatRange(FORMAT_SEQUENCE[0]);
        } else {
          setFormatRange(FORMAT_SEQUENCE[currentIndex + 1]);
        }
        setHalf(1);
        return;
      }
    }

    // 비-11자리 패턴: 다음 범위로 이동
    if (currentIndex >= FORMAT_SEQUENCE.length - 1) {
      setFormatRange(FORMAT_SEQUENCE[0]);
      setHalf(1);
    } else {
      const nextFormat = FORMAT_SEQUENCE[currentIndex + 1];
      setFormatRange(nextFormat);
      if (shouldSplitIntoHalves(nextFormat)) {
        setHalf(1);
      }
    }
  };

  // 통계 갱신 (SSE)
  const handleRecalculateStats = () => {
    if (recalculating) return;
    setRecalculating(true);
    setRecalculateProgress(0);

    const eventSource = new EventSource("/api/v1/game/recalculate-stats/stream");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setRecalculateProgress(data.progress);

      if (data.done) {
        eventSource.close();
        setRecalculating(false);
        // 완료 시 현재 선택된 패턴의 통계 다시 조회
        if (selectedPattern) {
          fetchPickStat(selectedPattern);
        }
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setRecalculating(false);
      setRecalculateProgress(0);
    };
  };

  // pick_stat 조회
  const fetchPickStat = async (prevPicks) => {
    if (!prevPicks) {
      setPickStat(null);
      return;
    }
    try {
      const response = await fetch(`/api/v1/picks2/stat/${prevPicks}`);
      if (response.ok) {
        const data = await response.json();
        setPickStat(data);
      } else {
        setPickStat(null);
      }
    } catch (error) {
      console.error("Failed to fetch pick stat:", error);
      setPickStat(null);
    }
  };

  // 패턴 클릭 핸들러
  const handlePatternClick = (item) => {
    const code = item.code1 ? `${item.code1}-${item.code2}` : item.code;
    const prevPicks = item.prev_picks || item.pattern || "";
    const nickname = item.shortname || item.nickname || item.abbr || "";
    const pick1 = item.next_pick_1 || null;
    const pick3 = item.next_pick_3 || "";
    const pick6 = item.next_pick_6 || "";

    setFetchCode(code);
    setDlNickname(nickname);
    setSelectedPattern(prevPicks);
    setScrollTargetCode(code);
    setCurrentPick1(pick1);
    setCurrentPick3(pick3 ? pick3.split("") : ["", "", ""]);
    setCurrentPick6(pick6 ? pick6.split("") : ["", "", "", "", "", ""]);
    setCurrentPickIndex(0);
    fetchPickStat(prevPicks);
    // 조건 패턴 로드
    setCondPattern1(item.cond_pattern_1 || "");
    setCondReverse1(item.cond_reverse_1 || false);
    setCondEnabled1(item.cond_enabled_1 || false);
    setCondPattern2(item.cond_pattern_2 || "");
    setCondReverse2(item.cond_reverse_2 || false);
    setCondEnabled2(item.cond_enabled_2 || false);
  };

  // 가져오기 버튼 핸들러 (코드 형식: A1-1, 1-29 또는 패턴 형식: BBBB, PPPP)
  const handleFetchByCode = async () => {
    if (!fetchCode) return;

    const input = fetchCode.toUpperCase().trim();

    // P와 B로만 이루어진 경우 → 패턴으로 검색
    if (/^[PB]+$/.test(input)) {
      try {
        const url = `/api/v1/picks2/pattern/${input}?prev_results=${encodeURIComponent(input)}`;
        console.log("[DEBUG] Fetching URL:", url);
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          const code1 = data.code1;
          const code2 = data.code2;
          const prevPicks = data.prev_picks || "";
          const nickname = data.shortname || data.nickname || "";
          const pick1 = data.next_pick_1 || null;
          const pick3 = data.next_pick_3 || "";
          const pick6 = data.next_pick_6 || "";

          setFetchCode(`${code1}-${code2}`);
          setDlNickname(nickname);
          setSelectedPattern(prevPicks);
          setCurrentPick1(pick1);
          setCurrentPick3(pick3 ? pick3.split("") : ["", "", ""]);
          setCurrentPick6(pick6 ? pick6.split("") : ["", "", "", "", "", ""]);
          setCurrentPickIndex(0);
          fetchPickStat(prevPicks);
          // 조건 패턴 로드
          setCondPattern1(data.cond_pattern_1 || "");
          setCondReverse1(data.cond_reverse_1 || false);
          setCondEnabled1(data.cond_enabled_1 || false);
          setCondPattern2(data.cond_pattern_2 || "");
          setCondReverse2(data.cond_reverse_2 || false);
          setCondEnabled2(data.cond_enabled_2 || false);

          // 스크롤 대상 설정
          setScrollTargetCode(`${code1}-${code2}`);

          // 해당 범위로 이동
          if (code1 !== formatRange) {
            setFormatRange(code1);
          }
        } else if (response.status !== 404) {
          // 404는 무시, 다른 에러만 표시
          alert("패턴을 찾을 수 없습니다");
        }
      } catch (error) {
        console.error("Failed to fetch pattern:", error);
        alert("패턴 로딩 실패");
      }
      return;
    }

    // "A1-1" 또는 "1-29" 형식 파싱
    const parts = input.split("-");
    if (parts.length !== 2) {
      alert("올바른 형식으로 입력해주세요 (예: A1-1, 1-29 또는 BBBB)");
      return;
    }

    const code1 = parts[0];
    const code2 = parts[1];

    // code1 유효성 검사
    if (!FORMAT_SEQUENCE.includes(code1)) {
      alert("올바른 code1을 입력해주세요 (A1~G8 또는 1~16)");
      return;
    }

    try {
      const response = await fetch(`/api/v1/picks2/code/${code1}/${code2}`);
      if (response.ok) {
        const data = await response.json();
        const prevPicks = data.prev_picks || "";
        const nickname = data.shortname || data.nickname || "";
        const pick1 = data.next_pick_1 || null;
        const pick3 = data.next_pick_3 || "";
        const pick6 = data.next_pick_6 || "";

        setFetchCode(`${code1}-${code2}`);
        setDlNickname(nickname);
        setSelectedPattern(prevPicks);
        setCurrentPick1(pick1);
        setCurrentPick3(pick3 ? pick3.split("") : ["", "", ""]);
        setCurrentPick6(pick6 ? pick6.split("") : ["", "", "", "", "", ""]);
        setCurrentPickIndex(0);
        fetchPickStat(prevPicks);
        // 조건 패턴 로드
        setCondPattern1(data.cond_pattern_1 || "");
        setCondReverse1(data.cond_reverse_1 || false);
        setCondEnabled1(data.cond_enabled_1 || false);
        setCondPattern2(data.cond_pattern_2 || "");
        setCondReverse2(data.cond_reverse_2 || false);
        setCondEnabled2(data.cond_enabled_2 || false);

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

  // 조건 패턴 저장 핸들러
  const handleCondPatternSave = async (condNum, field, value) => {
    if (!fetchCode) return;

    const parts = fetchCode.split("-");
    if (parts.length !== 2) return;

    const code1 = parts[0];
    const code2 = parts[1];

    const body = {};
    if (condNum === 1) {
      if (field === "pattern") body.cond_pattern_1 = value;
      if (field === "reverse") body.cond_reverse_1 = value;
      if (field === "enabled") body.cond_enabled_1 = value;
    } else {
      if (field === "pattern") body.cond_pattern_2 = value;
      if (field === "reverse") body.cond_reverse_2 = value;
      if (field === "enabled") body.cond_enabled_2 = value;
    }

    try {
      const response = await fetch(`/api/v1/picks2/code/${code1}/${code2}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        fetchPatterns(false);
      }
    } catch (error) {
      console.error("Failed to save conditional pattern:", error);
    }
  };

  // DL 약칭 저장 (blur 시)
  const handleDlBlur = async () => {
    if (!fetchCode) return;

    const parts = fetchCode.split("-");
    if (parts.length !== 2) return;

    const code1 = parts[0];
    const code2 = parts[1];

    try {
      const response = await fetch(`/api/v1/picks2/code/${code1}/${code2}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: dlNickname }),
      });

      if (response.ok) {
        // 로컬 업데이트
        setPatterns(prev => prev.map(p =>
          String(p.code2) === code2 ? { ...p, nickname: dlNickname } : p
        ));
      }
    } catch (error) {
      console.error("Failed to save nickname:", error);
    }
  };

  // P/B 버튼 클릭 핸들러
  const handlePickClick = async (pick, idx = 0) => {
    if (!fetchCode) return;

    const parts = fetchCode.split("-");
    if (parts.length !== 2) return;

    const code1 = parts[0];
    const code2 = parts[1];

    if (pickMode === 1) {
      // 1pick 모드
      try {
        const response = await fetch(`/api/v1/picks2/code/${code1}/${code2}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ next_pick_1: pick }),
        });

        if (response.ok) {
          setCurrentPick1(pick);
          fetchPatterns(false);
        }
      } catch (error) {
        console.error("Failed to save 1pick:", error);
      }
    } else if (pickMode === 3) {
      // 3pick 모드 - idx 위치에 저장
      const newPicks = [...currentPick3];
      newPicks[idx] = pick;
      setCurrentPick3(newPicks);

      // 서버 저장
      const pickStr = newPicks.join("");
      try {
        const response = await fetch(`/api/v1/picks2/code/${code1}/${code2}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ next_pick_3: pickStr }),
        });

        if (response.ok) {
          fetchPatterns(false);
        }
      } catch (error) {
        console.error("Failed to save 3pick:", error);
      }
    } else if (pickMode === 6) {
      // 6pick 모드 - idx 위치에 저장
      const newPicks = [...currentPick6];
      newPicks[idx] = pick;
      setCurrentPick6(newPicks);

      // 서버 저장
      const pickStr = newPicks.join("");
      try {
        const response = await fetch(`/api/v1/picks2/code/${code1}/${code2}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ next_pick_6: pickStr }),
        });

        if (response.ok) {
          fetchPatterns(false);
        }
      } catch (error) {
        console.error("Failed to save 6pick:", error);
      }
    }
  };

  // 예측 삭제
  const handleDeletePick = async () => {
    if (!fetchCode) return;

    const parts = fetchCode.split("-");
    if (parts.length !== 2) return;

    const code1 = parts[0];
    const code2 = parts[1];

    const fieldName = pickMode === 1 ? "next_pick_1" : pickMode === 3 ? "next_pick_3" : "next_pick_6";

    try {
      const response = await fetch(`/api/v1/picks2/code/${code1}/${code2}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [fieldName]: "" }),
      });

      if (response.ok) {
        if (pickMode === 1) {
          setCurrentPick1(null);
        } else if (pickMode === 3) {
          setCurrentPick3(["", "", ""]);
        } else {
          setCurrentPick6(["", "", "", "", "", ""]);
        }
        setCurrentPickIndex(0);
        fetchPatterns(false);
      }
    } catch (error) {
      console.error("Failed to delete pick:", error);
    }
  };

  // Mirror 적용 (현재 픽을 거울상 패턴에 반대로 복사)
  const handleApplyMirror = async () => {
    if (!fetchCode) return;

    const parts = fetchCode.split("-");
    if (parts.length !== 2) return;

    const code1 = parts[0];
    const code2 = parts[1];

    try {
      const response = await fetch(`/api/v1/picks2/apply-mirror/${code1}/${code2}`, {
        method: "POST",
      });

      if (response.ok) {
        // 거울상 패턴 업데이트되었으므로 리스트 리로드
        fetchPatterns(false);
      }
    } catch (error) {
      console.error("Failed to apply mirror:", error);
    }
  };

  const GRID_ROWS = 6;
  const GRID_COLS = 18;

  // 그리드 계산
  // 현재 모드에 따른 예상픽 배열
  const getNextPicks = () => {
    if (pickMode === 1) return currentPick1 ? [currentPick1] : [];
    if (pickMode === 3) return currentPick3.filter(p => p);
    if (pickMode === 6) return currentPick6.filter(p => p);
    return [];
  };

  const grid = calculateCircleGrid(selectedPattern, GRID_ROWS, GRID_COLS, getNextPicks());

  // 전체 너비 계산: 격자(18*28 + 17gap + 2border) + gap(24) + 컨트롤영역
  const CONTENT_WIDTH = 850;

  // 격자 컴포넌트 (데스크탑용)
  const GridComponent = (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_COLS}, 28px)`,
        gridTemplateRows: `repeat(${GRID_ROWS}, 28px)`,
        gap: "1px",
        backgroundColor: "#616161",
        border: "1px solid #616161",
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
  );

  // 격자 컴포넌트 (모바일용 - 작은 사이즈)
  const GridComponentSmall = (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_COLS}, 18px)`,
        gridTemplateRows: `repeat(${GRID_ROWS}, 18px)`,
        gap: "1px",
        backgroundColor: "#616161",
        border: "1px solid #616161",
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
            {cell && <Circle type={cell.type} filled={cell.filled} size={16} />}
          </Box>
        ))
      )}
    </Box>
  );

  // 모바일 가로 레이아웃 (2컬럼)
  if (isMobile && isLandscape) {
    return (
      <Box sx={{ p: 1, height: "100%", display: "flex", gap: 1, overflow: "hidden" }}>
        {/* 좌측: 격자 + 입력 - 고정 너비 */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, flexShrink: 0, alignItems: "flex-start", width: 360, overflow: "hidden" }}>
          {/* 격자 */}
          {GridComponentSmall}
          {/* 입력 컨트롤 - 3픽 기준 높이 고정 */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center", minHeight: 56 }}>
            {/* P/B 버튼 */}
            {pickMode === 6 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {[0, 3].map((rowStart) => (
                  <Box key={rowStart} sx={{ display: "flex", gap: 0.5 }}>
                    {[0, 1, 2].map((offset) => {
                      const idx = rowStart + offset;
                      const currentValue = currentPick6[idx];
                      return (
                        <Box key={idx} sx={{ display: "flex", gap: 0.25 }}>
                          <Box
                            onClick={() => handlePickClick("P", idx)}
                            sx={{
                              width: 28, height: 28, borderRadius: 0.5,
                              backgroundColor: currentValue === "P" ? "#1565c0" : "#9e9e9e",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: "#fff", fontSize: 11, fontWeight: "bold",
                              cursor: fetchCode ? "pointer" : "default",
                              opacity: fetchCode ? 1 : 0.5,
                            }}
                          >P</Box>
                          <Box
                            onClick={() => handlePickClick("B", idx)}
                            sx={{
                              width: 28, height: 28, borderRadius: 0.5,
                              backgroundColor: currentValue === "B" ? "#f44336" : "#9e9e9e",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: "#fff", fontSize: 11, fontWeight: "bold",
                              cursor: fetchCode ? "pointer" : "default",
                              opacity: fetchCode ? 1 : 0.5,
                            }}
                          >B</Box>
                        </Box>
                      );
                    })}
                  </Box>
                ))}
              </Box>
            ) : pickMode === 3 ? (
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {Array.from({ length: 3 }).map((_, idx) => {
                  const currentValue = currentPick3[idx];
                  return (
                    <Box key={idx} sx={{ display: "flex", gap: 0.25 }}>
                      <Box
                        onClick={() => handlePickClick("P", idx)}
                        sx={{
                          width: 36, height: 56, borderRadius: 1,
                          backgroundColor: currentValue === "P" ? "#1565c0" : "#9e9e9e",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff", fontSize: 14, fontWeight: "bold",
                          cursor: fetchCode ? "pointer" : "default",
                          opacity: fetchCode ? 1 : 0.5,
                        }}
                      >P</Box>
                      <Box
                        onClick={() => handlePickClick("B", idx)}
                        sx={{
                          width: 36, height: 56, borderRadius: 1,
                          backgroundColor: currentValue === "B" ? "#f44336" : "#9e9e9e",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff", fontSize: 14, fontWeight: "bold",
                          cursor: fetchCode ? "pointer" : "default",
                          opacity: fetchCode ? 1 : 0.5,
                        }}
                      >B</Box>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <Box
                  onClick={() => handlePickClick("P", 0)}
                  sx={{
                    width: 56, height: 56, borderRadius: 1,
                    backgroundColor: currentPick1 === "P" ? "#1565c0" : "#9e9e9e",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 18, fontWeight: "bold",
                    cursor: fetchCode ? "pointer" : "default",
                    opacity: fetchCode ? 1 : 0.5,
                  }}
                >P</Box>
                <Box
                  onClick={() => handlePickClick("B", 0)}
                  sx={{
                    width: 56, height: 56, borderRadius: 1,
                    backgroundColor: currentPick1 === "B" ? "#f44336" : "#9e9e9e",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 18, fontWeight: "bold",
                    cursor: fetchCode ? "pointer" : "default",
                    opacity: fetchCode ? 1 : 0.5,
                  }}
                >B</Box>
              </Box>
            )}
            {/* 삭제 */}
            <Box
              onClick={handleDeletePick}
              sx={{
                px: 1, height: 56,
                border: "1px solid rgba(255,255,255,0.5)",
                borderRadius: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: fetchCode ? "pointer" : "default",
                opacity: fetchCode ? 1 : 0.5,
              }}
            >
              <Typography sx={{ fontSize: 12 }}>삭제</Typography>
            </Box>
            {/* 코드 입력 + 가져오기 */}
            <TextField
              size="small"
              placeholder="1-1"
              value={fetchCode}
              onChange={(e) => setFetchCode(e.target.value)}
              sx={{
                width: 60,
                "& .MuiOutlinedInput-root": {
                  height: 36,
                  "& fieldset": { borderColor: "#1565c0" },
                },
                "& .MuiInputBase-input": { textAlign: "center", fontSize: 14, p: 0.5 },
              }}
            />
            <Box
              onClick={handleFetchByCode}
              sx={{
                height: 36, px: 1,
                border: "1px solid #4caf50",
                borderRadius: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Typography sx={{ fontSize: 11 }}>가져오기</Typography>
            </Box>
            {/* DL */}
            <TextField
              size="small"
              placeholder="DL"
              value={dlNickname}
              onChange={(e) => setDlNickname(e.target.value)}
              onBlur={handleDlBlur}
              sx={{
                width: 45,
                "& .MuiOutlinedInput-root": {
                  height: 36,
                  "& fieldset": { borderColor: "rgba(255,255,255,0.5)" },
                },
                "& .MuiInputBase-input": { textAlign: "center", fontSize: 11, p: 0.5 },
              }}
            />
          </Box>
          {/* 조건 패턴 - 가로모드 (두 줄) */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {/* 조건 패턴 1 */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {[...Array(8)].map((_, idx) => {
                const char = condPattern1[idx];
                const isP = char === "P";
                const isB = char === "B";
                return (
                  <Box key={`l-cond1-${idx}`} sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Box onClick={() => { if (!fetchCode) return; let arr = condPattern1.padEnd(12, " ").split(""); arr[idx] = isP ? " " : "P"; const trimmed = arr.join("").replace(/ +$/, ""); setCondPattern1(trimmed); handleCondPatternSave(1, "pattern", trimmed); }}
                      sx={{ width: 28, height: 28, border: "1px solid rgba(255,255,255,0.3)", borderRadius: 0.5, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: isP ? "#1565c0" : "#fff", cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5 }}>
                      {isP && <Typography sx={{ fontSize: 11, fontWeight: "bold", color: "#fff" }}>P</Typography>}
                    </Box>
                    <Box onClick={() => { if (!fetchCode) return; let arr = condPattern1.padEnd(12, " ").split(""); arr[idx] = isB ? " " : "B"; const trimmed = arr.join("").replace(/ +$/, ""); setCondPattern1(trimmed); handleCondPatternSave(1, "pattern", trimmed); }}
                      sx={{ width: 28, height: 28, border: "1px solid rgba(255,255,255,0.3)", borderRadius: 0.5, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: isB ? "#f44336" : "#fff", cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5 }}>
                      {isB && <Typography sx={{ fontSize: 11, fontWeight: "bold", color: "#fff" }}>B</Typography>}
                    </Box>
                  </Box>
                );
              })}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, ml: 0.5 }}>
                <Box onClick={() => { if (!fetchCode) return; const newValue = !condEnabled1; if (newValue) { const pattern = condPattern1.replace(/ +$/, ""); if (!pattern) { alert("패턴을 입력하세요."); return; } if (pattern.includes(" ")) { alert("패턴이 끊어져 있습니다."); return; } } setCondEnabled1(newValue); handleCondPatternSave(1, "enabled", newValue); }}
                  sx={{ px: 1, height: 28, fontSize: 11, borderRadius: 0.5, display: "flex", alignItems: "center", justifyContent: "center", border: condEnabled1 ? "1px solid #4caf50" : "1px solid rgba(255,255,255,0.3)", backgroundColor: condEnabled1 ? "rgba(76, 175, 80, 0.15)" : "transparent", color: condEnabled1 ? "#4caf50" : "rgba(255,255,255,0.5)", cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5 }}>Y</Box>
                <Box onClick={() => { if (!fetchCode) return; setCondReverse1(!condReverse1); handleCondPatternSave(1, "reverse", !condReverse1); }}
                  sx={{ px: 1, height: 28, fontSize: 11, borderRadius: 0.5, display: "flex", alignItems: "center", justifyContent: "center", border: condReverse1 ? "1px solid #4caf50" : "1px solid rgba(255,255,255,0.3)", backgroundColor: condReverse1 ? "rgba(76, 175, 80, 0.15)" : "transparent", color: condReverse1 ? "#4caf50" : "rgba(255,255,255,0.5)", cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5 }}>R</Box>
              </Box>
            </Box>
            {/* 조건 패턴 2 */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {[...Array(8)].map((_, idx) => {
                const char = condPattern2[idx];
                const isP = char === "P";
                const isB = char === "B";
                return (
                  <Box key={`l-cond2-${idx}`} sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Box onClick={() => { if (!fetchCode) return; let arr = condPattern2.padEnd(12, " ").split(""); arr[idx] = isP ? " " : "P"; const trimmed = arr.join("").replace(/ +$/, ""); setCondPattern2(trimmed); handleCondPatternSave(2, "pattern", trimmed); }}
                      sx={{ width: 28, height: 28, border: "1px solid rgba(255,255,255,0.3)", borderRadius: 0.5, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: isP ? "#1565c0" : "#fff", cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5 }}>
                      {isP && <Typography sx={{ fontSize: 11, fontWeight: "bold", color: "#fff" }}>P</Typography>}
                    </Box>
                    <Box onClick={() => { if (!fetchCode) return; let arr = condPattern2.padEnd(12, " ").split(""); arr[idx] = isB ? " " : "B"; const trimmed = arr.join("").replace(/ +$/, ""); setCondPattern2(trimmed); handleCondPatternSave(2, "pattern", trimmed); }}
                      sx={{ width: 28, height: 28, border: "1px solid rgba(255,255,255,0.3)", borderRadius: 0.5, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: isB ? "#f44336" : "#fff", cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5 }}>
                      {isB && <Typography sx={{ fontSize: 11, fontWeight: "bold", color: "#fff" }}>B</Typography>}
                    </Box>
                  </Box>
                );
              })}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, ml: 0.5 }}>
                <Box onClick={() => { if (!fetchCode) return; const newValue = !condEnabled2; if (newValue) { const pattern = condPattern2.replace(/ +$/, ""); if (!pattern) { alert("패턴을 입력하세요."); return; } if (pattern.includes(" ")) { alert("패턴이 끊어져 있습니다."); return; } } setCondEnabled2(newValue); handleCondPatternSave(2, "enabled", newValue); }}
                  sx={{ px: 1, height: 28, fontSize: 11, borderRadius: 0.5, display: "flex", alignItems: "center", justifyContent: "center", border: condEnabled2 ? "1px solid #4caf50" : "1px solid rgba(255,255,255,0.3)", backgroundColor: condEnabled2 ? "rgba(76, 175, 80, 0.15)" : "transparent", color: condEnabled2 ? "#4caf50" : "rgba(255,255,255,0.5)", cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5 }}>Y</Box>
                <Box onClick={() => { if (!fetchCode) return; setCondReverse2(!condReverse2); handleCondPatternSave(2, "reverse", !condReverse2); }}
                  sx={{ px: 1, height: 28, fontSize: 11, borderRadius: 0.5, display: "flex", alignItems: "center", justifyContent: "center", border: condReverse2 ? "1px solid #4caf50" : "1px solid rgba(255,255,255,0.3)", backgroundColor: condReverse2 ? "rgba(76, 175, 80, 0.15)" : "transparent", color: condReverse2 ? "#4caf50" : "rgba(255,255,255,0.5)", cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5 }}>R</Box>
              </Box>
            </Box>
          </Box>
          {/* 통계 표시 */}
          {pickStat && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>통계:</Typography>
              <Typography sx={{ fontSize: 12 }}>
                발생 <Box component="span" sx={{ fontWeight: "bold" }}>{pickStat.stat_total}</Box>
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#4caf50" }}>
                적중 <Box component="span" sx={{ fontWeight: "bold" }}>{pickStat.stat_hit}</Box>
                {pickStat.hit_rate !== null && `(${pickStat.hit_rate}%)`}
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#f44336" }}>
                미스 <Box component="span" sx={{ fontWeight: "bold" }}>{pickStat.stat_miss}</Box>
                {pickStat.miss_rate !== null && `(${pickStat.miss_rate}%)`}
              </Typography>
            </Box>
          )}
        </Box>

        {/* 우측: 테이블 */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, maxWidth: 560, marginLeft: "auto" }}>
          {/* 서식 범위 선택 */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
            <IconButton size="small" onClick={handlePrevFormat}><ArrowBack sx={{ fontSize: 18 }} /></IconButton>
            <Box sx={{ border: "1px solid rgba(255,255,255,0.3)", borderRadius: 1, px: 1, py: 0.25 }}>
              <Typography variant="caption">
                {shouldSplitIntoHalves(formatRange)
                  ? `${formatRange}-${half === 1 ? "1" : "65"} ~ ${formatRange}-${half === 1 ? "64" : "128"}`
                  : `${formatRange}-1~${formatRange}-${PATTERN_CONFIG[formatRange]?.count || 128}`
                }
              </Typography>
            </Box>
            <IconButton size="small" onClick={handleNextFormat}><ArrowForward sx={{ fontSize: 18 }} /></IconButton>
            <Box
              onClick={handleRecalculateStats}
              sx={{
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 1,
                px: 1,
                py: 0.25,
                cursor: recalculating ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                minWidth: 60,
                "&:hover": !recalculating ? { backgroundColor: "rgba(255,255,255,0.1)" } : {},
              }}
            >
              {recalculating ? (
                <>
                  <CircularProgress size={10} sx={{ color: "#4caf50" }} />
                  <Typography sx={{ fontSize: 9, color: "#4caf50" }}>{recalculateProgress}%</Typography>
                </>
              ) : (
                <Typography sx={{ fontSize: 9 }}>통계갱신</Typography>
              )}
            </Box>
          </Box>
          <Paper sx={{ backgroundColor: "background.paper", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* 테이블 헤더 */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, p: 0.5, borderBottom: "1px solid rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.05)" }}>
            <Typography variant="caption" sx={{ width: 30, textAlign: "center", fontSize: 10 }}>약칭</Typography>
            <Typography variant="caption" sx={{ width: 45, textAlign: "center", fontSize: 10 }}>번호</Typography>
            <Typography variant="caption" sx={{ flex: 1, fontSize: 10 }}>패턴</Typography>
            {/* 탭 버튼 */}
            <Box sx={{ display: "flex", gap: 0.25 }}>
              {["1pick", "3pick", "6pick"].map((tab) => (
                <Box
                  key={tab}
                  onClick={() => { setSelectedTab(tab); setPickMode(tab === "1pick" ? 1 : tab === "3pick" ? 3 : 6); }}
                  sx={{
                    px: 0.5, py: 0.25, borderRadius: 0.5, fontSize: 9,
                    border: selectedTab === tab ? "1px solid #4caf50" : "1px solid transparent",
                    color: selectedTab === tab ? "#4caf50" : "text.secondary",
                    cursor: "pointer",
                  }}
                >
                  {tab}
                </Box>
              ))}
            </Box>
          </Box>
          {/* 테이블 바디 */}
          <Box sx={{ flex: 1, overflow: "auto" }}>
            {patterns.map((pattern, index) => {
              const code = `${formatRange}-${pattern.code2}`;
              return (
                <Box
                  key={index}
                  ref={(el) => { if (el) rowRefs.current[code] = el; }}
                  onClick={() => handlePatternClick(pattern)}
                  sx={{
                    display: "flex", alignItems: "center", gap: 0.5, p: 0.5,
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: scrollTargetCode === code ? "rgba(76,175,80,0.2)" : (selectedPattern?.code2 === pattern.code2 ? "rgba(255,255,255,0.1)" : "transparent"),
                    cursor: "pointer",
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.05)" },
                  }}
                >
                  <Typography variant="caption" sx={{ width: 30, textAlign: "center", fontSize: 10, color: pattern.nickname ? "#4caf50" : "text.secondary" }}>
                    {pattern.nickname || "-"}
                  </Typography>
                  <Typography variant="caption" sx={{ width: 45, textAlign: "center", fontSize: 10 }}>{code}</Typography>
                  <Box sx={{ display: "flex", gap: "2px", flex: 1 }}>
                    {pattern.prev_picks?.split("").map((char, i) => (
                      <Circle key={i} type={char} filled={true} size={14} />
                    ))}
                  </Box>
                  {/* Pick 표시 - 흰색 바탕 + 테두리 */}
                  <Box sx={{ display: "flex", gap: "2px" }}>
                    {selectedTab === "1pick" && (
                      <Circle type={pattern.next_pick_1} filled={false} size={14} />
                    )}
                    {selectedTab === "3pick" && (
                      <>
                        {(pattern.next_pick_3 || "").split("").map((char, i) => (
                          <Circle key={i} type={char} filled={false} size={14} />
                        ))}
                        {Array.from({ length: 3 - (pattern.next_pick_3?.length || 0) }).map((_, i) => (
                          <Circle key={`empty-${i}`} type={null} filled={false} size={14} />
                        ))}
                      </>
                    )}
                    {selectedTab === "6pick" && (
                      <>
                        {(pattern.next_pick_6 || "").split("").map((char, i) => (
                          <Circle key={i} type={char} filled={false} size={14} />
                        ))}
                        {Array.from({ length: 6 - (pattern.next_pick_6?.length || 0) }).map((_, i) => (
                          <Circle key={`empty-${i}`} type={null} filled={false} size={14} />
                        ))}
                      </>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Paper>
        </Box>
      </Box>
    );
  }

  // 모바일 세로 레이아웃
  if (isMobile && !isLandscape) {
    return (
      <Box sx={{ p: 1, height: "100%", display: "flex", flexDirection: "column", gap: 1, overflow: "auto", alignItems: "flex-start" }}>
        {/* 격자 */}
        {GridComponentSmall}
        {/* 입력 컨트롤 - 가로 배치 */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
          {/* P/B 버튼 */}
          {pickMode === 6 ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {[0, 3].map((rowStart) => (
                <Box key={rowStart} sx={{ display: "flex", gap: 0.5 }}>
                  {[0, 1, 2].map((offset) => {
                    const idx = rowStart + offset;
                    const currentValue = currentPick6[idx];
                    return (
                      <Box key={idx} sx={{ display: "flex", gap: 0.25 }}>
                        <Box onClick={() => handlePickClick("P", idx)} sx={{ width: 40, height: 40, borderRadius: 0.5, backgroundColor: currentValue === "P" ? "#1565c0" : "#9e9e9e", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: "bold", cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5 }}>P</Box>
                        <Box onClick={() => handlePickClick("B", idx)} sx={{ width: 40, height: 40, borderRadius: 0.5, backgroundColor: currentValue === "B" ? "#f44336" : "#9e9e9e", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: "bold", cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5 }}>B</Box>
                      </Box>
                    );
                  })}
                </Box>
              ))}
            </Box>
          ) : pickMode === 3 ? (
            <Box sx={{ display: "flex", gap: 0.5 }}>
              {Array.from({ length: 3 }).map((_, idx) => {
                const currentValue = currentPick3[idx];
                return (
                  <Box key={idx} sx={{ display: "flex", gap: 0.25 }}>
                    <Box onClick={() => handlePickClick("P", idx)} sx={{ width: 44, height: 56, borderRadius: 1, backgroundColor: currentValue === "P" ? "#1565c0" : "#9e9e9e", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: "bold", cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5 }}>P</Box>
                    <Box onClick={() => handlePickClick("B", idx)} sx={{ width: 44, height: 56, borderRadius: 1, backgroundColor: currentValue === "B" ? "#f44336" : "#9e9e9e", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: "bold", cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5 }}>B</Box>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Box onClick={() => handlePickClick("P", 0)} sx={{ width: 56, height: 56, borderRadius: 1, backgroundColor: currentPick1 === "P" ? "#1565c0" : "#9e9e9e", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: "bold", cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5 }}>P</Box>
              <Box onClick={() => handlePickClick("B", 0)} sx={{ width: 56, height: 56, borderRadius: 1, backgroundColor: currentPick1 === "B" ? "#f44336" : "#9e9e9e", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: "bold", cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5 }}>B</Box>
            </Box>
          )}
          <Box onClick={handleDeletePick} sx={{ px: 1.5, height: 56, border: "1px solid rgba(255,255,255,0.5)", borderRadius: 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5 }}>
            <Typography sx={{ fontSize: 13 }}>삭제</Typography>
          </Box>
          <TextField size="small" placeholder="1-1" value={fetchCode} onChange={(e) => setFetchCode(e.target.value)} sx={{ width: 70, "& .MuiOutlinedInput-root": { height: 44, "& fieldset": { borderColor: "#1565c0" } }, "& .MuiInputBase-input": { textAlign: "center", fontSize: 16, p: 0.5 } }} />
          <Box onClick={handleFetchByCode} sx={{ height: 44, px: 1.5, border: "1px solid #4caf50", borderRadius: 1, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Typography sx={{ fontSize: 13 }}>가져오기</Typography>
          </Box>
          <TextField size="small" placeholder="DL" value={dlNickname} onChange={(e) => setDlNickname(e.target.value)} onBlur={handleDlBlur} sx={{ width: 55, "& .MuiOutlinedInput-root": { height: 44, "& fieldset": { borderColor: "rgba(255,255,255,0.5)" } }, "& .MuiInputBase-input": { textAlign: "center", fontSize: 13, p: 0.5 } }} />
          {/* P/B 퍼센트 */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 1, border: "2px solid #0d47a1", backgroundColor: "#3399fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: "bold" }}>P</Box>
            <Box sx={{ display: "flex", width: 80 }}>
              <Box sx={{ flex: 1, height: 36, backgroundColor: "#3399fe", display: "flex", alignItems: "center", justifyContent: "center" }}><Typography sx={{ color: "#fff", fontSize: 12 }}>-%</Typography></Box>
              <Box sx={{ flex: 1, height: 36, backgroundColor: "#fe5050", display: "flex", alignItems: "center", justifyContent: "center" }}><Typography sx={{ color: "#fff", fontSize: 12 }}>-%</Typography></Box>
            </Box>
            <Box sx={{ width: 36, height: 36, borderRadius: 1, border: "2px solid #b71c1c", backgroundColor: "#fe5050", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: "bold" }}>B</Box>
          </Box>
        </Box>
        {/* 조건 패턴 1 - 모바일 */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            {[...Array(8)].map((_, idx) => {
              const char = condPattern1[idx];
              const isP = char === "P";
              return (
                <Box
                  key={`m-cond-p-${idx}`}
                  onClick={() => {
                    if (!fetchCode) return;
                    let arr = condPattern1.padEnd(12, " ").split("");
                    arr[idx] = isP ? " " : "P";
                    const trimmed = arr.join("").replace(/ +$/, "");
                    setCondPattern1(trimmed);
                    handleCondPatternSave(1, "pattern", trimmed);
                  }}
                  sx={{
                    width: 24, height: 24, border: "1px solid rgba(255,255,255,0.3)", borderRadius: 0.5,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    backgroundColor: isP ? "#1565c0" : "#fff",
                    cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5,
                  }}
                >
                  {isP && <Typography sx={{ fontSize: 10, fontWeight: "bold", color: "#fff" }}>P</Typography>}
                </Box>
              );
            })}
            <Box
              onClick={() => {
                if (!fetchCode) return;
                const newValue = !condEnabled1;
                if (newValue) {
                  const pattern = condPattern1.replace(/ +$/, "");
                  if (!pattern) { alert("패턴을 입력하세요."); return; }
                  if (pattern.includes(" ")) { alert("패턴이 끊어져 있습니다."); return; }
                }
                setCondEnabled1(newValue);
                handleCondPatternSave(1, "enabled", newValue);
              }}
              sx={{
                px: 0.75, py: 0.25, fontSize: 10, ml: 0.5,
                border: condEnabled1 ? "1px solid #4caf50" : "1px solid rgba(255,255,255,0.3)",
                backgroundColor: condEnabled1 ? "rgba(76, 175, 80, 0.15)" : "transparent",
                color: condEnabled1 ? "#4caf50" : "rgba(255,255,255,0.5)",
                cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5,
              }}
            >Yes</Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            {[...Array(8)].map((_, idx) => {
              const char = condPattern1[idx];
              const isB = char === "B";
              return (
                <Box
                  key={`m-cond-b-${idx}`}
                  onClick={() => {
                    if (!fetchCode) return;
                    let arr = condPattern1.padEnd(12, " ").split("");
                    arr[idx] = isB ? " " : "B";
                    const trimmed = arr.join("").replace(/ +$/, "");
                    setCondPattern1(trimmed);
                    handleCondPatternSave(1, "pattern", trimmed);
                  }}
                  sx={{
                    width: 24, height: 24, border: "1px solid rgba(255,255,255,0.3)", borderRadius: 0.5,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    backgroundColor: isB ? "#f44336" : "#fff",
                    cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5,
                  }}
                >
                  {isB && <Typography sx={{ fontSize: 10, fontWeight: "bold", color: "#fff" }}>B</Typography>}
                </Box>
              );
            })}
            <Box
              onClick={() => {
                if (!fetchCode) return;
                setCondReverse1(!condReverse1);
                handleCondPatternSave(1, "reverse", !condReverse1);
              }}
              sx={{
                px: 0.75, py: 0.25, fontSize: 10, ml: 0.5,
                border: condReverse1 ? "1px solid #4caf50" : "1px solid rgba(255,255,255,0.3)",
                backgroundColor: condReverse1 ? "rgba(76, 175, 80, 0.15)" : "transparent",
                color: condReverse1 ? "#4caf50" : "rgba(255,255,255,0.5)",
                cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5,
              }}
            >Rev</Box>
          </Box>
        </Box>
        {/* 조건 패턴 2 - 모바일 */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            {[...Array(8)].map((_, idx) => {
              const char = condPattern2[idx];
              const isP = char === "P";
              return (
                <Box
                  key={`m-cond2-p-${idx}`}
                  onClick={() => {
                    if (!fetchCode) return;
                    let arr = condPattern2.padEnd(12, " ").split("");
                    arr[idx] = isP ? " " : "P";
                    const trimmed = arr.join("").replace(/ +$/, "");
                    setCondPattern2(trimmed);
                    handleCondPatternSave(2, "pattern", trimmed);
                  }}
                  sx={{
                    width: 24, height: 24, border: "1px solid rgba(255,255,255,0.3)", borderRadius: 0.5,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    backgroundColor: isP ? "#1565c0" : "#fff",
                    cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5,
                  }}
                >
                  {isP && <Typography sx={{ fontSize: 10, fontWeight: "bold", color: "#fff" }}>P</Typography>}
                </Box>
              );
            })}
            <Box
              onClick={() => {
                if (!fetchCode) return;
                const newValue = !condEnabled2;
                if (newValue) {
                  const pattern = condPattern2.replace(/ +$/, "");
                  if (!pattern) { alert("패턴을 입력하세요."); return; }
                  if (pattern.includes(" ")) { alert("패턴이 끊어져 있습니다."); return; }
                }
                setCondEnabled2(newValue);
                handleCondPatternSave(2, "enabled", newValue);
              }}
              sx={{
                px: 0.75, py: 0.25, fontSize: 10, ml: 0.5,
                border: condEnabled2 ? "1px solid #4caf50" : "1px solid rgba(255,255,255,0.3)",
                backgroundColor: condEnabled2 ? "rgba(76, 175, 80, 0.15)" : "transparent",
                color: condEnabled2 ? "#4caf50" : "rgba(255,255,255,0.5)",
                cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5,
              }}
            >Yes</Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
            {[...Array(8)].map((_, idx) => {
              const char = condPattern2[idx];
              const isB = char === "B";
              return (
                <Box
                  key={`m-cond2-b-${idx}`}
                  onClick={() => {
                    if (!fetchCode) return;
                    let arr = condPattern2.padEnd(12, " ").split("");
                    arr[idx] = isB ? " " : "B";
                    const trimmed = arr.join("").replace(/ +$/, "");
                    setCondPattern2(trimmed);
                    handleCondPatternSave(2, "pattern", trimmed);
                  }}
                  sx={{
                    width: 24, height: 24, border: "1px solid rgba(255,255,255,0.3)", borderRadius: 0.5,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    backgroundColor: isB ? "#f44336" : "#fff",
                    cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5,
                  }}
                >
                  {isB && <Typography sx={{ fontSize: 10, fontWeight: "bold", color: "#fff" }}>B</Typography>}
                </Box>
              );
            })}
            <Box
              onClick={() => {
                if (!fetchCode) return;
                setCondReverse2(!condReverse2);
                handleCondPatternSave(2, "reverse", !condReverse2);
              }}
              sx={{
                px: 0.75, py: 0.25, fontSize: 10, ml: 0.5,
                border: condReverse2 ? "1px solid #4caf50" : "1px solid rgba(255,255,255,0.3)",
                backgroundColor: condReverse2 ? "rgba(76, 175, 80, 0.15)" : "transparent",
                color: condReverse2 ? "#4caf50" : "rgba(255,255,255,0.5)",
                cursor: fetchCode ? "pointer" : "default", opacity: fetchCode ? 1 : 0.5,
              }}
            >Rev</Box>
          </Box>
        </Box>
        {/* 통계 표시 */}
        {pickStat && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>통계:</Typography>
            <Typography variant="body2">
              발생 <Box component="span" sx={{ fontWeight: "bold" }}>{pickStat.stat_total}</Box>
            </Typography>
            <Typography variant="body2" sx={{ color: "#4caf50" }}>
              적중 <Box component="span" sx={{ fontWeight: "bold" }}>{pickStat.stat_hit}</Box>
              {pickStat.hit_rate !== null && `(${pickStat.hit_rate}%)`}
            </Typography>
            <Typography variant="body2" sx={{ color: "#f44336" }}>
              미스 <Box component="span" sx={{ fontWeight: "bold" }}>{pickStat.stat_miss}</Box>
              {pickStat.miss_rate !== null && `(${pickStat.miss_rate}%)`}
            </Typography>
          </Box>
        )}
        {/* 서식 범위 선택 */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton size="small" onClick={handlePrevFormat}><ArrowBack sx={{ fontSize: 20 }} /></IconButton>
          <Box sx={{ border: "1px solid rgba(255,255,255,0.3)", borderRadius: 1, px: 1.5, py: 0.5 }}>
            <Typography variant="body2">
              {shouldSplitIntoHalves(formatRange)
                ? `${formatRange}-${half === 1 ? "1" : "65"} ~ ${formatRange}-${half === 1 ? "64" : "128"}`
                : `${formatRange}-1~${formatRange}-${PATTERN_CONFIG[formatRange]?.count || 128}`
              }
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleNextFormat}><ArrowForward sx={{ fontSize: 20 }} /></IconButton>
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
                <Typography variant="caption" sx={{ color: "#4caf50" }}>{recalculateProgress}%</Typography>
              </>
            ) : (
              <Typography variant="caption">통계갱신</Typography>
            )}
          </Box>
        </Box>
        {/* 테이블 */}
        <Paper sx={{ backgroundColor: "background.paper", overflow: "hidden", display: "flex", flexDirection: "column", alignSelf: "stretch" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, p: 0.5, borderBottom: "1px solid rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.05)" }}>
            <Typography variant="caption" sx={{ width: 35, textAlign: "center", fontSize: 11 }}>약칭</Typography>
            <Typography variant="caption" sx={{ width: 50, textAlign: "center", fontSize: 11 }}>번호</Typography>
            <Typography variant="caption" sx={{ flex: 1, fontSize: 11 }}>패턴</Typography>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              {["1pick", "3pick", "6pick"].map((tab) => (
                <Box key={tab} onClick={() => { setSelectedTab(tab); setPickMode(tab === "1pick" ? 1 : tab === "3pick" ? 3 : 6); }} sx={{ px: 0.75, py: 0.25, borderRadius: 0.5, fontSize: 10, border: selectedTab === tab ? "1px solid #4caf50" : "1px solid transparent", color: selectedTab === tab ? "#4caf50" : "text.secondary", cursor: "pointer" }}>{tab}</Box>
              ))}
            </Box>
          </Box>
          <Box sx={{ flex: 1, overflow: "auto" }}>
            {patterns.map((pattern, index) => {
              const code = `${formatRange}-${pattern.code2}`;
              return (
                <Box key={index} ref={(el) => { if (el) rowRefs.current[code] = el; }} onClick={() => handlePatternClick(pattern)} sx={{ display: "flex", alignItems: "center", gap: 0.5, p: 0.5, borderBottom: "1px solid rgba(255,255,255,0.1)", backgroundColor: scrollTargetCode === code ? "rgba(76,175,80,0.2)" : (selectedPattern?.code2 === pattern.code2 ? "rgba(255,255,255,0.1)" : "transparent"), cursor: "pointer", "&:hover": { backgroundColor: "rgba(255,255,255,0.05)" } }}>
                  <Typography variant="caption" sx={{ width: 35, textAlign: "center", fontSize: 11, color: pattern.nickname ? "#4caf50" : "text.secondary" }}>{pattern.nickname || "-"}</Typography>
                  <Typography variant="caption" sx={{ width: 50, textAlign: "center", fontSize: 11 }}>{code}</Typography>
                  <Box sx={{ display: "flex", gap: "2px", flex: 1 }}>{pattern.prev_picks?.split("").map((char, i) => (<Circle key={i} type={char} filled={true} size={16} />))}</Box>
                  <Box sx={{ display: "flex", gap: "2px" }}>
                    {selectedTab === "1pick" && <Circle type={pattern.next_pick_1} filled={false} size={16} />}
                    {selectedTab === "3pick" && (<>{(pattern.next_pick_3 || "").split("").map((char, i) => (<Circle key={i} type={char} filled={false} size={16} />))}{Array.from({ length: 3 - (pattern.next_pick_3?.length || 0) }).map((_, i) => (<Circle key={`empty-${i}`} type={null} filled={false} size={16} />))}</>)}
                    {selectedTab === "6pick" && (<>{(pattern.next_pick_6 || "").split("").map((char, i) => (<Circle key={i} type={char} filled={false} size={16} />))}{Array.from({ length: 6 - (pattern.next_pick_6?.length || 0) }).map((_, i) => (<Circle key={`empty-${i}`} type={null} filled={false} size={16} />))}</>)}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Paper>
      </Box>
    );
  }

  // 데스크탑 레이아웃
  return (
    <Box sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
            backgroundColor: "#616161",
            border: "1px solid #616161",
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
        <Box sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "stretch",
          gap: 0,
          height: "100%",
          width: 300,
          flexWrap: "nowrap",
        }}>
          {/* 상단: Row 1 + Row 2 */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
            {/* Row 1: P/B 버튼들 + 삭제 */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
            {/* P/B 버튼 세트들 */}
            {pickMode === 6 ? (
              // 6pick: 2줄 (3개씩)
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, flex: isMobile ? "none" : 1, width: isMobile ? "auto" : "100%" }}>
                {[0, 3].map((rowStart) => (
                  <Box key={rowStart} sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                    {[0, 1, 2].map((offset) => {
                      const idx = rowStart + offset;
                      const currentValue = currentPick6[idx];
                      return (
                        <Box key={idx} sx={{ display: "flex", gap: 0.25, flex: isMobile ? "none" : 1, width: isMobile ? 90 : "auto" }}>
                          <Box
                            onClick={() => handlePickClick("P", idx)}
                            sx={{
                              flex: 1, height: isMobile ? 44 : 20, borderRadius: 0.5,
                              backgroundColor: currentValue === "P" ? "#1565c0" : "#9e9e9e",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: "#fff", fontSize: isMobile ? 14 : 11, fontWeight: "bold",
                              cursor: fetchCode ? "pointer" : "default",
                              opacity: fetchCode ? 1 : 0.5,
                              "&:hover": fetchCode ? { opacity: 0.8 } : {},
                            }}
                          >P</Box>
                          <Box
                            onClick={() => handlePickClick("B", idx)}
                            sx={{
                              flex: 1, height: isMobile ? 44 : 20, borderRadius: 0.5,
                              backgroundColor: currentValue === "B" ? "#f44336" : "#9e9e9e",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: "#fff", fontSize: isMobile ? 14 : 11, fontWeight: "bold",
                              cursor: fetchCode ? "pointer" : "default",
                              opacity: fetchCode ? 1 : 0.5,
                              "&:hover": fetchCode ? { opacity: 0.8 } : {},
                            }}
                          >B</Box>
                        </Box>
                      );
                    })}
                  </Box>
                ))}
              </Box>
            ) : pickMode === 3 ? (
              // 3pick: 1줄
              <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flex: isMobile ? "none" : 1, width: isMobile ? "auto" : "100%" }}>
                {Array.from({ length: 3 }).map((_, idx) => {
                  const currentValue = currentPick3[idx];
                  return (
                    <Box key={idx} sx={{ display: "flex", gap: 0.25, flex: isMobile ? "none" : 1, width: isMobile ? 90 : "auto" }}>
                      <Box
                        onClick={() => handlePickClick("P", idx)}
                        sx={{
                          flex: 1, height: isMobile ? 64 : 45, borderRadius: 1,
                          backgroundColor: currentValue === "P" ? "#1565c0" : "#9e9e9e",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff", fontSize: isMobile ? 18 : 14, fontWeight: "bold",
                          cursor: fetchCode ? "pointer" : "default",
                          opacity: fetchCode ? 1 : 0.5,
                          "&:hover": fetchCode ? { opacity: 0.8 } : {},
                        }}
                      >P</Box>
                      <Box
                        onClick={() => handlePickClick("B", idx)}
                        sx={{
                          flex: 1, height: isMobile ? 64 : 45, borderRadius: 1,
                          backgroundColor: currentValue === "B" ? "#f44336" : "#9e9e9e",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff", fontSize: isMobile ? 18 : 14, fontWeight: "bold",
                          cursor: fetchCode ? "pointer" : "default",
                          opacity: fetchCode ? 1 : 0.5,
                          "&:hover": fetchCode ? { opacity: 0.8 } : {},
                        }}
                      >B</Box>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              // 1pick: 꽉 채우기
              <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flex: isMobile ? "none" : 1, width: isMobile ? "auto" : "100%" }}>
                <Box
                  onClick={() => handlePickClick("P", 0)}
                  sx={{
                    width: isMobile ? 64 : "auto", flex: isMobile ? "none" : 1, height: isMobile ? 64 : 45, borderRadius: 1,
                    backgroundColor: currentPick1 === "P" ? "#1565c0" : "#9e9e9e",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: isMobile ? 20 : 18, fontWeight: "bold",
                    cursor: fetchCode ? "pointer" : "default",
                    opacity: fetchCode ? 1 : 0.5,
                    "&:hover": fetchCode ? { opacity: 0.8 } : {},
                  }}
                >P</Box>
                <Box
                  onClick={() => handlePickClick("B", 0)}
                  sx={{
                    width: isMobile ? 64 : "auto", flex: isMobile ? "none" : 1, height: isMobile ? 64 : 45, borderRadius: 1,
                    backgroundColor: currentPick1 === "B" ? "#f44336" : "#9e9e9e",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: isMobile ? 20 : 18, fontWeight: "bold",
                    cursor: fetchCode ? "pointer" : "default",
                    opacity: fetchCode ? 1 : 0.5,
                    "&:hover": fetchCode ? { opacity: 0.8 } : {},
                  }}
                >B</Box>
              </Box>
            )}
            {/* 삭제 버튼 */}
            <Box
              onClick={handleDeletePick}
              sx={{
                px: isMobile ? 1 : 2,
                height: isMobile ? 64 : 45,
                border: "1px solid rgba(255,255,255,0.5)",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: fetchCode ? "pointer" : "default",
                opacity: fetchCode ? 1 : 0.5,
                "&:hover": fetchCode ? { backgroundColor: "rgba(255,255,255,0.1)" } : {},
              }}
            >
              <Typography sx={{ fontSize: isMobile ? 13 : 13 }}>삭제</Typography>
            </Box>
            {/* Mirror 버튼 (거울상 패턴에 반대 픽 복사) */}
            <Box
              onClick={handleApplyMirror}
              sx={{
                px: isMobile ? 1 : 2,
                height: isMobile ? 64 : 45,
                border: "1px solid #9c27b0",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: fetchCode ? "pointer" : "default",
                opacity: fetchCode ? 1 : 0.5,
                "&:hover": fetchCode ? { backgroundColor: "rgba(156, 39, 176, 0.2)" } : {},
              }}
            >
              <Typography sx={{ fontSize: isMobile ? 13 : 13, color: "#ce93d8" }}>Mirror</Typography>
            </Box>
          </Box>

          {/* Row 2: 입력필드, 가져오기, DL */}
          <Box sx={{ display: "flex", alignItems: "center", gap: isMobile ? 0.5 : 1.5, width: isMobile ? "auto" : "100%" }}>
            <TextField
              size="small"
              placeholder="1-1"
              value={fetchCode}
              onChange={(e) => setFetchCode(e.target.value)}
              sx={{
                width: isMobile ? 70 : 100,
                "& .MuiOutlinedInput-root": {
                  height: isMobile ? 64 : 45,
                  borderRadius: isMobile ? 1 : 2,
                  "& fieldset": {
                    borderColor: "#1565c0",
                    borderWidth: isMobile ? 1 : 2,
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
                  fontSize: isMobile ? 16 : 18,
                },
              }}
            />
            <Box
              onClick={handleFetchByCode}
              sx={{
                height: isMobile ? 64 : 45,
                border: isMobile ? "1px solid #4caf50" : "2px solid #4caf50",
                borderRadius: isMobile ? 1 : 2,
                px: isMobile ? 1.5 : 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                "&:hover": { backgroundColor: "rgba(76,175,80,0.1)" },
              }}
            >
              <Typography sx={{ color: "#fff", whiteSpace: "nowrap", fontSize: isMobile ? 13 : 14 }}>가져오기</Typography>
            </Box>
            <TextField
              size="small"
              placeholder="DL"
              value={dlNickname}
              onChange={(e) => setDlNickname(e.target.value)}
              onBlur={handleDlBlur}
              sx={{
                width: isMobile ? 55 : "auto",
                flex: isMobile ? "none" : 1,
                "& .MuiOutlinedInput-root": {
                  height: isMobile ? 64 : 45,
                  borderRadius: isMobile ? 1 : 2,
                  "& fieldset": {
                    borderColor: "rgba(255,255,255,0.5)",
                    borderWidth: isMobile ? 1 : 2,
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
                  fontSize: isMobile ? 13 : 14,
                },
              }}
            />
          </Box>
          </Box>

          {/* Row 3: P/B 퍼센트 표시 - P | P% | B% | B */}
          <Box sx={{ display: "flex", alignItems: "center", gap: isMobile ? 0.5 : 1.5, mt: isMobile ? 0 : 2, width: isMobile ? "auto" : "100%" }}>
            <Box
              sx={{
                width: isMobile ? 44 : 55,
                height: isMobile ? 64 : 55,
                borderRadius: isMobile ? 1 : 2,
                border: isMobile ? "2px solid #0d47a1" : "3px solid #0d47a1",
                backgroundColor: "#3399fe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: isMobile ? 18 : 24,
                fontWeight: "bold",
              }}
            >
              P
            </Box>
            <Box sx={{ display: "flex", width: isMobile ? 100 : "auto", flex: isMobile ? "none" : 1 }}>
              <Box
                sx={{
                  flex: 1,
                  height: isMobile ? 64 : 55,
                  backgroundColor: "#3399fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography sx={{ color: "#fff", fontSize: isMobile ? 14 : 16 }}>-%</Typography>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  height: isMobile ? 64 : 55,
                  backgroundColor: "#fe5050",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography sx={{ color: "#fff", fontSize: isMobile ? 14 : 16 }}>-%</Typography>
              </Box>
            </Box>
            <Box
              sx={{
                width: isMobile ? 44 : 55,
                height: isMobile ? 64 : 55,
                borderRadius: isMobile ? 1 : 2,
                border: isMobile ? "2px solid #b71c1c" : "3px solid #b71c1c",
                backgroundColor: "#fe5050",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: isMobile ? 18 : 24,
                fontWeight: "bold",
              }}
            >
              B
            </Box>
          </Box>
        </Box>
      </Box>

      {/* 조건 패턴 영역 */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 2 }}>
        {/* P 행 */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {[...Array(12)].map((_, idx) => {
            const char = condPattern1[idx];
            const isP = char === "P";
            return (
              <Box
                key={`cond-p-${idx}`}
                onClick={() => {
                  if (!fetchCode) return;
                  let arr = condPattern1.padEnd(12, " ").split("");
                  arr[idx] = isP ? " " : "P";
                  const trimmed = arr.join("").replace(/ +$/, "");
                  setCondPattern1(trimmed);
                  handleCondPatternSave(1, "pattern", trimmed);
                }}
                sx={{
                  width: 28, height: 28,
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  backgroundColor: isP ? "#1565c0" : "#fff",
                  cursor: fetchCode ? "pointer" : "default",
                  opacity: fetchCode ? 1 : 0.5,
                }}
              >
                {isP && <Typography sx={{ fontSize: 12, fontWeight: "bold", color: "#fff" }}>P</Typography>}
              </Box>
            );
          })}
          <Box
            onClick={() => {
              if (!fetchCode) return;
              const newValue = !condEnabled1;
              // Yes 활성화 시 패턴 유효성 검사
              if (newValue) {
                // 앞에서부터 끊김 없이 연결되었는지 체크
                const pattern = condPattern1.replace(/ +$/, ""); // 뒤 공백 제거
                if (!pattern) {
                  alert("패턴을 입력하세요.");
                  return;
                }
                // 중간에 빈칸(공백)이 있으면 안됨
                if (pattern.includes(" ")) {
                  alert("패턴이 끊어져 있습니다. 앞에서부터 연속으로 입력하세요.");
                  return;
                }
              }
              setCondEnabled1(newValue);
              handleCondPatternSave(1, "enabled", newValue);
            }}
            sx={{
              width: 50, py: 0.5, fontSize: 12, ml: 1,
              textAlign: "center",
              border: condEnabled1 ? "1px solid #4caf50" : "1px solid rgba(255,255,255,0.3)",
              backgroundColor: condEnabled1 ? "rgba(76, 175, 80, 0.15)" : "transparent",
              color: condEnabled1 ? "#4caf50" : "rgba(255,255,255,0.5)",
              cursor: fetchCode ? "pointer" : "default",
              opacity: fetchCode ? 1 : 0.5,
            }}
          >
            Yes
          </Box>
        </Box>
        {/* B 행 */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {[...Array(12)].map((_, idx) => {
            const char = condPattern1[idx];
            const isB = char === "B";
            return (
              <Box
                key={`cond-b-${idx}`}
                onClick={() => {
                  if (!fetchCode) return;
                  let arr = condPattern1.padEnd(12, " ").split("");
                  arr[idx] = isB ? " " : "B";
                  const trimmed = arr.join("").replace(/ +$/, "");
                  setCondPattern1(trimmed);
                  handleCondPatternSave(1, "pattern", trimmed);
                }}
                sx={{
                  width: 28, height: 28,
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  backgroundColor: isB ? "#f44336" : "#fff",
                  cursor: fetchCode ? "pointer" : "default",
                  opacity: fetchCode ? 1 : 0.5,
                }}
              >
                {isB && <Typography sx={{ fontSize: 12, fontWeight: "bold", color: "#fff" }}>B</Typography>}
              </Box>
            );
          })}
          <Box
            onClick={() => {
              if (!fetchCode) return;
              const newValue = !condReverse1;
              setCondReverse1(newValue);
              handleCondPatternSave(1, "reverse", newValue);
            }}
            sx={{
              width: 50, py: 0.5, fontSize: 12, ml: 1,
              textAlign: "center",
              border: condReverse1 ? "1px solid #4caf50" : "1px solid rgba(255,255,255,0.3)",
              backgroundColor: condReverse1 ? "rgba(76, 175, 80, 0.15)" : "transparent",
              color: condReverse1 ? "#4caf50" : "rgba(255,255,255,0.5)",
              cursor: fetchCode ? "pointer" : "default",
              opacity: fetchCode ? 1 : 0.5,
            }}
          >
            revers
          </Box>
        </Box>
      </Box>

      {/* 조건 패턴 2 영역 */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 2 }}>
        {/* P 행 */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {[...Array(12)].map((_, idx) => {
            const char = condPattern2[idx];
            const isP = char === "P";
            return (
              <Box
                key={`cond2-p-${idx}`}
                onClick={() => {
                  if (!fetchCode) return;
                  let arr = condPattern2.padEnd(12, " ").split("");
                  arr[idx] = isP ? " " : "P";
                  const trimmed = arr.join("").replace(/ +$/, "");
                  setCondPattern2(trimmed);
                  handleCondPatternSave(2, "pattern", trimmed);
                }}
                sx={{
                  width: 28, height: 28,
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  backgroundColor: isP ? "#1565c0" : "#fff",
                  cursor: fetchCode ? "pointer" : "default",
                  opacity: fetchCode ? 1 : 0.5,
                }}
              >
                {isP && <Typography sx={{ fontSize: 12, fontWeight: "bold", color: "#fff" }}>P</Typography>}
              </Box>
            );
          })}
          <Box
            onClick={() => {
              if (!fetchCode) return;
              const newValue = !condEnabled2;
              // Yes 활성화 시 패턴 유효성 검사
              if (newValue) {
                const pattern = condPattern2.replace(/ +$/, "");
                if (!pattern) {
                  alert("패턴을 입력하세요.");
                  return;
                }
                if (pattern.includes(" ")) {
                  alert("패턴이 끊어져 있습니다. 앞에서부터 연속으로 입력하세요.");
                  return;
                }
              }
              setCondEnabled2(newValue);
              handleCondPatternSave(2, "enabled", newValue);
            }}
            sx={{
              width: 50, py: 0.5, fontSize: 12, ml: 1,
              textAlign: "center",
              border: condEnabled2 ? "1px solid #4caf50" : "1px solid rgba(255,255,255,0.3)",
              backgroundColor: condEnabled2 ? "rgba(76, 175, 80, 0.15)" : "transparent",
              color: condEnabled2 ? "#4caf50" : "rgba(255,255,255,0.5)",
              cursor: fetchCode ? "pointer" : "default",
              opacity: fetchCode ? 1 : 0.5,
            }}
          >
            Yes
          </Box>
        </Box>
        {/* B 행 */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {[...Array(12)].map((_, idx) => {
            const char = condPattern2[idx];
            const isB = char === "B";
            return (
              <Box
                key={`cond2-b-${idx}`}
                onClick={() => {
                  if (!fetchCode) return;
                  let arr = condPattern2.padEnd(12, " ").split("");
                  arr[idx] = isB ? " " : "B";
                  const trimmed = arr.join("").replace(/ +$/, "");
                  setCondPattern2(trimmed);
                  handleCondPatternSave(2, "pattern", trimmed);
                }}
                sx={{
                  width: 28, height: 28,
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 1,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  backgroundColor: isB ? "#f44336" : "#fff",
                  cursor: fetchCode ? "pointer" : "default",
                  opacity: fetchCode ? 1 : 0.5,
                }}
              >
                {isB && <Typography sx={{ fontSize: 12, fontWeight: "bold", color: "#fff" }}>B</Typography>}
              </Box>
            );
          })}
          <Box
            onClick={() => {
              if (!fetchCode) return;
              const newValue = !condReverse2;
              setCondReverse2(newValue);
              handleCondPatternSave(2, "reverse", newValue);
            }}
            sx={{
              width: 50, py: 0.5, fontSize: 12, ml: 1,
              textAlign: "center",
              border: condReverse2 ? "1px solid #4caf50" : "1px solid rgba(255,255,255,0.3)",
              backgroundColor: condReverse2 ? "rgba(76, 175, 80, 0.15)" : "transparent",
              color: condReverse2 ? "#4caf50" : "rgba(255,255,255,0.5)",
              cursor: fetchCode ? "pointer" : "default",
              opacity: fetchCode ? 1 : 0.5,
            }}
          >
            revers
          </Box>
        </Box>
      </Box>

      {/* 통계 표시 */}
      {pickStat && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            통계:
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2">
              발생 <Box component="span" sx={{ fontWeight: "bold", color: "#fff" }}>{pickStat.stat_total}</Box>회
            </Typography>
            <Typography variant="body2" sx={{ color: "#4caf50" }}>
              적중 <Box component="span" sx={{ fontWeight: "bold" }}>{pickStat.stat_hit}</Box>회
              {pickStat.hit_rate !== null && (
                <Box component="span" sx={{ ml: 0.5 }}>({pickStat.hit_rate}%)</Box>
              )}
            </Typography>
            <Typography variant="body2" sx={{ color: "#f44336" }}>
              미스 <Box component="span" sx={{ fontWeight: "bold" }}>{pickStat.stat_miss}</Box>회
              {pickStat.miss_rate !== null && (
                <Box component="span" sx={{ ml: 0.5 }}>({pickStat.miss_rate}%)</Box>
              )}
            </Typography>
          </Box>
        </Box>
      )}

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
          <Typography variant="body2">
            {shouldSplitIntoHalves(formatRange)
              ? `${formatRange}-${half === 1 ? "1" : "65"} ~ ${formatRange}-${half === 1 ? "64" : "128"}`
              : `${formatRange}-1~${formatRange}-${PATTERN_CONFIG[formatRange]?.count || 128}`
            }
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleNextFormat}>
          <ArrowForward />
        </IconButton>
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
              <Typography variant="caption" sx={{ color: "#4caf50" }}>{recalculateProgress}%</Typography>
            </>
          ) : (
            <Typography variant="caption">통계갱신</Typography>
          )}
        </Box>
      </Box>
      </Box>

      {/* 패턴 테이블 */}
      <Paper sx={{ backgroundColor: "background.paper", overflow: "hidden", flex: isMobile ? "none" : 1, display: "flex", flexDirection: "column", width: isMobile ? "100%" : CONTENT_WIDTH }}>
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
          <Box
            onClick={() => setPickMode(1)}
            sx={{
              width: 36, textAlign: "center", borderRadius: 1, py: 0.5, cursor: "pointer",
              border: pickMode === 1 ? "2px solid #4caf50" : "1px solid rgba(255,255,255,0.3)",
              backgroundColor: pickMode === 1 ? "rgba(76, 175, 80, 0.15)" : "transparent",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
            }}
          >
            <Typography variant="caption" sx={{ color: pickMode === 1 ? "#4caf50" : "inherit", fontWeight: pickMode === 1 ? "bold" : "normal" }}>1pick</Typography>
          </Box>
          <Box
            onClick={() => setPickMode(3)}
            sx={{
              width: 85, textAlign: "center", borderRadius: 1, py: 0.5, cursor: "pointer",
              border: pickMode === 3 ? "2px solid #4caf50" : "1px solid rgba(255,255,255,0.3)",
              backgroundColor: pickMode === 3 ? "rgba(76, 175, 80, 0.15)" : "transparent",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
            }}
          >
            <Typography variant="caption" sx={{ color: pickMode === 3 ? "#4caf50" : "inherit", fontWeight: pickMode === 3 ? "bold" : "normal" }}>3pick</Typography>
          </Box>
          <Box
            onClick={() => setPickMode(6)}
            sx={{
              width: 170, textAlign: "center", borderRadius: 1, py: 0.5, cursor: "pointer",
              border: pickMode === 6 ? "2px solid #4caf50" : "1px solid rgba(255,255,255,0.3)",
              backgroundColor: pickMode === 6 ? "rgba(76, 175, 80, 0.15)" : "transparent",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
            }}
          >
            <Typography variant="caption" sx={{ color: pickMode === 6 ? "#4caf50" : "inherit", fontWeight: pickMode === 6 ? "bold" : "normal" }}>6pick</Typography>
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

    </Box>
  );
}
