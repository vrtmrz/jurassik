import { serialized } from "npm:octagonal-wheels/concurrency/lock";
let logStream = Deno.stderr;
let verboseLog = true; // Set to true to enable verbose logging

export function setLogStream(stream: typeof Deno.stdout | typeof Deno.stderr | Deno.FsFile) {
  logStream = stream;
}
export function setVerboseLog(enabled: boolean) {
  verboseLog = enabled;
}


export function log(...messages: any[]) {
  const message = messages.map(m => typeof m === "string" ? m : JSON.stringify(m)).join("\t");
  const timeStamp = new Date().toISOString();
  const content = `${timeStamp}\t${message}\n`;
  void serialized("log", async () => {
    await logStream.write(new TextEncoder().encode(content));
  });
}
export function verbose(...messages: any[]) {

  if (!verboseLog) return; // Skip logging if verbose logging is disabled
  const message = messages.map(m => typeof m === "string" ? m : JSON.stringify(m)).join("\t");
  const timeStamp = new Date().toISOString();
  const content = `${timeStamp}\t${message}\n`;
  void serialized("verbose", async () => {
    await logStream.write(new TextEncoder().encode(content));
  });
}
