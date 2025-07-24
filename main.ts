import { parse } from "npm:yaml";
import type { Process, Config } from "./interface.ts";
import { log, setLogStream, setVerboseLog, verbose } from "./log.ts";
import { getRelativePathURL } from "./paths.ts";
import { startProcess } from "./processes.ts";
import { parseArgs } from "jsr:@std/cli";

// Start all processes defined in the configuration
function launch(processes: Process[]) {
    for (const processDef of processes) {
        if (!processDef.name || !processDef.command) {
            log(`Invalid process definition: ${JSON.stringify(processDef)}`);
            continue;
        }

        const maxRestart = processDef.maxRestart || 3; // Default to 3 restarts if not specified
        void startProcess(processDef, maxRestart);

    }
}

async function main() {
    const args = parseArgs(Deno.args, {
        string: ["config", "log", "verbose"],
        alias: { c: "config", l: "log", v: "verbose" },
        default: { config: "jurassik.yaml" },
    });
    let logFs: Deno.FsFile | undefined;
    try {
        if (args.log) {
            const logFile = getRelativePathURL(args.log);
            verbose(`Setting log stream to ${logFile.toString()}`);
            logFs = await Deno.open(logFile, { write: true, create: true, truncate: true });
            setLogStream(logFs);
            await log(`Hello, from Jurassik!`);
        }
        if (args.verbose) {
            setVerboseLog(true);
        }
        const configPath = getRelativePathURL(args.config);
        verbose(`Loading configuration from ${configPath.toString()}`);
        const fileContent = await Deno.readTextFile(configPath);
        const config = parse(fileContent) as Config;

        if (!config.processes || !Array.isArray(config.processes)) {
            log("Invalid jurassik.yaml format: 'processes' field is missing or not an array.");
            return;
        }

        await launch(config.processes);

        verbose("All processes started.");

    } catch (error) {
        log("Error:", error instanceof Error ? error.message : `${error}`);
    } finally {
        void logFs?.close();
    }
}

if (import.meta.main) {
    main();
}
