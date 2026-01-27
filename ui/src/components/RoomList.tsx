import { Empty, Row, Col } from "antd";
import type { RoomConfig } from "../../../shared/models";
import RoomCard from "./RoomCard";

export type RoomListProps = {
  rooms: RoomConfig[];
  onEditRoom: (roomId: string) => void;
  onEditSchedule: (roomId: string) => void;
  nowMinute: number;
};

export default function RoomList({ rooms, onEditRoom, onEditSchedule, nowMinute }: RoomListProps) {
  if (rooms.length === 0) {
    return <Empty description="No rooms configured" />;
  }

  return (
    <Row gutter={[16, 16]}>
      {rooms.map((room) => (
        <Col key={room.name} xs={24} sm={12} lg={8}>
          <RoomCard
            room={room}
            onEditRoom={onEditRoom}
            onEditSchedule={onEditSchedule}
            nowMinute={nowMinute}
          />
        </Col>
      ))}
    </Row>
  );
}
