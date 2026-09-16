import { useState } from 'react';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import Field from '../ui/Field';
import Modal from '../ui/Modal';

/** Matches `MIN_PASSWORD` in the API's shared profile helpers. */
const MIN_PASSWORD = 8;

/**
 * A manager setting someone else's password — one modal for a staff account and a
 * student account, since the exchange is identical and the warning must be.
 *
 * The parent renders this only when it has a target, so closing unmounts it and the
 * two fields reset with it; there is nothing to clear. `onSubmit(newPassword)`
 * returns a promise and owns the reload and the success notice, because those belong
 * to the list underneath. Only failures are shown here.
 *
 * `cancelLabel` exists for the staff list, where the reset is a detour out of the
 * edit modal and cancelling goes **Back** to it rather than closing outright.
 */
export default function PasswordResetModal({ person, onClose, onSubmit, cancelLabel = 'Cancel' }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();

    // Checked here as well as by the API so a typo costs no round trip; the
    // confirmation field is the client's alone — only one password is sent.
    if (newPassword.length < MIN_PASSWORD) {
      setError(`The new password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(newPassword);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not change the password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Reset password"
      description={`Set a new password for ${person.name} and pass it on to them.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {cancelLabel}
          </Button>
          <Button type="submit" form="reset-password-form" isLoading={isSubmitting}>
            Change password
          </Button>
        </>
      }
    >
      <form id="reset-password-form" onSubmit={submit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        {/* A token is trusted until it expires and nothing re-reads the account, so
            this is a way back in rather than a way to lock someone out. */}
        <Alert tone="warning" title="This does not sign them out">
          Anywhere they are already signed in stays signed in for up to a day. Deactivate the account
          instead if the point is to stop them working now.
        </Alert>

        <Field
          label="New password"
          type="password"
          hint={`At least ${MIN_PASSWORD} characters.`}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
        <Field
          label="Confirm new password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
      </form>
    </Modal>
  );
}
