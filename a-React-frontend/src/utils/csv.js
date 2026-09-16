/**
 * One cell, escaped.
 *
 * A value holding a comma, a quote or a newline is wrapped in quotes with its own
 * quotes doubled — the only escape the format has. A value that *starts* with `=`,
 * `+`, `-` or `@` also gets an apostrophe in front: a spreadsheet reads those as
 * formulas, and everything exported here is a name, a username or an email that
 * somebody typed in themselves.
 */
const cell = (value) => {
  const text = value == null ? '' : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

/**
 * Byte-order mark. Excel reads a CSV as its local codepage unless the file opens
 * with one, mangling every name that is not plain ASCII. Built from its code point
 * rather than pasted in, since the character itself is invisible in an editor.
 */
const BOM = String.fromCharCode(0xfeff);

/**
 * Offer `rows` — arrays of values, in the order of `headers` — as a CSV download.
 *
 * Built in the browser rather than requested from the API, because what an export
 * should hold is whatever the screen is showing: the search, the filters and the sort
 * order the person is looking at. The server knows about none of those.
 */
export const downloadCsv = (filename, headers, rows) => {
  const body = [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([BOM + body], { type: 'text/csv;charset=utf-8' }));

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
};
