import Map "mo:core/Map";
import Set "mo:core/Set";
import List "mo:core/List";
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

  type Media = Storage.ExternalBlob;

  type StoredMessage = {
    messageId : MessageId;
    userId : UserId;
    roomId : RoomId;
    content : Text;
    timestamp : Int;
    media : ?Media;
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
    nextMessageId : Nat;
  };

  public func run(old : Actor) : Actor {
    old;
  };
};
