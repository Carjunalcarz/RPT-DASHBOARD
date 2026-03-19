import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MoreVertical, 
  RefreshCw,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  listTemplates, 
  createTemplate, 
  updateTemplate, 
  deleteTemplate,
  SetupSignatoryTemplate,
  CreateTemplateDTO
} from '@/services/setupSignatoryTemplatesService';
import { listSetupSignatories, SetupSignatory } from '@/services/setupSignatoriesService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  Card, 
  CardContent, 
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

interface SignatoryFormData {
  year: number;
  description: string;
  isActive: boolean;
  appraisedById: string;
  appraisedSgd: boolean;
  appraisedTpd: boolean;
  appraisedDate: string;
  assessedById: string;
  assessedSgd: boolean;
  assessedTpd: boolean;
  assessedDate: string;
  recommendingById: string;
  recommendingSgd: boolean;
  recommendingTpd: boolean;
  recommendingDate: string;
  approvedById: string;
  approvedSgd: boolean;
  approvedTpd: boolean;
  approvedDate: string;
  provincialAssessorId: string;
  provincialAssessorSgd: boolean;
  provincialAssessorTpd: boolean;
  provincialAssessorDate: string;
  cityAssessorId: string;
  cityAssessorSgd: boolean;
  cityAssessorTpd: boolean;
  cityAssessorDate: string;
  deputyId: string;
  deputySgd: boolean;
  deputyTpd: boolean;
  deputyDate: string;
}

const SignatoryTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<SetupSignatoryTemplate[]>([]);
  const [signatories, setSignatories] = useState<SetupSignatory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SetupSignatoryTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<SignatoryFormData>({
    year: new Date().getFullYear() + 1,
    description: '',
    isActive: true,
    appraisedById: '',
    appraisedSgd: false,
    appraisedTpd: false,
    appraisedDate: '',
    assessedById: '',
    assessedSgd: false,
    assessedTpd: false,
    assessedDate: '',
    recommendingById: '',
    recommendingSgd: false,
    recommendingTpd: false,
    recommendingDate: '',
    approvedById: '',
    approvedSgd: false,
    approvedTpd: false,
    approvedDate: '',
    provincialAssessorId: '',
    provincialAssessorSgd: false,
    provincialAssessorTpd: false,
    provincialAssessorDate: '',
    cityAssessorId: '',
    cityAssessorSgd: false,
    cityAssessorTpd: false,
    cityAssessorDate: '',
    deputyId: '',
    deputySgd: false,
    deputyTpd: false,
    deputyDate: ''
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const fetchAllSignatories = async () => {
        const all: SetupSignatory[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const res = await listSetupSignatories({ page, limit: 100, isActive: 'true' });
          all.push(...res.data);
          totalPages = res.meta.totalPages;
          page += 1;
        } while (page <= totalPages);
        return all;
      };

      const [templatesRes, allSignatories] = await Promise.all([listTemplates(), fetchAllSignatories()]);
      setTemplates(templatesRes.data);
      setSignatories(allSignatories);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      const message =
        (error as any)?.response?.data?.message ||
        (error as any)?.response?.data?.error?.message ||
        'Failed to load templates. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenForm = (template: SetupSignatoryTemplate | null = null) => {
    if (template) {
      setSelectedTemplate(template);
      setFormData({
        year: template.year,
        description: template.description || '',
        isActive: template.isActive,
        appraisedById: template.appraisedById || '',
        appraisedSgd: template.appraisedSgd || false,
        appraisedTpd: template.appraisedTpd || false,
        appraisedDate: template.appraisedDate ? template.appraisedDate.split('T')[0] : '',
        assessedById: template.assessedById || '',
        assessedSgd: template.assessedSgd || false,
        assessedTpd: template.assessedTpd || false,
        assessedDate: template.assessedDate ? template.assessedDate.split('T')[0] : '',
        recommendingById: template.recommendingById || '',
        recommendingSgd: template.recommendingSgd || false,
        recommendingTpd: template.recommendingTpd || false,
        recommendingDate: template.recommendingDate ? template.recommendingDate.split('T')[0] : '',
        approvedById: template.approvedById || '',
        approvedSgd: template.approvedSgd || false,
        approvedTpd: template.approvedTpd || false,
        approvedDate: template.approvedDate ? template.approvedDate.split('T')[0] : '',
        provincialAssessorId: template.provincialAssessorId || '',
        provincialAssessorSgd: template.provincialAssessorSgd || false,
        provincialAssessorTpd: template.provincialAssessorTpd || false,
        provincialAssessorDate: template.provincialAssessorDate ? template.provincialAssessorDate.split('T')[0] : '',
        cityAssessorId: template.cityAssessorId || '',
        cityAssessorSgd: template.cityAssessorSgd || false,
        cityAssessorTpd: template.cityAssessorTpd || false,
        cityAssessorDate: template.cityAssessorDate ? template.cityAssessorDate.split('T')[0] : '',
        deputyId: template.deputyId || '',
        deputySgd: template.deputySgd || false,
        deputyTpd: template.deputyTpd || false,
        deputyDate: template.deputyDate ? template.deputyDate.split('T')[0] : ''
      });
    } else {
      setSelectedTemplate(null);
      setFormData({
        year: new Date().getFullYear() + 1,
        description: '',
        isActive: true,
        appraisedById: '',
        appraisedSgd: false,
        appraisedTpd: false,
        appraisedDate: '',
        assessedById: '',
        assessedSgd: false,
        assessedTpd: false,
        assessedDate: '',
        recommendingById: '',
        recommendingSgd: false,
        recommendingTpd: false,
        recommendingDate: '',
        approvedById: '',
        approvedSgd: false,
        approvedTpd: false,
        approvedDate: '',
        provincialAssessorId: '',
        provincialAssessorSgd: false,
        provincialAssessorTpd: false,
        provincialAssessorDate: '',
        cityAssessorId: '',
        cityAssessorSgd: false,
        cityAssessorTpd: false,
        cityAssessorDate: '',
        deputyId: '',
        deputySgd: false,
        deputyTpd: false,
        deputyDate: ''
      });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      // Convert empty strings to undefined for optional fields
      const payload = {
        ...formData,
        appraisedById: formData.appraisedById || undefined,
        appraisedDate: formData.appraisedDate || undefined,
        assessedById: formData.assessedById || undefined,
        assessedDate: formData.assessedDate || undefined,
        recommendingById: formData.recommendingById || undefined,
        recommendingDate: formData.recommendingDate || undefined,
        approvedById: formData.approvedById || undefined,
        approvedDate: formData.approvedDate || undefined,
        provincialAssessorId: formData.provincialAssessorId || undefined,
        provincialAssessorDate: formData.provincialAssessorDate || undefined,
        cityAssessorId: formData.cityAssessorId || undefined,
        cityAssessorDate: formData.cityAssessorDate || undefined,
        deputyId: formData.deputyId || undefined,
        deputyDate: formData.deputyDate || undefined,
      };

      if (selectedTemplate) {
        await updateTemplate(selectedTemplate.id, payload);
        toast.success('Template updated successfully');
      } else {
        await createTemplate(payload);
        toast.success('Template created successfully');
      }
      setIsFormOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Failed to save template:', error);
      toast.error(error.response?.data?.message || 'Failed to save template.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;
    try {
      setIsSubmitting(true);
      await deleteTemplate(selectedTemplate.id);
      toast.success('Template deleted successfully');
      setIsDeleteDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSignatoryName = (id: string) => {
    const s = signatories.find(s => s.id === id);
    return s ? `${s.name} (${s.title})` : 'Select Signatory...';
  };

  const renderSignatoryRow = (
    label: string, 
    idField: keyof SignatoryFormData,
    sgdField: keyof SignatoryFormData,
    tpdField: keyof SignatoryFormData,
    dateField: keyof SignatoryFormData
  ) => {
    const selectedSignatory = signatories.find(s => s.id === formData[idField]);
    
    return (
      <div className="grid grid-cols-12 gap-2 items-center py-1">
        <div className="col-span-2 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Checkbox 
              id={sgdField}
              checked={formData[sgdField] as boolean}
              onCheckedChange={(checked) => setFormData({ ...formData, [sgdField]: !!checked })}
            />
            <Label htmlFor={sgdField} className="text-[10px] font-medium cursor-pointer uppercase">SGD</Label>
          </div>
          <div className="flex items-center gap-1.5">
            <Checkbox 
              id={tpdField}
              checked={formData[tpdField] as boolean}
              onCheckedChange={(checked) => setFormData({ ...formData, [tpdField]: !!checked })}
            />
            <Label htmlFor={tpdField} className="text-[10px] font-medium cursor-pointer uppercase">TPD</Label>
          </div>
        </div>
        <div className="col-span-3">
          <Label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5 uppercase">{label}:</Label>
          <Select
            value={formData[idField] as string}
            onValueChange={(value) => setFormData({ ...formData, [idField]: value })}
          >
            <SelectTrigger className="h-7 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <SelectValue placeholder={`Select ${label}`} />
            </SelectTrigger>
            <SelectContent>
              {signatories
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-4">
          <Label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5 uppercase">Position:</Label>
          <Input
            type="text"
            value={selectedSignatory?.title || ''}
            readOnly
            className="h-7 text-xs bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 disabled:opacity-60"
            placeholder="Position will appear here"
          />
        </div>
        <div className="col-span-3">
          <Label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5 uppercase">Date:</Label>
          <Input
            type="date"
            value={formData[dateField] as string}
            onChange={(e) => setFormData({ ...formData, [dateField]: e.target.value })}
            className="h-7 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Signatory Templates</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Configure reusable signatory sets by year.</p>
        </div>
        <Button onClick={() => handleOpenForm()} className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Create Template
        </Button>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
              <TableRow>
                <TableHead className="font-semibold">Year</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="font-semibold">Key Signatories</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                      <span>Loading templates...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-slate-300" />
                      <p>No templates defined yet.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-medium">{template.year}</TableCell>
                    <TableCell>{template.description || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400">
                        {template.approvedBy && (
                          <span><strong>Approved:</strong> {template.approvedBy.name}</span>
                        )}
                        {template.provincialAssessor && (
                          <span><strong>Prov. Assessor:</strong> {template.provincialAssessor.name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {template.isActive ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenForm(template)}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedTemplate(template);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-red-600 dark:text-red-400 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Update Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{selectedTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
              <DialogDescription>
                Define the standard signatories for a specific year.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="year">Effectivity Year <span className="text-red-500">*</span></Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g. 2026 Revision"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-2">
                <h4 className="font-medium mb-3">Assessment Signatories</h4>
                <div className="space-y-1">
                  {renderSignatoryRow('Appraised By', 'appraisedById', 'appraisedSgd', 'appraisedTpd', 'appraisedDate')}
                  {renderSignatoryRow('Assessed By', 'assessedById', 'assessedSgd', 'assessedTpd', 'assessedDate')}
                  {renderSignatoryRow('Recommending Approval', 'recommendingById', 'recommendingSgd', 'recommendingTpd', 'recommendingDate')}
                  {renderSignatoryRow('Approved By', 'approvedById', 'approvedSgd', 'approvedTpd', 'approvedDate')}
                </div>
              </div>

              <div className="border-t pt-4 mt-2">
                <h4 className="font-medium mb-3">Key Officials</h4>
                <div className="space-y-1">
                  {renderSignatoryRow('Provincial Assessor', 'provincialAssessorId', 'provincialAssessorSgd', 'provincialAssessorTpd', 'provincialAssessorDate')}
                  {renderSignatoryRow('City/Municipal Assessor', 'cityAssessorId', 'cityAssessorSgd', 'cityAssessorTpd', 'cityAssessorDate')}
                  {renderSignatoryRow('Deputy', 'deputyId', 'deputySgd', 'deputyTpd', 'deputyDate')}
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-4 border-t">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked: boolean) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Active Status</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : selectedTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the template for year <strong>{selectedTemplate?.year}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SignatoryTemplateManager;
