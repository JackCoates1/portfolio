import { useEffect, useRef, useState } from "react";
import type {
  ChangeEvent,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Terminal, X } from "lucide-react";

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

const ABOUT_MD = [
  "I am a cyber security student based in Bradford, UK. Alongside studying I build real things — full-stack web apps, security tools, and infrastructure that actually runs in production.",
  "",
  "I run a Proxmox homelab with a k3s cluster, keep production sites live on a VPS, and automate anything that can be automated. If something can be made more secure or more reliable, I will poke at it until it is.",
].join("\n");

const SKILLS_MD = [
  "Security:         Wireshark, Metasploit, Nmap, Kali Linux, Pen Testing, DDoS Mitigation, Network Security, Cryptography",
  "Development:      Python, Node.js, Express, React, TypeScript, Bash, PowerShell, EJS",
  "Infrastructure:   Linux, Docker, Proxmox, k3s, nginx, Cloudflare, ArgoCD, PM2",
  "Tools & Services: Git, Stripe, Tailwind CSS, Vite, Brevo, Telegram API, SSH, Certbot",
].join("\n");

const CONTACT_MD = [
  "email:    coatesjack06@gmail.com",
  "github:   https://github.com/JackCoates1",
  "linkedin: https://www.linkedin.com/in/jack-coates-a8a430310",
  "site:     https://jackcoates.co.uk",
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
            text: "Jack Coates — developer and cyber security student based in Bradford, UK. I build production web apps, security tools, and run a homelab that probably does too much.",
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
      setOpen(false);
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
      if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
        return;
      }

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
        setOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setInput("");
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, open]);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open terminal"
          title="open terminal"
          className="fixed bottom-4 right-4 z-40 p-2 font-data text-sm leading-none text-muted-foreground/40 transition-colors hover:text-primary select-none"
        >
          ~
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Terminal"
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
                onClick={() => setOpen(false)}
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
      )}
    </>
  );
};

export default TerminalEasterEgg;
