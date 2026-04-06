import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MoreVertical, 
  UserPlus, 
  CheckCircle2, 
  XCircle,
  Filter,
  RefreshCw,
  Mail,
  Phone,
  Building,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  listSetupSignatories, 
  createSetupSignatory, 
  updateSetupSignatory, 
  deleteSetupSignatory,
  SetupSignatory 
} from '@/modules/rptas/shared/services/setupSignatoriesService';
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
  CardHeader, 
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

const DEPARTMENTS = [
  'Assessor Office',
  'Treasurer Office',
  'Provincial Assessor Office',
  'Municipal Assessor Office',
  'Mayor Office'
];

const SignatoryList: React.FC = () => {
  const [signatories, setSignatories] = useState<SetupSignatory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSignatory, setSelectedSignatory] = useState<SetupSignatory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    department: '',
    email: '',
    phone: '',
    isActive: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSignatories = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        search: searchTerm || undefined,
        department: departmentFilter !== 'all' ? departmentFilter : undefined,
      };
      const response = await listSetupSignatories(params);
      setSignatories(response.data);
    } catch (error) {
      console.error('Failed to fetch signatories:', error);
      const message =
        (error as any)?.response?.data?.message ||
        (error as any)?.response?.data?.error?.message ||
        'Failed to load signatories. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, departmentFilter]);

  useEffect(() => {
    fetchSignatories();
  }, [fetchSignatories]);

  const handleOpenForm = (signatory: SetupSignatory | null = null) => {
    if (signatory) {
      setSelectedSignatory(signatory);
      setFormData({
        name: signatory.name,
        title: signatory.title,
        department: signatory.department,
        email: signatory.email || '',
        phone: signatory.phone || '',
        isActive: signatory.isActive
      });
    } else {
      setSelectedSignatory(null);
      setFormData({
        name: '',
        title: '',
        department: '',
        email: '',
        phone: '',
        isActive: true
      });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.title || !formData.department) {
      toast.error('Please fill in all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (selectedSignatory) {
        await updateSetupSignatory(selectedSignatory.id, formData);
        toast.success('Signatory updated successfully');
      } else {
        await createSetupSignatory(formData);
        toast.success('Signatory created successfully');
      }
      setIsFormOpen(false);
      fetchSignatories();
    } catch (error) {
      console.error('Failed to save signatory:', error);
      const message =
        (error as any)?.response?.data?.message ||
        (error as any)?.response?.data?.error?.message ||
        'Failed to save signatory. Please check your connection.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSignatory) return;

    try {
      setIsSubmitting(true);
      await deleteSetupSignatory(selectedSignatory.id);
      toast.success('Signatory deleted successfully');
      setIsDeleteDialogOpen(false);
      fetchSignatories();
    } catch (error) {
      console.error('Failed to delete signatory:', error);
      const message =
        (error as any)?.response?.data?.message ||
        (error as any)?.response?.data?.error?.message ||
        'Failed to delete signatory. Please try again.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Signatories List</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage individual officials and staff.</p>
        </div>
        <Button onClick={() => handleOpenForm()} className="w-full md:w-auto">
          <UserPlus className="mr-2 h-4 w-4" /> Add Signatory
        </Button>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4 text-slate-400" />
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => fetchSignatories()} title="Refresh list">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 dark:border-slate-800">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead className="font-semibold">Name & Title</TableHead>
                  <TableHead className="font-semibold">Department</TableHead>
                  <TableHead className="font-semibold">Contact Info</TableHead>
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
                        <span>Loading signatories...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : signatories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <User className="h-8 w-8 text-slate-300" />
                        <p>No signatories found matching your criteria.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  signatories.map((signatory) => (
                    <TableRow key={signatory.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{signatory.name}</span>
                          <span className="text-xs text-slate-500">{signatory.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Building className="h-3.5 w-3.5" />
                          <span className="text-sm">{signatory.department}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {signatory.email && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Mail className="h-3 w-3" />
                              <span>{signatory.email}</span>
                            </div>
                          )}
                          {signatory.phone && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Phone className="h-3 w-3" />
                              <span>{signatory.phone}</span>
                            </div>
                          )}
                          {!signatory.email && !signatory.phone && (
                            <span className="text-xs text-slate-400 italic">No contact info</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {signatory.isActive ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                            <XCircle className="mr-1 h-3 w-3" /> Inactive
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
                            <DropdownMenuItem onClick={() => handleOpenForm(signatory)}>
                              <Edit2 className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedSignatory(signatory);
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
          </div>
        </CardContent>
      </Card>

      {/* Create/Update Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{selectedSignatory ? 'Edit Signatory' : 'Add New Signatory'}</DialogTitle>
              <DialogDescription>
                Enter the details of the official or staff member.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. JUNIE P. VINATERO, REA"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">Title / Position <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. PROVINCIAL ASSESSOR"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="department">Department <span className="text-red-500">*</span></Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(val) => setFormData({ ...formData, department: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0917..."
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active Status</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : selectedSignatory ? 'Update Signatory' : 'Create Signatory'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Signatory</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedSignatory?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Signatory'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SignatoryList;
