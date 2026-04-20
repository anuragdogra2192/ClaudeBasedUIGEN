// @vitest-environment node
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

async function issueTokenViaCreateSession(userId: string, email: string) {
  const { createSession } = await import("../auth");
  let captured: string | undefined;
  cookieStore.set.mockImplementationOnce((_name: string, value: string) => {
    captured = value;
  });
  await createSession(userId, email);
  if (!captured) throw new Error("createSession did not set a cookie");
  return captured;
}

describe("getSession", () => {
  beforeEach(() => {
    cookieStore.get.mockReset();
    cookieStore.set.mockReset();
    cookieStore.delete.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("returns null when no auth-token cookie exists", async () => {
    cookieStore.get.mockReturnValue(undefined);
    const { getSession } = await import("../auth");

    const result = await getSession();

    expect(result).toBeNull();
    expect(cookieStore.get).toHaveBeenCalledWith("auth-token");
  });

  test("returns null when cookie has no value", async () => {
    cookieStore.get.mockReturnValue({ value: undefined });
    const { getSession } = await import("../auth");

    const result = await getSession();

    expect(result).toBeNull();
  });

  test("returns the session payload when token is valid", async () => {
    const token = await issueTokenViaCreateSession(
      "user-123",
      "test@example.com"
    );
    cookieStore.get.mockReturnValue({ value: token });
    const { getSession } = await import("../auth");

    const result = await getSession();

    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-123");
    expect(result?.email).toBe("test@example.com");
  });

  test("returns null when token is malformed", async () => {
    cookieStore.get.mockReturnValue({ value: "not-a-real-jwt" });
    const { getSession } = await import("../auth");

    const result = await getSession();

    expect(result).toBeNull();
  });

  test("returns null when token signature has been tampered with", async () => {
    const token = await issueTokenViaCreateSession(
      "user-123",
      "test@example.com"
    );
    const parts = token.split(".");
    const tampered = `${parts[0]}.${parts[1]}.${"A".repeat(parts[2].length)}`;
    cookieStore.get.mockReturnValue({ value: tampered });
    const { getSession } = await import("../auth");

    const result = await getSession();

    expect(result).toBeNull();
  });

  test("returns null when token is expired", async () => {
    const start = new Date("2026-01-01T00:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(start);

    const token = await issueTokenViaCreateSession(
      "user-123",
      "test@example.com"
    );

    // Advance past the 7-day expiry baked into createSession.
    vi.setSystemTime(new Date(start.getTime() + 8 * 24 * 60 * 60 * 1000));
    cookieStore.get.mockReturnValue({ value: token });
    const { getSession } = await import("../auth");

    const result = await getSession();

    expect(result).toBeNull();
  });
});
