export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}
export declare class Logger {
    private static instance;
    private level;
    private prefix;
    private constructor();
    static getInstance(): Logger;
    setLevel(level: LogLevel): void;
    setPrefix(prefix: string): void;
    debug(...args: any[]): void;
    info(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
    group(label: string): void;
    groupEnd(): void;
    time(label: string): void;
    timeEnd(label: string): void;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map