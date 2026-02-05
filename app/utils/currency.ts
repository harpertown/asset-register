/**
 * Currency formatting utilities
 */

/**
 * Format a number as NZD currency
 * Returns "-" for zero values
 */
export function formatCurrency(amount: number): string {
	if (amount === 0) {
		return "-";
	}
	return new Intl.NumberFormat("en-NZ", {
		style: "currency",
		currency: "NZD",
	}).format(amount);
}

/**
 * Format a number string with commas for display in an input field
 * e.g., "1234567.89" -> "1,234,567.89"
 */
export function formatPriceInput(value: string): string {
	// Remove any existing commas
	const cleanValue = value.replace(/,/g, '');
	
	// Handle empty or invalid input
	if (!cleanValue || cleanValue === '-') return cleanValue;
	
	// Split by decimal point
	const parts = cleanValue.split('.');
	const integerPart = parts[0];
	const decimalPart = parts[1];
	
	// Format integer part with commas
	const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	
	// Return with decimal if present
	if (parts.length > 1) {
		return `${formattedInteger}.${decimalPart}`;
	}
	return formattedInteger;
}

/**
 * Parse a formatted price string back to a plain number string
 * e.g., "1,234,567.89" -> "1234567.89"
 */
export function parsePriceInput(value: string): string {
	return value.replace(/,/g, '');
}

/**
 * Minimum width style for currency cells to fit "$00,000,000.00"
 */
export const currencyCellStyle = { minWidth: '90px' };
