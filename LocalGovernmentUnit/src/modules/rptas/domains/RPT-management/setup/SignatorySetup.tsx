import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/modules/rptas/ui/tabs';
import SignatoryList from './SignatoryList';
import SignatoryTemplateManager from './SignatoryTemplateManager';

const SignatorySetup: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold text-foreground dark:text-surface">Signatory Setup</h1>
        <p className="text-muted dark:text-muted">Manage officials, staff, and reusable signature templates.</p>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="list">Signatories List</TabsTrigger>
          <TabsTrigger value="templates">Templates (By Year)</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-6">
          <SignatoryList />
        </TabsContent>
        <TabsContent value="templates" className="mt-6">
          <SignatoryTemplateManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SignatorySetup;
