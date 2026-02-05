import type { Room, Asset } from "~/types";

interface IncompleteItemsSectionProps {
  register: any;
  incompleteSectionExpanded: boolean;
  setIncompleteSectionExpanded: (expanded: boolean) => void;
  onEditAsset: (roomId: string, asset: Asset) => void;
}

export default function IncompleteItemsSection({
  register,
  incompleteSectionExpanded,
  setIncompleteSectionExpanded,
  onEditAsset
}: IncompleteItemsSectionProps) {
  const hasIncompleteItems = register.rooms.some((room: Room) => 
    room.assets.some(asset => asset.incomplete)
  );

  if (!hasIncompleteItems) return null;

  const incompleteCount = register.rooms.reduce((count: number, room: Room) => 
    count + room.assets.filter(asset => asset.incomplete).length, 0
  );

  return (
    <div className="w-full max-w-lg mt-4">
      <div
        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors p-2 rounded-lg border border-amber-200 bg-amber-50"
        onClick={() => setIncompleteSectionExpanded(!incompleteSectionExpanded)}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-sm font-medium text-amber-700">
            Incomplete Items ({incompleteCount})
          </h3>
        </div>
        <svg className={`w-4 h-4 text-amber-600 transition-transform ${incompleteSectionExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {incompleteSectionExpanded && (
        <ul className="space-y-2 mt-2">
          {register.rooms.flatMap((room: Room) =>
            room.assets
              .filter((asset: Asset) => asset.incomplete)
              .map((asset: Asset) => {
                // Determine what's missing
                const missingFields: string[] = [];
                if (!asset.purchasePrice) missingFields.push("value");
                if (!asset.purchaseDate) missingFields.push("date");
                if (!asset.depnRateAcc || !asset.depnRateTax) missingFields.push("depreciation");
                
                return (
                  <li
                    key={asset.id}
                    className="flex items-center justify-between px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-amber-700 font-medium">{asset.name}</span>
                      {missingFields.length > 0 && (
                        <span className="text-xs text-amber-600">
                          Missing: {missingFields.join(", ")}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => onEditAsset(room.id, asset)}
                      className="px-3 py-1 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
                    >
                      Fix
                    </button>
                  </li>
                );
              })
          )}
        </ul>
      )}
    </div>
  );
}