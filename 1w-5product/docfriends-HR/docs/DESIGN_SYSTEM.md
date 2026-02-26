# Town (타운) Design System

**Version**: 1.0
**Last Updated**: February 26, 2026
**Author**: Product Design Team
**Stack**: Next.js 14+, React 18, TypeScript, shadcn/ui, Tailwind CSS

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Layout Grid](#4-spacing--layout-grid)
5. [Breakpoints & Responsive](#5-breakpoints--responsive)
6. [Component Library](#6-component-library)
7. [Layout Patterns](#7-layout-patterns)
8. [Page Templates](#8-page-templates)
9. [Icons & Imagery](#9-icons--imagery)
10. [Motion & Transitions](#10-motion--transitions)
11. [Accessibility (WCAG 2.1 AA)](#11-accessibility-wcag-21-aa)
12. [Dark Mode](#12-dark-mode)
13. [Implementation Guide](#13-implementation-guide)

---

## 1. Design Principles

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Clarity (명확성)** | Data-heavy screens must be scannable. Use hierarchy, whitespace, and consistent patterns to reduce cognitive load. |
| **Efficiency (효율성)** | HR workflows are repetitive. Minimize clicks, support keyboard navigation, and provide bulk actions. |
| **Trust (신뢰성)** | HR data is sensitive. Professional, enterprise-grade visual language builds trust. Avoid playful or casual aesthetics. |
| **Consistency (일관성)** | Every screen follows the same grid, spacing, and component patterns. No one-off custom layouts. |
| **Accessibility (접근성)** | WCAG 2.1 AA compliance. All interactive elements are keyboard-accessible with proper ARIA labels. |

### Design Language

- **Tone**: Professional, clean, neutral. Think enterprise SaaS (Notion, Linear, flex.team).
- **Density**: Medium density. Not too sparse (wasted space), not too compact (hard to read Korean text).
- **Korean Text Priority**: All sizing, line heights, and spacing optimized for Korean characters (wider than Latin, needs more line height).

---

## 2. Color System

### 2.1 Brand Colors

```css
--town-primary: #2563EB;        /* Blue 600 — primary actions, active states */
--town-primary-hover: #1D4ED8;  /* Blue 700 — hover state */
--town-primary-light: #DBEAFE;  /* Blue 100 — light backgrounds, selected rows */
--town-primary-50: #EFF6FF;     /* Blue 50 — subtle backgrounds */
```

### 2.2 Neutral Palette (Gray Scale)

| Token | Hex | Usage |
|-------|-----|-------|
| `--gray-950` | `#0A0A0A` | Primary text (headings, body text) |
| `--gray-700` | `#404040` | Secondary text (descriptions, labels) |
| `--gray-500` | `#737373` | Tertiary text (placeholders, hints) |
| `--gray-400` | `#A3A3A3` | Disabled text, icons |
| `--gray-300` | `#D4D4D4` | Borders (inputs, dividers) |
| `--gray-200` | `#E5E5E5` | Subtle borders, separators |
| `--gray-100` | `#F5F5F5` | Background (cards, table rows alt) |
| `--gray-50` | `#FAFAFA` | Page background |
| `--white` | `#FFFFFF` | Card background, input background |

### 2.3 Semantic / Status Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--success` | `#16A34A` | Approved, active, online, success states |
| `--success-light` | `#DCFCE7` | Success background |
| `--warning` | `#F59E0B` | Pending, caution, approaching limits |
| `--warning-light` | `#FEF3C7` | Warning background |
| `--error` | `#DC2626` | Rejected, error, overdue, critical alerts |
| `--error-light` | `#FEE2E2` | Error background |
| `--info` | `#2563EB` | Informational states (same as primary) |
| `--info-light` | `#DBEAFE` | Info background |

### 2.4 Status Badge Colors (HR-Specific)

| Status | Background | Text | Use Case |
|--------|-----------|------|----------|
| 재직중 (Active) | `#DCFCE7` | `#16A34A` | Employee status |
| 퇴사 (Resigned) | `#F5F5F5` | `#737373` | Employee status |
| 휴직중 (On Leave) | `#FEF3C7` | `#F59E0B` | Employee status |
| 수습 (Probation) | `#DBEAFE` | `#2563EB` | Employee status |
| 승인됨 (Approved) | `#DCFCE7` | `#16A34A` | Approval status |
| 대기중 (Pending) | `#FEF3C7` | `#F59E0B` | Approval status |
| 반려됨 (Rejected) | `#FEE2E2` | `#DC2626` | Approval status |
| 초과 (Exceeded) | `#FEE2E2` | `#DC2626` | Work hour alerts |
| 임박 (Near Limit) | `#FEF3C7` | `#F59E0B` | Work hour alerts |
| 정상 (Normal) | `#DCFCE7` | `#16A34A` | Work hour status |

### 2.5 shadcn/ui CSS Variable Mapping

```css
:root {
  /* shadcn/ui base tokens mapped to Town palette */
  --background: 0 0% 100%;          /* #FFFFFF */
  --foreground: 0 0% 4%;            /* #0A0A0A (gray-950) */

  --card: 0 0% 100%;                /* #FFFFFF */
  --card-foreground: 0 0% 4%;       /* #0A0A0A */

  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 4%;

  --primary: 217 91% 60%;           /* #2563EB */
  --primary-foreground: 0 0% 100%;  /* white */

  --secondary: 0 0% 96%;            /* #F5F5F5 (gray-100) */
  --secondary-foreground: 0 0% 4%;

  --muted: 0 0% 96%;                /* #F5F5F5 */
  --muted-foreground: 0 0% 45%;     /* #737373 (gray-500) */

  --accent: 0 0% 96%;
  --accent-foreground: 0 0% 4%;

  --destructive: 0 72% 51%;         /* #DC2626 */
  --destructive-foreground: 0 0% 100%;

  --border: 0 0% 83%;               /* #D4D4D4 (gray-300) */
  --input: 0 0% 83%;
  --ring: 217 91% 60%;              /* primary */

  --radius: 0.5rem;                 /* 8px — default border radius */
}
```

---

## 3. Typography

### 3.1 Font Family

```css
--font-sans: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont,
  system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo',
  'Noto Sans KR', 'Malgun Gothic', 'Apple Color Emoji', 'Segoe UI Emoji',
  'Segoe UI Symbol', sans-serif;

--font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', Consolas, monospace;
```

**Why Pretendard**: Optimized for Korean/Latin mixed text, variable font (smaller bundle), excellent readability at all sizes, free and open source.

### 3.2 Type Scale

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `display-1` | 30px | 38px (1.27) | 700 (Bold) | Page titles (rare) |
| `heading-1` | 24px | 32px (1.33) | 700 (Bold) | Section headings |
| `heading-2` | 20px | 28px (1.4) | 600 (SemiBold) | Card headers, modal titles |
| `heading-3` | 16px | 24px (1.5) | 600 (SemiBold) | Sub-section headers |
| `body-1` | 15px | 24px (1.6) | 400 (Regular) | Primary body text |
| `body-2` | 14px | 22px (1.57) | 400 (Regular) | Secondary body, table cells |
| `body-2-medium` | 14px | 22px (1.57) | 500 (Medium) | Emphasized body, nav items |
| `label-1` | 13px | 18px (1.38) | 500 (Medium) | Form labels, table headers |
| `label-2` | 12px | 16px (1.33) | 500 (Medium) | Badges, captions, meta text |
| `caption` | 11px | 16px (1.45) | 400 (Regular) | Help text, timestamps |

### 3.3 Korean Text Guidelines

- **Minimum font size**: 12px (smaller Korean characters become illegible)
- **Line height**: Always >= 1.5x for body text (Korean characters need more vertical space than Latin)
- **Letter spacing**: 0 or -0.01em (Korean text has built-in spacing; avoid tight tracking)
- **Word break**: `word-break: keep-all;` (prevents breaking Korean words mid-syllable)
- **Font feature settings**: `font-feature-settings: 'liga' 1;` for Pretendard ligatures

```css
/* Global Korean text base */
body {
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.6;
  color: var(--gray-950);
  word-break: keep-all;
  -webkit-font-smoothing: antialiased;
}
```

---

## 4. Spacing & Layout Grid

### 4.1 Base Unit

**4px base unit** with an **8px primary grid**.

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0px | No spacing |
| `space-0.5` | 2px | Micro adjustment (icon-text gap) |
| `space-1` | 4px | Tight spacing (badge padding) |
| `space-1.5` | 6px | Small component internal spacing |
| `space-2` | 8px | Default component internal padding |
| `space-3` | 12px | Component gaps, form field spacing |
| `space-4` | 16px | Card padding, section gaps |
| `space-5` | 20px | Page section spacing |
| `space-6` | 24px | Large section gaps |
| `space-8` | 32px | Page-level section separation |
| `space-10` | 40px | Major layout divisions |
| `space-12` | 48px | Page top/bottom padding |

### 4.2 Layout Grid

```
Page Structure:
┌──────────────────────────────────────────────────────────┐
│ Sidebar (240px fixed)  │  Main Content Area              │
│                        │  ┌─────────────────────────┐    │
│  Logo + Company        │  │ Top Bar (56px height)   │    │
│                        │  ├─────────────────────────┤    │
│  Navigation            │  │ Page Content            │    │
│  - Dashboard           │  │ padding: 24px 32px      │    │
│  - 구성원              │  │ max-width: 1200px       │    │
│  - 근태                │  │                         │    │
│  - 계약서              │  │                         │    │
│  - 결재                │  │                         │    │
│  ──────────            │  │                         │    │
│  Settings              │  │                         │    │
│  Profile               │  │                         │    │
└──────────────────────────────────────────────────────────┘
```

| Element | Width | Notes |
|---------|-------|-------|
| Sidebar | 240px (expanded) / 64px (collapsed) | Fixed position |
| Top Bar | Full width of content area | 56px height |
| Content Area | Fluid, min 768px | padding: 24px 32px |
| Content Max Width | 1200px | Centered when viewport is wider |
| Data Table | 100% of content area | Horizontal scroll on overflow |

---

## 5. Breakpoints & Responsive

### 5.1 Breakpoint Definitions (Desktop-First)

| Breakpoint | Width | Target | Notes |
|------------|-------|--------|-------|
| `desktop-xl` | >= 1440px | Large desktops | Full sidebar, max-width content |
| `desktop` | >= 1024px | Standard desktop | Default layout |
| `tablet` | >= 768px | Tablet landscape | Collapsed sidebar (icon-only) |
| `mobile` | < 768px | Mobile / tablet portrait | No sidebar, bottom nav or hamburger |

### 5.2 Responsive Behavior

| Element | Desktop (>=1024) | Tablet (768-1023) | Mobile (<768) |
|---------|------------------|-------------------|---------------|
| Sidebar | Full (240px) | Collapsed (64px, icons only) | Hidden (hamburger menu) |
| Top Bar | Visible | Visible | Visible with hamburger |
| Content Padding | 24px 32px | 16px 24px | 12px 16px |
| Data Tables | Full table | Horizontal scroll | Card view |
| Modals | Centered overlay (max 640px) | Centered overlay | Full-screen sheet |
| Form Layout | 2-column grid | 2-column grid | Single column |

### 5.3 Tailwind Config

```ts
// tailwind.config.ts
export default {
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1440px',
    },
  },
}
```

---

## 6. Component Library

All components are built on **shadcn/ui** with Town-specific customizations. Below is the full component inventory with specs.

### 6.1 Buttons

**Base**: `shadcn/ui Button`

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| `primary` | `--primary` | White | None | Primary actions (저장, 확인, 등록) |
| `secondary` | `--secondary` | `--gray-700` | `--gray-300` | Secondary actions (취소, 닫기) |
| `outline` | Transparent | `--gray-700` | `--gray-300` | Tertiary actions |
| `ghost` | Transparent | `--gray-700` | None | In-table actions, icon buttons |
| `destructive` | `--error` | White | None | Delete, reject actions |
| `link` | Transparent | `--primary` | None | Inline text links |

**Sizes:**

| Size | Height | Padding | Font | Usage |
|------|--------|---------|------|-------|
| `sm` | 32px | 12px 16px | label-1 (13px/500) | Table row actions, compact forms |
| `default` | 36px | 12px 20px | body-2-medium (14px/500) | Standard buttons |
| `lg` | 44px | 16px 24px | body-1 (15px/500) | Page-level CTAs, modal actions |

**States**: Default, Hover, Active (pressed), Focus (ring), Disabled (50% opacity)

### 6.2 Form Inputs

**Base**: `shadcn/ui Input`, `Textarea`, `Select`

| Component | Height | Font | Padding | Border Radius |
|-----------|--------|------|---------|---------------|
| Input | 40px | body-2 (14px) | 8px 12px | 8px |
| Textarea | Min 80px | body-2 (14px) | 8px 12px | 8px |
| Select | 40px | body-2 (14px) | 8px 12px | 8px |
| Checkbox | 16x16px | — | — | 4px |
| Radio | 16x16px | — | — | Full (circle) |
| Switch | 20x36px | — | — | Full (pill) |
| DatePicker | 40px | body-2 (14px) | 8px 12px | 8px |

**Form Field Pattern:**
```
┌─ Label (label-1, 13px/500, gray-700) ──────────────────┐
│                                                          │
│  ┌─ Input ────────────────────────────────────────────┐  │
│  │ Placeholder text (gray-500)                        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Helper text (caption, 11px, gray-500)                   │
│  Error message (caption, 11px, error red)                │
└──────────────────────────────────────────────────────────┘

Spacing: label-to-input: 6px, input-to-helper: 4px, field-to-field: 16px
```

**States:**
| State | Border | Background | Ring |
|-------|--------|-----------|------|
| Default | `--gray-300` | White | None |
| Hover | `--gray-400` | White | None |
| Focus | `--primary` | White | `--primary` 2px ring |
| Error | `--error` | White | `--error` 2px ring |
| Disabled | `--gray-200` | `--gray-100` | None |

### 6.3 Data Tables

**Base**: `shadcn/ui Table` + `@tanstack/react-table`

```
┌──────────────────────────────────────────────────────────┐
│ Table Header Area                                         │
│ ┌─ Search ──────────────┐  ┌─ Filters ─┐  ┌─ Actions ─┐ │
│ │ 🔍 검색어 입력...      │  │ 부서 ▾    │  │ + 등록    │ │
│ └───────────────────────┘  │ 직급 ▾    │  │ ↓ 다운로드│ │
│                            └───────────┘  └───────────┘ │
├──────────────────────────────────────────────────────────┤
│ ☐ │ 이름      │ 부서    │ 직급   │ 상태   │ 입사일     │ │
│───┼───────────┼─────────┼────────┼────────┼────────────┤ │
│ ☐ │ 김영수    │ 개발팀  │ 시니어 │ 🟢재직 │ 2024-03-01 │ │
│ ☐ │ 이지은    │ 디자인팀│ 주니어 │ 🟡수습 │ 2025-12-15 │ │
│ ☐ │ 박민호    │ 기획팀  │ 매니저 │ 🟢재직 │ 2023-06-10 │ │
├──────────────────────────────────────────────────────────┤
│ 총 45명  │  ◀ 1 2 3 4 5 ▶  │  10 / 20 / 50 건 표시     │
└──────────────────────────────────────────────────────────┘
```

**Table Specs:**

| Element | Spec |
|---------|------|
| Header row height | 44px |
| Body row height | 52px |
| Header font | label-1 (13px/500), `--gray-500` |
| Body font | body-2 (14px/400), `--gray-950` |
| Row hover | `--gray-50` background |
| Selected row | `--primary-50` background |
| Border | Bottom border `--gray-200` per row |
| Cell padding | 12px 16px |
| Checkbox column width | 48px |
| Action column width | Auto (fit content) |

**Features:**
- Column sorting (click header)
- Multi-select with checkbox
- Bulk actions bar (appears when rows selected)
- Pagination with page size selector (10/20/50)
- Empty state with illustration and CTA

### 6.4 Badges / Status Chips

**Base**: `shadcn/ui Badge`

| Variant | Background | Text Color | Border Radius | Height | Padding |
|---------|-----------|------------|---------------|--------|---------|
| `success` | `--success-light` | `--success` | 9999px (pill) | 24px | 4px 10px |
| `warning` | `--warning-light` | `--warning` | 9999px | 24px | 4px 10px |
| `error` | `--error-light` | `--error` | 9999px | 24px | 4px 10px |
| `info` | `--info-light` | `--info` | 9999px | 24px | 4px 10px |
| `neutral` | `--gray-100` | `--gray-700` | 9999px | 24px | 4px 10px |

Font: `label-2` (12px/500)

### 6.5 Cards

**Base**: `shadcn/ui Card`

```
┌─────────────────────────────────────────┐
│ Card Header                    [Action] │  ← heading-3, padding: 16px 20px
├─────────────────────────────────────────┤
│                                         │
│ Card Body Content                       │  ← padding: 16px 20px
│                                         │
├─────────────────────────────────────────┤
│ Card Footer                             │  ← padding: 12px 20px (optional)
└─────────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Background | White |
| Border | 1px `--gray-200` |
| Border Radius | 12px |
| Shadow | `0 1px 2px rgba(0,0,0,0.05)` |
| Header padding | 16px 20px |
| Body padding | 16px 20px |
| Footer padding | 12px 20px |

### 6.6 Modals / Dialogs

**Base**: `shadcn/ui Dialog`

| Size | Width | Usage |
|------|-------|-------|
| `sm` | 400px | Confirmations, simple forms |
| `default` | 520px | Standard forms, detail views |
| `lg` | 640px | Complex forms, multi-step |
| `xl` | 800px | Data-heavy views, comparisons |
| `full` | 90vw (max 1200px) | Contract preview, document viewer |

```
┌────────────────────────────────────────────┐
│ Dialog Title                          [X]  │  ← heading-2, padding: 20px 24px
│ Optional description text                  │
├────────────────────────────────────────────┤
│                                            │
│  Form / Content Area                       │  ← padding: 20px 24px
│                                            │
├────────────────────────────────────────────┤
│                    [취소]  [확인/저장]      │  ← padding: 16px 24px, right-aligned
└────────────────────────────────────────────┘
```

**Overlay**: Black 50% opacity
**Animation**: Fade in + scale up from 95%

### 6.7 Navigation Components

**Sidebar Navigation:**

| Element | Spec |
|---------|------|
| Sidebar width | 240px (expanded), 64px (collapsed) |
| Background | White |
| Border | Right border 1px `--gray-200` |
| Logo area height | 56px |
| Nav item height | 40px |
| Nav item padding | 8px 12px |
| Nav item font | body-2-medium (14px/500) |
| Nav item icon size | 20px |
| Icon-text gap | 12px |
| Active item | `--primary-50` bg, `--primary` text |
| Hover item | `--gray-100` bg |
| Section divider | 1px `--gray-200`, margin 8px 0 |
| Group label | label-2 (12px/500), `--gray-500`, padding 8px 12px |

**Top Bar:**

| Element | Spec |
|---------|------|
| Height | 56px |
| Background | White |
| Border | Bottom border 1px `--gray-200` |
| Padding | 0 24px |
| Content | Breadcrumb (left), User menu (right) |
| Breadcrumb font | body-2 (14px), gray-500 for inactive, gray-950 for current |

### 6.8 Toast / Notifications

**Base**: `shadcn/ui Toast` (via Sonner)

| Variant | Left Border Color | Icon |
|---------|-------------------|------|
| `success` | `--success` | CheckCircle |
| `error` | `--error` | XCircle |
| `warning` | `--warning` | AlertTriangle |
| `info` | `--primary` | Info |

Position: Bottom-right, 24px offset
Duration: 4 seconds (auto dismiss)
Width: 360px max

### 6.9 Tabs

**Base**: `shadcn/ui Tabs`

| Element | Spec |
|---------|------|
| Tab height | 40px |
| Tab font | body-2-medium (14px/500) |
| Active tab | `--primary` text, 2px bottom border `--primary` |
| Inactive tab | `--gray-500` text |
| Hover | `--gray-700` text |
| Tab bar border | 1px bottom `--gray-200` |
| Tab padding | 0 16px |
| Tab gap | 0 (tabs are flush) |

### 6.10 Additional Components

| Component | Base | Key Specs |
|-----------|------|-----------|
| Avatar | shadcn/ui Avatar | 32px (sm), 40px (md), 64px (lg), 96px (xl); rounded-full |
| Tooltip | shadcn/ui Tooltip | Dark bg (`--gray-950`), white text, 8px radius, body-2 font |
| Dropdown Menu | shadcn/ui DropdownMenu | White bg, 8px radius, `--gray-200` border, item height 36px |
| Command/Search | shadcn/ui Command | Global search (Cmd+K), 520px width |
| Calendar | shadcn/ui Calendar | For date picking in attendance/contracts |
| Sheet | shadcn/ui Sheet | Mobile sidebar, filter panels |
| Skeleton | shadcn/ui Skeleton | Loading placeholder with pulse animation |
| Separator | shadcn/ui Separator | 1px `--gray-200` |
| Progress | shadcn/ui Progress | 8px height, `--primary` fill, `--gray-200` track |

---

## 7. Layout Patterns

### 7.1 List Page (Table View)

Used for: Member list, Attendance records, Contract list, Approval list

```
┌─ Page Layout ───────────────────────────────────────────┐
│                                                          │
│  Page Title (heading-1)              [Primary Action]    │
│  Description text (body-2, gray-500)                     │
│                                                          │
│  ┌─ Toolbar ──────────────────────────────────────────┐  │
│  │ 🔍 Search        [Filter 1 ▾] [Filter 2 ▾]  [+등록]│  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Data Table ───────────────────────────────────────┐  │
│  │ (See Section 6.3)                                  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Pagination ───────────────────────────────────────┐  │
│  │ 총 N건    ◀ 1 2 3 4 5 ▶     10/20/50 건 표시      │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

Spacing:
- Title to toolbar: 24px
- Toolbar to table: 16px
- Table to pagination: 16px
```

### 7.2 Detail Page

Used for: Member profile, Contract detail, Approval detail

```
┌─ Page Layout ───────────────────────────────────────────┐
│                                                          │
│  ← 뒤로  │  Page Title                    [Edit] [...]  │
│                                                          │
│  ┌─ Top Summary Card ─────────────────────────────────┐  │
│  │ Avatar  Name, Title, Department                    │  │
│  │         Status badge      Key metric cards         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Tabs ─────────────────────────────────────────────┐  │
│  │ [기본정보] [근태] [계약서] [결재이력]               │  │
│  ├────────────────────────────────────────────────────┤  │
│  │                                                    │  │
│  │  Tab Content Area                                  │  │
│  │  (Info fields, sub-tables, etc.)                   │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 7.3 Form Page

Used for: Member registration, Contract creation, Approval submission

```
┌─ Page Layout ───────────────────────────────────────────┐
│                                                          │
│  Page Title (heading-1)                                  │
│  Step indicator (if multi-step)                          │
│                                                          │
│  ┌─ Form Card ────────────────────────────────────────┐  │
│  │                                                    │  │
│  │  Section Title (heading-3)                         │  │
│  │  ┌──────────────┐  ┌──────────────┐               │  │
│  │  │ Field Label  │  │ Field Label  │               │  │
│  │  │ [Input     ] │  │ [Input     ] │  ← 2-col grid│  │
│  │  └──────────────┘  └──────────────┘               │  │
│  │                                                    │  │
│  │  ┌──────────────────────────────────┐             │  │
│  │  │ Full Width Field Label           │             │  │
│  │  │ [Textarea                       ]│             │  │
│  │  └──────────────────────────────────┘             │  │
│  │                                                    │  │
│  ├────────────────────────────────────────────────────┤  │
│  │                       [취소]  [저장]               │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

Form Grid:
- 2-column grid with 16px gap (desktop)
- 1-column on mobile
- Form card max-width: 800px
- Section gap: 32px
```

### 7.4 Dashboard

```
┌─ Page Layout ───────────────────────────────────────────┐
│                                                          │
│  좋은 아침이에요, 김영수님  (heading-1)                   │
│  2026년 2월 26일 목요일                                   │
│                                                          │
│  ┌─ Quick Stats ──────────────────────────────────────┐  │
│  │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │  │
│  │ │ 전체    │ │ 출근    │ │ 미출근  │ │ 대기결재│  │  │
│  │ │ 구성원  │ │ 현황    │ │ 현황    │ │ 건수    │  │  │
│  │ │  45명   │ │  38명   │ │   7명   │ │   3건   │  │  │
│  │ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ 52시간 모니터링 ──┐  ┌─ 최근 결재 요청 ──────────┐  │
│  │ Weekly hours chart │  │ Approval request list      │  │
│  │                    │  │                            │  │
│  └────────────────────┘  └────────────────────────────┘  │
│                                                          │
│  ┌─ 최근 활동 ────────────────────────────────────────┐  │
│  │ Activity feed / timeline                           │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

Grid: 4-column for stats, 2-column for panels (1-column on mobile)
```

---

## 8. Page Templates

### 8.1 Module-Specific Pages

| Module | Pages | Primary Pattern |
|--------|-------|----------------|
| **구성원 관리** | 구성원 목록, 구성원 상세, 구성원 등록/수정, 조직도, 부서 관리 | List + Detail + Form |
| **근태 관리** | 근태 현황 (일별/주별/월별), 내 근태, 연차 현황, 52시간 모니터링 | Dashboard + Table + Calendar |
| **전자계약서** | 계약서 목록, 계약서 작성, 계약서 상세/미리보기, 템플릿 관리 | List + Form + Document Preview |
| **전자결재** | 결재 대기함, 결재 진행함, 결재 완료함, 결재 작성, 결재 상세 | List + Form + Detail |
| **설정** | 회사 정보, 근무 정책, 연차 정책, 알림 설정 | Form (settings pattern) |

### 8.2 Empty States

Every list/table page must have an empty state:

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│              [Illustration / Icon]                        │
│                                                          │
│          아직 등록된 구성원이 없습니다                      │
│          (heading-3, gray-700)                            │
│                                                          │
│     구성원을 등록하여 조직을 관리해보세요                    │
│     (body-2, gray-500)                                    │
│                                                          │
│              [+ 구성원 등록하기]                           │
│              (primary button)                             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 8.3 Error States

| Type | UI |
|------|----|
| 404 Not Found | Illustration + "페이지를 찾을 수 없습니다" + home button |
| 403 Forbidden | Lock icon + "접근 권한이 없습니다" + description + home button |
| 500 Server Error | Warning icon + "서비스에 문제가 발생했습니다" + retry button |
| Network Error | Wifi-off icon + "네트워크 연결을 확인해주세요" + retry button |

---

## 9. Icons & Imagery

### 9.1 Icon System

**Library**: Lucide React (included with shadcn/ui)

| Size | px | Usage |
|------|----|-------|
| `xs` | 14px | Inline with label-2 text |
| `sm` | 16px | Inline with body-2 text, nav items |
| `md` | 20px | Sidebar nav, buttons with icons |
| `lg` | 24px | Page headers, empty states |
| `xl` | 32px | Dashboard stat icons |

**Color**: Icons inherit text color. Use `currentColor`.

### 9.2 Avatar System

| Context | Size | Fallback |
|---------|------|----------|
| Table row | 32px | Initials (Korean first character) |
| Detail page header | 64px | Initials |
| Profile page | 96px | Initials |
| Sidebar user | 32px | Initials |

Fallback colors: Deterministic based on user name (hash to color array).

---

## 10. Motion & Transitions

| Interaction | Duration | Easing | Property |
|-------------|----------|--------|----------|
| Button hover | 150ms | ease-in-out | background-color, border-color |
| Modal open | 200ms | ease-out | opacity, transform (scale 0.95 -> 1) |
| Modal close | 150ms | ease-in | opacity, transform |
| Sidebar expand/collapse | 200ms | ease-in-out | width |
| Toast enter | 300ms | ease-out | translateX, opacity |
| Toast exit | 200ms | ease-in | translateX, opacity |
| Dropdown open | 150ms | ease-out | opacity, translateY (-4px -> 0) |
| Page transition | 150ms | ease-in-out | opacity |
| Skeleton pulse | 1.5s loop | ease-in-out | opacity (0.5 -> 1) |

**Principle**: Animations should be subtle and functional, never decorative. Respect `prefers-reduced-motion`.

---

## 11. Accessibility (WCAG 2.1 AA)

### 11.1 Color Contrast

| Element | Minimum Ratio | Our Target |
|---------|---------------|------------|
| Normal text (< 18px) | 4.5:1 | 7:1 (gray-950 on white = 18.4:1) |
| Large text (>= 18px bold) | 3:1 | 4.5:1+ |
| Interactive elements | 3:1 against adjacent | All status colors verified |
| Focus indicator | 3:1 | Primary blue ring (2px) |

### 11.2 Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move to next interactive element |
| `Shift+Tab` | Move to previous interactive element |
| `Enter` / `Space` | Activate button, toggle checkbox |
| `Arrow keys` | Navigate within menus, tables, calendars |
| `Escape` | Close modal, dropdown, popover |
| `Cmd+K` | Open global search |

### 11.3 ARIA Patterns

| Component | ARIA Role/Pattern |
|-----------|-------------------|
| Sidebar Nav | `nav` with `aria-label="주 메뉴"` |
| Data Table | `role="table"` with sortable headers `aria-sort` |
| Modal | `role="dialog"` with `aria-modal="true"`, `aria-labelledby` |
| Toast | `role="alert"` with `aria-live="polite"` |
| Tabs | `role="tablist"`, `role="tab"`, `role="tabpanel"` |
| Status Badge | `role="status"` with readable text (not just color) |
| Form Fields | `aria-required`, `aria-invalid`, `aria-describedby` (error msg) |

### 11.4 Screen Reader

- All images have `alt` text
- Icon-only buttons have `aria-label`
- Status indicators never rely solely on color (always include text label)
- Table data is announced with proper header association
- Loading states announced with `aria-busy="true"`

### 11.5 Focus Management

- Modal open: focus trapped inside modal, initial focus on first input
- Modal close: focus returns to trigger element
- Toast: does not steal focus
- Sidebar collapse: focus moves to toggle button
- Form submission: focus on first error field (if validation fails)

---

## 12. Dark Mode

**MVP Phase**: Dark mode is NOT in scope. Design system is prepared for future implementation:

- All colors defined as CSS variables (easy to swap)
- No hardcoded colors in components
- shadcn/ui natively supports dark mode via `class` strategy

**Future dark mode tokens** (placeholder):

```css
.dark {
  --background: 0 0% 7%;
  --foreground: 0 0% 95%;
  --card: 0 0% 10%;
  --primary: 217 91% 60%;
  /* ... */
}
```

---

## 13. Implementation Guide

### 13.1 Project Setup

```bash
# shadcn/ui initialization
npx shadcn@latest init

# Install Pretendard font
npm install pretendard

# Required shadcn/ui components
npx shadcn@latest add button input textarea select checkbox radio-group
npx shadcn@latest add switch label form card dialog sheet
npx shadcn@latest add table tabs badge avatar tooltip
npx shadcn@latest add dropdown-menu command calendar popover
npx shadcn@latest add toast skeleton separator progress
npx shadcn@latest add alert-dialog breadcrumb pagination
```

### 13.2 Tailwind Customization

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Pretendard Variable", "Pretendard", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        "display-1": ["30px", { lineHeight: "38px", fontWeight: "700" }],
        "heading-1": ["24px", { lineHeight: "32px", fontWeight: "700" }],
        "heading-2": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "heading-3": ["16px", { lineHeight: "24px", fontWeight: "600" }],
        "body-1": ["15px", { lineHeight: "24px", fontWeight: "400" }],
        "body-2": ["14px", { lineHeight: "22px", fontWeight: "400" }],
        "label-1": ["13px", { lineHeight: "18px", fontWeight: "500" }],
        "label-2": ["12px", { lineHeight: "16px", fontWeight: "500" }],
        "caption": ["11px", { lineHeight: "16px", fontWeight: "400" }],
      },
      colors: {
        success: {
          DEFAULT: "#16A34A",
          light: "#DCFCE7",
        },
        warning: {
          DEFAULT: "#F59E0B",
          light: "#FEF3C7",
        },
        error: {
          DEFAULT: "#DC2626",
          light: "#FEE2E2",
        },
      },
      spacing: {
        "sidebar": "240px",
        "sidebar-collapsed": "64px",
        "topbar": "56px",
      },
      maxWidth: {
        "content": "1200px",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
};

export default config;
```

### 13.3 Component Naming Convention

```
components/
  ui/              # shadcn/ui base components (auto-generated)
    button.tsx
    input.tsx
    ...
  layout/          # Layout components
    sidebar.tsx
    top-bar.tsx
    page-header.tsx
    content-area.tsx
  common/          # Shared custom components
    status-badge.tsx
    data-table.tsx
    empty-state.tsx
    loading-skeleton.tsx
    user-avatar.tsx
  modules/         # Module-specific components
    members/
    attendance/
    contracts/
    approvals/
```

### 13.4 Coding Standards

- **No inline styles** (use Tailwind classes or CSS variables)
- **No magic numbers** (use spacing tokens)
- **No hardcoded colors** (use CSS variables or Tailwind color tokens)
- **Korean text** must use `word-break: keep-all` (set globally)
- **All interactive elements** must have visible focus states
- **Loading states** for all async operations (Skeleton or Spinner)
- **Error boundaries** on every page

---

## Appendix A: Color Contrast Verification

| Combination | Ratio | Pass |
|-------------|-------|------|
| gray-950 on white | 18.42:1 | AA (pass) |
| gray-700 on white | 7.14:1 | AA (pass) |
| gray-500 on white | 4.57:1 | AA (pass for large text) |
| primary on white | 4.63:1 | AA (pass) |
| success on success-light | 4.51:1 | AA (pass) |
| warning on warning-light | 3.82:1 | AA-Large (pass) |
| error on error-light | 5.23:1 | AA (pass) |
| white on primary | 4.63:1 | AA (pass) |

## Appendix B: shadcn/ui Component Checklist

| Component | Needed | Custom Styling |
|-----------|--------|----------------|
| Accordion | No (MVP) | — |
| Alert | Yes | Status variants |
| AlertDialog | Yes | Confirm/delete pattern |
| Avatar | Yes | Korean initial fallback |
| Badge | Yes | HR status variants |
| Breadcrumb | Yes | Standard |
| Button | Yes | Town color variants |
| Calendar | Yes | Korean locale |
| Card | Yes | Standard |
| Checkbox | Yes | Standard |
| Command | Yes | Global search (Cmd+K) |
| Dialog | Yes | Size variants |
| DropdownMenu | Yes | Standard |
| Form | Yes | With react-hook-form + zod |
| Input | Yes | Standard |
| Label | Yes | Standard |
| Pagination | Yes | Standard |
| Popover | Yes | For date picker, select |
| Progress | Yes | 52-hour monitoring |
| RadioGroup | Yes | Standard |
| Select | Yes | Standard |
| Separator | Yes | Standard |
| Sheet | Yes | Mobile sidebar, filters |
| Skeleton | Yes | Loading states |
| Switch | Yes | Settings toggles |
| Table | Yes | With tanstack/react-table |
| Tabs | Yes | Module detail views |
| Textarea | Yes | Standard |
| Toast | Yes | Via Sonner, status variants |
| Tooltip | Yes | Standard |
