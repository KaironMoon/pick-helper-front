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
export const getPick2ByPattern = (prevPicks, prevResults = null) => {
  const params = prevResults ? { prev_results: prevResults } : {};
  return apiCaller.get(`/api/v1/picks2/pattern/${prevPicks}`, params);
};

// jcn/jck 보정 포함 픽 조회
export const getPick2WithAdjustment = async (prevPicks, prevResults) => {
  // 1차: 기본 픽 조회
  const response = await getPick2ByPattern(prevPicks);

  // nickname이 jcn/jck인 경우에만 재호출
  const nickname = response?.data?.nickname?.toLowerCase();
  if (nickname === 'jcn' || nickname === 'jck') {
    // 2차: prev_results 포함해서 보정된 픽 조회
    return getPick2ByPattern(prevPicks, prevResults);
  }

  return response;
};
