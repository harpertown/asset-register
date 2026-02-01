import type { Register, Room, Asset } from "~/types";

interface Point {
  x: number;
  y: number;
}

export const apiService = {
  async getRegisters(): Promise<Register[]> {
    const res = await fetch("/api/registers");
    if (!res.ok) throw new Error("Failed to fetch registers");
    return res.json();
  },

  async createRegister(data: Partial<Register>): Promise<{ id: string; success: boolean }> {
    const res = await fetch("/api/registers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_register", ...data }),
    });
    if (!res.ok) throw new Error("Failed to create register");
    return res.json();
  },

  async updateRegister(data: Partial<Register> & { id: string }): Promise<{ success: boolean }> {
    const res = await fetch("/api/registers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_register", ...data }),
    });
    if (!res.ok) throw new Error("Failed to update register");
    return res.json();
  },

  async deleteRegister(id: string): Promise<{ success: boolean }> {
    const res = await fetch("/api/registers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_register", id }),
    });
    if (!res.ok) throw new Error("Failed to delete register");
    return res.json();
  },

  async createAssetGroup(data: {
    registerId: string;
    id?: string;
    name: string;
    tool?: string;
    color?: string;
    start?: Point;
    end?: Point;
    path?: Point[];
    isWholeSite?: boolean;
  }): Promise<{ id: string; success: boolean }> {
    const res = await fetch("/api/registers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_asset_group", ...data }),
    });
    if (!res.ok) throw new Error("Failed to create asset group");
    return res.json();
  },

  async deleteAssetGroup(id: string): Promise<{ success: boolean }> {
    const res = await fetch("/api/registers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_asset_group", id }),
    });
    if (!res.ok) throw new Error("Failed to delete asset group");
    return res.json();
  },

  async createAsset(data: {
    assetGroupId: string;
    id?: string;
    assetId?: string;
    itemType?: string;
    name: string;
    serialNumber?: string;
    purchasePrice?: number;
    purchaseDate?: string;
    photo?: string;
    incomplete?: boolean;
    depnMethodAcc?: string;
    depnRateAcc?: string;
    depnMethodTax?: string;
    depnRateTax?: string;
  }): Promise<{ id: string; success: boolean }> {
    const res = await fetch("/api/registers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_asset", ...data }),
    });
    if (!res.ok) throw new Error("Failed to create asset");
    return res.json();
  },

  async deleteAsset(id: string): Promise<{ success: boolean }> {
    const res = await fetch("/api/registers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_asset", id }),
    });
    if (!res.ok) throw new Error("Failed to delete asset");
    return res.json();
  },

  async updateAsset(data: {
    id: string;
    assetId?: string;
    itemType?: string;
    name: string;
    serialNumber?: string;
    purchasePrice?: number;
    purchaseDate?: string;
    photo?: string;
    incomplete?: boolean;
    depnMethodAcc?: string;
    depnRateAcc?: string;
    depnMethodTax?: string;
    depnRateTax?: string;
  }): Promise<{ success: boolean }> {
    const res = await fetch("/api/registers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_asset", ...data }),
    });
    if (!res.ok) throw new Error("Failed to update asset");
    return res.json();
  },
};