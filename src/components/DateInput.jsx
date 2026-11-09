import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// 'yyyy-mm-dd' <-> Date, in local time (avoids timezone shifts)
const toDate = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};
const toISO = (date) => {
  if (!date) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** Date field that always shows and accepts dd/mm/yyyy. Value is stored as 'yyyy-mm-dd'. */
export default function DateInput({ value, onChange, required, ...rest }) {
  return (
    <DatePicker
      selected={toDate(value)}
      onChange={(date) => onChange(toISO(date))}
      dateFormat="dd/MM/yyyy"
      placeholderText="dd/mm/yyyy"
      className="input"
      wrapperClassName="date-input"
      required={required}
      isClearable={!required}
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      {...rest}
    />
  );
}
