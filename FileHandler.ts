import { serialized } from "octagonal-wheels/concurrency/lock_v2.js";
import { ensureDir } from "./paths.ts";

let teeStdError: boolean = false;
let teeStdOut: boolean = false;
export function setErrorLogTee(tee: boolean) {
    teeStdError = tee;
}
export function setVerboseLogTee(tee: boolean) {
    teeStdOut = tee;
}

type FileHandlerOptions = {
    file?: Deno.FsFile | typeof Deno.stdout | typeof Deno.stderr;
    url: URL | "stdout" | "stderr";
    isError?: boolean;
};
export class FileHandler {
    // _stream: Deno.FsFile | typeof Deno.stdout | typeof Deno.stderr;
    _file?: Deno.FsFile | typeof Deno.stdout | typeof Deno.stderr;
    _isError: boolean = false;
    _url: URL | "stdout" | "stderr";
    enableTee: boolean = false;
    teePrefix: string = "";

    async ensureFileLocation(): Promise<void> {
        if (this._url === "stdout" || this._url === "stderr") {
            return;
        }
        if (!this._file) {
            const fileURL = this._url;
            await ensureDir(fileURL);
        }
    }
    writeStream?: WritableStream<Uint8Array>;
    buffer: Uint8Array[] = [];
    async flushAll() {
        return await serialized(`flush-all-${this._url.toString()}`, async () => {
            if (this.buffer.length === 0) {
                return;
            }
            const buffer = [...this.buffer];
            this.buffer = [];
            const file = await this.getFile();
            const totalSize = buffer.reduce((acc, chunk) => acc + chunk.length, 0);
            const writeArray = new Uint8Array(totalSize);
            let offset = 0;
            for (const chunk of buffer) {
                writeArray.set(chunk, offset);
                offset += chunk.length;
            }
            await file.write(writeArray);
            if (this._isError && teeStdError) {
                // If this is an error stream, also write to stderr
                Deno.stderr.write(writeArray);
            }
            if (!this._isError && teeStdOut) {
                // If this is a standard output stream, also write to stdout
                Deno.stderr.write(writeArray);
            }
            // file.close();
        });
    }

    getWritableStream(): WritableStream<Uint8Array> {
        const writeBuffer = (chunk: Uint8Array) => {
            this.buffer.push(chunk);
        };
        const buffer = this.buffer;
        let lastWriteTime: number = Date.now();
        let flushTimer: ReturnType<typeof setTimeout> | undefined;

        const flushAll = () => {
            if (flushTimer) {
                clearTimeout(flushTimer);
            }
            this.flushAll();
            lastWriteTime = Date.now();
            flushTimer = undefined;
        };

        const maxKeepTime = 1000; // 1 second
        const stream = new WritableStream<Uint8Array>({
            async start() {
                // await ensureFileLocation();
            },
            write(chunk: Uint8Array) {
                writeBuffer(chunk);
                const cr = 0x0A; // Carriage return line feed
                const lf = 0x0D; // Line feed
                const lastChunk = chunk[chunk.length - 1];
                if (lastChunk == lf || lastChunk == cr) {
                    void flushAll();
                } else if (buffer.length > 3) {
                    void flushAll();
                } else if (Date.now() - lastWriteTime > maxKeepTime) {
                    void flushAll();
                } else {
                    if (flushTimer) {
                        clearTimeout(flushTimer);
                    }
                    flushTimer = setTimeout(() => {
                        void flushAll();
                    }, 200); // Flush after 200ms of inactivity
                }
            },
            close() {
                void flushAll();
            },
        });
        return stream;
    }

    constructor({ file, url, isError }: FileHandlerOptions) {
        this._file = file;
        this._url = url;
        this._isError = isError ?? false;
    }

    async getFile(): Promise<
        Deno.FsFile | typeof Deno.stdout | typeof Deno.stderr
    > {
        if (this._url === "stdout" || this._url === "stderr") {
            return this._url === "stdout" ? Deno.stdout : Deno.stderr;
        }
        if (this._file) {
            return this._file;
        }
        // Open the file if it is not already opened
        const fileURL = this._url;
        const file = await Deno.open(fileURL, {
            create: true,
            write: true,
            append: true,
        });
        this._file = file;
        return this._file;
    }

    mark(contentSrc: string): void {
        const timeStamp = new Date().toISOString();
        const content = `# -- ${timeStamp} --\n\n${contentSrc}\n`;
        const w = this.getWritableStream();
        w.getWriter().write(new TextEncoder().encode(content));
    }

    write(content: string | Uint8Array): void {
        const w = this.getWritableStream();
        if (typeof content === "string") {
            w.getWriter().write(new TextEncoder().encode(content));
        } else {
            w.getWriter().write(content);
        }
    }

    close(): void {
        void serialized(`mark-${this._url.toString()}`, () => {
            if (this._file && this._file !== Deno.stdout && this._file !== Deno.stderr) {
                this._file.close();
                this._file = undefined;
            }
        });
    }
}

const handlerMap = new Map<string, FileHandler>();

export function getFileHandler({ file, url, isError }: FileHandlerOptions): FileHandler {
    const key = `${url.toString()}-${isError ? "error" : "info"}`;
    if (!handlerMap.has(key)) {
        handlerMap.set(key, new FileHandler({ file, url, isError }));
    }
    return handlerMap.get(key)!;
}
