import Field from '../ui/Field';
import SegmentedControl from '../ui/SegmentedControl';

/**
 * The fields an instructor or head-of-department account is made of, shared by the
 * create and edit modals on the staff list so the two cannot drift apart.
 *
 * `mode` is the only difference between them: creating an account needs a temporary
 * password and offers to restore a deactivated username, editing one does neither —
 * a password is set from its own modal, which keeps it out of routine saves.
 *
 * Which department key matters depends on the selected role, matching the API: a head
 * of department submits `departmentIds`, an instructor a single `departmentId`.
 */
export default function StaffFormFields({ form, setForm, departments, isAdmin, mode = 'create' }) {
  const isCreating = mode === 'create';
  const isHod = form.role === 'HOD';

  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const toggleDepartment = (departmentId) =>
    setForm((current) => ({
      ...current,
      departmentIds: current.departmentIds.includes(departmentId)
        ? current.departmentIds.filter((id) => id !== departmentId)
        : [...current.departmentIds, departmentId],
    }));

  return (
    <>
      {/* Only an administrator may set or change a role — a HOD administers the
          instructors in their own departments and nothing else. */}
      {isAdmin && (
        <SegmentedControl
          label="Role"
          stretch
          value={form.role}
          onChange={(role) => setForm((current) => ({ ...current, role }))}
          options={[
            { value: 'INSTRUCTOR', label: 'Instructor' },
            { value: 'HOD', label: 'Head of Department' },
          ]}
        />
      )}

      <Field
        label="Full name"
        value={form.name}
        onChange={updateField('name')}
        placeholder="Ada Obi"
        autoComplete="off"
        required
      />
      <Field
        label="Username"
        hint={
          isCreating
            ? "Lowercased automatically. Reusing a deactivated account's username restores it."
            : 'Lowercased automatically. This is what they sign in with.'
        }
        value={form.username}
        onChange={updateField('username')}
        placeholder="ada.obi"
        autoComplete="off"
        required
      />
      <Field
        label="Email"
        hint="Optional."
        type="email"
        value={form.email}
        onChange={updateField('email')}
        placeholder="ada.obi@neocloud.example"
        autoComplete="off"
      />

      {isCreating && (
        <Field
          label="Temporary password"
          type="password"
          value={form.password}
          onChange={updateField('password')}
          autoComplete="new-password"
          required
        />
      )}

      {isHod ? (
        <fieldset>
          <legend className="text-sm font-medium text-ink">
            Departments they head
            <span aria-hidden="true" className="ml-0.5 text-rose-600">
              *
            </span>
          </legend>
          <p className="mt-0.5 text-xs text-ink-subtle">
            They can manage instructors, cohorts and disputes in each one.
          </p>
          <div className="mt-2 space-y-1.5 overflow-hidden rounded-lg border border-line">
            {departments.map((department) => (
              <label
                key={department.id}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-surface-raised"
              >
                <input
                  type="checkbox"
                  checked={form.departmentIds.includes(department.id)}
                  onChange={() => toggleDepartment(department.id)}
                  className="h-4 w-4 rounded border-line-strong text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                />
                <span className="text-ink">{department.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <Field
          as="select"
          label="Department"
          hint={isCreating ? undefined : 'Moving them here unassigns any cohort they hold elsewhere.'}
          value={form.departmentId}
          onChange={updateField('departmentId')}
          required
        >
          <option value="">Select a department</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </Field>
      )}
    </>
  );
}
