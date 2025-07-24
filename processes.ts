import type { Process } from "./interface.ts";
import { log, verbose } from "./log.ts";
import { getRelativePathURL, resolveRelativeURLs, ensureDir } from "./paths.ts";

/**
 * Manages all currently running processes.
 */
const allProcesses = new Set<Deno.ChildProcess>();

/**
 * Marks a file with a timestamp and content.
 * If the file is undefined, it writes to stdout or stderr based on `isError`.
 * @param file 
 * @param contentSrc 
 * @param isError 
 */
async function markFile(file: Deno.FsFile | undefined, contentSrc: string, isError: boolean = false) {
  const timeStamp = new Date().toISOString();
  const content = `# -- ${timeStamp} --\n\n${contentSrc}\n`;
  if (!file) {
    const stream = isError ? Deno.stderr : Deno.stdout;
    await stream.write(new TextEncoder().encode(content));
  } else {
    await file.write(new TextEncoder().encode(content));
  }
}

/**
 * Handles panic for specific apps, terminate all processes and exiting the application.
 */
async function serverPanic(): Promise<never> {
  for (const proc of allProcesses) {
    try {
      proc.kill("SIGTERM");
      await proc.status;
    } catch (err) {
      log(`Failed to terminate process ${proc.pid}:`, err instanceof Error ? err.message : `${err}`);
    }
  }
  Deno.exit(1);
}

/**
 * Starts a process with the given definition and manages its lifecycle.
 * If the process exits with an error code, it will handle the restart logic based on the `restart` property of the process definition.
 * @param processDef 
 * @param leftRetries 
 * @returns 
 */
export async function startProcess(processDef: Process, leftRetries: number) {
  const name = `[ ${processDef.name || "Unnamed Process"} ]`;
  const _verbose = verbose.bind(null, name);
  const _log = log.bind(null, name);
  _verbose(`Starting process: ${processDef.name}`);

  const command = processDef.command;
  const args = processDef.args || [];
  const resolvedCwd = getRelativePathURL(processDef.cwd ?? "./");


  const resolvedStdout = processDef.stdout ? getRelativePathURL(processDef.stdout) : undefined;
  const resolvedStderr = processDef.stderr ? getRelativePathURL(processDef.stderr) : undefined;
  const stdoutURL = resolvedStdout ? resolveRelativeURLs(resolvedStdout, resolvedCwd) : undefined;
  const stderrURL = resolvedStderr ? resolveRelativeURLs(resolvedStderr, resolvedCwd) : undefined;
  _verbose(`Command: ${command}`);
  _verbose(`Arguments: ${args.join(" ")}`);
  _verbose(`Working directory: ${resolvedCwd.toString()}`);
  _verbose(`Environment variables: ${JSON.stringify(processDef.env)}`);
  _verbose(`Standard output file: ${stdoutURL ? stdoutURL.toString() : "none"}`);
  _verbose(`Standard error file: ${stderrURL ? stderrURL.toString() : "none"}`);
  if (stdoutURL) {
    await ensureDir(stdoutURL);
  }

  if (stderrURL) {
    await ensureDir(stderrURL);
  }
  const options: Deno.CommandOptions = {
    args,
    cwd: resolvedCwd,
    env: processDef.env,
    stdout: stdoutURL ? "piped" : undefined,
    stderr: stderrURL ? "piped" : undefined
  };



  const child = new Deno.Command(command, options).spawn();
  allProcesses.add(child);
  let stdoutFile: Deno.FsFile | undefined;
  let stderrFile: Deno.FsFile | undefined;
  try {
    // children.push(child);
    if (child.stdout && stdoutURL) {
      stdoutFile = await Deno.open(stdoutURL, { create: true, append: true });
    }

    if (child.stderr && stderrURL) {
      stderrFile = await Deno.open(stderrURL, { create: true, append: true });
    }
    _log(`Starting process: ${processDef.name} (stdout) ${leftRetries} retries left`);
    await markFile(stdoutFile, `Starting process: ${processDef.name} (stdout) ${leftRetries} retries left`);
    await markFile(stderrFile, `Starting process: ${processDef.name} (stderr)`, true);
    if (stdoutFile) child.stdout.pipeTo(stdoutFile.writable);
    if (stderrFile) child.stderr.pipeTo(stderrFile.writable);

    const result = await child.status;

    _verbose(`Process ${processDef.name} exited with status: ${result.code}`);

    if (result.code !== 0) {
      if (processDef.restart == "restart") {
        if (processDef.maxRestart && processDef.maxRestart > 0)
          if (leftRetries <= 0) {
            _log(`Process ${processDef.name} failed after maximum restart attempts.`);
            allProcesses.delete(child);
            serverPanic();
          }
        if (!processDef.restartDelay) {
          processDef.restartDelay = 1000; // Default to 1 second if not specified
        }
        allProcesses.delete(child);
        await new Promise(resolve => setTimeout(resolve, processDef.restartDelay));
        return await startProcess(processDef, leftRetries - 1);
      }
      if (processDef.restart == "exit") {
        _log(`Process ${processDef.name} exited with error code ${result.code}. Exiting subprocess...`);
        return undefined;
      }
      if (processDef.restart == "serverPanic") {
        _log(`Process ${processDef.name} caused a server panic. Exiting...`);
        allProcesses.delete(child);
        serverPanic();
      }
    }
    return result;
  } finally {
    allProcesses.delete(child);
  }
}
