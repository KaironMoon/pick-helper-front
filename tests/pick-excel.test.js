import assert from "node:assert/strict";
import test from "node:test";

import {
  PICK_EXCEL_HEADERS,
  parsePickExcelTsv,
  serializePickExcelTsv,
  writePickExcelClipboard,
} from "../src/pages/pick-management/pick-excel.js";

const rows = Array.from({ length: 4080 }, (_, index) => ({
  number: `X-${index + 1}`,
  nickname: index === 0 ? "첫째" : "",
  prev_picks: index === 0 ? "PBPB" : "BBBBBBBBBBB",
  next_pick_1: index === 0 ? "P" : "",
  next_pick_3: index === 0 ? "PBB" : "",
  next_pick_6: index === 0 ? "PBPBPB" : "",
}));

test("전체 패턴을 23열 TSV로 직렬화한다", () => {
  const lines = serializePickExcelTsv(rows).split(/\r?\n/);
  assert.equal(PICK_EXCEL_HEADERS.length, 23);
  assert.equal(lines.length, 4081);
  const first = lines[1].split("\t");
  assert.equal(first.length, 23);
  assert.deepEqual(first.slice(2, 13), ["P", "B", "P", "B", "", "", "", "", "", "", ""]);
  assert.deepEqual(first.slice(13), ["P", "P", "B", "B", "P", "B", "P", "B", "P", "B"]);
});

test("복사한 전체 표를 다시 검사해 가져온다", () => {
  const result = parsePickExcelTsv(serializePickExcelTsv(rows), rows);
  assert.deepEqual(result.errors, []);
  assert.equal(result.rowCount, 4080);
  assert.equal(result.rows[0].next_pick_6, "PBPBPB");
});

test("변경된 패턴과 중간이 빈 pick을 거부한다", () => {
  const table = serializePickExcelTsv(rows).split(/\r?\n/).map((line) => line.split("\t"));
  table[1][2] = "B";
  table[1][14] = "P";
  table[1][15] = "";
  table[1][16] = "B";
  const result = parsePickExcelTsv(table.map((line) => line.join("\t")).join("\r\n"), rows);
  assert.ok(result.errors.some((error) => error.includes("패턴이 일치하지")));
  assert.ok(result.errors.some((error) => error.includes("중간 빈칸")));
});

test("클립보드 API 실패 시 선택 복사를 사용한다", async () => {
  const textarea = { value: "", style: {}, setAttribute() {}, focus() {}, select() {}, remove() {} };
  const result = await writePickExcelClipboard("약칭\t번호", {
    clipboard: { writeText: async () => { throw new Error("denied"); } },
    doc: {
      body: { appendChild() {} },
      createElement: () => textarea,
      execCommand: (command) => command === "copy",
    },
  });
  assert.equal(result, "text");
  assert.equal(textarea.value, "약칭\t번호");
});
