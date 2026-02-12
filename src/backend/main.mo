import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Set "mo:core/Set";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";



actor {
  type UserId = Text;
  type RoomId = Text;
  type MessageId = Nat;

  type Reaction = {
    emoji : Text;
    userId : UserId;
  };

  type Media = Storage.ExternalBlob;

  type Message = {
    messageId : MessageId;
    userId : UserId;
    roomId : RoomId;
    content : Text;
    timestamp : Time.Time;
    media : ?Media;
    reactions : [Reaction];
    replyTo : ?MessageId;
  };

  type Room = {
    roomId : RoomId;
    name : Text;
  };

  include MixinStorage();

  let rooms = Map.empty<RoomId, Room>();
  let roomSet = Set.empty<RoomId>();
  let messages = Map.empty<RoomId, List.List<Message>>();
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
    messages.add(roomId, List.empty<Message>());
  };

  public query ({ caller }) func validateRoom(roomId : RoomId) : async Bool {
    if (roomId == "") { return false };
    if (roomSet.size() == 0) { return false };
    roomSet.contains(roomId);
  };

  public shared ({ caller }) func postMessage(userId : UserId, roomId : RoomId, content : Text, media : ?Media, replyTo : ?MessageId) : async Message {
    if (not roomSet.contains(roomId)) {
      Runtime.trap("Room does not exist");
    };

    let message : Message = {
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
        messageList.add(message);
        message;
      };
    };
  };

  public query ({ caller }) func getMessages(roomId : RoomId, start : Nat, count : Nat) : async [Message] {
    if (not roomSet.contains(roomId)) {
      Runtime.trap("Room does not exist");
    };

    switch (messages.get(roomId)) {
      case (null) { Runtime.trap("Room has no messages") };
      case (?messageList) { messageList.values().toArray() };
    };
  };

  public shared ({ caller }) func editMessage(userId : UserId, roomId : RoomId, messageId : MessageId, newContent : Text) : async Message {
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

            let updatedMessage : Message = {
              message with content = newContent
            };

            let updateIter = messageList.values().map(
              func(m) {
                if (m.messageId == messageId) { updatedMessage } else { m };
              }
            );

            let newMessageList = List.fromIter<Message>(updateIter);
            messages.add(roomId, newMessageList);
            updatedMessage;
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

  public shared ({ caller }) func reactToMessage(userId : UserId, roomId : RoomId, messageId : MessageId, emoji : Text) : async Message {
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
            var updatedReactions = List.empty<Reaction>();
            for (reaction in message.reactions.values()) {
              updatedReactions.add(reaction);
            };
            let newReaction : Reaction = {
              emoji;
              userId;
            };
            updatedReactions.add(newReaction);

            let updatedMessage : Message = {
              message with reactions = updatedReactions.toArray()
            };

            let updateIter = messageList.values().map(
              func(m) {
                if (m.messageId == messageId) { updatedMessage } else { m };
              }
            );
            messages.add(roomId, List.fromIter<Message>(updateIter));
            updatedMessage;
          };
        };
      };
    };
  };

  public query ({ caller }) func listRooms() : async [Room] {
    rooms.values().toArray();
  };
};

