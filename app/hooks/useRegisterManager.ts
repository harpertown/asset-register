import { useState, useCallback } from "react";
import type { Register, Room, Asset } from "~/types";
import { apiService, ApiError } from "~/services/api";
import { useToast } from "~/components/ToastProvider";

export interface UseRegisterManagerReturn {
  // State
  registers: Register[];
  isLoading: boolean;
  editingIndex: number | null;
  
  // Actions
  loadRegisters: () => Promise<void>;
  setEditingIndex: (index: number | null) => void;
  createRegister: (address: string) => Promise<void>;
  deleteRegister: (index: number) => Promise<void>;
  updateRegister: (index: number, updates: Partial<Register>) => Promise<void>;
  updateSitePlan: (sitePlan: string | null) => Promise<void>;
  removeSitePlan: () => Promise<void>;
  
  // Room/Asset Group actions
  addRoom: (room: Room) => Promise<void>;
  addAssetGroup: (name: string, color: string) => Promise<Room>;
  getOrCreateUncategorizedGroup: () => Promise<Room>;
  deleteRoom: (roomId: string) => Promise<void>;
  
  // Asset actions
  addAsset: (roomId: string, asset: Asset) => Promise<void>;
  updateAsset: (roomId: string, assetId: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (roomId: string, assetId: string) => Promise<void>;
  
  // Helpers
  currentRegister: Register | null;
  setRegisters: React.Dispatch<React.SetStateAction<Register[]>>;
}

export function useRegisterManager(): UseRegisterManagerReturn {
  const [registers, setRegisters] = useState<Register[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { showError } = useToast();

  const currentRegister = editingIndex !== null ? registers[editingIndex] : null;

  const getErrorMessage = (err: unknown, fallback: string): string => {
    if (err instanceof ApiError) return err.message;
    return fallback;
  };

  const loadRegisters = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getRegisters();
      setRegisters(data);
    } catch (err) {
      console.error("Failed to load registers:", err);
      showError(getErrorMessage(err, "Failed to load registers"));
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  const createRegister = useCallback(async (address: string) => {
    try {
      const result = await apiService.createRegister({ address: address.trim() });
      setRegisters(prev => [...prev, {
        id: result.id,
        address: address.trim(),
        sitePlan: null,
        rooms: []
      }]);
    } catch (err) {
      console.error("Failed to create register:", err);
      showError(getErrorMessage(err, "Failed to create register"));
      throw err;
    }
  }, [showError]);

  const deleteRegister = useCallback(async (index: number) => {
    const register = registers[index];
    if (!register?.id) return;

    // Optimistically remove from state
    setRegisters(prev => prev.filter((_, i) => i !== index));
    
    // Clear editing index if we're deleting the currently edited register
    if (editingIndex === index) {
      setEditingIndex(null);
    } else if (editingIndex !== null && editingIndex > index) {
      // Adjust editing index if we deleted a register before it
      setEditingIndex(editingIndex - 1);
    }

    try {
      await apiService.deleteRegister(register.id);
    } catch (err) {
      console.error("Failed to delete register:", err);
      showError(getErrorMessage(err, "Failed to delete register"));
      // Reload registers to restore state on error
      await loadRegisters();
      throw err;
    }
  }, [registers, editingIndex, showError, loadRegisters]);

  const updateRegister = useCallback(async (index: number, updates: Partial<Register>) => {
    const register = registers[index];
    if (!register?.id) return;

    const updatedRegisters = [...registers];
    updatedRegisters[index] = { ...register, ...updates };
    setRegisters(updatedRegisters);

    try {
      await apiService.updateRegister({
        id: register.id,
        address: updates.address ?? register.address,
        sitePlan: updates.sitePlan ?? register.sitePlan,
        ownsLand: updates.ownsLand ?? register.ownsLand,
        ownsBuildings: updates.ownsBuildings ?? register.ownsBuildings,
        wizardCompleted: updates.wizardCompleted ?? register.wizardCompleted,
      });
    } catch (err) {
      console.error("Failed to update register:", err);
      showError(getErrorMessage(err, "Failed to update register"));
      throw err;
    }
  }, [registers, showError]);

  const updateSitePlan = useCallback(async (sitePlan: string | null) => {
    if (editingIndex === null) return;
    await updateRegister(editingIndex, { sitePlan });
  }, [editingIndex, updateRegister]);

  const removeSitePlan = useCallback(async () => {
    if (editingIndex === null) return;
    
    const updatedRegisters = [...registers];
    updatedRegisters[editingIndex].sitePlan = null;
    updatedRegisters[editingIndex].rooms = [];
    setRegisters(updatedRegisters);

    const register = updatedRegisters[editingIndex];
    if (register.id) {
      try {
        await apiService.updateRegister({
          id: register.id,
          address: register.address,
          sitePlan: null,
          ownsLand: register.ownsLand,
          ownsBuildings: register.ownsBuildings,
          wizardCompleted: register.wizardCompleted,
        });
      } catch (err) {
        console.error("Failed to update register:", err);
        showError(getErrorMessage(err, "Failed to remove site plan"));
      }
    }
  }, [editingIndex, registers, showError]);

  const addRoom = useCallback(async (room: Room) => {
    if (editingIndex === null) return;

    const updatedRegisters = [...registers];
    updatedRegisters[editingIndex].rooms.push(room);
    setRegisters(updatedRegisters);

    const register = updatedRegisters[editingIndex];
    if (register.id) {
      try {
        await apiService.createAssetGroup({
          registerId: register.id,
          id: room.id,
          name: room.name,
          tool: room.tool,
          color: room.color,
          isWholeSite: room.isWholeSite,
        });
      } catch (err) {
        console.error("Failed to create asset group:", err);
        showError(getErrorMessage(err, "Failed to create asset group"));
      }
    }
  }, [editingIndex, registers, showError]);

  const addAssetGroup = useCallback(async (name: string, color: string): Promise<Room> => {
    if (editingIndex === null) throw new Error("No register selected");

    const newRoom: Room = {
      id: crypto.randomUUID(),
      name,
      tool: "rectangle",
      color,
      assets: [],
      isWholeSite: false,
    };

    const updatedRegisters = [...registers];
    updatedRegisters[editingIndex].rooms.push(newRoom);
    setRegisters(updatedRegisters);

    const register = updatedRegisters[editingIndex];
    if (register.id) {
      try {
        await apiService.createAssetGroup({
          registerId: register.id,
          id: newRoom.id,
          name: newRoom.name,
          tool: newRoom.tool,
          color: newRoom.color,
          isWholeSite: false,
        });
      } catch (err) {
        console.error("Failed to create asset group:", err);
        showError(getErrorMessage(err, "Failed to create asset group"));
        throw err;
      }
    }

    return newRoom;
  }, [editingIndex, registers, showError]);

  const getOrCreateUncategorizedGroup = useCallback(async (): Promise<Room> => {
    if (editingIndex === null) throw new Error("No register selected");

    const register = registers[editingIndex];
    const existingUncategorized = register.rooms.find(r => r.name === "Uncategorized");
    
    if (existingUncategorized) {
      return existingUncategorized;
    }

    // Create the Uncategorized group
    const newRoom: Room = {
      id: crypto.randomUUID(),
      name: "Uncategorized",
      tool: "rectangle",
      color: "#6b7280", // gray-500
      assets: [],
      isWholeSite: false,
    };

    const updatedRegisters = [...registers];
    updatedRegisters[editingIndex].rooms.push(newRoom);
    setRegisters(updatedRegisters);

    if (register.id) {
      try {
        await apiService.createAssetGroup({
          registerId: register.id,
          id: newRoom.id,
          name: newRoom.name,
          tool: newRoom.tool,
          color: newRoom.color,
          isWholeSite: false,
        });
      } catch (err) {
        console.error("Failed to create uncategorized group:", err);
        showError(getErrorMessage(err, "Failed to create asset group"));
        throw err;
      }
    }

    return newRoom;
  }, [editingIndex, registers, showError]);

  const deleteRoom = useCallback(async (roomId: string) => {
    if (editingIndex === null) return;

    const updatedRegisters = [...registers];
    updatedRegisters[editingIndex].rooms = updatedRegisters[editingIndex].rooms.filter(
      (r) => r.id !== roomId
    );
    setRegisters(updatedRegisters);

    try {
      await apiService.deleteAssetGroup(roomId);
    } catch (err) {
      console.error("Failed to delete asset group:", err);
      showError(getErrorMessage(err, "Failed to delete asset group"));
    }
  }, [editingIndex, registers, showError]);

  const addAsset = useCallback(async (roomId: string, asset: Asset) => {
    if (editingIndex === null) return;

    const updatedRegisters = [...registers];
    const roomIndex = updatedRegisters[editingIndex].rooms.findIndex(r => r.id === roomId);
    if (roomIndex === -1) return;

    updatedRegisters[editingIndex].rooms[roomIndex].assets.push(asset);
    setRegisters(updatedRegisters);

    try {
      await apiService.createAsset({
        assetGroupId: roomId,
        id: asset.id,
        assetId: asset.assetId,
        itemType: asset.itemType,
        name: asset.name,
        serialNumber: asset.serialNumber,
        purchasePrice: asset.purchasePrice,
        purchaseDate: asset.purchaseDate,
        photo: asset.photo,
        incomplete: asset.incomplete,
        depnMethodAcc: asset.depnMethodAcc,
        depnRateAcc: asset.depnRateAcc,
        depnMethodTax: asset.depnMethodTax,
        depnRateTax: asset.depnRateTax,
      });
    } catch (err) {
      console.error("Failed to create asset:", err);
      showError(getErrorMessage(err, "Failed to create asset"));
    }
  }, [editingIndex, registers, showError]);

  const updateAsset = useCallback(async (roomId: string, assetId: string, updates: Partial<Asset>) => {
    if (editingIndex === null) return;

    const updatedRegisters = [...registers];
    const roomIndex = updatedRegisters[editingIndex].rooms.findIndex(r => r.id === roomId);
    if (roomIndex === -1) return;

    const assetIndex = updatedRegisters[editingIndex].rooms[roomIndex].assets.findIndex(
      a => a.id === assetId
    );
    if (assetIndex === -1) return;

    const existingAsset = updatedRegisters[editingIndex].rooms[roomIndex].assets[assetIndex];
    const updatedAsset = { ...existingAsset, ...updates };
    updatedRegisters[editingIndex].rooms[roomIndex].assets[assetIndex] = updatedAsset;
    setRegisters(updatedRegisters);

    try {
      await apiService.updateAsset({
        id: assetId,
        assetId: updatedAsset.assetId,
        itemType: updatedAsset.itemType,
        name: updatedAsset.name,
        serialNumber: updatedAsset.serialNumber,
        purchasePrice: updatedAsset.purchasePrice,
        purchaseDate: updatedAsset.purchaseDate,
        photo: updatedAsset.photo,
        incomplete: updatedAsset.incomplete,
        depnMethodAcc: updatedAsset.depnMethodAcc,
        depnRateAcc: updatedAsset.depnRateAcc,
        depnMethodTax: updatedAsset.depnMethodTax,
        depnRateTax: updatedAsset.depnRateTax,
      });
    } catch (err) {
      console.error("Failed to update asset:", err);
      showError(getErrorMessage(err, "Failed to update asset"));
    }
  }, [editingIndex, registers, showError]);

  const deleteAsset = useCallback(async (roomId: string, assetId: string) => {
    if (editingIndex === null) return;

    const updatedRegisters = [...registers];
    const roomIndex = updatedRegisters[editingIndex].rooms.findIndex(r => r.id === roomId);
    if (roomIndex === -1) return;

    updatedRegisters[editingIndex].rooms[roomIndex].assets = updatedRegisters[editingIndex].rooms[
      roomIndex
    ].assets.filter(a => a.id !== assetId);
    setRegisters(updatedRegisters);

    try {
      await apiService.deleteAsset(assetId);
    } catch (err) {
      console.error("Failed to delete asset:", err);
      showError(getErrorMessage(err, "Failed to delete asset"));
    }
  }, [editingIndex, registers, showError]);

  return {
    registers,
    isLoading,
    editingIndex,
    loadRegisters,
    setEditingIndex,
    createRegister,
    deleteRegister,
    updateRegister,
    updateSitePlan,
    removeSitePlan,
    addRoom,
    addAssetGroup,
    getOrCreateUncategorizedGroup,
    deleteRoom,
    addAsset,
    updateAsset,
    deleteAsset,
    currentRegister,
    setRegisters,
  };
}
