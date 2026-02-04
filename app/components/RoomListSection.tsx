import type { Room, Asset } from "~/types";
import { formatCurrency } from "~/utils";

interface RoomListSectionProps {
  rooms: Room[];
  selectedRoomId: string | null;
  wizardActive: boolean;
  assetWizardOpen: boolean;
  onRoomClick: (roomId: string) => void;
  onAddAssets: (roomId: string) => void;
  onRemoveRoom: (roomId: string) => void;
  onEditAsset: (roomId: string, asset: Asset) => void;
  onDeleteAsset: (roomId: string, assetId: string) => void;
}

export default function RoomListSection({
  rooms,
  selectedRoomId,
  wizardActive,
  assetWizardOpen,
  onRoomClick,
  onAddAssets,
  onRemoveRoom,
  onEditAsset,
  onDeleteAsset,
}: RoomListSectionProps) {
  if (rooms.length === 0) return null;

  return (
    <div className="w-full max-w-lg mt-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">
        Asset Groups ({rooms.length})
      </h3>
      <ul className="space-y-2">
        {rooms.map((room) => (
          <li
            key={room.id}
            className={`rounded-lg border transition-colors ${
              room.isWholeSite
                ? "border-indigo-300 bg-indigo-50"
                : selectedRoomId === room.id
                ? "border-blue-300 bg-blue-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div
              onClick={() => !wizardActive && !room.isWholeSite && onRoomClick(room.id)}
              className={`flex items-center justify-between px-3 py-2 ${!room.isWholeSite ? "cursor-pointer" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: room.color }}
                />
                <span className="text-gray-900 font-medium">{room.name}</span>
                {room.isWholeSite && (
                  <span className="text-xs bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded">
                    Site Assets
                  </span>
                )}
                <span className="text-gray-500 text-xs">
                  ({room.assets.length} assets)
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddAssets(room.id);
                  }}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Add Assets
                </button>
                {!room.isWholeSite && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveRoom(room.id);
                    }}
                    className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            {/* Assets list */}
            {room.assets.length > 0 && !assetWizardOpen && (
              <ul className="px-3 pb-2 space-y-1">
                {room.assets.map((asset) => {
                  const isIncomplete = asset.incomplete;

                  return (
                    <li
                      key={asset.id}
                      className={`py-1 px-2 rounded text-sm ${isIncomplete ? 'bg-amber-50 border border-amber-200' : 'bg-white'}`}
                    >
                      {isIncomplete ? (
                        // Collapsed view for incomplete assets (no dropdown)
                        <div
                          onClick={() => onEditAsset(room.id, asset)}
                          className="flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {asset.photo && (
                              <img
                                src={asset.photo}
                                alt={asset.name}
                                className="w-6 h-6 object-cover rounded"
                              />
                            )}
                            <span className="font-medium text-amber-700">
                              {asset.itemType ? `${asset.itemType}: ` : ''}{asset.name}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAsset(room.id, asset.id);
                              }}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Remove asset"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Full view for complete assets
                        <div
                          onClick={() => onEditAsset(room.id, asset)}
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1 flex items-center gap-2">
                            {asset.photo && (
                              <img
                                src={asset.photo}
                                alt={asset.name}
                                className="w-8 h-8 object-cover rounded"
                              />
                            )}
                            <div>
                              <span className="font-medium text-gray-800">
                                {asset.itemType ? `${asset.itemType}: ` : ''}{asset.name}
                              </span>
                              {asset.serialNumber && (
                                <span className="text-gray-400 ml-2 text-xs">
                                  (SN: {asset.serialNumber})
                                </span>
                              )}
                              {asset.purchasePrice > 0 && (
                                <span className="text-gray-500 ml-2">
                                  {formatCurrency(asset.purchasePrice)}
                                </span>
                              )}
                              {asset.purchaseDate && (
                                <span className="text-gray-400 ml-2 text-xs">
                                  ({asset.purchaseDate})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAsset(room.id, asset.id);
                              }}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Remove asset"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
