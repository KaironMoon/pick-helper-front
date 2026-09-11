export const PICK_EXCEL_ROW_COUNT = 4080;

export const PICK_EXCEL_HEADERS = [
  "약칭",
  ...Array.from({ length: 11 }, (_, index) => `패턴${index + 1}`),
  "1pick",
  ...Array.from({ length: 3 }, (_, index) => `3pick${index + 1}`),
  ...Array.from({ length: 6 }, (_, index) => `6pick${index + 1}`),
  "번호",
];

const tsvCell = (value) => String(value ?? "").replace(/[\t\r\n]+/g, " ");

function splitIntoCells(value, length) {
  const cells = String(value || "").split("").slice(0, length);
  return [...cells, ...Array(Math.max(0, length - cells.length)).fill("")];
}

function excelTextFormula(value) {
  return `="${String(value ?? "").replaceAll('"', '""')}"`;
}

function normalizeExcelNumber(value) {
  let normalized = String(value || "").replace(/[\u200B\u2060\uFEFF]/g, "").trim().toUpperCase();
  const formulaMatch = normalized.match(/^="([^"]+)"$/);
  if (formulaMatch) normalized = formulaMatch[1].replaceAll('""', '"');
  if (normalized.startsWith("'")) normalized = normalized.slice(1);

  const koreanDateMatch = normalized.match(/^(\d{1,2})월\s*(\d{1,2})일$/);
  if (koreanDateMatch) {
    normalized = `${Number(koreanDateMatch[1])}-${Number(koreanDateMatch[2])}`;
  }
  return normalized;
}

export function serializePickExcelTsv(rows) {
  const body = rows.map((row) => [
    row.nickname || "",
    ...splitIntoCells(row.prev_picks, 11),
    ...splitIntoCells(row.next_pick_1, 1),
    ...splitIntoCells(row.next_pick_3, 3),
    ...splitIntoCells(row.next_pick_6, 6),
    excelTextFormula(row.number),
  ]);
  return [PICK_EXCEL_HEADERS, ...body]
    .map((row) => row.map(tsvCell).join("\t"))
    .join("\r\n");
}

export async function writePickExcelClipboard(
  text,
  {
    clipboard = globalThis.navigator?.clipboard,
    doc = globalThis.document,
  } = {},
) {
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text);
      return "text";
    } catch {
      // 권한 문제면 동기식 텍스트 선택 복사로 이어간다.
    }
  }

  if (doc?.body && typeof doc.execCommand === "function") {
    const textarea = doc.createElement("textarea");
    let copied = false;
    try {
      textarea.value = text;
      textarea.setAttribute("aria-hidden", "true");
      textarea.style.position = "fixed";
      textarea.style.top = "-10000px";
      textarea.style.left = "0";
      doc.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      copied = doc.execCommand("copy");
    } finally {
      textarea.remove();
    }
    if (!copied) throw new Error("Clipboard copy failed.");
    return "text";
  }
  throw new Error("Clipboard copy failed.");
}

function splitTsv(text) {
  return String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line, index, lines) => line.length > 0 || index < lines.length - 1)
    .map((line) => line.split("\t").map((cell) => cell.trim()));
}

function parsePickCells(cells, label, rowNumber, errors) {
  const normalized = cells.map((value) => value.toUpperCase());
  normalized.forEach((value, index) => {
    if (value && value !== "P" && value !== "B") {
      errors.push(`${rowNumber}행 / ${label}${cells.length > 1 ? index + 1 : ""}: P, B 또는 빈칸만 입력할 수 있습니다.`);
    }
  });
  const firstEmpty = normalized.findIndex((value) => !value);
  if (firstEmpty >= 0 && normalized.slice(firstEmpty + 1).some(Boolean)) {
    errors.push(`${rowNumber}행 / ${label}: 중간 빈칸 없이 왼쪽부터 입력해주세요.`);
  }
  return normalized.filter(Boolean).join("");
}

export function parsePickExcelTsv(text, expectedRows) {
  const table = splitTsv(text);
  if (!table.length || table.every((row) => row.every((cell) => !cell))) {
    return { errors: ["엑셀에서 복사한 내용을 붙여넣어주세요."], rows: null, rowCount: 0 };
  }
  const header = table[0] || [];
  if (header.length !== PICK_EXCEL_HEADERS.length || PICK_EXCEL_HEADERS.some((value, index) => header[index] !== value)) {
    return {
      errors: ["표 머리글이 다릅니다. 먼저 ‘엑셀로 복사’로 만든 표를 수정한 뒤 붙여넣어주세요."],
      rows: null,
      rowCount: Math.max(0, table.length - 1),
    };
  }

  const expectedByNumber = new Map(expectedRows.map((row) => [row.number, row]));
  const imported = new Map();
  const errors = [];
  table.slice(1).forEach((cells, dataIndex) => {
    const excelRow = dataIndex + 2;
    if (cells.every((cell) => !cell)) return;
    if (cells.length !== PICK_EXCEL_HEADERS.length) {
      errors.push(`${excelRow}행: 열 개수가 ${cells.length}개입니다. ${PICK_EXCEL_HEADERS.length}개가 필요합니다.`);
      return;
    }
    const number = normalizeExcelNumber(cells[22]);
    const expected = expectedByNumber.get(number);
    if (!expected) {
      errors.push(`${excelRow}행: 현재 픽 세트에 없는 번호 ‘${number || "빈칸"}’입니다.`);
      return;
    }
    if (imported.has(number)) {
      errors.push(`${excelRow}행: 번호 ${number}가 중복되었습니다.`);
      return;
    }

    const importedPattern = parsePickCells(cells.slice(1, 12), "패턴", excelRow, errors);
    if (importedPattern.length !== expected.prev_picks.length) {
      errors.push(`${excelRow}행 / 패턴: 번호 ${number}는 ${expected.prev_picks.length}자리 패턴이어야 합니다.`);
    }
    const nextPick1 = parsePickCells(cells.slice(12, 13), "1pick", excelRow, errors);
    const nextPick3 = parsePickCells(cells.slice(13, 16), "3pick", excelRow, errors);
    const nextPick6 = parsePickCells(cells.slice(16, 22), "6pick", excelRow, errors);
    imported.set(number, {
      number,
      nickname: cells[0],
      prev_picks: importedPattern,
      next_pick_1: nextPick1,
      next_pick_3: nextPick3,
      next_pick_6: nextPick6,
    });
  });

  expectedRows.forEach((row) => {
    if (!imported.has(row.number)) errors.push(`${row.number}: 행이 누락되었습니다.`);
  });
  if (expectedRows.length !== PICK_EXCEL_ROW_COUNT) {
    errors.push(`현재 픽 세트의 전체 패턴이 ${PICK_EXCEL_ROW_COUNT}개가 아닙니다.`);
  }
  if (errors.length) return { errors, rows: null, rowCount: imported.size };
  return {
    errors: [],
    rows: expectedRows.map((row) => imported.get(row.number)),
    rowCount: imported.size,
  };
}
