import { Empty, Row, Col } from "antd";
import type { RoomConfig } from "../../../shared/models";
import RoomCard from "./RoomCard";

export type RoomListProps = {
  rooms: RoomConfig[];
  onEditRoom: (roomId: string) => void;
  onSetActiveMode: (roomName: string, modeName: string) => void;
  nowMinute: number;
  addRoomNode?: React.ReactNode;
};

export default function RoomList({
  rooms,
  onEditRoom,
  onSetActiveMode,
  nowMinute,
  addRoomNode
}: RoomListProps) {
  if (rooms.length === 0) {
    return <Empty description="No rooms configured" />;
  }

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
    <Row gutter={[16, 16]}>
      {ordered.map((room) => (
        <Col key={room.name} xs={24} sm={12} lg={8}>
          <RoomCard
            room={room}
            onEditRoom={onEditRoom}
            onSetActiveMode={onSetActiveMode}
            nowMinute={nowMinute}
          />
        </Col>
      ))}
      {addRoomNode ? (
        <Col key="add-room" xs={24} sm={12} lg={8}>
          {addRoomNode}
        </Col>
      ) : null}
    </Row>
  );
}
