import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Form, Input, InputNumber, Tabs, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
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
          <>
            <PlusOutlined /> Add mode
          </>
        )
      }
    ],
    [config.modes]
  );

  return (
    <div>
      <Typography.Title level={5}>Water heater</Typography.Title>
      <Form layout="vertical">
        <Form.Item label="Climate entity id">
          <Input value={entityIdDraft} onChange={(event) => setEntityIdDraft(event.target.value)} />
        </Form.Item>
        <Form.Item label="Heating temperature (C)">
          <InputNumber
            min={30}
            max={65}
            value={heatingTemperatureDraft}
            onChange={(value) => setHeatingTemperatureDraft(Number(value ?? 55))}
          />
        </Form.Item>
        <Button
          type="primary"
          onClick={() => onSaveConfig(entityIdDraft.trim(), heatingTemperatureDraft)}
        >
          Save config
        </Button>
      </Form>

      <Typography.Title level={4} style={{ marginTop: 20 }}>
        Modes & schedules
      </Typography.Title>
      <Tabs activeKey={activeTab} items={modeTabs} onChange={setActiveTab} />

      {activeTab === "__add__" ? (
        <Form layout="vertical">
          <Form.Item label="Mode name">
            <Input
              placeholder="holiday"
              value={modeDraft.name}
              onChange={(event) => onModeDraftChange({ name: event.target.value })}
            />
          </Form.Item>
          <Button type="primary" onClick={() => onCreateMode(modeDraft.name.trim())}>
            Add mode
          </Button>
        </Form>
      ) : null}

      {selectedMode && activeTab !== "__add__" ? (
        <>
          <Form layout="vertical">
            <Form.Item label="Mode name">
              <Input value={modeNameDraft} onChange={(event) => setModeNameDraft(event.target.value)} />
            </Form.Item>
          </Form>
          <Typography.Text type="secondary">Schedule controls on/off heating only.</Typography.Text>
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
