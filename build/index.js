"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NatsAdapter = void 0;
const nats_1 = require("nats");
class NatsAdapter {
    constructor() {
        this.sc = (0, nats_1.StringCodec)();
    }
    connect(connection) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.nats && !this.nats.isClosed())
                throw "Connection was already created";
            this.nats = yield (0, nats_1.connect)(connection);
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.nats && !this.nats.isClosed())
                yield this.nats.close();
        });
    }
    send(pattern, data, options) {
        return new Promise((resolve, reject) => {
            if (!this.nats || this.nats.isClosed())
                throw "Connection closed";
            const inbox = (0, nats_1.createInbox)();
            const encodedData = this.sc.encode(JSON.stringify((options === null || options === void 0 ? void 0 : options.isError) ? { error: data } : { data: data }));
            if (!(options === null || options === void 0 ? void 0 : options.noReply)) {
                // нужно ожидать ответа от сервера
                this.nats.subscribe(inbox, Object.assign({ max: 1, callback: (err, msg) => {
                        var _a, _b;
                        let message;
                        if (!err && !((_a = msg.headers) === null || _a === void 0 ? void 0 : _a.hasError))
                            message = JSON.parse(this.sc.decode(msg.data));
                        if (err || ((_b = msg.headers) === null || _b === void 0 ? void 0 : _b.hasError) || message.error)
                            return reject(err || (message === null || message === void 0 ? void 0 : message.error) || "Unexpected error");
                        return resolve(message.data);
                    } }, ((options === null || options === void 0 ? void 0 : options.timeout) && { timeout: Number(options.timeout) })));
            }
            const head = (0, nats_1.headers)();
            if (options === null || options === void 0 ? void 0 : options.isError) {
                head.append("code", nats_1.ErrorCode.Unknown);
            }
            this.nats.publish(pattern, encodedData, Object.assign(Object.assign({}, (!(options === null || options === void 0 ? void 0 : options.noReply) && { reply: inbox })), { headers: head }));
            // если не дожидаемся ответа то сразу завершаем промис
            if (options === null || options === void 0 ? void 0 : options.noReply)
                return resolve(null);
        }).catch((e) => Promise.reject(e));
    }
    subscribe(pattern, callback) {
        if (!this.nats || this.nats.isClosed())
            throw "Connection closed";
        if (typeof callback !== "function")
            throw "callback must be an function";
        const sub = this.nats.subscribe(pattern);
        ((sub) => { var sub_1, sub_1_1; return __awaiter(this, void 0, void 0, function* () {
            var e_1, _a;
            try {
                for (sub_1 = __asyncValues(sub); sub_1_1 = yield sub_1.next(), !sub_1_1.done;) {
                    const m = sub_1_1.value;
                    callback(JSON.parse(this.sc.decode(m.data)).data)
                        .then((res) => {
                        if (m.reply)
                            this.send(m.reply, res, { noReply: true }).catch(console.error);
                    })
                        .catch((err) => {
                        if (m.reply)
                            this.send(m.reply, err, { noReply: true, isError: true }).catch(console.error);
                    });
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (sub_1_1 && !sub_1_1.done && (_a = sub_1.return)) yield _a.call(sub_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }); })(sub);
    }
}
exports.default = NatsAdapter;
exports.NatsAdapter = NatsAdapter;
//# sourceMappingURL=index.js.map