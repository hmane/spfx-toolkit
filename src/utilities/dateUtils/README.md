# DateUtils Utility 📅

ES5-compatible date manipulation extensions and utilities for SharePoint Framework (SPFx) applications.

## Features

- 📆 **Date Extensions** - Enhanced Date methods for ES5 environments  
- 🕐 **Relative Time** - Display "2 hours ago", "3 days from now"
- 📝 **Formatting** - Format dates for display and SharePoint
- ⏰ **Calculations** - Add/subtract days, weeks, months
- 🌐 **Locale Support** - Culture-aware formatting
- ⚡ **Performance** - Lightweight and efficient
- 🎯 **TypeScript** - Full type definitions

## Installation

```bash
npm install spfx-toolkit
```

## Quick Start

```typescript
import { DateUtils } from 'spfx-toolkit/lib/utilities/dateUtils';

// Use utility functions
const formatted = DateUtils.formatDate(new Date(), 'MM/DD/YYYY');
const relative = DateUtils.getRelativeTime(new Date(2025, 0, 1));
// "2 months ago"

const future = DateUtils.addDays(new Date(), 7);
const isSame = DateUtils.isSameDay(date1, date2);

// Or use date extensions
import 'spfx-toolkit/lib/utilities/dateUtils';

const formatted = new Date().format('MM/DD/YYYY');
const tomorrow = new Date().addDays(1);
const isToday = new Date().isToday();
```

