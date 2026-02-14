import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Storage "blob-storage/Storage";

module {
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

  type Room = {
    roomId : RoomId;
    name : Text;
  };

  type Actor = {
    rooms : Map.Map<RoomId, Room>;
    roomSet : Set.Set<RoomId>;
    messages : Map.Map<RoomId, List.List<StoredMessage>>;
    userNicknames : Map.Map<UserId, Nickname>;
    nextMessageId : MessageId;
  };

  public func run(old : Actor) : Actor {
    let updatedMessages = Map.empty<RoomId, List.List<StoredMessage>>();

    for (k in old.roomSet.values()) {
      let initialMessages = List.empty<StoredMessage>();
      updatedMessages.add(k, initialMessages);
    };

    {
      rooms = old.rooms;
      roomSet = old.roomSet;
      messages = updatedMessages;
      userNicknames = old.userNicknames;
      nextMessageId = old.nextMessageId;
    };
  };
};
