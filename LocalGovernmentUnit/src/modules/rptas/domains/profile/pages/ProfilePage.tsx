import React from 'react';
import { useAuth } from '@/modules/rptas/context/AuthContext';

const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center space-x-6 mb-8 border-b pb-8 border-gray-100">
        <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center text-4xl font-bold text-white dark:text-white">
          {user?.name?.charAt(0) || user?.fullName?.charAt(0) || 'U'}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{user?.name || user?.fullName || 'User'}</h1>
          <p className="text-gray-500 capitalize">{user?.role || 'Standard'} Account</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase">Email</h3>
          <p className="text-lg text-gray-900">{user?.email || 'No email provided'}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase">User ID</h3>
          <p className="text-lg text-gray-900 font-mono">{user?.id || 'Unknown ID'}</p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
