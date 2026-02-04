import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import { apiService } from "~/services/api";
import { calculateDepreciation } from "~/services/depreciationService";
import type { DepreciationResult } from "~/services/depreciationService";
import type { Register, Room, Asset, Point, Tool, WizardStep, OwnershipWizardStep } from "~/types";
import { IRD_ASSET_TYPES, ASSET_CATEGORIES, MOCK_ADDRESSES, COLORS } from "~/constants";
import { formatCurrency, parseCSVForImport } from "~/utils";
import { useAssetWizard, useOwnershipWizard, useImportWizard, useDrawingCanvas } from "~/hooks";
import AddressInput from "~/components/AddressInput";
import SitePlanCanvas from "~/components/SitePlanCanvas";
import DrawingToolbar from "~/components/DrawingToolbar";
import AssetWizardModal from "~/components/AssetWizardModal";
import OwnershipWizardModal from "~/components/OwnershipWizardModal";
import ImportWizardModal from "~/components/ImportWizardModal";
import RoomNamingModal from "~/components/RoomNamingModal";
import ConfirmDeleteModal from "~/components/ConfirmDeleteModal";
import DepreciationModal from "~/components/DepreciationModal";
import AssetList from "~/components/AssetList";
import IncompleteItemsSection from "~/components/IncompleteItemsSection";
import RoomListSection from "~/components/RoomListSection";
import ImportAssetForm from "~/components/ImportAssetForm";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Asset Register" },
		{ name: "description", content: "Asset Register" },
	];
}

export default function Home() {
	const navigate = useNavigate();
	const location = useLocation();
	const [searchParams, setSearchParams] = useSearchParams();
	const [isCreating, setIsCreating] = useState(false);
	const [address, setAddress] = useState("");
	const [registers, setRegisters] = useState<Register[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [wizardActive, setWizardActive] = useState(false);
	const [selectedTool, setSelectedTool] = useState<Tool>("rectangle");
	const [selectedColor, setSelectedColor] = useState(COLORS[0]);
	const [previewShape, setPreviewShape] = useState<Room | null>(null);
	const [namingRoom, setNamingRoom] = useState<Room | null>(null);
	const [roomName, setRoomName] = useState("");
	const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
	const [confirmDeleteRoomId, setConfirmDeleteRoomId] = useState<string | null>(null);

	// Incomplete section state
	const [incompleteSectionExpanded, setIncompleteSectionExpanded] = useState(false);

	// CSV Import state (using custom hook)
	const importWizard = useImportWizard();
	const importFileInputRef = useRef<HTMLInputElement>(null);

	// Site ownership wizard state (using custom hook)
	const ownershipWizard = useOwnershipWizard();

	// Asset wizard state (using custom hook)
	const assetWizard = useAssetWizard();

	// Depreciation calculation state
	const [showDepreciationModal, setShowDepreciationModal] = useState(false);
	const [depreciationResults, setDepreciationResults] = useState<DepreciationResult[]>([]);
	const [financialYear, setFinancialYear] = useState(new Date().getFullYear().toString());
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	
	// Drawing canvas state (using custom hook)
	const drawingCanvas = useDrawingCanvas();

	const inputRef = useRef<HTMLInputElement>(null);
	const suggestionsRef = useRef<HTMLUListElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const canvasRef = useRef<HTMLDivElement>(null);
	// itemTypeInputRef and itemTypeSuggestionsRef are now in assetWizard.refs

	// Load registers from API when authenticated
	const loadRegisters = useCallback(async () => {
		try {
			setIsLoading(true);
			const data = await apiService.getRegisters();
			setRegisters(data);
		} catch (err) {
			console.error("Failed to load registers:", err);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadRegisters();
	}, [loadRegisters]);

	useEffect(() => {
		// Handle navigation to open a specific register for editing
		if (registers.length > 0) {
			const registerId = searchParams.get('register');
			if (registerId) {
				const index = registers.findIndex((r) => r.id === registerId);
				if (index >= 0) {
					setEditingIndex(index);
				}
				// Clear the search param to prevent re-triggering
				setSearchParams(new URLSearchParams());
			}
		}
	}, [registers, searchParams, setSearchParams]);

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

	const handleItemTypeChange = (value: string) => {
		assetWizard.actions.setItemType(value);
	};

	const handleSelectItemType = (type: string) => {
		assetWizard.actions.selectItemTypeSuggestion(type);
	};

	const handleSelectSuggestion = (suggestion: string) => {
		setAddress(suggestion);
		setShowSuggestions(false);
		setSuggestions([]);
	};

	const handleCreateRegister = async (e: React.FormEvent) => {
		e.preventDefault();
		if (address.trim()) {
			try {
				const result = await apiService.createRegister({ address: address.trim() });
				setRegisters([...registers, {
					id: result.id,
					address: address.trim(),
					sitePlan: null,
					rooms: []
				}]);
				setAddress("");
				setIsCreating(false);
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
						await apiService.updateRegister({
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

	const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || editingIndex === null) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			const text = event.target?.result as string;
			const parsedAssets = parseCSVForImport(text);

			if (parsedAssets.length > 0) {
				importWizard.actions.openWizard(parsedAssets);
			}
		};
		reader.readAsText(file);

		// Reset file input
		if (importFileInputRef.current) {
			importFileInputRef.current.value = "";
		}
	};

	const handleImportNext = async () => {
		if (!importWizard.isLastAsset) {
			importWizard.actions.nextAsset();
		} else {
			// All assets reviewed, create the import group
			await createImportGroup();
		}
	};

	const handleImportSkip = () => {
		if (!importWizard.isLastAsset) {
			importWizard.actions.nextAsset();
		} else {
			// All assets reviewed, create the import group
			createImportGroup();
		}
	};

	const handleImportEdit = (editedAsset: any) => {
		importWizard.actions.updateCurrentAsset(editedAsset);
	};

	const createImportGroup = async () => {
		if (editingIndex === null) return;

		const register = registers[editingIndex];
		const now = new Date();
		const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
		const groupName = `imported ${timestamp}`;

		// Create new asset group
		const groupId = `import-${Date.now()}`;
		const newRoom: Room = {
			id: groupId,
			name: groupName,
			tool: "rectangle",
			color: "#8b5cf6",
			assets: [],
		};

		// Add to local state
		const updatedRegisters = [...registers];
		updatedRegisters[editingIndex].rooms.push(newRoom);
		setRegisters(updatedRegisters);

		// Sync to API
		if (register.id) {
			try {
				await apiService.createAssetGroup({
					registerId: register.id,
					id: groupId,
					name: groupName,
					tool: "rectangle",
					color: "#8b5cf6",
				});

				// Create assets
				for (const asset of importWizard.state.importedAssets) {
					const assetId = `asset-${Date.now()}-${Math.random()}`;
					const newAsset = {
						id: assetId,
						assetId: asset.assetId || undefined,
						itemType: asset.itemType || "",
						name: asset.name,
						serialNumber: asset.serialNumber || "",
						purchasePrice: asset.purchasePrice,
						purchaseDate: asset.purchaseDate || "",
						incomplete: asset.incomplete,
						depnMethodAcc: asset.depnMethodAcc || undefined,
						depnRateAcc: asset.depnRateAcc || undefined,
						depnMethodTax: asset.depnMethodTax || undefined,
						depnRateTax: asset.depnRateTax || undefined,
					};

					updatedRegisters[editingIndex].rooms[updatedRegisters[editingIndex].rooms.length - 1].assets.push(newAsset);

					await apiService.createAsset({
						assetGroupId: groupId,
						id: assetId,
						assetId: newAsset.assetId,
						itemType: newAsset.itemType,
						name: newAsset.name,
						serialNumber: newAsset.serialNumber,
						purchasePrice: newAsset.purchasePrice,
						purchaseDate: newAsset.purchaseDate,
						incomplete: newAsset.incomplete,
						depnMethodAcc: newAsset.depnMethodAcc,
						depnRateAcc: newAsset.depnRateAcc,
						depnMethodTax: newAsset.depnMethodTax,
						depnRateTax: newAsset.depnRateTax,
					});
				}

				setRegisters(updatedRegisters);
			} catch (err) {
				console.error("Failed to create import group:", err);
			}
		}

		// Close wizard
		importWizard.actions.closeWizard();
	};

	const closeImportWizard = () => {
		importWizard.actions.closeWizard();
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
				await apiService.deleteAssetGroup(roomId);
			} catch (err) {
				console.error("Failed to delete asset group:", err);
			}
		}
	};

	const openAssetWizard = (roomId: string) => {
		assetWizard.actions.openWizard(roomId);
		assetWizard.actions.setStep("addItem");
	};

	const closeAssetWizard = () => {
		assetWizard.actions.closeWizard();
	};

	const handleAssetWizardYes = () => {
		assetWizard.actions.setStep("addItem");
	};

	const handleAssetWizardNo = () => {
		closeAssetWizard();
	};

	const handleAddAsset = async (e: React.FormEvent) => {
		e.preventDefault();
		const { roomId, name, assetId: formAssetId, itemType, serialNumber, purchasePrice, purchaseDate, photo, editingAssetId } = assetWizard.state;
		if (roomId && name.trim() && editingIndex !== null) {
			const updatedRegisters = [...registers];
			const roomIndex = updatedRegisters[editingIndex].rooms.findIndex(
				(r) => r.id === roomId
			);
			if (roomIndex !== -1) {
				const price = parseFloat(purchasePrice) || 0;
				const isIncomplete = !purchasePrice || price === 0 || !purchaseDate;

				if (editingAssetId) {
					// Update existing asset
					const assetIndex = updatedRegisters[editingIndex].rooms[roomIndex].assets.findIndex(
						(a) => a.id === editingAssetId
					);
					if (assetIndex !== -1) {
						const updatedAsset = {
							...updatedRegisters[editingIndex].rooms[roomIndex].assets[assetIndex],
							assetId: formAssetId.trim() || undefined,
							itemType: itemType.trim() || "",
							name: name.trim(),
							serialNumber: serialNumber.trim() || "",
							purchasePrice: price,
							purchaseDate: purchaseDate || "",
							photo: photo || undefined,
							incomplete: isIncomplete,
						};
						updatedRegisters[editingIndex].rooms[roomIndex].assets[assetIndex] = updatedAsset;
						setRegisters(updatedRegisters);

						// Sync to API
						try {
							await apiService.updateAsset({
								id: editingAssetId,
								assetId: updatedAsset.assetId,
								itemType: updatedAsset.itemType,
								name: updatedAsset.name,
								serialNumber: updatedAsset.serialNumber,
								purchasePrice: updatedAsset.purchasePrice,
								purchaseDate: updatedAsset.purchaseDate,
								photo: updatedAsset.photo,
								incomplete: updatedAsset.incomplete,
							});
						} catch (err) {
							console.error("Failed to update asset:", err);
						}
					}
				} else {
					// Create new asset
					const newAssetId = `asset-${Date.now()}`;
					const newAsset = {
						id: newAssetId,
						assetId: formAssetId.trim() || undefined,
						itemType: itemType.trim() || "",
						name: name.trim(),
						serialNumber: serialNumber.trim() || "",
						purchasePrice: price,
						purchaseDate: purchaseDate || "",
						photo: photo || undefined,
						incomplete: isIncomplete,
					};

					updatedRegisters[editingIndex].rooms[roomIndex].assets.push(newAsset);
					setRegisters(updatedRegisters);

					// Sync to API
					try {
						await apiService.createAsset({
							assetGroupId: roomId,
							id: newAssetId,
							assetId: newAsset.assetId,
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
			}
			// Reset form but stay in wizard to add more items - use hook's setField for each
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
					await apiService.deleteAsset(assetId);
				} catch (err) {
					console.error("Failed to delete asset:", err);
				}
			}
		}
	};

	const startAssetRegisterWizard = () => {
		ownershipWizard.actions.openWizard();
	};

	const startAddRoom = () => {
		setWizardActive(true);
	};

	const handleOwnershipQuestionsNext = () => {
		const { ownsLand, ownsBuildings } = ownershipWizard.state;
		if (ownsLand || ownsBuildings) {
			ownershipWizard.actions.setStep("values");
		} else {
			// Neither selected, skip to drawing
			if (editingIndex !== null) {
				const updatedRegisters = [...registers];
				updatedRegisters[editingIndex].wizardCompleted = true;
				setRegisters(updatedRegisters);
			}
			ownershipWizard.actions.closeWizard();
			setWizardActive(true);
		}
	};

	const handleOwnershipWizardContinue = async () => {
		const { ownsLand, ownsBuildings, landValue, landPurchaseDate, buildingsValue, buildingsPurchaseDate } = ownershipWizard.state;
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
						await apiService.createAssetGroup({
							registerId: register.id,
							id: wholeSiteRoomId,
							name: "Whole Site",
							tool: "rectangle",
							color: "#6366f1",
							isWholeSite: true,
						});

						// Create the assets
						for (const asset of wholeSiteAssets) {
							await apiService.createAsset({
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

					// Handle Land asset
					const landAssetIndex = existingAssets.findIndex(a => a.name === "Land");
					if (ownsLand) {
						const landAsset = {
							id: landAssetIndex !== -1 ? existingAssets[landAssetIndex].id : `land-${Date.now()}`,
							assetId: landAssetIndex !== -1 ? existingAssets[landAssetIndex].assetId : undefined,
							itemType: "Property",
							name: "Land",
							serialNumber: "",
							purchasePrice: parseFloat(landValue) || 0,
							purchaseDate: landPurchaseDate || "",
							incomplete: !landValue || parseFloat(landValue) === 0 || !landPurchaseDate,
						};

						if (landAssetIndex !== -1) {
							// Update existing land asset
							existingAssets[landAssetIndex] = landAsset;
						} else {
							// Add new land asset
							existingAssets.push(landAsset);
						}

						// Sync to API
						if (register.id) {
							try {
								if (landAssetIndex !== -1) {
									await apiService.updateAsset({
										id: landAsset.id,
										assetId: landAsset.assetId,
										itemType: landAsset.itemType,
										name: landAsset.name,
										serialNumber: landAsset.serialNumber,
										purchasePrice: landAsset.purchasePrice,
										purchaseDate: landAsset.purchaseDate,
										incomplete: landAsset.incomplete,
									});
								} else {
									await apiService.createAsset({
										assetGroupId: wholeSiteRoomId,
										...landAsset,
									});
								}
							} catch (err) {
								console.error("Failed to save land asset:", err);
							}
						}
					} else if (landAssetIndex !== -1) {
						// Remove land asset if user no longer owns land
						const landAssetId = existingAssets[landAssetIndex].id;
						existingAssets.splice(landAssetIndex, 1);

						// Sync to API
						if (register.id) {
							try {
								await apiService.deleteAsset(landAssetId);
							} catch (err) {
								console.error("Failed to delete land asset:", err);
							}
						}
					}

					// Handle Buildings asset
					const buildingsAssetIndex = existingAssets.findIndex(a => a.name === "Buildings");
					if (ownsBuildings) {
						const buildingsAsset = {
							id: buildingsAssetIndex !== -1 ? existingAssets[buildingsAssetIndex].id : `buildings-${Date.now()}`,
							assetId: buildingsAssetIndex !== -1 ? existingAssets[buildingsAssetIndex].assetId : undefined,
							itemType: "Property",
							name: "Buildings",
							serialNumber: "",
							purchasePrice: parseFloat(buildingsValue) || 0,
							purchaseDate: buildingsPurchaseDate || "",
							incomplete: !buildingsValue || parseFloat(buildingsValue) === 0 || !buildingsPurchaseDate,
						};

						if (buildingsAssetIndex !== -1) {
							// Update existing buildings asset
							existingAssets[buildingsAssetIndex] = buildingsAsset;
						} else {
							// Add new buildings asset
							existingAssets.push(buildingsAsset);
						}

						// Sync to API
						if (register.id) {
							try {
								if (buildingsAssetIndex !== -1) {
									await apiService.updateAsset({
										id: buildingsAsset.id,
										assetId: buildingsAsset.assetId,
										itemType: buildingsAsset.itemType,
										name: buildingsAsset.name,
										serialNumber: buildingsAsset.serialNumber,
										purchasePrice: buildingsAsset.purchasePrice,
										purchaseDate: buildingsAsset.purchaseDate,
										incomplete: buildingsAsset.incomplete,
									});
								} else {
									await apiService.createAsset({
										assetGroupId: wholeSiteRoomId,
										...buildingsAsset,
									});
								}
							} catch (err) {
								console.error("Failed to save buildings asset:", err);
							}
						}
					} else if (buildingsAssetIndex !== -1) {
						// Remove buildings asset if user no longer owns buildings
						const buildingsAssetId = existingAssets[buildingsAssetIndex].id;
						existingAssets.splice(buildingsAssetIndex, 1);

						// Sync to API
						if (register.id) {
							try {
								await apiService.deleteAsset(buildingsAssetId);
							} catch (err) {
								console.error("Failed to delete buildings asset:", err);
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
					await apiService.updateRegister({
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

		ownershipWizard.actions.closeWizard();
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
					await apiService.updateRegister({
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
		ownershipWizard.actions.closeWizard();
		setWizardActive(true);
	};

	const handleOwnershipValuesSkip = async () => {
		const { ownsLand, ownsBuildings } = ownershipWizard.state;
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
						await apiService.createAssetGroup({
							registerId: register.id,
							id: wholeSiteRoomId,
							name: "Whole Site",
							tool: "rectangle",
							color: "#6366f1",
							isWholeSite: true,
						});

						for (const asset of wholeSiteAssets) {
							await apiService.createAsset({
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
					await apiService.updateRegister({
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

		ownershipWizard.actions.closeWizard();
		setWizardActive(true);
	};

	const handleFYWorking = () => {
		if (editingIndex === null) return;
		const register = registers[editingIndex];
		const results = register.rooms.flatMap((room) =>
			room.assets.map((asset) => calculateDepreciation(asset, "working"))
		);
		setDepreciationResults(results);
		setShowDepreciationModal(true);
	};

	const handleFYRegister = () => {
		if (editingIndex === null) return;
		const register = registers[editingIndex];
		const results = register.rooms.flatMap((room) =>
			room.assets.map((asset) => calculateDepreciation(asset, "register"))
		);
		setDepreciationResults(results);
		setShowDepreciationModal(true);
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

	// Editing view
	if (editingIndex !== null) {
		const register = registers[editingIndex];
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
							colors={COLORS}
							onStartWizard={startAssetRegisterWizard}
							onAddRoom={startAddRoom}
							onDoneDrawing={() => {
								setWizardActive(false);
								setSelectedRoomId(null);
							}}
							onExportCSV={handleExportCSV}
							onImportCSV={() => importFileInputRef.current?.click()}
							onRemoveSitePlan={handleRemoveSitePlan}
							importFileInputRef={importFileInputRef}
							onImportFileChange={handleCSVImport}
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
								onQuestionsNext={handleOwnershipQuestionsNext}
								onValuesSkip={handleOwnershipValuesSkip}
								onContinue={handleOwnershipWizardContinue}
								onBack={() => ownershipWizard.actions.setStep("questions")}
								onSkip={handleOwnershipWizardSkip}
								ownsLandDisabled={false}
								ownsBuildingsDisabled={false}
							/>
						)}

						{/* Room naming modal */}
						<RoomNamingModal
							namingRoom={namingRoom}
							roomName={roomName}
							onRoomNameChange={setRoomName}
							onSave={handleSaveRoom}
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
							onSave={handleImportEdit}
							onNext={handleImportNext}
							onSkip={handleImportSkip}
							isLast={importWizard.isLastAsset}
							onEdit={handleImportEdit}
						/>

						{/* Confirm Delete Room Modal */}
						<ConfirmDeleteModal
							confirmDeleteRoomId={confirmDeleteRoomId}
							roomName={register.rooms.find(r => r.id === confirmDeleteRoomId)?.name ?? ""}
							onConfirm={() => {
								handleDeleteRoom(confirmDeleteRoomId!);
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
							onYes={handleAssetWizardYes}
							onNo={handleAssetWizardNo}
							onItemTypeChange={handleItemTypeChange}
							onItemTypeSelect={handleSelectItemType}
							onItemTypeFocus={() => {
								if (assetWizard.state.itemType.length >= 1 && assetWizard.state.itemTypeSuggestions.length > 0) {
									assetWizard.actions.setField("showItemTypeSuggestions", true);
								}
							}}
							onFieldChange={(field, value) => assetWizard.actions.setField(field as any, value)}
							onPhotoUpload={handleAssetPhotoUpload}
							onAddAsset={handleAddAsset}
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
							onDeleteAsset={handleDeleteAsset}
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

			{/* Depreciation Results Modal */}
			<DepreciationModal
				showDepreciationModal={showDepreciationModal}
				depreciationResults={depreciationResults}
				financialYear={financialYear}
				onClose={() => setShowDepreciationModal(false)}
				formatCurrency={formatCurrency}
			/>
		</div>
	);
}
