import { useRef, useState } from 'react';
import { Camera, KeyRound, RotateCw, Trash2 } from 'lucide-react';
import { profile as profileApi } from '../../api/services/profileService';
import { useAuth } from '../../context/authContext';
import useFetch from '../../hooks/useFetch';
import toAvatarDataUrl from '../../utils/avatarFile';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Field from '../../components/ui/Field';
import PageHeader from '../../components/ui/PageHeader';
import Panel from '../../components/ui/Panel';
import Skeleton from '../../components/ui/Skeleton';
import StaffProfileView from '../../components/profile/StaffProfileView';

/** Matches `MIN_PASSWORD` in the API's profile routes. */
const MIN_PASSWORD = 8;

const emptyPasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function MyProfile() {
  const { updateUser } = useAuth();
  const { data, status, error, reload, setData } = useFetch(() => profileApi.me(), []);
  const fileInputRef = useRef(null);

  const [avatarError, setAvatarError] = useState('');
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  const [form, setForm] = useState(emptyPasswordForm);
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  // The picture is rendered from two places: this page's own copy of the profile,
  // and the stored session the top bar and sidebar read. Both move together, so
  // neither needs a reload to catch up.
  //
  // `avatar: null` clears the key sessions from before pictures moved to a bucket
  // still carry, so a removal takes effect there too instead of falling back to it.
  const applyAvatar = (avatarUrl) => {
    setData((current) => (current ? { ...current, avatarUrl } : current));
    updateUser({ avatarUrl, avatar: null });
  };

  const pickFile = async (event) => {
    const file = event.target.files?.[0];
    // Cleared so choosing the same file again still fires a change event.
    event.target.value = '';
    if (!file) return;

    setAvatarError('');
    setIsSavingAvatar(true);

    try {
      const avatar = await toAvatarDataUrl(file);
      // The URL the server answers with, not the data URL just uploaded: it points
      // at the stored object, which is what every other page will render from.
      const { avatarUrl } = await profileApi.setAvatar(avatar);
      applyAvatar(avatarUrl);
    } catch (requestError) {
      setAvatarError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Could not save that picture.',
      );
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarError('');
    setIsSavingAvatar(true);

    try {
      await profileApi.removeAvatar();
      applyAvatar(null);
    } catch (requestError) {
      setAvatarError(
        requestError.response?.data?.message || 'Could not remove your picture.',
      );
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordNotice('');

    if (form.newPassword.length < MIN_PASSWORD) {
      setPasswordError(`Your new password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setPasswordError('The two new passwords do not match.');
      return;
    }

    setIsSavingPassword(true);

    try {
      const result = await profileApi.changePassword(form.currentPassword, form.newPassword);
      setForm(emptyPasswordForm);
      setPasswordNotice(result?.message || 'Your password has been changed.');
    } catch (requestError) {
      // A wrong current password comes back as 400 with a readable message, so it
      // lands here rather than being swallowed by the 401 sign-out redirect.
      setPasswordError(
        requestError.response?.data?.message || 'Could not change your password.',
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  const avatarActions = (
    <div className="flex flex-col items-center gap-1">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={pickFile}
        className="sr-only"
        aria-label="Choose a profile picture"
      />
      <Button
        size="sm"
        variant="secondary"
        icon={Camera}
        isLoading={isSavingAvatar}
        onClick={() => fileInputRef.current?.click()}
      >
        {data?.avatarUrl ? 'Change' : 'Add picture'}
      </Button>
      {data?.avatarUrl && (
        <Button
          size="sm"
          variant="ghost"
          icon={Trash2}
          disabled={isSavingAvatar}
          onClick={removeAvatar}
        >
          Remove
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your profile"
        subtitle="Your picture, your password, and the cohorts you are delivering."
      />

      {status === 'error' && (
        <Alert
          tone="error"
          title="Could not load your profile"
          action={
            <Button size="sm" variant="secondary" icon={RotateCw} onClick={() => reload()}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {avatarError && <Alert tone="error">{avatarError}</Alert>}

      {status === 'loading' && (
        <Panel>
          <div className="flex items-center gap-5 p-5">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
          </div>
        </Panel>
      )}

      {status === 'ready' && data && (
        <>
          <StaffProfileView profile={data} avatarActions={avatarActions} />

          <Panel
            title="Change password"
            description="You stay signed in on this device after changing it."
          >
            <form onSubmit={changePassword} className="space-y-4 p-5">
              {passwordError && <Alert tone="error">{passwordError}</Alert>}
              {passwordNotice && <Alert tone="success">{passwordNotice}</Alert>}

              <div className="grid gap-4 sm:max-w-md">
                <Field
                  label="Current password"
                  type="password"
                  value={form.currentPassword}
                  onChange={updateField('currentPassword')}
                  autoComplete="current-password"
                  required
                />
                <Field
                  label="New password"
                  hint={`At least ${MIN_PASSWORD} characters, and different from your current one.`}
                  type="password"
                  value={form.newPassword}
                  onChange={updateField('newPassword')}
                  autoComplete="new-password"
                  required
                />
                <Field
                  label="Confirm new password"
                  type="password"
                  value={form.confirmPassword}
                  onChange={updateField('confirmPassword')}
                  autoComplete="new-password"
                  required
                />
              </div>

              <Button type="submit" icon={KeyRound} isLoading={isSavingPassword}>
                Change password
              </Button>
            </form>
          </Panel>
        </>
      )}
    </div>
  );
}
