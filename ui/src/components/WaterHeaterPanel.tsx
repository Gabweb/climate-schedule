import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { WaterHeaterConfig, WaterHeaterScheduleBlock } from "../../../shared/models";
import WaterHeaterScheduleTable from "./WaterHeaterScheduleTable";

type ModeDraft = {
  name: string;
};

type WaterHeaterPanelProps = {
  config: WaterHeaterConfig;
  modeDraft: ModeDraft;
  onModeDraftChange: (draft: ModeDraft) => void;
  onSaveConfig: (entityId: string, heatingTemperatureC: number) => Promise<void>;
  onCreateMode: (name: string) => Promise<void>;
  onDeleteMode: (modeName: string) => Promise<void>;
  onRenameMode: (modeName: string, nextName: string) => Promise<void>;
  onScheduleChange: (
    modeName: string,
    index: number,
    key: keyof WaterHeaterScheduleBlock,
    value: string | boolean
  ) => void;
  onAddSlot: (modeName: string) => void;
  onRemoveSlot: (modeName: string, index: number) => void;
  onSaveSchedule: (modeName: string) => Promise<void>;
};

export default function WaterHeaterPanel({
  config,
  modeDraft,
  onModeDraftChange,
  onSaveConfig,
  onCreateMode,
  onDeleteMode,
  onRenameMode,
  onScheduleChange,
  onAddSlot,
  onRemoveSlot,
  onSaveSchedule
}: WaterHeaterPanelProps) {
  const [activeTab, setActiveTab] = useState(config.activeModeName);
  const [entityIdDraft, setEntityIdDraft] = useState(config.entityId);
  const [heatingTemperatureDraft, setHeatingTemperatureDraft] = useState(config.heatingTemperatureC);
  const [modeNameDraft, setModeNameDraft] = useState(config.activeModeName);
  const renameTimerRef = useRef<number | null>(null);

  const selectedMode = config.modes.find((mode) => mode.name === activeTab) ?? null;

  useEffect(() => {
    setActiveTab(config.activeModeName);
    setEntityIdDraft(config.entityId);
    setHeatingTemperatureDraft(config.heatingTemperatureC);
  }, [config.activeModeName, config.entityId, config.heatingTemperatureC]);

  useEffect(() => {
    setModeNameDraft(selectedMode?.name ?? "");
  }, [selectedMode?.name]);

  useEffect(() => {
    if (!selectedMode) return;
    const nextName = modeNameDraft.trim();
    if (!nextName || nextName === selectedMode.name) return;
    if (renameTimerRef.current) {
      window.clearTimeout(renameTimerRef.current);
    }
    renameTimerRef.current = window.setTimeout(() => {
      onRenameMode(selectedMode.name, nextName);
      setActiveTab(nextName);
    }, 1000);
    return () => {
      if (renameTimerRef.current) {
        window.clearTimeout(renameTimerRef.current);
      }
    };
  }, [modeNameDraft, onRenameMode, selectedMode]);

  const modeTabs = useMemo(
    () => [
      ...config.modes.map((mode) => ({ key: mode.name, label: mode.name })),
      {
        key: "__add__",
        label: (
          <span className="with-icon">
            <Plus size={16} aria-hidden="true" />
            Add mode
          </span>
        )
      }
    ],
    [config.modes]
  );

  return (
    <div>
      <h4>Water heater</h4>

      <div className="inline-field">
        <label htmlFor="water-heater-entity">Climate entity id</label>
        <input
          id="water-heater-entity"
          value={entityIdDraft}
          onChange={(event) => setEntityIdDraft(event.target.value)}
        />
      </div>
      <div className="inline-field">
        <label htmlFor="water-heater-temp">Heating temperature (°C)</label>
        <input
          id="water-heater-temp"
          type="number"
          min={30}
          max={65}
          value={heatingTemperatureDraft}
          onChange={(event) => setHeatingTemperatureDraft(Number(event.target.value))}
        />
      </div>
      <button type="button" onClick={() => onSaveConfig(entityIdDraft.trim(), heatingTemperatureDraft)}>
        Save config
      </button>

      <h4 style={{ marginTop: "1.5rem" }}>Modes and schedules</h4>
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

      {activeTab === "__add__" ? (
        <>
          <div className="inline-field">
            <label htmlFor="water-heater-create-mode">Mode name</label>
            <input
              id="water-heater-create-mode"
              placeholder="holiday"
              value={modeDraft.name}
              onChange={(event) => onModeDraftChange({ name: event.target.value })}
            />
          </div>
          <button type="button" onClick={() => onCreateMode(modeDraft.name.trim())}>
            Add mode
          </button>
        </>
      ) : null}

      {selectedMode && activeTab !== "__add__" ? (
        <>
          <div className="inline-field">
            <label htmlFor="water-heater-mode-name">Mode name</label>
            <input
              id="water-heater-mode-name"
              value={modeNameDraft}
              onChange={(event) => setModeNameDraft(event.target.value)}
            />
          </div>
          <p className="muted-text">Schedule controls on/off heating only.</p>
          <WaterHeaterScheduleTable
            modeName={selectedMode.name}
            schedule={selectedMode.schedule}
            onScheduleChange={onScheduleChange}
            onAddSlot={onAddSlot}
            onRemoveSlot={onRemoveSlot}
            onSaveSchedule={onSaveSchedule}
            onDeleteMode={() => onDeleteMode(selectedMode.name)}
            canDeleteMode={config.modes.length > 1}
          />
        </>
      ) : null}
    </div>
  );
}
