import { buildInsert, buildUpdate } from "./db";

describe("db utils", () => {
  describe("buildInsert", () => {
    it("should construct columns, values, and placeholders for allowed fields", () => {
      const data = {
        name: "John Doe",
        email: "john@example.com",
        ignoredField: "should be ignored",
        undefinedField: undefined,
      };

      const allowedColumns = new Set(["name", "email"]);

      const result = buildInsert(data, allowedColumns);

      expect(result.columns).toBe("name, email");
      expect(result.values).toEqual(["John Doe", "john@example.com"]);
      expect(result.placeholders).toBe("$1, $2");
      expect(result.nextIds).toBe(3);
    });

    it("should return empty results if no allowed columns match", () => {
      const data = { foo: "bar" };
      const allowedColumns = new Set(["name", "email"]);

      const result = buildInsert(data, allowedColumns);

      expect(result.columns).toBe("");
      expect(result.values).toEqual([]);
      expect(result.placeholders).toBe("");
      expect(result.nextIds).toBe(1);
    });
  });

  describe("buildUpdate", () => {
    it("should construct setClauses, values, and nextIds for allowed fields", () => {
      const data = {
        name: "Jane Doe",
        email: "jane@example.com",
        ignoredField: "ignore",
        undefinedField: undefined,
      };

      const allowedColumns = new Set(["name", "email"]);

      const result = buildUpdate(data, allowedColumns);

      expect(result.setClauses).toBe("name = $1, email = $2");
      expect(result.values).toEqual(["Jane Doe", "jane@example.com"]);
      expect(result.nextIds).toBe(3);
    });
  });
});
