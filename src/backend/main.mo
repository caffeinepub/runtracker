import Map "mo:core/Map";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Int "mo:core/Int";

actor {
  type RunSession = {
    id : Text;
    startTimestamp : Int;
    endTimestamp : Int;
    distanceMeters : Float;
    durationSeconds : Float;
    caloriesBurned : Float;
    route : [(Float, Float)];
  };

  module RunSession {
    public func compare(session1 : RunSession, session2 : RunSession) : Order.Order {
      Text.compare(session1.id, session2.id);
    };

    public func compareByStartTime(session1 : RunSession, session2 : RunSession) : Order.Order {
      Int.compare(session1.startTimestamp, session2.startTimestamp);
    };

    public func compareByEndTime(session1 : RunSession, session2 : RunSession) : Order.Order {
      Int.compare(session1.endTimestamp, session2.endTimestamp);
    };
  };

  let runSessions = Map.empty<Text, RunSession>();

  public shared ({ caller }) func saveRunSession(session : RunSession) : async () {
    if (runSessions.containsKey(session.id)) {
      Runtime.trap("Run session with this ID already exists");
    };
    runSessions.add(session.id, session);
  };

  public query ({ caller }) func getAllRunSessions() : async [RunSession] {
    runSessions.values().toArray().sort();
  };

  public query func getRunSession(id : Text) : async ?RunSession {
    runSessions.get(id);
  };

  public query ({ caller }) func getAllRunSessionsByStartTime() : async [RunSession] {
    runSessions.values().toArray().sort(RunSession.compareByStartTime);
  };

  public query ({ caller }) func getAllRunSessionsByEndTime() : async [RunSession] {
    runSessions.values().toArray().sort(RunSession.compareByEndTime);
  };

  public type GPSCoordinate = {
    latitude : Float;
    longitude : Float;
  };
};
