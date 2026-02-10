import { Empty, Row, Col } from "antd";
import type { GlobalSettings, RoomConfig } from "../../../shared/models";
import { roomKey } from "../../../shared/roomKey";
import RoomCard from "./RoomCard";

export type RoomListProps = {
  rooms: RoomConfig[];
  onEditRoom: (roomKey: string) => void;
  onSetActiveMode: (roomKey: string, modeName: string) => void;
  nowMinute: number;
  addRoomNode?: React.ReactNode;
  settings: GlobalSettings;
};

export default function RoomList({
  rooms,
  onEditRoom,
  onSetActiveMode,
  nowMinute,
  addRoomNode,
  settings
}: RoomListProps) {
  if (rooms.length === 0) {
    return (
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Empty description="No rooms configured" />
        </Col>
        {addRoomNode ? (
          <Col span={24}>{addRoomNode}</Col>
        ) : null}
      </Row>
    );
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
        <Col key={roomKey(room)} xs={24} sm={12} lg={8}>
          <RoomCard
            room={room}
            onEditRoom={onEditRoom}
            onSetActiveMode={onSetActiveMode}
            nowMinute={nowMinute}
            settings={settings}
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
