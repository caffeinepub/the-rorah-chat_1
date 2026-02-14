import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Set "mo:core/Set";
import Array "mo:core/Array";

import Nat8 "mo:core/Nat8";
import Blob "mo:core/Blob";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

// Add mixin as include

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

  type Media = Blob;

  type StoredMessage = {
    messageId : MessageId;
    userId : UserId;
    roomId : RoomId;
    content : Text;
    timestamp : Time.Time;
    media : ?Media;
    reactions : [Reaction];
    replyTo : ?MessageId;
  };

  type PublicMessage = {
    messageId : MessageId;
    userId : UserId;
    roomId : RoomId;
    content : Text;
    timestamp : Time.Time;
    media : ?Media;
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
      Runtime.trap("Room with this ID already exists!");
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
    roomId != "" and roomSet.size() != 0 and roomSet.contains(roomId)
  };

  public shared ({ caller }) func postMessage(userId : UserId, roomId : RoomId, content : Text, media : ?Media, replyTo : ?MessageId) : async PublicMessage {
    if (not roomSet.contains(roomId)) {
      Runtime.trap("Room does not exist");
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

    switch (messages.get(roomId)) {
      case (null) { Runtime.trap("Room has no messages") };
      case (?messageList) {
        messageList.add(storedMessage);
        toPublic(storedMessage);
      };
    };
  };

  public query ({ caller }) func getMessages(roomId : RoomId, start : Nat, count : Nat) : async [PublicMessage] {
    if (not roomSet.contains(roomId)) {
      Runtime.trap("Room does not exist");
    };

    switch (messages.get(roomId)) {
      case (null) { Runtime.trap("Room has no messages") };
      case (?messageList) {
        let reversedList = messageList.reverse();
        let totalMessages = reversedList.size();
        if (start >= totalMessages) {
          return [];
        };

        let end = if (start + count >= totalMessages) {
          totalMessages;
        } else {
          start + count;
        };

        let slicedMessages = reversedList.values().toArray().sliceToArray(start, end);
        slicedMessages.map(toPublic);
      };
    };
  };

  public shared ({ caller }) func editMessage(userId : UserId, roomId : RoomId, messageId : MessageId, newContent : Text) : async PublicMessage {
    if (not roomSet.contains(roomId)) {
      Runtime.trap("Room does not exist");
    };

    switch (messages.get(roomId)) {
      case (null) { Runtime.trap("Room has no messages") };
      case (?messageList) {
        let foundMessage = messageList.values().find(func(m) { m.messageId == messageId });

        switch (foundMessage) {
          case (null) { Runtime.trap("Message not found") };
          case (?message) {
            if (message.userId != userId) {
              Runtime.trap("You can only edit your own messages");
            };

            let updatedMessage : StoredMessage = {
              message with content = newContent
            };

            let updateIter = messageList.values().map(
              func(m) {
                if (m.messageId == messageId) { updatedMessage } else { m };
              }
            );

            let newMessageList = List.fromIter<StoredMessage>(updateIter);
            messages.add(roomId, newMessageList);
            toPublic(updatedMessage);
          };
        };
      };
    };
  };

  public shared ({ caller }) func deleteMessage(userId : UserId, roomId : RoomId, messageId : MessageId) : async () {
    if (not roomSet.contains(roomId)) {
      Runtime.trap("Room does not exist");
    };

    switch (messages.get(roomId)) {
      case (null) { Runtime.trap("Room has no messages") };
      case (?messageList) {
        let foundMessage = messageList.values().find(func(m) { m.messageId == messageId });

        switch (foundMessage) {
          case (null) { Runtime.trap("Message not found") };
          case (?message) {
            if (message.userId != userId) {
              Runtime.trap("You can only delete your own messages");
            };

            let filteredMessages = messageList.filter(func(m) { m.messageId != messageId });
            messages.add(roomId, filteredMessages);
          };
        };
      };
    };
  };

  public shared ({ caller }) func reactToMessage(userId : UserId, roomId : RoomId, messageId : MessageId, emoji : Text) : async PublicMessage {
    if (not roomSet.contains(roomId)) {
      Runtime.trap("Room does not exist");
    };

    switch (messages.get(roomId)) {
      case (null) { Runtime.trap("Room has no messages") };
      case (?messageList) {
        let foundMessage = messageList.values().find(func(m) { m.messageId == messageId });

        switch (foundMessage) {
          case (null) { Runtime.trap("Message not found") };
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

            let updateIter = messageList.values().map(
              func(m) {
                if (m.messageId == messageId) { updatedMessage } else { m };
              }
            );
            messages.add(roomId, List.fromIter<StoredMessage>(updateIter));
            toPublic(updatedMessage);
          };
        };
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

