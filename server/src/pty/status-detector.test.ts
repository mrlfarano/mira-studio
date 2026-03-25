import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StatusDetector, DEFAULT_CONFIG } from "./status-detector.js";

describe("StatusDetector", () => {
  let detector: StatusDetector;

  beforeEach(() => {
    vi.useFakeTimers();
    detector = new StatusDetector();
  });

  afterEach(() => {
    detector.dispose();
    vi.useRealTimers();
  });

  // ── Idle detection ──────────────────────────────────────────────────────

  describe("idle detection", () => {
    it("transitions to idle after timeout when prompt is detected", () => {
      const cb = vi.fn();
      detector.onStatusChange(cb);

      detector.feed("user@host:~$ ");
      // Should be running right after output
      expect(detector.getStatus()).toBe("running");

      // Advance past idle timeout
      vi.advanceTimersByTime(DEFAULT_CONFIG.idleTimeoutMs + 100);

      expect(detector.getStatus()).toBe("idle");
      expect(cb).toHaveBeenCalledWith("idle");
    });

    it("detects > prompt as idle", () => {
      detector.feed("some output\n> ");
      vi.advanceTimersByTime(DEFAULT_CONFIG.idleTimeoutMs + 100);
      expect(detector.getStatus()).toBe("idle");
    });

    it("detects % prompt as idle", () => {
      detector.feed("% ");
      vi.advanceTimersByTime(DEFAULT_CONFIG.idleTimeoutMs + 100);
      expect(detector.getStatus()).toBe("idle");
    });

    it("detects # prompt as idle (root shell)", () => {
      detector.feed("root@host:/# ");
      vi.advanceTimersByTime(DEFAULT_CONFIG.idleTimeoutMs + 100);
      expect(detector.getStatus()).toBe("idle");
    });

    it("detects Python REPL prompt as idle", () => {
      detector.feed(">>> ");
      vi.advanceTimersByTime(DEFAULT_CONFIG.idleTimeoutMs + 100);
      expect(detector.getStatus()).toBe("idle");
    });

    it("does NOT transition to idle without prompt pattern", () => {
      detector.feed("some random output with no prompt");
      vi.advanceTimersByTime(DEFAULT_CONFIG.idleTimeoutMs + 100);
      // Should stay running because no prompt was detected
      expect(detector.getStatus()).toBe("running");
    });

    it("resets idle timer on new output", () => {
      const cb = vi.fn();
      detector.onStatusChange(cb);

      detector.feed("user@host:~$ ");
      vi.advanceTimersByTime(DEFAULT_CONFIG.idleTimeoutMs - 500);
      // New output resets the timer
      detector.feed("user@host:~$ ");
      vi.advanceTimersByTime(DEFAULT_CONFIG.idleTimeoutMs - 500);
      // Should still be running (timer was reset)
      expect(detector.getStatus()).toBe("running");

      // Now let the full timeout elapse
      vi.advanceTimersByTime(600);
      expect(detector.getStatus()).toBe("idle");
    });

    it("supports custom idle timeout", () => {
      detector.dispose();
      detector = new StatusDetector({ idleTimeoutMs: 1000 });
      detector.feed("$ ");
      vi.advanceTimersByTime(1100);
      expect(detector.getStatus()).toBe("idle");
    });
  });

  // ── Thinking detection ──────────────────────────────────────────────────

  describe("thinking detection", () => {
    it("detects braille spinner characters", () => {
      const status = detector.feed("\u280B");
      expect(status).toBe("thinking");
      expect(detector.getStatus()).toBe("thinking");
    });

    it("detects ASCII spinner characters", () => {
      expect(detector.feed("/")).toBe("thinking");
      expect(detector.feed("-")).toBe("thinking");
      expect(detector.feed("\\")).toBe("thinking");
      expect(detector.feed("|")).toBe("thinking");
    });

    it("detects 'thinking' keyword", () => {
      const status = detector.feed("Agent is thinking...");
      expect(status).toBe("thinking");
    });

    it("detects 'processing' keyword", () => {
      const status = detector.feed("Processing your request");
      expect(status).toBe("thinking");
    });

    it("detects 'loading' keyword", () => {
      expect(detector.feed("Loading modules...")).toBe("thinking");
    });

    it("detects 'analyzing' keyword", () => {
      expect(detector.feed("Analyzing codebase...")).toBe("thinking");
    });

    it("detects 'generating' keyword", () => {
      expect(detector.feed("Generating response...")).toBe("thinking");
    });

    it("detects 'compiling' keyword", () => {
      expect(detector.feed("Compiling TypeScript...")).toBe("thinking");
    });

    it("is case-insensitive for thinking keywords", () => {
      expect(detector.feed("THINKING about it")).toBe("thinking");
      expect(detector.feed("Processing...")).toBe("thinking");
    });

    it("does not treat long output with a spinner char as thinking", () => {
      // Spinner detection only applies to short output (<=3 chars)
      const status = detector.feed("This is a long line with a / in it that is not a spinner");
      expect(status).toBe("running");
    });
  });

  // ── Running detection ───────────────────────────────────────────────────

  describe("running detection", () => {
    it("reports running for normal output", () => {
      const status = detector.feed("Building project...\nStep 1 of 5\n");
      expect(status).toBe("running");
    });

    it("reports running for multi-line output", () => {
      const status = detector.feed("line 1\nline 2\nline 3\n");
      expect(status).toBe("running");
    });

    it("transitions from idle back to running on new output", () => {
      detector.feed("$ ");
      vi.advanceTimersByTime(DEFAULT_CONFIG.idleTimeoutMs + 100);
      expect(detector.getStatus()).toBe("idle");

      detector.feed("npm install\n");
      expect(detector.getStatus()).toBe("running");
    });

    it("transitions from thinking to running on normal output", () => {
      detector.feed("\u280B");
      expect(detector.getStatus()).toBe("thinking");

      detector.feed("Done! Output is ready.\n");
      expect(detector.getStatus()).toBe("running");
    });
  });

  // ── Error detection ─────────────────────────────────────────────────────

  describe("error detection", () => {
    it("detects 'Error:' pattern", () => {
      const status = detector.feed("TypeError: Cannot read property 'x' of undefined");
      expect(status).toBe("error");
    });

    it("detects 'ERROR' pattern", () => {
      expect(detector.feed("[ERROR] Build failed")).toBe("error");
    });

    it("detects 'FAIL' pattern", () => {
      expect(detector.feed("FAIL src/test.ts")).toBe("error");
    });

    it("detects 'failed' pattern (case-insensitive)", () => {
      expect(detector.feed("Build failed with 2 errors")).toBe("error");
    });

    it("detects 'FATAL' pattern", () => {
      expect(detector.feed("FATAL: unable to connect")).toBe("error");
    });

    it("detects 'panic' pattern", () => {
      expect(detector.feed("panic: runtime error")).toBe("error");
    });

    it("detects ENOENT", () => {
      expect(detector.feed("ENOENT: no such file")).toBe("error");
    });

    it("detects EACCES", () => {
      expect(detector.feed("EACCES: permission denied")).toBe("error");
    });

    it("detects EPERM", () => {
      expect(detector.feed("EPERM: operation not permitted")).toBe("error");
    });

    it("detects ERR!", () => {
      expect(detector.feed("npm ERR! code ERESOLVE")).toBe("error");
    });

    it("detects 'command not found'", () => {
      expect(detector.feed("zsh: command not found: foobar")).toBe("error");
    });

    it("detects 'segmentation fault'", () => {
      expect(detector.feed("Segmentation fault (core dumped)")).toBe("error");
    });

    it("detects Node.js stack traces", () => {
      const trace = `Error: something broke
    at Module._compile (internal/modules/cjs/loader.js:999:30)
    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1027:10)`;
      expect(detector.feed(trace)).toBe("error");
    });

    it("detects Python tracebacks", () => {
      const trace = "Traceback (most recent call last):";
      expect(detector.feed(trace)).toBe("error");
    });

    it("detects Go panics", () => {
      expect(detector.feed("goroutine 1 [running]:")).toBe("error");
    });

    it("error takes priority over thinking keywords", () => {
      // "processing" is a thinking keyword, but "Error:" should win
      expect(detector.feed("Error: processing failed")).toBe("error");
    });
  });

  // ── Exit handling ───────────────────────────────────────────────────────

  describe("handleExit", () => {
    it("returns error for non-zero exit code", () => {
      const status = detector.handleExit(1);
      expect(status).toBe("error");
      expect(detector.getStatus()).toBe("error");
    });

    it("returns idle for zero exit code", () => {
      const status = detector.handleExit(0);
      expect(status).toBe("idle");
      expect(detector.getStatus()).toBe("idle");
    });

    it("fires status change callback on exit", () => {
      const cb = vi.fn();
      detector.onStatusChange(cb);
      detector.handleExit(127);
      expect(cb).toHaveBeenCalledWith("error");
    });

    it("clears idle timer on exit", () => {
      detector.feed("$ ");
      detector.handleExit(0);
      // Advancing timers should not cause another status change
      const cb = vi.fn();
      detector.onStatusChange(cb);
      vi.advanceTimersByTime(DEFAULT_CONFIG.idleTimeoutMs + 100);
      expect(cb).not.toHaveBeenCalled();
    });
  });

  // ── Status change callback ──────────────────────────────────────────────

  describe("onStatusChange callback", () => {
    it("fires on status transitions", () => {
      const cb = vi.fn();
      detector.onStatusChange(cb);

      detector.feed("\u280B"); // thinking
      detector.feed("normal output\n"); // running

      expect(cb).toHaveBeenCalledTimes(2);
      expect(cb).toHaveBeenNthCalledWith(1, "thinking");
      expect(cb).toHaveBeenNthCalledWith(2, "running");
    });

    it("does not fire when status stays the same", () => {
      const cb = vi.fn();
      detector.onStatusChange(cb);

      detector.feed("line 1\n");
      detector.feed("line 2\n");
      detector.feed("line 3\n");

      // All running -> only first transition from initial "running" would fire,
      // but initial status is already "running", so no fires at all
      expect(cb).not.toHaveBeenCalled();
    });
  });

  // ── Dispose ─────────────────────────────────────────────────────────────

  describe("dispose", () => {
    it("clears timers and nullifies callback", () => {
      const cb = vi.fn();
      detector.onStatusChange(cb);
      detector.feed("$ ");

      detector.dispose();

      vi.advanceTimersByTime(DEFAULT_CONFIG.idleTimeoutMs + 100);
      // Callback should not fire after dispose
      expect(cb).not.toHaveBeenCalledWith("idle");
    });
  });

  // ── Configuration ───────────────────────────────────────────────────────

  describe("configuration", () => {
    it("exposes config via getConfig()", () => {
      const config = detector.getConfig();
      expect(config.idleTimeoutMs).toBe(3000);
      expect(config.spinnerChars.size).toBeGreaterThan(0);
      expect(config.thinkingKeywords).toContain("thinking");
    });

    it("allows partial config override", () => {
      detector.dispose();
      detector = new StatusDetector({
        idleTimeoutMs: 5000,
        thinkingKeywords: ["pondering"],
      });

      const config = detector.getConfig();
      expect(config.idleTimeoutMs).toBe(5000);
      expect(config.thinkingKeywords).toEqual(["pondering"]);
      // Other defaults should still be present
      expect(config.errorPatterns.length).toBeGreaterThan(0);
    });
  });
});
