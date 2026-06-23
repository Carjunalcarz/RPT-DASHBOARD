import type { PRSignatory } from "./PRDocumentComponents";

interface DocumentFooterProps {
  signatories: PRSignatory[];
  requestedByValue?: string;
  onRequestedByChange?: (value: string) => void;
  isReadOnly?: boolean;
}

export const DocumentFooter = ({
  signatories,
  requestedByValue = "",
  onRequestedByChange,
  isReadOnly = false,
}: DocumentFooterProps) => {
  return (
    <div className="border-t-2 border-gray-800 px-4 py-4">
      <div className="grid grid-cols-3 gap-4">
        {signatories.map((signatory, index) => {
          const isRequestedBy = signatory.title?.toLowerCase().includes("requested");

          return (
            <div key={index} className="text-center">
              <p className="text-[9px] text-gray-500 uppercase mb-8">
                {signatory.title || "Signatory:"}
              </p>
              <div className="border-b border-gray-800 mx-4 mb-1" />
              {isRequestedBy && onRequestedByChange ? (
                <input
                  type="text"
                  className="w-full text-xs font-bold text-center bg-transparent border-0 py-0.5 focus:outline-none uppercase"
                  value={requestedByValue}
                  onChange={(e) => onRequestedByChange(e.target.value)}
                  placeholder={signatory.name || "Name"}
                  disabled={isReadOnly}
                />
              ) : (
                <p className="text-xs font-bold uppercase">{signatory.name}</p>
              )}
              <p className="text-[9px] text-gray-500">{signatory.position}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DocumentFooter;
