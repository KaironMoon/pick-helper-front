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
