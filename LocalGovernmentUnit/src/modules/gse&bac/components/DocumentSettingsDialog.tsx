import { useState, useEffect } from "react";
import { X, Plus, Trash2, RotateCcw } from "lucide-react";
import type { PRDocumentHeader, PRSignatory } from "./PRDocumentComponents";
import {
  loadDocumentSettings,
  saveDocumentSettings,
  resetDocumentSettings,
  type DocumentSettings,
} from "../services/documentSettingsService";

interface DocumentSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: DocumentSettings) => void;
}

export const DocumentSettingsDialog = ({
  isOpen,
  onClose,
  onSave,
}: DocumentSettingsDialogProps) => {
  const [header, setHeader] = useState<PRDocumentHeader>({
    provinceName: "",
    entityName: "",
    subEntityName: "",
    address: "",
  });
  const [signatories, setSignatories] = useState<PRSignatory[]>([]);

  useEffect(() => {
    if (isOpen) {
      const settings = loadDocumentSettings();
      setHeader(settings.header);
      setSignatories(settings.signatories);
    }
  }, [isOpen]);

  const handleSave = () => {
    const settings: DocumentSettings = { header, signatories };
    saveDocumentSettings(settings);
    onSave(settings);
    onClose();
  };

  const handleReset = () => {
    if (confirm("Reset to default values? This will remove your custom settings.")) {
      const defaults = resetDocumentSettings();
      setHeader(defaults.header);
      setSignatories(defaults.signatories);
    }
  };

  const updateSignatory = (index: number, field: keyof PRSignatory, value: string) => {
    setSignatories((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const addSignatory = () => {
    setSignatories((prev) => [
      ...prev,
      { name: "", position: "", title: "Signatory:" },
    ]);
  };

  const removeSignatory = (index: number) => {
    setSignatories((prev) => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Document Header & Footer Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          {/* Header Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Document Header
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Province/Region Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={header.provinceName}
                  onChange={(e) =>
                    setHeader((prev) => ({ ...prev, provinceName: e.target.value }))
                  }
                  placeholder="e.g., Province of Agusan del Norte"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Entity/Office Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={header.entityName}
                  onChange={(e) =>
                    setHeader((prev) => ({ ...prev, entityName: e.target.value }))
                  }
                  placeholder="e.g., PROVINCIAL HEALTH OFFICE"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Sub-Entity Name (Optional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={header.subEntityName || ""}
                  onChange={(e) =>
                    setHeader((prev) => ({ ...prev, subEntityName: e.target.value }))
                  }
                  placeholder="e.g., Agusan del Norte Provincial Hospital"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={header.address}
                  onChange={(e) =>
                    setHeader((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="e.g., Libertad, Butuan City"
                />
              </div>
            </div>
          </div>

          {/* Footer/Signatories Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Document Signatories
              </h3>
              <button
                type="button"
                onClick={addSignatory}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Signatory
              </button>
            </div>
            <div className="space-y-4">
              {signatories.map((signatory, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative"
                >
                  <button
                    type="button"
                    onClick={() => removeSignatory(index)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove signatory"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-1 gap-3 pr-8">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Title/Role Label
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={signatory.title || ""}
                        onChange={(e) => updateSignatory(index, "title", e.target.value)}
                        placeholder="e.g., Requested by:, Approved by:"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={signatory.name}
                        onChange={(e) => updateSignatory(index, "name", e.target.value)}
                        placeholder="e.g., JUAN DELA CRUZ"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Position
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={signatory.position}
                        onChange={(e) => updateSignatory(index, "position", e.target.value)}
                        placeholder="e.g., Provincial Health Officer II"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {signatories.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  No signatories added. Click "Add Signatory" to add one.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentSettingsDialog;
