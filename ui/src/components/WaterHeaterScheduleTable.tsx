import type { WaterHeaterScheduleBlock } from "../../../shared/models";
import { isScheduleEndInvalid, isScheduleStartInvalid } from "../../../shared/scheduleEditor";
import { MinusCircle, Plus } from "lucide-react";

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

  return (
    <>
      <table className="table-compact">
        <thead>
          <tr>
            <th>Start</th>
            <th>End</th>
            <th>Heat</th>
            <th aria-label="Remove" />
          </tr>
        </thead>
        <tbody>
          {schedule.map((block, index) => {
            const startInvalid = isScheduleStartInvalid(schedule, index);
            const endInvalid = isScheduleEndInvalid(schedule, index);
            return (
              <tr key={`${block.start}-${index}`}>
                <td>
                  <input
                    type="time"
                    step={600}
                    value={block.start}
                    disabled={index === 0}
                    aria-invalid={startInvalid}
                    onChange={(event) =>
                      onScheduleChange(modeName, index, "start", event.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="time"
                    step={600}
                    value={block.end}
                    disabled={index === lastIndex}
                    aria-invalid={endInvalid}
                    onChange={(event) => onScheduleChange(modeName, index, "end", event.target.value)}
                  />
                </td>
                <td>
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(block.enabled)}
                      onChange={(event) =>
                        onScheduleChange(modeName, index, "enabled", event.target.checked)
                      }
                    />
                    Heat on
                  </label>
                </td>
                <td>
                  <button
                    type="button"
                    className="secondary icon-only-button"
                    onClick={() => onRemoveSlot(modeName, index)}
                    disabled={schedule.length <= 1}
                    aria-label="Remove time slot"
                  >
                    <MinusCircle size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="row-actions">
        <button
          type="button"
          className="outline with-icon"
          onClick={() => onAddSlot(modeName)}
          disabled={schedule.length >= 10}
        >
          <Plus size={16} aria-hidden="true" />
          Add slot
        </button>
        <button type="button" onClick={() => onSaveSchedule(modeName)}>
          Save schedule
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            if (window.confirm("Delete this mode?")) {
              onDeleteMode();
            }
          }}
          disabled={!canDeleteMode}
        >
          Delete mode
        </button>
      </div>
    </>
  );
}
