# SPNumberField Component ="

A comprehensive number field component that mirrors SharePoint's Number and Currency fields. Supports integer and decimal numbers, currency formatting, percentage display, min/max validation, and step increments with DevExtreme UI integration.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Props](#props)
- [Number Formatting](#number-formatting)
- [Usage Patterns](#usage-patterns)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)
- [TypeScript Support](#typescript-support)

---

## Features

- =" **Number Types** - Integers, decimals, currency, percentage
- =° **Currency Support** - Locale-aware currency formatting
- =Ê **Percentage Mode** - Display values as percentages
- <¯ **Validation** - Min/max values, step increments
- =< **Spin Buttons** - Increment/decrement controls
- <¨ **Formatting** - Thousands separators, decimal places
- <£ **React Hook Form** - Native integration with validation
- <¨ **DevExtreme UI** - Consistent styling with spForm system
-  **Validation** - Built-in validation with custom rules
- <­ **Styling Modes** - Outlined, underlined, or filled styles
- ¡ **Value Change Modes** - onChange or onBlur
- = **Access Control** - Read-only and disabled states
- =æ **Tree-Shakable** - Import only what you need
- <¯ **TypeScript** - Full type safety

---

## Installation

```bash
npm install spfx-toolkit
```

---

## Quick Start

### With React Hook Form

```typescript
import { SPNumberField } from 'spfx-toolkit/lib/components/spFields/SPNumberField';
import { useForm } from 'react-hook-form';

function MyForm() {
  const { control } = useForm();

  return (
    <>
      {/* Basic number */}
      <SPNumberField
        name="quantity"
        label="Quantity"
        control={control}
        min={1}
        max={100}
        rules={{ required: 'Quantity is required' }}
      />

      {/* Currency */}
      <SPNumberField
        name="price"
        label="Price"
        control={control}
        format={{
          currencyLocale: 'en-US',
          currencyCode: 'USD',
          decimals: 2
        }}
      />

      {/* Percentage */}
      <SPNumberField
        name="discount"
        label="Discount"
        control={control}
        min={0}
        max={100}
        format={{
          percentage: true,
          decimals: 2
        }}
      />
    </>
  );
}
```

### Standalone (Without Form)

```typescript
import { SPNumberField } from 'spfx-toolkit/lib/components/spFields/SPNumberField';

function MyComponent() {
  const [quantity, setQuantity] = React.useState<number>(1);

  return (
    <SPNumberField
      label="Quantity"
      value={quantity}
      onChange={setQuantity}
      min={1}
      max={999}
      showSpinButtons
    />
  );
}
```

---

## Props

### Base Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | - | Field label text |
| `description` | `string` | - | Help text below the field |
| `required` | `boolean` | `false` | Mark field as required |
| `disabled` | `boolean` | `false` | Disable the field |
| `readOnly` | `boolean` | `false` | Make field read-only |
| `placeholder` | `string` | - | Placeholder text |
| `errorMessage` | `string` | - | Custom error message |
| `className` | `string` | - | CSS class for wrapper |
| `width` | `string \| number` | - | Field width |

### Form Integration Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | - | Field name for form |
| `control` | `Control` | - | React Hook Form control |
| `rules` | `RegisterOptions` | - | Validation rules |

### Standalone Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | - | Controlled value |
| `defaultValue` | `number` | - | Initial value |
| `onChange` | `(value: number) => void` | - | Change handler |
| `onBlur` | `() => void` | - | Blur handler |
| `onFocus` | `() => void` | - | Focus handler |

### Number Field Specific Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `min` | `number` | - | Minimum value |
| `max` | `number` | - | Maximum value |
| `step` | `number` | `1` | Increment/decrement step |
| `format` | `ISPNumberFormat` | - | Number formatting options |
| `showSpinButtons` | `boolean` | `true` | Show increment/decrement buttons |
| `showClearButton` | `boolean` | `false` | Show clear button |
| `stylingMode` | `string` | `'outlined'` | Style variant |
| `valueChangeMode` | `'onChange' \| 'onBlur'` | `'onChange'` | When to fire onChange |

### Number Format Options (ISPNumberFormat)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `decimals` | `number` | - | Number of decimal places (-1 for auto) |
| `percentage` | `boolean` | `false` | Display as percentage |
| `currencyLocale` | `string` | - | Currency locale (e.g., 'en-US') |
| `currencyCode` | `string` | - | Currency code (e.g., 'USD') |
| `useGrouping` | `boolean` | `true` | Show thousands separator |

---

## Number Formatting

### Basic Number (Integer)

```typescript
<SPNumberField
  name="age"
  label="Age"
  control={control}
  min={0}
  max={120}
  step={1}
/>
```

**Display:** 42

---

### Decimal Number

```typescript
<SPNumberField
  name="rating"
  label="Rating"
  control={control}
  min={0}
  max={5}
  step={0.1}
  format={{ decimals: 1 }}
/>
```

**Display:** 4.5

---

### Currency (USD)

```typescript
<SPNumberField
  name="price"
  label="Price"
  control={control}
  format={{
    currencyLocale: 'en-US',
    currencyCode: 'USD',
    decimals: 2
  }}
/>
```

**Display:** $1,234.56

---

### Currency (EUR)

```typescript
<SPNumberField
  name="amount"
  label="Amount"
  control={control}
  format={{
    currencyLocale: 'de-DE',
    currencyCode: 'EUR',
    decimals: 2
  }}
/>
```

**Display:** 1.234,56 ¬

---

### Percentage

```typescript
<SPNumberField
  name="interestRate"
  label="Interest Rate"
  control={control}
  min={0}
  max={100}
  format={{
    percentage: true,
    decimals: 2
  }}
/>
```

**Display:** 3.50%

---

### Large Numbers with Grouping

```typescript
<SPNumberField
  name="population"
  label="Population"
  control={control}
  format={{
    useGrouping: true,
    decimals: 0
  }}
/>
```

**Display:** 1,234,567

---

## Usage Patterns

### Pattern 1: Basic Integer Input

```typescript
<SPNumberField
  name="quantity"
  label="Quantity"
  control={control}
  min={1}
  max={999}
  step={1}
  rules={{ required: 'Quantity is required' }}
/>
```

---

### Pattern 2: Decimal with Precision

```typescript
<SPNumberField
  name="weight"
  label="Weight (kg)"
  control={control}
  min={0.1}
  max={1000}
  step={0.1}
  format={{ decimals: 2 }}
  rules={{
    required: 'Weight is required',
    min: { value: 0.1, message: 'Weight must be at least 0.1 kg' }
  }}
/>
```

---

### Pattern 3: Price with Currency

```typescript
<SPNumberField
  name="unitPrice"
  label="Unit Price"
  control={control}
  min={0.01}
  step={0.01}
  format={{
    currencyLocale: 'en-US',
    currencyCode: 'USD',
    decimals: 2
  }}
  rules={{
    required: 'Price is required',
    min: { value: 0.01, message: 'Price must be greater than 0' }
  }}
/>
```

---

### Pattern 4: Percentage with Range

```typescript
<SPNumberField
  name="taxRate"
  label="Tax Rate"
  control={control}
  min={0}
  max={100}
  step={0.25}
  format={{
    percentage: true,
    decimals: 2
  }}
  rules={{
    required: 'Tax rate is required',
    min: { value: 0, message: 'Tax rate cannot be negative' },
    max: { value: 100, message: 'Tax rate cannot exceed 100%' }
  }}
/>
```

---

### Pattern 5: Increment by 5

```typescript
<SPNumberField
  name="score"
  label="Score"
  control={control}
  min={0}
  max={100}
  step={5}
  showSpinButtons
  description="Score increments by 5"
/>
```

---

### Pattern 6: onChange vs onBlur

```typescript
// Fire onChange on every keystroke (default)
<SPNumberField
  name="price1"
  label="Price (onChange)"
  control={control}
  valueChangeMode="onChange"
/>

// Fire onChange only when field loses focus
<SPNumberField
  name="price2"
  label="Price (onBlur)"
  control={control}
  valueChangeMode="onBlur"
  description="Value updates on blur"
/>
```

---

### Pattern 7: Custom Validation

```typescript
<SPNumberField
  name="hours"
  label="Hours Worked"
  control={control}
  min={0}
  max={168}  // Hours in a week
  step={0.5}
  format={{ decimals: 1 }}
  rules={{
    required: 'Hours is required',
    validate: (value) => {
      if (value < 0) return 'Hours cannot be negative';
      if (value > 168) return 'Maximum 168 hours per week';
      if (value % 0.5 !== 0) return 'Hours must be in 0.5 increments';
      return true;
    }
  }}
/>
```

---

### Pattern 8: Large Number with Grouping

```typescript
<SPNumberField
  name="revenue"
  label="Annual Revenue"
  control={control}
  min={0}
  format={{
    currencyLocale: 'en-US',
    currencyCode: 'USD',
    decimals: 0,
    useGrouping: true
  }}
  description="Enter annual revenue (e.g., 1,000,000)"
/>
```

---

## Complete Examples

### Example 1: E-Commerce Product Form

```typescript
import { SPNumberField } from 'spfx-toolkit/lib/components/spFields/SPNumberField';
import { useForm } from 'react-hook-form';
import { PrimaryButton } from '@fluentui/react/lib/Button';

interface IProductForm {
  sku: number;
  price: number;
  salePrice?: number;
  quantity: number;
  weight: number;
  discount: number;
}

function ProductForm() {
  const { control, handleSubmit, watch } = useForm<IProductForm>();
  const price = watch('price');
  const discount = watch('discount');

  const onSubmit = async (data: IProductForm) => {
    console.log('Product data:', data);
    // Submit to SharePoint
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* SKU - Integer only */}
      <SPNumberField
        name="sku"
        label="SKU"
        control={control}
        min={1}
        step={1}
        format={{ decimals: 0 }}
        rules={{ required: 'SKU is required' }}
      />

      {/* Regular Price - Currency */}
      <SPNumberField
        name="price"
        label="Regular Price"
        control={control}
        min={0.01}
        step={0.01}
        format={{
          currencyLocale: 'en-US',
          currencyCode: 'USD',
          decimals: 2
        }}
        rules={{
          required: 'Price is required',
          min: { value: 0.01, message: 'Price must be greater than 0' }
        }}
      />

      {/* Sale Price - Currency, optional */}
      <SPNumberField
        name="salePrice"
        label="Sale Price (Optional)"
        control={control}
        min={0.01}
        step={0.01}
        format={{
          currencyLocale: 'en-US',
          currencyCode: 'USD',
          decimals: 2
        }}
        rules={{
          validate: (value) => {
            if (!value) return true; // Optional field
            if (price && value >= price) {
              return 'Sale price must be less than regular price';
            }
            return true;
          }
        }}
      />

      {/* Quantity - Integer with spin buttons */}
      <SPNumberField
        name="quantity"
        label="Stock Quantity"
        control={control}
        min={0}
        step={1}
        format={{ decimals: 0 }}
        showSpinButtons
        rules={{ required: 'Quantity is required' }}
      />

      {/* Weight - Decimal */}
      <SPNumberField
        name="weight"
        label="Weight (kg)"
        control={control}
        min={0.01}
        step={0.01}
        format={{ decimals: 2 }}
        rules={{ required: 'Weight is required' }}
      />

      {/* Discount - Percentage */}
      <SPNumberField
        name="discount"
        label="Discount"
        control={control}
        min={0}
        max={100}
        step={5}
        format={{
          percentage: true,
          decimals: 0
        }}
        description="Discount percentage (0-100%)"
      />

      <PrimaryButton type="submit" text="Save Product" />
    </form>
  );
}
```

---

### Example 2: Financial Calculator

```typescript
import { SPNumberField } from 'spfx-toolkit/lib/components/spFields/SPNumberField';
import { useForm } from 'react-hook-form';
import { Text } from '@fluentui/react/lib/Text';

interface ILoanForm {
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  downPayment: number;
}

function LoanCalculator() {
  const { control, watch } = useForm<ILoanForm>();

  const loanAmount = watch('loanAmount') || 0;
  const interestRate = watch('interestRate') || 0;
  const loanTermYears = watch('loanTermYears') || 30;
  const downPayment = watch('downPayment') || 0;

  // Calculate monthly payment
  const principal = loanAmount - downPayment;
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPayment =
    principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  return (
    <div>
      {/* Loan Amount - Currency */}
      <SPNumberField
        name="loanAmount"
        label="Loan Amount"
        control={control}
        min={1000}
        max={10000000}
        step={1000}
        format={{
          currencyLocale: 'en-US',
          currencyCode: 'USD',
          decimals: 0,
          useGrouping: true
        }}
        rules={{
          required: 'Loan amount is required',
          min: { value: 1000, message: 'Minimum loan amount is $1,000' }
        }}
      />

      {/* Interest Rate - Percentage */}
      <SPNumberField
        name="interestRate"
        label="Annual Interest Rate"
        control={control}
        min={0.1}
        max={30}
        step={0.125}
        format={{
          percentage: true,
          decimals: 3
        }}
        rules={{ required: 'Interest rate is required' }}
      />

      {/* Loan Term - Integer */}
      <SPNumberField
        name="loanTermYears"
        label="Loan Term (Years)"
        control={control}
        min={1}
        max={30}
        step={1}
        format={{ decimals: 0 }}
        showSpinButtons
        rules={{ required: 'Loan term is required' }}
      />

      {/* Down Payment - Currency */}
      <SPNumberField
        name="downPayment"
        label="Down Payment"
        control={control}
        min={0}
        max={loanAmount || 0}
        step={1000}
        format={{
          currencyLocale: 'en-US',
          currencyCode: 'USD',
          decimals: 0,
          useGrouping: true
        }}
        rules={{
          validate: (value) => {
            if (!value) return true;
            if (value > loanAmount) {
              return 'Down payment cannot exceed loan amount';
            }
            return true;
          }
        }}
      />

      {/* Calculated Monthly Payment */}
      <div style={{ marginTop: 20, padding: 16, backgroundColor: '#f3f2f1' }}>
        <Text variant="large">
          Monthly Payment: ${monthlyPayment.toFixed(2)}
        </Text>
      </div>
    </div>
  );
}
```

---

### Example 3: Inventory Management

```typescript
import { SPNumberField } from 'spfx-toolkit/lib/components/spFields/SPNumberField';
import { useForm } from 'react-hook-form';

interface IInventoryForm {
  currentStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  unitCost: number;
  markup: number;
  sellingPrice: number;
}

function InventoryForm() {
  const { control, watch, setValue } = useForm<IInventoryForm>();

  const unitCost = watch('unitCost') || 0;
  const markup = watch('markup') || 0;
  const currentStock = watch('currentStock') || 0;
  const reorderLevel = watch('reorderLevel') || 0;

  // Auto-calculate selling price based on cost and markup
  React.useEffect(() => {
    if (unitCost && markup) {
      const calculatedPrice = unitCost * (1 + markup / 100);
      setValue('sellingPrice', parseFloat(calculatedPrice.toFixed(2)));
    }
  }, [unitCost, markup, setValue]);

  return (
    <div>
      {/* Current Stock - Integer */}
      <SPNumberField
        name="currentStock"
        label="Current Stock Level"
        control={control}
        min={0}
        step={1}
        format={{
          decimals: 0,
          useGrouping: true
        }}
        showSpinButtons
        rules={{ required: 'Current stock is required' }}
      />

      {/* Reorder Level - Integer */}
      <SPNumberField
        name="reorderLevel"
        label="Reorder Level"
        control={control}
        min={0}
        step={1}
        format={{ decimals: 0 }}
        rules={{
          required: 'Reorder level is required',
          validate: (value) => {
            if (currentStock && value >= currentStock) {
              return 'Reorder level should be less than current stock';
            }
            return true;
          }
        }}
        description="Stock level that triggers reorder"
      />

      {/* Reorder Quantity - Integer */}
      <SPNumberField
        name="reorderQuantity"
        label="Reorder Quantity"
        control={control}
        min={1}
        step={1}
        format={{ decimals: 0 }}
        rules={{
          required: 'Reorder quantity is required',
          min: { value: 1, message: 'Must reorder at least 1 unit' }
        }}
      />

      {/* Unit Cost - Currency */}
      <SPNumberField
        name="unitCost"
        label="Unit Cost"
        control={control}
        min={0.01}
        step={0.01}
        format={{
          currencyLocale: 'en-US',
          currencyCode: 'USD',
          decimals: 2
        }}
        rules={{ required: 'Unit cost is required' }}
      />

      {/* Markup - Percentage */}
      <SPNumberField
        name="markup"
        label="Markup"
        control={control}
        min={0}
        max={1000}
        step={5}
        format={{
          percentage: true,
          decimals: 1
        }}
        rules={{ required: 'Markup is required' }}
      />

      {/* Selling Price - Currency (Auto-calculated) */}
      <SPNumberField
        name="sellingPrice"
        label="Selling Price (Auto-calculated)"
        control={control}
        min={0.01}
        step={0.01}
        format={{
          currencyLocale: 'en-US',
          currencyCode: 'USD',
          decimals: 2
        }}
        readOnly
        description="Calculated from unit cost and markup"
      />
    </div>
  );
}
```

---

## Best Practices

### 1. Always Use Labels

```typescript
// L BAD: No label
<SPNumberField name="field1" control={control} />

//  GOOD: Clear label
<SPNumberField
  name="quantity"
  label="Quantity"
  control={control}
/>
```

---

### 2. Set Appropriate Min/Max Values

```typescript
//  GOOD: Prevent invalid ranges
<SPNumberField
  name="age"
  label="Age"
  control={control}
  min={0}
  max={120}
  description="Enter age (0-120)"
/>

//  GOOD: Percentage with proper range
<SPNumberField
  name="discount"
  label="Discount"
  control={control}
  min={0}
  max={100}
  format={{ percentage: true }}
/>
```

---

### 3. Use Appropriate Decimal Places

```typescript
//  GOOD: Currency with 2 decimals
<SPNumberField
  name="price"
  label="Price"
  control={control}
  format={{
    currencyLocale: 'en-US',
    currencyCode: 'USD',
    decimals: 2
  }}
/>

//  GOOD: Integer with 0 decimals
<SPNumberField
  name="quantity"
  label="Quantity"
  control={control}
  format={{ decimals: 0 }}
/>
```

---

### 4. Choose Appropriate Step Values

```typescript
//  GOOD: Step by 1 for integers
<SPNumberField
  name="count"
  label="Count"
  control={control}
  step={1}
/>

//  GOOD: Step by 0.01 for currency
<SPNumberField
  name="amount"
  label="Amount"
  control={control}
  step={0.01}
  format={{
    currencyLocale: 'en-US',
    currencyCode: 'USD',
    decimals: 2
  }}
/>

//  GOOD: Step by 5 for increments
<SPNumberField
  name="quantity"
  label="Quantity (boxes of 5)"
  control={control}
  step={5}
  description="Quantity must be in multiples of 5"
/>
```

---

### 5. Provide Helpful Descriptions

```typescript
//  GOOD: Clear guidance
<SPNumberField
  name="hours"
  label="Hours Worked"
  control={control}
  min={0}
  max={168}
  step={0.5}
  format={{ decimals: 1 }}
  description="Enter hours in 0.5 increments (max 168 hours/week)"
/>
```

---

### 6. Validate Related Number Fields

```typescript
//  GOOD: Validate min/max relationship
function MyForm() {
  const { control, watch } = useForm();
  const minValue = watch('minValue');

  return (
    <>
      <SPNumberField
        name="minValue"
        label="Minimum Value"
        control={control}
        rules={{ required: 'Minimum value is required' }}
      />

      <SPNumberField
        name="maxValue"
        label="Maximum Value"
        control={control}
        min={minValue}
        rules={{
          required: 'Maximum value is required',
          validate: (value) =>
            !minValue || value > minValue || 'Maximum must be greater than minimum'
        }}
      />
    </>
  );
}
```

---

### 7. Use Currency Formatting for Money

```typescript
//  GOOD: Proper currency formatting
<SPNumberField
  name="salary"
  label="Annual Salary"
  control={control}
  min={0}
  format={{
    currencyLocale: 'en-US',
    currencyCode: 'USD',
    decimals: 0,
    useGrouping: true
  }}
/>

// Display: $75,000
```

---

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import {
  SPNumberField,
  ISPNumberFieldProps,
  ISPNumberFormat
} from 'spfx-toolkit/lib/components/spFields/SPNumberField';

// All props are fully typed
const props: ISPNumberFieldProps = {
  name: 'price',
  label: 'Price',
  min: 0,
  max: 1000,
  step: 0.01,
  format: {
    currencyLocale: 'en-US',
    currencyCode: 'USD',
    decimals: 2
  }
};

// Format configuration
const currencyFormat: ISPNumberFormat = {
  currencyLocale: 'en-US',
  currencyCode: 'USD',
  decimals: 2,
  useGrouping: true
};

const percentageFormat: ISPNumberFormat = {
  percentage: true,
  decimals: 2
};

// Value change mode
const changeMode: 'onChange' | 'onBlur' = 'onChange';
```

---

## Related Components

- **[SPTextField](../SPTextField/README.md)** - Text input fields
- **[SPChoiceField](../SPChoiceField/README.md)** - Choice and dropdown fields
- **[SPDateField](../SPDateField/README.md)** - Date and time fields
- **[SPBooleanField](../SPBooleanField/README.md)** - Yes/No checkbox fields

---

## Tree-Shaking

Always use specific imports for optimal bundle size:

```typescript
//  RECOMMENDED: Specific import
import { SPNumberField } from 'spfx-toolkit/lib/components/spFields/SPNumberField';

// L AVOID: Bulk import
import { SPNumberField } from 'spfx-toolkit';
```

---

## License

Part of [SPFx Toolkit](../../../../README.md) - MIT License

---

**Last Updated:** November 2025
