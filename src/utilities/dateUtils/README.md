# DateUtils Utility 📅

ES5-compatible date manipulation extensions and utilities for SharePoint Framework (SPFx) applications. Leverages DevExtreme for powerful date formatting with intelligent fallbacks.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [Date Formatting](#date-formatting)
  - [Date Calculations](#date-calculations)
  - [Date Comparisons](#date-comparisons)
- [Usage Patterns](#usage-patterns)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)
- [TypeScript Support](#typescript-support)

---

## Features

- 📆 **Date Extensions** - Enhanced Date methods for ES5 environments
- 🕐 **Smart Formatting** - Leverages DevExtreme with intelligent fallbacks
- 📝 **Custom Patterns** - Support for custom date format patterns
- ⏰ **Calculations** - Add/subtract days, weeks, business days
- 🌐 **Locale Support** - Culture-aware formatting via DevExtreme
- 📅 **Business Days** - Automatically skip weekends
- 🎯 **TypeScript** - Full type definitions and IntelliSense
- ⚡ **Lightweight** - Minimal overhead with smart DevExtreme integration
- 🔧 **Two Usage Modes** - Static methods or prototype extensions
- 📦 **Zero Dependencies** - Only uses SPFx peer dependencies

---

## Installation

```bash
npm install spfx-toolkit
```

---

## Quick Start

### Static Methods (Recommended for Production)

```typescript
import { DateUtils } from 'spfx-toolkit/lib/utilities/dateUtils';

// Format dates
const formatted = DateUtils.format(new Date(), 'MM/dd/yyyy');
// "03/15/2024"

const longDate = DateUtils.format(new Date(), 'MMMM dd, yyyy');
// "March 15, 2024"

// Add days
const nextWeek = DateUtils.addDays(new Date(), 7);
const lastMonth = DateUtils.addDays(new Date(), -30);

// Business days (skip weekends)
const dueDate = DateUtils.addBusinessDays(new Date(), 5);
// If today is Friday, returns next Friday (skips weekend)

// Check if today
const isToday = DateUtils.isToday(new Date());
// true
```

### Date Prototype Extensions (For Convenience)

```typescript
import 'spfx-toolkit/lib/utilities/dateUtils';

// Extensions are automatically applied
const formatted = new Date().format('MM/dd/yyyy');
// "03/15/2024"

const tomorrow = new Date().addDays(1);
const nextBusinessDay = new Date().addBusinessDays(1);
const isToday = new Date().isToday();
// true
```

---

## API Reference

### Date Formatting

#### `format(date: Date, pattern: string): string`

Format date using DevExtreme patterns or custom tokens with intelligent fallback.

**DevExtreme Integration:**
- When DevExtreme is available, uses its powerful locale-aware formatting
- Supports all DevExtreme predefined formats and custom patterns
- Automatically falls back to lightweight custom implementation if DevExtreme is unavailable

**Static Method:**
```typescript
const date = new Date('2024-03-15T14:30:45');

// DevExtreme Predefined Formats
DateUtils.format(date, 'shortDate');
// "3/15/2024"

DateUtils.format(date, 'longDate');
// "Friday, March 15, 2024"

DateUtils.format(date, 'shortTime');
// "2:30 PM"

DateUtils.format(date, 'longTime');
// "2:30:45 PM"

DateUtils.format(date, 'shortDateTime');
// "3/15/2024 2:30 PM"

DateUtils.format(date, 'longDateTime');
// "Friday, March 15, 2024 2:30:45 PM"
```

**Custom Pattern Formatting:**
```typescript
const date = new Date('2024-03-15T14:30:45');

// Common patterns
DateUtils.format(date, 'MM/dd/yyyy');
// "03/15/2024"

DateUtils.format(date, 'yyyy-MM-dd');
// "2024-03-15"

DateUtils.format(date, 'MMMM dd, yyyy');
// "March 15, 2024"

DateUtils.format(date, 'MMM d, yyyy');
// "Mar 15, 2024"

// With time
DateUtils.format(date, 'MM/dd/yyyy HH:mm:ss');
// "03/15/2024 14:30:45"

DateUtils.format(date, 'MMM d, yyyy h:mm a');
// "Mar 15, 2024 2:30 PM"

// ISO 8601 format
DateUtils.format(date, 'yyyy-MM-dd HH:mm:ss');
// "2024-03-15 14:30:45"

// Custom separators
DateUtils.format(date, 'dd.MM.yyyy');
// "15.03.2024"

DateUtils.format(date, 'yyyy/MM/dd');
// "2024/03/15"
```

**Date Extension:**
```typescript
const date = new Date('2024-03-15T14:30:45');

date.format('MM/dd/yyyy');
// "03/15/2024"

date.format('MMMM dd, yyyy');
// "March 15, 2024"

date.format('shortDate');
// "3/15/2024"
```

**Supported Format Tokens:**

| Token | Description | Example |
|-------|-------------|---------|
| `yyyy` | 4-digit year | 2024 |
| `yy` | 2-digit year | 24 |
| `MMMM` | Full month name | March |
| `MMM` | Short month name | Mar |
| `MM` | Month (padded) | 03 |
| `M` | Month (no padding) | 3 |
| `dd` | Day (padded) | 15 |
| `d` | Day (no padding) | 15 |
| `HH` | 24-hour (padded) | 14 |
| `H` | 24-hour (no padding) | 14 |
| `hh` | 12-hour (padded) | 02 |
| `h` | 12-hour (no padding) | 2 |
| `mm` | Minutes (padded) | 30 |
| `m` | Minutes (no padding) | 30 |
| `ss` | Seconds (padded) | 45 |
| `s` | Seconds (no padding) | 45 |
| `a` / `A` | AM/PM | PM |
| `z` | Timezone offset | UTC-05:00 |

**Use Cases:**
- Display SharePoint list item dates
- Format document modified dates
- Show user-friendly timestamps
- Generate reports with formatted dates
- Create calendar displays

---

### Date Calculations

#### `addDays(date: Date, days: number): Date`

Add specified number of days to a date (can be negative).

**Static Method:**
```typescript
const today = new Date('2024-03-15');

// Add days
const nextWeek = DateUtils.addDays(today, 7);
// 2024-03-22

const tomorrow = DateUtils.addDays(today, 1);
// 2024-03-16

// Subtract days (negative number)
const yesterday = DateUtils.addDays(today, -1);
// 2024-03-14

const lastWeek = DateUtils.addDays(today, -7);
// 2024-03-08

const nextMonth = DateUtils.addDays(today, 30);
// 2024-04-14
```

**Date Extension:**
```typescript
const today = new Date('2024-03-15');

const nextWeek = today.addDays(7);
// 2024-03-22

const yesterday = today.addDays(-1);
// 2024-03-14
```

**SharePoint Examples:**
```typescript
// Set task due date to 30 days from now
const createdDate = new Date();
const dueDate = DateUtils.addDays(createdDate, 30);

await sp.web.lists.getByTitle('Tasks').items.add({
  Title: 'Project Deliverable',
  Created: createdDate.toISOString(),
  DueDate: dueDate.toISOString()
});

// Calculate reminder date (7 days before due date)
const reminderDate = DateUtils.addDays(dueDate, -7);
```

**Use Cases:**
- Calculate due dates
- Set reminder dates
- Schedule future events
- Implement date ranges
- Build calendar applications

---

#### `addBusinessDays(date: Date, days: number): Date`

Add business days to a date (automatically skips weekends: Saturday and Sunday).

**Static Method:**
```typescript
// If today is Friday, March 15, 2024
const friday = new Date('2024-03-15'); // Friday

// Add 1 business day from Friday = Monday
const monday = DateUtils.addBusinessDays(friday, 1);
// 2024-03-18 (Monday)

// Add 5 business days from Friday = next Friday
const nextFriday = DateUtils.addBusinessDays(friday, 5);
// 2024-03-22 (Friday)

// If today is Wednesday
const wednesday = new Date('2024-03-13'); // Wednesday

// Add 3 business days = Monday of next week
const nextMonday = DateUtils.addBusinessDays(wednesday, 3);
// 2024-03-18 (Monday)

// Subtract business days
const prevBusinessDay = DateUtils.addBusinessDays(friday, -1);
// 2024-03-14 (Thursday)

const fiveBusinessDaysAgo = DateUtils.addBusinessDays(friday, -5);
// 2024-03-08 (Friday of previous week)
```

**Date Extension:**
```typescript
const friday = new Date('2024-03-15'); // Friday

const nextBusinessDay = friday.addBusinessDays(1);
// Monday, March 18

const fiveBusinessDays = friday.addBusinessDays(5);
// Friday, March 22
```

**SharePoint Examples:**
```typescript
// Set approval due date to 5 business days from request
const requestDate = new Date();
const approvalDue = DateUtils.addBusinessDays(requestDate, 5);

await sp.web.lists.getByTitle('Approvals').items.add({
  Title: 'Document Approval Request',
  RequestDate: requestDate.toISOString(),
  ApprovalDueDate: approvalDue.toISOString(),
  Status: 'Pending'
});

// Calculate when work should have started (10 business days before completion)
const completionDate = new Date();
const startDate = DateUtils.addBusinessDays(completionDate, -10);

// Schedule follow-up 3 business days after meeting
const meetingDate = new Date('2024-03-15'); // Friday
const followUpDate = DateUtils.addBusinessDays(meetingDate, 3);
// Wednesday, March 20 (skips weekend)
```

**Use Cases:**
- Calculate SLA response times
- Set business day deadlines
- Schedule approvals and reviews
- Plan project timelines
- Implement workflow due dates

**Note:** Only skips weekends (Saturday/Sunday). Does not account for holidays. For holiday-aware calculations, combine with a custom holiday checker.

---

### Date Comparisons

#### `isToday(date: Date): boolean`

Check if a date represents today (compares date portion only, ignoring time).

**Static Method:**
```typescript
// Current date and time
const now = new Date();
DateUtils.isToday(now);
// true

// Yesterday
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
DateUtils.isToday(yesterday);
// false

// Tomorrow
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
DateUtils.isToday(tomorrow);
// false

// Today at different time
const todayMorning = new Date();
todayMorning.setHours(6, 0, 0);
DateUtils.isToday(todayMorning);
// true (time is ignored)

// SharePoint date string
const spDate = new Date('2024-03-15T10:30:00Z');
DateUtils.isToday(spDate);
// true if today is March 15, 2024
```

**Date Extension:**
```typescript
new Date().isToday();
// true

new Date('2024-01-01').isToday();
// false (unless today is Jan 1, 2024)

const someDate = new Date(listItem.Modified);
someDate.isToday();
// true/false depending on modification date
```

**SharePoint Examples:**
```typescript
// Filter tasks created today
const items = await sp.web.lists.getByTitle('Tasks').items
  .select('Title', 'Created', 'Status')();

const todaysTasks = items.filter(item =>
  DateUtils.isToday(new Date(item.Created))
);

console.log(`Created ${todaysTasks.length} tasks today`);

// Show special indicator for items modified today
const isModifiedToday = DateUtils.isToday(new Date(listItem.Modified));
const className = isModifiedToday ? 'modified-today highlight' : 'modified-other';

// Group items by "today" vs "older"
const groupedItems = {
  today: items.filter(item => DateUtils.isToday(new Date(item.Created))),
  older: items.filter(item => !DateUtils.isToday(new Date(item.Created)))
};
```

**Use Cases:**
- Filter list items by creation date
- Highlight today's activities
- Group items by recency
- Implement "new" badges
- Build activity feeds

---

## Usage Patterns

### Pattern 1: Static Methods (Production)

```typescript
import { DateUtils } from 'spfx-toolkit/lib/utilities/dateUtils';

class TaskList {
  public formatDueDate(dueDate: Date): string {
    return DateUtils.format(dueDate, 'MMM d, yyyy');
  }

  public calculateDeadline(startDate: Date, businessDays: number): Date {
    return DateUtils.addBusinessDays(startDate, businessDays);
  }

  public isOverdueToday(dueDate: Date): boolean {
    return DateUtils.isToday(dueDate) || dueDate < new Date();
  }
}
```

**Advantages:**
- No prototype pollution
- Clear import tracking
- Better tree-shaking
- Easier testing

---

### Pattern 2: Date Extensions (Convenience)

```typescript
import 'spfx-toolkit/lib/utilities/dateUtils';

class TaskList {
  public formatDueDate(dueDate: Date): string {
    return dueDate.format('MMM d, yyyy');
  }

  public calculateDeadline(startDate: Date, businessDays: number): Date {
    return startDate.addBusinessDays(businessDays);
  }

  public isOverdueToday(dueDate: Date): boolean {
    return dueDate.isToday() || dueDate < new Date();
  }
}
```

**Advantages:**
- Method chaining
- Cleaner syntax
- Less verbose
- Fluent API

---

### Pattern 3: Hybrid Approach

```typescript
import { DateUtils } from 'spfx-toolkit/lib/utilities/dateUtils';
import 'spfx-toolkit/lib/utilities/dateUtils'; // Enable extensions

// Use static for complex operations
const dueDate = DateUtils.addBusinessDays(new Date(), 5);

// Use extensions for simple chaining
const formatted = dueDate.format('MMMM dd, yyyy');
const isToday = dueDate.isToday();
```

---

## Complete Examples

### Example 1: Task List with Due Date Formatting

```typescript
import { DateUtils } from 'spfx-toolkit/lib/utilities/dateUtils';
import * as React from 'react';

interface ITask {
  ID: number;
  Title: string;
  DueDate: string;
  Status: string;
  Created: string;
}

const TaskList: React.FC<{ tasks: ITask[] }> = ({ tasks }) => {
  const getStatusClass = (task: ITask): string => {
    const dueDate = new Date(task.DueDate);
    const today = new Date();

    if (DateUtils.isToday(dueDate)) {
      return 'due-today';
    } else if (dueDate < today) {
      return 'overdue';
    } else if (DateUtils.addDays(today, 3) >= dueDate) {
      return 'due-soon';
    }
    return 'on-track';
  };

  return (
    <div className="task-list">
      {tasks.map(task => {
        const dueDate = new Date(task.DueDate);
        const createdDate = new Date(task.Created);
        const dueDateFormatted = DateUtils.format(dueDate, 'MMM d, yyyy');
        const isCreatedToday = DateUtils.isToday(createdDate);

        return (
          <div key={task.ID} className={`task-item ${getStatusClass(task)}`}>
            <div className="task-header">
              <h3>{task.Title}</h3>
              {isCreatedToday && <span className="badge-new">New</span>}
            </div>
            <div className="task-meta">
              <span className="due-date">
                Due: {dueDateFormatted}
              </span>
              <span className="status">{task.Status}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

---

### Example 2: Workflow Approval Due Date Calculator

```typescript
import { DateUtils } from 'spfx-toolkit/lib/utilities/dateUtils';

interface IApprovalWorkflow {
  requestDate: Date;
  approvalSLA: number; // Business days
  reminderDays: number; // Business days before due
}

class ApprovalWorkflowService {
  /**
   * Calculate all important dates for an approval workflow
   */
  public static calculateWorkflowDates(config: IApprovalWorkflow) {
    const { requestDate, approvalSLA, reminderDays } = config;

    // Calculate approval due date (business days from request)
    const approvalDueDate = DateUtils.addBusinessDays(requestDate, approvalSLA);

    // Calculate when to send reminder (business days before due)
    const reminderDate = DateUtils.addBusinessDays(approvalDueDate, -reminderDays);

    // Calculate escalation date (1 business day after due)
    const escalationDate = DateUtils.addBusinessDays(approvalDueDate, 1);

    // Check if due today
    const isDueToday = DateUtils.isToday(approvalDueDate);

    // Check if overdue
    const isOverdue = approvalDueDate < new Date();

    return {
      requestDate,
      requestDateFormatted: DateUtils.format(requestDate, 'MMMM dd, yyyy'),
      approvalDueDate,
      approvalDueDateFormatted: DateUtils.format(approvalDueDate, 'MMMM dd, yyyy'),
      reminderDate,
      reminderDateFormatted: DateUtils.format(reminderDate, 'MMMM dd, yyyy'),
      escalationDate,
      escalationDateFormatted: DateUtils.format(escalationDate, 'MMMM dd, yyyy'),
      isDueToday,
      isOverdue,
      status: isOverdue ? 'Overdue' : isDueToday ? 'Due Today' : 'Pending'
    };
  }

  /**
   * Create approval request with calculated dates
   */
  public static async createApprovalRequest(
    title: string,
    approvalSLA: number = 5,
    reminderDays: number = 2
  ) {
    const workflow = this.calculateWorkflowDates({
      requestDate: new Date(),
      approvalSLA,
      reminderDays
    });

    const newItem = await sp.web.lists.getByTitle('Approvals').items.add({
      Title: title,
      RequestDate: workflow.requestDate.toISOString(),
      ApprovalDueDate: workflow.approvalDueDate.toISOString(),
      ReminderDate: workflow.reminderDate.toISOString(),
      EscalationDate: workflow.escalationDate.toISOString(),
      Status: 'Pending Approval'
    });

    return {
      ...newItem.data,
      workflow
    };
  }
}

// Usage
const approval = await ApprovalWorkflowService.createApprovalRequest(
  'Q1 Budget Review',
  5,  // 5 business days SLA
  2   // Send reminder 2 business days before due
);

console.log(`Approval due: ${approval.workflow.approvalDueDateFormatted}`);
console.log(`Send reminder on: ${approval.workflow.reminderDateFormatted}`);
```

---

### Example 3: Calendar Event Formatter

```typescript
import { DateUtils } from 'spfx-toolkit/lib/utilities/dateUtils';

interface ICalendarEvent {
  ID: number;
  Title: string;
  EventDate: string;
  EndDate: string;
  AllDayEvent: boolean;
  Location: string;
}

class CalendarEventFormatter {
  /**
   * Format event date range for display
   */
  public static formatEventDateRange(event: ICalendarEvent): string {
    const startDate = new Date(event.EventDate);
    const endDate = new Date(event.EndDate);

    if (event.AllDayEvent) {
      const startFormatted = DateUtils.format(startDate, 'MMMM dd, yyyy');
      const endFormatted = DateUtils.format(endDate, 'MMMM dd, yyyy');

      // Same day event
      if (startFormatted === endFormatted) {
        return startFormatted;
      }

      // Multi-day event
      return `${startFormatted} - ${endFormatted}`;
    }

    // Event with specific time
    const startFormatted = DateUtils.format(startDate, 'MMM d, yyyy h:mm a');
    const endTime = DateUtils.format(endDate, 'h:mm a');

    return `${startFormatted} - ${endTime}`;
  }

  /**
   * Get event status relative to today
   */
  public static getEventStatus(event: ICalendarEvent): {
    status: 'today' | 'upcoming' | 'past';
    message: string;
  } {
    const eventDate = new Date(event.EventDate);

    if (DateUtils.isToday(eventDate)) {
      return {
        status: 'today',
        message: 'Happening today!'
      };
    }

    if (eventDate > new Date()) {
      const daysUntil = Math.ceil(
        (eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        status: 'upcoming',
        message: `In ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`
      };
    }

    return {
      status: 'past',
      message: 'Past event'
    };
  }

  /**
   * Render event card
   */
  public static renderEventCard(event: ICalendarEvent): React.ReactElement {
    const dateRange = this.formatEventDateRange(event);
    const eventStatus = this.getEventStatus(event);

    return (
      <div className={`event-card event-${eventStatus.status}`}>
        <div className="event-header">
          <h3>{event.Title}</h3>
          <span className="event-status-badge">{eventStatus.message}</span>
        </div>
        <div className="event-details">
          <div className="event-date">
            <i className="icon-calendar" />
            {dateRange}
          </div>
          {event.Location && (
            <div className="event-location">
              <i className="icon-location" />
              {event.Location}
            </div>
          )}
        </div>
      </div>
    );
  }
}

// Usage
const events = await sp.web.lists.getByTitle('Events').items
  .select('ID', 'Title', 'EventDate', 'EndDate', 'AllDayEvent', 'Location')
  .filter('EventDate ge datetime\'2024-03-01\'')
  .orderBy('EventDate')();

const eventCards = events.map(event =>
  CalendarEventFormatter.renderEventCard(event)
);
```

---

### Example 4: Document Retention Calculator

```typescript
import { DateUtils } from 'spfx-toolkit/lib/utilities/dateUtils';

interface IDocument {
  ID: number;
  Title: string;
  Created: string;
  Modified: string;
  RetentionPeriodDays: number;
}

class DocumentRetentionService {
  /**
   * Calculate document retention dates
   */
  public static calculateRetentionDates(document: IDocument) {
    const createdDate = new Date(document.Created);
    const modifiedDate = new Date(document.Modified);
    const retentionPeriod = document.RetentionPeriodDays;

    // Calculate disposal date from creation
    const disposalDate = DateUtils.addDays(createdDate, retentionPeriod);

    // Calculate review date (30 days before disposal)
    const reviewDate = DateUtils.addDays(disposalDate, -30);

    // Calculate business days until disposal
    const today = new Date();
    let businessDaysRemaining = 0;
    let tempDate = new Date(today);

    while (tempDate < disposalDate) {
      tempDate = DateUtils.addBusinessDays(tempDate, 1);
      if (tempDate <= disposalDate) {
        businessDaysRemaining++;
      }
    }

    // Check statuses
    const isReviewDue = reviewDate <= today && today < disposalDate;
    const isExpired = today >= disposalDate;

    return {
      createdDate,
      createdFormatted: DateUtils.format(createdDate, 'MMM d, yyyy'),
      disposalDate,
      disposalFormatted: DateUtils.format(disposalDate, 'MMM d, yyyy'),
      reviewDate,
      reviewFormatted: DateUtils.format(reviewDate, 'MMM d, yyyy'),
      businessDaysRemaining,
      isReviewDue,
      isExpired,
      status: isExpired ? 'Expired - Ready for Disposal' :
              isReviewDue ? 'Review Required' :
              'Active'
    };
  }

  /**
   * Get documents requiring review today
   */
  public static async getDocumentsForReview() {
    const items = await sp.web.lists.getByTitle('Documents').items
      .select('ID', 'Title', 'Created', 'Modified', 'RetentionPeriodDays')();

    return items
      .map(item => ({
        ...item,
        retention: this.calculateRetentionDates(item)
      }))
      .filter(item => item.retention.isReviewDue && !item.retention.isExpired)
      .sort((a, b) =>
        a.retention.disposalDate.getTime() - b.retention.disposalDate.getTime()
      );
  }
}

// Usage
const documentsForReview = await DocumentRetentionService.getDocumentsForReview();

console.log(`${documentsForReview.length} documents require review`);

documentsForReview.forEach(doc => {
  console.log(`${doc.Title}: ${doc.retention.businessDaysRemaining} business days until disposal`);
});
```

---

### Example 5: Project Timeline Display

```typescript
import { DateUtils } from 'spfx-toolkit/lib/utilities/dateUtils';
import 'spfx-toolkit/lib/utilities/dateUtils'; // Enable extensions

interface IProjectPhase {
  name: string;
  startDate: Date;
  durationBusinessDays: number;
}

class ProjectTimeline {
  /**
   * Calculate project phases with business day calculations
   */
  public static calculatePhases(projectStart: Date, phases: IProjectPhase[]) {
    let currentDate = new Date(projectStart);
    const calculatedPhases = [];

    for (const phase of phases) {
      const phaseStart = new Date(currentDate);
      const phaseEnd = DateUtils.addBusinessDays(phaseStart, phase.durationBusinessDays);

      calculatedPhases.push({
        name: phase.name,
        startDate: phaseStart,
        endDate: phaseEnd,
        startFormatted: phaseStart.format('MMM d, yyyy'),
        endFormatted: phaseEnd.format('MMM d, yyyy'),
        durationBusinessDays: phase.durationBusinessDays,
        isActive: DateUtils.isToday(phaseStart) ||
                 (phaseStart <= new Date() && new Date() <= phaseEnd),
        isCompleted: phaseEnd < new Date(),
        isUpcoming: phaseStart > new Date()
      });

      // Next phase starts after current phase ends
      currentDate = DateUtils.addBusinessDays(phaseEnd, 1);
    }

    return calculatedPhases;
  }

  /**
   * Render project timeline
   */
  public static renderTimeline(projectName: string, projectStart: Date, phases: IProjectPhase[]) {
    const calculatedPhases = this.calculatePhases(projectStart, phases);
    const projectEnd = calculatedPhases[calculatedPhases.length - 1].endDate;

    return (
      <div className="project-timeline">
        <h2>{projectName}</h2>
        <div className="timeline-overview">
          <div>Start: {projectStart.format('MMMM dd, yyyy')}</div>
          <div>End: {projectEnd.format('MMMM dd, yyyy')}</div>
          <div>Total Duration: {
            calculatedPhases.reduce((sum, p) => sum + p.durationBusinessDays, 0)
          } business days</div>
        </div>

        <div className="phases">
          {calculatedPhases.map((phase, index) => (
            <div
              key={index}
              className={`phase ${
                phase.isActive ? 'active' :
                phase.isCompleted ? 'completed' :
                'upcoming'
              }`}
            >
              <div className="phase-name">{phase.name}</div>
              <div className="phase-dates">
                {phase.startFormatted} → {phase.endFormatted}
              </div>
              <div className="phase-duration">
                {phase.durationBusinessDays} business days
              </div>
              <div className="phase-status">
                {phase.isActive && 'In Progress'}
                {phase.isCompleted && 'Completed'}
                {phase.isUpcoming && 'Upcoming'}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

// Usage
const projectPhases: IProjectPhase[] = [
  { name: 'Planning', startDate: new Date('2024-03-01'), durationBusinessDays: 10 },
  { name: 'Design', startDate: new Date(), durationBusinessDays: 15 },
  { name: 'Development', startDate: new Date(), durationBusinessDays: 30 },
  { name: 'Testing', startDate: new Date(), durationBusinessDays: 10 },
  { name: 'Deployment', startDate: new Date(), durationBusinessDays: 5 }
];

const timeline = ProjectTimeline.renderTimeline(
  'Website Redesign Project',
  new Date('2024-03-01'),
  projectPhases
);
```

---

## Best Practices

### 1. Always Validate Dates

```typescript
// ❌ BAD: No validation
const formatted = DateUtils.format(someDate, 'MM/dd/yyyy');

// ✅ GOOD: Validate before formatting
if (someDate && someDate instanceof Date && !isNaN(someDate.getTime())) {
  const formatted = DateUtils.format(someDate, 'MM/dd/yyyy');
} else {
  console.error('Invalid date provided');
}
```

---

### 2. Use Business Days for Workflows

```typescript
// ❌ BAD: Regular days don't account for weekends
const dueDate = DateUtils.addDays(new Date(), 5);

// ✅ GOOD: Business days skip weekends
const dueDate = DateUtils.addBusinessDays(new Date(), 5);
```

---

### 3. Prefer Static Methods in Loops

```typescript
// ❌ BAD: Extensions may have slight overhead
items.forEach(item => {
  const formatted = new Date(item.Created).format('MM/dd/yyyy');
});

// ✅ GOOD: Static methods for better performance
items.forEach(item => {
  const formatted = DateUtils.format(new Date(item.Created), 'MM/dd/yyyy');
});
```

---

### 4. Use Consistent Date Formats

```typescript
// ✅ GOOD: Define standard formats as constants
const DATE_FORMATS = {
  SHORT: 'MM/dd/yyyy',
  LONG: 'MMMM dd, yyyy',
  ISO: 'yyyy-MM-dd',
  DISPLAY: 'MMM d, yyyy',
  WITH_TIME: 'MMM d, yyyy h:mm a'
};

const formatted = DateUtils.format(date, DATE_FORMATS.DISPLAY);
```

---

### 5. Handle SharePoint Date Strings

```typescript
// ✅ GOOD: Always convert SharePoint date strings to Date objects
const spDate = listItem.DueDate; // '2024-03-15T00:00:00Z'
const dateObj = new Date(spDate);
const formatted = DateUtils.format(dateObj, 'MMM d, yyyy');

// ✅ GOOD: Validate SharePoint dates
const dueDateString = listItem.DueDate;
if (dueDateString) {
  const dueDate = new Date(dueDateString);
  if (!isNaN(dueDate.getTime())) {
    const formatted = DateUtils.format(dueDate, 'MMM d, yyyy');
  }
}
```

---

### 6. Tree-Shaking

```typescript
// ✅ RECOMMENDED: Specific import
import { DateUtils } from 'spfx-toolkit/lib/utilities/dateUtils';

// ❌ AVOID: Bulk import
import { DateUtils } from 'spfx-toolkit';
```

---

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import { DateUtils } from 'spfx-toolkit/lib/utilities/dateUtils';
import type { DateExtensionMethod } from 'spfx-toolkit/lib/utilities/dateUtils';

// All methods are fully typed
const formatted: string = DateUtils.format(new Date(), 'MM/dd/yyyy');
const nextWeek: Date = DateUtils.addDays(new Date(), 7);
const nextBusinessDay: Date = DateUtils.addBusinessDays(new Date(), 1);
const isToday: boolean = DateUtils.isToday(new Date());

// Date extension methods are also typed
const result: string = new Date().format('MM/dd/yyyy');
const tomorrow: Date = new Date().addDays(1);
const isTodayExt: boolean = new Date().isToday();
```

**Type Exports:**
```typescript
// DateExtensionMethod type
type Method = DateExtensionMethod;
// 'format' | 'addDays' | 'addBusinessDays' | 'isToday'
```

---

## DevExtreme Integration

This utility intelligently leverages DevExtreme for formatting when available:

**With DevExtreme (SPFx projects):**
- Uses DevExtreme's powerful locale-aware formatting
- Supports all DevExtreme predefined formats
- Full internationalization support
- Culture-specific date/time formatting

**Without DevExtreme (standalone):**
- Falls back to lightweight custom implementation
- Supports all common format patterns
- Zero external dependencies
- Works in any JavaScript environment

**This makes the utility flexible and portable across different environments!**

---

## Related Utilities

- **[StringUtils](../stringUtils/README.md)** - String manipulation utilities
- **[ListItemHelper](../listItemHelper/README.md)** - SharePoint field extraction
- **[PermissionHelper](../permissionHelper/README.md)** - Permission validation

---

## Browser Compatibility

- ✅ ES5 compatible (IE11+)
- ✅ SharePoint Framework 1.21.1+
- ✅ Modern browsers (Chrome, Edge, Firefox, Safari)
- ✅ Works with and without DevExtreme

---

## License

Part of [SPFx Toolkit](../../../README.md) - MIT License

---

**Last Updated:** November 2025
