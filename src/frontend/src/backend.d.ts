import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export type UserId = string;
export type Time = bigint;
export type MessageId = bigint;
export type RoomId = string;
export interface Room {
    name: string;
    roomId: RoomId;
}
export interface PublicMessage {
    media?: ExternalBlob;
    content: string;
    nickname: Nickname;
    messageId: MessageId;
    userId: UserId;
    timestamp: Time;
    replyTo?: MessageId;
    roomId: RoomId;
    reactions: Array<Reaction>;
}
export type Nickname = string;
export interface Reaction {
    userId: UserId;
    emoji: string;
}
export interface backendInterface {
    createRoom(roomId: RoomId, name: string): Promise<void>;
    deleteMessage(userId: UserId, roomId: RoomId, messageId: MessageId): Promise<void>;
    editMessage(userId: UserId, roomId: RoomId, messageId: MessageId, newContent: string): Promise<PublicMessage | null>;
    getMessages(roomId: RoomId, start: bigint, count: bigint): Promise<Array<PublicMessage>>;
    listRooms(): Promise<Array<Room>>;
    postMessage(userId: UserId, roomId: RoomId, content: string, media: ExternalBlob | null, replyTo: MessageId | null): Promise<PublicMessage | null>;
    reactToMessage(userId: UserId, roomId: RoomId, messageId: MessageId, emoji: string): Promise<PublicMessage | null>;
    setNickname(userId: UserId, nickname: string): Promise<void>;
    validateRoom(roomId: RoomId): Promise<boolean>;
}
