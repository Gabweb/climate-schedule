import { Pencil } from "lucide-react";
import type { GlobalSettings, RoomConfig } from "../../../shared/models";
import { findScheduleBlockAtMinute, isMinuteInBlock } from "../../../shared/schedule";
import { roomKey } from "../../../shared/roomKey";
import { applyGlobalTemperatureSettings } from "../../../shared/temperature";
import { CardModeSelect, CardScheduleList, EntityCard } from "./CardWidgets";

export type RoomCardProps = {
  room: RoomConfig;
  onEditRoom: (roomKey: string) => void;
  onSetActiveMode: (roomKey: string, modeName: string) => void;
  nowMinute: number;
  settings: GlobalSettings;
  canEdit: boolean;
};

export default function RoomCard({
  room,
  onEditRoom,
  onSetActiveMode,
  nowMinute,
  settings,
  canEdit
}: RoomCardProps) {
  const activeMode = room.modes.find((mode) => mode.name === room.activeModeName);
  const activeBlock = activeMode ? findScheduleBlockAtMinute(activeMode.schedule, nowMinute) : null;
  const currentTarget = activeBlock
    ? `${applyGlobalTemperatureSettings(activeBlock.targetC, settings)} °C`
    : "-";
  const roomId = roomKey(room);

  const scheduleItems = (activeMode?.schedule ?? []).map((block) => ({
    key: `${block.start}-${block.end}`,
    left: `${block.start}-${block.end}`,
    right: `${applyGlobalTemperatureSettings(block.targetC, settings)} °C`,
    active: isMinuteInBlock(block, nowMinute)
  }));

  return (
    <EntityCard
      title={room.name}
      titleBadge={<span className="badge badge-floor">{room.floor}</span>}
      headerRight={
        canEdit ? (
          <button
            type="button"
            className="secondary entity-card-edit icon-only-button"
            onClick={() => onEditRoom(roomId)}
            aria-label="Edit room"
          >
            <Pencil size={16} aria-hidden="true" />
          </button>
        ) : (
          <span className="badge">{currentTarget}</span>
        )
      }
    >
      <CardModeSelect
        id={`room-mode-${roomId}`}
        ariaLabel="Active mode"
        value={activeMode?.name ?? ""}
        options={room.modes.map((mode) => ({ value: mode.name, label: mode.name }))}
        disabled={room.modes.length <= 1}
        onChange={(modeName) => onSetActiveMode(roomId, modeName)}
      />

      <CardScheduleList items={scheduleItems} emptyText="No active mode configured." />
    </EntityCard>
  );
}
