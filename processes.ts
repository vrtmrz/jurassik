import type { Process } from "./interface.ts";
import { log, verbose } from "./log.ts";
import { getRelativePathURL, resolveRelativeURLs } from "./paths.ts";
import { getFileHandler } from "./FileHandler.ts";
import { isDefined } from "./util.ts";

/**
 * Manages all currently running processes.
 */
const allProcesses = new Set<Deno.ChildProcess>();

/**
 * Handles panic for specific apps, terminate all processes and exiting the application.
 */
async function serverPanic(): Promise<never> {
    for (const proc of allProcesses) {
        try {
            proc.kill("SIGTERM");
            await proc.status;
        } catch (err) {
            log(
                `Failed to terminate process ${proc.pid}:`,
                err instanceof Error ? err.message : `${err}`,
            );
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
    const resolvedStdout = isDefined(processDef.stdout, getRelativePathURL);
    const resolvedStderr = isDefined(processDef.stderr, getRelativePathURL);
    const stdoutURL = isDefined(resolvedStdout, (stdout) => resolveRelativeURLs(stdout, resolvedCwd));
    const stderrURL = isDefined(resolvedStderr, (stderr) => resolveRelativeURLs(stderr, resolvedCwd));
    const stdoutHandler = getFileHandler({ url: stdoutURL || "stdout" });
    const stderrHandler = getFileHandler({ url: stderrURL || "stderr", isError: true });
    _verbose(`Command: ${command}`);
    _verbose(`Arguments: ${args.join(" ")}`);
    _verbose(`Working directory: ${resolvedCwd.toString()}`);
    _verbose(`Environment variables: ${JSON.stringify(processDef.env)}`);
    _verbose(
        `Standard output file: ${stdoutURL ? stdoutURL.toString() : "none"}`,
    );
    _verbose(
        `Standard error file: ${stderrURL ? stderrURL.toString() : "none"}`,
    );

    await stdoutHandler.ensureFileLocation();
    await stderrHandler.ensureFileLocation();
    const options: Deno.CommandOptions = {
        args,
        cwd: resolvedCwd,
        env: processDef.env,
        stdout: "piped",
        stderr: "piped",
    };

    stdoutHandler.mark(
        `Starting process: ${processDef.name} (stdout) ${leftRetries} retries left`,
    );
    stderrHandler.mark(
        `Starting process: ${processDef.name} (stderr) ${leftRetries} retries left`,
    );

    try {
        let result: Deno.CommandStatus;
        const child = new Deno.Command(command, options).spawn();
        const writeOptions = {};
        try {
            allProcesses.add(child);
            child.stdout.pipeTo(stdoutHandler.getWritableStream(), writeOptions);
            child.stderr.pipeTo(stderrHandler.getWritableStream(), writeOptions);
            // Wait for the process to finish
            result = await child.status;
        } finally {
            // Ensure the process is removed from the set of all processes
            allProcesses.delete(child);
        }

        const exitCodeMessage = `Process ${processDef.name} exited with code: ${result.code}`;
        _verbose(exitCodeMessage);

        stdoutHandler.mark(exitCodeMessage);

        if (result.code !== 0) {
            if (processDef.restart == "restart") {
                if (processDef.maxRestart && processDef.maxRestart > 0) {
                    if (leftRetries <= 0) {
                        _log(`Process ${processDef.name} failed after maximum restart attempts.`);
                        serverPanic();
                    }
                }
                if (!processDef.restartDelay) {
                    processDef.restartDelay = 1000; // Default to 1 second if not specified
                }
                await new Promise((resolve) => setTimeout(resolve, processDef.restartDelay));
                return await startProcess(processDef, leftRetries - 1);
            } else if (processDef.restart == "serverPanic") {
                _log(
                    `Process ${processDef.name} caused a server panic. Exiting...`,
                );
                serverPanic();
            } else {
                _log(
                    `Process ${processDef.name} exited with error code ${result.code}. Exiting subprocess...`,
                );
                return undefined;
            }
        }
        return result;
    } catch (error) {
        _log(`Process ${processDef.name} failed: ${error}`);
    } finally {
        stdoutHandler?.close();
        stderrHandler?.close();
    }
}
