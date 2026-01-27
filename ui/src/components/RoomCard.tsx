import { Card, List, Space, Tag, Typography, Button } from "antd";
import { EditOutlined } from "@ant-design/icons";
import type { RoomConfig } from "../../../shared/models";
import { findScheduleBlockAtMinute, isMinuteInBlock } from "../../../shared/schedule";

export type RoomCardProps = {
  room: RoomConfig;
  onEditRoom: (roomName: string) => void;
  onEditSchedule: (roomName: string) => void;
  nowMinute: number;
};

export default function RoomCard({ room, onEditRoom, onEditSchedule, nowMinute }: RoomCardProps) {
  const activeMode = room.modes.find((mode) => mode.name === room.activeModeName);
  const activeBlock = activeMode ? findScheduleBlockAtMinute(activeMode.schedule, nowMinute) : null;
  const currentTarget = activeBlock ? `${activeBlock.targetC}°C` : "—";

  return (
    <Card
      title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Space size="small">
            <Tag color="blue">{room.floor}</Tag>
            <Typography.Text strong>{room.name}</Typography.Text>
          </Space>
          <Typography.Text>{currentTarget}</Typography.Text>
        </div>
      }
      extra={
        <Button
          type="text"
          icon={<EditOutlined />}
          aria-label="Edit room"
          onClick={() => onEditRoom(room.name)}
        />
      }
    >
      <Space direction="vertical" size="small" style={{ width: "100%" }}>
        <Space align="center" style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Text strong>
            Active mode: {activeMode?.name ?? "None"}
          </Typography.Text>
          <Button
            type="text"
            icon={<EditOutlined />}
            aria-label="Edit schedule"
            onClick={() => onEditSchedule(room.name)}
          />
        </Space>

        {activeMode ? (
          <List
            size="small"
            dataSource={activeMode.schedule}
            renderItem={(block) => {
              const isActive = isMinuteInBlock(block, nowMinute);
              return (
                <List.Item
                  style={{
                    background: isActive ? "#e6f4ff" : "transparent",
                    borderRadius: 6,
                    padding: "4px 8px"
                  }}
                >
                <Typography.Text>
                  {block.start}–{block.end} · {block.targetC}°C
                </Typography.Text>
                </List.Item>
              );
            }}
          />
        ) : (
          <Typography.Text type="secondary">No active mode configured.</Typography.Text>
        )}
      </Space>
    </Card>
  );
}
