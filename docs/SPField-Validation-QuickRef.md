# SPField Validation Quick Reference

> **Last Updated:** October 2025
> **Version:** 1.0.0-alpha.0

## ⚡ Quick Start (Copy-Paste Ready)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { SPTextField, SPChoiceField } from 'spfx-toolkit/lib/components/spFields';

// 1. Define validation schema
const schema = z.object({
  title: z.string().min(3, 'Min 3 chars'),
  status: z.string().min(1, 'Required'),
});

type FormData = z.infer<typeof schema>;

// 2. Initialize form
const MyForm = () => {
  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  // 3. Use SPFields with control prop
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <SPTextField
        name="title"
        control={control}  // ⚠️ REQUIRED!
        label="Title"
      />
      <SPChoiceField
        name="status"
        control={control}  // ⚠️ REQUIRED!
        label="Status"
        choices={['Draft', 'Active']}
      />
      <button type="submit">Submit</button>
    </form>
  );
};
```

---

## 🚨 Critical Requirements

| Requirement | Why It Matters | What Happens If Missing |
|------------|----------------|------------------------|
| **Pass `control` prop** | Enables RHF form integration | ❌ RHF validation/errors will not run |
| **Use `name` prop** | Registers field with form | ❌ Field not tracked, no validation |
| **Configure form mode** | Controls validation timing | ⏱️ Validation may not trigger when expected |
| **Define validation rules** | Specifies what's valid | ✅ Field always valid (no rules to fail) |
| **Standalone forms** | Use top-level `isValid` + `errorMessage` | ✅ Works without RHF |

---

## ✅ Correct Usage Patterns

### Standalone / Class Components

Use `isValid` and `errorMessage` when validation is owned outside React Hook Form.

```tsx
<SPTextField
  label="Title"
  value={this.state.title}
  onChange={(title) => this.setState({ title })}
  isValid={this.state.title.trim().length > 0}
  errorMessage={
    this.state.title.trim().length === 0 ? 'Title is required' : undefined
  }
/>
```

This works across the SPField suite, including the smart `SPField` wrapper:

```tsx
<SPField
  config={{ fieldType: SPFieldType.Text, displayName: 'Title' }}
  value={this.state.title}
  onChange={(title) => this.setState({ title })}
  isValid={!this.state.errors.title}
  errorMessage={this.state.errors.title}
/>
```

### With Zod Resolver (Recommended)

```typescript
const schema = z.object({
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be 18+'),
});

const form = useForm({
  resolver: zodResolver(schema),
});

<SPTextField name="email" control={form.control} />
```

### With Rules Prop

```typescript
<SPTextField
  name="username"
  control={form.control}
  rules={{
    required: 'Username required',
    minLength: { value: 3, message: 'Min 3 chars' },
    pattern: { value: /^[a-z0-9]+$/i, message: 'Alphanumeric only' },
  }}
/>
```

### With Required Shorthand

```typescript
<SPTextField
  name="title"
  control={form.control}
  required  // Auto-generates "Title is required" message
/>
```

---

## ❌ Wrong Usage (Won't Work)

```typescript
// ❌ Missing control prop
<SPTextField name="title" rules={{ required: true }} />

// ❌ Missing name prop
<SPTextField control={form.control} rules={{ required: true }} />

// ❌ No validation rules
<SPTextField name="title" control={form.control} />
// Field will submit but no validation

// ❌ Using wrong control object
<SPTextField name="title" control={otherForm.control} />
// Field registered to wrong form
```

---

## 🎯 Form Mode Configuration

| Mode | When Validation Runs | Best For |
|------|---------------------|----------|
| `onSubmit` | Only on form submit | Long forms, better UX |
| `onBlur` | When field loses focus | Real-time feedback |
| `onChange` | On every keystroke | Immediate validation |
| `onTouched` | After first interaction | Balanced approach |
| `all` | Both blur and change | Maximum validation |

```typescript
const form = useForm({
  mode: 'onSubmit',        // First validation
  reValidateMode: 'onChange', // Subsequent validations
});
```

---

## 🔍 Debugging Validation Issues

### Step 1: Check Control Prop

```typescript
// ❌ Missing control
<SPTextField name="title" />

// ✅ Has control
<SPTextField name="title" control={form.control} />
```

### Step 2: Inspect Form State

```typescript
console.log('Errors:', form.formState.errors);
console.log('Is valid:', form.formState.isValid);
console.log('Is submitted:', form.formState.isSubmitted);
```

### Step 3: Check Field State

```typescript
<Controller
  name="title"
  control={control}
  render={({ field, fieldState }) => {
    console.log('Field error:', fieldState.error);
    console.log('Is touched:', fieldState.isTouched);
    console.log('Is dirty:', fieldState.isDirty);
    return <SPTextField {...field} />;
  }}
/>
```

### Step 4: Try Submitting

If mode is `onSubmit`, errors only appear after first submit:
```typescript
// Click submit button to trigger validation
<button type="submit">Submit</button>
```

---

## 📋 All SPField Components

All support `control`, `name`, and `rules` props:

| Component | Value Type | Example |
|-----------|-----------|---------|
| `SPTextField` | `string` | Single/multi-line text |
| `SPChoiceField` | `string` or `string[]` | Dropdown, radio, checkbox |
| `SPUserField` | `number[]` | People picker |
| `SPDateField` | `Date` or `null` | Date picker |
| `SPNumberField` | `number` or `null` | Numeric input |
| `SPBooleanField` | `boolean` | Checkbox/toggle |
| `SPUrlField` | `{ Url: string; Description?: string }` | URL + description |
| `SPLookupField` | `number` or `number[]` | Lookup picker |
| `SPTaxonomyField` | Taxonomy value(s) | Managed metadata |

---

## 🎨 DevExtreme Validation Styling

SPField components automatically apply DevExtreme validation properties:

```typescript
// Built-in (you don't need to add these)
<DevExtremeControl
  isValid={!hasError}
  validationStatus={hasError ? 'invalid' : 'valid'}
  validationError={hasError ? { message: error } : undefined}
  validationMessageMode='always'
  className={hasError ? 'dx-invalid' : ''}
/>
```

**Result:**
- ✅ Red border when invalid
- ✅ Error message below field
- ✅ Proper ARIA attributes
- ✅ Matches DevExtreme styling

---

## 🔧 Common Scenarios

### Required Field

```typescript
<SPTextField
  name="title"
  control={form.control}
  required  // Shorthand
/>

// Or with custom message:
<SPTextField
  name="title"
  control={form.control}
  rules={{ required: 'Please enter a title' }}
/>
```

### Email Validation

```typescript
const schema = z.object({
  email: z.string().email('Invalid email format'),
});

<SPTextField name="email" control={form.control} />
```

### Min/Max Length

```typescript
<SPTextField
  name="description"
  control={form.control}
  rules={{
    minLength: { value: 10, message: 'Min 10 chars' },
    maxLength: { value: 500, message: 'Max 500 chars' },
  }}
/>
```

### Numeric Range

```typescript
<SPNumberField
  name="age"
  control={form.control}
  min={18}
  max={100}
  rules={{
    min: { value: 18, message: 'Must be 18+' },
    max: { value: 100, message: 'Must be under 100' },
  }}
/>
```

### Custom Validation

```typescript
<SPTextField
  name="username"
  control={form.control}
  rules={{
    validate: async (value) => {
      const exists = await checkUsernameExists(value);
      return !exists || 'Username already taken';
    },
  }}
/>
```

### Dependent Validation

```typescript
const form = useForm();
const password = form.watch('password');

<SPTextField
  name="confirmPassword"
  control={form.control}
  rules={{
    validate: (value) =>
      value === password || 'Passwords do not match',
  }}
/>
```

---

## 📚 Related Documentation

- [SPFx Toolkit Usage Guide](../SPFX-Toolkit-Usage-Guide.md)
- [Validation Examples](./examples/SPFieldValidationExample.tsx)
- [React Hook Form Docs](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)

---

## 🆘 Still Having Issues?

1. **Check the examples:** [SPFieldValidationExample.tsx](./examples/SPFieldValidationExample.tsx)
2. **Read troubleshooting:** [Usage Guide - Troubleshooting](../SPFX-Toolkit-Usage-Guide.md#troubleshooting-validation)
3. **Enable debug logging:** Add console.logs to inspect `fieldState`
4. **Verify form setup:** Ensure `useForm` is configured correctly
5. **Check browser console:** Look for errors or warnings

**Common Fix:** 99% of validation issues are missing `control={form.control}` prop!
