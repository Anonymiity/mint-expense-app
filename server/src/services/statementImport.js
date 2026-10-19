/**
 * Statement import implementation is intentionally pending final user rules.
 * Expected workbook layout supplied so far:
 *   - header row starts at B13 and spans B:I
 *   - use Transaction Date, Transaction Remarks, Withdrawal Amount(INR), Deposit Amount(INR)
 *   - stop before a row containing "Legends Used in Account Statement"
 * 
 * The next iteration should parse source files, generate a preview, and require
 * per-row confirmation of amount, category, and description before persistence.
 * PDF extraction depends on the exact statement layout and should be tested
 * against a supplied sample rather than guessed.
 */
export function parseStatementFile() {
  throw new Error('Statement import rules have not been finalized yet.');
}
