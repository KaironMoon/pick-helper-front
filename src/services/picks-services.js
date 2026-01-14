import apiCaller from "./api-caller";

export const getPickBySeq = (seq, skipFilled = false, direction = null) => {
  const params = { skip_filled: skipFilled };
  if (direction) params.direction = direction;
  return apiCaller.get(`/api/v1/picks/seq/${seq}`, params);
};

export const getPickByPattern = (prevPicks) => {
  return apiCaller.get(`/api/v1/picks/pattern/${prevPicks}`);
};

export const setPick = (prevPicks, nextPick) => {
  return apiCaller.post("/api/v1/picks/set", { prev_picks: prevPicks, next_pick: nextPick });
};

export const deleteNextPick = (prevPicks) => {
  return apiCaller.delete(`/api/v1/picks/pattern/${prevPicks}/next`);
};

export const deletePattern = (prevPicks) => {
  return apiCaller.delete(`/api/v1/picks/pattern/${prevPicks}`);
};

export const addPattern = (prevPicks, nextPick = null) => {
  return apiCaller.post("/api/v1/picks/add", { prev_picks: prevPicks, next_pick: nextPick });
};

// picks2 API
export const getPick2ByPattern = (prevPicks) => {
  return apiCaller.get(`/api/v1/picks2/pattern/${prevPicks}`);
};
