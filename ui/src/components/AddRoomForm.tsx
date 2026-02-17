import type { RoomConfig } from "../../../shared/models";

export type RoomDraft = {
  name: string;
  floor: RoomConfig["floor"];
  entityId: string;
};

type AddRoomFormProps = {
  draft: RoomDraft;
  onChange: (draft: RoomDraft) => void;
  onSubmit: () => void;
  showTitle?: boolean;
};

const floors: RoomConfig["floor"][] = ["UG", "EG", "1OG", "2OG"];

export default function AddRoomForm({
  draft,
  onChange,
  onSubmit,
  showTitle = true
}: AddRoomFormProps) {
  return (
    <div>
      {showTitle ? <h4>Add room</h4> : null}
      <div className="inline-field">
        <label htmlFor="add-room-name">Name</label>
        <input
          id="add-room-name"
          placeholder="Living"
          value={draft.name}
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
        />
      </div>

      <div className="inline-field">
        <label htmlFor="add-room-floor">Floor</label>
        <select
          id="add-room-floor"
          value={draft.floor}
          onChange={(event) => onChange({ ...draft, floor: event.target.value as RoomConfig["floor"] })}
        >
          {floors.map((floor) => (
            <option key={floor} value={floor}>
              {floor}
            </option>
          ))}
        </select>
      </div>

      <div className="inline-field">
        <label htmlFor="add-room-entity">Climate entity id</label>
        <input
          id="add-room-entity"
          placeholder="climate.living"
          value={draft.entityId}
          onChange={(event) => onChange({ ...draft, entityId: event.target.value })}
        />
      </div>

      <button type="button" onClick={onSubmit}>
        Create room
      </button>
    </div>
  );
}
