import React from 'react';
import SignatorySetup from '../setup/SignatorySetup';

const SignatorySetupPage: React.FC = () => {
  return (
    <div className="h-full flex flex-col p-6 space-y-6 bg-background dark:bg-background overflow-auto">
      <div className="bg-surface dark:bg-background rounded-xl shadow-sm border border-border dark:border-border p-6">
        <SignatorySetup />
      </div>
    </div>
  );
};

export default SignatorySetupPage;

