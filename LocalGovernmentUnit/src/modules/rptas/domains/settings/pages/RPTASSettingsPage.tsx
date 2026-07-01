import React from 'react';

const RPTASSettingsPage = () => {
  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium text-gray-800 mb-2">API Configuration</h2>
          <p className="text-gray-600 text-sm mb-4">Configure connection to the main application API.</p>
          <input 
            type="text" 
            defaultValue={import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1"}
            className="w-full border rounded px-4 py-2 text-gray-700 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/50 outline-none"
            readOnly
          />
        </div>
      </div>
    </div>
  );
};

export default RPTASSettingsPage;
