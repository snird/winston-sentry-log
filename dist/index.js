"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const TransportStream = require("winston-transport");
const errorHandler = (err) => {
    // tslint:disable-next-line
    console.error(err);
};
class Sentry extends TransportStream {
    constructor(opts) {
        super(opts);
        this.name = 'winston-sentry-log';
        this.tags = {};
        const options = opts;
        lodash_1.default.defaultsDeep(opts, {
            errorHandler,
            config: {
                dsn: process.env.SENTRY_DSN || '',
                logger: 'winston-sentry-log',
                captureUnhandledRejections: false,
            },
            isClientInitialized: false,
            level: 'info',
            levelsMap: {
                silly: 'debug',
                verbose: 'debug',
                info: 'info',
                debug: 'debug',
                warn: 'warning',
                error: 'error',
            },
            name: 'winston-sentry-log',
            silent: false,
        });
        this.levelsMap = options.levelsMap;
        if (options.tags) {
            this.tags = options.tags;
        }
        else if (options.globalTags) {
            this.tags = options.globalTags;
        }
        else if (options.config.tags) {
            this.tags = options.config.tags;
        }
        if (options.extra) {
            options.config.extra = options.config.extra || {};
            options.config.extra = lodash_1.default.defaults(options.config.extra, options.extra);
        }
        this.sentryClient = options.sentryClient;
        if (!options.isClientInitialized) {
            this.sentryClient = this.sentryClient || require('@sentry/node');
            this.sentryClient.init(options.config || {
                dsn: process.env.SENTRY_DSN || '',
            });
        }
        if (!!this.sentryClient) {
            this.sentryClient.configureScope((scope) => {
                if (!lodash_1.default.isEmpty(this.tags)) {
                    Object.keys(this.tags).forEach((key) => {
                        scope.setTag(key, this.tags[key]);
                    });
                }
            });
        }
    }
    log(info, callback) {
        const { message, fingerprint } = info;
        const level = Object.keys(this.levelsMap).find(key => info.level.toString().includes(key));
        if (!level) {
            return callback(null, true);
        }
        const meta = Object.assign({}, lodash_1.default.omit(info, ['level', 'message', 'label']));
        setImmediate(() => {
            this.emit('logged', level);
        });
        if (!!this.silent) {
            return callback(null, true);
        }
        const context = {};
        context.level = this.levelsMap[level];
        context.extra = lodash_1.default.omit(meta, ['user', 'tags']);
        context.fingerprint = [fingerprint, process.env.NODE_ENV];
        this.sentryClient.withScope((scope) => {
            const user = lodash_1.default.get(meta, 'user');
            if (lodash_1.default.has(context, 'extra')) {
                Object.keys(context.extra).forEach((key) => {
                    scope.setExtra(key, context.extra[key]);
                });
            }
            if (!lodash_1.default.isEmpty(meta.tags) && lodash_1.default.isObject(meta.tags)) {
                Object.keys(meta.tags).forEach((key) => {
                    scope.setTag(key, meta.tags[key]);
                });
            }
            if (!!user) {
                scope.setUser(user);
            }
            if (context.level === 'error' || context.level === 'fatal') {
                let err = null;
                if (lodash_1.default.isError(info) === true) {
                    err = info;
                }
                else {
                    err = new Error(message);
                    if (info.stack) {
                        err.stack = info.stack;
                    }
                }
                this.sentryClient.captureException(err);
                return callback(null, true);
            }
            this.sentryClient.captureMessage(message, context.level);
            return callback(null, true);
        });
    }
}
exports.default = Sentry;
module.exports = Sentry;
//# sourceMappingURL=index.js.map