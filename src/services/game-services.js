import apiCaller from "./api-caller";

export const saveGame = (title, turns) => {
  return apiCaller.post("/api/v1/game/save", { title, turns });
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
