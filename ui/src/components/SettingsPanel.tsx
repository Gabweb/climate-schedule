import { Button, Divider, Form, Input, InputNumber, Select, Table, Typography } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import type { RoomConfig, ScheduleBlock } from "../../../shared/models";
import { parseTimeToMinutes } from "../../../shared/schedule";

export type ModeDraft = {
  name: string;
};

export type RoomEditDraft = {
  name: string;
  floor: RoomConfig["floor"];
  entityId: string;
};

type SettingsPanelProps = {
  room: RoomConfig | null;
  modeDraft: ModeDraft;
  roomEditDraft: RoomEditDraft;
  onModeDraftChange: (draft: ModeDraft) => void;
  onRoomEditDraftChange: (draft: RoomEditDraft) => void;
  onSaveRoom: (roomId: string) => void;
  onSetActiveMode: (roomName: string, modeName: string) => void;
  onCreateMode: (roomName: string) => void;
  onDeleteMode: (roomName: string, modeName: string) => void;
  onScheduleChange: (index: number, key: keyof ScheduleBlock, value: string | number) => void;
  onAddSlot: () => void;
  onRemoveSlot: (index: number) => void;
  onSaveSchedule: () => void;
};

const floors: RoomConfig["floor"][] = ["UG", "EG", "1OG", "2OG"];

export default function SettingsPanel({
  room,
  modeDraft,
  roomEditDraft,
  onModeDraftChange,
  onRoomEditDraftChange,
  onSaveRoom,
  onSetActiveMode,
  onCreateMode,
  onDeleteMode,
  onScheduleChange,
  onAddSlot,
  onRemoveSlot,
  onSaveSchedule
}: SettingsPanelProps) {
  const activeMode = room?.modes.find((mode) => mode.name === room.activeModeName) ?? null;
  const schedule = activeMode?.schedule ?? [];
  const lastIndex = schedule.length - 1;

  const getStartInvalid = (index: number): boolean => {
    const block = schedule[index];
    if (!block) return false;
    try {
      const startMinutes = parseTimeToMinutes(block.start);
      const endMinutes = parseTimeToMinutes(block.end);
      if (index === 0 && block.start !== "00:00") return true;
      if (startMinutes >= endMinutes) return true;
      if (startMinutes % 10 !== 0) return true;
      if (index > 0 && block.start !== schedule[index - 1].end) return true;
      if (index < lastIndex && block.end !== schedule[index + 1].start) return true;
      return false;
    } catch {
      return true;
    }
  };

  const getEndInvalid = (index: number): boolean => {
    const block = schedule[index];
    if (!block) return false;
    try {
      const startMinutes = parseTimeToMinutes(block.start);
      const endMinutes = parseTimeToMinutes(block.end);
      if (startMinutes >= endMinutes) return true;
      const isLast = index === lastIndex;
      if (isLast && block.end !== "23:59") return true;
      if (!isLast && block.end !== schedule[index + 1].start) return true;
      if (block.end !== "23:59" && endMinutes % 10 !== 0) return true;
      return false;
    } catch {
      return true;
    }
  };

  return (
    <div>
      <Typography.Title level={5}>Edit room</Typography.Title>
      {!room && <Typography.Text>Select a room to edit.</Typography.Text>}
      {room && (
        <Form layout="vertical">
          <Form.Item label="Name">
            <Input
              value={roomEditDraft.name}
              onChange={(event) =>
                onRoomEditDraftChange({ ...roomEditDraft, name: event.target.value })
              }
            />
          </Form.Item>
          <Form.Item label="Floor">
            <Select
              value={roomEditDraft.floor}
              onChange={(value) => onRoomEditDraftChange({ ...roomEditDraft, floor: value })}
              options={floors.map((floor) => ({ value: floor, label: floor }))}
            />
          </Form.Item>
          <Form.Item label="Climate entity id">
            <Input
              value={roomEditDraft.entityId}
              onChange={(event) =>
                onRoomEditDraftChange({ ...roomEditDraft, entityId: event.target.value })
              }
            />
          </Form.Item>
          <Button type="primary" onClick={() => onSaveRoom(room.name)}>
            Save room
          </Button>
        </Form>
      )}

      <Divider />

      <Typography.Title level={4}>Modes</Typography.Title>
      {!room && <Typography.Text>Select a room to edit modes.</Typography.Text>}
      {room && (
        <>
          <div style={{ display: "grid", gap: 8 }}>
            {room.modes.map((mode) => (
              <div key={mode.name}>
                <Button
                  type={mode.name === room.activeModeName ? "primary" : "text"}
                  onClick={() => onSetActiveMode(room.name, mode.name)}
                >
                  {mode.name}
                </Button>
                <Button danger type="link" onClick={() => onDeleteMode(room.name, mode.name)}>
                  Delete
                </Button>
              </div>
            ))}
          </div>
          <Divider />
          <Typography.Title level={5}>Add mode</Typography.Title>
          <Form layout="vertical">
            <Form.Item label="Mode name">
              <Input
                placeholder="holiday"
                value={modeDraft.name}
                onChange={(event) => onModeDraftChange({ ...modeDraft, name: event.target.value })}
              />
            </Form.Item>
            <Button type="primary" onClick={() => onCreateMode(room.name)}>
              Add mode
            </Button>
          </Form>
        </>
      )}

      <Divider />

      <Typography.Title level={4}>Active mode schedule</Typography.Title>
      {!activeMode && <Typography.Text>Select a room to edit its schedule.</Typography.Text>}
      {activeMode && (
        <>
          <Table
            pagination={false}
            dataSource={activeMode.schedule.map((block, index) => ({
              key: `${block.start}-${index}`,
              index,
              ...block
            }))}
            columns={[
              {
                title: "Start",
                dataIndex: "start",
                render: (value, record) => (
                  <Input
                    type="time"
                    step={600}
                    value={value}
                    status={getStartInvalid(record.index) ? "error" : undefined}
                    onChange={(event) => onScheduleChange(record.index, "start", event.target.value)}
                    disabled={record.index === 0}
                  />
                )
              },
              {
                title: "End",
                dataIndex: "end",
                render: (value, record) => (
                  <Input
                    type="time"
                    step={60}
                    value={value}
                    status={getEndInvalid(record.index) ? "error" : undefined}
                    onChange={(event) => onScheduleChange(record.index, "end", event.target.value)}
                  />
                )
              },
              {
                title: "Target (°C)",
                dataIndex: "targetC",
                render: (value, record) => (
                  <InputNumber
                    min={5}
                    max={35}
                    step={0.5}
                    value={value}
                    onChange={(next) =>
                      onScheduleChange(record.index, "targetC", Number(next ?? value))
                    }
                  />
                )
              },
              {
                title: "",
                dataIndex: "remove",
                render: (_, record) => (
                  <Button
                    type="text"
                    icon={<MinusCircleOutlined />}
                    onClick={() => onRemoveSlot(record.index)}
                    disabled={activeMode.schedule.length <= 1}
                    aria-label="Remove time slot"
                  />
                )
              }
            ]}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Button
              icon={<PlusOutlined />}
              onClick={onAddSlot}
              disabled={activeMode.schedule.length >= 10}
            >
              Add slot
            </Button>
            <Button type="primary" onClick={onSaveSchedule}>
              Save schedule
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
