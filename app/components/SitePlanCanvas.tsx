import { useState, useRef, useEffect } from "react";
import type { Room, Point, Tool } from "~/types";

interface SitePlanCanvasProps {
  register: any;
  wizardActive: boolean;
  selectedTool: Tool;
  selectedColor: string;
  onCanvasInteraction: (event: {
    type: string;
    position?: Point;
    startPoint?: Point;
    currentPath?: Point[];
    previewShape?: Room;
  }) => void;
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string | null) => void;
  renderShape: (room: Room, isPreview?: boolean) => React.JSX.Element | null;
}

export default function SitePlanCanvas({
  register,
  wizardActive,
  selectedTool,
  selectedColor,
  onCanvasInteraction,
  selectedRoomId,
  setSelectedRoomId,
  renderShape
}: SitePlanCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);

  const getRelativePosition = (e: React.MouseEvent): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getRelativePosition(e);
    setIsDrawing(true);
    setStartPoint(pos);
    
    if (selectedTool === "pen") {
      setCurrentPath([pos]);
    }
    
    onCanvasInteraction({ type: "mousedown", position: pos, startPoint: pos });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPoint) return;
    const pos = getRelativePosition(e);

    if (selectedTool === "rectangle") {
      const previewShape: Room = {
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
      };
      onCanvasInteraction({ type: "mousemove", previewShape });
    } else if (selectedTool === "circle") {
      const radius = Math.sqrt(
        Math.pow(pos.x - startPoint.x, 2) + Math.pow(pos.y - startPoint.y, 2)
      );
      const previewShape: Room = {
        id: "preview",
        name: "",
        tool: "circle",
        color: selectedColor,
        assets: [],
        circle: { cx: startPoint.x, cy: startPoint.y, radius },
      };
      onCanvasInteraction({ type: "mousemove", previewShape });
    } else if (selectedTool === "pen") {
      const newPath = [...currentPath, pos];
      setCurrentPath(newPath);
      const previewShape: Room = {
        id: "preview",
        name: "",
        tool: "pen",
        color: selectedColor,
        assets: [],
        path: newPath,
      };
      onCanvasInteraction({ type: "mousemove", currentPath: newPath, previewShape });
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentPath([]);
      onCanvasInteraction({ type: "mouseup" });
    }
  };

  return (
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
      {register.rooms.map((room: Room) => renderShape(room))}
      {/* Render preview shape */}
      {/* Note: Preview shape is handled by parent component */}
    </div>
  );
}