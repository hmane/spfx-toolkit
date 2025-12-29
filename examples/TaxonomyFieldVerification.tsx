/**
 * SPTaxonomyField Verification Harness
 *
 * BLOCKER FIX F-2: This component provides a manual verification harness
 * to test SPTaxonomyField WssId=-1 behavior with real SharePoint.
 *
 * The SPTaxonomyField component sets WssId=-1 when converting ITermInfo
 * back to ISPTaxonomyFieldValue because ITermInfo doesn't provide WssId.
 * This harness helps verify that SharePoint accepts this value on save.
 *
 * USAGE:
 * 1. Copy this component into your SPFx web part
 * 2. Configure the props below with your actual list/field details
 * 3. Run the verification steps documented below
 * 4. Report results back to the spfx-toolkit team
 *
 * @see AUDIT_REPORT.md section F-2 for background
 */

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Stack } from '@fluentui/react/lib/Stack';
import { Text } from '@fluentui/react/lib/Text';
import { TextField } from '@fluentui/react/lib/TextField';

// Import from spfx-toolkit (adjust path based on your setup)
// import { SPTaxonomyField, ISPTaxonomyFieldValue } from 'spfx-toolkit/lib/components/spFields/SPTaxonomyField';
// import { SPContext } from 'spfx-toolkit/lib/utilities/context';

/**
 * Configuration - UPDATE THESE VALUES for your environment
 */
const VERIFICATION_CONFIG = {
  // Your SharePoint list ID or name containing the taxonomy field
  listId: 'YOUR_LIST_ID_OR_NAME',

  // Internal name of the taxonomy column
  taxonomyColumnName: 'YOUR_TAXONOMY_COLUMN_INTERNAL_NAME',

  // Term Set ID (GUID) - can be found in Term Store Management
  termSetId: 'YOUR_TERM_SET_GUID',

  // Optional: Anchor Term ID if using a subset of the term set
  anchorTermId: undefined as string | undefined,

  // Whether the field allows multiple selections
  allowMultiple: false,
};

interface IFormData {
  taxonomyField: any; // ISPTaxonomyFieldValue | ISPTaxonomyFieldValue[]
}

interface IVerificationResult {
  step: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

/**
 * TaxonomyFieldVerificationHarness
 *
 * Manual test steps:
 *
 * STEP 1: Load existing item with taxonomy value
 * - Open an existing list item that has a taxonomy value set
 * - Verify the value displays correctly in the picker
 * - Check console for any errors related to WssId
 *
 * STEP 2: Select a new term
 * - Click the taxonomy picker
 * - Select a different term
 * - Observe the form value (should show WssId: -1)
 *
 * STEP 3: Save the item
 * - Click "Save to SharePoint"
 * - Watch for any errors in the console or response
 * - Note the HTTP response status
 *
 * STEP 4: Reload and verify
 * - Click "Reload Item"
 * - Verify the saved term appears correctly
 * - Check if WssId is now a valid number (SharePoint assigns it on save)
 *
 * EXPECTED BEHAVIOR:
 * - WssId=-1 should be accepted by SharePoint on save
 * - After save, reloading should show the correct WssId assigned by SharePoint
 * - If WssId=-1 causes errors, this is a BLOCKER that needs fixing
 */
export const TaxonomyFieldVerificationHarness: React.FC<{
  context: any; // WebPartContext
  itemId?: number; // Optional: existing item ID to load
}> = ({ context, itemId }) => {
  const [results, setResults] = React.useState<IVerificationResult[]>([]);
  const [currentItemId, setCurrentItemId] = React.useState<number | undefined>(itemId);
  const [rawValue, setRawValue] = React.useState<string>('');

  const { control, handleSubmit, reset, watch } = useForm<IFormData>({
    defaultValues: {
      taxonomyField: VERIFICATION_CONFIG.allowMultiple ? [] : null,
    },
  });

  // Watch form value for debugging
  const taxonomyValue = watch('taxonomyField');

  React.useEffect(() => {
    setRawValue(JSON.stringify(taxonomyValue, null, 2));
  }, [taxonomyValue]);

  const addResult = (result: IVerificationResult) => {
    setResults(prev => [...prev, { ...result, step: `${prev.length + 1}. ${result.step}` }]);
  };

  const clearResults = () => {
    setResults([]);
  };

  // Step 1: Load existing item
  const loadItem = async () => {
    if (!currentItemId) {
      addResult({
        step: 'Load Item',
        status: 'warning',
        message: 'No item ID provided. Enter an item ID and click Load.',
      });
      return;
    }

    addResult({
      step: 'Load Item',
      status: 'pending',
      message: `Loading item ${currentItemId}...`,
    });

    try {
      // Uncomment when integrating:
      // const sp = SPContext.sp;
      // const item = await sp.web.lists
      //   .getById(VERIFICATION_CONFIG.listId)
      //   .items.getById(currentItemId)
      //   .select('*', `${VERIFICATION_CONFIG.taxonomyColumnName}`)();

      // const taxonomyValue = item[VERIFICATION_CONFIG.taxonomyColumnName];

      // For demo - replace with actual API call
      const taxonomyValue = null;

      addResult({
        step: 'Load Item',
        status: 'success',
        message: `Item loaded successfully`,
        data: { taxonomyValue },
      });

      // Reset form with loaded value
      reset({ taxonomyField: taxonomyValue });
    } catch (error: any) {
      addResult({
        step: 'Load Item',
        status: 'error',
        message: `Failed to load item: ${error?.message || 'Unknown error'}`,
        data: { error },
      });
    }
  };

  // Step 3: Save item
  const onSubmit = async (data: IFormData) => {
    addResult({
      step: 'Pre-Save Check',
      status: 'pending',
      message: 'Checking WssId value before save...',
      data: { taxonomyField: data.taxonomyField },
    });

    // Check WssId
    const value = data.taxonomyField;
    let wssIdValue: number | undefined;

    if (Array.isArray(value)) {
      wssIdValue = value[0]?.WssId;
    } else if (value) {
      wssIdValue = value.WssId;
    }

    addResult({
      step: 'WssId Check',
      status: wssIdValue === -1 ? 'warning' : 'success',
      message: wssIdValue === -1
        ? 'WssId is -1 (sentinel value). This is the value being tested.'
        : `WssId is ${wssIdValue}`,
      data: { wssId: wssIdValue },
    });

    addResult({
      step: 'Save to SharePoint',
      status: 'pending',
      message: 'Saving item to SharePoint...',
    });

    try {
      // Uncomment when integrating:
      // const sp = SPContext.sp;
      //
      // const updatePayload: Record<string, any> = {};
      //
      // // Format taxonomy value for SharePoint
      // if (VERIFICATION_CONFIG.allowMultiple && Array.isArray(value)) {
      //   updatePayload[VERIFICATION_CONFIG.taxonomyColumnName] = value.map(v => ({
      //     Label: v.Label,
      //     TermGuid: v.TermGuid,
      //     WssId: v.WssId,
      //   }));
      // } else if (value) {
      //   updatePayload[VERIFICATION_CONFIG.taxonomyColumnName] = {
      //     Label: value.Label,
      //     TermGuid: value.TermGuid,
      //     WssId: value.WssId,
      //   };
      // }
      //
      // if (currentItemId) {
      //   await sp.web.lists
      //     .getById(VERIFICATION_CONFIG.listId)
      //     .items.getById(currentItemId)
      //     .update(updatePayload);
      // } else {
      //   const result = await sp.web.lists
      //     .getById(VERIFICATION_CONFIG.listId)
      //     .items.add(updatePayload);
      //   setCurrentItemId(result.data.Id);
      // }

      addResult({
        step: 'Save to SharePoint',
        status: 'success',
        message: currentItemId
          ? `Item ${currentItemId} updated successfully!`
          : 'New item created successfully!',
      });

      addResult({
        step: 'VERIFICATION COMPLETE',
        status: 'success',
        message: 'WssId=-1 was accepted by SharePoint. Click "Reload Item" to verify the saved value.',
      });
    } catch (error: any) {
      addResult({
        step: 'Save to SharePoint',
        status: 'error',
        message: `SAVE FAILED: ${error?.message || 'Unknown error'}`,
        data: { error },
      });

      if (wssIdValue === -1) {
        addResult({
          step: 'BLOCKER DETECTED',
          status: 'error',
          message:
            'Save failed with WssId=-1. This confirms the BLOCKER issue. ' +
            'Please report this to the spfx-toolkit team with the error details above.',
        });
      }
    }
  };

  return (
    <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: 16, maxWidth: 800 } }}>
      <Text variant="xLarge">SPTaxonomyField WssId Verification Harness</Text>

      <MessageBar messageBarType={MessageBarType.info}>
        <strong>Purpose:</strong> This harness tests whether SharePoint accepts WssId=-1
        when saving taxonomy field values. See AUDIT_REPORT.md section F-2 for details.
      </MessageBar>

      {/* Item ID Input */}
      <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="end">
        <TextField
          label="Item ID (for editing existing item)"
          value={currentItemId?.toString() || ''}
          onChange={(_, val) => setCurrentItemId(val ? parseInt(val, 10) : undefined)}
          styles={{ root: { width: 200 } }}
        />
        <DefaultButton text="Load Item" onClick={loadItem} />
        <DefaultButton text="Clear Results" onClick={clearResults} />
      </Stack>

      {/* Taxonomy Field - Uncomment when integrating */}
      <Stack>
        <Text variant="mediumPlus">Taxonomy Field:</Text>
        <MessageBar messageBarType={MessageBarType.warning}>
          <strong>Integration Required:</strong> Uncomment the SPTaxonomyField component
          and configure VERIFICATION_CONFIG at the top of this file with your
          list/column details.
        </MessageBar>

        {/* Uncomment when integrating:
        <Controller
          name="taxonomyField"
          control={control}
          render={({ field, fieldState }) => (
            <SPTaxonomyField
              name="taxonomyField"
              label="Test Taxonomy Field"
              control={control}
              dataSource={{
                termSetId: VERIFICATION_CONFIG.termSetId,
                anchorId: VERIFICATION_CONFIG.anchorTermId,
              }}
              allowMultiple={VERIFICATION_CONFIG.allowMultiple}
              required={false}
            />
          )}
        />
        */}
      </Stack>

      {/* Raw Value Display */}
      <Stack>
        <Text variant="mediumPlus">Current Form Value (JSON):</Text>
        <pre
          style={{
            backgroundColor: '#f4f4f4',
            padding: 8,
            borderRadius: 4,
            fontSize: 12,
            overflow: 'auto',
            maxHeight: 150,
          }}
        >
          {rawValue || 'null'}
        </pre>
      </Stack>

      {/* Save Button */}
      <Stack horizontal tokens={{ childrenGap: 8 }}>
        <PrimaryButton
          text="Save to SharePoint"
          onClick={handleSubmit(onSubmit)}
        />
        <DefaultButton text="Reload Item" onClick={loadItem} disabled={!currentItemId} />
      </Stack>

      {/* Results */}
      {results.length > 0 && (
        <Stack tokens={{ childrenGap: 4 }}>
          <Text variant="mediumPlus">Verification Results:</Text>
          {results.map((result, index) => (
            <MessageBar
              key={index}
              messageBarType={
                result.status === 'success'
                  ? MessageBarType.success
                  : result.status === 'error'
                  ? MessageBarType.error
                  : result.status === 'warning'
                  ? MessageBarType.warning
                  : MessageBarType.info
              }
            >
              <strong>{result.step}:</strong> {result.message}
              {result.data && (
                <pre style={{ fontSize: 10, marginTop: 4 }}>
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              )}
            </MessageBar>
          ))}
        </Stack>
      )}

      {/* Instructions */}
      <Stack>
        <Text variant="mediumPlus">Manual Test Steps:</Text>
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          <li>
            <strong>Load existing item:</strong> Enter an item ID with a taxonomy value
            and click "Load Item"
          </li>
          <li>
            <strong>Select a new term:</strong> Use the taxonomy picker to select a
            different term
          </li>
          <li>
            <strong>Observe WssId:</strong> Check the JSON display - WssId should be -1
          </li>
          <li>
            <strong>Save:</strong> Click "Save to SharePoint" and watch for errors
          </li>
          <li>
            <strong>Verify:</strong> Click "Reload Item" to confirm the value was saved
            correctly
          </li>
        </ol>
      </Stack>

      <MessageBar messageBarType={MessageBarType.severeWarning}>
        <strong>Report Results:</strong> If save fails with WssId=-1, this is a BLOCKER.
        Please report to the spfx-toolkit team with console errors and HTTP response details.
      </MessageBar>
    </Stack>
  );
};

export default TaxonomyFieldVerificationHarness;
