"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolInvocationStatusProps {
  toolName: string;
  args?: Record<string, any>;
  state: "partial-call" | "call" | "result";
  result?: unknown;
  className?: string;
}

interface ToolDescription {
  verb: string;
  fileName: string;
  secondaryFileName?: string;
}

function basename(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : path;
}

function describeToolCall(
  toolName: string,
  args: Record<string, any> | undefined,
  isComplete: boolean
): ToolDescription | null {
  if (!args) return null;

  const path = typeof args.path === "string" ? args.path : null;
  const name = path ? basename(path) : null;

  if (toolName === "str_replace_editor" && name) {
    switch (args.command) {
      case "create":
        return {
          verb: isComplete ? "Created" : "Creating",
          fileName: name,
        };
      case "str_replace":
      case "insert":
        return {
          verb: isComplete ? "Edited" : "Editing",
          fileName: name,
        };
      case "view":
        return {
          verb: isComplete ? "Viewed" : "Viewing",
          fileName: name,
        };
      case "undo_edit":
        return {
          verb: isComplete ? "Undid edit in" : "Undoing edit in",
          fileName: name,
        };
    }
  }

  if (toolName === "file_manager" && name) {
    if (args.command === "rename" && typeof args.new_path === "string") {
      return {
        verb: isComplete ? "Renamed" : "Renaming",
        fileName: name,
        secondaryFileName: basename(args.new_path),
      };
    }
    if (args.command === "delete") {
      return {
        verb: isComplete ? "Deleted" : "Deleting",
        fileName: name,
      };
    }
  }

  return null;
}

export function ToolInvocationStatus({
  toolName,
  args,
  state,
  result,
  className,
}: ToolInvocationStatusProps) {
  const isComplete = state === "result" && Boolean(result);
  const description = describeToolCall(toolName, args, isComplete);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200",
        className
      )}
    >
      {isComplete ? (
        <div
          aria-hidden="true"
          className="w-2 h-2 rounded-full bg-emerald-500"
        />
      ) : (
        <Loader2
          aria-hidden="true"
          className="w-3 h-3 animate-spin text-blue-600"
        />
      )}
      {description ? (
        <span className="text-neutral-700">
          {description.verb}{" "}
          <code className="font-mono text-neutral-900 font-medium">
            {description.fileName}
          </code>
          {description.secondaryFileName ? (
            <>
              {" → "}
              <code className="font-mono text-neutral-900 font-medium">
                {description.secondaryFileName}
              </code>
            </>
          ) : null}
        </span>
      ) : (
        <span className="font-mono text-neutral-700">{toolName}</span>
      )}
    </div>
  );
}
