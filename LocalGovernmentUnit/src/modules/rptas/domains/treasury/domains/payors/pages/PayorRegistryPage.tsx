import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useThemeColor } from '@/modules/rptas/context/ThemeColorContext';
import payorService from '@/services/payorService';
import type { Payor } from '@/types/payor';
import { toast } from 'sonner';
import { Button } from '@/modules/rptas/ui/button';
import { Input } from '@/modules/rptas/ui/input';
import { Textarea } from '@/modules/rptas/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/modules/rptas/ui/select';
import { Loader2, Search, Plus, Upload, IdCard, X } from 'lucide-react';
import IdProofCapture, { type CapturedId } from '../components/IdProofCapture';
import PayorIdThumbnail from '../components/PayorIdThumbnail';
import { ID_TYPE_OPTIONS as idTypeOptions } from '../utils/idTypes';

type PayorDraft = Omit<Payor, 'id'>;

const validateDraft = (d: PayorDraft) => {
  const errors: Record<string, string> = {};
  const req = (v: string, k: string) => {
    if (!String(v || '').trim()) errors[k] = 'Required';
  };

  req(d.firstName, 'firstName');
  req(d.lastName, 'lastName');
  req(d.address, 'address');
  req(d.idType, 'idType');
  req(d.idNumber, 'idNumber');

  const phone = String(d.contact?.phone || '').trim();
  const email = String(d.contact?.email || '').trim();
  if (!phone && !email) errors.contact = 'Phone or email is required';
  if (phone && !/^[0-9+() -]{7,20}$/.test(phone)) errors.contact = 'Invalid phone format';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.contact = 'Invalid email format';

  const idType = String(d.idType || '').toLowerCase();
  const idNumber = String(d.idNumber || '').trim();
  const idOption = idTypeOptions.find((o) => o.value === idType);
  if (idOption && idNumber && !idOption.pattern.test(idNumber)) {
    errors.idNumber = `Invalid ${idOption.label} format`;
  }

  return errors;
};

const parseCsv = (text: string): Array<PayorDraft> => {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (k: string) => header.indexOf(k);

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const get = (k: string) => {
      const j = idx(k);
      return j >= 0 ? cols[j] || '' : '';
    };
    rows.push({
      firstName: get('first_name') || get('firstName') || get('firstname'),
      lastName: get('last_name') || get('lastName') || get('lastname'),
      address: get('address'),
      idType: get('id_type') || get('idType') || get('idtype'),
      idNumber: get('id_number') || get('idNumber') || get('idnumber'),
      contact: {
        phone: get('phone'),
        email: get('email'),
      },
    });
  }
  return rows;
};

const PayorRegistry: React.FC = () => {
  const { headerColor } = useThemeColor();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'single' | 'bulk'>('single');

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Payor[]>([]);
  const searchTimer = useRef<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<PayorDraft>({
    firstName: '',
    lastName: '',
    address: '',
    idType: 'national_id',
    idNumber: '',
    contact: { phone: '', email: '' },
  });
  const [captureOpen, setCaptureOpen] = useState(false);
  const [idImage, setIdImage] = useState<CapturedId | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPayorId, setSelectedPayorId] = useState<string | null>(null);

  const emptyDraft: PayorDraft = {
    firstName: '',
    lastName: '',
    address: '',
    idType: 'national_id',
    idNumber: '',
    contact: { phone: '', email: '' },
  };

  const resetForm = () => {
    setDraft(emptyDraft);
    setEditingId(null);
    setErrors({});
    clearIdImage();
  };

  // Load an existing payor into the form for editing.
  const loadPayorIntoForm = (p: Payor) => {
    setEditingId(p.id);
    setDraft({
      firstName: p.firstName,
      lastName: p.lastName,
      address: p.address,
      idType: p.idType,
      idNumber: p.idNumber,
      contact: {
        phone: p.contact?.phone || '',
        email: p.contact?.email || '',
        birthDate: p.contact?.birthDate,
        gender: p.contact?.gender,
        idImageUrl: p.contact?.idImageUrl,
        idImagePath: p.contact?.idImagePath,
      },
    });
    clearIdImage();
    setErrors({});
    setTab('single');
  };

  const handleCapturedId = (result: CapturedId) => {
    // release any previous preview blob
    setIdImage((prev) => {
      if (prev?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(prev.previewUrl);
      return result;
    });
    toast.success('ID photo attached');
  };

  const clearIdImage = () => {
    setIdImage((prev) => {
      if (prev?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  };

  const [bulkText, setBulkText] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const bulkPreview = useMemo(() => parseCsv(bulkText).slice(0, 5), [bulkText]);

  useEffect(() => {
    const state = location.state as { prefillQuery?: unknown } | null;
    const q = state?.prefillQuery;
    if (typeof q === 'string' && q.trim()) setQuery(q);
  }, [location.state]);

  const setSelectedPayorForOop = (p: Payor) => {
    localStorage.setItem(
      'oop_selected_payor',
      JSON.stringify({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        address: p.address,
        idType: p.idType,
        idNumber: p.idNumber,
        contact: p.contact,
      })
    );
    // Notify an already-open Order of Payment tab to pick up the selection
    // (its mount-time read won't re-run while the tab stays mounted).
    window.dispatchEvent(new CustomEvent('oop:selected-payor'));
  };

  // Open the Order of Payment with the chosen payor. The unique query param
  // forces the dashboard tab effect to (re)activate the OOP tab even when its
  // route is already the current URL.
  const goToOopWithPayor = (p: Payor) => {
    setSelectedPayorId(p.id);
    setSelectedPayorForOop(p);
    toast.success(`Selected ${`${p.firstName} ${p.lastName}`.trim()} — opening Order of Payment`);
    // Ask the dashboard shell to open/activate the Order of Payment tab. This is
    // reliable even when its route is already the current URL (plain navigate
    // would be a no-op). navigate() is kept as a fallback.
    window.dispatchEvent(
      new CustomEvent('app:navigate', { detail: { routePath: '/rptas/treasury/order' } }),
    );
    navigate(`/dashboard/rptas/treasury/order?ref=${Date.now()}`);
  };

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(async () => {
      try {
        setSearching(true);
        const res = await payorService.search(query, 10);
        setResults(res.data || []);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Search failed');
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [query]);

  const handleCreate = async () => {
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setSaving(true);

      // Upload the ID proof image (if attached) and persist its URL/path on the payor.
      let contact = { ...draft.contact };
      if (idImage?.file) {
        const upload = await payorService.uploadIdImage(idImage.file);
        if (!upload.success || !upload.url) {
          toast.error('Failed to upload ID photo');
          return;
        }
        contact = { ...contact, idImageUrl: upload.url, idImagePath: upload.path };
      }

      const res = await payorService.create({
        firstName: draft.firstName,
        lastName: draft.lastName,
        address: draft.address,
        idType: draft.idType,
        idNumber: draft.idNumber,
        contact,
      });
      if (!res.success || !res.data) {
        toast.error(res.message || 'Create failed');
        return;
      }
      toast.success('Payor registered');
      goToOopWithPayor(res.data);
      setQuery(`${res.data.firstName} ${res.data.lastName}`);
      resetForm();
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) {
        toast.error('Duplicate payor ID detected. Search and use existing record.');
      } else if (status === 400 && e?.response?.data?.details?.fieldErrors) {
        setErrors(e.response.data.details.fieldErrors);
        toast.error('Please fix validation errors');
      } else {
        toast.error(e?.response?.data?.message || 'Create failed');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setSaving(true);

      // If a new ID photo was captured, upload it; otherwise keep the existing one.
      let contact = { ...draft.contact };
      if (idImage?.file) {
        const upload = await payorService.uploadIdImage(idImage.file);
        if (!upload.success || !upload.url) {
          toast.error('Failed to upload ID photo');
          return;
        }
        contact = { ...contact, idImageUrl: upload.url, idImagePath: upload.path };
      }

      const res = await payorService.update(editingId, {
        firstName: draft.firstName,
        lastName: draft.lastName,
        address: draft.address,
        idType: draft.idType,
        idNumber: draft.idNumber,
        contact,
      });
      if (!res.success || !res.data) {
        toast.error(res.message || 'Update failed');
        return;
      }
      toast.success('Payor updated');
      resetForm();
      // Refresh the search results so the edited record reflects the changes.
      if (query.trim()) {
        try {
          const r = await payorService.search(query, 10);
          setResults(r.data || []);
        } catch {
          /* non-fatal */
        }
      }
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) {
        toast.error('Another payor already uses this ID.');
      } else if (status === 400 && e?.response?.data?.details?.fieldErrors) {
        setErrors(e.response.data.details.fieldErrors);
        toast.error('Please fix validation errors');
      } else {
        toast.error(e?.response?.data?.message || 'Update failed');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBulkCreate = async () => {
    const rows = parseCsv(bulkText);
    if (rows.length === 0) {
      toast.error('Paste CSV rows first');
      return;
    }
    const invalid = rows
      .map((r, i) => ({ i, errors: validateDraft(r) }))
      .filter((x) => Object.keys(x.errors).length > 0);
    if (invalid.length > 0) {
      toast.error(`Fix validation errors (row ${invalid[0].i + 1})`);
      return;
    }

    try {
      setBulkSaving(true);
      const res = await payorService.bulkCreate(rows);
      if (!res.success) {
        toast.error('Bulk import failed');
        return;
      }
      toast.success(`Imported ${res.created} payor(s)`);
      setBulkText('');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Bulk import failed');
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="px-6 py-4 rounded-lg shadow-sm bg-primary">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Payor Registry</h1>
            <p className="text-white/80 text-sm mt-1">Search existing payors or register new records</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('single')}
          className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold border transition-colors ${
            tab === 'single'
              ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800'
          }`}
        >
          <Plus className="h-4 w-4 mr-2" />
          Single Entry
        </button>
        <button
          type="button"
          onClick={() => setTab('bulk')}
          className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold border transition-colors ${
            tab === 'bulk'
              ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800'
          }`}
        >
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import
        </button>
      </div>

      {tab === 'single' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-3">
                <Search className="h-4 w-4 text-slate-400" />
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Search</div>
              </div>
              <Input
                aria-label="Payor search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, address, or ID number..."
              />
              <div className="mt-3 border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden">
                <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-200 dark:divide-slate-700">
                  {searching ? (
                    <div className="p-4 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching...
                    </div>
                  ) : results.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500 dark:text-slate-400">No matches.</div>
                  ) : (
                    results.map((p) => (
                      <div key={p.id} className="p-4 flex items-start gap-3">
                        <PayorIdThumbnail
                          path={p.contact?.idImagePath}
                          url={p.contact?.idImageUrl}
                          alt={`${p.firstName} ${p.lastName}`.trim()}
                        />
                        <button
                          type="button"
                          onClick={() => loadPayorIntoForm(p)}
                          title="Click to view / edit this payor"
                          className={`min-w-0 flex-1 text-left rounded-md px-1 -mx-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                            editingId === p.id ? 'ring-1 ring-primary/50 bg-primary/5' : ''
                          }`}
                        >
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {p.lastName}, {p.firstName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{p.address}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {p.idType}: <span className="font-mono">{p.idNumber}</span>
                          </div>
                        </button>
                        <label
                          title="Select this payor for the Order of Payment"
                          className="flex flex-shrink-0 items-center gap-1.5 cursor-pointer text-[11px] font-medium text-slate-500 dark:text-slate-400 select-none"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPayorId === p.id}
                            onChange={() => goToOopWithPayor(p)}
                            className="h-4 w-4 cursor-pointer"
                            style={{ accentColor: 'var(--primary)' }}
                          />
                          Select
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {editingId ? 'Edit Payor' : 'Register New Payor'}
                  </div>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-xs text-primary hover:text-primary-light font-semibold"
                    >
                      + New
                    </button>
                  )}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setCaptureOpen(true)}>
                  <IdCard className="h-4 w-4 mr-2" />
                  {idImage ? 'Replace ID Photo' : 'Capture ID Photo'}
                </Button>
              </div>

              {/* Existing ID image (edit mode, when no new photo captured) */}
              {!idImage && editingId && (draft.contact.idImagePath || draft.contact.idImageUrl) && (
                <div className="mb-3 flex items-center gap-3 rounded-md border border-slate-200 dark:border-slate-700 p-2">
                  <PayorIdThumbnail
                    path={draft.contact.idImagePath}
                    url={draft.contact.idImageUrl}
                    alt={`${draft.firstName} ${draft.lastName}`.trim()}
                  />
                  <div className="min-w-0 flex-1 text-xs text-slate-600 dark:text-slate-300">
                    Current ID on file — click to view, or “Replace ID Photo” to change it.
                  </div>
                </div>
              )}

              {idImage && (
                <div className="mb-3 flex items-center gap-3 rounded-md border border-slate-200 dark:border-slate-700 p-2">
                  <img
                    src={idImage.previewUrl}
                    alt="Attached ID"
                    className="h-14 w-20 rounded object-cover border border-slate-200 dark:border-slate-700"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-200">ID photo attached</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Saved as proof of identity on registration
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearIdImage}
                    aria-label="Remove ID photo"
                    className="text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">First Name *</label>
                  <Input value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
                  {errors.firstName ? <div className="text-xs text-red-600 mt-1">{errors.firstName}</div> : null}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Last Name *</label>
                  <Input value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
                  {errors.lastName ? <div className="text-xs text-red-600 mt-1">{errors.lastName}</div> : null}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Address *</label>
                  <Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
                  {errors.address ? <div className="text-xs text-red-600 mt-1">{errors.address}</div> : null}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">ID Type *</label>
                  <Select value={String(draft.idType)} onValueChange={(v) => setDraft({ ...draft, idType: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ID type" />
                    </SelectTrigger>
                    <SelectContent>
                      {idTypeOptions.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.idType ? <div className="text-xs text-red-600 mt-1">{errors.idType}</div> : null}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">ID Number *</label>
                  <Input
                    value={draft.idNumber}
                    onChange={(e) => setDraft({ ...draft, idNumber: e.target.value })}
                    placeholder={idTypeOptions.find((x) => x.value === draft.idType)?.placeholder || ''}
                  />
                  {errors.idNumber ? <div className="text-xs text-red-600 mt-1">{errors.idNumber}</div> : null}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date of Birth</label>
                  <Input
                    type="date"
                    value={draft.contact.birthDate || ''}
                    onChange={(e) => setDraft({ ...draft, contact: { ...draft.contact, birthDate: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Gender</label>
                  <Select
                    value={draft.contact.gender || ''}
                    onValueChange={(v) => setDraft({ ...draft, contact: { ...draft.contact, gender: v } })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Phone</label>
                  <Input value={draft.contact.phone || ''} onChange={(e) => setDraft({ ...draft, contact: { ...draft.contact, phone: e.target.value } })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email</label>
                  <Input value={draft.contact.email || ''} onChange={(e) => setDraft({ ...draft, contact: { ...draft.contact, email: e.target.value } })} />
                </div>
                {errors.contact ? <div className="sm:col-span-2 text-xs text-red-600">{errors.contact}</div> : null}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                {editingId && (
                  <Button variant="outline" onClick={resetForm} disabled={saving}>
                    Cancel
                  </Button>
                )}
                <Button onClick={editingId ? handleUpdate : handleCreate} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {editingId ? 'Update Payor' : 'Register'}
                </Button>
              </div>
            </div>
          </div>
      ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Bulk Register (CSV)</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Header supported: <span className="font-mono">first_name,last_name,address,id_type,id_number,phone,email</span>
            </div>
            <Textarea
              aria-label="Bulk CSV"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="min-h-[220px]"
              placeholder="first_name,last_name,address,id_type,id_number,phone,email&#10;Juan,Dela Cruz,Somewhere,national_id,12345678,+639171234567,juan@example.com"
            />
            {bulkPreview.length > 0 ? (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Preview rows: <span className="font-semibold">{bulkPreview.length}</span>
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button onClick={handleBulkCreate} disabled={bulkSaving}>
                {bulkSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Import
              </Button>
            </div>
          </div>
      )}

      <IdProofCapture open={captureOpen} onOpenChange={setCaptureOpen} onCapture={handleCapturedId} />
    </div>
  );
};

export default PayorRegistry;
