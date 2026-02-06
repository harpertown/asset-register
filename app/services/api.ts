import type { Register, Room, Asset } from "~/types";

interface Point {
  x: number;
  y: number;
}

/**
 * Custom error class for API errors with response details
 */
export class ApiError extends Error {
  status: number;
  details?: string;

  constructor(message: string, status: number, details?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/**
 * Helper to handle API response errors with detailed messages
 */
async function handleResponse<T>(res: Response, operation: string): Promise<T> {
  if (!res.ok) {
    let details: string | undefined;
    try {
      const errorBody = await res.json();
      details = errorBody.error || errorBody.message || JSON.stringify(errorBody);
    } catch {
      details = await res.text().catch(() => undefined);
    }
    throw new ApiError(
      `${operation}: ${res.statusText || "Request failed"}`,
      res.status,
      details
    );
  }
  return res.json();
}

export const apiService = {
  async getRegisters(): Promise<Register[]> {
    const res = await fetch("/api/registers");
    return handleResponse<Register[]>(res, "Failed to fetch registers");
  },

  async createRegister(data: Partial<Register>): Promise<{ id: string; success: boolean }> {
    const res = await fetch("/api/registers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_register", ...data }),
    });
    return handleResponse(res, "Failed to create register");
  },

  async updateRegister(data: Partial<Register> & { id: string }): Promise<{ success: boolean }> {
    const res = await fetch("/api/registers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_register", ...data }),
    });
    return handleResponse(res, "Failed to update register");
  },

  async deleteRegister(id: string): Promise<{ success: boolean }> {
    const res = await fetch("/api/registers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_register", id }),
    });
    return handleResponse(res, "Failed to delete register");
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
    return handleResponse(res, "Failed to create asset group");
  },

  async deleteAssetGroup(id: string): Promise<{ success: boolean }> {
    const res = await fetch("/api/registers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_asset_group", id }),
    });
    return handleResponse(res, "Failed to delete asset group");
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
    return handleResponse(res, "Failed to create asset");
  },

  async deleteAsset(id: string): Promise<{ success: boolean }> {
    const res = await fetch("/api/registers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_asset", id }),
    });
    return handleResponse(res, "Failed to delete asset");
  },

  async updateAsset(data: {
    id: string;
    assetId?: string;
    itemType?: string;
    name?: string;
    serialNumber?: string;
    purchasePrice?: number;
    purchaseDate?: string;
    photo?: string;
    incomplete?: boolean;
    depnMethodAcc?: string;
    depnRateAcc?: string;
    depnMethodTax?: string;
    depnRateTax?: string;
    exemptionType?: string;
    exemptionNote?: string;
  }): Promise<{ success: boolean }> {
    const res = await fetch("/api/registers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_asset", ...data }),
    });
    return handleResponse(res, "Failed to update asset");
  },

  async createAssetVersion(originalAssetId: string, updates: {
    assetId?: string;
    itemType?: string;
    name?: string;
    serialNumber?: string;
    purchasePrice?: number;
    purchaseDate?: string;
    photo?: string;
    incomplete?: boolean;
    depnMethodAcc?: string;
    depnRateAcc?: string;
    depnMethodTax?: string;
    depnRateTax?: string;
    exemptionType?: string;
    effectiveFrom?: string;
    exemptionNote?: string;
  }): Promise<{ id: string; version: number; effectiveFrom: string; success: boolean }> {
    const res = await fetch("/api/registers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_asset_version", originalAssetId, ...updates }),
    });
    return handleResponse(res, "Failed to create asset version");
  },

  async getAssetVersions(assetId: string): Promise<{ versions: Asset[] }> {
    const res = await fetch("/api/registers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_asset_versions", assetId }),
    });
    return handleResponse(res, "Failed to get asset versions");
  },

  async deleteAssetVersion(assetId: string): Promise<{ success: boolean; deletedId: string }> {
    const res = await fetch("/api/registers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_asset_version", assetId }),
    });
    return handleResponse(res, "Failed to delete asset version");
  },
};
