import { Alert, Button, Card, Drawer, Layout, Space, Spin, Switch, Typography } from "antd";
import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import RoomList from "./components/RoomList";
import SettingsPanel from "./components/SettingsPanel";
import AddRoomForm from "./components/AddRoomForm";
import WaterHeaterCard from "./components/WaterHeaterCard";
import WaterHeaterPanel from "./components/WaterHeaterPanel";
import { useClimateScheduleState } from "./hooks/useClimateScheduleState";

export default function App() {
  const state = useClimateScheduleState();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Content style={{ padding: "24px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        {state.state.status === "loading" && <Typography.Text>Loading rooms...</Typography.Text>}
        {state.state.status === "error" && (
          <Typography.Text>Failed: {state.state.message}</Typography.Text>
        )}

        {state.state.status === "loaded" && (
          <>
            {!state.startupSuccessful ? (
              <Alert
                type="warning"
                showIcon
                message="Something is wrong, please check the logs."
                style={{ marginBottom: 16 }}
              />
            ) : null}

            <Card size="small" style={{ marginBottom: 16 }}>
              <Space>
                <Typography.Text strong>Holiday mode</Typography.Text>
                <Switch checked={state.settings.holidayModeEnabled} onChange={state.handleHolidayToggle} />
              </Space>
            </Card>

            <RoomList
              rooms={state.rooms}
              onEditRoom={state.handleEditRoom}
              onSetActiveMode={state.handleSetActiveMode}
              nowMinute={state.nowMinute}
              settings={state.settings}
              leadingNode={
                <WaterHeaterCard
                  config={state.waterHeater}
                  settings={state.settings}
                  nowMinute={state.nowMinute}
                  onEdit={() => state.setShowWaterHeaterSettings(true)}
                  onSetActiveMode={state.handleSetWaterHeaterActiveMode}
                />
              }
              addRoomNode={
                !state.showAddRoom ? (
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => state.setShowAddRoom(true)}
                    style={{ width: "100%" }}
                  >
                    Add room
                  </Button>
                ) : (
                  <Card
                    title="Add room"
                    size="small"
                    style={{ width: "100%" }}
                    extra={
                      <Button
                        type="text"
                        icon={<CloseOutlined />}
                        aria-label="Collapse add room"
                        onClick={() => state.setShowAddRoom(false)}
                      />
                    }
                  >
                    <AddRoomForm
                      draft={state.roomDraft}
                      onChange={state.setRoomDraft}
                      onSubmit={state.handleCreateRoom}
                      showTitle={false}
                    />
                  </Card>
                )
              }
            />
          </>
        )}
      </Layout.Content>

      <Drawer
        title="Edit room"
        placement="right"
        width={520}
        onClose={() => state.setShowSettings(false)}
        open={state.showSettings}
      >
        {state.state.status === "loaded" && (
          <SettingsPanel
            room={state.selectedRoom}
            modeDraft={state.modeDraft}
            roomEditDraft={state.roomEditDraft}
            onModeDraftChange={state.setModeDraft}
            onRoomEditDraftChange={state.setRoomEditDraft}
            onSaveRoom={state.handleSaveRoom}
            onCreateMode={state.handleCreateMode}
            onDeleteMode={state.handleDeleteMode}
            onRenameMode={state.handleRenameMode}
            onScheduleChange={state.handleScheduleChange}
            onAddSlot={state.handleAddSlot}
            onRemoveSlot={state.handleRemoveSlot}
            onSaveSchedule={state.handleSaveSchedule}
          />
        )}
      </Drawer>

      <Drawer
        title="Edit water heater"
        placement="right"
        width={520}
        onClose={() => state.setShowWaterHeaterSettings(false)}
        open={state.showWaterHeaterSettings}
      >
        {state.state.status === "loaded" ? (
          <WaterHeaterPanel
            config={state.waterHeater}
            modeDraft={state.waterHeaterModeDraft}
            onModeDraftChange={state.setWaterHeaterModeDraft}
            onSaveConfig={state.handleSaveWaterHeaterConfig}
            onCreateMode={state.handleCreateWaterHeaterMode}
            onDeleteMode={state.handleDeleteWaterHeaterMode}
            onRenameMode={state.handleRenameWaterHeaterMode}
            onScheduleChange={state.handleWaterHeaterScheduleChange}
            onAddSlot={state.handleAddWaterHeaterSlot}
            onRemoveSlot={state.handleRemoveWaterHeaterSlot}
            onSaveSchedule={state.handleSaveWaterHeaterSchedule}
          />
        ) : null}
      </Drawer>

      {state.state.status === "loaded" && state.isSyncing ? (
        <div
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            background: "rgba(255, 255, 255, 0.95)",
            border: "1px solid #f0f0f0",
            borderRadius: 10,
            padding: "8px 12px",
            boxShadow: "0 4px 10px rgba(0, 0, 0, 0.08)"
          }}
        >
          <Space size="small">
            <Spin size="small" />
            <Typography.Text type="secondary">Syncing...</Typography.Text>
          </Space>
        </div>
      ) : null}
    </Layout>
  );
}
