export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["NONE"] = 4] = "NONE";
})(LogLevel || (LogLevel = {}));
export class Logger {
    constructor() {
        this.level = LogLevel.INFO;
        this.prefix = '[CreditSystem]';
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    setLevel(level) {
        this.level = level;
    }
    setPrefix(prefix) {
        this.prefix = prefix;
    }
    debug(...args) {
        if (this.level <= LogLevel.DEBUG) {
            console.debug(this.prefix, ...args);
        }
    }
    info(...args) {
        if (this.level <= LogLevel.INFO) {
            console.info(this.prefix, ...args);
        }
    }
    warn(...args) {
        if (this.level <= LogLevel.WARN) {
            console.warn(this.prefix, ...args);
        }
    }
    error(...args) {
        if (this.level <= LogLevel.ERROR) {
            console.error(this.prefix, ...args);
        }
    }
    group(label) {
        if (this.level < LogLevel.NONE) {
            console.group(`${this.prefix} ${label}`);
        }
    }
    groupEnd() {
        if (this.level < LogLevel.NONE) {
            console.groupEnd();
        }
    }
    time(label) {
        if (this.level <= LogLevel.DEBUG) {
            console.time(`${this.prefix} ${label}`);
        }
    }
    timeEnd(label) {
        if (this.level <= LogLevel.DEBUG) {
            console.timeEnd(`${this.prefix} ${label}`);
        }
    }
}
export const logger = Logger.getInstance();
//# sourceMappingURL=logger.js.map