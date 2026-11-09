import { useEffect } from 'react';

/**
 * Form conveniences shared by all edit screens:
 *  - warns before closing/reloading the tab with unsaved changes
 *  - Ctrl/Cmd + S submits the form
 */
export default function useFormGuards({ isDirty, saving, formRef }) {
  useEffect(() => {
    if (!isDirty || saving) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty, saving]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [formRef]);
}
