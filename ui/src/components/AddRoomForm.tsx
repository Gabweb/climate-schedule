import { Button, Form, Input, Select, Typography } from "antd";
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
      {showTitle ? <Typography.Title level={4}>Add room</Typography.Title> : null}
      <Form layout="vertical">
        <Form.Item label="Name">
          <Input
            placeholder="Living"
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
          />
        </Form.Item>
        <Form.Item label="Floor">
          <Select
            value={draft.floor}
            onChange={(value) => onChange({ ...draft, floor: value })}
            options={floors.map((floor) => ({ value: floor, label: floor }))}
          />
        </Form.Item>
        <Form.Item label="Climate entity id">
          <Input
            placeholder="climate.living"
            value={draft.entityId}
            onChange={(event) => onChange({ ...draft, entityId: event.target.value })}
          />
        </Form.Item>
        <Button type="primary" onClick={onSubmit}>
          Create room
        </Button>
      </Form>
    </div>
  );
}
