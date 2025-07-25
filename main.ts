import { parse } from "npm:yaml";
import type { Config, Process } from "./interface.ts";
import { log, setLogStream, setVerboseLog, verbose } from "./log.ts";
import { getRelativePathURL } from "./paths.ts";
import { startProcess } from "./processes.ts";
import { parseArgs } from "jsr:@std/cli";
import { FileHandler, getFileHandler, setErrorLogTee, setVerboseLogTee } from "./FileHandler.ts";

const VERSION = "0.0.1"; // Replace with your actual version

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
        string: ["config", "log"],
        boolean: ["tee", "verbose"],
        alias: { c: "config", l: "log", v: "verbose", t: "tee" },
        default: { config: "jurassik.yaml" },
    });
    log(`Hello, from Jurassik! Version: ${VERSION || "unknown"}`);
    let logHandler: FileHandler | undefined = undefined;
    try {
        const logFileSource = args.log || Deno.env.get("JURASSIK_LOG");
        if (logFileSource) {
            const logFile = getRelativePathURL(logFileSource);
            verbose(`Setting log stream to ${logFile.toString()}`);
            logHandler = getFileHandler({
                url: logFile,
            });
            setLogStream(logHandler);
            log(`Hello, from Jurassik!`);
        }
        if (args.verbose || Deno.env.get("JURASSIK_VERBOSE") === "true") {
            setVerboseLog(true);
        }
        if (args.tee) {
            setErrorLogTee(true);
            setVerboseLogTee(true);
        }
        const configPathSource = args.config || Deno.env.get("JURASSIK_CONFIG_FILE");
        const configPath = getRelativePathURL(configPathSource || "jurassik.yaml");

        verbose(`Loading configuration from ${configPath.toString()}`);
        const fileContent = await Deno.readTextFile(configPath);
        const config = parse(fileContent) as Config;

        if (!config.processes || !Array.isArray(config.processes)) {
            log(
                "Invalid jurassik.yaml format: 'processes' field is missing or not an array.",
            );
            return;
        }

        void launch(config.processes);

        verbose("All processes started.");
    } catch (error) {
        log("Error:", error instanceof Error ? error.message : `${error}`);
    } finally {
        logHandler?.close();
        // void logFs?.close();
    }
}

if (import.meta.main) {
    main();
}
