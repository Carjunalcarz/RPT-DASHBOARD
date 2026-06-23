import type { PRDocumentHeader } from "./PRDocumentComponents";

interface DocumentHeaderProps {
  config: PRDocumentHeader;
}

export const DocumentHeader = ({ config }: DocumentHeaderProps) => {
  return (
    <div className="text-center border-b border-gray-300 py-3 px-6">
      <p className="text-xs text-gray-600">{config.provinceName}</p>
      <p className="text-sm font-bold text-gray-800">{config.entityName}</p>
      {config.subEntityName && (
        <p className="text-xs text-gray-600">{config.subEntityName}</p>
      )}
      <p className="text-[10px] italic text-gray-500">{config.address}</p>
    </div>
  );
};

export default DocumentHeader;
