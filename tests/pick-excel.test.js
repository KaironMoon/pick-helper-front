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
  assert.equal(PICK_EXCEL_HEADERS.at(-1), "번호");
  assert.deepEqual(first.slice(1, 12), ["P", "B", "P", "B", "", "", "", "", "", "", ""]);
  assert.deepEqual(first.slice(12, 22), ["P", "P", "B", "B", "P", "B", "P", "B", "P", "B"]);
  assert.equal(first[22], '="X-1"');
});

test("Excel이 날짜로 바꾼 번호를 원래 패턴 번호로 복구한다", () => {
  const dateRows = rows.map((row, index) => index === 0 ? { ...row, number: "1-1" } : row);
  const table = serializePickExcelTsv(dateRows).split(/\r?\n/).map((line) => line.split("\t"));
  table[1][22] = "1월 1일";

  const result = parsePickExcelTsv(table.map((line) => line.join("\t")).join("\r\n"), dateRows);

  assert.deepEqual(result.errors, []);
  assert.equal(result.rows[0].number, "1-1");
});

test("복사한 전체 표를 다시 검사해 가져온다", () => {
  const result = parsePickExcelTsv(serializePickExcelTsv(rows), rows);
  assert.deepEqual(result.errors, []);
  assert.equal(result.rowCount, 4080);
  assert.equal(result.rows[0].next_pick_6, "PBPBPB");
});

test("변경된 패턴과 중간이 빈 pick을 거부한다", () => {
  const table = serializePickExcelTsv(rows).split(/\r?\n/).map((line) => line.split("\t"));
  table[1][1] = "B";
  table[1][13] = "P";
  table[1][14] = "";
  table[1][15] = "B";
  const result = parsePickExcelTsv(table.map((line) => line.join("\t")).join("\r\n"), rows);
  assert.ok(result.errors.some((error) => error.includes("패턴이 일치하지")));
  assert.ok(result.errors.some((error) => error.includes("중간 빈칸")));
});

test("Clipboard API로 TSV를 복사한다", async () => {
  let copiedText = "";
  const text = serializePickExcelTsv(rows.slice(0, 1));
  const result = await writePickExcelClipboard(text, {
    clipboard: { writeText: async (text) => { copiedText = text; } },
    doc: null,
  });
  assert.equal(result, "text");
  assert.equal(copiedText, text);
});

test("Clipboard API가 실패하면 textarea 선택 복사로 대체한다", async () => {
  const textarea = {
    style: {},
    setAttribute() {},
    focus() {},
    select() {},
    remove() {},
    value: "",
  };
  const text = serializePickExcelTsv(rows.slice(0, 1));
  const result = await writePickExcelClipboard(text, {
    clipboard: { writeText: async () => { throw new Error("denied"); } },
    doc: {
      body: { appendChild() {} },
      createElement: () => textarea,
      execCommand: (command) => command === "copy",
    },
  });
  assert.equal(result, "text");
  assert.equal(textarea.value, text);
});
