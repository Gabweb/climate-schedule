import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Divider, Form, Input, Select, Tabs, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { RoomConfig, ScheduleBlock } from "../../../shared/models";
import { roomKey } from "../../../shared/roomKey";
import ScheduleTable from "./ScheduleTable";

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
  onSaveRoom: (roomKey: string) => void;
  onCreateMode: (roomKey: string) => void;
  onDeleteMode: (roomKey: string, modeName: string) => void;
  onRenameMode: (roomKey: string, modeName: string, nextName: string) => void;
  onScheduleChange: (
    modeName: string,
    index: number,
    key: keyof ScheduleBlock,
    value: string | number
  ) => void;
  onAddSlot: (modeName: string) => void;
  onRemoveSlot: (modeName: string, index: number) => void;
  onSaveSchedule: (modeName: string) => void;
};

const floors: RoomConfig["floor"][] = ["UG", "EG", "1OG", "2OG"];

export default function SettingsPanel({
  room,
  modeDraft,
  roomEditDraft,
  onModeDraftChange,
  onRoomEditDraftChange,
  onSaveRoom,
  onCreateMode,
  onDeleteMode,
  onRenameMode,
  onScheduleChange,
  onAddSlot,
  onRemoveSlot,
  onSaveSchedule
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<string | null>(room?.activeModeName ?? null);
  const [modeNameDraft, setModeNameDraft] = useState("");
  const renameTimerRef = useRef<number | null>(null);

  const roomId = room ? roomKey(room) : null;
  const selectedMode = room?.modes.find((mode) => mode.name === activeTab) ?? null;

  useEffect(() => {
    const initial = room?.modes[0]?.name ?? null;
    setActiveTab(initial);
    setModeNameDraft(room?.modes.find((mode) => mode.name === initial)?.name ?? "");
  }, [roomId]);

  useEffect(() => {
    setModeNameDraft(selectedMode?.name ?? "");
  }, [selectedMode?.name]);

  useEffect(() => {
    if (!room || !selectedMode) return;
    if (!modeNameDraft.trim()) return;
    if (modeNameDraft.trim() === selectedMode.name) return;
    if (renameTimerRef.current) {
      window.clearTimeout(renameTimerRef.current);
    }
    renameTimerRef.current = window.setTimeout(() => {
      const nextName = modeNameDraft.trim();
      if (!nextName) return;
      if (roomId) {
        onRenameMode(roomId, selectedMode.name, nextName);
      }
      setActiveTab(nextName);
    }, 1000);
    return () => {
      if (renameTimerRef.current) {
        window.clearTimeout(renameTimerRef.current);
      }
    };
  }, [modeNameDraft, onRenameMode, room, roomId, selectedMode]);

  const modeTabs = useMemo(() => {
    if (!room) return [];
    return [
      ...room.modes.map((mode) => ({
        key: mode.name,
        label: mode.name
      })),
      {
        key: "__add__",
        label: (
          <>
            <PlusOutlined /> Add mode
          </>
        )
      }
    ];
  }, [room]);

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
          <Button type="primary" onClick={() => roomId && onSaveRoom(roomId)}>
            Save room
          </Button>
        </Form>
      )}

      <Divider />

      <Typography.Title level={4}>Modes & schedules</Typography.Title>
      {!room && <Typography.Text>Select a room to edit modes.</Typography.Text>}
      {room && (
        <Tabs activeKey={activeTab ?? undefined} items={modeTabs} onChange={setActiveTab} />
      )}

      {room && activeTab === "__add__" && (
        <Form layout="vertical">
          <Form.Item label="Mode name">
            <Input
              placeholder="holiday"
              value={modeDraft.name}
              onChange={(event) => onModeDraftChange({ ...modeDraft, name: event.target.value })}
            />
          </Form.Item>
          <Button type="primary" onClick={() => roomId && onCreateMode(roomId)}>
            Add mode
          </Button>
        </Form>
      )}

      {room && selectedMode && activeTab !== "__add__" && (
        <>
          <Form layout="vertical">
            <Form.Item label="Mode name">
              <Input value={modeNameDraft} onChange={(event) => setModeNameDraft(event.target.value)} />
            </Form.Item>
          </Form>

          <ScheduleTable
            modeName={selectedMode.name}
            schedule={selectedMode.schedule}
            onScheduleChange={onScheduleChange}
            onAddSlot={onAddSlot}
            onRemoveSlot={onRemoveSlot}
            onSaveSchedule={onSaveSchedule}
            onDeleteMode={() => roomId && onDeleteMode(roomId, selectedMode.name)}
            canDeleteMode={room.modes.length > 1}
          />
        </>
      )}
    </div>
  );
}
