import type { Room } from "~/types";

interface AssetListProps {
  room: Room;
  assetWizardRoomId: string | null;
  onEditAsset: (asset: any) => void;
  onDeleteAsset: (roomId: string, assetId: string) => void;
  formatCurrency: (value: number) => string;
}

export default function AssetList({
  room,
  assetWizardRoomId,
  onEditAsset,
  onDeleteAsset,
  formatCurrency
}: AssetListProps) {
  if (room.assets.length === 0 || assetWizardRoomId) return null;

  return (
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
                onClick={() => {
                  onEditAsset({
                    ...asset,
                    itemType: asset.itemType || "",
                    name: asset.name,
                    assetId: asset.assetId || "",
                    serialNumber: asset.serialNumber || "",
                    purchasePrice: asset.purchasePrice ? asset.purchasePrice.toString() : "",
                    purchaseDate: asset.purchaseDate || "",
                    photo: asset.photo || null,
                  });
                }}
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
                onClick={() => {
                  onEditAsset({
                    ...asset,
                    itemType: asset.itemType || "",
                    name: asset.name,
                    assetId: asset.assetId || "",
                    serialNumber: asset.serialNumber || "",
                    purchasePrice: asset.purchasePrice ? asset.purchasePrice.toString() : "",
                    purchaseDate: asset.purchaseDate || "",
                    photo: asset.photo || null,
                  });
                }}
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
  );
}