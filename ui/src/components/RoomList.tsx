import type { GlobalSettings, RoomConfig } from "../../../shared/models";
import { roomKey } from "../../../shared/roomKey";
import RoomCard from "./RoomCard";

export type RoomListProps = {
  rooms: RoomConfig[];
  onEditRoom: (roomKey: string) => void;
  onSetActiveMode: (roomKey: string, modeName: string) => void;
  nowMinute: number;
  addRoomNode?: React.ReactNode;
  leadingNode?: React.ReactNode;
  settings: GlobalSettings;
  canEdit: boolean;
};

export default function RoomList({
  rooms,
  onEditRoom,
  onSetActiveMode,
  nowMinute,
  addRoomNode,
  leadingNode,
  settings,
  canEdit
}: RoomListProps) {
  const ordered = [...rooms].sort((a, b) => {
    const floorOrder = ["UG", "EG", "1OG", "2OG"] as const;
    const floorIndexA = floorOrder.indexOf(a.floor);
    const floorIndexB = floorOrder.indexOf(b.floor);
    if (floorIndexA !== floorIndexB) {
      return floorIndexA - floorIndexB;
    }
    return a.name.localeCompare(b.name, "de-DE");
  });

  return (
    <div className="grid-cards">
      {leadingNode ? leadingNode : null}
      {ordered.map((room) => (
        <RoomCard
          key={roomKey(room)}
          room={room}
          onEditRoom={onEditRoom}
          onSetActiveMode={onSetActiveMode}
          nowMinute={nowMinute}
          settings={settings}
          canEdit={canEdit}
        />
      ))}
      {rooms.length === 0 ? <article className="muted-text">No rooms configured.</article> : null}
      {addRoomNode ? addRoomNode : null}
    </div>
  );
}
