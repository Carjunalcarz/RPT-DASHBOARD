import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/modules/rptas/ui/card';
import { Button } from '@/modules/rptas/ui/button';
import { Input } from '@/modules/rptas/ui/input';
import { Badge } from '@/modules/rptas/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/modules/rptas/ui/select';
import { Checkbox } from '@/modules/rptas/ui/checkbox';
import { Label } from '@/modules/rptas/ui/label';
import { Loader2, Map, Save, Trash2, Edit } from 'lucide-react';
import { useAlert } from '@/modules/rptas/context/AlertContext';
import { type CityRecord } from '../../../shared/services/cityService';
import { getBarangays, BarangayRecord } from '../../../shared/services/barangayService';
import { getMunicipalities } from '@/services/landTaxService';
import { 
  getCityBarangayAssignments, 
  upsertCityBarangayAssignment, 
  deleteCityBarangayAssignment,
  CityBarangayAssignment 
} from '../../../shared/services/cityBarangayService';

const CityBarangayAssignmentPage: React.FC = () => {
  const { showAlert, showConfirm } = useAlert();
  
  const [cities, setCities] = useState<CityRecord[]>([]);
  const [barangays, setBarangays] = useState<BarangayRecord[]>([]);
  const [assignments, setAssignments] = useState<CityBarangayAssignment[]>([]);
  
  const [selectedCityCode, setSelectedCityCode] = useState<string>('');
  const [selectedBarangays, setSelectedBarangays] = useState<string[]>([]);
  
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingBarangays, setIsLoadingBarangays] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoadingCities(true);
    setIsLoadingAssignments(true);
    try {
      const [municipalitiesRes, assignmentsRes] = await Promise.all([
        getMunicipalities(),
        getCityBarangayAssignments()
      ]);
      setCities(
        (municipalitiesRes || []).map((m) => ({
          CODE: m.code,
          DESCRIPTION: m.name,
        }))
      );
      setAssignments(assignmentsRes || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      showAlert('Failed to load initial data.');
    } finally {
      setIsLoadingCities(false);
      setIsLoadingAssignments(false);
    }
  };

  // Fetch barangays when city is selected
  useEffect(() => {
    if (selectedCityCode) {
      fetchBarangaysForCity(selectedCityCode);
    } else {
      setBarangays([]);
      setSelectedBarangays([]);
    }
  }, [selectedCityCode]);

  const fetchBarangaysForCity = async (cityCode: string) => {
    setIsLoadingBarangays(true);
    try {
      const res = await getBarangays(1, 1000, '', cityCode);
      setBarangays(res.data || []);
      
      // Auto-check if we already have an assignment for this city
      const existingAssignment = assignments.find(a => a.city_code === cityCode);
      if (existingAssignment) {
        setSelectedBarangays(existingAssignment.barangays.map(b => b.code));
      } else {
        setSelectedBarangays([]); // Clear if no existing assignment
      }
    } catch (error) {
      console.error('Error fetching barangays:', error);
      showAlert('Failed to load barangays for selected city.');
    } finally {
      setIsLoadingBarangays(false);
    }
  };

  const handleBarangayToggle = (code: string) => {
    setSelectedBarangays(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSelectAll = () => {
    if (selectedBarangays.length === barangays.length) {
      setSelectedBarangays([]);
    } else {
      setSelectedBarangays(barangays.map(b => b.CODE));
    }
  };

  const handleSave = async () => {
    if (!selectedCityCode) {
      showAlert('Please select a city/municipality first.');
      return;
    }
    
    if (selectedBarangays.length === 0) {
      showAlert('Please select at least one barangay to assign.');
      return;
    }

    const city = cities.find(c => c.CODE === selectedCityCode);
    if (!city) return;

    setIsSaving(true);
    try {
      const assignedObjects = selectedBarangays.map(code => {
        const brgy = barangays.find(b => b.CODE === code);
        return {
          code: code,
          name: brgy ? brgy.DESCRIPTION : code
        };
      });

      await upsertCityBarangayAssignment(city.CODE, city.DESCRIPTION, assignedObjects);
      showAlert('City-Barangay assignment saved successfully.');
      
      // Refresh assignments table
      const updatedAssignments = await getCityBarangayAssignments();
      setAssignments(updatedAssignments);
    } catch (error) {
      console.error('Error saving assignment:', error);
      showAlert('Failed to save assignment.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (cityCode: string) => {
    setSelectedCityCode(cityCode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, cityName: string) => {
    const confirmed = await showConfirm(`Are you sure you want to remove the barangay assignments for ${cityName}?`);
    if (!confirmed) return;

    try {
      await deleteCityBarangayAssignment(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
      
      // If the currently selected city was deleted, clear checkboxes
      const assignmentToDelete = assignments.find(a => a.id === id);
      if (assignmentToDelete && assignmentToDelete.city_code === selectedCityCode) {
        setSelectedBarangays([]);
      }
      
      showAlert('Assignment deleted successfully.');
    } catch (error) {
      console.error('Error deleting assignment:', error);
      showAlert('Failed to delete assignment.');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Map className="h-6 w-6 text-primary" />
            City-Barangay Mapping Setup
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Configure and map barangays to their respective cities or municipalities.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Panel */}
        <Card className="lg:col-span-5 border-border dark:border-border shadow-sm overflow-hidden bg-surface dark:bg-surface">
          <CardHeader className="bg-background dark:bg-background border-b border-border dark:border-border pb-4">
            <CardTitle className="text-sm font-semibold text-foreground tracking-wide uppercase">
              Mapping Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase">
                1. Select City / Municipality
              </Label>
              <Select 
                value={selectedCityCode} 
                onValueChange={setSelectedCityCode}
                disabled={isLoadingCities}
              >
                <SelectTrigger className="w-full bg-background border-border">
                  <SelectValue placeholder={isLoadingCities ? "Loading cities..." : "Select a city"} />
                </SelectTrigger>
                <SelectContent className="max-h-[16rem] bg-background">
                  {cities.map((city) => (
                    <SelectItem key={city.CODE} value={city.CODE} className="data-[state=checked]:bg-primary data-[state=checked]:text-white">
                      {city.DESCRIPTION} ({city.CODE})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground uppercase">
                  2. Select Barangays
                </Label>
                {barangays.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs text-primary"
                    onClick={handleSelectAll}
                  >
                    {selectedBarangays.length === barangays.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>

              <div className="bg-background border border-border rounded-md p-4 min-h-[300px] max-h-[400px] overflow-y-auto">
                {!selectedCityCode ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70">
                    <Map className="h-8 w-8 mb-2" />
                    <p className="text-sm">Select a city to view barangays</p>
                  </div>
                ) : isLoadingBarangays ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mb-2 text-primary" />
                    <p className="text-sm">Loading barangays...</p>
                  </div>
                ) : barangays.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70">
                    <p className="text-sm">No barangays found for this city.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {barangays.map((brgy) => (
                      <div key={brgy.CODE} className="flex items-start space-x-2">
                        <Checkbox 
                          id={`brgy-${brgy.CODE}`} 
                          checked={selectedBarangays.includes(brgy.CODE)}
                          onCheckedChange={() => handleBarangayToggle(brgy.CODE)}
                          className="mt-0.5"
                        />
                        <Label 
                          htmlFor={`brgy-${brgy.CODE}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {brgy.DESCRIPTION} <span className="text-muted-foreground text-xs">({brgy.CODE})</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Button 
              className="w-full bg-primary text-white hover:bg-primary/90" 
              onClick={handleSave}
              disabled={isSaving || !selectedCityCode || selectedBarangays.length === 0}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </CardContent>
        </Card>

        {/* Right Table Panel */}
        <Card className="lg:col-span-7 border-border dark:border-border shadow-sm overflow-hidden bg-surface dark:bg-surface flex flex-col">
          <CardHeader className="bg-background dark:bg-background border-b border-border dark:border-border pb-4">
            <CardTitle className="text-sm font-semibold text-foreground tracking-wide uppercase">
              Configured Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="bg-background border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-medium text-muted-foreground w-1/3">City/Municipality</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Barangays Assigned</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground w-20 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoadingAssignments ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Loading configurations...
                      </td>
                    </tr>
                  ) : assignments.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">
                        <p>No mappings configured yet.</p>
                      </td>
                    </tr>
                  ) : (
                    assignments.map((assignment) => (
                      <tr 
                        key={assignment.id} 
                        className={`hover:bg-muted/10 transition-colors ${selectedCityCode === assignment.city_code ? 'bg-primary/5' : ''}`}
                      >
                        <td className="px-4 py-3 border-r border-border">
                          <p className="font-medium text-foreground">{assignment.city_name}</p>
                          <p className="text-muted-foreground mt-0.5">{assignment.city_code}</p>
                        </td>
                        <td className="px-4 py-3 border-r border-border">
                          <div className="flex flex-wrap gap-1">
                            {assignment.barangays.length > 0 ? (
                              assignment.barangays.map(b => (
                                <Badge key={b.code} variant="outline" className="font-normal text-[10px] bg-background border-border gap-1 px-1.5">
                                  <span className="text-muted-foreground">{b.code}</span>
                                  <span className="text-border">-</span>
                                  <span>{b.name}</span>
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground italic text-xs">No barangays assigned</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/10"
                              onClick={() => handleEdit(assignment.city_code)}
                              title="Edit Configuration"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => handleDelete(assignment.id, assignment.city_name)}
                              title="Remove Configuration"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CityBarangayAssignmentPage;
