# SPDateField Component =Å

A comprehensive date and datetime field component that mirrors SharePoint's Date and DateTime fields. Supports date-only and date-time modes with extensive calendar customization, time picker, validation, and DevExtreme UI integration.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Props](#props)
- [Display Modes](#display-modes)
- [Usage Patterns](#usage-patterns)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)
- [TypeScript Support](#typescript-support)

---

## Features

- =Å **Date & DateTime Modes** - Date-only or date with time
- ð **Time Picker** - 12-hour or 24-hour format
- = **Date Validation** - Min/max dates, custom validators
- =« **Disabled Dates** - Block specific dates from selection
- =Æ **Calendar Customization** - Week numbers, first day of week
- <£ **React Hook Form** - Native integration with validation
- <¨ **DevExtreme UI** - Consistent styling with spForm system
-  **Validation** - Built-in validation with custom rules
- =P **Time Intervals** - Configurable time step intervals
- = **Quick Buttons** - Today, clear buttons
- <­ **Styling Modes** - Outlined, underlined, or filled styles
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
import { SPDateField, SPDateTimeFormat } from 'spfx-toolkit/lib/components/spFields/SPDateField';
import { useForm } from 'react-hook-form';

function MyForm() {
  const { control } = useForm();

  return (
    <>
      {/* Date only */}
      <SPDateField
        name="dueDate"
        label="Due Date"
        control={control}
        rules={{ required: 'Due date is required' }}
      />

      {/* Date and time */}
      <SPDateField
        name="meetingTime"
        label="Meeting Time"
        control={control}
        dateTimeFormat={SPDateTimeFormat.DateTime}
        timeFormat="12"
        showTimePicker
      />

      {/* With date range validation */}
      <SPDateField
        name="startDate"
        label="Start Date"
        control={control}
        minDate={new Date()}
        maxDate={new Date(2025, 11, 31)}
      />
    </>
  );
}
```

### Standalone (Without Form)

```typescript
import { SPDateField, SPDateTimeFormat } from 'spfx-toolkit/lib/components/spFields/SPDateField';

function MyComponent() {
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());

  return (
    <SPDateField
      label="Select Date"
      value={selectedDate}
      onChange={setSelectedDate}
      showTodayButton
      showClearButton
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
| `value` | `Date` | - | Controlled value |
| `defaultValue` | `Date` | - | Initial value |
| `onChange` | `(value: Date) => void` | - | Change handler |
| `onBlur` | `() => void` | - | Blur handler |
| `onFocus` | `() => void` | - | Focus handler |

### Date Field Specific Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dateTimeFormat` | `SPDateTimeFormat` | `DateOnly` | Date or datetime mode |
| `showTimePicker` | `boolean` | `false` | Show time picker |
| `minDate` | `Date` | - | Minimum allowed date |
| `maxDate` | `Date` | - | Maximum allowed date |
| `displayFormat` | `string` | `'MM/dd/yyyy'` | Date display format |
| `timeFormat` | `'12' \| '24'` | `'12'` | Time display format |
| `timeInterval` | `number` | `30` | Time step interval (minutes) |
| `showClearButton` | `boolean` | `true` | Show clear button |
| `showTodayButton` | `boolean` | `true` | Show today button |
| `showCalendarIcon` | `boolean` | `true` | Show calendar icon |
| `stylingMode` | `string` | `'outlined'` | Style variant |

### Calendar Customization Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `firstDayOfWeek` | `number` | `0` | First day (0=Sunday, 1=Monday) |
| `showWeekNumbers` | `boolean` | `false` | Show week numbers |

### Validation Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dateValidator` | `(date: Date) => boolean` | - | Custom date validator |
| `disabledDates` | `Date[] \| ((date: Date) => boolean)` | - | Dates that cannot be selected |

---

## Display Modes

### Date Only Mode (Default)

Standard date picker without time selection.

```typescript
<SPDateField
  name="birthDate"
  label="Birth Date"
  control={control}
  dateTimeFormat={SPDateTimeFormat.DateOnly}
/>
```

**Use cases:** Birthdays, deadlines, start/end dates, historical dates

---

### DateTime Mode

Date picker with time selection.

```typescript
<SPDateField
  name="appointmentTime"
  label="Appointment Time"
  control={control}
  dateTimeFormat={SPDateTimeFormat.DateTime}
  showTimePicker
  timeFormat="12"
  timeInterval={15}
/>
```

**Features:**
- 12-hour or 24-hour time format
- Configurable time intervals (5, 15, 30, 60 minutes)
- Separate time dropdown

**Use cases:** Appointments, meetings, scheduled events, timestamps

---

## Usage Patterns

### Pattern 1: Basic Date Input

```typescript
<SPDateField
  name="dueDate"
  label="Due Date"
  control={control}
  rules={{ required: 'Due date is required' }}
  showTodayButton
/>
```

---

### Pattern 2: Date Range with Min/Max

```typescript
<SPDateField
  name="projectStart"
  label="Project Start Date"
  control={control}
  minDate={new Date()}
  maxDate={new Date(2025, 11, 31)}
  rules={{ required: 'Start date is required' }}
  description="Select a date between today and end of 2025"
/>
```

---

### Pattern 3: DateTime with 15-Minute Intervals

```typescript
<SPDateField
  name="meetingTime"
  label="Meeting Time"
  control={control}
  dateTimeFormat={SPDateTimeFormat.DateTime}
  timeFormat="12"
  timeInterval={15}
  displayFormat="MM/dd/yyyy hh:mm a"
  rules={{ required: 'Meeting time is required' }}
/>
```

---

### Pattern 4: Disable Weekends

```typescript
<SPDateField
  name="workDate"
  label="Work Date"
  control={control}
  disabledDates={(date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }}
  description="Only weekdays can be selected"
/>
```

---

### Pattern 5: Disable Specific Dates

```typescript
const holidays = [
  new Date(2025, 0, 1),  // New Year's Day
  new Date(2025, 6, 4),  // Independence Day
  new Date(2025, 11, 25) // Christmas
];

<SPDateField
  name="deliveryDate"
  label="Delivery Date"
  control={control}
  disabledDates={holidays}
  description="Holidays are not available for delivery"
/>
```

---

### Pattern 6: Custom Date Validation

```typescript
<SPDateField
  name="eventDate"
  label="Event Date"
  control={control}
  dateValidator={(date) => {
    // Only allow dates in the future
    return date > new Date();
  }}
  rules={{
    required: 'Event date is required',
    validate: (value) => {
      if (!value) return 'Date is required';
      if (value <= new Date()) {
        return 'Event date must be in the future';
      }
      return true;
    }
  }}
/>
```

---

### Pattern 7: Week Numbers and Custom First Day

```typescript
<SPDateField
  name="taskDate"
  label="Task Date"
  control={control}
  firstDayOfWeek={1}  // Monday
  showWeekNumbers
  description="Select a task date (weeks shown, Monday-first)"
/>
```

---

### Pattern 8: 24-Hour Time Format

```typescript
<SPDateField
  name="systemTime"
  label="System Time"
  control={control}
  dateTimeFormat={SPDateTimeFormat.DateTime}
  timeFormat="24"
  timeInterval={60}
  displayFormat="yyyy-MM-dd HH:mm"
/>
```

---

## Complete Examples

### Example 1: Project Timeline Form

```typescript
import { SPDateField, SPDateTimeFormat } from 'spfx-toolkit/lib/components/spFields/SPDateField';
import { useForm } from 'react-hook-form';
import { PrimaryButton } from '@fluentui/react/lib/Button';

interface IProjectForm {
  startDate: Date;
  endDate: Date;
  kickoffMeeting: Date;
  reviewDate: Date;
}

function ProjectTimelineForm() {
  const { control, handleSubmit, watch } = useForm<IProjectForm>();
  const startDate = watch('startDate');

  const onSubmit = async (data: IProjectForm) => {
    console.log('Project timeline:', data);
    // Submit to SharePoint
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Start Date */}
      <SPDateField
        name="startDate"
        label="Project Start Date"
        control={control}
        minDate={new Date()}
        rules={{ required: 'Start date is required' }}
        showTodayButton
      />

      {/* End Date - Must be after start date */}
      <SPDateField
        name="endDate"
        label="Project End Date"
        control={control}
        minDate={startDate || new Date()}
        rules={{
          required: 'End date is required',
          validate: (value) => {
            if (!startDate) return 'Please select start date first';
            if (value <= startDate) {
              return 'End date must be after start date';
            }
            return true;
          }
        }}
      />

      {/* Kickoff Meeting - DateTime with 30-min intervals */}
      <SPDateField
        name="kickoffMeeting"
        label="Kickoff Meeting"
        control={control}
        dateTimeFormat={SPDateTimeFormat.DateTime}
        timeFormat="12"
        timeInterval={30}
        minDate={startDate || new Date()}
        rules={{ required: 'Kickoff meeting time is required' }}
      />

      {/* Review Date - Only weekdays */}
      <SPDateField
        name="reviewDate"
        label="Review Date"
        control={control}
        disabledDates={(date) => {
          const day = date.getDay();
          return day === 0 || day === 6; // Disable weekends
        }}
        minDate={startDate || new Date()}
        description="Select a weekday for the review"
      />

      <PrimaryButton type="submit" text="Save Timeline" />
    </form>
  );
}
```

---

### Example 2: Appointment Scheduling System

```typescript
import { SPDateField, SPDateTimeFormat } from 'spfx-toolkit/lib/components/spFields/SPDateField';
import { useForm } from 'react-hook-form';

interface IAppointmentForm {
  appointmentDate: Date;
  preferredTime: Date;
  alternateTime?: Date;
}

function AppointmentScheduler() {
  const { control, handleSubmit } = useForm<IAppointmentForm>();

  // Business hours: 9 AM - 5 PM, weekdays only
  const isValidAppointmentTime = (date: Date): boolean => {
    const day = date.getDay();
    const hour = date.getHours();

    // Check if weekday
    if (day === 0 || day === 6) return false;

    // Check if business hours (9 AM - 5 PM)
    if (hour < 9 || hour >= 17) return false;

    return true;
  };

  const disabledDates = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6; // Disable weekends
  };

  const onSubmit = async (data: IAppointmentForm) => {
    console.log('Appointment:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Appointment Date - Weekdays only */}
      <SPDateField
        name="appointmentDate"
        label="Appointment Date"
        control={control}
        minDate={new Date()}
        disabledDates={disabledDates}
        rules={{ required: 'Appointment date is required' }}
        description="Select a weekday for your appointment"
      />

      {/* Preferred Time - Business hours, 15-min intervals */}
      <SPDateField
        name="preferredTime"
        label="Preferred Time"
        control={control}
        dateTimeFormat={SPDateTimeFormat.DateTime}
        timeFormat="12"
        timeInterval={15}
        minDate={new Date()}
        disabledDates={disabledDates}
        rules={{
          required: 'Preferred time is required',
          validate: (value) => {
            if (!isValidAppointmentTime(value)) {
              return 'Please select a time between 9 AM and 5 PM on weekdays';
            }
            return true;
          }
        }}
        description="Business hours: 9 AM - 5 PM, Monday-Friday"
      />

      {/* Alternate Time - Optional */}
      <SPDateField
        name="alternateTime"
        label="Alternate Time (Optional)"
        control={control}
        dateTimeFormat={SPDateTimeFormat.DateTime}
        timeFormat="12"
        timeInterval={15}
        minDate={new Date()}
        disabledDates={disabledDates}
        dateValidator={isValidAppointmentTime}
        description="Provide an alternate time if your preferred time is unavailable"
      />

      <PrimaryButton type="submit" text="Schedule Appointment" />
    </form>
  );
}
```

---

### Example 3: Event Management with Holidays

```typescript
import { SPDateField, SPDateTimeFormat } from 'spfx-toolkit/lib/components/spFields/SPDateField';
import { useForm } from 'react-hook-form';

interface IEventForm {
  eventDate: Date;
  eventTime: Date;
  registrationDeadline: Date;
}

function EventManagementForm() {
  const { control, handleSubmit, watch } = useForm<IEventForm>();
  const eventDate = watch('eventDate');

  // Company holidays (no events allowed)
  const holidays = React.useMemo(() => [
    new Date(2025, 0, 1),   // New Year's Day
    new Date(2025, 4, 26),  // Memorial Day
    new Date(2025, 6, 4),   // Independence Day
    new Date(2025, 8, 1),   // Labor Day
    new Date(2025, 10, 27), // Thanksgiving
    new Date(2025, 11, 25)  // Christmas
  ], []);

  const isHoliday = (date: Date): boolean => {
    return holidays.some(holiday =>
      holiday.toDateString() === date.toDateString()
    );
  };

  const onSubmit = async (data: IEventForm) => {
    console.log('Event data:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Event Date - No holidays, future dates only */}
      <SPDateField
        name="eventDate"
        label="Event Date"
        control={control}
        minDate={new Date()}
        disabledDates={isHoliday}
        rules={{
          required: 'Event date is required',
          validate: (value) => {
            if (value <= new Date()) {
              return 'Event date must be in the future';
            }
            if (isHoliday(value)) {
              return 'Events cannot be scheduled on company holidays';
            }
            return true;
          }
        }}
        description="Select a future date (excluding holidays)"
      />

      {/* Event Time - 30-minute intervals */}
      <SPDateField
        name="eventTime"
        label="Event Start Time"
        control={control}
        dateTimeFormat={SPDateTimeFormat.DateTime}
        timeFormat="12"
        timeInterval={30}
        displayFormat="MM/dd/yyyy hh:mm a"
        rules={{ required: 'Event time is required' }}
      />

      {/* Registration Deadline - Must be before event date */}
      <SPDateField
        name="registrationDeadline"
        label="Registration Deadline"
        control={control}
        dateTimeFormat={SPDateTimeFormat.DateTime}
        timeFormat="12"
        minDate={new Date()}
        maxDate={eventDate}
        rules={{
          required: 'Registration deadline is required',
          validate: (value) => {
            if (!eventDate) return 'Please select event date first';
            if (value >= eventDate) {
              return 'Registration deadline must be before event date';
            }
            return true;
          }
        }}
        description="Must be before the event date"
      />

      <PrimaryButton type="submit" text="Create Event" />
    </form>
  );
}
```

---

## Best Practices

### 1. Always Use Labels

```typescript
// L BAD: No label
<SPDateField name="date1" control={control} />

//  GOOD: Clear label
<SPDateField
  name="dueDate"
  label="Due Date"
  control={control}
/>
```

---

### 2. Set Appropriate Min/Max Dates

```typescript
//  GOOD: Prevent past dates for future events
<SPDateField
  name="eventDate"
  label="Event Date"
  control={control}
  minDate={new Date()}
  description="Select a future date"
/>

//  GOOD: Date range for specific period
<SPDateField
  name="reportDate"
  label="Report Date"
  control={control}
  minDate={new Date(2025, 0, 1)}
  maxDate={new Date(2025, 11, 31)}
  description="Select a date in 2025"
/>
```

---

### 3. Choose Appropriate Time Intervals

```typescript
//  GOOD: 15-min intervals for appointments
<SPDateField
  name="appointmentTime"
  label="Appointment Time"
  control={control}
  dateTimeFormat={SPDateTimeFormat.DateTime}
  timeInterval={15}
/>

//  GOOD: 60-min intervals for general scheduling
<SPDateField
  name="meetingTime"
  label="Meeting Time"
  control={control}
  dateTimeFormat={SPDateTimeFormat.DateTime}
  timeInterval={60}
/>
```

---

### 4. Provide Helpful Descriptions

```typescript
//  GOOD: Clear guidance
<SPDateField
  name="deliveryDate"
  label="Delivery Date"
  control={control}
  minDate={new Date()}
  disabledDates={(date) => date.getDay() === 0 || date.getDay() === 6}
  description="Select a weekday (delivery not available on weekends)"
/>
```

---

### 5. Use Custom Validators for Complex Rules

```typescript
//  GOOD: Business logic validation
<SPDateField
  name="startDate"
  label="Start Date"
  control={control}
  rules={{
    required: 'Start date is required',
    validate: (value) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (value < today) {
        return 'Start date cannot be in the past';
      }

      const maxFutureDate = new Date();
      maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 2);

      if (value > maxFutureDate) {
        return 'Start date cannot be more than 2 years in the future';
      }

      return true;
    }
  }}
/>
```

---

### 6. Validate Related Dates

```typescript
//  GOOD: End date must be after start date
function MyForm() {
  const { control, watch } = useForm();
  const startDate = watch('startDate');

  return (
    <>
      <SPDateField
        name="startDate"
        label="Start Date"
        control={control}
        rules={{ required: 'Start date is required' }}
      />

      <SPDateField
        name="endDate"
        label="End Date"
        control={control}
        minDate={startDate}
        rules={{
          required: 'End date is required',
          validate: (value) =>
            !startDate || value > startDate || 'End date must be after start date'
        }}
      />
    </>
  );
}
```

---

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import {
  SPDateField,
  SPDateTimeFormat,
  ISPDateFieldProps
} from 'spfx-toolkit/lib/components/spFields/SPDateField';

// All props are fully typed
const props: ISPDateFieldProps = {
  name: 'dueDate',
  label: 'Due Date',
  dateTimeFormat: SPDateTimeFormat.DateOnly,
  minDate: new Date(),
  maxDate: new Date(2025, 11, 31),
  showTodayButton: true
};

// Date format enum
const format: SPDateTimeFormat = SPDateTimeFormat.DateTime;
// Options: DateOnly, DateTime

// Custom validator with full type safety
const validator = (date: Date): boolean => {
  return date > new Date();
};

// Disabled dates function
const disabledDates = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Weekend
};
```

---

## Related Components

- **[SPTextField](../SPTextField/README.md)** - Text input fields
- **[SPChoiceField](../SPChoiceField/README.md)** - Choice and dropdown fields
- **[SPNumberField](../SPNumberField/README.md)** - Numeric input fields
- **[SPBooleanField](../SPBooleanField/README.md)** - Yes/No checkbox fields

---

## Tree-Shaking

Always use specific imports for optimal bundle size:

```typescript
//  RECOMMENDED: Specific import
import { SPDateField } from 'spfx-toolkit/lib/components/spFields/SPDateField';

// L AVOID: Bulk import
import { SPDateField } from 'spfx-toolkit';
```

---

## License

Part of [SPFx Toolkit](../../../../README.md) - MIT License

---

**Last Updated:** November 2025
