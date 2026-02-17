import { Suspense, lazy, useState } from "react";
import { Plus, X } from "lucide-react";
import RoomList from "./components/RoomList";
import AddRoomForm from "./components/AddRoomForm";
import WaterHeaterCard from "./components/WaterHeaterCard";
import { useClimateScheduleState } from "./hooks/useClimateScheduleState";

const SettingsPanel = lazy(() => import("./components/SettingsPanel"));
const WaterHeaterPanel = lazy(() => import("./components/WaterHeaterPanel"));

export default function App() {
  const state = useClimateScheduleState();
  const [editModeEnabled, setEditModeEnabled] = useState(false);

  return (
    <>
      <main>
        {state.state.status === "loading" && <p>Loading rooms...</p>}
        {state.state.status === "error" && <p className="error-text">Failed: {state.state.message}</p>}

        {state.notice ? (
          <article className="error-text">
            <header>
              <strong>Error</strong>
            </header>
            <p>{state.notice}</p>
            <button type="button" className="secondary" onClick={state.clearNotice}>
              Dismiss
            </button>
          </article>
        ) : null}

        {state.state.status === "loaded" && (
          <>
            {!state.startupSuccessful ? (
              <article className="warning-text">
                <strong>Something is wrong, please check the logs.</strong>
              </article>
            ) : null}

            <article>
              <div className="row-actions">
                <strong>Holiday mode</strong>
                <label>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={state.settings.holidayModeEnabled}
                    onChange={(event) => state.handleHolidayToggle(event.target.checked)}
                  />
                  Enabled
                </label>
              </div>
            </article>

            <RoomList
              rooms={state.rooms}
              onEditRoom={state.handleEditRoom}
              onSetActiveMode={state.handleSetActiveMode}
              nowMinute={state.nowMinute}
              settings={state.settings}
              canEdit={editModeEnabled}
              leadingNode={
                <WaterHeaterCard
                  config={state.waterHeater}
                  settings={state.settings}
                  nowMinute={state.nowMinute}
                  onEdit={() => state.setShowWaterHeaterSettings(true)}
                  onSetActiveMode={state.handleSetWaterHeaterActiveMode}
                  canEdit={editModeEnabled}
                />
              }
              addRoomNode={
                editModeEnabled ? (!state.showAddRoom ? (
                  <button type="button" className="outline with-icon" onClick={() => state.setShowAddRoom(true)}>
                    <Plus size={16} aria-hidden="true" />
                    Add room
                  </button>
                ) : (
                  <article>
                    <header className="card-header">
                      <strong>Add room</strong>
                      <button
                        type="button"
                        className="secondary icon-only-button"
                        aria-label="Collapse add room"
                        onClick={() => state.setShowAddRoom(false)}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </header>
                    <AddRoomForm
                      draft={state.roomDraft}
                      onChange={state.setRoomDraft}
                      onSubmit={state.handleCreateRoom}
                      showTitle={false}
                    />
                  </article>
                )) : undefined
              }
            />

            <label>
              <input
                type="checkbox"
                checked={editModeEnabled}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  setEditModeEnabled(enabled);
                  if (!enabled) {
                    state.setShowAddRoom(false);
                    state.setShowSettings(false);
                    state.setShowWaterHeaterSettings(false);
                  }
                }}
              />
              Enable edit mode
            </label>
          </>
        )}
      </main>

      {editModeEnabled && state.showSettings ? (
        <>
          <div className="panel-backdrop" onClick={() => state.setShowSettings(false)} />
          <aside className="panel-shell" aria-label="Edit room panel">
            <header className="card-header">
              <strong>Edit room</strong>
              <button
                type="button"
                className="secondary icon-only-button"
                aria-label="Close room editor"
                onClick={() => state.setShowSettings(false)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </header>
            {state.state.status === "loaded" ? (
              <Suspense fallback={<p className="muted-text">Loading editor...</p>}>
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
              </Suspense>
            ) : null}
          </aside>
        </>
      ) : null}

      {editModeEnabled && state.showWaterHeaterSettings ? (
        <>
          <div className="panel-backdrop" onClick={() => state.setShowWaterHeaterSettings(false)} />
          <aside className="panel-shell" aria-label="Edit water heater panel">
            <header className="card-header">
              <strong>Edit water heater</strong>
              <button
                type="button"
                className="secondary icon-only-button"
                aria-label="Close water heater editor"
                onClick={() => state.setShowWaterHeaterSettings(false)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </header>
            {state.state.status === "loaded" ? (
              <Suspense fallback={<p className="muted-text">Loading editor...</p>}>
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
              </Suspense>
            ) : null}
          </aside>
        </>
      ) : null}

      {state.state.status === "loaded" && state.isSyncing ? (
        <div className="sync-indicator" role="status" aria-live="polite">
          Syncing...
        </div>
      ) : null}
    </>
  );
}
