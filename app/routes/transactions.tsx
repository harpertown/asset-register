import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router";

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
	photo?: string;
	incomplete?: boolean;
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
			</div>
		</div>
	);
}
