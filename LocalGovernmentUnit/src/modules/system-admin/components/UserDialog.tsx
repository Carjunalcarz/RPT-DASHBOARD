import { BaseDialog, FormInput } from '@/components/ui/dialog'
import type { Role } from '@/services/rbacService'

interface UserDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  name: string
  onNameChange: (value: string) => void
  email: string
  onEmailChange: (value: string) => void
  /** Only required in create mode — the user's initial password. */
  password?: string
  onPasswordChange?: (value: string) => void
  roles: Role[]
  selectedRole: string
  onRoleChange: (roleId: string) => void
  editMode?: boolean
  isSubmitting?: boolean
}

const UserDialog = ({
  open,
  onClose,
  onSubmit,
  name,
  onNameChange,
  email,
  onEmailChange,
  password = '',
  onPasswordChange,
  roles,
  selectedRole,
  onRoleChange,
  editMode = false,
  isSubmitting = false,
}: UserDialogProps) => {
  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title={editMode ? 'Edit User Role' : 'Add New User'}
      onSubmit={onSubmit}
      submitLabel={editMode ? 'Save Changes' : 'Add User'}
      isLoading={isSubmitting}
    >
      {!editMode && (
        <>
          <FormInput
            id="user-name"
            label="Full Name"
            placeholder="Enter full name"
            value={name}
            onChange={onNameChange}
            required
          />
          <FormInput
            id="user-email"
            label="Email Address"
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={onEmailChange}
            required
          />
          {onPasswordChange && (
            <div className="space-y-1.5">
              <label
                htmlFor="user-password"
                className="block text-sm font-medium text-foreground"
              >
                Initial Password
                <span className="text-error ml-1">*</span>
              </label>
              <input
                id="user-password"
                type="password"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground placeholder:text-muted focus:outline-none focus:border-success"
                placeholder="At least 8 chars, mix of upper/lower/digit"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                autoComplete="new-password"
                required
              />
              <p className="text-xs text-muted">
                The user receives this account auto-confirmed; they can change
                the password after signing in.
              </p>
            </div>
          )}
        </>
      )}
      
      <div className="space-y-1.5">
        <label htmlFor="user-role" className="block text-sm font-medium text-foreground">
          Assign Role
          <span className="text-error ml-1">*</span>
        </label>
        <select
          id="user-role"
          className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-success"
          value={selectedRole}
          onChange={(e) => onRoleChange(e.target.value)}
          required
        >
          <option value="">-- Select a role --</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.role_name}
            </option>
          ))}
        </select>
      </div>
    </BaseDialog>
  )
}

export default UserDialog
