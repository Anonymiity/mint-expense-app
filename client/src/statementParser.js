
import * as XLSX from 'xlsx';

const LEGENDS_MARKER = /Legends Used in Account Statement/i;

function cleanText(value) {
  return String(value ?? '').trim();
}

function parseAmount(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.abs(value) : 0;
  }

  const text = cleanText(value);
  if (!text || text === '-' || text === '—') return 0;

  const normalized = text
    .replace(/[₹,\s]/g, '')
    .replace(/^\((.*)\)$/, '-$1');

  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.abs(amount) : 0;
}

function findColumn(headers, patterns) {
  return headers.findIndex((header) =>
    patterns.some((pattern) => pattern.test(cleanText(header)))
  );
}

function isLegendsRow(row) {
  return row.some((cell) => LEGENDS_MARKER.test(cleanText(cell)));
}

function findTransactionHeader(rows) {
  return rows.findIndex((row) => {
    const headers = row.map((cell) => cleanText(cell));

    return (
      headers.some((h) => /^Transaction Date$/i.test(h)) &&
      headers.some((h) => /^Transaction Remarks?$/i.test(h))
    );
  });
}

function parseDateCell(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);

    if (date?.y && date?.m && date?.d) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }

  const text = cleanText(value);
  let match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  if (match) {
    // Bank statements commonly use DD/MM/YYYY.
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }

  match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }

  return '';
}

export async function parseExcelStatement(file) {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
  });

  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet) {
    throw new Error('No worksheet was found in this Excel file.');
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: '',
  });

  // The expected header is around Excel row 13, but search by names
  // so minor changes in the statement layout do not break importing.
  const headerIndex = findTransactionHeader(rows);

  if (headerIndex < 0) {
    throw new Error(
      'Could not find the table header. Expected Transaction Date and Transaction Remarks.'
    );
  }

  const headers = rows[headerIndex].map(cleanText);

  const dateCol = findColumn(headers, [/^Transaction Date$/i]);
  const remarksCol = findColumn(headers, [/^Transaction Remarks?$/i]);
  const withdrawalCol = findColumn(headers, [/Withdrawal Amount/i]);
  const depositCol = findColumn(headers, [/Deposit Amount/i]);

  if ([dateCol, remarksCol, withdrawalCol, depositCol].some((col) => col < 0)) {
    throw new Error(
      'Required columns are missing: Transaction Date, Transaction Remarks, Withdrawal Amount or Deposit Amount.'
    );
  }

  const transactions = [];

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];

    // Stop before processing the legends section.
    if (isLegendsRow(row)) break;

    const date = parseDateCell(row[dateCol]);
    const remarks = cleanText(row[remarksCol]);
    const withdrawal = parseAmount(row[withdrawalCol]);
    const deposit = parseAmount(row[depositCol]);

    // Skip blank rows and rows without a valid date.
    if (!date || (!remarks && withdrawal === 0 && deposit === 0)) {
      continue;
    }

    // A withdrawal is an expense.
    if (withdrawal > 0) {
      transactions.push({
        date,
        remarks: remarks || 'Bank withdrawal',
        amount: withdrawal,
        type: 'expense',
      });
    }

    // A deposit is income. A row containing both values creates
    // two transactions so neither amount is lost.
    if (deposit > 0) {
      transactions.push({
        date,
        remarks: remarks || 'Bank deposit',
        amount: deposit,
        type: 'income',
      });
    }
  }

  if (transactions.length === 0) {
    throw new Error(
      'No valid withdrawals or deposits were found before the legends marker.'
    );
  }

  return transactions;
}

export async function parseBankStatement(file) {
  const extension = file.name.split('.').pop().toLowerCase();

  if (extension === 'xls' || extension === 'xlsx') {
    return parseExcelStatement(file);
  }

  if (extension === 'pdf') {
    throw new Error(
      'PDF import is not connected to this parser yet. Use the Excel statement for now.'
    );
  }

  throw new Error('Choose an Excel file (.xls or .xlsx).');
}