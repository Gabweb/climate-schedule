import { useEffect, useMemo, useState } from "react";
import { message } from "antd";
import type {
  GlobalSettings,
  RoomConfig,
  RoomsFile,
  ScheduleBlock,
  WaterHeaterConfig,
  WaterHeaterScheduleBlock
} from "../../../shared/models";
import { minuteOfDayInTimeZone } from "../../../shared/schedule";
import {
  addScheduleSlot,
  removeScheduleSlot,
  updateScheduleBlock
} from "../../../shared/scheduleEditor";
import { roomKey } from "../../../shared/roomKey";
import {
  createMode,
  createRoom,
  deleteMode,
  fetchRooms,
  setActiveMode,
  updateRoom,
  updateSchedule
} from "../api/rooms";
import { fetchSettings, updateSettings } from "../api/settings";
import type { ModeDraft, RoomEditDraft } from "../components/SettingsPanel";
import type { RoomDraft } from "../components/AddRoomForm";
import {
  createWaterHeaterMode,
  deleteWaterHeaterMode,
  fetchWaterHeater,
  setWaterHeaterActiveMode,
  updateWaterHeater,
  updateWaterHeaterSchedule
} from "../api/waterHeater";
import { fetchRuntimeStatus } from "../api/status";
import {
  addWaterHeaterScheduleSlot,
  removeWaterHeaterScheduleSlot,
  updateWaterHeaterScheduleBlock
} from "../../../shared/waterHeaterScheduleEditor";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: RoomsFile }
  | { status: "error"; message: string };

const defaultSettings: GlobalSettings = { version: 1, holidayModeEnabled: false };
const defaultWaterHeater: WaterHeaterConfig = {
  version: 2,
  entityId: "",
  heatingTemperatureC: 55,
  activeModeName: "Default",
  modes: [{ name: "Default", schedule: [{ start: "00:00", end: "23:59", enabled: false }] }],
  updatedAt: new Date(0).toISOString()
};

export function useClimateScheduleState() {
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);
  const [selectedRoomKey, setSelectedRoomKey] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [roomDraft, setRoomDraft] = useState<RoomDraft>({
    name: "",
    floor: "EG",
    entityId: ""
  });
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [modeDraft, setModeDraft] = useState<ModeDraft>({ name: "" });
  const [roomEditDraft, setRoomEditDraft] = useState<RoomEditDraft>({
    name: "",
    floor: "EG",
    entityId: ""
  });
  const [nowMinute, setNowMinute] = useState(() =>
    minuteOfDayInTimeZone(new Date(), "Europe/Berlin")
  );
  const [syncingCount, setSyncingCount] = useState(0);
  const [waterHeater, setWaterHeater] = useState<WaterHeaterConfig>(defaultWaterHeater);
  const [startupSuccessful, setStartupSuccessful] = useState(true);
  const [showWaterHeaterSettings, setShowWaterHeaterSettings] = useState(false);
  const [waterHeaterModeDraft, setWaterHeaterModeDraft] = useState<{ name: string }>({
    name: ""
  });

  const beginSync = () => setSyncingCount((count) => count + 1);
  const endSync = () => setSyncingCount((count) => Math.max(0, count - 1));

  const applyLoadedData = (
    roomsData: RoomsFile,
    settingsData: GlobalSettings,
    waterHeaterData: WaterHeaterConfig,
    startupStatus: { startupSuccessful: boolean }
  ) => {
    setState({ status: "loaded", data: roomsData });
    setSettings(settingsData);
    setWaterHeater(waterHeaterData);
    setStartupSuccessful(startupStatus.startupSuccessful);
    setSelectedRoomKey((previous) => {
      if (previous && roomsData.rooms.some((room) => roomKey(room) === previous)) {
        return previous;
      }
      return roomsData.rooms.length > 0 ? roomKey(roomsData.rooms[0]) : null;
    });
  };

  const refreshData = async () => {
    const [roomsData, settingsData, waterHeaterData, startupStatus] = await Promise.all([
      fetchRooms(),
      fetchSettings(),
      fetchWaterHeater(),
      fetchRuntimeStatus()
    ]);
    applyLoadedData(roomsData, settingsData, waterHeaterData, startupStatus);
  };

  const runWithSync = async (operation: () => Promise<void>) => {
    beginSync();
    try {
      await operation();
    } finally {
      endSync();
    }
  };

  const loadInitialData = async () => {
    setState({ status: "loading" });
    try {
      await refreshData();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to load rooms";
      setState({ status: "error", message: messageText });
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const update = () => setNowMinute(minuteOfDayInTimeZone(new Date(), "Europe/Berlin"));
    update();
    const handle = window.setInterval(update, 60_000);
    return () => window.clearInterval(handle);
  }, []);

  const rooms = state.status === "loaded" ? state.data.rooms : [];
  const selectedRoom = useMemo(
    () => rooms.find((room) => roomKey(room) === selectedRoomKey) ?? null,
    [rooms, selectedRoomKey]
  );

  const updateLoadedRooms = (nextRooms: RoomConfig[]) => {
    setState((prev) => {
      if (prev.status !== "loaded") return prev;
      return {
        status: "loaded",
        data: {
          version: prev.data.version,
          updatedAt: prev.data.updatedAt,
          rooms: nextRooms
        }
      };
    });
  };

  useEffect(() => {
    if (!selectedRoom) return;
    const entityId = selectedRoom.entities[0]?.entityId ?? "";
    setRoomEditDraft({
      name: selectedRoom.name,
      floor: selectedRoom.floor,
      entityId
    });
  }, [selectedRoomKey]);

  const handleCreateRoom = async () => {
    try {
      const payload = {
        name: roomDraft.name.trim(),
        floor: roomDraft.floor,
        entities: roomDraft.entityId.trim()
          ? [{ type: "ha_climate" as const, entityId: roomDraft.entityId.trim() }]
          : []
      };
      await runWithSync(async () => {
        await createRoom(payload);
        setRoomDraft({ name: "", floor: "EG", entityId: "" });
        await refreshData();
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to create room";
      message.error(messageText);
    }
  };

  const handleSaveRoom = async (roomKeyValue: string) => {
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
      updateLoadedRooms(
        rooms.map((room) => (roomKey(room) === roomKeyValue ? nextRoom : room))
      );
      setSelectedRoomKey(roomKey(nextRoom));
      await runWithSync(async () => {
        await updateRoom(roomKeyValue, nextRoom);
        await refreshData();
      });
    } catch (error) {
      await runWithSync(async () => {
        await refreshData();
      });
      const messageText = error instanceof Error ? error.message : "Failed to save room";
      message.error(messageText);
    }
  };

  const handleSetActiveMode = async (roomKeyValue: string, activeModeName: string) => {
    try {
      updateLoadedRooms(
        rooms.map((room) =>
          roomKey(room) === roomKeyValue ? { ...room, activeModeName } : room
        )
      );
      await runWithSync(async () => {
        await setActiveMode(roomKeyValue, activeModeName);
        await refreshData();
      });
    } catch (error) {
      await runWithSync(async () => {
        await refreshData();
      });
      const messageText = error instanceof Error ? error.message : "Failed to set active mode";
      message.error(messageText);
    }
  };

  const handleCreateMode = async (roomKeyValue: string) => {
    try {
      await runWithSync(async () => {
        await createMode(roomKeyValue, { name: modeDraft.name.trim() });
        setModeDraft({ name: "" });
        await refreshData();
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to create mode";
      message.error(messageText);
    }
  };

  const handleDeleteMode = async (roomKeyValue: string, modeName: string) => {
    try {
      await runWithSync(async () => {
        await deleteMode(roomKeyValue, modeName);
        await refreshData();
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to delete mode";
      message.error(messageText);
    }
  };

  const handleRenameMode = async (roomKeyValue: string, modeName: string, nextName: string) => {
    if (!selectedRoom) return;
    const trimmed = nextName.trim();
    if (!trimmed) return;
    if (selectedRoom.modes.some((mode) => mode.name === trimmed)) {
      message.error("Mode name already exists.");
      return;
    }
    try {
      const nextRoom: RoomConfig = {
        ...selectedRoom,
        activeModeName:
          selectedRoom.activeModeName === modeName ? trimmed : selectedRoom.activeModeName,
        modes: selectedRoom.modes.map((mode) =>
          mode.name === modeName ? { ...mode, name: trimmed } : mode
        )
      };
      updateLoadedRooms(
        rooms.map((room) => (roomKey(room) === roomKeyValue ? nextRoom : room))
      );
      await runWithSync(async () => {
        await updateRoom(roomKeyValue, nextRoom);
        await refreshData();
      });
    } catch (error) {
      await runWithSync(async () => {
        await refreshData();
      });
      const messageText = error instanceof Error ? error.message : "Failed to rename mode";
      message.error(messageText);
    }
  };

  const handleScheduleChange = (
    modeName: string,
    index: number,
    key: keyof ScheduleBlock,
    value: string | number
  ) => {
    if (!selectedRoom) return;
    const targetMode = selectedRoom.modes.find((mode) => mode.name === modeName);
    if (!targetMode) return;
    const nextSchedule = updateScheduleBlock(targetMode.schedule, index, key, value);
    const nextRoom: RoomConfig = {
      ...selectedRoom,
      modes: selectedRoom.modes.map((mode) =>
        mode.name === targetMode.name ? { ...mode, schedule: nextSchedule } : mode
      )
    };
    const selectedKey = roomKey(selectedRoom);
    const nextRooms = rooms.map((room) => (roomKey(room) === selectedKey ? nextRoom : room));
    updateLoadedRooms(nextRooms);
  };

  const handleAddSlot = (modeName: string) => {
    if (!selectedRoom) return;
    const targetMode = selectedRoom.modes.find((mode) => mode.name === modeName);
    if (!targetMode) return;
    const nextSchedule = addScheduleSlot(targetMode.schedule, 10, 10);
    const nextRoom: RoomConfig = {
      ...selectedRoom,
      modes: selectedRoom.modes.map((mode) =>
        mode.name === targetMode.name ? { ...mode, schedule: nextSchedule } : mode
      )
    };
    const selectedKey = roomKey(selectedRoom);
    const nextRooms = rooms.map((room) => (roomKey(room) === selectedKey ? nextRoom : room));
    updateLoadedRooms(nextRooms);
  };

  const handleRemoveSlot = (modeName: string, index: number) => {
    if (!selectedRoom) return;
    const targetMode = selectedRoom.modes.find((mode) => mode.name === modeName);
    if (!targetMode) return;
    const nextSchedule = removeScheduleSlot(targetMode.schedule, index);
    const nextRoom: RoomConfig = {
      ...selectedRoom,
      modes: selectedRoom.modes.map((mode) =>
        mode.name === targetMode.name ? { ...mode, schedule: nextSchedule } : mode
      )
    };
    const selectedKey = roomKey(selectedRoom);
    const nextRooms = rooms.map((room) => (roomKey(room) === selectedKey ? nextRoom : room));
    updateLoadedRooms(nextRooms);
  };

  const handleSaveSchedule = async (modeName: string) => {
    if (!selectedRoom) return;
    try {
      const targetMode = selectedRoom.modes.find((mode) => mode.name === modeName);
      if (!targetMode) return;
      await runWithSync(async () => {
        await updateSchedule(roomKey(selectedRoom), targetMode.name, targetMode.schedule);
        await refreshData();
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to save schedule";
      message.error(messageText);
    }
  };

  const handleEditRoom = (roomKeyValue: string) => {
    setSelectedRoomKey(roomKeyValue);
    setShowSettings(true);
  };

  const handleHolidayToggle = async (checked: boolean) => {
    const previous = settings;
    const next: GlobalSettings = {
      ...settings,
      holidayModeEnabled: checked
    };
    setSettings(next);
    await runWithSync(async () => {
      try {
        const saved = await updateSettings(next);
        setSettings(saved);
      } catch (error) {
        setSettings(previous);
        const messageText = error instanceof Error ? error.message : "Failed to update settings";
        message.error(messageText);
      }
    });
  };

  const handleSetWaterHeaterActiveMode = async (modeName: string) => {
    const previous = waterHeater;
    setWaterHeater({ ...waterHeater, activeModeName: modeName });
    try {
      await runWithSync(async () => {
        await setWaterHeaterActiveMode(modeName);
        await refreshData();
      });
    } catch (error) {
      setWaterHeater(previous);
      const messageText =
        error instanceof Error ? error.message : "Failed to set water heater mode";
      message.error(messageText);
    }
  };

  const handleSaveWaterHeaterConfig = async (entityId: string, heatingTemperatureC: number) => {
    const previous = waterHeater;
    const next = { ...waterHeater, entityId, heatingTemperatureC };
    setWaterHeater(next);
    try {
      await runWithSync(async () => {
        await updateWaterHeater(next);
        await refreshData();
      });
    } catch (error) {
      setWaterHeater(previous);
      const messageText =
        error instanceof Error ? error.message : "Failed to save water heater config";
      message.error(messageText);
    }
  };

  const handleCreateWaterHeaterMode = async (name: string) => {
    if (!name) return;
    try {
      await runWithSync(async () => {
        await createWaterHeaterMode({ name });
        setWaterHeaterModeDraft({ name: "" });
        await refreshData();
      });
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "Failed to create water heater mode";
      message.error(messageText);
    }
  };

  const handleDeleteWaterHeaterMode = async (modeName: string) => {
    try {
      await runWithSync(async () => {
        await deleteWaterHeaterMode(modeName);
        await refreshData();
      });
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "Failed to delete water heater mode";
      message.error(messageText);
    }
  };

  const handleRenameWaterHeaterMode = async (modeName: string, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed || waterHeater.modes.some((mode) => mode.name === trimmed)) {
      return;
    }
    const next: WaterHeaterConfig = {
      ...waterHeater,
      activeModeName: waterHeater.activeModeName === modeName ? trimmed : waterHeater.activeModeName,
      modes: waterHeater.modes.map((mode) =>
        mode.name === modeName ? { ...mode, name: trimmed } : mode
      )
    };
    const previous = waterHeater;
    setWaterHeater(next);
    try {
      await runWithSync(async () => {
        await updateWaterHeater(next);
        await refreshData();
      });
    } catch (error) {
      setWaterHeater(previous);
      const messageText =
        error instanceof Error ? error.message : "Failed to rename water heater mode";
      message.error(messageText);
    }
  };

  const handleWaterHeaterScheduleChange = (
    modeName: string,
    index: number,
    key: keyof WaterHeaterScheduleBlock,
    value: string | boolean
  ) => {
    const targetMode = waterHeater.modes.find((mode) => mode.name === modeName);
    if (!targetMode) return;
    const nextSchedule = updateWaterHeaterScheduleBlock(targetMode.schedule, index, key, value);
    setWaterHeater({
      ...waterHeater,
      modes: waterHeater.modes.map((mode) =>
        mode.name === modeName ? { ...mode, schedule: nextSchedule } : mode
      )
    });
  };

  const handleAddWaterHeaterSlot = (modeName: string) => {
    const targetMode = waterHeater.modes.find((mode) => mode.name === modeName);
    if (!targetMode) return;
    const nextSchedule = addWaterHeaterScheduleSlot(targetMode.schedule, 10, 10);
    setWaterHeater({
      ...waterHeater,
      modes: waterHeater.modes.map((mode) =>
        mode.name === modeName ? { ...mode, schedule: nextSchedule } : mode
      )
    });
  };

  const handleRemoveWaterHeaterSlot = (modeName: string, index: number) => {
    const targetMode = waterHeater.modes.find((mode) => mode.name === modeName);
    if (!targetMode) return;
    const nextSchedule = removeWaterHeaterScheduleSlot(targetMode.schedule, index);
    setWaterHeater({
      ...waterHeater,
      modes: waterHeater.modes.map((mode) =>
        mode.name === modeName ? { ...mode, schedule: nextSchedule } : mode
      )
    });
  };

  const handleSaveWaterHeaterSchedule = async (modeName: string) => {
    const mode = waterHeater.modes.find((entry) => entry.name === modeName);
    if (!mode) return;
    try {
      await runWithSync(async () => {
        await updateWaterHeaterSchedule(modeName, mode.schedule);
        await refreshData();
      });
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "Failed to save water heater schedule";
      message.error(messageText);
    }
  };

  return {
    state,
    settings,
    rooms,
    selectedRoom,
    modeDraft,
    roomEditDraft,
    roomDraft,
    showAddRoom,
    showSettings,
    nowMinute,
    isSyncing: syncingCount > 0,
    waterHeater,
    startupSuccessful,
    showWaterHeaterSettings,
    waterHeaterModeDraft,
    setModeDraft,
    setRoomEditDraft,
    setRoomDraft,
    setShowAddRoom,
    setShowSettings,
    setShowWaterHeaterSettings,
    setWaterHeaterModeDraft,
    handleCreateRoom,
    handleSaveRoom,
    handleSetActiveMode,
    handleCreateMode,
    handleDeleteMode,
    handleRenameMode,
    handleScheduleChange,
    handleAddSlot,
    handleRemoveSlot,
    handleSaveSchedule,
    handleEditRoom,
    handleHolidayToggle,
    handleSetWaterHeaterActiveMode,
    handleSaveWaterHeaterConfig,
    handleCreateWaterHeaterMode,
    handleDeleteWaterHeaterMode,
    handleRenameWaterHeaterMode,
    handleWaterHeaterScheduleChange,
    handleAddWaterHeaterSlot,
    handleRemoveWaterHeaterSlot,
    handleSaveWaterHeaterSchedule
  };
}
