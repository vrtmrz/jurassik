import { log } from "./log.ts";

/**
 * Converts a relative path to a URL based on the current module's URL.
 * @param path
 * @returns
 */
export function getRelativePathURL(path: string): URL {
    return new URL(path, import.meta.url);
}

/**
 * Resolves a relative URL to an absolute URL based on the provided base URL.
 * If the URL is already absolute, it returns the URL as is.
 * @param to
 * @param from
 * @returns
 */
export function resolveRelativeURLs(to: URL, from: URL): URL {
    if (to.pathname.startsWith("./") || to.pathname.startsWith("../")) {
        return new URL(to.pathname, from);
    }
    return new URL(to.pathname, import.meta.url);
}

/**
 * Ensures that the directory for the given path exists.
 * If the last part of the path is a file, it creates the directory for that file
 * @param pathSrc
 */
export async function ensureDir(pathSrc: URL) {
    const path = new URL(pathSrc.toString());
    const dirParts = path.pathname.split("/");
    const dirName = dirParts.pop();
    if (dirName && dirName.split(".").length > 1) {
        // If the last part of the path is a file, we need to create the directory
        dirParts.push(""); // Ensure the last part is treated as a directory
        path.pathname = dirParts.join("/");
    } else {
        // If the last part is already a directory, no need to modify the path
        // path.pathname = dirParts.join("/");
    }

    try {
        await Deno.mkdir(path, { recursive: true });
    } catch (error) {
        if (error instanceof Deno.errors.AlreadyExists) {
            // Directory already exists, no action needed
        } else {
            log(
                `Failed to create directory ${path}:`,
                error instanceof Error ? error.message : `${error}`,
            );
            throw error;
        }
    }
}
