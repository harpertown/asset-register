import ModalWrapper from "./ModalWrapper";

interface ConfirmDeleteModalProps {
  confirmDeleteRoomId: string | null;
  roomName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteModal({
  confirmDeleteRoomId,
  roomName,
  onConfirm,
  onCancel
}: ConfirmDeleteModalProps) {
  return (
    <ModalWrapper isOpen={!!confirmDeleteRoomId} onClose={onCancel} maxWidth="max-w-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Are you sure?
      </h3>
      <p className="text-gray-600 mb-6">
        This will remove the asset group "{roomName}" and all its assets. This action cannot be undone.
      </p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Remove
        </button>
      </div>
    </ModalWrapper>
  );
}