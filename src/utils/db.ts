/**
 * Helper function building parameterized SQL `INSERT` column lists, value arrays, and `$1, $2` placeholder strings.
 *
 * @param data - Object containing data key-value pairs.
 * @param allowedColumns - Set of allowed database column names to filter data against.
 * @returns Object containing comma-separated `columns` string, `values` array, `placeholders` string, and `nextIds` index counter.
 */
function buildInsert(
  data: Record<string, any>,
  allowedColumns: Set<string>,
): { columns: string; values: any[]; placeholders: string; nextIds: number } {
  const keys: string[] = [];
  const values: any[] = [];
  const placeholders: string[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (allowedColumns.has(key) && value !== undefined) {
      keys.push(`${key}`);
      values.push(value);
      placeholders.push(`$${idx}`);

      idx++;
    }
  }
  return {
    columns: keys.join(", "),
    values,
    placeholders: placeholders.join(", "),
    nextIds: idx,
  };
}

/**
 * Helper function building parameterized SQL `UPDATE` `SET` clause strings and value arrays.
 *
 * @param data - Object containing data key-value pairs.
 * @param allowedColumns - Set of allowed database column names to filter data against.
 * @returns Object containing comma-separated `setClauses` string, `values` array, and `nextIds` index counter.
 */
function buildUpdate(
  data: Record<string, any>,
  allowedColumns: Set<string>,
): { setClauses: string; values: any[]; nextIds: number } {
  const setClauses: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (allowedColumns.has(key) && value !== undefined) {
      setClauses.push(`${key} = $${idx}`);
      values.push(value);

      idx++;
    }
  }

  return {
    setClauses: setClauses.join(", "),
    values,
    nextIds: idx,
  };
}

export { buildInsert, buildUpdate };
