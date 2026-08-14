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
