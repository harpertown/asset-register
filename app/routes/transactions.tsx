import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import React from "react";

const api = {
	async getRegisters(): Promise<Register[]> {
		const res = await fetch("/api/registers");
		if (!res.ok) throw new Error("Failed to fetch registers");
		return res.json();
	},
};

interface Asset {
	id: string;
	assetId?: string;
	itemType: string;
	name: string;
	serialNumber: string;
	purchasePrice: number;
	purchaseDate: string;
	photo?: string;
	incomplete?: boolean;
	depnMethodAcc?: string;
	depnRateAcc?: string;
	depnMethodTax?: string;
	depnRateTax?: string;
}

interface Room {
	id: string;
	name: string;
	tool: "rectangle" | "circle" | "pen";
	color: string;
	assets: Asset[];
	isWholeSite?: boolean;
	rect?: { x: number; y: number; width: number; height: number };
	circle?: { cx: number; cy: number; radius: number };
	path?: { x: number; y: number }[];
}

interface Register {
	id?: string;
	address: string;
	sitePlan: string | null;
	rooms: Room[];
	ownsLand?: boolean;
	ownsBuildings?: boolean;
	wizardCompleted?: boolean;
	landValue?: string;
	landPurchaseDate?: string;
	buildingsValue?: string;
	buildingsPurchaseDate?: string;
}

interface Transaction {
	assetId: string;
	assetCategory: string;
	assetDescription: string;
	recordDate: string;
	effectiveDate: string;
	financialMonth: number;
	financialYear: number;
}

export function meta() {
	return [
		{ title: "All Assets" },
		{ name: "description", content: "Asset Register - All Assets" },
	];
}

function calculateFinancialPeriod(dateStr: string): { month: number; year: number } {
	if (!dateStr) return { month: 1, year: new Date().getFullYear() };
	const date = new Date(dateStr);
	const month = date.getMonth() + 1;
	const year = date.getFullYear();
	let financialMonth: number;
	let financialYear: number;
	if (month >= 4) {
		financialMonth = month - 3;
		financialYear = year + 1;
	} else {
		financialMonth = month + 9;
		financialYear = year;
	}
	return { month: financialMonth, year: financialYear };
}

function formatDate(dateStr: string): string {
	if (!dateStr) return "";
	const date = new Date(dateStr);
	return date.toLocaleDateString("en-NZ", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Transactions() {
	const { registerId } = useParams<{ registerId: string }>();
	const navigate = useNavigate();
	const [register, setRegister] = useState<Register | null>(null);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [registerIndex, setRegisterIndex] = useState<number | null>(null);

	// Depreciation calculation state
	const [showDepreciationModal, setShowDepreciationModal] = useState(false);
	const [depreciationResults, setDepreciationResults] = useState<any[]>([]);
	const [financialYear, setFinancialYear] = useState("2024");
	const [depreciationType, setDepreciationType] = useState<"working" | "register">("working");

	const loadData = useCallback(async () => {
		try {
			setIsLoading(true);
			const registers = await api.getRegisters();
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
					txs.push({
						assetId: asset.assetId || "",
						assetCategory: cat,
						assetDescription: desc,
						recordDate: formatDate(asset.purchaseDate),
						effectiveDate: formatDate(asset.purchaseDate),
						financialMonth: fp.month,
						financialYear: fp.year,
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

	// Depreciation calculation functions
	const calculateDepreciationSchedule = (asset: Asset, type: "working" | "register") => {
		const purchasePrice = asset.purchasePrice || 0;
		const purchaseDate = new Date(asset.purchaseDate);
		const currentDate = new Date();

		// Get depreciation rate and method based on type
		const depnRate = type === "working" ? asset.depnRateAcc : asset.depnRateTax;
		const depnMethod = type === "working" ? asset.depnMethodAcc : asset.depnMethodTax;

		// Parse depreciation rate (e.g., "2%" -> 0.02)
		const parseRate = (rate: string) => {
			const match = rate.match(/(\d+(\.\d+)?)/);
			return match ? parseFloat(match[1]) / 100 : 0;
		};

		// Use 0% rate if no rate specified
		const rate = depnRate ? parseRate(depnRate) : 0;
		const method = depnMethod ? depnMethod.toLowerCase() : "straight-line";

		// Calculate the financial month when the asset was acquired
		const acquisitionFinancialPeriod = calculateFinancialPeriod(asset.purchaseDate);
		const acquisitionMonth = acquisitionFinancialPeriod.month;

		// Calculate month-by-month depreciation for the financial year
		const months: any[] = [];
		let openingValue = 0;
		let totalDepn = 0;
		let totalAdditions = 0;

		for (let month = 1; month <= 12; month++) {
			let acquisitions = 0;

			// For the acquisition month, opening value is $0 and acquisitions is the purchase price
			if (month === acquisitionMonth) {
				openingValue = 0;
				acquisitions = purchasePrice;
				totalAdditions += acquisitions;
			}

			// Calculate depreciation on the book value (opening + acquisitions)
			const bookValue = openingValue + acquisitions;
			const monthDepn = calculateMonthlyDepreciation(bookValue, rate, method);
			const closingValue = Math.max(0, bookValue - monthDepn);

			months.push({
				month,
				openingValue,
				revalns: 0,
				acquisitions,
				disposals: 0,
				depn: monthDepn,
				closingValue,
			});

			totalDepn += monthDepn;
			openingValue = closingValue;
		}

		return {
			assetId: asset.assetId || "",
			name: asset.name,
			purchasePrice,
			months,
			open: 0, // Opening value for the year is 0 for newly acquired assets
			totalRevals: 0,
			totalAdditions,
			totalDisposals: 0,
			totalDepn,
			close: openingValue,
		};
	};

	const calculateMonthlyDepreciation = (bookValue: number, rate: number, method: string) => {
		if (method.includes("straight") || method.includes("sl")) {
			// Straight-line depreciation: same amount each month
			return bookValue * rate / 12;
		} else if (method.includes("diminishing") || method.includes("dv") || method.includes("declining")) {
			// Diminishing value depreciation: percentage of current book value
			return bookValue * rate / 12;
		}
		return 0;
	};

	const handleFYWorking = () => {
		if (!register) return;
		setDepreciationType("working");
		// Calculate both accounting and tax depreciation for FY Working
		const accResults = register.rooms.flatMap((room) =>
			room.assets.map((asset) => calculateDepreciationSchedule(asset, "working"))
		);
		const taxResults = register.rooms.flatMap((room) =>
			room.assets.map((asset) => calculateDepreciationSchedule(asset, "register"))
		);
		// Combine both results with a type indicator
		const combinedResults = [
			...accResults.map(r => ({ ...r, calcType: "accounting" })),
			...taxResults.map(r => ({ ...r, calcType: "tax" })),
		];
		setDepreciationResults(combinedResults);
		setShowDepreciationModal(true);
	};

	const handleFYRegister = () => {
		if (!register) return;
		setDepreciationType("register");
		// Calculate summary by asset category for FY Register
		const categories = ["Land", "Buildings", "Plant and equipment", "Vehicles", "Computer software"];
		
		const calculateCategorySummary = (type: "working" | "register") => {
			const results: any[] = [];
			
			for (const category of categories) {
				const categoryAssets = register.rooms.flatMap((room) =>
					room.assets.filter((asset) => asset.itemType.toLowerCase() === category.toLowerCase())
				);
				
				let openingBookValue = 0;
				let revaluations = 0;
				let additions = 0;
				let disposals = 0;
				let depreciation = 0;
				let closingBookValue = 0;
				
				if (categoryAssets.length > 0) {
					const schedules = categoryAssets.map((asset) => calculateDepreciationSchedule(asset, type));
					
					openingBookValue = schedules.reduce((sum, s) => sum + s.open, 0);
					revaluations = schedules.reduce((sum, s) => sum + s.totalRevals, 0);
					additions = schedules.reduce((sum, s) => sum + s.totalAdditions, 0);
					disposals = schedules.reduce((sum, s) => sum + s.totalDisposals, 0);
					depreciation = schedules.reduce((sum, s) => sum + s.totalDepn, 0);
					closingBookValue = schedules.reduce((sum, s) => sum + s.close, 0);
				}
				
				results.push({
					category,
					openingBookValue,
					revaluations,
					additions,
					disposals,
					depreciation,
					closingBookValue,
					calcType: type === "working" ? "accounting" : "tax",
				});
			}
			
			return results;
		};
		
		const accResults = calculateCategorySummary("working");
		const taxResults = calculateCategorySummary("register");
		
		// Combine both results
		const combinedResults = [...accResults, ...taxResults];
		setDepreciationResults(combinedResults);
		setShowDepreciationModal(true);
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-NZ", {
			style: "currency",
			currency: "NZD",
		}).format(amount);
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
									<th className="px-4 py-3 font-medium text-gray-900">Asset ID</th>
									<th className="px-4 py-3 font-medium text-gray-900">Asset category</th>
									<th className="px-4 py-3 font-medium text-gray-900">Asset description</th>
									<th className="px-4 py-3 font-medium text-gray-900">Record date</th>
									<th className="px-4 py-3 font-medium text-gray-900">Effective date</th>
									<th className="px-4 py-3 font-medium text-gray-900">Financial month</th>
									<th className="px-4 py-3 font-medium text-gray-900">Financial year</th>
								</tr>
							</thead>
							<tbody>
								{transactions.map((tx, i) => (
									<tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
										<td className="px-4 py-3 text-gray-900">{tx.assetId || "-"}</td>
										<td className="px-4 py-3 text-gray-900">{tx.assetCategory}</td>
										<td className="px-4 py-3 text-gray-900">{tx.assetDescription}</td>
										<td className="px-4 py-3 text-gray-900">{tx.recordDate}</td>
										<td className="px-4 py-3 text-gray-900">{tx.effectiveDate}</td>
										<td className="px-4 py-3 text-gray-900">{tx.financialMonth}</td>
										<td className="px-4 py-3 text-gray-900">{tx.financialYear}</td>
									</tr>
								))}
							</tbody>
						</table>
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
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b" colSpan={48}>
															<div className="flex">
																<span className="flex-1">Month One</span>
																<span className="flex-1">Month Two</span>
																<span className="flex-1">Month Three</span>
																<span className="flex-1">Month Four</span>
																<span className="flex-1">Month Five</span>
																<span className="flex-1">Month Six</span>
																<span className="flex-1">Month Seven</span>
																<span className="flex-1">Month Eight</span>
																<span className="flex-1">Month Nine</span>
																<span className="flex-1">Month Ten</span>
																<span className="flex-1">Month Eleven</span>
																<span className="flex-1">Month Twelve</span>
															</div>
														</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b" colSpan={6}>
															Acc classification at close
														</th>
													</tr>
													<tr className="bg-gray-50">
														{Array(12).fill(0).map((_, i) => (
															<React.Fragment key={i}>
																<th className="px-1 py-1 text-center text-xs font-medium text-gray-600 border-b">Open</th>
																<th className="px-1 py-1 text-center text-xs font-medium text-gray-600 border-b">Revalns</th>
																<th className="px-1 py-1 text-center text-xs font-medium text-gray-600 border-b">Acq</th>
																<th className="px-1 py-1 text-center text-xs font-medium text-gray-600 border-b">Disp</th>
																<th className="px-1 py-1 text-center text-xs font-medium text-gray-600 border-b">Depn</th>
															</React.Fragment>
														))}
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b">Open</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b">Total revals</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b">Total additions</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b">Total disposals</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b">Total depn</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b">Close</th>
													</tr>
												</thead>
												<tbody>
													{depreciationResults.filter(r => r.calcType === "accounting").map((result, index) => (
														<tr key={index} className="border-b hover:bg-gray-50">
															<td className="px-2 py-1 text-xs text-gray-900 font-medium">{result.assetId || "-"}</td>
															{result.months.map((month: any, monthIndex: number) => (
																<React.Fragment key={monthIndex}>
																	<td className="px-1 py-1 text-xs text-gray-900 text-right">{month ? formatCurrency(month.openingValue) : "-"}</td>
																	<td className="px-1 py-1 text-xs text-gray-900 text-right">{month ? formatCurrency(month.revalns) : "-"}</td>
																	<td className="px-1 py-1 text-xs text-gray-900 text-right">{month ? formatCurrency(month.acquisitions) : "-"}</td>
																	<td className="px-1 py-1 text-xs text-gray-900 text-right">{month ? formatCurrency(month.disposals) : "-"}</td>
																	<td className="px-1 py-1 text-xs text-gray-900 text-right">{month ? formatCurrency(month.depn) : "-"}</td>
																</React.Fragment>
															))}
															<td className="px-2 py-1 text-xs text-gray-900 text-right">{formatCurrency(result.open)}</td>
															<td className="px-2 py-1 text-xs text-gray-900 text-right">{formatCurrency(result.totalRevals)}</td>
															<td className="px-2 py-1 text-xs text-gray-900 text-right">{formatCurrency(result.totalAdditions)}</td>
															<td className="px-2 py-1 text-xs text-gray-900 text-right">{formatCurrency(result.totalDisposals)}</td>
															<td className="px-2 py-1 text-xs text-gray-900 text-right">{formatCurrency(result.totalDepn)}</td>
															<td className="px-2 py-1 text-xs text-gray-900 text-right">{formatCurrency(result.close)}</td>
														</tr>
													))}
												</tbody>
												<tfoot>
													<tr className="bg-gray-100 font-semibold">
														<td className="px-2 py-2 text-xs text-gray-900" colSpan={2}>Total</td>
														{Array(12).fill(0).map((_, i) => (
															<React.Fragment key={i}>
																<td className="px-1 py-1 text-xs text-gray-900 text-right">-</td>
																<td className="px-1 py-1 text-xs text-gray-900 text-right">-</td>
																<td className="px-1 py-1 text-xs text-gray-900 text-right">-</td>
																<td className="px-1 py-1 text-xs text-gray-900 text-right">-</td>
																<td className="px-1 py-1 text-xs text-gray-900 text-right">
																	{formatCurrency(depreciationResults.filter(r => r.calcType === "accounting").reduce((sum, r) => sum + (r.months[i]?.depn || 0), 0))}
																</td>
															</React.Fragment>
														))}
														<td className="px-2 py-1 text-xs text-gray-900 text-right">
															{formatCurrency(depreciationResults.filter(r => r.calcType === "accounting").reduce((sum, r) => sum + r.open, 0))}
														</td>
														<td className="px-2 py-1 text-xs text-gray-900 text-right">-</td>
														<td className="px-2 py-1 text-xs text-gray-900 text-right">-</td>
														<td className="px-2 py-1 text-xs text-gray-900 text-right">-</td>
														<td className="px-2 py-1 text-xs text-gray-900 text-right">
															{formatCurrency(depreciationResults.filter(r => r.calcType === "accounting").reduce((sum, r) => sum + r.totalDepn, 0))}
														</td>
														<td className="px-2 py-1 text-xs text-gray-900 text-right">
															{formatCurrency(depreciationResults.filter(r => r.calcType === "accounting").reduce((sum, r) => sum + r.close, 0))}
														</td>
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
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b" colSpan={48}>
															<div className="flex">
																<span className="flex-1">Month One</span>
																<span className="flex-1">Month Two</span>
																<span className="flex-1">Month Three</span>
																<span className="flex-1">Month Four</span>
																<span className="flex-1">Month Five</span>
																<span className="flex-1">Month Six</span>
																<span className="flex-1">Month Seven</span>
																<span className="flex-1">Month Eight</span>
																<span className="flex-1">Month Nine</span>
																<span className="flex-1">Month Ten</span>
																<span className="flex-1">Month Eleven</span>
																<span className="flex-1">Month Twelve</span>
															</div>
														</th>
														<th className="px-2 py-2 text-center text-sm font-medium text-gray-700 border-b" colSpan={6}>
															Tax classification at close
														</th>
													</tr>
													<tr className="bg-gray-50">
														{Array(12).fill(0).map((_, i) => (
															<React.Fragment key={i}>
																<th className="px-1 py-1 text-center text-xs font-medium text-gray-600 border-b">Open</th>
																<th className="px-1 py-1 text-center text-xs font-medium text-gray-600 border-b">Revalns</th>
																<th className="px-1 py-1 text-center text-xs font-medium text-gray-600 border-b">Acq</th>
																<th className="px-1 py-1 text-center text-xs font-medium text-gray-600 border-b">Disp</th>
																<th className="px-1 py-1 text-center text-xs font-medium text-gray-600 border-b">Depn</th>
															</React.Fragment>
														))}
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b">Open</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b">Total revals</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b">Total additions</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b">Total disposals</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b">Total depn</th>
														<th className="px-2 py-1 text-center text-xs font-medium text-gray-600 border-b">Close</th>
													</tr>
												</thead>
												<tbody>
													{depreciationResults.filter(r => r.calcType === "tax").map((result, index) => (
														<tr key={index} className="border-b hover:bg-gray-50">
															<td className="px-2 py-1 text-xs text-gray-900 font-medium">{result.assetId || "-"}</td>
															{result.months.map((month: any, monthIndex: number) => (
																<React.Fragment key={monthIndex}>
																	<td className="px-1 py-1 text-xs text-gray-900 text-right">{month ? formatCurrency(month.openingValue) : "-"}</td>
																	<td className="px-1 py-1 text-xs text-gray-900 text-right">{month ? formatCurrency(month.revalns) : "-"}</td>
																	<td className="px-1 py-1 text-xs text-gray-900 text-right">{month ? formatCurrency(month.acquisitions) : "-"}</td>
																	<td className="px-1 py-1 text-xs text-gray-900 text-right">{month ? formatCurrency(month.disposals) : "-"}</td>
																	<td className="px-1 py-1 text-xs text-gray-900 text-right">{month ? formatCurrency(month.depn) : "-"}</td>
																</React.Fragment>
															))}
															<td className="px-2 py-1 text-xs text-gray-900 text-right">{formatCurrency(result.open)}</td>
															<td className="px-2 py-1 text-xs text-gray-900 text-right">{formatCurrency(result.totalRevals)}</td>
															<td className="px-2 py-1 text-xs text-gray-900 text-right">{formatCurrency(result.totalAdditions)}</td>
															<td className="px-2 py-1 text-xs text-gray-900 text-right">{formatCurrency(result.totalDisposals)}</td>
															<td className="px-2 py-1 text-xs text-gray-900 text-right">{formatCurrency(result.totalDepn)}</td>
															<td className="px-2 py-1 text-xs text-gray-900 text-right">{formatCurrency(result.close)}</td>
														</tr>
													))}
												</tbody>
												<tfoot>
													<tr className="bg-gray-100 font-semibold">
														<td className="px-2 py-2 text-xs text-gray-900" colSpan={2}>Total</td>
														{Array(12).fill(0).map((_, i) => (
															<React.Fragment key={i}>
																<td className="px-1 py-1 text-xs text-gray-900 text-right">-</td>
																<td className="px-1 py-1 text-xs text-gray-900 text-right">-</td>
																<td className="px-1 py-1 text-xs text-gray-900 text-right">-</td>
																<td className="px-1 py-1 text-xs text-gray-900 text-right">-</td>
																<td className="px-1 py-1 text-xs text-gray-900 text-right">
																	{formatCurrency(depreciationResults.filter(r => r.calcType === "tax").reduce((sum, r) => sum + (r.months[i]?.depn || 0), 0))}
																</td>
															</React.Fragment>
														))}
														<td className="px-2 py-1 text-xs text-gray-900 text-right">
															{formatCurrency(depreciationResults.filter(r => r.calcType === "tax").reduce((sum, r) => sum + r.open, 0))}
														</td>
														<td className="px-2 py-1 text-xs text-gray-900 text-right">-</td>
														<td className="px-2 py-1 text-xs text-gray-900 text-right">-</td>
														<td className="px-2 py-1 text-xs text-gray-900 text-right">-</td>
														<td className="px-2 py-1 text-xs text-gray-900 text-right">
															{formatCurrency(depreciationResults.filter(r => r.calcType === "tax").reduce((sum, r) => sum + r.totalDepn, 0))}
														</td>
														<td className="px-2 py-1 text-xs text-gray-900 text-right">
															{formatCurrency(depreciationResults.filter(r => r.calcType === "tax").reduce((sum, r) => sum + r.close, 0))}
														</td>
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
													{depreciationResults.filter(r => r.calcType === "accounting").map((result, index) => (
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
															{formatCurrency(depreciationResults.filter(r => r.calcType === "accounting").reduce((sum, r) => sum + r.openingBookValue, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(depreciationResults.filter(r => r.calcType === "accounting").reduce((sum, r) => sum + r.revaluations, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(depreciationResults.filter(r => r.calcType === "accounting").reduce((sum, r) => sum + r.additions, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(depreciationResults.filter(r => r.calcType === "accounting").reduce((sum, r) => sum + r.disposals, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(depreciationResults.filter(r => r.calcType === "accounting").reduce((sum, r) => sum + r.depreciation, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(depreciationResults.filter(r => r.calcType === "accounting").reduce((sum, r) => sum + r.closingBookValue, 0))}
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
													{depreciationResults.filter(r => r.calcType === "tax").map((result, index) => (
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
															{formatCurrency(depreciationResults.filter(r => r.calcType === "tax").reduce((sum, r) => sum + r.openingBookValue, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(depreciationResults.filter(r => r.calcType === "tax").reduce((sum, r) => sum + r.revaluations, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(depreciationResults.filter(r => r.calcType === "tax").reduce((sum, r) => sum + r.additions, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(depreciationResults.filter(r => r.calcType === "tax").reduce((sum, r) => sum + r.disposals, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(depreciationResults.filter(r => r.calcType === "tax").reduce((sum, r) => sum + r.depreciation, 0))}
														</td>
														<td className="px-4 py-2 text-gray-900 text-right">
															{formatCurrency(depreciationResults.filter(r => r.calcType === "tax").reduce((sum, r) => sum + r.closingBookValue, 0))}
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
