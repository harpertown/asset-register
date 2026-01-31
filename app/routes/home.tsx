import { useState, useRef, useEffect, useCallback } from "react";
import type { Route } from "./+types/home";

// API helper functions
const api = {
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
		itemType?: string;
		name: string;
		serialNumber?: string;
		purchasePrice?: number;
		purchaseDate?: string;
		photo?: string;
		incomplete?: boolean;
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
};

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Asset Register" },
		{ name: "description", content: "Asset Register" },
	];
}

// Mock NZ addresses for autocomplete
const mockAddresses = [
	"1 Queen Street, Auckland CBD, Auckland 1010",
	"10 Queen Street, Auckland CBD, Auckland 1010",
	"100 Queen Street, Auckland CBD, Auckland 1010",
	"15 Lambton Quay, Wellington Central, Wellington 6011",
	"150 Lambton Quay, Wellington Central, Wellington 6011",
	"200 Colombo Street, Christchurch Central, Christchurch 8011",
	"25 Cashel Street, Christchurch Central, Christchurch 8011",
	"50 Victoria Street, Hamilton Central, Hamilton 3204",
	"75 George Street, Dunedin Central, Dunedin 9016",
	"30 Devonport Road, Tauranga Central, Tauranga 3110",
	"42 Emerson Street, Napier South, Napier 4110",
	"18 Broadway Avenue, Palmerston North, 4410",
	"5 Cameron Road, Tauranga South, Tauranga 3112",
	"88 Riccarton Road, Riccarton, Christchurch 8041",
	"120 Ponsonby Road, Ponsonby, Auckland 1011",
];

const ASSET_CATEGORIES = [
	"Computers and laptops",
	"Computer hardware, including printers",
	"Computer software programs",
	"Photocopiers",
	"Office furniture",
	"Tools of the trade",
	"Plant or machinery used for production",
	"Art",
	"Motor vehicles",
];

// IRD Depreciation Guide (IR265) Asset Types
// Source: https://www.ird.govt.nz/-/media/project/ir/home/documents/forms-and-guides/ir200---ir299/ir265/ir265-august-2024.pdf
const IRD_ASSET_TYPES = [
	// Office Equipment
	"Computers - desktop",
	"Computers - laptop",
	"Computers - tablet",
	"Computer servers",
	"Computer monitors",
	"Computer printers",
	"Computer scanners",
	"Computer software",
	"Photocopiers",
	"Fax machines",
	"Telephone systems",
	"Mobile phones",
	// Office Furniture
	"Office chairs",
	"Office desks",
	"Filing cabinets",
	"Bookshelves",
	"Reception furniture",
	"Conference tables",
	"Workstations",
	// Buildings & Fit-out
	"Buildings - commercial",
	"Buildings - industrial",
	"Building fit-out - partitions",
	"Building fit-out - carpets",
	"Building fit-out - blinds",
	"Building fit-out - lighting",
	"Air conditioning units",
	"Heating systems",
	"Security systems",
	"Fire alarms",
	// Vehicles
	"Motor vehicles - cars",
	"Motor vehicles - vans",
	"Motor vehicles - trucks",
	"Motor vehicles - utes",
	"Motorcycles",
	"Trailers",
	"Forklifts",
	// Machinery & Equipment
	"Manufacturing machinery",
	"Production equipment",
	"Generators",
	"Compressors",
	"Pumps",
	"Electric motors",
	"Conveyor systems",
	"Packaging machinery",
	// Tools
	"Power tools - portable",
	"Power tools - fixed",
	"Hand tools",
	"Workshop equipment",
	"Testing equipment",
	"Measuring instruments",
	// Kitchen & Hospitality
	"Commercial ovens",
	"Refrigerators - commercial",
	"Freezers - commercial",
	"Dishwashers - commercial",
	"Coffee machines",
	"Food preparation equipment",
	// Retail
	"Point of sale systems",
	"Display cabinets",
	"Shelving - retail",
	"Cash registers",
	"EFTPOS terminals",
	"Shopping trolleys",
	// Audio Visual
	"Televisions",
	"Projectors",
	"Audio equipment",
	"Video conferencing equipment",
	"Digital signage",
	// Medical & Scientific
	"Medical equipment",
	"Laboratory equipment",
	"Scientific instruments",
	// Agricultural
	"Farm machinery",
	"Tractors",
	"Irrigation equipment",
	"Fencing",
	// Other
	"Artwork",
	"Signs - exterior",
	"Signs - interior",
	"Safes",
	"Vending machines",
	"Cleaning equipment",
	"Garden equipment",
	"Gym equipment",
	"Other - specify",
];

type Tool = "rectangle" | "circle" | "pen";

interface Point {
	x: number;
	y: number;
}

interface Asset {
	id: string;
	itemType: string;
	name: string;
	serialNumber: string;
	purchasePrice: number;
	purchaseDate: string;
	photo?: string;
	incomplete?: boolean;
}

interface Room {
	id: string;
	name: string;
	tool: Tool;
	color: string;
	assets: Asset[];
	isWholeSite?: boolean;
	// For rectangle
	rect?: { x: number; y: number; width: number; height: number };
	// For circle
	circle?: { cx: number; cy: number; radius: number };
	// For freeform pen
	path?: Point[];
}

interface Register {
	id?: string;
	address: string;
	sitePlan: string | null;
	rooms: Room[];
	ownsLand?: boolean;
	ownsBuildings?: boolean;
	wizardCompleted?: boolean;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

type WizardStep = "question" | "addItem";
type OwnershipWizardStep = "questions" | "values";

export default function Home() {
	const [password, setPassword] = useState("");
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [error, setError] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [address, setAddress] = useState("");
	const [registers, setRegisters] = useState<Register[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [wizardActive, setWizardActive] = useState(false);
	const [selectedTool, setSelectedTool] = useState<Tool>("rectangle");
	const [selectedColor, setSelectedColor] = useState(COLORS[0]);
	const [isDrawing, setIsDrawing] = useState(false);
	const [startPoint, setStartPoint] = useState<Point | null>(null);
	const [currentPath, setCurrentPath] = useState<Point[]>([]);
	const [previewShape, setPreviewShape] = useState<Room | null>(null);
	const [namingRoom, setNamingRoom] = useState<Room | null>(null);
	const [roomName, setRoomName] = useState("");
	const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
	const [confirmDeleteRoomId, setConfirmDeleteRoomId] = useState<string | null>(null);
	
	// Site ownership wizard state
	const [showOwnershipWizard, setShowOwnershipWizard] = useState(false);
	const [ownershipWizardStep, setOwnershipWizardStep] = useState<OwnershipWizardStep>("questions");
	const [ownsLand, setOwnsLand] = useState<boolean | null>(null);
	const [ownsBuildings, setOwnsBuildings] = useState<boolean | null>(null);
	const [landValue, setLandValue] = useState("");
	const [landPurchaseDate, setLandPurchaseDate] = useState("");
	const [buildingsValue, setBuildingsValue] = useState("");
	const [buildingsPurchaseDate, setBuildingsPurchaseDate] = useState("");
	
	// Asset wizard state
	const [assetWizardRoomId, setAssetWizardRoomId] = useState<string | null>(null);
	const [assetWizardStep, setAssetWizardStep] = useState<WizardStep>("question");
	const [newAssetItemType, setNewAssetItemType] = useState("");
	const [itemTypeSuggestions, setItemTypeSuggestions] = useState<string[]>([]);
	const [showItemTypeSuggestions, setShowItemTypeSuggestions] = useState(false);
	const [newAssetName, setNewAssetName] = useState("");
	const [newAssetSerialNumber, setNewAssetSerialNumber] = useState("");
	const [newAssetPurchasePrice, setNewAssetPurchasePrice] = useState("");
	const [newAssetPurchaseDate, setNewAssetPurchaseDate] = useState("");
	const [newAssetPhoto, setNewAssetPhoto] = useState<string | null>(null);

	const inputRef = useRef<HTMLInputElement>(null);
	const suggestionsRef = useRef<HTMLUListElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const canvasRef = useRef<HTMLDivElement>(null);
	const itemTypeInputRef = useRef<HTMLInputElement>(null);
	const itemTypeSuggestionsRef = useRef<HTMLUListElement>(null);

	// Load registers from API when authenticated
	const loadRegisters = useCallback(async () => {
		try {
			setIsLoading(true);
			const data = await api.getRegisters();
			setRegisters(data);
		} catch (err) {
			console.error("Failed to load registers:", err);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		if (isAuthenticated) {
			loadRegisters();
		}
	}, [isAuthenticated, loadRegisters]);

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
				itemTypeSuggestionsRef.current &&
				!itemTypeSuggestionsRef.current.contains(event.target as Node) &&
				itemTypeInputRef.current &&
				!itemTypeInputRef.current.contains(event.target as Node)
			) {
				setShowItemTypeSuggestions(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleAddressChange = (value: string) => {
		setAddress(value);
		if (value.length >= 2) {
			const filtered = mockAddresses.filter((addr) =>
				addr.toLowerCase().includes(value.toLowerCase())
			);
			setSuggestions(filtered);
			setShowSuggestions(filtered.length > 0);
		} else {
			setSuggestions([]);
			setShowSuggestions(false);
		}
	};

	const handleItemTypeChange = (value: string) => {
		setNewAssetItemType(value);
		if (value.length >= 1) {
			const filtered = IRD_ASSET_TYPES.filter((type) =>
				type.toLowerCase().includes(value.toLowerCase())
			);
			setItemTypeSuggestions(filtered);
			setShowItemTypeSuggestions(filtered.length > 0);
		} else {
			setItemTypeSuggestions([]);
			setShowItemTypeSuggestions(false);
		}
	};

	const handleSelectItemType = (type: string) => {
		setNewAssetItemType(type);
		setShowItemTypeSuggestions(false);
		setItemTypeSuggestions([]);
	};

	const handleSelectSuggestion = (suggestion: string) => {
		setAddress(suggestion);
		setShowSuggestions(false);
		setSuggestions([]);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (password === "asset") {
			setIsAuthenticated(true);
			setError(false);
		} else {
			setError(true);
		}
	};

	const handleCreateRegister = async (e: React.FormEvent) => {
		e.preventDefault();
		if (address.trim()) {
			try {
				const result = await api.createRegister({ address: address.trim() });
				setRegisters([...registers, { 
					id: result.id, 
					address: address.trim(), 
					sitePlan: null, 
					rooms: [] 
				}]);
				setAddress("");
				setIsCreating(false);
				setSuggestions([]);
				setShowSuggestions(false);
			} catch (err) {
				console.error("Failed to create register:", err);
			}
		}
	};

	const handleEdit = (index: number) => {
		setEditingIndex(index);
		setWizardActive(false);
		setSelectedRoomId(null);
		closeAssetWizard();
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file && editingIndex !== null) {
			const reader = new FileReader();
			reader.onloadend = async () => {
				const sitePlan = reader.result as string;
				const updatedRegisters = [...registers];
				updatedRegisters[editingIndex].sitePlan = sitePlan;
				setRegisters(updatedRegisters);
				
				// Sync to API
				const register = updatedRegisters[editingIndex];
				if (register.id) {
					try {
						await api.updateRegister({
							id: register.id,
							address: register.address,
							sitePlan,
							ownsLand: register.ownsLand,
							ownsBuildings: register.ownsBuildings,
							wizardCompleted: register.wizardCompleted,
						});
					} catch (err) {
						console.error("Failed to update register:", err);
					}
				}
			};
			reader.readAsDataURL(file);
		}
	};

	const handleRemoveSitePlan = async () => {
		if (editingIndex !== null) {
			const updatedRegisters = [...registers];
			updatedRegisters[editingIndex].sitePlan = null;
			updatedRegisters[editingIndex].rooms = [];
			setRegisters(updatedRegisters);
			setWizardActive(false);
			
			// Sync to API
			const register = updatedRegisters[editingIndex];
			if (register.id) {
				try {
					await api.updateRegister({
						id: register.id,
						address: register.address,
						sitePlan: null,
						ownsLand: register.ownsLand,
						ownsBuildings: register.ownsBuildings,
						wizardCompleted: register.wizardCompleted,
					});
				} catch (err) {
					console.error("Failed to update register:", err);
				}
			}
		}
	};

	const handleExportCSV = () => {
		if (editingIndex === null) return;
		
		const register = registers[editingIndex];
		const rows: string[][] = [];
		
		// Header row
		rows.push([
			"Asset Group",
			"Asset Name",
			"Item Type",
			"Serial Number",
			"Purchase Price (NZD)",
			"Purchase Date",
			"Status"
		]);
		
		// Data rows
		register.rooms.forEach(room => {
			room.assets.forEach(asset => {
				rows.push([
					room.name,
					asset.name,
					asset.itemType || "",
					asset.serialNumber || "",
					asset.purchasePrice > 0 ? asset.purchasePrice.toFixed(2) : "",
					asset.purchaseDate || "",
					asset.incomplete ? "Incomplete" : "Complete"
				]);
			});
		});
		
		// Convert to CSV string
		const csvContent = rows
			.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
			.join("\n");
		
		// Create and download file
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		
		// Create filename from address (sanitize for file system)
		const sanitizedAddress = register.address
			.replace(/[^a-zA-Z0-9\s-]/g, "")
			.replace(/\s+/g, "_")
			.substring(0, 100);
		const filename = `${sanitizedAddress}_asset_register.csv`;
		
		link.setAttribute("href", url);
		link.setAttribute("download", filename);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

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
		setIsDrawing(true);
		setStartPoint(pos);
		if (selectedTool === "pen") {
			setCurrentPath([pos]);
		}
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!isDrawing || !startPoint || !wizardActive) return;
		const pos = getRelativePosition(e);

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
			setCurrentPath((prev) => [...prev, pos]);
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
		if (!isDrawing || !previewShape) {
			setIsDrawing(false);
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

		setIsDrawing(false);
		setStartPoint(null);
		setCurrentPath([]);
		setPreviewShape(null);
	};

	const handleSaveRoom = async (e: React.FormEvent) => {
		e.preventDefault();
		if (namingRoom && roomName.trim() && editingIndex !== null) {
			const updatedRegisters = [...registers];
			const newRoom = {
				...namingRoom,
				name: roomName.trim(),
			};
			updatedRegisters[editingIndex].rooms.push(newRoom);
			setRegisters(updatedRegisters);
			setNamingRoom(null);
			setRoomName("");
			
			// Sync to API
			const register = updatedRegisters[editingIndex];
			if (register.id) {
				try {
					// Convert room format to API format
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

					await api.createAssetGroup({
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
		}
	};

	const handleDeleteRoom = async (roomId: string) => {
		if (editingIndex !== null) {
			const updatedRegisters = [...registers];
			updatedRegisters[editingIndex].rooms = updatedRegisters[editingIndex].rooms.filter(
				(r) => r.id !== roomId
			);
			setRegisters(updatedRegisters);
			setSelectedRoomId(null);
			
			// Sync to API
			try {
				await api.deleteAssetGroup(roomId);
			} catch (err) {
				console.error("Failed to delete asset group:", err);
			}
		}
	};

	const openAssetWizard = (roomId: string) => {
		setAssetWizardRoomId(roomId);
		setAssetWizardStep("addItem");
	};

	const closeAssetWizard = () => {
		setAssetWizardRoomId(null);
		setAssetWizardStep("question");
		setNewAssetItemType("");
		setItemTypeSuggestions([]);
		setShowItemTypeSuggestions(false);
		setNewAssetName("");
		setNewAssetSerialNumber("");
		setNewAssetPurchasePrice("");
		setNewAssetPurchaseDate("");
		setNewAssetPhoto(null);
	};

	const handleAssetWizardYes = () => {
		setAssetWizardStep("addItem");
	};

	const handleAssetWizardNo = () => {
		closeAssetWizard();
	};

	const handleAddAsset = async (e: React.FormEvent) => {
		e.preventDefault();
		if (assetWizardRoomId && newAssetName.trim() && editingIndex !== null) {
			const updatedRegisters = [...registers];
			const roomIndex = updatedRegisters[editingIndex].rooms.findIndex(
				(r) => r.id === assetWizardRoomId
			);
			if (roomIndex !== -1) {
				const price = parseFloat(newAssetPurchasePrice) || 0;
				const isIncomplete = !newAssetPurchasePrice || price === 0 || !newAssetPurchaseDate;
				const assetId = `asset-${Date.now()}`;
				
				const newAsset = {
					id: assetId,
					itemType: newAssetItemType.trim() || "",
					name: newAssetName.trim(),
					serialNumber: newAssetSerialNumber.trim() || "",
					purchasePrice: price,
					purchaseDate: newAssetPurchaseDate || "",
					photo: newAssetPhoto || undefined,
					incomplete: isIncomplete,
				};
				
				updatedRegisters[editingIndex].rooms[roomIndex].assets.push(newAsset);
				setRegisters(updatedRegisters);
				
				// Sync to API
				try {
					await api.createAsset({
						assetGroupId: assetWizardRoomId,
						id: assetId,
						itemType: newAsset.itemType,
						name: newAsset.name,
						serialNumber: newAsset.serialNumber,
						purchasePrice: newAsset.purchasePrice,
						purchaseDate: newAsset.purchaseDate,
						photo: newAsset.photo,
						incomplete: newAsset.incomplete,
					});
				} catch (err) {
					console.error("Failed to create asset:", err);
				}
			}
			// Reset form but stay in wizard to add more items
			setNewAssetItemType("");
			setItemTypeSuggestions([]);
			setShowItemTypeSuggestions(false);
			setNewAssetName("");
			setNewAssetSerialNumber("");
			setNewAssetPurchasePrice("");
			setNewAssetPurchaseDate("");
			setNewAssetPhoto(null);
		}
	};

	const handleAssetPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setNewAssetPhoto(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleDeleteAsset = async (roomId: string, assetId: string) => {
		if (editingIndex !== null) {
			const updatedRegisters = [...registers];
			const roomIndex = updatedRegisters[editingIndex].rooms.findIndex((r) => r.id === roomId);
			if (roomIndex !== -1) {
				updatedRegisters[editingIndex].rooms[roomIndex].assets = updatedRegisters[
					editingIndex
				].rooms[roomIndex].assets.filter((a) => a.id !== assetId);
				setRegisters(updatedRegisters);
				
				// Sync to API
				try {
					await api.deleteAsset(assetId);
				} catch (err) {
					console.error("Failed to delete asset:", err);
				}
			}
		}
	};

	const startAssetRegisterWizard = () => {
		setShowOwnershipWizard(true);
		setOwnershipWizardStep("questions");
		setOwnsLand(null);
		setOwnsBuildings(null);
		setLandValue("");
		setLandPurchaseDate("");
		setBuildingsValue("");
		setBuildingsPurchaseDate("");
	};

	const handleOwnershipQuestionsNext = () => {
		if (ownsLand || ownsBuildings) {
			setOwnershipWizardStep("values");
		} else {
			// Neither selected, skip to drawing
			if (editingIndex !== null) {
				const updatedRegisters = [...registers];
				updatedRegisters[editingIndex].wizardCompleted = true;
				setRegisters(updatedRegisters);
			}
			setShowOwnershipWizard(false);
			setWizardActive(true);
		}
	};

	const handleOwnershipWizardContinue = async () => {
		if (editingIndex !== null && (ownsLand || ownsBuildings)) {
			const updatedRegisters = [...registers];
			const register = updatedRegisters[editingIndex];
			updatedRegisters[editingIndex].ownsLand = ownsLand || false;
			updatedRegisters[editingIndex].ownsBuildings = ownsBuildings || false;

			// Check if Whole Site entry already exists
			const existingWholeSite = updatedRegisters[editingIndex].rooms.find(r => r.isWholeSite);
			
			if (!existingWholeSite) {
				// Create a Whole Site entry
				const wholeSiteAssets: Asset[] = [];
				const wholeSiteRoomId = `whole-site-${Date.now()}`;
				
				if (ownsLand) {
					wholeSiteAssets.push({
						id: `land-${Date.now()}`,
						itemType: "Property",
						name: "Land",
						serialNumber: "",
						purchasePrice: parseFloat(landValue) || 0,
						purchaseDate: landPurchaseDate || "",
						incomplete: !landValue || parseFloat(landValue) === 0 || !landPurchaseDate,
					});
				}
				
				if (ownsBuildings) {
					wholeSiteAssets.push({
						id: `buildings-${Date.now() + 1}`,
						itemType: "Property",
						name: "Buildings",
						serialNumber: "",
						purchasePrice: parseFloat(buildingsValue) || 0,
						purchaseDate: buildingsPurchaseDate || "",
						incomplete: !buildingsValue || parseFloat(buildingsValue) === 0 || !buildingsPurchaseDate,
					});
				}

				const wholeSiteRoom: Room = {
					id: wholeSiteRoomId,
					name: "Whole Site",
					tool: "rectangle",
					color: "#6366f1",
					assets: wholeSiteAssets,
					isWholeSite: true,
				};

				updatedRegisters[editingIndex].rooms.unshift(wholeSiteRoom);
				
				// Sync to API
				if (register.id) {
					try {
						// Create the Whole Site asset group
						await api.createAssetGroup({
							registerId: register.id,
							id: wholeSiteRoomId,
							name: "Whole Site",
							tool: "rectangle",
							color: "#6366f1",
							isWholeSite: true,
						});
						
						// Create the assets
						for (const asset of wholeSiteAssets) {
							await api.createAsset({
								assetGroupId: wholeSiteRoomId,
								id: asset.id,
								itemType: asset.itemType,
								name: asset.name,
								serialNumber: asset.serialNumber,
								purchasePrice: asset.purchasePrice,
								purchaseDate: asset.purchaseDate,
								incomplete: asset.incomplete,
							});
						}
					} catch (err) {
						console.error("Failed to create whole site:", err);
					}
				}
			} else {
				// Update existing Whole Site entry
				const wholeSiteIndex = updatedRegisters[editingIndex].rooms.findIndex(r => r.isWholeSite);
				if (wholeSiteIndex !== -1) {
					const existingAssets = updatedRegisters[editingIndex].rooms[wholeSiteIndex].assets;
					const wholeSiteRoomId = updatedRegisters[editingIndex].rooms[wholeSiteIndex].id;
					
					// Add Land if selected and doesn't exist
					if (ownsLand && !existingAssets.find(a => a.name === "Land")) {
						const landAsset = {
							id: `land-${Date.now()}`,
							itemType: "Property",
							name: "Land",
							serialNumber: "",
							purchasePrice: parseFloat(landValue) || 0,
							purchaseDate: landPurchaseDate || "",
							incomplete: !landValue || parseFloat(landValue) === 0 || !landPurchaseDate,
						};
						existingAssets.push(landAsset);
						
						// Sync to API
						if (register.id) {
							try {
								await api.createAsset({
									assetGroupId: wholeSiteRoomId,
									...landAsset,
								});
							} catch (err) {
								console.error("Failed to create land asset:", err);
							}
						}
					}
					
					// Add Buildings if selected and doesn't exist
					if (ownsBuildings && !existingAssets.find(a => a.name === "Buildings")) {
						const buildingsAsset = {
							id: `buildings-${Date.now()}`,
							itemType: "Property",
							name: "Buildings",
							serialNumber: "",
							purchasePrice: parseFloat(buildingsValue) || 0,
							purchaseDate: buildingsPurchaseDate || "",
							incomplete: !buildingsValue || parseFloat(buildingsValue) === 0 || !buildingsPurchaseDate,
						};
						existingAssets.push(buildingsAsset);
						
						// Sync to API
						if (register.id) {
							try {
								await api.createAsset({
									assetGroupId: wholeSiteRoomId,
									...buildingsAsset,
								});
							} catch (err) {
								console.error("Failed to create buildings asset:", err);
							}
						}
					}
				}
			}

			updatedRegisters[editingIndex].wizardCompleted = true;
			setRegisters(updatedRegisters);
			
			// Update register in API
			if (register.id) {
				try {
					await api.updateRegister({
						id: register.id,
						address: register.address,
						sitePlan: register.sitePlan,
						ownsLand: ownsLand || false,
						ownsBuildings: ownsBuildings || false,
						wizardCompleted: true,
					});
				} catch (err) {
					console.error("Failed to update register:", err);
				}
			}
		}

		setShowOwnershipWizard(false);
		setWizardActive(true);
	};

	const handleOwnershipWizardSkip = async () => {
		if (editingIndex !== null) {
			const updatedRegisters = [...registers];
			updatedRegisters[editingIndex].wizardCompleted = true;
			setRegisters(updatedRegisters);
			
			// Sync to API
			const register = updatedRegisters[editingIndex];
			if (register.id) {
				try {
					await api.updateRegister({
						id: register.id,
						address: register.address,
						sitePlan: register.sitePlan,
						ownsLand: register.ownsLand,
						ownsBuildings: register.ownsBuildings,
						wizardCompleted: true,
					});
				} catch (err) {
					console.error("Failed to update register:", err);
				}
			}
		}
		setShowOwnershipWizard(false);
		setWizardActive(true);
	};

	const handleOwnershipValuesSkip = async () => {
		if (editingIndex !== null && (ownsLand || ownsBuildings)) {
			const updatedRegisters = [...registers];
			const register = updatedRegisters[editingIndex];
			updatedRegisters[editingIndex].ownsLand = ownsLand || false;
			updatedRegisters[editingIndex].ownsBuildings = ownsBuildings || false;

			// Check if Whole Site entry already exists
			const existingWholeSite = updatedRegisters[editingIndex].rooms.find(r => r.isWholeSite);
			
			if (!existingWholeSite) {
				// Create a Whole Site entry with incomplete assets
				const wholeSiteAssets: Asset[] = [];
				const wholeSiteRoomId = `whole-site-${Date.now()}`;
				
				if (ownsLand) {
					wholeSiteAssets.push({
						id: `land-${Date.now()}`,
						itemType: "Property",
						name: "Land",
						serialNumber: "",
						purchasePrice: 0,
						purchaseDate: "",
						incomplete: true,
					});
				}
				
				if (ownsBuildings) {
					wholeSiteAssets.push({
						id: `buildings-${Date.now() + 1}`,
						itemType: "Property",
						name: "Buildings",
						serialNumber: "",
						purchasePrice: 0,
						purchaseDate: "",
						incomplete: true,
					});
				}

				const wholeSiteRoom: Room = {
					id: wholeSiteRoomId,
					name: "Whole Site",
					tool: "rectangle",
					color: "#6366f1",
					assets: wholeSiteAssets,
					isWholeSite: true,
				};

				updatedRegisters[editingIndex].rooms.unshift(wholeSiteRoom);
				
				// Sync to API
				if (register.id) {
					try {
						await api.createAssetGroup({
							registerId: register.id,
							id: wholeSiteRoomId,
							name: "Whole Site",
							tool: "rectangle",
							color: "#6366f1",
							isWholeSite: true,
						});
						
						for (const asset of wholeSiteAssets) {
							await api.createAsset({
								assetGroupId: wholeSiteRoomId,
								id: asset.id,
								itemType: asset.itemType,
								name: asset.name,
								serialNumber: asset.serialNumber,
								purchasePrice: asset.purchasePrice,
								purchaseDate: asset.purchaseDate,
								incomplete: asset.incomplete,
							});
						}
					} catch (err) {
						console.error("Failed to create whole site:", err);
					}
				}
			}

			updatedRegisters[editingIndex].wizardCompleted = true;
			setRegisters(updatedRegisters);
			
			// Update register in API
			if (register.id) {
				try {
					await api.updateRegister({
						id: register.id,
						address: register.address,
						sitePlan: register.sitePlan,
						ownsLand: ownsLand || false,
						ownsBuildings: ownsBuildings || false,
						wizardCompleted: true,
					});
				} catch (err) {
					console.error("Failed to update register:", err);
				}
			}
		}

		setShowOwnershipWizard(false);
		setWizardActive(true);
	};

	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat("en-NZ", {
			style: "currency",
			currency: "NZD",
		}).format(value);
	};

	const renderShape = (room: Room, isPreview = false) => {
		// Don't render Whole Site on the canvas
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
					className={`absolute inset-0 w-full h-full pointer-events-none`}
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
							<tspan
								style={{
									backgroundColor: room.color,
									padding: "2px 4px",
								}}
							>
								{room.name}
							</tspan>
						</text>
					)}
				</svg>
			);
		}

		return null;
	};

	if (!isAuthenticated) {
		return (
			<div className="min-h-screen bg-white flex items-center justify-center">
				<form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
					<h1 className="text-2xl font-semibold text-gray-900 mb-2">Enter Password</h1>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="Password"
						className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
						autoFocus
					/>
					{error && <p className="text-red-500 text-sm">Incorrect password</p>}
					<button
						type="submit"
						className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
					>
						Enter
					</button>
				</form>
			</div>
		);
	}

	// Editing view
	if (editingIndex !== null) {
		const register = registers[editingIndex];
		const wizardRoom = assetWizardRoomId
			? register.rooms.find((r) => r.id === assetWizardRoomId)
			: null;

		return (
			<div className="min-h-screen bg-white flex flex-col items-center py-8 px-4">
				<h1 className="text-2xl font-semibold text-gray-900">Edit Register</h1>
				<p className="text-gray-600 mb-6">{register.address}</p>

				{register.sitePlan ? (
					<div className="flex flex-col items-center gap-4 w-full max-w-5xl">
						{/* Toolbar */}
						<div className="flex flex-wrap items-center gap-2 mb-2">
							{!wizardActive ? (
								<>
									<button
										onClick={startAssetRegisterWizard}
										className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
									>
										Start Asset Register Wizard
									</button>
									<button
										onClick={handleExportCSV}
										className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
									>
										Export CSV
									</button>
									<button
										onClick={handleRemoveSitePlan}
										className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
									>
										Remove
									</button>
								</>
							) : (
								<>
									<span className="text-sm text-gray-600 mr-2">Tools:</span>
									<button
										onClick={() => setSelectedTool("rectangle")}
										className={`p-2 rounded-lg transition-colors ${
											selectedTool === "rectangle"
												? "bg-blue-600 text-white"
												: "border border-gray-300 text-gray-700 hover:bg-gray-50"
										}`}
										title="Rectangle"
									>
										<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
										</svg>
									</button>
									<button
										onClick={() => setSelectedTool("circle")}
										className={`p-2 rounded-lg transition-colors ${
											selectedTool === "circle"
												? "bg-blue-600 text-white"
												: "border border-gray-300 text-gray-700 hover:bg-gray-50"
										}`}
										title="Circle"
									>
										<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<circle cx="12" cy="12" r="9" strokeWidth="2" />
										</svg>
									</button>
									<button
										onClick={() => setSelectedTool("pen")}
										className={`p-2 rounded-lg transition-colors ${
											selectedTool === "pen"
												? "bg-blue-600 text-white"
												: "border border-gray-300 text-gray-700 hover:bg-gray-50"
										}`}
										title="Freeform"
									>
										<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth="2"
												d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
											/>
										</svg>
									</button>

									<div className="w-px h-6 bg-gray-300 mx-2" />

									<span className="text-sm text-gray-600 mr-1">Color:</span>
									{COLORS.map((color) => (
										<button
											key={color}
											onClick={() => setSelectedColor(color)}
											className={`w-6 h-6 rounded-full transition-transform ${
												selectedColor === color ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""
											}`}
											style={{ backgroundColor: color }}
										/>
									))}

									<div className="w-px h-6 bg-gray-300 mx-2" />

									<button
										onClick={() => {
											setWizardActive(false);
											setSelectedRoomId(null);
										}}
										className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
									>
										Done Drawing
									</button>
								</>
							)}
						</div>

						{wizardActive && (
							<p className="text-sm text-blue-600">
								Draw on the site plan to mark rooms. Use {selectedTool === "rectangle" ? "click and drag to draw rectangles" : selectedTool === "circle" ? "click and drag to draw circles" : "click and drag to draw freeform shapes"}.
							</p>
						)}

						{/* Site plan with drawing canvas */}
						<div
							ref={canvasRef}
							onMouseDown={handleMouseDown}
							onMouseMove={handleMouseMove}
							onMouseUp={handleMouseUp}
							onMouseLeave={handleMouseUp}
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
						{showOwnershipWizard && (
							<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
								<div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4">
									{ownershipWizardStep === "questions" && (
										<>
											<h3 className="text-lg font-semibold text-gray-900 mb-6">
												Site Ownership Questions
											</h3>
											
											<div className="space-y-6">
												<div>
													<p className="text-gray-700 mb-3">
														Do you own the land the site is on?
													</p>
													<div className="flex gap-3">
														<button
															onClick={() => setOwnsLand(true)}
															className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
																ownsLand === true
																	? "bg-blue-600 text-white"
																	: "border border-gray-300 text-gray-700 hover:bg-gray-50"
															}`}
														>
															Yes
														</button>
														<button
															onClick={() => setOwnsLand(false)}
															className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
																ownsLand === false
																	? "bg-blue-600 text-white"
																	: "border border-gray-300 text-gray-700 hover:bg-gray-50"
															}`}
														>
															No
														</button>
													</div>
												</div>

												<div>
													<p className="text-gray-700 mb-3">
														Do you own any of the buildings (including leasing with an option to buy)?
													</p>
													<div className="flex gap-3">
														<button
															onClick={() => setOwnsBuildings(true)}
															className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
																ownsBuildings === true
																	? "bg-blue-600 text-white"
																	: "border border-gray-300 text-gray-700 hover:bg-gray-50"
															}`}
														>
															Yes
														</button>
														<button
															onClick={() => setOwnsBuildings(false)}
															className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
																ownsBuildings === false
																	? "bg-blue-600 text-white"
																	: "border border-gray-300 text-gray-700 hover:bg-gray-50"
															}`}
														>
															No
														</button>
													</div>
												</div>
											</div>

											<div className="flex gap-3 justify-end mt-8">
												<button
													onClick={handleOwnershipWizardSkip}
													className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
												>
													Skip
												</button>
												<button
													onClick={handleOwnershipQuestionsNext}
													disabled={ownsLand === null || ownsBuildings === null}
													className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
												>
													Next
												</button>
											</div>
										</>
									)}

									{ownershipWizardStep === "values" && (
										<>
											<h3 className="text-lg font-semibold text-gray-900 mb-6">
												Enter Asset Values
											</h3>
											
											<div className="space-y-6">
												{ownsLand && (
													<div className="p-4 bg-gray-50 rounded-lg">
														<h4 className="font-medium text-gray-900 mb-3">Land</h4>
														<div className="space-y-3">
															<div>
																<label className="block text-sm text-gray-700 mb-1">
																	Value (NZD)
																</label>
																<input
																	type="number"
																	value={landValue}
																	onChange={(e) => setLandValue(e.target.value)}
																	placeholder="0.00"
																	min="0"
																	step="0.01"
																	className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
																/>
															</div>
															<div>
																<label className="block text-sm text-gray-700 mb-1">
																	Purchase Date
																</label>
																<input
																	type="date"
																	value={landPurchaseDate}
																	onChange={(e) => setLandPurchaseDate(e.target.value)}
																	className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
																/>
															</div>
														</div>
													</div>
												)}

												{ownsBuildings && (
													<div className="p-4 bg-gray-50 rounded-lg">
														<h4 className="font-medium text-gray-900 mb-3">Buildings</h4>
														<div className="space-y-3">
															<div>
																<label className="block text-sm text-gray-700 mb-1">
																	Value (NZD)
																</label>
																<input
																	type="number"
																	value={buildingsValue}
																	onChange={(e) => setBuildingsValue(e.target.value)}
																	placeholder="0.00"
																	min="0"
																	step="0.01"
																	className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
																/>
															</div>
															<div>
																<label className="block text-sm text-gray-700 mb-1">
																	Purchase Date
																</label>
																<input
																	type="date"
																	value={buildingsPurchaseDate}
																	onChange={(e) => setBuildingsPurchaseDate(e.target.value)}
																	className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
																/>
															</div>
														</div>
													</div>
												)}
											</div>

											<div className="flex gap-3 justify-end mt-8">
												<button
													onClick={() => setOwnershipWizardStep("questions")}
													className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
												>
													Back
												</button>
												<button
													onClick={handleOwnershipValuesSkip}
													className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
												>
													Skip
												</button>
												<button
													onClick={handleOwnershipWizardContinue}
													className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
												>
													Continue
												</button>
											</div>
										</>
									)}
								</div>
							</div>
						)}

						{/* Room naming modal */}
						{namingRoom && (
							<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
								<form
									onSubmit={handleSaveRoom}
									className="bg-white rounded-lg p-6 shadow-xl flex flex-col gap-4"
								>
									<h3 className="text-lg font-semibold text-gray-900">Name this room</h3>
									<input
										type="text"
										value={roomName}
										onChange={(e) => setRoomName(e.target.value)}
										placeholder="e.g., Living Room, Kitchen..."
										className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900 w-64"
										autoFocus
									/>
									<div className="flex gap-2 justify-end">
										<button
											type="button"
											onClick={() => {
												setNamingRoom(null);
												setRoomName("");
											}}
											className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
										>
											Cancel
										</button>
										<button
											type="submit"
											className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
										>
											Save Room
										</button>
									</div>
								</form>
							</div>
						)}

						{/* Confirm Delete Room Modal */}
						{confirmDeleteRoomId && (
							<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
								<div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
									<h3 className="text-lg font-semibold text-gray-900 mb-4">
										Are you sure?
									</h3>
									<p className="text-gray-600 mb-6">
										This will remove the asset group "{register.rooms.find(r => r.id === confirmDeleteRoomId)?.name}" and all its assets. This action cannot be undone.
									</p>
									<div className="flex gap-3 justify-end">
										<button
											onClick={() => setConfirmDeleteRoomId(null)}
											className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
										>
											Cancel
										</button>
										<button
											onClick={() => {
												handleDeleteRoom(confirmDeleteRoomId);
												setConfirmDeleteRoomId(null);
											}}
											className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
										>
											Remove
										</button>
									</div>
								</div>
							</div>
						)}

						{/* Asset Wizard Modal */}
						{assetWizardRoomId && wizardRoom && (
							<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
								<div className="bg-white rounded-lg p-6 shadow-xl max-w-lg w-full mx-4">
									{assetWizardStep === "question" && (
										<>
											<h3 className="text-lg font-semibold text-gray-900 mb-4">
												Add Assets to {wizardRoom.name}
											</h3>
											<p className="text-gray-700 mb-4">
												Does this space contain any of the following?
											</p>
											<ul className="list-disc list-inside mb-6 text-gray-600 space-y-1">
												{ASSET_CATEGORIES.map((category) => (
													<li key={category}>{category}</li>
												))}
											</ul>
											<div className="flex gap-3 justify-end">
												<button
													onClick={handleAssetWizardNo}
													className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
												>
													No
												</button>
												<button
													onClick={handleAssetWizardYes}
													className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
												>
													Yes
												</button>
											</div>
										</>
									)}

									{assetWizardStep === "addItem" && (
										<>
											<h3 className="text-lg font-semibold text-gray-900 mb-4">
												Add Assets to {wizardRoom.name}
											</h3>
											<form onSubmit={handleAddAsset} className="flex flex-col gap-4">
												<div className="relative">
													<label className="block text-sm font-medium text-gray-700 mb-1">
														Item Type (IRD Depreciation Guide)
													</label>
													<input
														ref={itemTypeInputRef}
														type="text"
														value={newAssetItemType}
														onChange={(e) => handleItemTypeChange(e.target.value)}
														onFocus={() => {
															if (newAssetItemType.length >= 1 && itemTypeSuggestions.length > 0) {
																setShowItemTypeSuggestions(true);
															}
														}}
														placeholder="Start typing to search..."
														className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
														autoFocus
													/>
													{showItemTypeSuggestions && itemTypeSuggestions.length > 0 && (
														<ul
															ref={itemTypeSuggestionsRef}
															className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
														>
															{itemTypeSuggestions.map((type, index) => (
																<li
																	key={index}
																	onClick={() => handleSelectItemType(type)}
																	className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-900 text-sm"
																>
																	{type}
																</li>
															))}
														</ul>
													)}
												</div>
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1">
														Name
													</label>
													<input
														type="text"
														value={newAssetName}
														onChange={(e) => setNewAssetName(e.target.value)}
														placeholder="e.g., Dell XPS 15, Standing Desk..."
														className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
													/>
												</div>
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1">
														Serial Number
													</label>
													<input
														type="text"
														value={newAssetSerialNumber}
														onChange={(e) => setNewAssetSerialNumber(e.target.value)}
														placeholder="e.g., SN123456789"
														className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
													/>
												</div>
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1">
														Purchase Price (NZD)
													</label>
													<input
														type="number"
														value={newAssetPurchasePrice}
														onChange={(e) => setNewAssetPurchasePrice(e.target.value)}
														placeholder="0.00"
														min="0"
														step="0.01"
														className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
													/>
												</div>
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1">
														Purchase Date
													</label>
													<input
														type="date"
														value={newAssetPurchaseDate}
														onChange={(e) => setNewAssetPurchaseDate(e.target.value)}
														className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900"
													/>
												</div>
												<div>
													<label className="block text-sm font-medium text-gray-700 mb-1">
														Photo (optional)
													</label>
													{newAssetPhoto ? (
														<div className="flex items-center gap-3">
															<img
																src={newAssetPhoto}
																alt="Asset preview"
																className="w-16 h-16 object-cover rounded-lg border border-gray-300"
															/>
															<button
																type="button"
																onClick={() => setNewAssetPhoto(null)}
																className="text-red-500 hover:text-red-700 text-sm"
															>
																Remove
															</button>
														</div>
													) : (
														<label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
															<div className="text-center">
																<svg className="w-6 h-6 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
																</svg>
																<span className="text-sm text-gray-500">Upload photo</span>
															</div>
															<input
																type="file"
																accept="image/*"
																onChange={handleAssetPhotoUpload}
																className="hidden"
															/>
														</label>
													)}
												</div>

												{/* Show already added assets */}
												{wizardRoom.assets.length > 0 && (
													<div className="border-t pt-4 mt-2">
														<p className="text-sm font-medium text-gray-700 mb-2">
															Assets added ({wizardRoom.assets.length}):
														</p>
														<ul className="space-y-1 max-h-32 overflow-y-auto">
															{wizardRoom.assets.map((asset) => (
																<li
																	key={asset.id}
																	className="text-sm text-gray-600 flex justify-between"
																>
																	<span>{asset.itemType}: {asset.name}</span>
																	<span>{formatCurrency(asset.purchasePrice)}</span>
																</li>
															))}
														</ul>
													</div>
												)}

												<div className="flex gap-3 justify-end mt-2">
													<button
														type="button"
														onClick={closeAssetWizard}
														className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
													>
														Done
													</button>
													<button
														type="submit"
														disabled={!newAssetName.trim()}
														className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
													>
														Add Item
													</button>
												</div>
											</form>
										</>
									)}
								</div>
							</div>
						)}

						{/* Selected room actions */}
						{selectedRoomId && !wizardActive && (
							<div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
								<span className="text-gray-700">
									Selected: {register.rooms.find((r) => r.id === selectedRoomId)?.name}
								</span>
								{!register.rooms.find((r) => r.id === selectedRoomId)?.isWholeSite && (
									<button
										onClick={() => handleDeleteRoom(selectedRoomId)}
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
						{register.wizardCompleted && register.rooms.length > 0 && (
							<div className="w-full max-w-lg mt-4">
								<h3 className="text-sm font-medium text-gray-700 mb-2">
									Asset Groups ({register.rooms.length})
								</h3>
								<ul className="space-y-2">
									{register.rooms.map((room) => (
										<li
											key={room.id}
											className={`rounded-lg border transition-colors ${
												room.isWholeSite
													? "border-indigo-300 bg-indigo-50"
													: selectedRoomId === room.id
													? "border-blue-300 bg-blue-50"
													: "border-gray-200 bg-gray-50"
											}`}
										>
											<div
												onClick={() => !wizardActive && !room.isWholeSite && setSelectedRoomId(room.id)}
												className={`flex items-center justify-between px-3 py-2 ${!room.isWholeSite ? "cursor-pointer" : ""}`}
											>
												<div className="flex items-center gap-2">
													<span
														className="w-4 h-4 rounded"
														style={{ backgroundColor: room.color }}
													/>
													<span className="text-gray-900 font-medium">{room.name}</span>
													{room.isWholeSite && (
														<span className="text-xs bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded">
															Site Assets
														</span>
													)}
													<span className="text-gray-500 text-xs">
														({room.assets.length} assets)
													</span>
												</div>
												<div className="flex gap-2">
													<button
														onClick={(e) => {
															e.stopPropagation();
															openAssetWizard(room.id);
														}}
														className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
													>
														Add Assets
													</button>
													{!room.isWholeSite && (
														<button
															onClick={(e) => {
																e.stopPropagation();
																setConfirmDeleteRoomId(room.id);
															}}
															className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
														>
															Remove
														</button>
													)}
												</div>
											</div>
											{/* Assets list */}
											{room.assets.length > 0 && (
												<ul className="px-3 pb-2 space-y-1">
													{room.assets.map((asset) => (
														<li
															key={asset.id}
															className={`flex items-center justify-between py-1 px-2 rounded text-sm ${asset.incomplete ? 'bg-amber-50 border border-amber-200' : 'bg-white'}`}
														>
															<div className="flex-1 flex items-center gap-2">
																{asset.photo && (
																	<img
																		src={asset.photo}
																		alt={asset.name}
																		className="w-8 h-8 object-cover rounded"
																	/>
																)}
																<div>
																	<span className={`font-medium ${asset.incomplete ? 'text-amber-700' : 'text-gray-800'}`}>
																		{asset.itemType ? `${asset.itemType}: ` : ''}{asset.name}
																	</span>
																	{asset.incomplete && (!asset.purchasePrice || asset.purchasePrice === 0) && (
																		<span className="text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded ml-2">
																			Needs value
																		</span>
																	)}
																	{asset.incomplete && !asset.purchaseDate && (
																		<span className="text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded ml-2">
																			Needs date
																		</span>
																	)}
																	{asset.serialNumber && (
																		<span className="text-gray-400 ml-2 text-xs">
																			(SN: {asset.serialNumber})
																		</span>
																	)}
																	{asset.purchasePrice > 0 && (
																		<span className="text-gray-500 ml-2">
																			{formatCurrency(asset.purchasePrice)}
																		</span>
																	)}
																	{asset.purchaseDate && (
																		<span className="text-gray-400 ml-2 text-xs">
																			({asset.purchaseDate})
																		</span>
																	)}
																</div>
															</div>
															<button
																onClick={() => handleDeleteAsset(room.id, asset.id)}
																className="text-red-500 hover:text-red-700 text-xs ml-2"
															>
																Remove
															</button>
														</li>
													))}
												</ul>
											)}
										</li>
									))}
								</ul>
							</div>
						)}

						{/* Incomplete Items Section */}
						{register.wizardCompleted && register.rooms.some(room => room.assets.some(asset => asset.incomplete)) && (
							<div className="w-full max-w-lg mt-4">
								<h3 className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-2">
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
									</svg>
									Incomplete Items
								</h3>
								<ul className="space-y-2">
									{register.rooms.flatMap(room => 
										room.assets
											.filter(asset => asset.incomplete)
											.map(asset => (
												<li
													key={asset.id}
													className="flex items-center justify-between px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg"
												>
													<div className="flex items-center gap-2 flex-wrap">
														<span className="text-amber-600 font-medium">{asset.name}</span>
														{(!asset.purchasePrice || asset.purchasePrice === 0) && (
															<span className="text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded">
																Needs value
															</span>
														)}
														{!asset.purchaseDate && (
															<span className="text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded">
																Needs date
															</span>
														)}
													</div>
													<button
														onClick={() => openAssetWizard(room.id)}
														className="px-3 py-1 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
													>
														Complete
													</button>
												</li>
											))
									)}
								</ul>
							</div>
						)}
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
					onChange={handleFileUpload}
					className="hidden"
				/>

				<button
					onClick={() => {
						setEditingIndex(null);
						setWizardActive(false);
						setSelectedRoomId(null);
						closeAssetWizard();
					}}
					className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
				>
					Back
				</button>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-white flex flex-col items-center justify-center gap-8">
			<h1 className="text-4xl font-semibold text-gray-900">Asset Register</h1>

			{isCreating ? (
				<form onSubmit={handleCreateRegister} className="flex flex-col items-center gap-4">
					<div className="relative">
						<input
							ref={inputRef}
							type="text"
							value={address}
							onChange={(e) => handleAddressChange(e.target.value)}
							onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
							placeholder="Start typing an address..."
							className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900 w-80"
							autoFocus
						/>
						{showSuggestions && suggestions.length > 0 && (
							<ul
								ref={suggestionsRef}
								className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
							>
								{suggestions.map((suggestion, index) => (
									<li
										key={index}
										onClick={() => handleSelectSuggestion(suggestion)}
										className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-900 text-sm"
									>
										{suggestion}
									</li>
								))}
							</ul>
						)}
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => {
								setIsCreating(false);
								setAddress("");
								setSuggestions([]);
								setShowSuggestions(false);
							}}
							className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
						>
							Create
						</button>
					</div>
				</form>
			) : (
				<button
					onClick={() => setIsCreating(true)}
					className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
				>
					Create New Register
				</button>
			)}

			{isLoading && (
				<div className="text-gray-500">Loading registers...</div>
			)}

			{!isLoading && registers.length > 0 && (
				<div className="w-full max-w-md">
					<ul className="space-y-2">
						{registers.map((register, index) => (
							<li
								key={index}
								className="flex items-center justify-between px-4 py-3 bg-gray-100 rounded-lg"
							>
								<div className="flex items-center gap-2">
									<span className="text-gray-900">{register.address}</span>
									{register.sitePlan && (
										<span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
											{register.rooms.length} asset groups
										</span>
									)}
								</div>
								<button
									onClick={() => handleEdit(index)}
									className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-200 transition-colors"
								>
									Edit
								</button>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
