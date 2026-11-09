import Select from 'react-select';

const styles = {
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    borderRadius: 6,
    borderColor: state.isFocused ? 'var(--blue-600)' : '#b8bfc9',
    boxShadow: state.isFocused ? '0 0 0 1px var(--blue-600)' : 'none',
    '&:hover': { borderColor: state.isFocused ? 'var(--blue-600)' : '#8f99a6' },
    fontWeight: 400,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 50 }),
  option: (base) => ({ ...base, fontWeight: 400 }),
  // Let long names wrap instead of being cut off
  singleValue: (base) => ({ ...base, whiteSpace: 'normal', lineHeight: 1.3, padding: '4px 0' }),
  valueContainer: (base) => ({ ...base, minWidth: 0 }),
  placeholder: (base) => ({ ...base, color: '#6b7280' }),
};

/**
 * Searchable dropdown.
 * @param options  [{ value, label }]
 * @param value    selected value (id) or ''
 * @param onChange called with the selected value (or '' when cleared)
 */
export default function SearchSelect({ options, value, onChange, placeholder = 'Select…', ...rest }) {
  const selected = options.find((o) => o.value === value) || null;
  return (
    <Select
      options={options}
      value={selected}
      onChange={(opt) => onChange(opt ? opt.value : '')}
      placeholder={placeholder}
      isClearable
      styles={styles}
      menuPortalTarget={document.body}
      noOptionsMessage={() => 'No matches'}
      {...rest}
    />
  );
}
