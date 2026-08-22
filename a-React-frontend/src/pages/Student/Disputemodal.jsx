import { useState } from 'react';
import { tracker } from '../../api/services/trackerService';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Field from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';

const MIN_REASON_LENGTH = 10;

export default function DisputeModal({ topic, cohortId, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitDispute = async (event) => {
    event.preventDefault();
    const trimmed = reason.trim();

    if (trimmed.length < MIN_REASON_LENGTH) {
      setValidationError('Please describe what was missed in a little more detail.');
      return;
    }

    setValidationError('');
    setRequestError('');
    setIsSubmitting(true);

    try {
      await tracker.dispute({ cohortId, curriculumItemId: topic.id, reason: trimmed });
      onDone(topic);
    } catch (error) {
      setRequestError(
        error.response?.data?.message ||
          'Could not submit your report. Please try again in a moment.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Report a curriculum issue"
      description={topic.title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="dispute-form" isLoading={isSubmitting}>
            Submit report
          </Button>
        </>
      }
    >
      <form id="dispute-form" onSubmit={submitDispute} className="space-y-4" noValidate>
        {requestError && <Alert tone="error">{requestError}</Alert>}

        <p className="text-sm leading-6 text-ink-muted">
          Your instructor marked this topic as covered. Tell the administrator what was not
          delivered — they will review it with your department.
        </p>

        <Field
          as="textarea"
          label="What was not covered?"
          hint="Be specific: which parts were skipped, and in which session."
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            if (validationError) setValidationError('');
          }}
          error={validationError || undefined}
          placeholder="We were shown the slides but never covered flexbox layouts in class."
          inputClassName="h-32 resize-none"
          required
        />
      </form>
    </Modal>
  );
}
