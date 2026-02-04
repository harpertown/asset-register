/**
 * CSV parsing utilities
 */

import { parseDate } from "./dates";
import type { Asset } from "~/types";

/**
 * Parsed asset from CSV with additional depreciation fields
 */
export interface ParsedCSVAsset {
	id: string;
	assetId: string;
	itemType: string;
	name: string;
	serialNumber: string;
	purchasePrice: number;
	purchaseDate: string;
	depnMethodAcc: string;
	depnRateAcc: string;
	depnMethodTax: string;
	depnRateTax: string;
	incomplete: boolean;
}

/**
 * Parse a single CSV line, handling quoted fields
 */
export function parseCSVLine(line: string): string[] {
	const result: string[] = [];
	let current = "";
	let inQuotes = false;
	
	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		
		if (char === '"') {
			if (inQuotes && line[i + 1] === '"') {
				// Escaped quote
				current += '"';
				i++;
			} else {
				// Toggle quote mode
				inQuotes = !inQuotes;
			}
		} else if (char === ',' && !inQuotes) {
			result.push(current.trim());
			current = "";
		} else {
			current += char;
		}
	}
	
	result.push(current.trim());
	return result;
}

/**
 * Parse CSV text into an array of ParsedCSVAsset objects
 * Handles various column formats including depreciation fields
 */
export function parseCSVForImport(csvText: string): ParsedCSVAsset[] {
	const lines = csvText.split('\n').filter(line => line.trim());
	if (lines.length < 2) return [];

	// Parse header
	const headers = parseCSVLine(lines[0]);

	// Find column indices
	const assetIdIndex = headers.findIndex(h => h.toLowerCase().includes('asset id'));
	const categoryIndex = headers.findIndex(h => h.toLowerCase().includes('category'));
	const descriptionIndex = headers.findIndex(h => h.toLowerCase().includes('description'));
	const dateIndex = headers.findIndex(h => h.toLowerCase().includes('effective date') || h.toLowerCase().includes('record date'));
	const amountIndex = headers.findIndex(h => h.toLowerCase().includes('transaction amount'));
	const depnMethodAccIndex = headers.findIndex(h => h.toLowerCase().includes('depn method (acc)'));
	const depnRateAccIndex = headers.findIndex(h => h.toLowerCase().includes('depn rate (acc)'));
	const depnMethodTaxIndex = headers.findIndex(h => h.toLowerCase().includes('depn method (tax)'));
	const depnRateTaxIndex = headers.findIndex(h => h.toLowerCase().includes('depn rate (tax)'));

	const assets: ParsedCSVAsset[] = [];

	// Parse data rows
	for (let i = 1; i < lines.length; i++) {
		const values = parseCSVLine(lines[i]);
		if (values.length < 2) continue;

		// Extract serial number from description (e.g., "iPhone 14 (serial XYZ123467)")
		const description = values[descriptionIndex] || values[categoryIndex] || "Unknown Asset";
		const serialMatch = description.match(/\(serial\s+([^\)]+)\)/i);
		const serialNumber = serialMatch ? serialMatch[1] : "";
		const name = description.replace(/\(serial\s+[^\)]+\)/i, "").trim();

		// Parse purchase price (remove commas and currency symbols)
		const amountStr = values[amountIndex] || "0";
		const purchasePrice = parseFloat(amountStr.replace(/[,NZD$]/g, '')) || 0;

		// Parse date
		const dateStr = values[dateIndex] || "";
		const purchaseDate = parseDate(dateStr);

		assets.push({
			id: `import-${Date.now()}-${i}`,
			assetId: values[assetIdIndex] || "",
			itemType: values[categoryIndex] || "",
			name: name,
			serialNumber: serialNumber,
			purchasePrice: purchasePrice,
			purchaseDate: purchaseDate,
			depnMethodAcc: values[depnMethodAccIndex] || "",
			depnRateAcc: values[depnRateAccIndex] || "",
			depnMethodTax: values[depnMethodTaxIndex] || "",
			depnRateTax: values[depnRateTaxIndex] || "",
			incomplete: purchasePrice === 0 || !purchaseDate,
		});
	}

	return assets;
}

/**
 * Parse CSV text into an array of Asset objects (simpler version)
 */
export function parseCSV(csvText: string): Partial<Asset>[] {
	const lines = csvText.split('\n').filter(line => line.trim());
	if (lines.length < 2) return []; // Need header + at least one data row
	
	const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
	const assets: Partial<Asset>[] = [];
	
	// Map common CSV header names to Asset fields
	const headerMap: Record<string, keyof Asset> = {
		'name': 'name',
		'asset name': 'name',
		'description': 'name',
		'item': 'name',
		'serial': 'serialNumber',
		'serial number': 'serialNumber',
		'serialnumber': 'serialNumber',
		'serial no': 'serialNumber',
		'type': 'itemType',
		'item type': 'itemType',
		'category': 'itemType',
		'asset type': 'itemType',
		'price': 'purchasePrice',
		'purchase price': 'purchasePrice',
		'cost': 'purchasePrice',
		'value': 'purchasePrice',
		'date': 'purchaseDate',
		'purchase date': 'purchaseDate',
		'purchased': 'purchaseDate',
		'acquisition date': 'purchaseDate',
	};
	
	for (let i = 1; i < lines.length; i++) {
		const values = parseCSVLine(lines[i]);
		if (values.length === 0 || values.every(v => !v)) continue;
		
		const asset: Partial<Asset> = {
			id: crypto.randomUUID(),
			incomplete: true,
		};
		
		headers.forEach((header, index) => {
			const field = headerMap[header];
			const value = values[index];
			
			if (field && value) {
				if (field === 'purchasePrice') {
					// Parse currency values
					const numericValue = parseFloat(value.replace(/[$,]/g, ''));
					if (!isNaN(numericValue)) {
						asset.purchasePrice = numericValue;
					}
				} else if (field === 'purchaseDate') {
					asset.purchaseDate = parseDate(value);
				} else {
					(asset as any)[field] = value;
				}
			}
		});
		
		// Only add if we have at least a name
		if (asset.name) {
			assets.push(asset);
		}
	}
	
	return assets;
}

/**
 * Generate CSV content from assets
 */
export function generateCSV(assets: { assetId?: string; name: string; itemType: string; serialNumber?: string; purchasePrice: number; purchaseDate: string }[]): string {
	const headers = ['Asset ID', 'Name', 'Type', 'Serial Number', 'Purchase Price', 'Purchase Date'];
	const rows = assets.map(asset => [
		asset.assetId || '',
		`"${(asset.name || '').replace(/"/g, '""')}"`,
		`"${(asset.itemType || '').replace(/"/g, '""')}"`,
		asset.serialNumber || '',
		asset.purchasePrice?.toString() || '0',
		asset.purchaseDate || '',
	]);
	
	return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
