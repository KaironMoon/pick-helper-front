import apiCaller from "./api-caller";

export const getPickSetList = () => {
  return apiCaller.get("/api/v1/pick-set/list");
};

export const createPickSet = (setName) => {
  return apiCaller.post("/api/v1/pick-set/create", { set_name: setName });
};

export const copyPickSet = (sourceSetId, setName) => {
  return apiCaller.post(`/api/v1/pick-set/copy/${sourceSetId}`, { set_name: setName });
};

export const updatePickSet = (setId, setName) => {
  return apiCaller.put(`/api/v1/pick-set/${setId}`, { set_name: setName });
};

export const deletePickSet = (setId) => {
  return apiCaller.delete(`/api/v1/pick-set/${setId}`);
};
