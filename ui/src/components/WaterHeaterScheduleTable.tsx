import { Button, Popconfirm, Switch, Table, TimePicker } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import type { WaterHeaterScheduleBlock } from "../../../shared/models";
import dayjs, { type Dayjs } from "dayjs";
import { isScheduleEndInvalid, isScheduleStartInvalid } from "../../../shared/scheduleEditor";

type WaterHeaterScheduleTableProps = {
  modeName: string;
  schedule: WaterHeaterScheduleBlock[];
  onScheduleChange: (
    modeName: string,
    index: number,
    key: keyof WaterHeaterScheduleBlock,
    value: string | boolean
  ) => void;
  onAddSlot: (modeName: string) => void;
  onRemoveSlot: (modeName: string, index: number) => void;
  onSaveSchedule: (modeName: string) => void;
  onDeleteMode: () => void;
  canDeleteMode: boolean;
};

type RowData = WaterHeaterScheduleBlock & { key: string; index: number };

const timeValue = (value: string): Dayjs | null => {
  const parsed = dayjs(value, "HH:mm");
  return parsed.isValid() ? parsed : null;
};

const minutesToDisable = (step: number) =>
  Array.from({ length: 60 }, (_, minute) => minute).filter((minute) => minute % step !== 0);

export default function WaterHeaterScheduleTable({
  modeName,
  schedule,
  onScheduleChange,
  onAddSlot,
  onRemoveSlot,
  onSaveSchedule,
  onDeleteMode,
  canDeleteMode
}: WaterHeaterScheduleTableProps) {
  const lastIndex = schedule.length - 1;
  const dataSource: RowData[] = schedule.map((block, index) => ({
    key: `${block.start}-${index}`,
    index,
    ...block
  }));

  return (
    <>
      <Table<RowData>
        pagination={false}
        dataSource={dataSource}
        columns={[
          {
            title: "Start",
            dataIndex: "start",
            render: (value, record) => (
              <TimePicker
                format="HH:mm"
                value={timeValue(value)}
                status={isScheduleStartInvalid(schedule, record.index) ? "error" : undefined}
                onChange={(_, valueString) => {
                  if (!valueString) return;
                  onScheduleChange(modeName, record.index, "start", valueString);
                }}
                allowClear={false}
                showNow={false}
                minuteStep={10}
                disabled={record.index === 0}
                disabledTime={() => ({
                  disabledMinutes: () => minutesToDisable(10)
                })}
                style={{ width: "100%" }}
              />
            )
          },
          {
            title: "End",
            dataIndex: "end",
            render: (value, record) => (
              <TimePicker
                format="HH:mm"
                value={timeValue(value)}
                status={isScheduleEndInvalid(schedule, record.index) ? "error" : undefined}
                onChange={(_, valueString) => {
                  if (!valueString) return;
                  onScheduleChange(modeName, record.index, "end", valueString);
                }}
                allowClear={false}
                showNow={false}
                minuteStep={10}
                disabledTime={() =>
                  record.index === lastIndex
                    ? {}
                    : {
                        disabledMinutes: () => minutesToDisable(10)
                      }
                }
                disabled={record.index === lastIndex}
                style={{ width: "100%" }}
              />
            )
          },
          {
            title: "Heat",
            dataIndex: "enabled",
            render: (value, record) => (
              <Switch
                checked={Boolean(value)}
                checkedChildren="On"
                unCheckedChildren="Off"
                onChange={(checked) => onScheduleChange(modeName, record.index, "enabled", checked)}
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
                onClick={() => onRemoveSlot(modeName, record.index)}
                disabled={schedule.length <= 1}
                aria-label="Remove time slot"
              />
            )
          }
        ]}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button
          icon={<PlusOutlined />}
          onClick={() => onAddSlot(modeName)}
          disabled={schedule.length >= 10}
        >
          Add slot
        </Button>
        <Button type="primary" onClick={() => onSaveSchedule(modeName)}>
          Save schedule
        </Button>
        <Popconfirm
          title="Delete this mode?"
          okText="Yes"
          cancelText="No"
          onConfirm={onDeleteMode}
          disabled={!canDeleteMode}
        >
          <Button danger disabled={!canDeleteMode}>
            Delete mode
          </Button>
        </Popconfirm>
      </div>
    </>
  );
}
