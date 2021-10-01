import {
  connect,
  ConnectionOptions,
  createInbox,
  ErrorCode,
  headers,
  NatsConnection,
  StringCodec,
  Subscription,
} from "nats";

interface MessageOptions {
  isError?: boolean;
  noReply?: boolean;
  timeout?: number;
}

export default class NatsAdapter {
  /** Native NATS connection */
  public nats!: NatsConnection;

  private sc = StringCodec();

  public async connect(connection: ConnectionOptions) {
    if (this.nats && !this.nats.isClosed()) throw "Connection was already created";

    this.nats = await connect(connection);
  }

  public async close() {
    if (this.nats && !this.nats.isClosed()) await this.nats.close();
  }

  public send(pattern: string, data: string | Record<string, unknown>, options?: MessageOptions) {
    return new Promise((resolve, reject) => {
      if (!this.nats || this.nats.isClosed()) throw "Connection closed";

      const inbox = createInbox();

      const encodedData = this.sc.encode(
        JSON.stringify(options?.isError ? { error: data } : { data: data })
      );

      if (!options?.noReply) {
        // нужно ожидать ответа от сервера
        this.nats.subscribe(inbox, {
          max: 1,
          callback: (err, msg) => {
            let message;

            if (!err && !msg.headers?.hasError) message = JSON.parse(this.sc.decode(msg.data));

            if (err || msg.headers?.hasError || message.error)
              return reject(err || message?.error || "Unexpected error");

            return resolve(message.data);
          },
          ...(options?.timeout && { timeout: Number(options.timeout) }),
        });
      }

      const head = headers();

      if (options?.isError) {
        head.append("code", ErrorCode.Unknown);
      }

      this.nats.publish(pattern, encodedData, {
        ...(!options?.noReply && { reply: inbox }),
        headers: head,
      });

      // если не дожидаемся ответа то сразу завершаем промис
      if (options?.noReply) return resolve(null);
    }).catch((e) => Promise.reject(e));
  }

  public subscribe(pattern: string, callback: (data: any) => Promise<any>) {
    if (!this.nats || this.nats.isClosed()) throw "Connection closed";

    if (typeof callback !== "function") throw "callback must be an function";

    const sub = this.nats.subscribe(pattern);

    (async (sub: Subscription) => {
      for await (const m of sub) {
        callback(JSON.parse(this.sc.decode(m.data)).data)
          .then((res: any) => {
            if (m.reply) this.send(m.reply, res, { noReply: true }).catch(console.error);
          })
          .catch((err) => {
            if (m.reply)
              this.send(m.reply, err, { noReply: true, isError: true }).catch(console.error);
          });
      }
    })(sub);
  }
}

export { NatsAdapter };
