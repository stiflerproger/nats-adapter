import { ConnectionOptions, NatsConnection } from "nats";
interface MessageOptions {
    isError?: boolean;
    noReply?: boolean;
    timeout?: number;
}
export default class NatsAdapter {
    /** Native NATS connection */
    nats: NatsConnection;
    private sc;
    connect(connection: ConnectionOptions): Promise<void>;
    close(): Promise<void>;
    send(pattern: string, data: string | Record<string, unknown>, options?: MessageOptions): Promise<unknown>;
    subscribe(pattern: string, callback: (data: any) => Promise<any>): void;
}
export { NatsAdapter };
