import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, cleanup, waitFor } from "@testing-library/react";

const pushMock = vi.fn();
const signInActionMock = vi.fn();
const signUpActionMock = vi.fn();
const getAnonWorkDataMock = vi.fn();
const clearAnonWorkMock = vi.fn();
const getProjectsMock = vi.fn();
const createProjectMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => signInActionMock(...args),
  signUp: (...args: unknown[]) => signUpActionMock(...args),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => getAnonWorkDataMock(),
  clearAnonWork: () => clearAnonWorkMock(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: () => getProjectsMock(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => createProjectMock(...args),
}));

import { useAuth } from "@/hooks/use-auth";

beforeEach(() => {
  pushMock.mockReset();
  signInActionMock.mockReset();
  signUpActionMock.mockReset();
  getAnonWorkDataMock.mockReset().mockReturnValue(null);
  clearAnonWorkMock.mockReset();
  getProjectsMock.mockReset().mockResolvedValue([]);
  createProjectMock.mockReset().mockResolvedValue({ id: "new-project" });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("useAuth returns signIn, signUp, and isLoading=false initially", () => {
  const { result } = renderHook(() => useAuth());

  expect(typeof result.current.signIn).toBe("function");
  expect(typeof result.current.signUp).toBe("function");
  expect(result.current.isLoading).toBe(false);
});

test("signIn returns the action result on success", async () => {
  signInActionMock.mockResolvedValue({ success: true });
  getProjectsMock.mockResolvedValue([{ id: "existing-project" }]);

  const { result } = renderHook(() => useAuth());

  let returned: unknown;
  await act(async () => {
    returned = await result.current.signIn("user@example.com", "password123");
  });

  expect(signInActionMock).toHaveBeenCalledWith(
    "user@example.com",
    "password123"
  );
  expect(returned).toEqual({ success: true });
});

test("signIn returns the action result on failure without running post-sign-in", async () => {
  signInActionMock.mockResolvedValue({
    success: false,
    error: "Invalid credentials",
  });

  const { result } = renderHook(() => useAuth());

  let returned: unknown;
  await act(async () => {
    returned = await result.current.signIn("user@example.com", "wrong");
  });

  expect(returned).toEqual({ success: false, error: "Invalid credentials" });
  expect(getAnonWorkDataMock).not.toHaveBeenCalled();
  expect(getProjectsMock).not.toHaveBeenCalled();
  expect(createProjectMock).not.toHaveBeenCalled();
  expect(pushMock).not.toHaveBeenCalled();
});

test("signUp returns the action result on success", async () => {
  signUpActionMock.mockResolvedValue({ success: true });
  getProjectsMock.mockResolvedValue([{ id: "existing-project" }]);

  const { result } = renderHook(() => useAuth());

  let returned: unknown;
  await act(async () => {
    returned = await result.current.signUp("new@example.com", "password123");
  });

  expect(signUpActionMock).toHaveBeenCalledWith(
    "new@example.com",
    "password123"
  );
  expect(returned).toEqual({ success: true });
});

test("signUp returns the action result on failure without running post-sign-in", async () => {
  signUpActionMock.mockResolvedValue({
    success: false,
    error: "Email already registered",
  });

  const { result } = renderHook(() => useAuth());

  let returned: unknown;
  await act(async () => {
    returned = await result.current.signUp("taken@example.com", "password123");
  });

  expect(returned).toEqual({
    success: false,
    error: "Email already registered",
  });
  expect(createProjectMock).not.toHaveBeenCalled();
  expect(pushMock).not.toHaveBeenCalled();
});

test("successful sign-in with anonymous work creates a project from it and navigates", async () => {
  const anonMessages = [{ id: "m1", role: "user", content: "hi" }];
  const anonData = { "/": { type: "directory" } };

  signInActionMock.mockResolvedValue({ success: true });
  getAnonWorkDataMock.mockReturnValue({
    messages: anonMessages,
    fileSystemData: anonData,
  });
  createProjectMock.mockResolvedValue({ id: "anon-project-id" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(createProjectMock).toHaveBeenCalledTimes(1);
  const createArg = createProjectMock.mock.calls[0][0];
  expect(createArg.messages).toBe(anonMessages);
  expect(createArg.data).toBe(anonData);
  expect(createArg.name).toMatch(/^Design from /);

  expect(clearAnonWorkMock).toHaveBeenCalledTimes(1);
  expect(getProjectsMock).not.toHaveBeenCalled();
  expect(pushMock).toHaveBeenCalledWith("/anon-project-id");
});

test("successful sign-in without anon work navigates to most recent project", async () => {
  signInActionMock.mockResolvedValue({ success: true });
  getAnonWorkDataMock.mockReturnValue(null);
  getProjectsMock.mockResolvedValue([
    { id: "most-recent" },
    { id: "older" },
  ]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(createProjectMock).not.toHaveBeenCalled();
  expect(clearAnonWorkMock).not.toHaveBeenCalled();
  expect(pushMock).toHaveBeenCalledWith("/most-recent");
});

test("successful sign-in with no anon work and no projects creates a new one", async () => {
  signInActionMock.mockResolvedValue({ success: true });
  getAnonWorkDataMock.mockReturnValue(null);
  getProjectsMock.mockResolvedValue([]);
  createProjectMock.mockResolvedValue({ id: "fresh-project" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(createProjectMock).toHaveBeenCalledTimes(1);
  const createArg = createProjectMock.mock.calls[0][0];
  expect(createArg.messages).toEqual([]);
  expect(createArg.data).toEqual({});
  expect(createArg.name).toMatch(/^New Design #\d+$/);

  expect(pushMock).toHaveBeenCalledWith("/fresh-project");
});

test("anonymous work with empty messages falls through to projects lookup", async () => {
  signInActionMock.mockResolvedValue({ success: true });
  getAnonWorkDataMock.mockReturnValue({
    messages: [],
    fileSystemData: { "/": { type: "directory" } },
  });
  getProjectsMock.mockResolvedValue([{ id: "existing" }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(createProjectMock).not.toHaveBeenCalled();
  expect(clearAnonWorkMock).not.toHaveBeenCalled();
  expect(pushMock).toHaveBeenCalledWith("/existing");
});

test("isLoading is true while signIn is pending and false after", async () => {
  let resolveAction: (value: { success: boolean }) => void = () => {};
  signInActionMock.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveAction = resolve;
      })
  );

  const { result } = renderHook(() => useAuth());

  expect(result.current.isLoading).toBe(false);

  let signInPromise: Promise<unknown>;
  act(() => {
    signInPromise = result.current.signIn("user@example.com", "password123");
  });

  await waitFor(() => expect(result.current.isLoading).toBe(true));

  await act(async () => {
    resolveAction({ success: false });
    await signInPromise;
  });

  expect(result.current.isLoading).toBe(false);
});

test("isLoading is reset to false even when signIn action rejects", async () => {
  signInActionMock.mockRejectedValue(new Error("network down"));

  const { result } = renderHook(() => useAuth());

  await expect(
    act(async () => {
      await result.current.signIn("user@example.com", "password123");
    })
  ).rejects.toThrow("network down");

  expect(result.current.isLoading).toBe(false);
});

test("isLoading is reset to false even when signUp action rejects", async () => {
  signUpActionMock.mockRejectedValue(new Error("boom"));

  const { result } = renderHook(() => useAuth());

  await expect(
    act(async () => {
      await result.current.signUp("new@example.com", "password123");
    })
  ).rejects.toThrow("boom");

  expect(result.current.isLoading).toBe(false);
});

test("successful sign-up with anonymous work runs the same post-sign-in flow", async () => {
  const anonMessages = [{ id: "m1", role: "user", content: "hi" }];
  const anonData = { "/": { type: "directory" }, "/App.jsx": {} };

  signUpActionMock.mockResolvedValue({ success: true });
  getAnonWorkDataMock.mockReturnValue({
    messages: anonMessages,
    fileSystemData: anonData,
  });
  createProjectMock.mockResolvedValue({ id: "from-signup" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("new@example.com", "password123");
  });

  expect(createProjectMock).toHaveBeenCalledTimes(1);
  expect(clearAnonWorkMock).toHaveBeenCalledTimes(1);
  expect(pushMock).toHaveBeenCalledWith("/from-signup");
});
