import {connect, ConnectionOptions, createInbox, NatsConnection, StringCodec, Subscription} from "nats";

export default class NatsAdapter {

  /** Native NATS connection */
  public nats!: NatsConnection;

  #sc = StringCodec();

  public async connect(connection: ConnectionOptions) {
    if (this.nats) throw 'Connection was already created';

    this.nats = await connect(connection);
  }

  public async close() {
    if (this.nats && !this.nats.isClosed()) await this.nats.close();
  }

  public send(pattern: string, data: any, options: any) {

    return new Promise((resolve, reject) => {

      try {

        const inbox = createInbox();

        const encodedData = this.#sc.encode(JSON.stringify(data));

        let timeout: NodeJS.Timeout;
        let replyHandler: Subscription;

        if (!options?.noReply) {
          replyHandler = this.nats.subscribe(inbox, {
            max: 1,
            callback: (err, m) => {
              clearTimeout(timeout);

              if (err) {
                return reject(err);
              }

              return resolve(JSON.parse(this.#sc.decode(m.data)));
            }
          });
        }

        this.nats.publish(pattern, encodedData, {
          reply: inbox,
        });

        if (!options?.noReply && typeof options?.timeout === 'number') {

          timeout = setTimeout(() => {

            if (replyHandler) replyHandler.unsubscribe();

            return reject(new Error('Timeout has occurred'));

          }, options.timeout);

        }

      } catch (e) {

        return reject(e);

      }

    })

  }

  public subscribe(pattern: string, callback: (data: any) => Promise<any>) {

    if (typeof callback !== 'function') throw 'callback must be an function';

    const sub = this.nats.subscribe(pattern);

    (async (sub: Subscription) => {

      for await (const m of sub) {
        callback( JSON.parse(this.#sc.decode(m.data)).data )
          .then((res: any) => {
            if (m.reply) this.send(m.reply, res, {noReply: true})
          })
          .catch(e => {
            if (m.reply) this.send(m.reply, e, {noReply: true})
          })
      }

    })(sub).then(_ => {});

  }

}

export {NatsAdapter};