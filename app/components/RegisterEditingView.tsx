import { useRef } from "react";
import { useNavigate } from "react-router";
import type { Register, Room, Asset, Tool, Point } from "~/types";
import type { UseAssetWizard } from "~/hooks/useAssetWizard";
import type { UseOwnershipWizard } from "~/hooks/useOwnershipWizard";
import type { UseImportWizard } from "~/hooks/useImportWizard";
import type { UseDrawingCanvas } from "~/hooks/useDrawingCanvas";
import DrawingToolbar from "./DrawingToolbar";
import OwnershipWizardModal from "./OwnershipWizardModal";
import RoomNamingModal from "./RoomNamingModal";
import ImportWizardModal from "./ImportWizardModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import AssetWizardModal from "./AssetWizardModal";
import RoomListSection from "./RoomListSection";
import IncompleteItemsSection from "./IncompleteItemsSection";

interface RegisterEditingViewProps {
  register: Register;
  // Drawing state
  wizardActive: boolean;
  setWizardActive: (active: boolean) => void;
  selectedTool: Tool;
  setSelectedTool: (tool: Tool) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  colors: string[];
  previewShape: Room | null;
  // Room state
  namingRoom: Room | null;
  setNamingRoom: (room: Room | null) => void;
  roomName: string;
  setRoomName: (name: string) => void;
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string | null) => void;
  confirmDeleteRoomId: string | null;
  setConfirmDeleteRoomId: (id: string | null) => void;
  // Hooks
  assetWizard: UseAssetWizard;
  ownershipWizard: UseOwnershipWizard;
  importWizard: UseImportWizard;
  drawingCanvas: UseDrawingCanvas;
  // Handlers
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveSitePlan: () => void;
  onExportCSV: () => void;
  onCSVImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveRoom: (e: React.FormEvent) => void;
  onDeleteRoom: (roomId: string) => void;
  onAddAsset: (e: React.FormEvent) => void;
  onDeleteAsset: (roomId: string, assetId: string) => void;
  onAssetPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // Ownership handlers
  onOwnershipQuestionsNext: () => void;
  onOwnershipWizardContinue: () => void;
  onOwnershipWizardSkip: () => void;
  onOwnershipValuesSkip: () => void;
  startAssetRegisterWizard: () => void;
  startAddRoom: () => void;
  // Import handlers
  onImportNext: () => void;
  onImportSkip: () => void;
  onImportEdit: (asset: any) => void;
  closeImportWizard: () => void;
  // Asset wizard handlers
  openAssetWizard: (roomId: string) => void;
  closeAssetWizard: () => void;
  onAssetWizardYes: () => void;
  onAssetWizardNo: () => void;
  onItemTypeChange: (value: string) => void;
  onSelectItemType: (type: string) => void;
  // Incomplete section
  incompleteSectionExpanded: boolean;
  setIncompleteSectionExpanded: (expanded: boolean) => void;
  // Render function
  renderShape: (room: Room, isPreview?: boolean) => React.ReactNode;
  // Refs
  canvasRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  importFileInputRef: React.RefObject<HTMLInputElement | null>;
  // Back handler
  onBack: () => void;
}

export default function RegisterEditingView({
  register,
  wizardActive,
  setWizardActive,
  selectedTool,
  setSelectedTool,
  selectedColor,
  setSelectedColor,
  colors,
  previewShape,
  namingRoom,
  setNamingRoom,
  roomName,
  setRoomName,
  selectedRoomId,
  setSelectedRoomId,
  confirmDeleteRoomId,
  setConfirmDeleteRoomId,
  assetWizard,
  ownershipWizard,
  importWizard,
  drawingCanvas,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onFileUpload,
  onRemoveSitePlan,
  onExportCSV,
  onCSVImport,
  onSaveRoom,
  onDeleteRoom,
  onAddAsset,
  onDeleteAsset,
  onAssetPhotoUpload,
  onOwnershipQuestionsNext,
  onOwnershipWizardContinue,
  onOwnershipWizardSkip,
  onOwnershipValuesSkip,
  startAssetRegisterWizard,
  startAddRoom,
  onImportNext,
  onImportSkip,
  onImportEdit,
  closeImportWizard,
  openAssetWizard,
  closeAssetWizard,
  onAssetWizardYes,
  onAssetWizardNo,
  onItemTypeChange,
  onSelectItemType,
  incompleteSectionExpanded,
  setIncompleteSectionExpanded,
  renderShape,
  canvasRef,
  fileInputRef,
  importFileInputRef,
  onBack,
}: RegisterEditingViewProps) {
  const navigate = useNavigate();
  const wizardRoom = assetWizard.state.roomId
    ? register.rooms.find((r) => r.id === assetWizard.state.roomId)
    : null;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-8 px-4">
      <h1 className="text-2xl font-semibold text-gray-900">Edit Register</h1>
      <p className="text-gray-600 mb-6">{register.address}</p>
      {register.wizardCompleted && register.rooms.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => navigate(`/transactions/${register.id}`)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            View All Assets
          </button>
        </div>
      )}

      {register.sitePlan ? (
        <div className="flex flex-col items-center gap-4 w-full max-w-5xl">
          {/* Toolbar */}
          <DrawingToolbar
            wizardActive={wizardActive}
            selectedTool={selectedTool}
            setSelectedTool={setSelectedTool}
            selectedColor={selectedColor}
            setSelectedColor={setSelectedColor}
            colors={colors}
            onStartWizard={startAssetRegisterWizard}
            onAddRoom={startAddRoom}
            onDoneDrawing={() => {
              setWizardActive(false);
              setSelectedRoomId(null);
            }}
            onExportCSV={onExportCSV}
            onImportCSV={() => importFileInputRef.current?.click()}
            onRemoveSitePlan={onRemoveSitePlan}
            importFileInputRef={importFileInputRef}
            onImportFileChange={onCSVImport}
            registerCompleted={register.wizardCompleted ?? false}
          />

          {wizardActive && (
            <p className="text-sm text-blue-600">
              Draw on the site plan to mark rooms. Use {selectedTool === "rectangle" ? "click and drag to draw rectangles" : selectedTool === "circle" ? "click and drag to draw circles" : "click and drag to draw freeform shapes"}.
            </p>
          )}

          {/* Site plan with drawing canvas */}
          <div
            ref={canvasRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            className={`relative border border-gray-300 rounded-lg overflow-hidden select-none ${
              wizardActive ? "cursor-crosshair" : ""
            }`}
          >
            <img
              src={register.sitePlan}
              alt="Site Plan"
              className="max-w-full max-h-[60vh] object-contain"
              draggable={false}
            />
            {/* Render existing rooms */}
            {register.rooms.map((room) => renderShape(room))}
            {/* Render preview shape */}
            {previewShape && renderShape(previewShape, true)}
          </div>

          {/* Ownership Wizard Modal */}
          {ownershipWizard.state.isOpen && (
            <OwnershipWizardModal
              ownershipWizardStep={ownershipWizard.state.step}
              ownsLand={ownershipWizard.state.ownsLand}
              setOwnsLand={ownershipWizard.actions.setOwnsLand}
              ownsBuildings={ownershipWizard.state.ownsBuildings}
              setOwnsBuildings={ownershipWizard.actions.setOwnsBuildings}
              landValue={ownershipWizard.state.landValue}
              setLandValue={ownershipWizard.actions.setLandValue}
              landPurchaseDate={ownershipWizard.state.landPurchaseDate}
              setLandPurchaseDate={ownershipWizard.actions.setLandPurchaseDate}
              buildingsValue={ownershipWizard.state.buildingsValue}
              setBuildingsValue={ownershipWizard.actions.setBuildingsValue}
              buildingsPurchaseDate={ownershipWizard.state.buildingsPurchaseDate}
              setBuildingsPurchaseDate={ownershipWizard.actions.setBuildingsPurchaseDate}
              onClose={ownershipWizard.actions.closeWizard}
              onQuestionsNext={onOwnershipQuestionsNext}
              onValuesSkip={onOwnershipValuesSkip}
              onContinue={onOwnershipWizardContinue}
              onBack={() => ownershipWizard.actions.setStep("questions")}
              onSkip={onOwnershipWizardSkip}
              ownsLandDisabled={false}
              ownsBuildingsDisabled={false}
            />
          )}

          {/* Room naming modal */}
          <RoomNamingModal
            namingRoom={namingRoom}
            roomName={roomName}
            onRoomNameChange={setRoomName}
            onSave={onSaveRoom}
            onCancel={() => {
              setNamingRoom(null);
              setRoomName("");
            }}
          />

          {/* Import Wizard Modal */}
          <ImportWizardModal
            showImportWizard={importWizard.state.isOpen}
            importedAssets={importWizard.state.importedAssets}
            currentImportIndex={importWizard.state.currentIndex}
            onClose={closeImportWizard}
            onSave={onImportEdit}
            onNext={onImportNext}
            onSkip={onImportSkip}
            isLast={importWizard.isLastAsset}
            onEdit={onImportEdit}
          />

          {/* Confirm Delete Room Modal */}
          <ConfirmDeleteModal
            confirmDeleteRoomId={confirmDeleteRoomId}
            roomName={register.rooms.find(r => r.id === confirmDeleteRoomId)?.name ?? ""}
            onConfirm={() => {
              onDeleteRoom(confirmDeleteRoomId!);
              setConfirmDeleteRoomId(null);
            }}
            onCancel={() => setConfirmDeleteRoomId(null)}
          />

          {/* Asset Wizard Modal */}
          <AssetWizardModal
            isOpen={assetWizard.isOpen}
            wizardRoom={wizardRoom ?? null}
            step={assetWizard.state.step}
            isEditing={assetWizard.isEditing}
            state={{
              itemType: assetWizard.state.itemType,
              name: assetWizard.state.name,
              assetId: assetWizard.state.assetId,
              serialNumber: assetWizard.state.serialNumber,
              purchasePrice: assetWizard.state.purchasePrice,
              purchaseDate: assetWizard.state.purchaseDate,
              photo: assetWizard.state.photo,
              itemTypeSuggestions: assetWizard.state.itemTypeSuggestions,
              showItemTypeSuggestions: assetWizard.state.showItemTypeSuggestions,
            }}
            refs={assetWizard.refs}
            onClose={closeAssetWizard}
            onYes={onAssetWizardYes}
            onNo={onAssetWizardNo}
            onItemTypeChange={onItemTypeChange}
            onItemTypeSelect={onSelectItemType}
            onItemTypeFocus={() => {
              if (assetWizard.state.itemType.length >= 1 && assetWizard.state.itemTypeSuggestions.length > 0) {
                assetWizard.actions.setField("showItemTypeSuggestions", true);
              }
            }}
            onFieldChange={(field, value) => assetWizard.actions.setField(field as any, value)}
            onPhotoUpload={onAssetPhotoUpload}
            onAddAsset={onAddAsset}
            onEditAsset={(asset) => {
              assetWizard.actions.populateForEdit({
                id: asset.id,
                itemType: asset.itemType || "",
                name: asset.name,
                assetId: asset.assetId,
                serialNumber: asset.serialNumber || "",
                purchasePrice: asset.purchasePrice,
                purchaseDate: asset.purchaseDate || "",
                photo: asset.photo,
              });
            }}
          />

          {/* Selected room actions */}
          {selectedRoomId && !wizardActive && (
            <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
              <span className="text-gray-700">
                Selected: {register.rooms.find((r) => r.id === selectedRoomId)?.name}
              </span>
              {!register.rooms.find((r) => r.id === selectedRoomId)?.isWholeSite && (
                <button
                  onClick={() => onDeleteRoom(selectedRoomId)}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                >
                  Delete Room
                </button>
              )}
              <button
                onClick={() => setSelectedRoomId(null)}
                className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
              >
                Deselect
              </button>
            </div>
          )}

          {/* Room list */}
          <RoomListSection
            rooms={register.rooms}
            selectedRoomId={selectedRoomId}
            wizardActive={wizardActive}
            assetWizardOpen={assetWizard.isOpen}
            onRoomClick={setSelectedRoomId}
            onAddAssets={openAssetWizard}
            onRemoveRoom={setConfirmDeleteRoomId}
            onEditAsset={(roomId, asset) => {
              assetWizard.actions.openWizard(roomId);
              assetWizard.actions.populateForEdit({
                id: asset.id,
                itemType: asset.itemType || "",
                name: asset.name,
                assetId: asset.assetId,
                serialNumber: asset.serialNumber || "",
                purchasePrice: asset.purchasePrice,
                purchaseDate: asset.purchaseDate || "",
                photo: asset.photo,
              });
            }}
            onDeleteAsset={onDeleteAsset}
          />

          {/* Incomplete Items Section */}
          <IncompleteItemsSection
            register={register}
            incompleteSectionExpanded={incompleteSectionExpanded}
            setIncompleteSectionExpanded={setIncompleteSectionExpanded}
            openAssetWizard={openAssetWizard}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-80 h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
          >
            <svg
              className="w-12 h-12 text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-500">Click to upload site plan</p>
            <p className="text-gray-400 text-sm">PNG, JPG up to 10MB</p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileUpload}
        className="hidden"
      />

      <button
        onClick={onBack}
        className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
      >
        Back
      </button>
    </div>
  );
}
