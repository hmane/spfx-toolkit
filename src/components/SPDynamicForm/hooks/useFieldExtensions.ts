import * as React from 'react';
import { IFieldExtension, IFieldExtensionProps } from '../SPDynamicForm.types';
import { IFieldMetadata } from '../types/fieldMetadata';

const DEBOUNCE_BY_TYPE: Record<string, number> = {
  Text: 300,
  Note: 300,
  Number: 300,
  Currency: 300,
  URL: 300,
};

function debounceFor(field: IFieldMetadata, override?: number): number {
  if (typeof override === 'number') return override;
  return DEBOUNCE_BY_TYPE[field.fieldType] ?? 0;
}

export interface IExtensionRuntime<TComputed = unknown> {
  state: IFieldExtensionProps<TComputed>;
  extension: IFieldExtension<TComputed>;
}

/**
 * Returns runtime state for a single host field's extensions. Watching is
 * delegated to the parent: the caller passes `watchedFormValues` (a useWatch-
 * driven object covering at least the host field and every extension's
 * `dependsOn`). When that object changes, this hook re-runs the relevant
 * computes (debounced + cancellable).
 */
export function useFieldExtensions<TComputed = unknown>(
  field: IFieldMetadata,
  extensions: IFieldExtension<TComputed>[] | undefined,
  watchedFormValues: Record<string, unknown>,
  mode: 'new' | 'edit' | 'view'
): IExtensionRuntime<TComputed>[] {
  const matched = React.useMemo(
    () => (extensions || []).filter((e) => e.field === field.internalName),
    [extensions, field.internalName]
  );

  const value = watchedFormValues[field.internalName];

  // Stable signature of watched values RELEVANT to these extensions only.
  const relevantSignature = React.useMemo(() => {
    const names = new Set<string>([field.internalName]);
    matched.forEach((e) => (e.dependsOn || []).forEach((n) => names.add(n)));
    const obj: Record<string, unknown> = {};
    Array.from(names)
      .sort()
      .forEach((n) => {
        obj[n] = watchedFormValues[n];
      });
    try {
      return JSON.stringify(obj);
    } catch {
      return Array.from(names)
        .map((n) => `${n}:${watchedFormValues[n]}`)
        .join('|');
    }
  }, [field.internalName, matched, watchedFormValues]);

  const [runtimeStates, setRuntimeStates] = React.useState<IFieldExtensionProps<TComputed>[]>(
    () => matched.map(() => ({ value, isLoading: false, formValues: watchedFormValues, field, mode }))
  );

  const timersRef = React.useRef<Array<number | null>>([]);
  const computeIdsRef = React.useRef<number[]>([]);

  // Reset runtime arrays when the matched set changes
  React.useEffect(() => {
    timersRef.current = matched.map(() => null);
    computeIdsRef.current = matched.map(() => 0);
    setRuntimeStates(
      matched.map(() => ({ value, isLoading: false, formValues: watchedFormValues, field, mode }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched.length]);

  React.useEffect(() => {
    matched.forEach((ext, i) => {
      const subset: Record<string, unknown> = { [field.internalName]: value };
      (ext.dependsOn || []).forEach((n) => {
        subset[n] = watchedFormValues[n];
      });

      if (!ext.compute) {
        setRuntimeStates((prev) => {
          const next = [...prev];
          next[i] = { value, isLoading: false, formValues: subset, field, mode };
          return next;
        });
        return;
      }

      const ms = debounceFor(field, ext.debounceMs);
      if (timersRef.current[i] != null) {
        window.clearTimeout(timersRef.current[i]!);
      }

      const fire = async () => {
        const myId = ++computeIdsRef.current[i];
        setRuntimeStates((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], value, isLoading: true, error: undefined, formValues: subset };
          return next;
        });
        try {
          const result = await Promise.resolve(
            ext.compute!({ value, formValues: subset, field, mode })
          );
          if (myId !== computeIdsRef.current[i]) return;
          setRuntimeStates((prev) => {
            const next = [...prev];
            next[i] = { value, computed: result, isLoading: false, formValues: subset, field, mode };
            return next;
          });
        } catch (e) {
          if (myId !== computeIdsRef.current[i]) return;
          setRuntimeStates((prev) => {
            const next = [...prev];
            next[i] = { value, isLoading: false, error: e as Error, formValues: subset, field, mode };
            return next;
          });
        }
      };

      if (ms === 0) fire();
      else timersRef.current[i] = window.setTimeout(fire, ms);
    });

    return () => {
      timersRef.current.forEach((t) => t != null && window.clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relevantSignature, matched]);

  return matched.map((ext, i) => ({
    extension: ext,
    state:
      runtimeStates[i] ||
      ({ value, isLoading: false, formValues: watchedFormValues, field, mode } as IFieldExtensionProps<TComputed>),
  }));
}
