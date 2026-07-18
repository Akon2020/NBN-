import ExcelJS from "exceljs";

// CLAUDE.md §12 — Excel via exceljs, CSV en génération native (pas de lib
// dédiée pour un format aussi simple). `columns` = [{ header, key }],
// partagé entre les deux formats pour ne jamais faire diverger leur
// contenu.
const escapeCsvValue = (value) => {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const toCsv = (rows, columns) => {
  const header = columns.map((c) => escapeCsvValue(c.header)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvValue(row[c.key])).join(",")
  );
  return [header, ...lines].join("\n");
};

export const toExcelBuffer = async (rows, columns, sheetName) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: 22 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));
  return workbook.xlsx.writeBuffer();
};
