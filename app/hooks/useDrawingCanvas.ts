/**
 * Custom hook for managing drawing canvas state
 */
import { useState, useRef, useCallback } from "react";
import type { Point, DrawingShape, DrawingTool } from "~/types";
import { COLORS } from "~/constants";

export interface DrawingCanvasState {
	isDrawing: boolean;
	startPoint: Point | null;
	currentPath: Point[];
	selectedTool: DrawingTool;
	selectedColor: string;
	previewShape: DrawingShape | null;
}

const initialState: DrawingCanvasState = {
	isDrawing: false,
	startPoint: null,
	currentPath: [],
	selectedTool: "select",
	selectedColor: COLORS[0],
	previewShape: null,
};

export function useDrawingCanvas() {
	const [state, setState] = useState<DrawingCanvasState>(initialState);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const setTool = useCallback((tool: DrawingTool) => {
		setState(prev => ({ ...prev, selectedTool: tool }));
	}, []);

	const setColor = useCallback((color: string) => {
		setState(prev => ({ ...prev, selectedColor: color }));
	}, []);

	const startDrawing = useCallback((point: Point) => {
		setState(prev => ({
			...prev,
			isDrawing: true,
			startPoint: point,
			currentPath: [point],
		}));
	}, []);

	const continueDrawing = useCallback((point: Point) => {
		setState(prev => {
			if (!prev.isDrawing) return prev;
			return {
				...prev,
				currentPath: [...prev.currentPath, point],
			};
		});
	}, []);

	const stopDrawing = useCallback(() => {
		setState(prev => ({
			...prev,
			isDrawing: false,
			startPoint: null,
			currentPath: [],
			previewShape: null,
		}));
	}, []);

	const setPreviewShape = useCallback((shape: DrawingShape | null) => {
		setState(prev => ({ ...prev, previewShape: shape }));
	}, []);

	const reset = useCallback(() => {
		setState(initialState);
	}, []);

	return {
		state,
		canvasRef,
		actions: {
			setTool,
			setColor,
			startDrawing,
			continueDrawing,
			stopDrawing,
			setPreviewShape,
			reset,
		},
	};
}

export type UseDrawingCanvas = ReturnType<typeof useDrawingCanvas>;
