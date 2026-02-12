import { Button, Card, Dropdown, List, Space, Tag, Typography } from "antd";
import { DownOutlined, EditOutlined } from "@ant-design/icons";
import type { GlobalSettings, WaterHeaterConfig } from "../../../shared/models";
import { findScheduleBlockAtMinute, isMinuteInBlock } from "../../../shared/schedule";
import { evaluateWaterHeaterAtMinute } from "../../../shared/waterHeater";

type WaterHeaterCardProps = {
  config: WaterHeaterConfig;
  settings: GlobalSettings;
  nowMinute: number;
  onEdit: () => void;
  onSetActiveMode: (modeName: string) => void;
};

export default function WaterHeaterCard({
  config,
  settings,
  nowMinute,
  onEdit,
  onSetActiveMode
}: WaterHeaterCardProps) {
  const activeMode = config.modes.find((mode) => mode.name === config.activeModeName);
  const activeBlock = activeMode ? findScheduleBlockAtMinute(activeMode.schedule, nowMinute) : null;
  const evaluated = evaluateWaterHeaterAtMinute(config, nowMinute, settings);
  const targetLabel = evaluated.isOff ? "Off" : `${evaluated.temperatureC}C`;

  return (
    <Card
      title={
        <Space size="small">
          <Typography.Text strong>Water heater</Typography.Text>
          <Button type="text" icon={<EditOutlined />} aria-label="Edit water heater" onClick={onEdit} />
        </Space>
      }
      extra={
        <Space>
          <Tag color={evaluated.isOff ? "default" : "volcano"}>{targetLabel}</Tag>
          {config.modes.length > 1 ? (
            <Dropdown
              trigger={["click"]}
              menu={{
                items: config.modes.map((mode) => ({ key: mode.name, label: mode.name })),
                onClick: ({ key }) => onSetActiveMode(String(key))
              }}
            >
              <Tag color="green" style={{ cursor: "pointer" }}>
                <Space size={4}>
                  {config.activeModeName}
                  <DownOutlined />
                </Space>
              </Tag>
            </Dropdown>
          ) : (
            <Tag color="green">{config.activeModeName}</Tag>
          )}
        </Space>
      }
    >
      <Typography.Text type="secondary">Entity: {config.entityId || "not configured"}</Typography.Text>
      <List
        size="small"
        dataSource={activeMode?.schedule ?? []}
        renderItem={(block) => {
          const isActive = isMinuteInBlock(block, nowMinute);
          const label = block.enabled ? "Heat on" : "Off";
          return (
            <List.Item
              style={{
                background: isActive ? "#fff7e6" : "transparent",
                borderRadius: 6,
                padding: "4px 8px"
              }}
            >
              <Typography.Text>
                {block.start}-{block.end} · {label}
              </Typography.Text>
            </List.Item>
          );
        }}
      />
      {settings.holidayModeEnabled ? (
        <Typography.Text type="warning">Holiday mode active: water heater is off.</Typography.Text>
      ) : null}
      <Typography.Text type="secondary">
        Heating temperature: {config.heatingTemperatureC}C
      </Typography.Text>
      {activeBlock && !activeBlock.enabled ? (
        <Typography.Text type="secondary">Current block is off.</Typography.Text>
      ) : null}
    </Card>
  );
}
