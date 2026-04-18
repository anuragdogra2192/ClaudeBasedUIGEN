import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ToolInvocationStatus } from "../ToolInvocationStatus";

afterEach(() => {
  cleanup();
});

describe("str_replace_editor", () => {
  test("shows 'Creating <filename>' while create is in progress", () => {
    render(
      <ToolInvocationStatus
        toolName="str_replace_editor"
        args={{ command: "create", path: "/components/Card.jsx" }}
        state="call"
      />
    );
    expect(screen.getByText("Creating")).toBeDefined();
    expect(screen.getByText("Card.jsx")).toBeDefined();
  });

  test("shows 'Created <filename>' when create finishes with a result", () => {
    render(
      <ToolInvocationStatus
        toolName="str_replace_editor"
        args={{ command: "create", path: "/components/Card.jsx" }}
        state="result"
        result="ok"
      />
    );
    expect(screen.getByText("Created")).toBeDefined();
    expect(screen.getByText("Card.jsx")).toBeDefined();
  });

  test("shows 'Editing <filename>' for str_replace command", () => {
    render(
      <ToolInvocationStatus
        toolName="str_replace_editor"
        args={{
          command: "str_replace",
          path: "/App.jsx",
          old_str: "foo",
          new_str: "bar",
        }}
        state="call"
      />
    );
    expect(screen.getByText("Editing")).toBeDefined();
    expect(screen.getByText("App.jsx")).toBeDefined();
  });

  test("shows 'Editing <filename>' for insert command", () => {
    render(
      <ToolInvocationStatus
        toolName="str_replace_editor"
        args={{
          command: "insert",
          path: "/App.jsx",
          insert_line: 5,
          new_str: "foo",
        }}
        state="call"
      />
    );
    expect(screen.getByText("Editing")).toBeDefined();
    expect(screen.getByText("App.jsx")).toBeDefined();
  });

  test("shows 'Viewing <filename>' for view command", () => {
    render(
      <ToolInvocationStatus
        toolName="str_replace_editor"
        args={{ command: "view", path: "/App.jsx" }}
        state="call"
      />
    );
    expect(screen.getByText("Viewing")).toBeDefined();
  });

  test("shows 'Undoing edit in <filename>' for undo_edit command", () => {
    render(
      <ToolInvocationStatus
        toolName="str_replace_editor"
        args={{ command: "undo_edit", path: "/App.jsx" }}
        state="call"
      />
    );
    expect(screen.getByText("Undoing edit in")).toBeDefined();
    expect(screen.getByText("App.jsx")).toBeDefined();
  });
});

describe("file_manager", () => {
  test("shows rename with old and new basenames", () => {
    render(
      <ToolInvocationStatus
        toolName="file_manager"
        args={{
          command: "rename",
          path: "/Old.jsx",
          new_path: "/components/New.jsx",
        }}
        state="call"
      />
    );
    expect(screen.getByText(/Renaming/)).toBeDefined();
    expect(screen.getByText("Old.jsx")).toBeDefined();
    expect(screen.getByText("New.jsx")).toBeDefined();
  });

  test("uses past tense when rename completes", () => {
    render(
      <ToolInvocationStatus
        toolName="file_manager"
        args={{
          command: "rename",
          path: "/Old.jsx",
          new_path: "/New.jsx",
        }}
        state="result"
        result={{ success: true }}
      />
    );
    expect(screen.getByText(/Renamed/)).toBeDefined();
  });

  test("shows 'Deleting <filename>' for delete command", () => {
    render(
      <ToolInvocationStatus
        toolName="file_manager"
        args={{ command: "delete", path: "/components/Card.jsx" }}
        state="call"
      />
    );
    expect(screen.getByText("Deleting")).toBeDefined();
    expect(screen.getByText("Card.jsx")).toBeDefined();
  });

  test("falls back to raw toolName when rename has no new_path", () => {
    render(
      <ToolInvocationStatus
        toolName="file_manager"
        args={{ command: "rename", path: "/Old.jsx" }}
        state="call"
      />
    );
    expect(screen.getByText("file_manager")).toBeDefined();
    expect(screen.queryByText("Renaming")).toBeNull();
  });
});

describe("fallback behavior", () => {
  test("falls back to raw toolName when toolName is unknown", () => {
    render(
      <ToolInvocationStatus
        toolName="mystery_tool"
        args={{ foo: "bar" }}
        state="call"
      />
    );
    expect(screen.getByText("mystery_tool")).toBeDefined();
  });

  test("falls back to raw toolName when args are undefined", () => {
    render(
      <ToolInvocationStatus
        toolName="str_replace_editor"
        state="call"
      />
    );
    expect(screen.getByText("str_replace_editor")).toBeDefined();
  });

  test("falls back when path is missing", () => {
    render(
      <ToolInvocationStatus
        toolName="str_replace_editor"
        args={{ command: "create" }}
        state="call"
      />
    );
    expect(screen.getByText("str_replace_editor")).toBeDefined();
    expect(screen.queryByText("Creating")).toBeNull();
  });

  test("falls back when command is not recognized", () => {
    render(
      <ToolInvocationStatus
        toolName="str_replace_editor"
        args={{ command: "bogus", path: "/App.jsx" }}
        state="call"
      />
    );
    expect(screen.getByText("str_replace_editor")).toBeDefined();
  });
});

describe("state indicators", () => {
  test("renders spinner when state is 'call'", () => {
    const { container } = render(
      <ToolInvocationStatus
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="call"
      />
    );
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(container.querySelector(".bg-emerald-500")).toBeNull();
  });

  test("renders spinner when state is 'partial-call'", () => {
    const { container } = render(
      <ToolInvocationStatus
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="partial-call"
      />
    );
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  test("renders green dot when state is 'result' and result is present", () => {
    const { container } = render(
      <ToolInvocationStatus
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="result"
        result="Success"
      />
    );
    expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
    expect(container.querySelector(".animate-spin")).toBeNull();
  });

  test("renders spinner when state is 'result' but result is falsy", () => {
    const { container } = render(
      <ToolInvocationStatus
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="result"
      />
    );
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(container.querySelector(".bg-emerald-500")).toBeNull();
  });

  test("in-progress verb is used when state is 'result' but result is falsy", () => {
    render(
      <ToolInvocationStatus
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="result"
      />
    );
    expect(screen.getByText("Creating")).toBeDefined();
    expect(screen.queryByText("Created")).toBeNull();
  });
});

describe("basename handling", () => {
  test("extracts basename from a deeply nested path", () => {
    render(
      <ToolInvocationStatus
        toolName="str_replace_editor"
        args={{
          command: "create",
          path: "/src/components/ui/Button.jsx",
        }}
        state="call"
      />
    );
    expect(screen.getByText("Button.jsx")).toBeDefined();
    expect(screen.queryByText("/src/components/ui/Button.jsx")).toBeNull();
  });

  test("handles a path without a leading slash", () => {
    render(
      <ToolInvocationStatus
        toolName="str_replace_editor"
        args={{ command: "create", path: "App.jsx" }}
        state="call"
      />
    );
    expect(screen.getByText("App.jsx")).toBeDefined();
  });
});
