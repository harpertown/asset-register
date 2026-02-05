import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import React from "react";
import { apiService } from "~/services/api";
import { calculateDepreciationSchedule, calculateCategorySummary } from "~/services/depreciationService";
import type { Register, Transaction } from "~/types";
import type { DepreciationSchedule, CategorySummary } from "~/services/depreciationService";
import { formatCurrency, currencyCellStyle, calculateFinancialPeriod, formatDate } from "~/utils";

export function meta() {
	return [
		{ title: "All Assets" },
		{ name: "description", content: "Asset Register - All Assets" },
	];
}

export default function Transactions() {
	const { registerId } = useParams<{ registerId: string }>();
	const navigate = useNavigate();
	const [register, setRegister] = useState<Register | null>(null);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
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

	// Depreciation calculation state
	const [showDepreciationModal, setShowDepreciationModal] = useState(false);
	const [depreciationResults, setDepreciationResults] = useState<(DepreciationSchedule | CategorySummary)[]>([]);
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

	const handleFYWorking = () => {
		if (!register) return;
		setDepreciationType("working");
		// Calculate both accounting and tax depreciation for FY Working
		const allAssets = register.rooms.flatMap((room) => room.assets);
		const accResults = allAssets.map((asset) => calculateDepreciationSchedule(asset, "working"));
		const taxResults = allAssets.map((asset) => calculateDepreciationSchedule(asset, "register"));
		// Combine both results
		setDepreciationResults([...accResults, ...taxResults]);
		setShowDepreciationModal(true);
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

	if (isLoading) {
		return (
			<div className="min-h-screen bg-white flex flex-col items-center justify-center py-8 px-4">
				<div className="text-gray-500">Loading assets...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-white flex flex-col items-center justify-center py-8 px-4">
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
		<div className="min-h-screen bg-white flex flex-col items-center py-8 px-4">
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
					<div className="overflow-x-auto border border-gray-200 rounded-lg">
						<table className="w-full text-sm text-left">
							<thead className="bg-gray-50 border-b border-gray-200">
								<tr>
									<th className="px-4 py-3 font-medium text-gray-900">Status</th>
									<th className="px-4 py-3 font-medium text-gray-900">Asset ID</th>
									<th className="px-4 py-3 font-medium text-gray-900">Asset category</th>
									<th className="px-4 py-3 font-medium text-gray-900">Asset description</th>
									<th className="px-4 py-3 font-medium text-gray-900">Purchase Price</th>
									<th className="px-4 py-3 font-medium text-gray-900">Acc Method</th>
									<th className="px-4 py-3 font-medium text-gray-900">Acc Rate</th>
									<th className="px-4 py-3 font-medium text-gray-900">Tax Method</th>
									<th className="px-4 py-3 font-medium text-gray-900">Tax Rate</th>
									<th className="px-4 py-3 font-medium text-gray-900">Actions</th>
								</tr>
							</thead>
							<tbody>
								{transactions.map((tx, i) => {
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
												type="number"
												value={editPurchasePrice}
												onChange={(e) => setEditPurchasePrice(e.target.value)}
												placeholder="0.00"
												step="0.01"
												min="0"
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
										<h3 className="text-lg font-semibold text-gray-900 mb-4">Accounting Classification</h3>
										<div className="overflow-x-auto">
											<table className="w-full border-collapse text-xs">
												<thead>
													<tr className="bg-gray-50">
														<th className="px-2 py-2 text-left text-sm font-medium text-gray-700 border-b" rowSpan={2}>Assets</th>
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
													{scheduleAccountingResults.map((result, index) => (
														<tr key={index} className="border-b hover:bg-gray-50">
															<td className="px-2 py-1 text-xs text-gray-900 font-medium">{result.assetId || "-"}</td>
															{result.months.map((month, monthIndex) => (
																<React.Fragment key={monthIndex}>
																	<td className={`pl-3 pr-1 py-1 text-xs text-gray-900 ${!month || month.openingValue === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatCurrency(month.openingValue) : "-"}</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${!month || month.revalns === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatCurrency(month.revalns) : "-"}</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${!month || month.acquisitions === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatCurrency(month.acquisitions) : "-"}</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${!month || month.disposals === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatCurrency(month.disposals) : "-"}</td>
																	<td className={`pl-1 pr-3 py-1 text-xs text-gray-900 border-r border-r-gray-300 ${!month || month.depn === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatCurrency(month.depn) : "-"}</td>
																</React.Fragment>
															))}
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.open === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatCurrency(result.open)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.totalRevals === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatCurrency(result.totalRevals)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.totalAdditions === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatCurrency(result.totalAdditions)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.totalDisposals === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatCurrency(result.totalDisposals)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.totalDepn === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatCurrency(result.totalDepn)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.close === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatCurrency(result.close)}</td>
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
																		{formatCurrency(openTotal)}
																	</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${revalsTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatCurrency(revalsTotal)}
																	</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${acqTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatCurrency(acqTotal)}
																	</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${dispTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatCurrency(dispTotal)}
																	</td>
																	<td className={`pl-1 pr-3 py-1 text-xs text-gray-900 border-r border-r-gray-300 ${depnTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatCurrency(depnTotal)}
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
																		{formatCurrency(openTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${revalsTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatCurrency(revalsTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${additionsTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatCurrency(additionsTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${disposalsTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatCurrency(disposalsTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${depnTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatCurrency(depnTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${closeTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatCurrency(closeTotal)}
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
														<th className="px-2 py-2 text-left text-sm font-medium text-gray-700 border-b" rowSpan={2}>Assets</th>
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
															{scheduleTaxResults.map((result, index) => (
																<tr key={index} className="border-b hover:bg-gray-50">
																	<td className="px-2 py-1 text-xs text-gray-900 font-medium">{result.assetId || "-"}</td>
																	{result.months.map((month, monthIndex) => (
																<React.Fragment key={monthIndex}>
																	<td className={`pl-3 pr-1 py-1 text-xs text-gray-900 ${!month || month.openingValue === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatCurrency(month.openingValue) : "-"}</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${!month || month.revalns === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatCurrency(month.revalns) : "-"}</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${!month || month.acquisitions === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatCurrency(month.acquisitions) : "-"}</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${!month || month.disposals === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatCurrency(month.disposals) : "-"}</td>
																	<td className={`pl-1 pr-3 py-1 text-xs text-gray-900 border-r border-r-gray-300 ${!month || month.depn === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{month ? formatCurrency(month.depn) : "-"}</td>
																</React.Fragment>
															))}
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.open === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatCurrency(result.open)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.totalRevals === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatCurrency(result.totalRevals)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.totalAdditions === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatCurrency(result.totalAdditions)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.totalDisposals === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatCurrency(result.totalDisposals)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.totalDepn === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatCurrency(result.totalDepn)}</td>
															<td className={`px-2 py-1 text-xs text-gray-900 ${result.close === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>{formatCurrency(result.close)}</td>
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
																		{formatCurrency(openTotal)}
																	</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${revalsTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatCurrency(revalsTotal)}
																	</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${acqTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatCurrency(acqTotal)}
																	</td>
																	<td className={`px-1 py-1 text-xs text-gray-900 ${dispTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatCurrency(dispTotal)}
																	</td>
																	<td className={`pl-1 pr-3 py-1 text-xs text-gray-900 border-r border-r-gray-300 ${depnTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatCurrency(depnTotal)}
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
																		{formatCurrency(openTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${revalsTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatCurrency(revalsTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${additionsTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatCurrency(additionsTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${disposalsTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatCurrency(disposalsTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${depnTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatCurrency(depnTotal)}
																	</td>
																	<td className={`px-2 py-1 text-xs text-gray-900 ${closeTotal === 0 ? "text-center" : "text-right"}`} style={currencyCellStyle}>
																		{formatCurrency(closeTotal)}
																	</td>
																</>
															);
														})()}
													</tr>
												</tfoot>
											</table>
										</div>
									</div>
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
															<td className="px-4 py-2 text-gray-900 text-right">{formatCurrency(result.disposals)}</td>
															<td className="px-4 py-2 text-gray-900 text-right">{formatCurrency(result.depreciation)}</td>
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
															{formatCurrency(summaryAccountingResults.reduce((sum, r) => sum + r.disposals, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(summaryAccountingResults.reduce((sum, r) => sum + r.depreciation, 0))}
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
															<td className="px-4 py-2 text-gray-900 text-right">{formatCurrency(result.disposals)}</td>
															<td className="px-4 py-2 text-gray-900 text-right">{formatCurrency(result.depreciation)}</td>
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
															{formatCurrency(summaryTaxResults.reduce((sum, r) => sum + r.disposals, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(summaryTaxResults.reduce((sum, r) => sum + r.depreciation, 0))}
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
			</div>
		</div>
	);
}
