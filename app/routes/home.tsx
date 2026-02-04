import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import { calculateDepreciation } from "~/services/depreciationService";
import type { DepreciationResult } from "~/services/depreciationService";
import type { Room, Point, Tool } from "~/types";
import { MOCK_ADDRESSES, COLORS } from "~/constants";
import {
  useAssetWizard,
  useOwnershipWizard,
  useImportWizard,
  useDrawingCanvas,
  useRegisterManager,
  useCSVOperations,
  useOwnershipHandler,
} from "~/hooks";
import RegisterEditingView from "~/components/RegisterEditingView";
import RegisterListView from "~/components/RegisterListView";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Asset Register" },
    { name: "description", content: "Asset Register" },
  ];
}

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Core register management
  const registerManager = useRegisterManager();
  const { registers, isLoading, editingIndex, setEditingIndex, currentRegister, setRegisters } = registerManager;
  
  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [address, setAddress] = useState("");
  const [wizardActive, setWizardActive] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool>("rectangle");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [previewShape, setPreviewShape] = useState<Room | null>(null);
  const [namingRoom, setNamingRoom] = useState<Room | null>(null);
  const [roomName, setRoomName] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [confirmDeleteRoomId, setConfirmDeleteRoomId] = useState<string | null>(null);
  const [incompleteSectionExpanded, setIncompleteSectionExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Depreciation state
  const [showDepreciationModal, setShowDepreciationModal] = useState(false);
  const [depreciationResults, setDepreciationResults] = useState<DepreciationResult[]>([]);
  const [financialYear] = useState(new Date().getFullYear().toString());

  // Hooks
  const importWizard = useImportWizard();
  const ownershipWizard = useOwnershipWizard();
  const assetWizard = useAssetWizard();
  const drawingCanvas = useDrawingCanvas();
  
  // CSV operations
  const csvOperations = useCSVOperations({
    registers,
    editingIndex,
    setRegisters,
    importWizard,
  });
  
  // Ownership handler
  const ownershipHandler = useOwnershipHandler({
    registers,
    editingIndex,
    setRegisters,
    ownershipWizard,
    setWizardActive,
  });

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Load registers on mount
  useEffect(() => {
    registerManager.loadRegisters();
  }, [registerManager.loadRegisters]);

  // Handle navigation to open a specific register
  useEffect(() => {
    if (registers.length > 0) {
      const registerId = searchParams.get('register');
      if (registerId) {
        const index = registers.findIndex((r) => r.id === registerId);
        if (index >= 0) {
          setEditingIndex(index);
        }
        setSearchParams(new URLSearchParams());
      }
    }
  }, [registers, searchParams, setSearchParams, setEditingIndex]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
      if (
        assetWizard.refs.itemTypeSuggestionsRef.current &&
        !assetWizard.refs.itemTypeSuggestionsRef.current.contains(event.target as Node) &&
        assetWizard.refs.itemTypeInputRef.current &&
        !assetWizard.refs.itemTypeInputRef.current.contains(event.target as Node)
      ) {
        assetWizard.actions.hideItemTypeSuggestions();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [assetWizard.actions, assetWizard.refs.itemTypeInputRef, assetWizard.refs.itemTypeSuggestionsRef]);

  // Drawing helpers
  const getRelativePosition = (e: React.MouseEvent): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!wizardActive || namingRoom) return;
    const pos = getRelativePosition(e);
    drawingCanvas.actions.startDrawing(pos);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { isDrawing, startPoint, currentPath } = drawingCanvas.state;
    if (!isDrawing || !startPoint || !wizardActive) return;
    const pos = getRelativePosition(e);

    drawingCanvas.actions.continueDrawing(pos);

    if (selectedTool === "rectangle") {
      setPreviewShape({
        id: "preview",
        name: "",
        tool: "rectangle",
        color: selectedColor,
        assets: [],
        rect: {
          x: Math.min(startPoint.x, pos.x),
          y: Math.min(startPoint.y, pos.y),
          width: Math.abs(pos.x - startPoint.x),
          height: Math.abs(pos.y - startPoint.y),
        },
      });
    } else if (selectedTool === "circle") {
      const radius = Math.sqrt(
        Math.pow(pos.x - startPoint.x, 2) + Math.pow(pos.y - startPoint.y, 2)
      );
      setPreviewShape({
        id: "preview",
        name: "",
        tool: "circle",
        color: selectedColor,
        assets: [],
        circle: { cx: startPoint.x, cy: startPoint.y, radius },
      });
    } else if (selectedTool === "pen") {
      setPreviewShape({
        id: "preview",
        name: "",
        tool: "pen",
        color: selectedColor,
        assets: [],
        path: [...currentPath, pos],
      });
    }
  };

  const handleMouseUp = () => {
    const { isDrawing } = drawingCanvas.state;
    if (!isDrawing || !previewShape) {
      drawingCanvas.actions.stopDrawing();
      return;
    }

    // Check if shape is big enough
    let isValidShape = false;
    if (previewShape.tool === "rectangle" && previewShape.rect) {
      isValidShape = previewShape.rect.width > 2 && previewShape.rect.height > 2;
    } else if (previewShape.tool === "circle" && previewShape.circle) {
      isValidShape = previewShape.circle.radius > 2;
    } else if (previewShape.tool === "pen" && previewShape.path) {
      isValidShape = previewShape.path.length > 5;
    }

    if (isValidShape) {
      setNamingRoom({ ...previewShape, id: Date.now().toString() });
    }

    drawingCanvas.actions.stopDrawing();
    setPreviewShape(null);
  };

  // Address handling
  const handleAddressChange = (value: string) => {
    setAddress(value);
    if (value.length >= 2) {
      const filtered = MOCK_ADDRESSES.filter((addr) =>
        addr.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setAddress(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleCreateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      await registerManager.createRegister(address);
      setAddress("");
      setIsCreating(false);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setWizardActive(false);
    setSelectedRoomId(null);
    assetWizard.actions.closeWizard();
  };

  // File upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingIndex !== null) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const sitePlan = reader.result as string;
        await registerManager.updateSitePlan(sitePlan);
      };
      reader.readAsDataURL(file);
    }
  };

  // Room handling
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (namingRoom && roomName.trim() && editingIndex !== null) {
      const newRoom = { ...namingRoom, name: roomName.trim() };
      
      // Add room with shape coordinates
      const updatedRegisters = [...registers];
      updatedRegisters[editingIndex].rooms.push(newRoom);
      setRegisters(updatedRegisters);
      
      // Sync to API with full coordinates
      const register = updatedRegisters[editingIndex];
      if (register.id) {
        try {
          const { apiService } = await import("~/services/api");
          let start: Point | undefined;
          let end: Point | undefined;
          let path: Point[] | undefined;

          if (newRoom.tool === "rectangle" && newRoom.rect) {
            start = { x: newRoom.rect.x, y: newRoom.rect.y };
            end = { x: newRoom.rect.x + newRoom.rect.width, y: newRoom.rect.y + newRoom.rect.height };
          } else if (newRoom.tool === "circle" && newRoom.circle) {
            start = { x: newRoom.circle.cx, y: newRoom.circle.cy };
            end = { x: newRoom.circle.cx + newRoom.circle.radius, y: newRoom.circle.cy };
          } else if (newRoom.tool === "pen" && newRoom.path) {
            path = newRoom.path;
          }

          await apiService.createAssetGroup({
            registerId: register.id,
            id: newRoom.id,
            name: newRoom.name,
            tool: newRoom.tool,
            color: newRoom.color,
            start,
            end,
            path,
            isWholeSite: newRoom.isWholeSite,
          });
        } catch (err) {
          console.error("Failed to create asset group:", err);
        }
      }

      setNamingRoom(null);
      setRoomName("");
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    await registerManager.deleteRoom(roomId);
    setSelectedRoomId(null);
  };

  // Asset handling
  const openAssetWizard = (roomId: string) => {
    assetWizard.actions.openWizard(roomId);
    assetWizard.actions.setStep("addItem");
  };

  const closeAssetWizard = () => {
    assetWizard.actions.closeWizard();
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const { roomId, name, assetId: formAssetId, itemType, serialNumber, purchasePrice, purchaseDate, photo, editingAssetId } = assetWizard.state;
    if (roomId && name.trim() && editingIndex !== null) {
      const price = parseFloat(purchasePrice) || 0;
      const isIncomplete = !purchasePrice || price === 0 || !purchaseDate;

      if (editingAssetId) {
        await registerManager.updateAsset(roomId, editingAssetId, {
          assetId: formAssetId.trim() || undefined,
          itemType: itemType.trim() || "",
          name: name.trim(),
          serialNumber: serialNumber.trim() || "",
          purchasePrice: price,
          purchaseDate: purchaseDate || "",
          photo: photo || undefined,
          incomplete: isIncomplete,
        });
      } else {
        const newAssetId = `asset-${Date.now()}`;
        await registerManager.addAsset(roomId, {
          id: newAssetId,
          assetId: formAssetId.trim() || undefined,
          itemType: itemType.trim() || "",
          name: name.trim(),
          serialNumber: serialNumber.trim() || "",
          purchasePrice: price,
          purchaseDate: purchaseDate || "",
          photo: photo || undefined,
          incomplete: isIncomplete,
        });
      }

      // Reset form
      assetWizard.actions.setField("itemType", "");
      assetWizard.actions.setField("itemTypeSuggestions", []);
      assetWizard.actions.setField("showItemTypeSuggestions", false);
      assetWizard.actions.setField("name", "");
      assetWizard.actions.setField("assetId", "");
      assetWizard.actions.setField("serialNumber", "");
      assetWizard.actions.setField("purchasePrice", "");
      assetWizard.actions.setField("purchaseDate", "");
      assetWizard.actions.setField("photo", null);
      assetWizard.actions.setField("editingAssetId", null);
    }
  };

  const handleAssetPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        assetWizard.actions.setField("photo", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAsset = async (roomId: string, assetId: string) => {
    await registerManager.deleteAsset(roomId, assetId);
  };

  // Render shape helper
  const renderShape = (room: Room, isPreview = false) => {
    if (room.isWholeSite) return null;

    const opacity = isPreview ? 0.3 : 0.4;
    const isSelected = room.id === selectedRoomId;
    const strokeWidth = isSelected ? 3 : 2;

    if (room.tool === "rectangle" && room.rect) {
      return (
        <div
          key={room.id}
          onClick={(e) => {
            e.stopPropagation();
            if (!wizardActive) setSelectedRoomId(room.id);
          }}
          className={`absolute border-2 ${!isPreview && !wizardActive ? "cursor-pointer" : ""}`}
          style={{
            left: `${room.rect.x}%`,
            top: `${room.rect.y}%`,
            width: `${room.rect.width}%`,
            height: `${room.rect.height}%`,
            backgroundColor: room.color,
            opacity,
            borderColor: room.color,
            borderWidth: strokeWidth,
          }}
        >
          {!isPreview && room.name && (
            <span
              className="absolute top-1 left-1 text-xs font-semibold px-1 rounded"
              style={{ backgroundColor: room.color, color: "white" }}
            >
              {room.name}
            </span>
          )}
        </div>
      );
    }

    if (room.tool === "circle" && room.circle) {
      return (
        <div
          key={room.id}
          onClick={(e) => {
            e.stopPropagation();
            if (!wizardActive) setSelectedRoomId(room.id);
          }}
          className={`absolute rounded-full border-2 ${!isPreview && !wizardActive ? "cursor-pointer" : ""}`}
          style={{
            left: `${room.circle.cx - room.circle.radius}%`,
            top: `${room.circle.cy - room.circle.radius}%`,
            width: `${room.circle.radius * 2}%`,
            height: `${room.circle.radius * 2}%`,
            backgroundColor: room.color,
            opacity,
            borderColor: room.color,
            borderWidth: strokeWidth,
          }}
        >
          {!isPreview && room.name && (
            <span
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-semibold px-1 rounded whitespace-nowrap"
              style={{ backgroundColor: room.color, color: "white" }}
            >
              {room.name}
            </span>
          )}
        </div>
      );
    }

    if (room.tool === "pen" && room.path && room.path.length > 1) {
      const points = room.path.map((p) => `${p.x}%,${p.y}%`).join(" ");
      return (
        <svg
          key={room.id}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ overflow: "visible" }}
        >
          <polygon
            points={points}
            fill={room.color}
            fillOpacity={opacity}
            stroke={room.color}
            strokeWidth={strokeWidth}
            onClick={(e) => {
              e.stopPropagation();
              if (!wizardActive) setSelectedRoomId(room.id);
            }}
            style={{ pointerEvents: isPreview || wizardActive ? "none" : "auto", cursor: "pointer" }}
          />
          {!isPreview && room.name && room.path[0] && (
            <text
              x={`${room.path[0].x}%`}
              y={`${room.path[0].y}%`}
              fill="white"
              fontSize="12"
              fontWeight="bold"
            >
              <tspan>{room.name}</tspan>
            </text>
          )}
        </svg>
      );
    }

    return null;
  };

  // Editing view
  if (editingIndex !== null && currentRegister) {
    return (
      <RegisterEditingView
        register={currentRegister}
        wizardActive={wizardActive}
        setWizardActive={setWizardActive}
        selectedTool={selectedTool}
        setSelectedTool={setSelectedTool}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        colors={COLORS}
        previewShape={previewShape}
        namingRoom={namingRoom}
        setNamingRoom={setNamingRoom}
        roomName={roomName}
        setRoomName={setRoomName}
        selectedRoomId={selectedRoomId}
        setSelectedRoomId={setSelectedRoomId}
        confirmDeleteRoomId={confirmDeleteRoomId}
        setConfirmDeleteRoomId={setConfirmDeleteRoomId}
        assetWizard={assetWizard}
        ownershipWizard={ownershipWizard}
        importWizard={importWizard}
        drawingCanvas={drawingCanvas}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onFileUpload={handleFileUpload}
        onRemoveSitePlan={registerManager.removeSitePlan}
        onExportCSV={csvOperations.handleExportCSV}
        onCSVImport={(e) => csvOperations.handleCSVImport(e, importFileInputRef)}
        onSaveRoom={handleSaveRoom}
        onDeleteRoom={handleDeleteRoom}
        onAddAsset={handleAddAsset}
        onDeleteAsset={handleDeleteAsset}
        onAssetPhotoUpload={handleAssetPhotoUpload}
        onOwnershipQuestionsNext={ownershipHandler.handleOwnershipQuestionsNext}
        onOwnershipWizardContinue={ownershipHandler.handleOwnershipWizardContinue}
        onOwnershipWizardSkip={ownershipHandler.handleOwnershipWizardSkip}
        onOwnershipValuesSkip={ownershipHandler.handleOwnershipValuesSkip}
        startAssetRegisterWizard={ownershipHandler.startAssetRegisterWizard}
        startAddRoom={() => setWizardActive(true)}
        onImportNext={csvOperations.handleImportNext}
        onImportSkip={csvOperations.handleImportSkip}
        onImportEdit={csvOperations.handleImportEdit}
        closeImportWizard={csvOperations.closeImportWizard}
        openAssetWizard={openAssetWizard}
        closeAssetWizard={closeAssetWizard}
        onAssetWizardYes={() => assetWizard.actions.setStep("addItem")}
        onAssetWizardNo={closeAssetWizard}
        onItemTypeChange={(value) => assetWizard.actions.setItemType(value)}
        onSelectItemType={(type) => assetWizard.actions.selectItemTypeSuggestion(type)}
        incompleteSectionExpanded={incompleteSectionExpanded}
        setIncompleteSectionExpanded={setIncompleteSectionExpanded}
        renderShape={renderShape}
        canvasRef={canvasRef}
        fileInputRef={fileInputRef}
        importFileInputRef={importFileInputRef}
        onBack={() => {
          setEditingIndex(null);
          setWizardActive(false);
          setSelectedRoomId(null);
          closeAssetWizard();
        }}
      />
    );
  }

  // List view
  return (
    <RegisterListView
      registers={registers}
      isLoading={isLoading}
      isCreating={isCreating}
      setIsCreating={setIsCreating}
      address={address}
      suggestions={suggestions}
      showSuggestions={showSuggestions}
      setShowSuggestions={setShowSuggestions}
      onAddressChange={handleAddressChange}
      onSelectSuggestion={handleSelectSuggestion}
      onCreateRegister={handleCreateRegister}
      onEdit={handleEdit}
      onCancelCreate={() => {
        setIsCreating(false);
        setAddress("");
        setSuggestions([]);
        setShowSuggestions(false);
      }}
      showDepreciationModal={showDepreciationModal}
      depreciationResults={depreciationResults}
      financialYear={financialYear}
      onCloseDepreciationModal={() => setShowDepreciationModal(false)}
      inputRef={inputRef}
      suggestionsRef={suggestionsRef}
    />
  );
}
