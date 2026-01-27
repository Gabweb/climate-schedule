import { useEffect, useMemo, useState } from "react";
import { Divider, Drawer, Layout, Typography, message } from "antd";
import type { RoomConfig, RoomsFile, ScheduleBlock } from "../../shared/models";
import { minuteOfDayInTimeZone, minutesToTime, parseTimeToMinutes } from "../../shared/schedule";
import RoomList from "./components/RoomList";
import SettingsPanel, { ModeDraft, RoomEditDraft } from "./components/SettingsPanel";
import AddRoomForm, { RoomDraft } from "./components/AddRoomForm";
import {
  createMode,
  createRoom,
  deleteMode,
  deleteRoom,
  fetchRooms,
  setActiveMode,
  updateRoom,
  updateSchedule
} from "./api/rooms";
type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: RoomsFile }
  | { status: "error"; message: string };

export default function App() {
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [roomDraft, setRoomDraft] = useState<RoomDraft>({
    name: "",
    floor: "EG",
    entityId: ""
  });
  const [modeDraft, setModeDraft] = useState<ModeDraft>({ name: "" });
  const [roomEditDraft, setRoomEditDraft] = useState<RoomEditDraft>({
    name: "",
    floor: "EG",
    entityId: ""
  });
  const [nowMinute, setNowMinute] = useState(() =>
    minuteOfDayInTimeZone(new Date(), "Europe/Berlin")
  );

  const loadRooms = () => {
    setState({ status: "loading" });
    fetchRooms()
      .then((data) => {
        setState({ status: "loaded", data });
        if (!selectedRoomId && data.rooms.length > 0) {
          setSelectedRoomId(data.rooms[0].name);
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to load rooms";
        setState({ status: "error", message });
      });
  };

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    const update = () => setNowMinute(minuteOfDayInTimeZone(new Date(), "Europe/Berlin"));
    update();
    const handle = window.setInterval(update, 60_000);
    return () => window.clearInterval(handle);
  }, []);

  const rooms = state.status === "loaded" ? state.data.rooms : [];
  const selectedRoom = useMemo(
    () => rooms.find((room) => room.name === selectedRoomId) ?? null,
    [rooms, selectedRoomId]
  );

  useEffect(() => {
    if (!selectedRoom) return;
    const entityId = selectedRoom.entities[0]?.entityId ?? "";
    setRoomEditDraft({
      name: selectedRoom.name,
      floor: selectedRoom.floor,
      entityId
    });
  }, [selectedRoom?.name]);

  const handleCreateRoom = async () => {
    try {
      const payload = {
        name: roomDraft.name.trim(),
        floor: roomDraft.floor,
        entities: roomDraft.entityId.trim()
          ? [{ type: "ha_climate", entityId: roomDraft.entityId.trim() }]
          : []
      };
      await createRoom(payload);
      setRoomDraft({ name: "", floor: "EG", entityId: "" });
      loadRooms();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to create room";
      message.error(messageText);
    }
  };

  const handleDeleteRoom = async (roomName: string) => {
    try {
      await deleteRoom(roomName);
      loadRooms();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to delete room";
      message.error(messageText);
    }
  };

  const handleSaveRoom = async (roomName: string) => {
    if (!selectedRoom) return;
    try {
      const nextName = roomEditDraft.name.trim();
      const nextRoom: RoomConfig = {
        ...selectedRoom,
        name: nextName,
        floor: roomEditDraft.floor,
        entities: roomEditDraft.entityId.trim()
          ? [{ type: "ha_climate", entityId: roomEditDraft.entityId.trim() }]
          : []
      };
      await updateRoom(roomName, nextRoom);
      setSelectedRoomId(nextName);
      loadRooms();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to save room";
      message.error(messageText);
    }
  };

  const handleSetActiveMode = async (roomName: string, activeModeName: string) => {
    try {
      await setActiveMode(roomName, activeModeName);
      loadRooms();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to set active mode";
      message.error(messageText);
    }
  };

  const handleCreateMode = async (roomName: string) => {
    try {
      await createMode(roomName, { name: modeDraft.name.trim() });
      setModeDraft({ name: "" });
      loadRooms();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to create mode";
      message.error(messageText);
    }
  };

  const handleDeleteMode = async (roomName: string, modeName: string) => {
    try {
      await deleteMode(roomName, modeName);
      loadRooms();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to delete mode";
      message.error(messageText);
    }
  };

  const handleScheduleChange = (index: number, key: keyof ScheduleBlock, value: string | number) => {
    if (!selectedRoom) return;
    const activeMode = selectedRoom.modes.find((mode) => mode.name === selectedRoom.activeModeName);
    if (!activeMode) return;
    const nextSchedule = activeMode.schedule.map((block) => ({ ...block }));
    const isLast = index === nextSchedule.length - 1;
    if (key === "start" && typeof value === "string" && index > 0) {
      const nextStart = value;
      nextSchedule[index].start = nextStart;
      nextSchedule[index - 1].end = nextStart;
    } else if (key === "end" && typeof value === "string") {
      nextSchedule[index].end = value;
      if (!isLast) {
        nextSchedule[index + 1].start = value;
      }
    } else if (key === "targetC" && typeof value === "number") {
      nextSchedule[index].targetC = value;
    }
    const nextRoom: RoomConfig = {
      ...selectedRoom,
      modes: selectedRoom.modes.map((mode) =>
        mode.name === activeMode.name ? { ...mode, schedule: nextSchedule } : mode
      )
    };
    const nextRooms = rooms.map((room) => (room.name === nextRoom.name ? nextRoom : room));
    const updatedAt = state.status === "loaded" ? state.data.updatedAt : "";
    setState({ status: "loaded", data: { rooms: nextRooms, updatedAt } });
  };

  const handleAddSlot = () => {
    if (!selectedRoom) return;
    const activeMode = selectedRoom.modes.find((mode) => mode.name === selectedRoom.activeModeName);
    if (!activeMode) return;
    if (activeMode.schedule.length >= 10) return;
    const nextSchedule = activeMode.schedule.map((block) => ({ ...block }));
    const lastIndex = nextSchedule.length - 1;
    const last = nextSchedule[lastIndex];
    const lastStartMinutes = parseTimeToMinutes(last.start);
    const newStartMinutes = lastStartMinutes + 10;
    if (newStartMinutes >= 1440) return;
    const newStart = minutesToTime(newStartMinutes);
    const newBlock: ScheduleBlock = {
      start: newStart,
      end: last.end,
      targetC: last.targetC
    };
    nextSchedule[lastIndex] = { ...last, end: newStart };
    nextSchedule.push(newBlock);
    const nextRoom: RoomConfig = {
      ...selectedRoom,
      modes: selectedRoom.modes.map((mode) =>
        mode.name === activeMode.name ? { ...mode, schedule: nextSchedule } : mode
      )
    };
    const nextRooms = rooms.map((room) => (room.name === nextRoom.name ? nextRoom : room));
    const updatedAt = state.status === "loaded" ? state.data.updatedAt : "";
    setState({ status: "loaded", data: { rooms: nextRooms, updatedAt } });
  };

  const handleRemoveSlot = (index: number) => {
    if (!selectedRoom) return;
    const activeMode = selectedRoom.modes.find((mode) => mode.name === selectedRoom.activeModeName);
    if (!activeMode) return;
    if (activeMode.schedule.length <= 1) return;
    const nextSchedule = activeMode.schedule.map((block) => ({ ...block }));
    const removed = nextSchedule[index];
    nextSchedule.splice(index, 1);
    if (nextSchedule.length === 0) return;
    if (index === 0) {
      nextSchedule[0].start = removed.start;
    } else {
      nextSchedule[index - 1].end = removed.end;
    }
    const nextRoom: RoomConfig = {
      ...selectedRoom,
      modes: selectedRoom.modes.map((mode) =>
        mode.name === activeMode.name ? { ...mode, schedule: nextSchedule } : mode
      )
    };
    const nextRooms = rooms.map((room) => (room.name === nextRoom.name ? nextRoom : room));
    const updatedAt = state.status === "loaded" ? state.data.updatedAt : "";
    setState({ status: "loaded", data: { rooms: nextRooms, updatedAt } });
  };
  const handleSaveSchedule = async () => {
    if (!selectedRoom) return;
    try {
      const activeMode = selectedRoom.modes.find(
        (mode) => mode.name === selectedRoom.activeModeName
      );
      if (!activeMode) return;
      await updateSchedule(selectedRoom.name, activeMode.name, activeMode.schedule);
      loadRooms();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to save schedule";
      message.error(messageText);
    }
  };

  const handleEditRoom = (roomName: string) => {
    setSelectedRoomId(roomName);
    setShowSettings(true);
  };

  const handleEditSchedule = (roomName: string) => {
    setSelectedRoomId(roomName);
    setShowSettings(true);
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px"
        }}
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Climate Schedule
          </Typography.Title>
        </div>
      </Layout.Header>

      <Layout.Content style={{ padding: "24px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        {state.status === "loading" && <Typography.Text>Loading rooms…</Typography.Text>}
        {state.status === "error" && <Typography.Text>Failed: {state.message}</Typography.Text>}

        {state.status === "loaded" && (
          <>
            <RoomList
              rooms={rooms}
              onEditRoom={handleEditRoom}
              onEditSchedule={handleEditSchedule}
              nowMinute={nowMinute}
            />
            <Divider />
            <AddRoomForm draft={roomDraft} onChange={setRoomDraft} onSubmit={handleCreateRoom} />
          </>
        )}
      </Layout.Content>

      <Drawer
        title="Edit room"
        placement="right"
        width={520}
        onClose={() => setShowSettings(false)}
        open={showSettings}
      >
        {state.status === "loaded" && (
            <SettingsPanel
            room={selectedRoom}
            modeDraft={modeDraft}
            roomEditDraft={roomEditDraft}
            onModeDraftChange={setModeDraft}
            onRoomEditDraftChange={setRoomEditDraft}
            onSaveRoom={handleSaveRoom}
            onSetActiveMode={handleSetActiveMode}
            onCreateMode={handleCreateMode}
            onDeleteMode={handleDeleteMode}
            onScheduleChange={handleScheduleChange}
            onAddSlot={handleAddSlot}
            onRemoveSlot={handleRemoveSlot}
            onSaveSchedule={handleSaveSchedule}
          />
        )}
      </Drawer>
    </Layout>
  );
}
