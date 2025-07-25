import { type FileHandler, getFileHandler } from "./FileHandler.ts";
// Default log stream is stderr
let verboseLog = Deno.env.get("JURASSIK_VERBOSE") === "true";

let logHandler = getFileHandler({ url: "stderr", isError: true });
/**
 * Sets the log stream to write logs to.
 * @param handler
 */
export function setLogStream(
    handler: FileHandler,
) {
    logHandler = handler;
}
/**
 * Enables or disables verbose logging.
 * @param enabled
 */
export function setVerboseLog(enabled: boolean) {
    verboseLog = enabled;
}

/**
 * Logs messages to the log stream.
 * @param messages The messages to log.
 */
export function log(...messages: unknown[]) {
    const message = messages.map((m) => typeof m === "string" ? m : JSON.stringify(m)).join("\t");
    const timeStamp = new Date().toISOString();
    const content = `${timeStamp}\t${message}\n`;
    logHandler.write(content);
}
/**
 * Shows verbose log messages.
 * @param messages
 * @returns
 */
export function verbose(...messages: unknown[]) {
    if (!verboseLog) return; // Skip logging if verbose logging is disabled
    const message = messages.map((m) => typeof m === "string" ? m : JSON.stringify(m)).join("\t");
    const timeStamp = new Date().toISOString();
    const content = `${timeStamp}\t${message}\n`;
    logHandler.write(content);
}
