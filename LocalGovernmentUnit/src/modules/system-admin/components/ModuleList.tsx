import React, { useState } from 'react'
import { StatusBadge, IconButton } from '@/components/ui'
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'

interface Module {
  id: string
  module_name: string
  route_path: string
  icons: string | null
  file_path: string | null
  category: string | null
  is_active: boolean
  created_at: string
}

interface ModuleListProps {
  modules: Module[]
  search: string
  onSearchChange: (value: string) => void
  onAdd: () => void
  onEdit: (module: Module) => void
  onDelete: (id: string) => void
}

const ModuleList = ({ modules, search, onSearchChange, onAdd, onEdit, onDelete }: ModuleListProps) => {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})

  const filteredModules = modules.filter(
    (module) =>
      module.module_name.toLowerCase().includes(search.toLowerCase()) ||
      module.route_path.toLowerCase().includes(search.toLowerCase())
  )

  const groupedModules = filteredModules.reduce<Record<string, Module[]>>((groups, module) => {
    const categoryKey = module.category?.trim() || 'Uncategorized'
    if (!groups[categoryKey]) {
      groups[categoryKey] = []
    }
    groups[categoryKey].push(module)
    return groups
  }, {})

  const sortedCategories = Object.keys(groupedModules).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  )

  const isCategoryCollapsed = (categoryName: string) => collapsedCategories[categoryName] ?? true

  const toggleCategory = (categoryName: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryName]: !(prev[categoryName] ?? true),
    }))
  }

  const columns: Array<{ key: keyof Module | 'actions'; header: string; render: (module: Module) => React.ReactNode }> = [
    { key: 'module_name', header: 'Module Name', render: (module: Module) => module.module_name },
    { key: 'route_path', header: 'Route Path', render: (module: Module) => module.route_path },
    {
      key: 'icons',
      header: 'Icon',
      render: (module: Module) =>
        module.icons ? (
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
            {module.icons}
          </span>
        ) : (
          <span className="text-xs text-muted">-</span>
        ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (module: Module) => (
        <StatusBadge status={module.is_active ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (module: Module) => (
        <div className="flex items-center gap-2">
          <IconButton onClick={() => onEdit(module)} title="Edit">
            <Pencil className="w-4 h-4" />
          </IconButton>
          <IconButton onClick={() => onDelete(module.id)} title="Delete" variant="danger">
            <Trash2 className="w-4 h-4" />
          </IconButton>
        </div>
      ),
    },
  ]

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <input
          type="text"
          placeholder="Search modules..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 max-w-md px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
        />
        <button
          type="button"
          onClick={onAdd}
          className="px-3 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Module
        </button>
      </div>

      <div className="max-h-[calc(100vh-300px)] overflow-y-auto pr-1 space-y-4">
        {sortedCategories.length === 0 ? (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="px-4 py-4 text-center text-muted-foreground">No modules found</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          sortedCategories.map((categoryName) => {
            const categoryModules = groupedModules[categoryName]
            const collapsed = isCategoryCollapsed(categoryName)

            return (
              <div key={categoryName} className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleCategory(categoryName)}
                  className="w-full flex items-center justify-between border border-border rounded-lg px-3 py-2 hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    {collapsed ? (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                    <h3 className="text-sm font-semibold text-foreground">{categoryName}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">{categoryModules.length} module(s)</span>
                </button>

                {!collapsed && (
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-muted border-b border-border">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-foreground">Module Name</th>
                          <th className="px-4 py-3 text-left font-medium text-foreground">Route Path</th>
                          <th className="px-4 py-3 text-left font-medium text-foreground">Icon</th>
                          <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
                          <th className="px-4 py-3 text-left font-medium text-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryModules.map((module) => (
                          <tr key={module.id} className="border-b border-border hover:bg-muted/50">
                            {columns.map((col) => (
                              <td key={String(col.key)} className="px-4 py-3">
                                {col.render(module)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default ModuleList
