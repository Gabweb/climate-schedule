import { Pencil } from "lucide-react";
import type { GlobalSettings, WaterHeaterConfig } from "../../../shared/models";
import { findScheduleBlockAtMinute, isMinuteInBlock } from "../../../shared/schedule";
import { evaluateWaterHeaterAtMinute } from "../../../shared/waterHeater";
import { CardModeSelect, CardScheduleList, EntityCard } from "./CardWidgets";

type WaterHeaterCardProps = {
  config: WaterHeaterConfig;
  settings: GlobalSettings;
  nowMinute: number;
  onEdit: () => void;
  onSetActiveMode: (modeName: string) => void;
  canEdit: boolean;
};

export default function WaterHeaterCard({
  config,
  settings,
  nowMinute,
  onEdit,
  onSetActiveMode,
  canEdit
}: WaterHeaterCardProps) {
  const activeMode = config.modes.find((mode) => mode.name === config.activeModeName);
  const evaluated = evaluateWaterHeaterAtMinute(config, nowMinute, settings);
  const currentStateLabel = evaluated.isOff ? "Off" : "On";

  const scheduleItems = (activeMode?.schedule ?? []).map((block) => ({
    key: `${block.start}-${block.end}`,
    left: `${block.start}-${block.end}`,
    right: block.enabled ? "Heat on" : "Off",
    active: isMinuteInBlock(block, nowMinute)
  }));

  return (
    <EntityCard
      title="Water heater"
      headerRight={
        canEdit ? (
          <button
            type="button"
            className="secondary entity-card-edit icon-only-button"
            onClick={onEdit}
            aria-label="Edit water heater"
          >
            <Pencil size={16} aria-hidden="true" />
          </button>
        ) : (
          <span className="badge">{currentStateLabel}</span>
        )
      }
    >
      <CardModeSelect
        id="water-heater-active-mode"
        ariaLabel="Active mode"
        value={config.activeModeName}
        options={config.modes.map((mode) => ({ value: mode.name, label: mode.name }))}
        disabled={config.modes.length <= 1}
        onChange={onSetActiveMode}
      />

      <CardScheduleList items={scheduleItems} emptyText="No schedule configured." />
    </EntityCard>
  );
}
