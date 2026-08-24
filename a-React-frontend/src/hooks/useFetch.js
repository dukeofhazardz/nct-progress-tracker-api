import { useCallback, useEffect, useState } from 'react';

/**
 * Loading / ready / error state machine shared by the list screens.
 *
 * `reload({ quiet: true })` refreshes after a mutation without dropping back to
 * the skeleton, and `setData` is exposed for optimistic updates.
 *
 * `deps` is the dependency list for the fetcher — pass anything it closes over.
 */
export default function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setStatus('loading');

      try {
        const result = await fetcher();
        setData(result);
        setError('');
        setStatus('ready');
        return result;
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            requestError.message ||
            'Something went wrong while loading this page.',
        );
        setStatus('error');
        return undefined;
      }
    },
    // The fetcher is recreated on every render; `deps` is what actually matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    load();
  }, [load]);

  return { data, status, error, reload: load, setData };
}
