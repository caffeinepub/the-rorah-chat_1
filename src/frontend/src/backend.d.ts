import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Media = Uint8Array;
export type UserId = string;
export type Time = bigint;
export type MessageId = bigint;
export type RoomId = string;
export interface Room {
    name: string;
    roomId: RoomId;
}
export interface PublicMessage {
    media?: Media;
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
    editMessage(userId: UserId, roomId: RoomId, messageId: MessageId, newContent: string): Promise<PublicMessage>;
    getMessages(roomId: RoomId, start: bigint, count: bigint): Promise<Array<PublicMessage>>;
    listRooms(): Promise<Array<Room>>;
    postMessage(userId: UserId, roomId: RoomId, content: string, media: Media | null, replyTo: MessageId | null): Promise<PublicMessage>;
    reactToMessage(userId: UserId, roomId: RoomId, messageId: MessageId, emoji: string): Promise<PublicMessage>;
    setNickname(userId: UserId, nickname: string): Promise<void>;
    validateRoom(roomId: RoomId): Promise<boolean>;
}
