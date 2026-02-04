import ModalWrapper from "./ModalWrapper";

interface RoomNamingModalProps {
  namingRoom: any;
  roomName: string;
  onRoomNameChange: (value: string) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function RoomNamingModal({
  namingRoom,
  roomName,
  onRoomNameChange,
  onSave,
  onCancel
}: RoomNamingModalProps) {
  return (
    <ModalWrapper isOpen={!!namingRoom} onClose={onCancel} maxWidth="max-w-sm">
      <form onSubmit={onSave} className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-gray-900">Name this room</h3>
        <input
          type="text"
          value={roomName}
          onChange={(e) => onRoomNameChange(e.target.value)}
          placeholder="e.g., Living Room, Kitchen..."
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-900 w-64"
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Room
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}