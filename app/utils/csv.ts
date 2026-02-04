/**
 * CSV parsing utilities
 */

import { parseDate } from "./dates";
import type { Asset } from "~/types";

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
 * Parse CSV text into an array of Asset objects
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
