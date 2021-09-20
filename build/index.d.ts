import { ConnectionOptions, NatsConnection } from "nats";
export default class NatsAdapter {
    #private;
    /** Native NATS connection */
    nats: NatsConnection;
    connect(connection: ConnectionOptions): Promise<void>;
    close(): Promise<void>;
    send(pattern: string, data: any, options: any): Promise<unknown>;
    subscribe(pattern: string, callback: (data: any) => Promise<any>): void;
}
export { NatsAdapter };
