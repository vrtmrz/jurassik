/**
 * Panic modes for process management.
 * * - `restart`: Restart the process on panic.
 * * - `serverPanic`: Special handling for server processes, terminating all processes and exiting the application.
 */
export const panicModes = {
    restart: "restart",
    serverPanic: "serverPanic"
}
export interface Process {
    name: string;
    command: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    stdout?: string;
    stderr?: string;
    description?: string;
    maxRestart?: number;
    restartDelay?: number;
    restart?: keyof typeof panicModes;
}
export interface Config {
    version: string;
    processes: Process[];
}
