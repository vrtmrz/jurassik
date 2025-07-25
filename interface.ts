/**
 * Panic modes for process management.
 * * - `restart`: Restart the process on panic.
 * * - `serverPanic`: Special handling for server processes, terminating all processes and exiting the application.
 */
export const panicModes = {
    /**
     * Restarts the process on panic.
     */
    restart: "restart",
    /**
     * Special handling for server processes, terminating all processes and exiting the application.
     */
    serverPanic: "serverPanic",
};
/**
 * Represents a process definition in the configuration.
 * @interface Process
 * @property {string} name - The name of the process.
 * @property {string} command - The command to execute.
 * @property {string[]} [args] - Arguments to pass to the command.
 * @property {string} [cwd] - The current working directory for the process.
 * @property {Record<string, string>} [env] - Environment variables for the process.
 * @property {string} [stdout] - Path to the file for stdout.
 * @property {string} [stderr] - Path to the file for stderr.
 * @property {string} [description] - A description of the process.
 * @property {number} [maxRestart] - The maximum number of times the process should be restarted.
 * @property {number} [restartDelay] - The delay in milliseconds before the process is restarted.
 * @property {keyof typeof panicModes} [restart] - The panic mode to use when the process crashes.
 */
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
