import apiCaller from "./api-caller";

const BASE = "/api/v1/random-pick";

// ========== Preset ==========

export const getPresets = () => {
  return apiCaller.get(`${BASE}/presets`);
};

export const getPreset = (presetSeq) => {
  return apiCaller.get(`${BASE}/presets/${presetSeq}`);
};

export const createPreset = (data) => {
  return apiCaller.post(`${BASE}/presets`, data);
};

export const updatePreset = (presetSeq, data) => {
  return apiCaller.put(`${BASE}/presets/${presetSeq}`, data);
};

// ========== Pick ==========

export const getPicks = (presetSeq, page = 1, pageSize = 20) => {
  const params = { page, page_size: pageSize };
  if (presetSeq) params.preset_seq = presetSeq;
  return apiCaller.get(`${BASE}/picks`, params);
};

export const getPickDetail = (pickSeq, page = 1, pageSize = 100, streakFilter = null) => {
  const params = { page, page_size: pageSize };
  if (streakFilter != null) params.streak_filter = streakFilter;
  return apiCaller.get(`${BASE}/picks/${pickSeq}`, params);
};

export const generatePicks = (presetSeq, count = 10) => {
  return apiCaller.post(`${BASE}/generate-picks/${presetSeq}`, { count });
};

export const generateMatches = (pickSeq, count = 100, reset = false) => {
  return apiCaller.post(`${BASE}/picks/${pickSeq}/generate`, { count, reset });
};

export const addMatch = (pickSeq, gameSeq) => {
  return apiCaller.post(`${BASE}/picks/${pickSeq}/add-match`, { game_seq: gameSeq });
};

export const resetMatches = (pickSeq) => {
  return apiCaller.delete(`${BASE}/picks/${pickSeq}/matches`);
};

export const approvePick = (pickSeq) => {
  return apiCaller.put(`${BASE}/picks/${pickSeq}/approve`);
};

export const updatePickSettings = (pickSeq, data) => {
  return apiCaller.put(`${BASE}/picks/${pickSeq}/settings`, data);
};

export const toggleApprovePick = (pickSeq) => {
  return apiCaller.put(`${BASE}/picks/${pickSeq}/toggle-approve`);
};

export const deletePick = (pickSeq) => {
  return apiCaller.put(`${BASE}/picks/${pickSeq}/delete`);
};

export const refreshStats = (presetSeq) => {
  return apiCaller.post(`${BASE}/refresh-stats/${presetSeq}`);
};
