import { FileUploader } from 'devextreme-react/file-uploader';
import * as React from 'react';
import { Controller, FieldValues, Path } from 'react-hook-form';
import { useFormContext } from '../context/FormContext';
import {
  DevExtremeInlineError,
  IDevExtremeValidationProps,
  resolveDevExtremeValidationState,
  useControllableValue,
} from './validation';

export type DevExtremeFileUploaderMode = 'instantly' | 'useButtons' | 'useForm';

export interface IDevExtremeFileUploaderProps<T extends FieldValues>
  extends IDevExtremeValidationProps {
  name: Path<T> | string;
  control?: any;
  /**
   * Currently selected files. Value is always an array; for single-select,
   * read the first entry.
   */
  value?: File[];
  defaultValue?: File[];

  // File constraints
  accept?: string;
  multiple?: boolean;
  allowedFileExtensions?: string[];
  maxFileSize?: number;
  minFileSize?: number;

  // Upload behavior — defaults to 'useForm' so the consumer's form submit
  // owns the actual upload. Switch to 'instantly' or 'useButtons' only if
  // you want DevExtreme to POST files itself via `uploadUrl`.
  uploadMode?: DevExtremeFileUploaderMode;
  uploadUrl?: string;
  uploadHeaders?: Record<string, string>;
  uploadMethod?: 'POST' | 'PUT';
  chunkSize?: number;

  // UI labels
  labelText?: string;
  selectButtonText?: string;
  uploadButtonText?: string;
  readyToUploadMessage?: string;
  uploadedMessage?: string;
  uploadFailedMessage?: string;
  uploadAbortedMessage?: string;
  invalidFileExtensionMessage?: string;
  invalidMaxFileSizeMessage?: string;
  invalidMinFileSizeMessage?: string;

  disabled?: boolean;
  readOnly?: boolean;
  visible?: boolean;
  width?: number | string;
  height?: number | string;
  dialogTrigger?: string | Element;
  dropZone?: string | Element;
  className?: string;
  hint?: string;
  inputAttr?: Record<string, any>;
  tabIndex?: number;

  // Events — pass through DevExtreme's event objects unchanged.
  onValueChanged?: (files: File[]) => void;
  onFilesUploaded?: (e: any) => void;
  onUploadStarted?: (e: any) => void;
  onUploaded?: (e: any) => void;
  onUploadError?: (e: any) => void;
  onUploadAborted?: (e: any) => void;
  onProgress?: (e: any) => void;
  onBeforeSend?: (e: any) => void;
  onFocusIn?: () => void;
  onFocusOut?: () => void;
}

function DevExtremeFileUploaderInner<T extends FieldValues>({
  name,
  control,
  value,
  defaultValue,
  label,
  required = false,
  accept,
  multiple = false,
  allowedFileExtensions,
  maxFileSize,
  minFileSize,
  uploadMode = 'useForm',
  uploadUrl,
  uploadHeaders,
  uploadMethod,
  chunkSize,
  labelText,
  selectButtonText,
  uploadButtonText,
  readyToUploadMessage,
  uploadedMessage,
  uploadFailedMessage,
  uploadAbortedMessage,
  invalidFileExtensionMessage,
  invalidMaxFileSizeMessage,
  invalidMinFileSizeMessage,
  disabled = false,
  readOnly = false,
  visible = true,
  width,
  height,
  dialogTrigger,
  dropZone,
  className = '',
  hint,
  inputAttr,
  tabIndex,
  onValueChanged,
  onFilesUploaded,
  onUploadStarted,
  onUploaded,
  onUploadError,
  onUploadAborted,
  onProgress,
  onBeforeSend,
  onFocusIn,
  onFocusOut,
  isValid,
  errorMessage,
  errorText,
  showErrorMessage = true,
  validationMessageMode,
}: IDevExtremeFileUploaderProps<T>) {
  const formContext = useFormContext();
  const effectiveControl = control || formContext?.control;
  const fieldRef = React.useRef<HTMLDivElement>(null);
  const [standaloneValue, setStandaloneValue] = useControllableValue<File[]>(
    value,
    defaultValue || []
  );

  React.useEffect(() => {
    if (name && formContext?.registry) {
      formContext.registry.register(name as string, {
        name: name as string,
        label,
        required,
        ref: fieldRef as React.RefObject<HTMLElement>,
        section: undefined,
      });

      return () => {
        formContext.registry.unregister(name as string);
      };
    }
  }, [name, label, required, formContext]);

  const renderUploader = (
    fieldValue: File[] | undefined,
    fieldOnChange: (files: File[]) => void,
    fieldOnBlur?: () => void,
    fieldError?: any
  ) => {
    const validation = resolveDevExtremeValidationState({
      name: name as string,
      label,
      fieldError,
      isValid,
      errorMessage,
      errorText,
      showErrorMessage,
      validationMessageMode,
    });

    const files = fieldValue ?? [];

    return (
      <div
        onFocusCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            onFocusIn?.();
          }
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            fieldOnBlur?.();
            onFocusOut?.();
          }
        }}
      >
        <FileUploader
          value={files}
          onValueChanged={(e) => {
            const next = (e.value as File[]) || [];
            fieldOnChange(next);
            onValueChanged?.(next);
          }}
          accept={accept}
          multiple={multiple}
          allowedFileExtensions={allowedFileExtensions}
          maxFileSize={maxFileSize}
          minFileSize={minFileSize}
          uploadMode={uploadMode}
          uploadUrl={uploadUrl}
          uploadHeaders={uploadHeaders}
          {...(uploadMethod !== undefined && { uploadMethod })}
          chunkSize={chunkSize}
          labelText={labelText}
          selectButtonText={selectButtonText}
          uploadButtonText={uploadButtonText}
          readyToUploadMessage={readyToUploadMessage}
          uploadedMessage={uploadedMessage}
          uploadFailedMessage={uploadFailedMessage}
          uploadAbortedMessage={uploadAbortedMessage}
          invalidFileExtensionMessage={invalidFileExtensionMessage}
          invalidMaxFileSizeMessage={invalidMaxFileSizeMessage}
          invalidMinFileSizeMessage={invalidMinFileSizeMessage}
          disabled={disabled}
          readOnly={readOnly}
          visible={visible}
          width={width}
          height={height}
          dialogTrigger={dialogTrigger}
          dropZone={dropZone}
          hint={hint}
          inputAttr={inputAttr}
          tabIndex={tabIndex}
          onFilesUploaded={onFilesUploaded}
          onUploadStarted={onUploadStarted}
          onUploaded={onUploaded}
          onUploadError={onUploadError}
          onUploadAborted={onUploadAborted}
          onProgress={onProgress}
          onBeforeSend={onBeforeSend}
          className={`${className} ${validation.hasError ? 'dx-invalid' : ''}`}
          isValid={validation.isValid}
          validationError={validation.validationError}
          validationMessageMode={validation.validationMessageMode}
        />
        {validation.shouldRenderInlineError && (
          <DevExtremeInlineError name={name as string} error={validation.errorMessage} />
        )}
      </div>
    );
  };

  if (!effectiveControl) {
    return (
      <div ref={fieldRef} data-field-name={name as string} data-field={name as string}>
        {renderUploader(standaloneValue, (next) => setStandaloneValue(next))}
      </div>
    );
  }

  return (
    <div ref={fieldRef} data-field-name={name as string} data-field={name as string}>
      <Controller
        name={name as Path<T>}
        control={effectiveControl}
        render={({ field: { onChange, value: fv, onBlur }, fieldState: { error } }) => {
          return renderUploader(fv as File[] | undefined, onChange, onBlur, error);
        }}
      />
    </div>
  );
}

const DevExtremeFileUploader = React.memo(DevExtremeFileUploaderInner) as <
  T extends FieldValues
>(
  props: IDevExtremeFileUploaderProps<T>
) => React.ReactElement;

export default DevExtremeFileUploader;
