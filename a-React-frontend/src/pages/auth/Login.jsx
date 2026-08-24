import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Eye, EyeOff } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import { tracker } from '../../api/services/trackerService';
import { useAuth } from '../../context/authContext';
import { homePathFor } from '../../routes/homePath';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Field from '../../components/ui/Field';
import SegmentedControl from '../../components/ui/SegmentedControl';
import Brand from '../../components/layout/Brand';

const previewTopics = [
  { title: 'HTML fundamentals', isCompleted: true },
  { title: 'CSS and responsive design', isCompleted: true },
  { title: 'JavaScript fundamentals', isCompleted: false },
];

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [departmentIds, setDepartmentIds] = useState([]);
  const { login } = useAuth();
  const navigate = useNavigate();

  const isRegistering = mode === 'register';

  // Fetched only when the register tab is first opened, and via the public
  // endpoint — there is no account yet to authenticate with.
  useEffect(() => {
    if (!isRegistering || departments.length) return;
    tracker.publicDepartments().then(setDepartments).catch(() => setDepartments([]));
  }, [isRegistering, departments.length]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
  };

  const toggleDepartment = (id) =>
    setDepartmentIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  const submit = async (event) => {
    event.preventDefault();
    setIsBusy(true);
    setError('');

    try {
      if (isRegistering) {
        await axiosInstance.post('/auth/register', { name, username, password, departmentIds });
      }
      const user = await login({ username, password });
      navigate(homePathFor(user.role));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to continue');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-2">
      {/* Product-revealing panel: a real cohort checklist, not decorative imagery. */}
      <aside className="hidden flex-col justify-between bg-surface-inverse p-10 lg:flex xl:p-14">
        <Brand onDark />

        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
            Track curriculum delivery, cohort by cohort.
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Instructors record the topics they have covered, students see exactly where their
            cohort stands, and administrators keep every department accountable.
          </p>

          <div className="mt-9 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold text-white">Cloud Engineering · Cohort 7</p>
              <p className="text-sm font-bold text-white">67%</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-2/3 rounded-full bg-brand-400" />
            </div>
            <ul className="mt-4 space-y-2.5">
              {previewTopics.map((topic) => (
                <li key={topic.title} className="flex items-center gap-2.5 text-sm">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${
                      topic.isCompleted
                        ? 'bg-emerald-500 text-white'
                        : 'border border-white/25'
                    }`}
                  >
                    {topic.isCompleted && <Check size={11} strokeWidth={3} aria-hidden="true" />}
                  </span>
                  <span className={topic.isCompleted ? 'text-white/45 line-through' : 'text-white'}>
                    {topic.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-xs text-white/35">NeoCloud Technologies · Progress Tracker</p>
      </aside>

      <main className="flex min-h-screen items-center justify-center p-6 lg:min-h-0">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Brand />
          </div>

          <div className="mt-8 lg:mt-0">
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              {isRegistering ? 'Create your student account' : 'Sign in'}
            </h1>
            <p className="mt-1 text-sm text-ink-subtle">
              {isRegistering
                ? 'Register first — your instructor then enrols you using this username.'
                : 'Use the credentials issued for your NCT account.'}
            </p>
          </div>

          <SegmentedControl
            label="Account action"
            stretch
            className="mt-6"
            value={mode}
            onChange={switchMode}
            options={[
              { value: 'signin', label: 'Sign in' },
              { value: 'register', label: 'New student' },
            ]}
          />

          <form onSubmit={submit} className="mt-6 space-y-4">
            {error && <Alert tone="error">{error}</Alert>}

            {isRegistering && (
              <Field
                label="Full name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ada Obi"
                required
              />
            )}

            <Field
              label="Username or email"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="ada.obi"
              required
            />

            <Field
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-sunken hover:text-ink"
                >
                  {showPassword ? (
                    <EyeOff size={15} aria-hidden="true" />
                  ) : (
                    <Eye size={15} aria-hidden="true" />
                  )}
                </button>
              }
            />

            {/* Optional and non-binding: an instructor can enrol a student into any
                cohort, which records that department automatically. */}
            {isRegistering && departments.length > 0 && (
              <fieldset>
                <legend className="text-sm font-medium text-ink">Courses you are taking</legend>
                <p className="mt-0.5 text-xs text-ink-subtle">
                  Optional, and you can pick more than one. Your instructor confirms this when they
                  enrol you.
                </p>
                <div className="mt-2 overflow-hidden rounded-lg border border-line">
                  {departments.map((department) => (
                    <label
                      key={department.id}
                      className="flex cursor-pointer items-center gap-2.5 border-b border-line px-3 py-2 text-sm transition-colors last:border-b-0 hover:bg-surface-raised"
                    >
                      <input
                        type="checkbox"
                        checked={departmentIds.includes(department.id)}
                        onChange={() => toggleDepartment(department.id)}
                        className="h-4 w-4 rounded border-line-strong text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                      />
                      <span className="text-ink">{department.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <Button type="submit" isLoading={isBusy} className="w-full">
              {isRegistering ? 'Create account' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-6 text-xs leading-5 text-ink-subtle">
            Instructor and administrator accounts are created by an NCT administrator. Contact
            your department lead if you cannot sign in.
          </p>
        </div>
      </main>
    </div>
  );
}
