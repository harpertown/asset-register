

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import React from "react";
import { apiService } from "~/services/api";
import { calculateDepreciationSchedule, calculateDepreciationScheduleFromHistory, calculateCategorySummary } from "~/services/depreciationService";
import type { Register, Transaction } from "~/types";
import type { DepreciationSchedule, CategorySummary } from "~/services/depreciationService";
import { formatCurrency, currencyCellStyle, calculateFinancialPeriod, formatDate, formatPriceInput, parsePriceInput } from "~/utils";
import { ASSET_CATEGORIES } from "~/constants";

export function meta() {
	return [
		{ title: "All Assets" },
		{ name: "description", content: "Asset Register - All Assets" },
	];
}

export default function Transactions() {
	const { registerId } = useParams<{ registerId: string }>();
	const navigate = useNavigate();

	// Delete a report by index
	const handleDeleteReport = (index: number) => {
		setGeneratedReports(prev => prev.filter((_, i) => i !== index));
		// Also reset compare selection if needed
		setCompareReport1(prev => (prev === index ? null : prev && prev > index ? prev - 1 : prev));
		setCompareReport2(prev => (prev === index ? null : prev && prev > index ? prev - 1 : prev));
	};

	// Declare transactions state before any reference
	const [transactions, setTransactions] = useState<Transaction[]>([]);

	// Helper: Map assetGuid to Transaction for label lookup
	const assetLabelMap = useMemo(() => {
		const map = new Map<string, { category: string; description: string }>();
		transactions.forEach(tx => {
			if (tx.assetGuid) {
				   map.set(tx.assetGuid, {
					   category: tx.assetCategory || "",
					   description: tx.assetDescription || ""
				   });
			}
		});
		return map;
	}, [transactions]);

	function getAssetLabel(assetGuid: string) {
		const entry = assetLabelMap.get(assetGuid);
		if (!entry) return assetGuid;
		return `${entry.category} - ${entry.description}`;
	}

	const formatDeduction = (amount: number) => {
		if (!amount) return "-";
		return `(${formatCurrency(Math.abs(amount))})`;
	};

	const formatSignedCurrency = (amount: number) => {
		if (!amount) return "-";
		if (amount < 0) return `(${formatCurrency(Math.abs(amount))})`;
		return formatCurrency(amount);
	};

	const getFyMonthLabel = (monthIndex: number) => {
		// FY runs April (Month One) to March (Month Twelve)
		const endYear = Number(financialYear);
		const startYear = endYear - 1;
		const year = monthIndex < 9 ? startYear : endYear;
		const monthNames = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
		return `${monthNames[monthIndex]}-${String(year).slice(-2)}`;
	};
	const [register, setRegister] = useState<Register | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [registerIndex, setRegisterIndex] = useState<number | null>(null);

	// Fix issues modal state
	const [editingAsset, setEditingAsset] = useState<Transaction | null>(null);
	const [editPurchasePrice, setEditPurchasePrice] = useState("");
	const [editPurchaseDate, setEditPurchaseDate] = useState("");
	const [depnMethodAcc, setDepnMethodAcc] = useState("");
	const [depnRateAcc, setDepnRateAcc] = useState("");
	const [depnMethodTax, setDepnMethodTax] = useState("");
	const [depnRateTax, setDepnRateTax] = useState("");

	// Exemption process modal state
	const [showExemptionModal, setShowExemptionModal] = useState(false);
	const [exemptionSearchQuery, setExemptionSearchQuery] = useState("");
	const [selectedExemptionAsset, setSelectedExemptionAsset] = useState<Transaction | null>(null);
	const [selectedExemptionType, setSelectedExemptionType] = useState<string | null>(null);
	const [exemptionEffectiveDate, setExemptionEffectiveDate] = useState(() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
	});
	const [exemptionNote, setExemptionNote] = useState("");
	const [exemptionNewValue, setExemptionNewValue] = useState("");
	const [exemptionDepnMethodAcc, setExemptionDepnMethodAcc] = useState("");
	const [exemptionDepnRateAcc, setExemptionDepnRateAcc] = useState("");
	const [exemptionDepnMethodTax, setExemptionDepnMethodTax] = useState("");
	const [exemptionDepnRateTax, setExemptionDepnRateTax] = useState("");
	const [exemptionCategory, setExemptionCategory] = useState("");
	const [showExemptionConfirm, setShowExemptionConfirm] = useState(false);
	const [isSavingExemption, setIsSavingExemption] = useState(false);

	// Sorting state for main assets table
	const [sortColumn, setSortColumn] = useState<string | null>("assetId");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

	// Sorting state for FY Working view
	const [fySortColumn, setFySortColumn] = useState<string | null>("assetId");
	const [fySortDirection, setFySortDirection] = useState<"asc" | "desc">("asc");

	// Depreciation calculation state
	const [showDepreciationModal, setShowDepreciationModal] = useState(false);
	const [depreciationResults, setDepreciationResults] = useState<(DepreciationSchedule | CategorySummary)[]>([]);
	const [generatedReports, setGeneratedReports] = useState<{ timestamp: string; versionIds: string }[]>(() => {
		// Load from localStorage on initial render
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem(`assetReports_${registerId}`);
			if (stored) {
				try {
					return JSON.parse(stored);
				} catch {
					return [];
				}
			}
		}
		return [];
	});
	const [compareReport1, setCompareReport1] = useState<number | null>(null);
	const [compareReport2, setCompareReport2] = useState<number | null>(null);
	const [showCompareModal, setShowCompareModal] = useState(false);
	const [financialYear, setFinancialYear] = useState(() => {
		// Calculate current financial year dynamically (NZ FY ends March 31)
		const now = new Date();
		const currentYear = now.getFullYear();
		const currentMonth = now.getMonth() + 1; // 1-12
		return currentMonth >= 4 ? String(currentYear + 1) : String(currentYear);
	});
	const [depreciationType, setDepreciationType] = useState<"working" | "register">("working");

	// Pre-filter depreciation results once to avoid repeated filtering in render
	// For FY Working view (month-by-month schedules)
	const scheduleAccountingResults = useMemo((): DepreciationSchedule[] => 
		depreciationType === "working" 
			? (depreciationResults.filter(r => r.calcType === "accounting") as DepreciationSchedule[])
			: [],
		[depreciationResults, depreciationType]
	);
	const scheduleTaxResults = useMemo((): DepreciationSchedule[] => 
		depreciationType === "working"
			? (depreciationResults.filter(r => r.calcType === "tax") as DepreciationSchedule[])
			: [],
		[depreciationResults, depreciationType]
	);
	// For FY Register view (category summaries)
	const summaryAccountingResults = useMemo((): CategorySummary[] => 
		depreciationType === "register"
			? (depreciationResults.filter(r => r.calcType === "accounting") as CategorySummary[])
			: [],
		[depreciationResults, depreciationType]
	);
	const summaryTaxResults = useMemo((): CategorySummary[] => 
		depreciationType === "register"
			? (depreciationResults.filter(r => r.calcType === "tax") as CategorySummary[])
			: [],
		[depreciationResults, depreciationType]
	);

	// Sort handler for main assets table
	const handleSort = (column: string) => {
		if (sortColumn === column) {
			setSortDirection(d => d === "asc" ? "desc" : "asc");
		} else {
			setSortColumn(column);
			setSortDirection("asc");
		}
	};

	// Sort handler for FY Working view
	const handleFySort = (column: string) => {
		if (fySortColumn === column) {
			setFySortDirection(d => d === "asc" ? "desc" : "asc");
		} else {
			setFySortColumn(column);
			setFySortDirection("asc");
		}
	};

	// Sorted transactions for main table
	const sortedTransactions = useMemo(() => {
		if (!sortColumn) return transactions;
		return [...transactions].sort((a, b) => {
			let aVal: any = a[sortColumn as keyof Transaction];
			let bVal: any = b[sortColumn as keyof Transaction];
			// Handle incomplete status specially
			if (sortColumn === "incomplete") {
				aVal = a.incomplete ? 1 : 0;
				bVal = b.incomplete ? 1 : 0;
			}
			if (aVal == null) aVal = "";
			if (bVal == null) bVal = "";
			if (typeof aVal === "number" && typeof bVal === "number") {
				return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
			}
			const aStr = String(aVal).toLowerCase();
			const bStr = String(bVal).toLowerCase();
			return sortDirection === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
		});
	}, [transactions, sortColumn, sortDirection]);

	// Sorted FY Working results
	const sortedScheduleAccountingResults = useMemo(() => {
		if (!fySortColumn) return scheduleAccountingResults;
		return [...scheduleAccountingResults].sort((a, b) => {
			let aVal: any = a[fySortColumn as keyof DepreciationSchedule];
			let bVal: any = b[fySortColumn as keyof DepreciationSchedule];
			if (aVal == null) aVal = "";
			if (bVal == null) bVal = "";
			if (typeof aVal === "number" && typeof bVal === "number") {
				return fySortDirection === "asc" ? aVal - bVal : bVal - aVal;
			}
			const aStr = String(aVal).toLowerCase();
			const bStr = String(bVal).toLowerCase();
			return fySortDirection === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
		});
	}, [scheduleAccountingResults, fySortColumn, fySortDirection]);

	const sortedScheduleTaxResults = useMemo(() => {
		if (!fySortColumn) return scheduleTaxResults;
		return [...scheduleTaxResults].sort((a, b) => {
			let aVal: any = a[fySortColumn as keyof DepreciationSchedule];
			let bVal: any = b[fySortColumn as keyof DepreciationSchedule];
			if (aVal == null) aVal = "";
			if (bVal == null) bVal = "";
			if (typeof aVal === "number" && typeof bVal === "number") {
				return fySortDirection === "asc" ? aVal - bVal : bVal - aVal;
			}
			const aStr = String(aVal).toLowerCase();
			const bStr = String(bVal).toLowerCase();
			return fySortDirection === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
		});
	}, [scheduleTaxResults, fySortColumn, fySortDirection]);

	// Sortable header component
	const SortableHeader = ({ column, label, sort, direction, onSort, className = "" }: {
		column: string;
		label: string;
		sort: string | null;
		direction: "asc" | "desc";
		onSort: (col: string) => void;
		className?: string;
	}) => (
		<th 
			className={`px-4 py-3 font-medium text-gray-900 cursor-pointer hover:bg-gray-100 select-none ${className}`}
			onClick={() => onSort(column)}
		>
			<div className="flex items-center gap-1">
				{label}
				<span className="text-gray-400 text-xs">
					{sort === column ? (direction === "asc" ? "▲" : "▼") : "○"}
				</span>
			</div>
		</th>
	);

	const loadData = useCallback(async () => {
		try {
			setIsLoading(true);
			const registers = await apiService.getRegisters();
			const idx = registers.findIndex((r) => r.id === registerId);
			const found = registers[idx];
			if (!found) {
				setError("Register not found");
				return;
			}
			setRegisterIndex(idx);
			setRegister(found);
			const txs: Transaction[] = [];
			found.rooms.forEach((room) => {
				room.assets.forEach((asset) => {
					let cat = asset.itemType;
					let desc = asset.name + (asset.serialNumber ? ` (${asset.serialNumber})` : "");
					if (asset.name === "Land") {
						cat = "Land (freehold)";
						desc = found.address;
					} else if (asset.name === "Buildings") {
						cat = "Building structure";
						desc = `Building at ${found.address}`;
					}
					const fp = calculateFinancialPeriod(asset.purchaseDate);
					// Check if missing depreciation settings
					const missingDepreciation = !asset.depnMethodAcc || !asset.depnRateAcc || !asset.depnMethodTax || !asset.depnRateTax;
					txs.push({
						id: asset.id,
						roomId: room.id,
						assetId: asset.assetId || "",
						assetGuid: asset.assetGuid || asset.id,
						versionId: asset.versionId || asset.id,
						itemType: asset.itemType,
						assetCategory: cat,
						assetDescription: desc,
						recordDate: formatDate(asset.purchaseDate),
						effectiveDate: formatDate(asset.purchaseDate),
						purchaseDate: asset.purchaseDate || "", // raw ISO date for editing
						financialMonth: fp.month,
						financialYear: fp.year,
						purchasePrice: asset.purchasePrice,
						depnMethodAcc: asset.depnMethodAcc,
						depnRateAcc: asset.depnRateAcc,
						depnMethodTax: asset.depnMethodTax,
						depnRateTax: asset.depnRateTax,
						incomplete: asset.incomplete || missingDepreciation,
					});
				});
			});
			setTransactions(txs);
		} catch (err) {
			console.error("Failed to load data:", err);
			setError("Failed to load data");
		} finally {
			setIsLoading(false);
		}
	}, [registerId]);

	useEffect(() => {
		const onFocus = () => loadData();
		window.addEventListener("focus", onFocus);
		return () => window.removeEventListener("focus", onFocus);
	}, [loadData]);

	useEffect(() => { loadData(); }, [loadData]);

	// Persist generated reports to localStorage
	useEffect(() => {
		if (registerId) {
			localStorage.setItem(`assetReports_${registerId}`, JSON.stringify(generatedReports));
		}
	}, [registerId, generatedReports]);

	const openFixIssuesModal = (tx: Transaction) => {
		setEditingAsset(tx);
		setEditPurchasePrice(tx.purchasePrice?.toString() || "");
		setEditPurchaseDate(tx.purchaseDate || ""); // use raw ISO date
		setDepnMethodAcc(tx.depnMethodAcc || "SL");
		setDepnRateAcc(tx.depnRateAcc || "");
		setDepnMethodTax(tx.depnMethodTax || "DV");
		setDepnRateTax(tx.depnRateTax || "");
	};

	const closeFixIssuesModal = () => {
		setEditingAsset(null);
		setEditPurchasePrice("");
		setEditPurchaseDate("");
		setDepnMethodAcc("");
		setDepnRateAcc("");
		setDepnMethodTax("");
		setDepnRateTax("");
	};

	const handleSaveFixIssues = async () => {
		if (!editingAsset) return;
		
		try {
			const price = parseFloat(editPurchasePrice) || 0;
			
			// Check what's still missing after save
			const stillMissingInfo = !price || !editPurchaseDate || !depnRateAcc || !depnRateTax;
			
			await apiService.updateAsset({
				id: editingAsset.id,
				purchasePrice: price,
				purchaseDate: editPurchaseDate,
				depnMethodAcc,
				depnRateAcc,
				depnMethodTax,
				depnRateTax,
				incomplete: stillMissingInfo,
			});
			
			// Reload to reflect changes
			await loadData();
			closeFixIssuesModal();
		} catch (err) {
			console.error("Failed to save asset:", err);
		}
	};

	const handleFYWorking = async () => {
		if (!register) return;
		setDepreciationType("working");
		const allAssets = register.rooms.flatMap((room) => room.assets);
		try {
			const histories = await Promise.all(
				allAssets.map(async (asset) => {
					try {
						const result = await apiService.getAssetVersions(asset.id);
						return result.versions.length > 0 ? result.versions : [asset];
					} catch {
						return [asset];
					}
				})
			);
			const accResults = histories.map((versions) =>
				calculateDepreciationScheduleFromHistory(versions, "working", financialYear)
			);
			const taxResults = histories.map((versions) =>
				calculateDepreciationScheduleFromHistory(versions, "register", financialYear)
			);
			setDepreciationResults([...accResults, ...taxResults]);
			setShowDepreciationModal(true);
		} catch (err) {
			console.error("Failed to calculate FY Working:", err);
		}
	};

	const handleFYRegister = () => {
		if (!register) return;
		setDepreciationType("register");
		// Calculate summary by asset category for FY Register
		const categories = ["Land", "Buildings", "Plant and equipment", "Vehicles", "Computer software"];
		const allAssets = register.rooms.flatMap((room) => room.assets);
		
		const accResults = calculateCategorySummary(allAssets, categories, "working");
		const taxResults = calculateCategorySummary(allAssets, categories, "register");
		
		// Combine both results
		setDepreciationResults([...accResults, ...taxResults]);
		setShowDepreciationModal(true);
	};

	// Exemption process handlers
	const openExemptionModal = () => {
		setShowExemptionModal(true);
		setExemptionSearchQuery("");
		setSelectedExemptionAsset(null);
		setSelectedExemptionType(null);
		const now = new Date();
		setExemptionEffectiveDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
		setExemptionNote("");
		setExemptionNewValue("");
		setExemptionDepnMethodAcc("");
		setExemptionDepnRateAcc("");
		setExemptionDepnMethodTax("");
		setExemptionDepnRateTax("");
		setExemptionCategory("");
		setShowExemptionConfirm(false);
	};

	const closeExemptionModal = () => {
		setShowExemptionModal(false);
		setExemptionSearchQuery("");
		setSelectedExemptionAsset(null);
		setSelectedExemptionType(null);
		const now = new Date();
		setExemptionEffectiveDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
		setExemptionNote("");
		setExemptionNewValue("");
		setExemptionDepnMethodAcc("");
		setExemptionDepnRateAcc("");
		setExemptionDepnMethodTax("");
		setExemptionDepnRateTax("");
		setExemptionCategory("");
		setShowExemptionConfirm(false);
	};

	const valueChangeTypeIds = ["Revaluation", "Impairment", "Improvement"] as const;
	const methodChangeTypeId = "Change depn method";
	const categoryChangeTypeId = "Reclassify asset category";
	const isValueChangeTypeId = (type?: string | null) => Boolean(type && valueChangeTypeIds.includes(type as any));

	const normalizeValueInput = (value: string) => {
		const cleaned = value.replace(/[^0-9.]/g, "");
		const [whole, ...rest] = cleaned.split(".");
		if (rest.length === 0) return whole;
		return `${whole}.${rest.join("")}`;
	};

	const selectExemptionAsset = (tx: Transaction) => {
		setSelectedExemptionAsset(tx);
		setExemptionSearchQuery("");
	};

	const selectExemptionType = (type: string) => {
		setSelectedExemptionType(type);
		setExemptionNote("");
		if (isValueChangeTypeId(type)) {
			const currentValue = selectedExemptionAsset?.purchasePrice;
			setExemptionNewValue(currentValue !== undefined && currentValue !== null ? String(currentValue) : "");
		} else {
			setExemptionNewValue("");
		}
		if (type === methodChangeTypeId) {
			setExemptionDepnMethodAcc(selectedExemptionAsset?.depnMethodAcc || "");
			setExemptionDepnRateAcc(selectedExemptionAsset?.depnRateAcc || "");
			setExemptionDepnMethodTax(selectedExemptionAsset?.depnMethodTax || "");
			setExemptionDepnRateTax(selectedExemptionAsset?.depnRateTax || "");
		} else {
			setExemptionDepnMethodAcc("");
			setExemptionDepnRateAcc("");
			setExemptionDepnMethodTax("");
			setExemptionDepnRateTax("");
		}
		if (type === categoryChangeTypeId) {
			setExemptionCategory(selectedExemptionAsset?.itemType || "");
		} else {
			setExemptionCategory("");
		}
		setShowExemptionConfirm(true);
	};

	const filteredExemptionAssets = useMemo(() => {
		if (!exemptionSearchQuery.trim()) return [];
		const query = exemptionSearchQuery.toLowerCase();
		return transactions.filter(tx => 
			tx.assetDescription.toLowerCase().includes(query) ||
			tx.assetId?.toLowerCase().includes(query) ||
			tx.assetCategory.toLowerCase().includes(query)
		).slice(0, 10); // Limit to 10 results
	}, [transactions, exemptionSearchQuery]);

	const exemptionTypes = [
		{ id: "Disposal", label: "Disposal", description: "Asset has been sold or scrapped" },
		{ id: "Revaluation", label: "Revaluation", description: "Change in value with reason" },
		{ id: "Impairment", label: "Impairment", description: "Reduction in value with reason" },
		{ id: "Improvement", label: "Improvement", description: "Increase in value with reason" },
		{ id: "Marked unavailable for use", label: "Marked unavailable for use", description: "Asset is temporarily unavailable" },
		{ id: "Marked available for use", label: "Marked available for use", description: "Asset is available for use again" },
		{ id: "Change depn method", label: "Change depn method", description: "Depreciation method change" },
		{ id: "Reclassify asset category", label: "Reclassify asset category", description: "Asset category reclassification" },
	];

	const isValueChangeType = isValueChangeTypeId(selectedExemptionType);
	const isMethodChangeType = selectedExemptionType === methodChangeTypeId;
	const isCategoryChangeType = selectedExemptionType === categoryChangeTypeId;
	const categoryOptions = useMemo(() => {
		const options = [...ASSET_CATEGORIES];
		if (exemptionCategory && !options.includes(exemptionCategory)) {
			options.unshift(exemptionCategory);
		}
		return options;
	}, [exemptionCategory]);
	const currentAssetValue = selectedExemptionAsset?.purchasePrice ?? 0;
	const parsedNewValue = isValueChangeType ? parseFloat(exemptionNewValue) : 0;
	const hasValidNewValue = !isValueChangeType || !Number.isNaN(parsedNewValue);
	const meetsValueRule = !isValueChangeType
		? true
		: selectedExemptionType === "Revaluation"
		? parsedNewValue !== currentAssetValue
		: selectedExemptionType === "Impairment"
		? parsedNewValue < currentAssetValue
		: selectedExemptionType === "Improvement"
		? parsedNewValue > currentAssetValue
		: true;
	const hasValidNote = !isValueChangeType || exemptionNote.trim().length > 0;
	const hasMethodValues =
		!isMethodChangeType ||
		Boolean(exemptionDepnMethodAcc || exemptionDepnMethodTax || exemptionDepnRateAcc || exemptionDepnRateTax);
	const hasCategoryValue = !isCategoryChangeType || exemptionCategory.trim().length > 0;
	const hasEffectiveDate = Boolean(exemptionEffectiveDate);
	const canConfirmExemption =
		hasEffectiveDate &&
		hasValidNewValue &&
		meetsValueRule &&
		hasValidNote &&
		hasMethodValues &&
		hasCategoryValue &&
		!isSavingExemption;

	const handleConfirmExemption = async () => {
		if (!selectedExemptionAsset || !selectedExemptionType) return;
		if (!canConfirmExemption) return;
		
		setIsSavingExemption(true);
		try {
			const updates: any = {
				exemptionType: selectedExemptionType,
				effectiveFrom: exemptionEffectiveDate,
			};

			if (isValueChangeType) {
				updates.purchasePrice = parsedNewValue;
				updates.exemptionNote = exemptionNote.trim();
			}
			if (isMethodChangeType) {
				if (exemptionDepnMethodAcc !== "") updates.depnMethodAcc = exemptionDepnMethodAcc;
				if (exemptionDepnRateAcc !== "") updates.depnRateAcc = exemptionDepnRateAcc;
				if (exemptionDepnMethodTax !== "") updates.depnMethodTax = exemptionDepnMethodTax;
				if (exemptionDepnRateTax !== "") updates.depnRateTax = exemptionDepnRateTax;
			}
			if (isCategoryChangeType) {
				updates.itemType = exemptionCategory.trim();
			}
			
			await apiService.createAssetVersion(selectedExemptionAsset.id, updates);
			
			// Reload to reflect changes
			await loadData();
			closeExemptionModal();
		} catch (err) {
			console.error("Failed to create asset version:", err);
		} finally {
			setIsSavingExemption(false);
		}
	};

	const handleGenerateReport = () => {
		// Only output versionId for each asset
		const versionIds = transactions.map(tx => tx.versionId).join("/");
		const timestamp = new Date().toLocaleString();
		setGeneratedReports(prev => [...prev, { timestamp, versionIds }]);
	};

	const handleCompareReports = () => {
		if (compareReport1 !== null && compareReport2 !== null) {
			setShowCompareModal(true);
		}
	};

	const getComparisonResults = () => {
		if (compareReport1 === null || compareReport2 === null) return { changed: [], added: [], removed: [] };

		const report1 = generatedReports[compareReport1];
		const report2 = generatedReports[compareReport2];

		// Parse reports into arrays of versionIds
		const parseReport = (report: string) => report.split("/").filter(Boolean);

		const versionIds1 = parseReport(report1.versionIds);
		const versionIds2 = parseReport(report2.versionIds);

		// Map versionId to assetGuid for lookup
		const versionToAssetGuid = new Map<string, string>();
		transactions.forEach(tx => {
			if (tx.versionId && tx.assetGuid) {
				versionToAssetGuid.set(tx.versionId, tx.assetGuid);
			}
		});

		// Find changed (in both, but different assetGuid), added (in 2 not 1), removed (in 1 not 2)
		const set1 = new Set(versionIds1);
		const set2 = new Set(versionIds2);

		// Changed: versionId in both, but assetGuid differs (shouldn't happen if versionId is unique per asset, but keep for robustness)
		const changed: { assetGuid: string; version1: string; version2: string }[] = [];
		// Added: versionId in 2 not 1
		const added: { assetGuid: string; versionId: string }[] = [];
		// Removed: versionId in 1 not 2
		const removed: { assetGuid: string; versionId: string }[] = [];

		// For this app, treat added/removed as versionId + assetGuid
		versionIds1.forEach(versionId => {
			if (!set2.has(versionId)) {
				removed.push({ assetGuid: versionToAssetGuid.get(versionId) || versionId, versionId });
			}
		});
		versionIds2.forEach(versionId => {
			if (!set1.has(versionId)) {
				added.push({ assetGuid: versionToAssetGuid.get(versionId) || versionId, versionId });
			}
		});

		// No real 'changed' in this model, but keep for compatibility
		return { changed, added, removed };
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-[#f5f1e8] flex flex-col items-center justify-center py-8 px-4">
				<div className="text-gray-500">Loading assets...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-[#f5f1e8] flex flex-col items-center justify-center py-8 px-4">
				<div className="text-red-600">{error}</div>
				<button
					onClick={() => navigate(`/?register=${registerId}`)}
					className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
				>
					Back
				</button>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#f5f1e8] flex flex-col items-center py-8 px-4">
			<div className="w-full max-w-6xl">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-gray-900">All Assets</h1>
						<p className="text-gray-600">{register?.address}</p>
					</div>
					<div className="flex gap-2">
						<button onClick={() => loadData()} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
							Refresh
						</button>
						<button onClick={openExemptionModal} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
							Exemption Process
						</button>
						<button onClick={handleFYWorking} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
							FY Working
						</button>
						<button onClick={handleFYRegister} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
							FY Register
						</button>
						<button onClick={() => navigate(`/?register=${registerId}`)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
							Back
						</button>
					</div>
				</div>
				{transactions.length === 0 ? (
					<div className="text-center py-12 text-gray-500">No assets found for this register.</div>
				) : (
					<div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
						<table className="w-full text-sm text-left bg-white">
							<thead className="bg-gray-50 border-b border-gray-200">
								<tr>
									<SortableHeader column="incomplete" label="Status" sort={sortColumn} direction={sortDirection} onSort={handleSort} />
									<SortableHeader column="assetId" label="Asset ID" sort={sortColumn} direction={sortDirection} onSort={handleSort} />
									<SortableHeader column="assetCategory" label="Asset category" sort={sortColumn} direction={sortDirection} onSort={handleSort} />
									<SortableHeader column="assetDescription" label="Asset description" sort={sortColumn} direction={sortDirection} onSort={handleSort} />
									<SortableHeader column="purchasePrice" label="Purchase Price" sort={sortColumn} direction={sortDirection} onSort={handleSort} />
									<SortableHeader column="depnMethodAcc" label="Acc Method" sort={sortColumn} direction={sortDirection} onSort={handleSort} />
									<SortableHeader column="depnRateAcc" label="Acc Rate" sort={sortColumn} direction={sortDirection} onSort={handleSort} />
									<SortableHeader column="depnMethodTax" label="Tax Method" sort={sortColumn} direction={sortDirection} onSort={handleSort} />
									<SortableHeader column="depnRateTax" label="Tax Rate" sort={sortColumn} direction={sortDirection} onSort={handleSort} />
									<th className="px-4 py-3 font-medium text-gray-900">Actions</th>
								</tr>
							</thead>
							<tbody>
								{sortedTransactions.map((tx, i) => {
									const missingDepreciation = !tx.depnMethodAcc || !tx.depnRateAcc || !tx.depnMethodTax || !tx.depnRateTax;
									const missingInfo = !tx.purchasePrice || !tx.effectiveDate;
									const hasIssues = tx.incomplete || missingDepreciation;
									
									// Build list of what's missing
									const missingItems: string[] = [];
									if (!tx.purchasePrice) missingItems.push("value");
									if (!tx.effectiveDate) missingItems.push("date");
									if (missingDepreciation) missingItems.push("depreciation");
									
									return (
										<tr key={i} className={`border-b border-gray-100 hover:bg-gray-50 ${hasIssues ? "bg-amber-50" : ""}`}>
											<td className="px-4 py-3">
												{hasIssues ? (
													<div className="flex flex-col gap-1">
														<span className="inline-flex items-center gap-1 text-amber-700">
															<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
															</svg>
															<span className="text-xs">Incomplete</span>
														</span>
														{missingItems.length > 0 && (
															<span className="text-xs text-amber-600">Missing: {missingItems.join(", ")}</span>
														)}
													</div>
												) : (
													<span className="inline-flex items-center gap-1 text-green-700">
														<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
														</svg>
														<span className="text-xs">Complete</span>
													</span>
												)}
											</td>
											<td className="px-4 py-3 text-gray-900">{tx.assetId || "-"}</td>
											<td className="px-4 py-3 text-gray-900">{tx.assetCategory}</td>
											<td className="px-4 py-3 text-gray-900">{tx.assetDescription}</td>
											<td className="px-4 py-3 text-gray-900">{formatCurrency(tx.purchasePrice)}</td>
											<td className={`px-4 py-3 ${!tx.depnMethodAcc ? "text-amber-600" : "text-gray-900"}`}>
												{tx.depnMethodAcc || "-"}
											</td>
											<td className={`px-4 py-3 ${!tx.depnRateAcc ? "text-amber-600" : "text-gray-900"}`}>
												{tx.depnRateAcc ? `${tx.depnRateAcc}%` : "-"}
											</td>
											<td className={`px-4 py-3 ${!tx.depnMethodTax ? "text-amber-600" : "text-gray-900"}`}>
												{tx.depnMethodTax || "-"}
											</td>
											<td className={`px-4 py-3 ${!tx.depnRateTax ? "text-amber-600" : "text-gray-900"}`}>
												{tx.depnRateTax ? `${tx.depnRateTax}%` : "-"}
											</td>
											<td className="px-4 py-3">
												<button
													onClick={() => openFixIssuesModal(tx)}
													className={`px-3 py-1 text-xs rounded ${
														hasIssues
															? "bg-amber-600 text-white hover:bg-amber-700"
															: "border border-gray-300 text-gray-700 hover:bg-gray-50"
													}`}
												>
													{hasIssues ? "Fix Issues" : "Edit"}
												</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}

				{/* Fix Issues Modal */}
				{editingAsset && (
					<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
						<div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-xl font-semibold text-gray-900">
									Fix Asset Issues
								</h2>
								<button
									onClick={closeFixIssuesModal}
									className="text-gray-400 hover:text-gray-600"
								>
									<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>

							<div className="mb-4 p-3 bg-gray-50 rounded-lg">
								<p className="text-sm text-gray-600">
									<span className="font-medium">Asset:</span> {editingAsset.assetDescription}
								</p>
								<p className="text-sm text-gray-600">
									<span className="font-medium">Category:</span> {editingAsset.assetCategory}
								</p>
							</div>

							<div className="space-y-4">
								{/* Purchase Information */}
								<div className={`border rounded-lg p-4 ${!editingAsset.purchasePrice || !editingAsset.effectiveDate ? 'border-amber-300 bg-amber-50' : ''}`}>
									<h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
										Purchase Information
										{(!editingAsset.purchasePrice || !editingAsset.effectiveDate) && (
											<span className="text-xs text-amber-600 font-normal">(Missing)</span>
										)}
									</h3>
									<div className="grid grid-cols-2 gap-3">
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												Purchase Price
											</label>
											<input
												type="text"
												inputMode="decimal"
												value={formatPriceInput(editPurchasePrice)}
												onChange={(e) => {
													const raw = parsePriceInput(e.target.value);
													if (/^\d*\.?\d*$/.test(raw)) {
														setEditPurchasePrice(raw);
													}
												}}
												placeholder="0.00"
												className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white ${!editPurchasePrice ? 'border-amber-300' : 'border-gray-300'}`}
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												Purchase Date
											</label>
											<input
												type="date"
												value={editPurchaseDate}
												onChange={(e) => setEditPurchaseDate(e.target.value)}
												className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white ${!editPurchaseDate ? 'border-amber-300' : 'border-gray-300'}`}
											/>
										</div>
									</div>
								</div>

								{/* Accounting Depreciation */}
								<div className={`border rounded-lg p-4 ${!editingAsset.depnRateAcc ? 'border-amber-300 bg-amber-50' : ''}`}>
									<h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
										Accounting Depreciation
										{!editingAsset.depnRateAcc && (
											<span className="text-xs text-amber-600 font-normal">(Missing)</span>
										)}
									</h3>
									<div className="grid grid-cols-2 gap-3">
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												Method
											</label>
											<select
												value={depnMethodAcc}
												onChange={(e) => setDepnMethodAcc(e.target.value)}
												className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
											>
												<option value="SL">Straight-line</option>
												<option value="DV">Diminishing value</option>
												<option value="LV">Low-value write-off</option>
												<option value="ND">Non-depreciable</option>
											</select>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												Rate (%)
											</label>
											<input
												type="number"
												value={depnRateAcc}
												onChange={(e) => setDepnRateAcc(e.target.value)}
												placeholder="e.g., 10"
												step="0.01"
												min="0"
												max="100"
												className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white ${!depnRateAcc ? 'border-amber-300' : 'border-gray-300'}`}
											/>
										</div>
									</div>
								</div>

								{/* Tax Depreciation */}
								<div className={`border rounded-lg p-4 ${!editingAsset.depnRateTax ? 'border-amber-300 bg-amber-50' : ''}`}>
									<h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
										Tax Depreciation
										{!editingAsset.depnRateTax && (
											<span className="text-xs text-amber-600 font-normal">(Missing)</span>
										)}
									</h3>
									<div className="grid grid-cols-2 gap-3">
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												Method
											</label>
											<select
												value={depnMethodTax}
												onChange={(e) => setDepnMethodTax(e.target.value)}
												className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
											>
												<option value="SL">Straight-line</option>
												<option value="DV">Diminishing value</option>
												<option value="LV">Low-value write-off</option>
												<option value="ND">Non-depreciable</option>
											</select>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												Rate (%)
											</label>
											<input
												type="number"
												value={depnRateTax}
												onChange={(e) => setDepnRateTax(e.target.value)}
												placeholder="e.g., 13.5"
												step="0.01"
												min="0"
												max="100"
												className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white ${!depnRateTax ? 'border-amber-300' : 'border-gray-300'}`}
											/>
										</div>
									</div>
								</div>
							</div>

							<div className="flex gap-3 justify-end mt-6">
								<button
									onClick={closeFixIssuesModal}
									className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
								>
									Cancel
								</button>
								<button
									onClick={handleSaveFixIssues}
									className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
								>
									Save
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Exemption Process Modal */}
				{showExemptionModal && (
					<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
						<div className="bg-white rounded-lg p-6 shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto min-h-[400px]">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-xl font-semibold text-gray-900">
									Exemption Process
								</h2>
								<button
									onClick={closeExemptionModal}
									className="text-gray-400 hover:text-gray-600"
								>
									<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>

							{/* Step 1: Search and select asset */}
							{!selectedExemptionAsset && (
								<div>
									<p className="text-sm text-gray-600 mb-3">
										Search for an asset to process:
									</p>
									<div className="relative">
										<input
											type="text"
											value={exemptionSearchQuery}
											onChange={(e) => setExemptionSearchQuery(e.target.value)}
											placeholder="Search by name, ID, or category..."
											className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
											autoFocus
										/>
										{filteredExemptionAssets.length > 0 && (
											<div className="w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
												{filteredExemptionAssets.map((tx) => (
													<button
														key={tx.id}
														onClick={() => selectExemptionAsset(tx)}
														className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
													>
														<div className="font-medium text-gray-900">{tx.assetDescription}</div>
														<div className="text-sm text-gray-500">
															{tx.assetId && <span className="mr-3">ID: {tx.assetId}</span>}
															<span>{tx.assetCategory}</span>
														</div>
													</button>
												))}
											</div>
										)}
									</div>
									{exemptionSearchQuery && filteredExemptionAssets.length === 0 && (
										<p className="text-sm text-gray-500 mt-2">No assets found matching "{exemptionSearchQuery}"</p>
									)}
								</div>
							)}

							{/* Step 2: Select exemption type */}
							{selectedExemptionAsset && !showExemptionConfirm && (
								<div>
									<div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
										<div className="flex items-center justify-between">
											<div>
												<p className="font-medium text-gray-900">{selectedExemptionAsset.assetDescription}</p>
												<p className="text-sm text-gray-600">{selectedExemptionAsset.assetCategory}</p>
												{selectedExemptionAsset.assetId && (
													<p className="text-sm text-gray-500">ID: {selectedExemptionAsset.assetId}</p>
												)}
											</div>
											<button
												onClick={() => setSelectedExemptionAsset(null)}
												className="text-amber-600 hover:text-amber-700 text-sm"
											>
												Change
											</button>
										</div>
									</div>

									<p className="text-sm text-gray-600 mb-4">
										Select the type of exemption to create a new version:
									</p>

									<div className="space-y-2">
										{exemptionTypes.map((type) => (
											<button
												key={type.id}
												onClick={() => selectExemptionType(type.id)}
												className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-amber-300 transition-colors"
											>
												<div className="font-medium text-gray-900">{type.label}</div>
												<div className="text-sm text-gray-500">{type.description}</div>
											</button>
										))}
									</div>
								</div>
							)}

							{/* Step 3: Confirmation dialog */}
							{showExemptionConfirm && selectedExemptionAsset && selectedExemptionType && (
								<div>
									<div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
										<h3 className="font-medium text-gray-900 mb-2">Confirm New Version</h3>
										<div className="space-y-2 text-sm">
											<p><span className="text-gray-600">Asset:</span> <span className="font-medium text-gray-900">{selectedExemptionAsset.assetDescription}</span></p>
											{selectedExemptionAsset.assetId && (
												<p><span className="text-gray-600">Asset ID:</span> <span className="font-medium text-gray-900">{selectedExemptionAsset.assetId}</span></p>
											)}
											<p><span className="text-gray-600">Exemption Type:</span> <span className="font-medium text-amber-700">{selectedExemptionType}</span></p>
										</div>
									</div>

									<div className="mb-4">
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Effective Date
										</label>
										<input
											type="date"
											value={exemptionEffectiveDate}
											onChange={(e) => setExemptionEffectiveDate(e.target.value)}
											className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
										/>
									</div>

									{isValueChangeType && (
										<div className="mb-4">
											<label className="block text-sm font-medium text-gray-700 mb-1">
												New Value
											</label>
											<p className="text-xs text-gray-500 mb-1">
												Current value: {formatCurrency(currentAssetValue)}
											</p>
											<input
												type="text"
												inputMode="decimal"
												value={formatPriceInput(exemptionNewValue || "")}
												onChange={(e) => {
													const raw = normalizeValueInput(e.target.value);
													setExemptionNewValue(raw);
												}}
												placeholder="0.00"
												className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white ${(!hasValidNewValue || !meetsValueRule) ? 'border-amber-300' : 'border-gray-300'}`}
											/>
											{!hasValidNewValue && (
												<p className="text-xs text-amber-700 mt-1">Enter a valid number.</p>
											)}
											{hasValidNewValue && !meetsValueRule && (
												<p className="text-xs text-amber-700 mt-1">
													{selectedExemptionType === "Impairment"
														? "New value must be less than the current value."
														: selectedExemptionType === "Improvement"
														? "New value must be greater than the current value."
														: "New value must differ from the current value."}
												</p>
											)}
										</div>
									)}

									{isValueChangeType && (
										<div className="mb-4">
											<label className="block text-sm font-medium text-gray-700 mb-1">
												Reason / Note
											</label>
											<textarea
												value={exemptionNote}
												onChange={(e) => setExemptionNote(e.target.value)}
												rows={3}
												className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white ${!hasValidNote ? 'border-amber-300' : 'border-gray-300'}`}
												placeholder="Provide the reason for this change..."
											/>
											{!hasValidNote && (
												<p className="text-xs text-amber-700 mt-1">A reason is required for this exemption.</p>
											)}
										</div>
									)}

									{isMethodChangeType && (
										<div className="mb-4 space-y-4">
											<div className="border rounded-lg p-4">
												<h4 className="font-medium text-gray-900 mb-3">Accounting Depreciation</h4>
												<div className="grid grid-cols-2 gap-3">
													<div>
														<label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
														<select
															value={exemptionDepnMethodAcc}
															onChange={(e) => setExemptionDepnMethodAcc(e.target.value)}
															className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
														>
															<option value="SL">Straight-line</option>
															<option value="DV">Diminishing value</option>
															<option value="LV">Low-value write-off</option>
															<option value="ND">Non-depreciable</option>
														</select>
													</div>
													<div>
														<label className="block text-sm font-medium text-gray-700 mb-1">Rate (%)</label>
														<input
															type="number"
															value={exemptionDepnRateAcc}
															onChange={(e) => setExemptionDepnRateAcc(e.target.value)}
															placeholder="e.g., 10"
															step="0.01"
															min="0"
															max="100"
															className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
														/>
													</div>
												</div>
											</div>
											<div className="border rounded-lg p-4">
												<h4 className="font-medium text-gray-900 mb-3">Tax Depreciation</h4>
												<div className="grid grid-cols-2 gap-3">
													<div>
														<label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
														<select
															value={exemptionDepnMethodTax}
															onChange={(e) => setExemptionDepnMethodTax(e.target.value)}
															className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
														>
															<option value="SL">Straight-line</option>
															<option value="DV">Diminishing value</option>
															<option value="LV">Low-value write-off</option>
															<option value="ND">Non-depreciable</option>
														</select>
													</div>
													<div>
														<label className="block text-sm font-medium text-gray-700 mb-1">Rate (%)</label>
														<input
															type="number"
															value={exemptionDepnRateTax}
															onChange={(e) => setExemptionDepnRateTax(e.target.value)}
															placeholder="e.g., 13.5"
															step="0.01"
															min="0"
															max="100"
															className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white"
														/>
													</div>
												</div>
											</div>
										</div>
									)}

									{isCategoryChangeType && (
										<div className="mb-4">
											<label className="block text-sm font-medium text-gray-700 mb-1">
												New Asset Category
											</label>
											<select
												value={exemptionCategory}
												onChange={(e) => setExemptionCategory(e.target.value)}
												className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900 bg-white ${!hasCategoryValue ? 'border-amber-300' : 'border-gray-300'}`}
											>
												<option value="">Select a category</option>
												{categoryOptions.map((category) => (
													<option key={category} value={category}>{category}</option>
												))}
											</select>
											{!hasCategoryValue && (
												<p className="text-xs text-amber-700 mt-1">Category is required.</p>
											)}
										</div>
									)}

									<p className="text-sm text-gray-600 mb-6">
										This will create a new version of the asset with the exemption type "{selectedExemptionType}". The current version will be preserved in history.
									</p>

									<div className="flex gap-3 justify-end">
										<button
											onClick={() => {
												setSelectedExemptionType(null);
												setShowExemptionConfirm(false);
											}}
											className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
										>
											Back
										</button>
										<button
											onClick={handleConfirmExemption}
											disabled={!canConfirmExemption}
											className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
										>
											{isSavingExemption ? "Creating..." : "Confirm & Create Version"}
										</button>
									</div>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Depreciation Results Modal */}
				{showDepreciationModal && (
					<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
						<div className="bg-white rounded-lg p-6 shadow-xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-y-auto">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-xl font-semibold text-gray-900">
									{depreciationType === "working" ? "FY Working" : "FY Register"} - Year ended 31 March {financialYear}
								</h2>
								<button
									onClick={() => setShowDepreciationModal(false)}
									className="text-gray-400 hover:text-gray-600"
								>
									<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>

							{depreciationType === "working" ? (
								<>
									{/* FY Working - Month by Month Schedule */}
									{/* Accounting Classification Section */}
									<div className="mb-8">
										<div className="flex items-center justify-between mb-4">
											<h3 className="text-lg font-semibold text-gray-900">Accounting Classification</h3>
											<button
												onClick={handleGenerateReport}
												className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
											>
												Generate Report
											</button>
										</div>
										<div className="overflow-x-auto">
											<table className="w-full border-collapse text-xs">
												<thead>
													<tr className="bg-gray-50">
														<th 
															className="px-2 py-2 text-left text-sm font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-100 select-none" 
															rowSpan={2}
															onClick={() => handleFySort("assetId")}
														>
															<div className="flex items-center gap-1">
																Assets
																<span className="text-gray-400 text-xs">
																	{fySortColumn === "assetId" ? (fySortDirection === "asc" ? "▲" : "▼") : "○"}
																</span>
															</div>
														</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>
															<div className="flex flex-col items-center leading-tight">
																<span>Month One</span>
																<span className="text-xs text-gray-400">{getFyMonthLabel(0)}</span>
															</div>
														</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>
															<div className="flex flex-col items-center leading-tight">
																<span>Month Two</span>
																<span className="text-xs text-gray-400">{getFyMonthLabel(1)}</span>
															</div>
														</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>
															<div className="flex flex-col items-center leading-tight">
																<span>Month Three</span>
																<span className="text-xs text-gray-400">{getFyMonthLabel(2)}</span>
															</div>
														</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>
															<div className="flex flex-col items-center leading-tight">
																<span>Month Four</span>
																<span className="text-xs text-gray-400">{getFyMonthLabel(3)}</span>
															</div>
														</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>
															<div className="flex flex-col items-center leading-tight">
																<span>Month Five</span>
																<span className="text-xs text-gray-400">{getFyMonthLabel(4)}</span>
															</div>
														</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>
															<div className="flex flex-col items-center leading-tight">
																<span>Month Six</span>
																<span className="text-xs text-gray-400">{getFyMonthLabel(5)}</span>
															</div>
														</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>
															<div className="flex flex-col items-center leading-tight">
																<span>Month Seven</span>
																<span className="text-xs text-gray-400">{getFyMonthLabel(6)}</span>
															</div>
														</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>
															<div className="flex flex-col items-center leading-tight">
																<span>Month Eight</span>
																<span className="text-xs text-gray-400">{getFyMonthLabel(7)}</span>
															</div>
														</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>
															<div className="flex flex-col items-center leading-tight">
																<span>Month Nine</span>
																<span className="text-xs text-gray-400">{getFyMonthLabel(8)}</span>
															</div>
														</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>
															<div className="flex flex-col items-center leading-tight">
																<span>Month Ten</span>
																<span className="text-xs text-gray-400">{getFyMonthLabel(9)}</span>
															</div>
														</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>
															<div className="flex flex-col items-center leading-tight">
																<span>Month Eleven</span>
																<span className="text-xs text-gray-400">{getFyMonthLabel(10)}</span>
															</div>
														</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>
															<div className="flex flex-col items-center leading-tight">
																<span>Month Twelve</span>
																<span className="text-xs text-gray-400">{getFyMonthLabel(11)}</span>
															</div>
														</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b" colSpan={6}>
															Acc classification at close
														</th>
													</tr>
													<tr className="bg-gray-50">
														{Array(12).fill(0).map((_, i) => (
															<React.Fragment key={i}>
																<th className="pl-3 pr-1 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Open</th>
																<th className="px-1 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Revalns</th>
																<th className="px-1 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Acq</th>
																<th className="px-1 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Disp</th>
																<th className="pl-1 pr-3 py-1 text-center text-xs font-medium text-gray-600 border-b border-r border-r-gray-300" style={currencyCellStyle}>Depn</th>
															</React.Fragment>
														))}
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Open</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Total revals</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Total additions</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Total disposals</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Total depn</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Close</th>
													</tr>
												</thead>
												<tbody>
													{sortedScheduleAccountingResults.map((result, index) => (
														<tr key={index} className="border-b hover:bg-gray-50">
															<td className="px-2 py-1 text-xs text-gray-900 font-medium">{result.assetId || "-"}</td>
															{result.months.map((month, monthIndex) => (
																<React.Fragment key={monthIndex}>
																	<td className={`pl-3 pr-1 py-1 text-xs text-gray-900 ${!month || month.openingValue === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatCurrency(month.openingValue) : "-"}</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${!month || month.revalns === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatSignedCurrency(month.revalns) : "-"}</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${!month || month.acquisitions === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatCurrency(month.acquisitions) : "-"}</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${!month || month.disposals === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatDeduction(month.disposals) : "-"}</td>
																	<td className={`pl-1 pr-3 py-1 text-xs text-gray-900 border-r border-r-gray-300 ${!month || month.depn === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatDeduction(month.depn) : "-"}</td>
																</React.Fragment>
															))}
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.open === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatSignedCurrency(result.open)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.totalRevals === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatSignedCurrency(result.totalRevals)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.totalAdditions === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatSignedCurrency(result.totalAdditions)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.totalDisposals === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatDeduction(result.totalDisposals)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.totalDepn === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatDeduction(result.totalDepn)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.close === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatSignedCurrency(result.close)}</td>
														</tr>
													))}
												</tbody>
												<tfoot>
													<tr className="bg-gray-100 font-semibold">
														<td className="px-2 py-2 text-xs text-gray-900">Total</td>
														{Array(12).fill(0).map((_, i) => {
																const openTotal = scheduleAccountingResults.reduce((sum, r) => sum + (r.months[i]?.openingValue || 0), 0);
																const revalsTotal = scheduleAccountingResults.reduce((sum, r) => sum + (r.months[i]?.revalns || 0), 0);
																const acqTotal = scheduleAccountingResults.reduce((sum, r) => sum + (r.months[i]?.acquisitions || 0), 0);
																const dispTotal = scheduleAccountingResults.reduce((sum, r) => sum + (r.months[i]?.disposals || 0), 0);
																const depnTotal = scheduleAccountingResults.reduce((sum, r) => sum + (r.months[i]?.depn || 0), 0);
															return (
																<React.Fragment key={i}>
																	<td className={`pl-3 pr-1 py-1 text-xs text-gray-900 ${openTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatSignedCurrency(openTotal)}
																	</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${revalsTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatSignedCurrency(revalsTotal)}
																	</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${acqTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatSignedCurrency(acqTotal)}
																	</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${dispTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatDeduction(dispTotal)}
																	</td>
																	<td className={`pl-1 pr-3 py-1 text-xs text-gray-900 border-r border-r-gray-300 ${depnTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatDeduction(depnTotal)}
																	</td>
																</React.Fragment>
															);
														})}
														{(() => {
																const openTotal = scheduleAccountingResults.reduce((sum, r) => sum + r.open, 0);
																const revalsTotal = scheduleAccountingResults.reduce((sum, r) => sum + r.totalRevals, 0);
																const additionsTotal = scheduleAccountingResults.reduce((sum, r) => sum + r.totalAdditions, 0);
																const disposalsTotal = scheduleAccountingResults.reduce((sum, r) => sum + r.totalDisposals, 0);
																const depnTotal = scheduleAccountingResults.reduce((sum, r) => sum + r.totalDepn, 0);
																const closeTotal = scheduleAccountingResults.reduce((sum, r) => sum + r.close, 0);
															return (
																<>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${openTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatSignedCurrency(openTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${revalsTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatSignedCurrency(revalsTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${additionsTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatSignedCurrency(additionsTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${disposalsTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatDeduction(disposalsTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${depnTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatDeduction(depnTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${closeTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatSignedCurrency(closeTotal)}
																	</td>
																</>
															);
														})()}
													</tr>
												</tfoot>
											</table>
										</div>
									</div>

									{/* Tax Classification Section */}
									<div>
										<h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Classification</h3>
										<div className="overflow-x-auto">
											<table className="w-full border-collapse text-xs">
												<thead>
													<tr className="bg-gray-50">
														<th 
															className="px-2 py-2 text-left text-sm font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-100 select-none" 
															rowSpan={2}
															onClick={() => handleFySort("assetId")}
														>
															<div className="flex items-center gap-1">
																Assets
																<span className="text-gray-400 text-xs">
																	{fySortColumn === "assetId" ? (fySortDirection === "asc" ? "▲" : "▼") : "○"}
																</span>
															</div>
														</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>Month One</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>Month Two</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>Month Three</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>Month Four</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>Month Five</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>Month Six</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>Month Seven</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>Month Eight</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>Month Nine</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>Month Ten</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>Month Eleven</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b border-r border-r-gray-300" colSpan={5}>Month Twelve</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b" colSpan={6}>
															Tax classification at close
														</th>
													</tr>
													<tr className="bg-gray-50">
														{Array(12).fill(0).map((_, i) => (
															<React.Fragment key={i}>
																<th className="pl-3 pr-1 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Open</th>
																<th className="px-1 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Revalns</th>
																<th className="px-1 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Acq</th>
																<th className="px-1 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Disp</th>
																<th className="pl-1 pr-3 py-1 text-center text-xs font-medium text-gray-600 border-b border-r border-r-gray-300" style={currencyCellStyle}>Depn</th>
															</React.Fragment>
														))}
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Open</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Total revals</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Total additions</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Total disposals</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Total depn</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b" style={currencyCellStyle}>Close</th>
													</tr>
												</thead>
												<tbody>
															{sortedScheduleTaxResults.map((result, index) => (
																<tr key={index} className="border-b hover:bg-gray-50">
																	<td className="px-2 py-1 text-xs text-gray-900 font-medium">{result.assetId || "-"}</td>
																	{result.months.map((month, monthIndex) => (
																<React.Fragment key={monthIndex}>
																	<td className={`pl-3 pr-1 py-1 text-xs text-gray-900 ${!month || month.openingValue === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatCurrency(month.openingValue) : "-"}</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${!month || month.revalns === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatSignedCurrency(month.revalns) : "-"}</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${!month || month.acquisitions === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatCurrency(month.acquisitions) : "-"}</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${!month || month.disposals === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatDeduction(month.disposals) : "-"}</td>
																	<td className={`pl-1 pr-3 py-1 text-xs text-gray-900 border-r border-r-gray-300 ${!month || month.depn === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatDeduction(month.depn) : "-"}</td>
																</React.Fragment>
															))}
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.open === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatSignedCurrency(result.open)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.totalRevals === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatSignedCurrency(result.totalRevals)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.totalAdditions === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatSignedCurrency(result.totalAdditions)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.totalDisposals === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatDeduction(result.totalDisposals)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.totalDepn === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatDeduction(result.totalDepn)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.close === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatSignedCurrency(result.close)}</td>
														</tr>
													))}
												</tbody>
												<tfoot>
													<tr className="bg-gray-100 font-semibold">
														<td className="px-2 py-2 text-xs text-gray-900">Total</td>
														{Array(12).fill(0).map((_, i) => {
																const openTotal = scheduleTaxResults.reduce((sum, r) => sum + (r.months[i]?.openingValue || 0), 0);
																const revalsTotal = scheduleTaxResults.reduce((sum, r) => sum + (r.months[i]?.revalns || 0), 0);
																const acqTotal = scheduleTaxResults.reduce((sum, r) => sum + (r.months[i]?.acquisitions || 0), 0);
																const dispTotal = scheduleTaxResults.reduce((sum, r) => sum + (r.months[i]?.disposals || 0), 0);
																const depnTotal = scheduleTaxResults.reduce((sum, r) => sum + (r.months[i]?.depn || 0), 0);
															return (
																<React.Fragment key={i}>
																	<td className={`pl-3 pr-1 py-1 text-xs text-gray-900 ${openTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatSignedCurrency(openTotal)}
																	</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${revalsTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatSignedCurrency(revalsTotal)}
																	</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${acqTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatSignedCurrency(acqTotal)}
																	</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${dispTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatDeduction(dispTotal)}
																	</td>
																	<td className={`pl-1 pr-3 py-1 text-xs text-gray-900 border-r border-r-gray-300 ${depnTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatDeduction(depnTotal)}
																	</td>
																</React.Fragment>
															);
														})}
														{(() => {
																const openTotal = scheduleTaxResults.reduce((sum, r) => sum + r.open, 0);
																const revalsTotal = scheduleTaxResults.reduce((sum, r) => sum + r.totalRevals, 0);
																const additionsTotal = scheduleTaxResults.reduce((sum, r) => sum + r.totalAdditions, 0);
																const disposalsTotal = scheduleTaxResults.reduce((sum, r) => sum + r.totalDisposals, 0);
																const depnTotal = scheduleTaxResults.reduce((sum, r) => sum + r.totalDepn, 0);
																const closeTotal = scheduleTaxResults.reduce((sum, r) => sum + r.close, 0);
															return (
																<>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${openTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatSignedCurrency(openTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${revalsTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatSignedCurrency(revalsTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${additionsTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatSignedCurrency(additionsTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${disposalsTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatDeduction(disposalsTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${depnTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatDeduction(depnTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${closeTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatSignedCurrency(closeTotal)}
																	</td>
																</>
															);
														})()}
													</tr>
												</tfoot>
											</table>
										</div>
									</div>

									{/* Reports Section */}
									{generatedReports.length > 0 && (
										<div className="mt-8 border-t pt-6">
											<h3 className="text-lg font-semibold text-gray-900 mb-4">Reports</h3>
											
											{/* Compare Reports Controls */}
											{generatedReports.length >= 2 && (
												<div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
													<div className="flex flex-wrap items-center gap-3">
														<span className="text-sm font-medium text-gray-700">Compare:</span>
														<select
															value={compareReport1 ?? ""}
															onChange={(e) => setCompareReport1(e.target.value ? Number(e.target.value) : null)}
															className="px-3 py-1.5 border border-gray-300 rounded text-sm text-black bg-white"
														>
															<option value="">Select Report</option>
															{generatedReports.map((_, index) => (
																<option key={index} value={index}>Report #{index + 1}</option>
															))}
														</select>
														<span className="text-sm text-gray-500">with</span>
														<select
															value={compareReport2 ?? ""}
															onChange={(e) => setCompareReport2(e.target.value ? Number(e.target.value) : null)}
															className="px-3 py-1.5 border border-gray-300 rounded text-sm text-black bg-white"
														>
															<option value="">Select Report</option>
															{generatedReports.map((_, index) => (
																<option key={index} value={index}>Report #{index + 1}</option>
															))}
														</select>
														<button
															onClick={handleCompareReports}
															disabled={compareReport1 === null || compareReport2 === null || compareReport1 === compareReport2}
															className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
														>
															Compare
														</button>
													</div>
												</div>
											)}

											<div className="space-y-3">
												{generatedReports.map((report, index) => (
													<div key={index} className="p-4 bg-gray-50 rounded-lg border">
														<div className="flex items-center justify-between mb-2">
															<span className="font-medium text-gray-900">Report #{index + 1}</span>
															<span className="text-sm text-gray-500">{report.timestamp}</span>
															<button
																onClick={() => handleDeleteReport(index)}
																className="ml-4 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
																title="Delete this report"
															>
																Delete
															</button>
														</div>
														<div className="text-xs text-gray-600 font-mono break-all">
															{report.versionIds}
														</div>
													</div>
												))}
											</div>
										</div>
									)}
								</>
							) : (
								<>
									{/* FY Register - Summary by Category */}
									{/* Accounting Fixed Assets Register */}
									<div className="mb-8">
										<h3 className="text-lg font-semibold text-gray-900 mb-4">ACCOUNTING FIXED ASSETS REGISTER</h3>
										<div className="overflow-x-auto">
											<table className="w-full border-collapse text-sm">
												<thead>
													<tr className="bg-gray-50">
														<th className="px-4 py-2 text-left font-medium text-gray-700 border-b"></th>
														<th className="px-4 py-2 text-right font-medium text-gray-700 border-b">Opening book value</th>
														<th className="px-4 py-2 text-right font-medium text-gray-700 border-b">Revaluations</th>
														<th className="px-4 py-2 text-right font-medium text-gray-700 border-b">Additions</th>
														<th className="px-4 py-2 text-right font-medium text-gray-700 border-b">Disposals</th>
														<th className="px-4 py-2 text-right font-medium text-gray-700 border-b">Depreciation</th>
														<th className="px-4 py-2 text-right font-medium text-gray-700 border-b">Closing book value</th>
													</tr>
												</thead>
												<tbody>
															{summaryAccountingResults.map((result, index) => (
														<tr key={index} className="border-b hover:bg-gray-50">
															<td className="px-4 py-2 text-gray-900 font-medium">{result.category}</td>
															<td className="px-4 py-2 text-gray-900 text-right">{formatCurrency(result.openingBookValue)}</td>
															<td className="px-4 py-2 text-gray-900 text-right">{formatCurrency(result.revaluations)}</td>
															<td className="px-4 py-2 text-gray-900 text-right">{formatCurrency(result.additions)}</td>
															<td className="px-4 py-2 text-gray-900 text-right">{formatDeduction(result.disposals)}</td>
															<td className="px-4 py-2 text-gray-900 text-right">{formatDeduction(result.depreciation)}</td>
															<td className="px-4 py-2 text-gray-900 text-right">{formatCurrency(result.closingBookValue)}</td>
														</tr>
													))}
												</tbody>
												<tfoot>
													<tr className="bg-gray-100 font-semibold">
														<td className="px-4 py-2 text-gray-900">Total</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(summaryAccountingResults.reduce((sum, r) => sum + r.openingBookValue, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(summaryAccountingResults.reduce((sum, r) => sum + r.revaluations, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(summaryAccountingResults.reduce((sum, r) => sum + r.additions, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatDeduction(summaryAccountingResults.reduce((sum, r) => sum + r.disposals, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatDeduction(summaryAccountingResults.reduce((sum, r) => sum + r.depreciation, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(summaryAccountingResults.reduce((sum, r) => sum + r.closingBookValue, 0))}
														</td>
													</tr>
												</tfoot>
											</table>
										</div>
									</div>

									{/* Tax Fixed Assets Register */}
									<div>
										<h3 className="text-lg font-semibold text-gray-900 mb-4">TAX FIXED ASSETS REGISTER</h3>
										<div className="overflow-x-auto">
											<table className="w-full border-collapse text-sm">
												<thead>
													<tr className="bg-gray-50">
														<th className="px-4 py-2 text-left font-medium text-gray-700 border-b"></th>
														<th className="px-4 py-2 text-right font-medium text-gray-700 border-b">Opening book value</th>
														<th className="px-4 py-2 text-right font-medium text-gray-700 border-b">Revaluations</th>
														<th className="px-4 py-2 text-right font-medium text-gray-700 border-b">Additions</th>
														<th className="px-4 py-2 text-right font-medium text-gray-700 border-b">Disposals</th>
														<th className="px-4 py-2 text-right font-medium text-gray-700 border-b">Depreciation</th>
														<th className="px-4 py-2 text-right font-medium text-gray-700 border-b">Closing book value</th>
													</tr>
												</thead>
												<tbody>
															{summaryTaxResults.map((result, index) => (
														<tr key={index} className="border-b hover:bg-gray-50">
															<td className="px-4 py-2 text-gray-900 font-medium">{result.category}</td>
															<td className="px-4 py-2 text-gray-900 text-right">{formatCurrency(result.openingBookValue)}</td>
															<td className="px-4 py-2 text-gray-900 text-right">{formatCurrency(result.revaluations)}</td>
															<td className="px-4 py-2 text-gray-900 text-right">{formatCurrency(result.additions)}</td>
															<td className="px-4 py-2 text-gray-900 text-right">{formatDeduction(result.disposals)}</td>
															<td className="px-4 py-2 text-gray-900 text-right">{formatDeduction(result.depreciation)}</td>
															<td className="px-4 py-2 text-gray-900 text-right">{formatCurrency(result.closingBookValue)}</td>
														</tr>
													))}
												</tbody>
												<tfoot>
													<tr className="bg-gray-100 font-semibold">
														<td className="px-4 py-2 text-gray-900">Total</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(summaryTaxResults.reduce((sum, r) => sum + r.openingBookValue, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(summaryTaxResults.reduce((sum, r) => sum + r.revaluations, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(summaryTaxResults.reduce((sum, r) => sum + r.additions, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatDeduction(summaryTaxResults.reduce((sum, r) => sum + r.disposals, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatDeduction(summaryTaxResults.reduce((sum, r) => sum + r.depreciation, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(summaryTaxResults.reduce((sum, r) => sum + r.closingBookValue, 0))}
														</td>
													</tr>
												</tfoot>
											</table>
										</div>
									</div>
								</>
							)}

							<div className="flex gap-3 justify-end mt-4 pt-4 border-t">
								<button
									onClick={() => setShowDepreciationModal(false)}
									className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
								>
									Close
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Compare Reports Modal */}
				{showCompareModal && compareReport1 !== null && compareReport2 !== null && (
					<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
						<div className="bg-white rounded-lg p-6 shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-xl font-semibold text-gray-900">
									Compare Reports: #{compareReport1 + 1} vs #{compareReport2 + 1}
								</h2>
								<button
									onClick={() => setShowCompareModal(false)}
									className="text-gray-400 hover:text-gray-600"
								>
									<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>

							{(() => {
								const { changed, added, removed } = getComparisonResults();
								const hasNoChanges = (!changed || changed.length === 0) && (!added || added.length === 0) && (!removed || removed.length === 0);

								return (
									<div className="space-y-6">
										{hasNoChanges ? (
											<div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
												<p className="text-green-700 font-medium">No differences found between the two reports.</p>
											</div>
										) : (
											<>
												{/* Added Assets */}
												{added && added.length > 0 && (
													<div>
														<h3 className="text-md font-semibold text-black mb-3 flex items-center gap-2">
															<span className="w-3 h-3 bg-green-500 rounded-full"></span>
															New Assets in Report #{compareReport2 + 1} ({added.length})
														</h3>
														<div className="overflow-x-auto">
															<table className="w-full border-collapse text-sm">
																<thead>
																	<tr className="bg-green-50">
																		<th className="px-4 py-2 text-left font-medium text-gray-700 border-b">Asset ID</th>
																		<th className="px-4 py-2 text-left font-medium text-gray-700 border-b">Version ID</th>
																	</tr>
																</thead>
																<tbody>
																	{added.map((item, index) => (
																		<tr key={index} className="border-b hover:bg-green-50/50">
																			  <td className="px-4 py-2 text-gray-900">{getAssetLabel(item.assetGuid)}</td>
																			<td className="px-4 py-2 text-gray-900 font-mono">{item.versionId}</td>
																		</tr>
																	))}
																</tbody>
															</table>
														</div>
													</div>
												)}

												{/* Removed Assets */}
												{removed && removed.length > 0 && (
													<div>
														<h3 className="text-md font-semibold text-black mb-3 flex items-center gap-2">
															<span className="w-3 h-3 bg-red-500 rounded-full"></span>
															Removed from Report #{compareReport2 + 1} ({removed.length})
														</h3>
														<div className="overflow-x-auto">
															<table className="w-full border-collapse text-sm">
																<thead>
																	<tr className="bg-red-50">
																		<th className="px-4 py-2 text-left font-medium text-gray-700 border-b">Asset ID</th>
																		<th className="px-4 py-2 text-left font-medium text-gray-700 border-b">Version ID</th>
																	</tr>
																</thead>
																<tbody>
																	{removed.map((item, index) => (
																		<tr key={index} className="border-b hover:bg-red-50/50">
																			  <td className="px-4 py-2 text-gray-900">{getAssetLabel(item.assetGuid)}</td>
																			<td className="px-4 py-2 text-gray-900 font-mono">{item.versionId}</td>
																		</tr>
																	))}
																</tbody>
															</table>
														</div>
													</div>
												)}
											</>
										)}

										<div className="flex gap-3 justify-end pt-4 border-t">
											<button
												onClick={() => setShowCompareModal(false)}
												className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
											>
												Close
											</button>
										</div>
									</div>
								);
							})()}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
