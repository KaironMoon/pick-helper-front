import apiCaller from "./api-caller";

export const saveGame = (title, turns) => {
  return apiCaller.post("/api/v1/game/save", { title, turns });
};

// V2 API (새 필드 포함: predict_type, predict_order, pick_code)
export const saveGameV2 = (title, turns) => {
  return apiCaller.post("/api/v1/game/v2/save", { title, turns });
};

export const getGameList = (limit = 20, offset = 0) => {
  return apiCaller.get("/api/v1/game/list", { limit, offset });
};

export const getGame = (gameSeq) => {
  return apiCaller.get(`/api/v1/game/${gameSeq}`);
};

export const deleteGame = (gameSeq) => {
  return apiCaller.delete(`/api/v1/game/${gameSeq}`);
};

// V2 게임 상세 조회
export const getGameV2 = (gameSeq) => {
  return apiCaller.get(`/api/v1/game/v2/${gameSeq}`);
};

// 패턴별 게임 목록 조회 (앞 4자리)
export const getGamesByPattern = (pattern, limit = 20) => {
  return apiCaller.get(`/api/v1/game/by-pattern/${pattern}`, { limit });
};

// 전체 게임 목록 조회 (통계 포함)
export const getAllGamesWithStats = (limit = 500) => {
  return apiCaller.get("/api/v1/game/all-with-stats", { limit });
};

// 패턴별 게임 수 요약
export const getPatternSummary = () => {
  return apiCaller.get("/api/v1/game/patterns/summary");
};

// 게임 통계 재계산 (picks2 기준)
export const recalculateGameStats = () => {
  return apiCaller.post("/api/v1/game/recalculate-stats");
};

// game_stat 테이블에서 통계 조회 (ALL 또는 패턴)
export const getGameStat = (statKey) => {
  return apiCaller.get(`/api/v1/game/stat/${statKey}`);
};
