import { Card, List, Space, Tag, Typography, Button, Dropdown } from "antd";
import { DownOutlined, EditOutlined } from "@ant-design/icons";
import type { RoomConfig } from "../../../shared/models";
import { findScheduleBlockAtMinute, isMinuteInBlock } from "../../../shared/schedule";

export type RoomCardProps = {
  room: RoomConfig;
  onEditRoom: (roomName: string) => void;
  onSetActiveMode: (roomName: string, modeName: string) => void;
  nowMinute: number;
};

export default function RoomCard({ room, onEditRoom, onSetActiveMode, nowMinute }: RoomCardProps) {
  const activeMode = room.modes.find((mode) => mode.name === room.activeModeName);
  const activeBlock = activeMode ? findScheduleBlockAtMinute(activeMode.schedule, nowMinute) : null;
  const currentTarget = activeBlock ? `${activeBlock.targetC}°C` : "—";
  const modeOptions = room.modes.map((mode) => ({
    key: mode.name,
    label: mode.name
  }));
  const hasMultipleModes = room.modes.length > 1;

  return (
    <Card
      title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Space size="small">
            <Tag color="blue">{room.floor}</Tag>
            <Typography.Text strong>{room.name}</Typography.Text>
            <Button
              type="text"
              icon={<EditOutlined />}
              aria-label="Edit room"
              onClick={() => onEditRoom(room.name)}
            />
          </Space>
        </div>
      }
      extra={
        <>
          {hasMultipleModes ? (
            <Dropdown
              trigger={["click"]}
              menu={{
                items: modeOptions,
                onClick: ({ key }) => onSetActiveMode(room.name, String(key))
              }}
            >
              <Tag color="green" style={{ cursor: "pointer" }}>
                <Space size={4}>
                  {activeMode?.name ?? "None"}
                  <DownOutlined />
                </Space>
              </Tag>
            </Dropdown>
          ) : (
            <Tag color="green">{activeMode?.name ?? "None"}</Tag>
          )}
        </>
      }
    >
      <Space direction="vertical" size="small" style={{ width: "100%" }}>

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
