import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import List "mo:core/List";
import Set "mo:core/Set";
import Array "mo:core/Array";

import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

import Migration "migration";

(with migration = Migration.run)
actor {
  include MixinStorage();

  type UserId = Text;
  type RoomId = Text;
  type MessageId = Nat;
  type Nickname = Text;

  type Reaction = {
    emoji : Text;
    userId : UserId;
  };

  type StoredMessage = {
    messageId : MessageId;
    userId : UserId;
    roomId : RoomId;
    content : Text;
    timestamp : Time.Time;
    media : ?Storage.ExternalBlob;
    reactions : [Reaction];
    replyTo : ?MessageId;
  };

  type PublicMessage = {
    messageId : MessageId;
    userId : UserId;
    roomId : RoomId;
    content : Text;
    timestamp : Time.Time;
    media : ?Storage.ExternalBlob;
    reactions : [Reaction];
    replyTo : ?MessageId;
    nickname : Nickname;
  };

  type Room = {
    roomId : RoomId;
    name : Text;
  };

  let rooms = Map.empty<RoomId, Room>();
  let roomSet = Set.empty<RoomId>();
  let messages = Map.empty<RoomId, List.List<StoredMessage>>();
  let userNicknames = Map.empty<UserId, Nickname>();
  var nextMessageId = 1;

  public shared ({ caller }) func createRoom(roomId : RoomId, name : Text) : async () {
    if (roomSet.contains(roomId)) {
      return ();
    };

    let newRoom : Room = {
      roomId;
      name;
    };

    rooms.add(roomId, newRoom);
    roomSet.add(roomId);
    messages.add(roomId, List.empty<StoredMessage>());
  };

  public query ({ caller }) func validateRoom(roomId : RoomId) : async Bool {
    if (roomId == "" or roomSet.isEmpty()) {
      return false;
    };
    roomSet.contains(roomId);
  };

  public shared ({ caller }) func postMessage(userId : UserId, roomId : RoomId, content : Text, media : ?Storage.ExternalBlob, replyTo : ?MessageId) : async ?PublicMessage {
    if (not roomSet.contains(roomId)) {
      return null;
    };

    let storedMessage : StoredMessage = {
      messageId = nextMessageId;
      userId;
      roomId;
      content;
      timestamp = Time.now();
      media;
      reactions = [];
      replyTo;
    };

    nextMessageId += 1;

    let currentMessages = switch (messages.get(roomId)) {
      case (null) { List.empty<StoredMessage>() };
      case (?existing) { existing };
    };

    currentMessages.add(storedMessage);
    messages.add(roomId, currentMessages);
    ?toPublic(storedMessage);
  };

  public query ({ caller }) func getMessages(roomId : RoomId, start : Nat, count : Nat) : async [PublicMessage] {
    if (not roomSet.contains(roomId)) {
      return [];
    };

    let currentMessages = switch (messages.get(roomId)) {
      case (null) { List.empty<StoredMessage>() };
      case (?existing) { existing };
    };

    let reversedList = currentMessages.reverse();
    let totalMessages = reversedList.size();
    if (start >= totalMessages) {
      return [];
    };

    let end = if (start + count > totalMessages) {
      totalMessages;
    } else {
      start + count;
    };

    let slicedMessages = reversedList.toArray().sliceToArray(start, end);
    Array.tabulate(
      slicedMessages.size(),
      func(i) { toPublic(slicedMessages[i]) },
    );
  };

  public shared ({ caller }) func editMessage(userId : UserId, roomId : RoomId, messageId : MessageId, newContent : Text) : async ?PublicMessage {
    if (not roomSet.contains(roomId)) {
      return null;
    };

    let currentMessages = switch (messages.get(roomId)) {
      case (null) { List.empty<StoredMessage>() };
      case (?existing) { existing };
    };

    let foundMessage = currentMessages.values().find(func(m) { m.messageId == messageId });

    switch (foundMessage) {
      case (null) { null };
      case (?message) {
        if (message.userId != userId) {
          return null;
        };

        let updatedMessage : StoredMessage = {
          message with content = newContent
        };

        let updateIter = currentMessages.values().map(
          func(m) {
            if (m.messageId == messageId) { updatedMessage } else { m };
          }
        );

        let newMessageList = List.fromIter<StoredMessage>(updateIter);
        messages.add(roomId, newMessageList);
        ?toPublic(updatedMessage);
      };
    };
  };

  public shared ({ caller }) func deleteMessage(userId : UserId, roomId : RoomId, messageId : MessageId) : async () {
    if (not roomSet.contains(roomId)) {
      return ();
    };

    let currentMessages = switch (messages.get(roomId)) {
      case (null) { List.empty<StoredMessage>() };
      case (?existing) { existing };
    };

    let foundMessage = currentMessages.values().find(func(m) { m.messageId == messageId });

    switch (foundMessage) {
      case (null) { () };
      case (?message) {
        if (message.userId != userId) {
          return ();
        };
        let filteredMessages = currentMessages.filter(func(m) { m.messageId != messageId });
        messages.add(roomId, filteredMessages);
      };
    };
  };

  public shared ({ caller }) func reactToMessage(userId : UserId, roomId : RoomId, messageId : MessageId, emoji : Text) : async ?PublicMessage {
    if (not roomSet.contains(roomId)) {
      return null;
    };

    let currentMessages = switch (messages.get(roomId)) {
      case (null) { List.empty<StoredMessage>() };
      case (?existing) { existing };
    };

    let foundMessage = currentMessages.values().find(func(m) { m.messageId == messageId });

    switch (foundMessage) {
      case (null) { null };
      case (?message) {
        let updatedReactions = List.fromArray<Reaction>(message.reactions);
        let newReaction : Reaction = {
          emoji;
          userId;
        };
        updatedReactions.add(newReaction);

        let updatedMessage : StoredMessage = {
          message with reactions = updatedReactions.toArray()
        };

        let updateIter = currentMessages.values().map(
          func(m) {
            if (m.messageId == messageId) { updatedMessage } else { m };
          }
        );
        messages.add(roomId, List.fromIter<StoredMessage>(updateIter));
        ?toPublic(updatedMessage);
      };
    };
  };

  public shared ({ caller }) func setNickname(userId : UserId, nickname : Text) : async () {
    userNicknames.add(userId, nickname);
  };

  func getNickname(userId : UserId) : Text {
    switch (userNicknames.get(userId)) {
      case (null) { "Anonymous" };
      case (?nickname) { nickname };
    };
  };

  func toPublic(storedMessage : StoredMessage) : PublicMessage {
    {
      messageId = storedMessage.messageId;
      userId = storedMessage.userId;
      roomId = storedMessage.roomId;
      content = storedMessage.content;
      timestamp = storedMessage.timestamp;
      media = storedMessage.media;
      reactions = storedMessage.reactions;
      replyTo = storedMessage.replyTo;
      nickname = getNickname(storedMessage.userId);
    };
  };

  public query ({ caller }) func listRooms() : async [Room] {
    rooms.values().toArray();
  };
};
