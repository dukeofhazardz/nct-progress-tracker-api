import { useMemo, useState } from 'react';

const readPath = (row, path) =>
  path.split('.').reduce((value, key) => (value == null ? value : value[key]), row);

const readKey = (row, key) => (typeof key === 'function' ? key(row) : readPath(row, key));

const compare = (a, b) => {
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
};

/**
 * Headless search / filter / sort for list screens.
 *
 * @param data      the raw rows
 * @param searchKeys dotted paths or accessor functions matched against the query
 * @param filters   `{ name: (row, value) => boolean }` — a value of 'all' disables the filter
 * @param initialFilters starting values, for filters that should not default to 'all'
 * @param sorters   `{ key: (row) => comparable }`
 * @param initialSort `{ key, direction }`
 */
export default function useListControls(
  data,
  { searchKeys = [], filters = {}, initialFilters = {}, sorters = {}, initialSort = null } = {},
) {
  const defaultFilters = () => ({
    ...Object.fromEntries(Object.keys(filters).map((name) => [name, 'all'])),
    ...initialFilters,
  });

  const [query, setQuery] = useState('');
  const [filterValues, setFilterValues] = useState(defaultFilters);
  const [sort, setSort] = useState(initialSort);

  const setFilter = (name, value) =>
    setFilterValues((current) => ({ ...current, [name]: value }));

  const toggleSort = (key) =>
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );

  // Restores the screen's own defaults rather than blanket 'all', so clearing
  // filters does not silently widen the view the page opened with.
  const reset = () => {
    setQuery('');
    setFilterValues(defaultFilters());
  };

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();

    let result = data.filter((row) => {
      const matchesQuery =
        !needle ||
        searchKeys.some((key) => String(readKey(row, key) ?? '').toLowerCase().includes(needle));

      const matchesFilters = Object.entries(filters).every(([name, predicate]) => {
        const value = filterValues[name];
        return value === 'all' || predicate(row, value);
      });

      return matchesQuery && matchesFilters;
    });

    const sorter = sort && sorters[sort.key];
    if (sorter) {
      result = [...result].sort((a, b) => {
        const outcome = compare(sorter(a), sorter(b));
        return sort.direction === 'asc' ? outcome : -outcome;
      });
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, query, filterValues, sort]);

  // Measured against the screen's defaults, not against 'all' — otherwise a page
  // that opens on a narrowed filter would always claim to be filtered.
  const defaults = defaultFilters();
  const isFiltered =
    query.trim() !== '' || Object.entries(filterValues).some(([name, value]) => value !== defaults[name]);

  return { rows, query, setQuery, filterValues, setFilter, sort, toggleSort, isFiltered, reset };
}
