import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
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
      ...room.modes.map((mode) => ({ key: mode.name, label: mode.name })),
      {
        key: "__add__",
        label: (
          <span className="with-icon">
            <Plus size={16} aria-hidden="true" />
            Add mode
          </span>
        )
      }
    ];
  }, [room]);

  return (
    <div>
      <h4>Edit room</h4>
      {!room ? <p className="muted-text">Select a room to edit.</p> : null}
      {room ? (
        <>
          <div className="inline-field">
            <label htmlFor="edit-room-name">Name</label>
            <input
              id="edit-room-name"
              value={roomEditDraft.name}
              onChange={(event) => onRoomEditDraftChange({ ...roomEditDraft, name: event.target.value })}
            />
          </div>
          <div className="inline-field">
            <label htmlFor="edit-room-floor">Floor</label>
            <select
              id="edit-room-floor"
              value={roomEditDraft.floor}
              onChange={(event) =>
                onRoomEditDraftChange({ ...roomEditDraft, floor: event.target.value as RoomConfig["floor"] })
              }
            >
              {floors.map((floor) => (
                <option key={floor} value={floor}>
                  {floor}
                </option>
              ))}
            </select>
          </div>
          <div className="inline-field">
            <label htmlFor="edit-room-entity">Climate entity id</label>
            <input
              id="edit-room-entity"
              value={roomEditDraft.entityId}
              onChange={(event) =>
                onRoomEditDraftChange({ ...roomEditDraft, entityId: event.target.value })
              }
            />
          </div>
          <button type="button" onClick={() => roomId && onSaveRoom(roomId)}>
            Save room
          </button>
        </>
      ) : null}

      <hr />

      <h4>Modes and schedules</h4>
      {!room ? <p className="muted-text">Select a room to edit modes.</p> : null}

      {room ? (
        <div className="row-actions">
          {modeTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? "" : "secondary"}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {room && activeTab === "__add__" ? (
        <>
          <div className="inline-field">
            <label htmlFor="create-room-mode">Mode name</label>
            <input
              id="create-room-mode"
              placeholder="holiday"
              value={modeDraft.name}
              onChange={(event) => onModeDraftChange({ ...modeDraft, name: event.target.value })}
            />
          </div>
          <button type="button" onClick={() => roomId && onCreateMode(roomId)}>
            Add mode
          </button>
        </>
      ) : null}

      {room && selectedMode && activeTab !== "__add__" ? (
        <>
          <div className="inline-field">
            <label htmlFor="room-mode-name">Mode name</label>
            <input
              id="room-mode-name"
              value={modeNameDraft}
              onChange={(event) => setModeNameDraft(event.target.value)}
            />
          </div>

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
      ) : null}
    </div>
  );
}
