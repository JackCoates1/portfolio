import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  ChangeEvent,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Terminal, X } from "lucide-react";
import { profile } from "@/data/profile";

// Hidden terminal — opens with backtick or the `~` pinned bottom-right,
// closes with Esc, `exit`, or the ×. Everything it prints is real site
// content; nothing here invents history or credentials.

type LineTone = "default" | "muted" | "error";

interface TerminalLine {
  id: number;
  type: "command" | "output";
  text: string;
  tone: LineTone;
}

type CommandResult =
  | { kind: "output"; lines: Array<{ text: string; tone: LineTone }> }
  | { kind: "clear" }
  | { kind: "exit" };

const PROMPT_USER = "visitor@jackcoates";
const PROMPT_PATH = ":~$";

const ABOUT_MD = profile.about.join("\n\n");

const SKILLS_MD = profile.skills
  .map(({ title, skills }) => `${`${title}:`.padEnd(18)}${skills.join(", ")}`)
  .join("\n");

const CONTACT_MD = [
  `email:    ${profile.contact.email}`,
  `github:   ${profile.contact.github}`,
  `linkedin: ${profile.contact.linkedin}`,
  `site:     ${profile.contact.site}`,
].join("\n");

const LS_OUTPUT =
  "about.md  contact.md  projects/  security-dashboard/  skills.md";

const HELP_OUTPUT = [
  "available commands:",
  "  whoami    who is behind this site",
  "  ls        list the site sections as files",
  "  cat       read a file, e.g. cat about.md",
  "  help      show this help",
  "  clear     clear the terminal",
  "  exit      close the terminal (Esc also works)",
].join("\n");

const BANNER: TerminalLine[] = [
  {
    id: 0,
    type: "output",
    text: "Jack Coates · jackcoates.co.uk",
    tone: "muted",
  },
  {
    id: 1,
    type: "output",
    text: "type 'help' for commands — 'exit' or Esc to close",
    tone: "muted",
  },
];

const fileContent = (path: string): CommandResult => {
  switch (path) {
    case "about.md":
      return { kind: "output", lines: [{ text: ABOUT_MD, tone: "default" }] };
    case "skills.md":
      return { kind: "output", lines: [{ text: SKILLS_MD, tone: "default" }] };
    case "contact.md":
      return { kind: "output", lines: [{ text: CONTACT_MD, tone: "default" }] };
    case "projects/":
    case "security-dashboard/":
      return {
        kind: "output",
        lines: [{ text: `cat: ${path}: Is a directory`, tone: "error" }],
      };
    default:
      return {
        kind: "output",
        lines: [{ text: `cat: ${path}: No such file or directory`, tone: "error" }],
      };
  }
};

const runCommand = (raw: string): CommandResult => {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "output", lines: [] };

  const [cmd, ...args] = trimmed.split(/\s+/);
  const arg = args.join(" ").trim();

  switch (cmd) {
    case "whoami":
      return {
        kind: "output",
        lines: [
          {
            text: profile.terminalSummary,
            tone: "default",
          },
        ],
      };
    case "ls":
      return { kind: "output", lines: [{ text: LS_OUTPUT, tone: "default" }] };
    case "cat":
      if (!arg) {
        return {
          kind: "output",
          lines: [{ text: "usage: cat <file>", tone: "muted" }],
        };
      }
      return fileContent(arg);
    case "help":
      return { kind: "output", lines: [{ text: HELP_OUTPUT, tone: "default" }] };
    case "clear":
      return { kind: "clear" };
    case "exit":
      return { kind: "exit" };
    default:
      return {
        kind: "output",
        lines: [{ text: `command not found: ${cmd}`, tone: "error" }],
      };
  }
};

const Prompt = () => (
  <span className="shrink-0">
    <span className="text-primary">{PROMPT_USER}</span>
    <span className="text-muted-foreground">{PROMPT_PATH}</span>{" "}
  </span>
);

const TerminalEasterEgg = () => {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<TerminalLine[]>(BANNER);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const nextId = useRef(BANNER.length);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const openTerminal = () => {
    openerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : triggerRef.current;
    setOpen(true);
  };

  const closeTerminal = () => setOpen(false);

  const appendCommand = (text: string) => {
    setLines((prev) => [
      ...prev,
      { id: nextId.current++, type: "command", text, tone: "default" },
    ]);
  };

  const appendOutput = (newLines: Array<{ text: string; tone: LineTone }>) => {
    setLines((prev) => [
      ...prev,
      ...newLines.map((line) => ({
        id: nextId.current++,
        type: "output" as const,
        text: line.text,
        tone: line.tone,
      })),
    ]);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const command = input;
    if (!command.trim()) return;

    appendCommand(command);
    setHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);
    setInput("");

    const result = runCommand(command);
    if (result.kind === "clear") {
      setLines([]);
      return;
    }
    if (result.kind === "exit") {
      closeTerminal();
      return;
    }
    appendOutput(result.lines);
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (history.length === 0) return;
      const next =
        historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setInput(history[next]);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex === -1) return;
      const next = historyIndex + 1;
      if (next >= history.length) {
        setHistoryIndex(-1);
        setInput("");
      } else {
        setHistoryIndex(next);
        setInput(history[next]);
      }
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isTrigger = event.key === "`" || event.key === "~";
      if (isTrigger && !open && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        const isTypingTarget =
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          (target?.isContentEditable ?? false);
        if (isTypingTarget) return;
        event.preventDefault();
        openTerminal();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const appRoot = document.getElementById("root");
    const previousOverflow = document.body.style.overflow;
    const previousAriaHidden = appRoot?.getAttribute("aria-hidden") ?? null;
    const wasInert = appRoot?.hasAttribute("inert") ?? false;
    const focusable = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

    document.body.style.overflow = "hidden";
    appRoot?.setAttribute("inert", "");
    appRoot?.setAttribute("aria-hidden", "true");

    const focusFrame = requestAnimationFrame(() => inputRef.current?.focus());
    const onModalKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeTerminal();
        return;
      }
      if (event.key !== "Tab") return;

      const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusable) ?? []);
      if (elements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onModalKeyDown);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onModalKeyDown);
      document.body.style.overflow = previousOverflow;
      if (!wasInert) appRoot?.removeAttribute("inert");
      if (previousAriaHidden === null) appRoot?.removeAttribute("aria-hidden");
      else appRoot?.setAttribute("aria-hidden", previousAriaHidden);
      requestAnimationFrame(() => openerRef.current?.focus());
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setInput("");
    }
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, open]);

  return (
    <>
      <button
          ref={triggerRef}
          type="button"
          onClick={openTerminal}
          hidden={open}
          aria-label="Open terminal"
          title="open terminal"
          className="fixed bottom-4 right-4 z-40 p-2 font-data text-sm leading-none text-muted-foreground/40 transition-colors hover:text-primary select-none"
        >
          ~
        </button>

      {open && createPortal((
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Terminal"
          tabIndex={-1}
          className="fixed inset-0 z-[100] flex flex-col bg-background font-data"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              <span>
                {PROMPT_USER}
                <span className="text-muted-foreground"> ~</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-[10px] text-muted-foreground">
                esc to close
              </span>
              <button
                type="button"
                onClick={closeTerminal}
                aria-label="Close terminal"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 text-sm leading-relaxed"
          >
            {lines.map((line) =>
              line.type === "command" ? (
                <div key={line.id} className="whitespace-pre-wrap break-words">
                  <Prompt />
                  <span className="text-foreground">{line.text}</span>
                </div>
              ) : (
                <div
                  key={line.id}
                  className={
                    line.tone === "error"
                      ? "whitespace-pre-wrap break-words text-destructive"
                      : line.tone === "muted"
                        ? "whitespace-pre-wrap break-words text-muted-foreground"
                        : "whitespace-pre-wrap break-words text-foreground"
                  }
                >
                  {line.text}
                </div>
              ),
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center border-t border-border px-4 py-3"
          >
            <Prompt />
            <input
              ref={inputRef}
              value={input}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setInput(event.target.value)
              }
              onKeyDown={handleInputKeyDown}
              aria-label="Terminal input"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 min-w-0 bg-transparent text-foreground outline-none border-none caret-[hsl(var(--primary))]"
            />
          </form>
        </div>
      ), document.body)}
    </>
  );
};

export default TerminalEasterEgg;
