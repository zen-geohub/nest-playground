import { GoogleAuthGuard } from "./google-auth.guard";

describe("GoogleAuthGuard", () => {
  let guard: GoogleAuthGuard;

  beforeEach(() => {
    guard = new GoogleAuthGuard();
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });
});
