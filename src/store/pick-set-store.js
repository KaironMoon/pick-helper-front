import { atom } from "jotai";

// 현재 선택된 set_id (동기적으로 localStorage에서 읽어 첫 렌더부터 정확한 값 사용)
function getStoredSetId() {
  try {
    const stored = localStorage.getItem("pickSetId");
    return stored ? JSON.parse(stored) : 1;
  } catch {
    return 1;
  }
}

export const currentSetIdAtom = atom(getStoredSetId());

// 세트 목록
export const pickSetListAtom = atom([]);
