# Design / VERIFICATION.md

This document defines the **required verification procedures** after design implementation.

---

## Table of Contents

1. [Token Verification (Figma ↔ Design System)](#1-token-verification-figma--design-system)
2. [Design System Compliance Verification](#2-design-system-compliance-verification) ⭐
3. [Visual Verification Loop (Figma Based)](#3-visual-verification-loop-figma-based)
   - [3-0. Verification Principles (CRITICAL)](#️-3-0-verification-principles-critical) ⚠️ **Must Read**
   - [3-1. Comparison Procedure](#3-1-comparison-procedure)
   - [3-2. Systematic Comparison Checklist](#3-2-systematic-comparison-checklist)
     - [Step 0: Required During Implementation](#️-step-0-required-during-implementation-check-before-coding) 🆕 **Pre-implementation Check**
   - [3-3. Iteration Rules](#3-3-iteration-rules)
   - [3-4. Common Pitfalls and Solutions](#3-4-common-pitfalls-and-solutions)
   - [3-5. Verification Completion Criteria](#3-5-verification-completion-criteria)
   - [3-6. Verification Failure Prevention Guide](#3-6-verification-failure-prevention-guide-lessons-learned) 🆕
4. [Interaction Element Verification](#4-interaction-element-verification) 🆕

---

## 1. Token Verification (Figma ↔ Design System)

> **Scope:** This section is performed only in the **"Figma Design Request" workflow** (Figma → Code implementation). Not applicable for "New/Improved Screen Design Proposal" workflow.

This is to verify that tokens used in Figma design match the design system variables in the codebase.
**Comparison targets differ based on design system source selection (A/B).**

### 1-1. Comparison Target Criteria

| Source Selection | Comparison Target File | Comparison Items |
|------------------|----------------------|------------------|
| **A. Existing (internal repo)** | `_color.scss` (CSS variables), `_mixin.scss` (typography mixin), `_variables.scss` (semantic variables) | HEX ↔ CSS variables, text styles ↔ mixin |
| **B. New (package)** | Token files inside `doctalk-design-system-vue` package | HEX ↔ package token variables, text styles ↔ package typography tokens |

- When **Source B** is selected, first check if the package is installed.
  - Vue: `npm install file:../doctalk-design-system-vue` (local package, not published to npm)

### 1-2. Verification Order

- **1.** Check if MCP is connected.
  If not connected, check **CLAUDE.md > Other Guidelines > Figma console MCP Pre-connection Guide** to connect.
- **2.** Request the Figma link to inspect.
- **3.** Extract tokens from Figma — **Check both Figma Styles and Variables**.

  > **Key Note:** Figma designs can apply tokens in two ways: **Figma Variables** (`boundVariables`) and **Figma Styles** (`fillStyleId`, `textStyleId`).
  > Designs imported from libraries mostly use the **Styles** method, so checking only Variables may falsely conclude "no tokens".

  ```js
  // figma_execute token extraction code example
  // 1) Check Figma Styles (library styles)
  if (n.fillStyleId && typeof n.fillStyleId === 'string') {
    const style = await figma.getStyleByIdAsync(n.fillStyleId);
    // style.name → "Gray 600", "DG 500", etc.
  }
  if (n.textStyleId && typeof n.textStyleId === 'string') {
    const style = await figma.getStyleByIdAsync(n.textStyleId);
    // style.name → "Body2/Medium", "Label1/semiBold", etc.
  }
  // 2) Check Figma Variables (variable binding)
  if (n.fills?.[0]?.boundVariables?.color) {
    const varId = n.fills[0].boundVariables.color.id;
    const variable = await figma.variables.getVariableByIdAsync(varId);
  }
  // 3) If neither exists → Direct HEX value (style not applied)
  ```

  > **`getNodeByIdAsync` Required:** Due to `documentAccess: dynamic-page` constraint, `getNodeById` fails. Must use `await figma.getNodeByIdAsync(id)`.
  > **Symbol Type Guard Required:** `cornerRadius`, `fills`, `strokes` become symbol type when mixed values. Add `typeof value !== 'symbol'` check.
  > **`postMessage: Cannot unwrap symbol` Error:** If symbol types are included in node properties, serialization errors occur. Don't return properties like `strokes` directly, extract needed values first or wrap with `JSON.stringify`.

- **4.** Classify extraction results into 3 categories:

  | Category | Description | Example |
  |----------|-------------|---------|
  | **A. Style Applied** | Has `fillStyleId` or `textStyleId` | `Gray 600` → `#737373` |
  | **B. Variable Binding** | Has `boundVariables` | `--dg500` → `#2fd096` |
  | **C. Direct Value (Not Applied)** | HEX used directly without style or variable | `#667085` |

- **5.** **Map C (direct values) with selected design system source**.
  - **Source A** → Compare with CSS variable HEX values in internal repo `_color.scss`.
  - **Source B** → Compare with token HEX values in `doctalk-design-system-vue` package.

  | Figma HEX | Design System Variable | Semantic Variable | Match Status |
  |-----------|----------------------|-------------------|--------------|
  | `#f2f2f2` | `--gray50` | `$BgSub` | Match |
  | `#667085` | — | — | Undefined |

- **6.** Ask user based on mapping results:
  - **If matching value exists in design system** → Use that variable in code.
  - **If only approximate value exists** (e.g., `#757575` vs `--gray600: #737373`) → Request designer confirmation to unify to design system value.
    - If decided to use closest token: Use that token in code, and **update binding to that token in Figma design file** (to prevent design-code inconsistency).
  - **If undefined in design system** → Ask user how to handle:
    - `[1] Add new variable to design system` / `[2] Allow hardcoding` / `[3] Request designer confirmation`
  - If designer confirmation is needed, can visually mark unapplied nodes with red border (`strokes`) in Figma.
    - Red border must be removed after confirmation is complete.

- **7.** If waiting for designer confirmation, **do not proceed to next step.** Token verification ends only when confirmation is complete.
- **8.** After completing token verification, request to check `./CLAUDE.md` and proceed to next step.

### 1-3. Next Step After Token Verification Completion

- Proceed according to the next step procedure defined in `./CLAUDE.md`.

---

## 2. Design System Compliance Verification

> **Scope:** This section is performed in **all design workflows** (New/Improved Screen Design Proposal, Figma Design Request).

After completing design implementation, **verify** that the selected design system was used correctly.

### 2-1. Source A (Existing Internal Repo) Verification

#### Automated Verification

**Color Verification:**
```bash
# Check direct use of HEX values
grep -r "#[0-9a-fA-F]\{6\}" --include="*.vue" --include="*.tsx" --include="*.jsx" --include="*.scss" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.nuxt .

# If found, handle as follows:
# 1. Check if user approved hardcoding of that value during implementation
# 2. Approved hardcoding → Pass (not a problem)
# 3. If not approved:
#    a. Check if corresponding variable exists in _color.scss
#    b. If exists → Replace with variable
#    c. If not → Ask user: [1] Add token / [2] Use closest token / [3] Allow hardcoding
```

**Typography Verification:**
```bash
# Check direct use of font properties
grep -rE "(font-family|font-weight|font-size|line-height):" --include="*.vue" --include="*.tsx" --include="*.jsx" --include="*.scss" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.nuxt .

# Check @include usage
grep -r "@include" --include="*.vue" --include="*.tsx" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.nuxt .
```

#### Manual Verification

**Component File Check (Vue/TSX/JSX):**
- [ ] `@use '../../assets/scss/abstracts/mixin' as *;` import exists in `<style lang="scss" scoped>` block
- [ ] All text elements use `@include` (except pre-approved cases)
- [ ] All colors use CSS variables (except pre-approved hardcoding)

**SCSS File Check:**
- [ ] Only uses variables from `_color.scss`
- [ ] Only uses mixins from `_mixin.scss`
- [ ] No unapproved hardcoded HEX values

#### Verification Completion Criteria

- [ ] No unapproved direct HEX value usage (approved hardcoding allowed)
- [ ] No unapproved direct typography property usage (approved hardcoding allowed)
- [ ] Mixin import exists in Vue scoped style
- [ ] Automated verification script passes

---

### 2-2. Source B (New Package) Verification

#### Automated Verification

**Package Usage Check:**
```bash
# Check doctalk-design-system-vue package import
grep -r "from 'doctalk-design-system-vue'" --include="*.vue" --include="*.tsx" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.nuxt .

# Check package installation
npm list doctalk-design-system-vue
```

**Hardcoding Check:**
```bash
# Check direct use of HEX values
grep -r "#[0-9a-fA-F]\{6\}" --include="*.vue" --include="*.tsx" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.nuxt .

# Check direct use of font properties
grep -rE "(font-family|font-weight|font-size|line-height):" --include="*.vue" --include="*.tsx" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.nuxt .

# If found, handle as follows:
# 1. Check if user approved hardcoding of that value during implementation
# 2. Approved hardcoding → Pass (not a problem)
# 3. If not approved → Ask user: [1] Add token / [2] Use closest token / [3] Allow hardcoding
```

#### Manual Verification

**Component Usage Check:**
- [ ] Uses components provided by package
- [ ] Uses package tokens (except pre-approved hardcoding)
- [ ] Follows package design guidelines

**Tailwind Check:**
- [ ] Verify Tailwind classes are based on design system tokens (no arbitrary custom values)
- [ ] Check in browser for classes that aren't applied due to CSS safelist omission
- [ ] Verify classes not in safelist have been replaced with inline styles

**Import Statement Check:**
- [ ] Uses `import { Component } from 'doctalk-design-system-vue'` format
- [ ] No use of components/tokens outside the package

#### Verification Completion Criteria

- [ ] Package component usage confirmed
- [ ] Package token usage confirmed
- [ ] No unapproved hardcoding (approved hardcoding allowed)
- [ ] Automated verification script passes

---

### 2-3. Common Verification

**Build Verification:**
```bash
# Verify passes without build errors
npm run build
```

**Lint Verification:**
```bash
# Code style verification
npm run lint
```

**Nuxt publicPaths Verification (Test/Demo Pages):**

If you created a test page that doesn't require authentication, verify the path has been added to the `publicPaths` array in `middleware/auth.global.ts`.

```typescript
// middleware/auth.global.ts
const publicPaths = [
  '/login',
  '/reservation-auto-login',
  // ... existing paths
  '/ai-test-form-v2',      // ← Newly added test page
  '/ai-test-dashboard',    // ← Newly added test page
];
```

**Verification Procedure:**
1. List newly created page paths
2. Check `publicPaths` array in `middleware/auth.global.ts` file
3. Add missing paths
4. Test page access while logged out

**Notes:**
- Paths not in `publicPaths` will redirect to login page
- Add production pages carefully (consider security)
- Recommend removing test/demo pages before deployment or handling with environment branching

> **Lesson learned**: If you create a page and get bounced to login page when accessing → Check `publicPaths`

#### Verification Result Report

Report results to user after verification completion:

→ `Design system verification result: [Pass / Needs Modification]`

**Pass**: Move to next step
**Needs Modification**: List problems and re-verify after modification

---

## 3. Visual Verification Loop (Figma Based)

> **Scope:** This section is performed only in the **"Figma Design Request" workflow** (Figma → Code implementation). Not applicable for "New/Improved Screen Design Proposal" workflow.

After code implementation, you **must** execute the comparison-modification loop below.

### ⚠️ 3-0. Verification Principles (CRITICAL)

> **Absolute Principle: Structure-First Verification**
>
> Before checking individual properties (colors, fonts, etc.), **always verify overall layout structure first**.
> Even if properties are accurate, if structure is wrong, the design will look completely different.

**Verification Order (Must follow this order):**

```
Step 1: Structure Verification
   ├── Do parent-child relationships match?
   ├── Does child element order match?
   ├── Does layoutMode (row/column) match?
   └── Is nesting structure identical?

Step 2: Arrangement Verification
   ├── Do elements' relative positions match?
   ├── Do justify/align settings match?
   └── Is visual arrangement of elements identical?

Step 3: Property Verification
   ├── Individual values like color, font, spacing
   └── State-specific styles (hover, active, etc.)
```

**Common Mistakes:**
- ❌ "Colors match so it's done" → If structure is wrong, it's a completely different UI
- ❌ "Spacing matches so it's done" → Meaningless if element order is wrong
- ❌ "Only checking individual properties" → Missing overall layout structure mismatch

### 3-0. Preparation: Run Development Server

**Development server must be running** for visual verification.

1. Check `package.json`'s `scripts` section to identify the correct run command.
   ```bash
   cat package.json | grep -A10 '"scripts"'
   ```
2. Verify dependencies are installed.
   ```bash
   ls node_modules/.bin/nuxt 2>/dev/null && echo "OK" || echo "npm install required"
   ```
3. Run the development server.
   ```bash
   # Example (varies by project)
   npm run dev      # General case
   npm run local    # If local environment configuration exists
   ```
4. Check port number and access in browser.
   ```bash
   # Check PORT in package.json (e.g., PORT=9300, PORT=3000)
   # Access: http://localhost:{port}/{page-path}
   ```

> **Note:** Visual verification is impossible if server isn't running. If server startup error occurs, perform dependency installation (`npm install`) first.

### 3-1. Comparison Procedure

**Step 1: Structure Analysis — Perform First**

```js
// Extract entire structure first with figma_execute
const node = await figma.getNodeByIdAsync(nodeId);

// Extract structure information
function extractStructure(n, depth = 0) {
  const structure = {
    name: n.name,
    type: n.type,
    layoutMode: n.layoutMode, // HORIZONTAL, VERTICAL, NONE
    primaryAxisAlignItems: n.primaryAxisAlignItems, // Main axis alignment
    counterAxisAlignItems: n.counterAxisAlignItems, // Cross axis alignment
    children: []
  };
  if (n.children) {
    structure.children = n.children.map(c => extractStructure(c, depth + 1));
  }
  return structure;
}
```

→ **Compare 1:1 with code's HTML structure** to verify:
- [ ] Are parent-child relationships identical?
- [ ] Is **order** of child elements identical?
- [ ] `layoutMode: HORIZONTAL` → `flex-direction: row`, `layoutMode: VERTICAL` → `flex-direction: column`

**Step 2: Screenshot Comparison (Visual Comparison)**

1. `figma_capture_screenshot` — Capture Figma original (scale=1 full, scale=2 detail areas)
   > ⚠️ **Image Size Limit:** Claude API returns error if image width or height **exceeds 8000px** (`image dimensions exceed max allowed size: 8000 pixels`).
   > - Always use **`scale=1`** for full page capture
   > - Use `scale=2` **only for small detail areas (individual components, sections, etc.)**
   > - For very large frames (4000px+), **divide into regions** for capture or use `scale=0.5`

2. **Take screenshots by region** — When issue found, capture only that region with scale=2 for detail

**Step 3: Value Comparison (Property Comparison)**

1. `figma_execute` — **Extract node properties programmatically by region** and compare values with code
2. Build verification — After code modification, always verify build passes

> **Important:** Do not judge "matches" just from screenshots. Always extract actual values (padding, gap, fontSize, fills, opacity, etc.) with `figma_execute` and perform **1:1 value comparison** with CSS values.

### 3-2. Systematic Comparison Checklist

Verify items below **by region in order**. Extract Figma node properties and compare with code CSS values for each item.

> **⚠️ Required: Only proceed to Step 2 and beyond after Step 1 (Structure) passes.**

---

#### ⚙️ Step 0: Required During Implementation (Check Before Coding)

> These are CSS patterns that **must be applied before writing code**.
> If discovered during verification, it's already too late. Apply during implementation.

**Form Element (select, input) Flex Control:**
- [ ] For `select`, `input` inside flex container, always apply `flex: 1; min-width: 0;`
- [ ] Apply `flex-shrink: 0` to adjacent icons (chevron, search, etc.)
- [ ] Reason: Form elements expand by default and push adjacent elements

```scss
// ✅ Correct pattern
.dropdown {
  display: flex;
  align-items: center;

  select, input {
    flex: 1;
    min-width: 0;  // Required: prevent overflow
  }

  .icon {
    flex-shrink: 0;  // Icon doesn't shrink
  }
}
```

**Fixed Size + Padding Combination (box-sizing Required):**
- [ ] When specifying `height` or `width` with `padding`, **always** apply `box-sizing: border-box`
- [ ] Reason: Without it, actual size = specified size + padding, causing mismatch with Figma
- [ ] Example: `height: 40px; padding: 8px;` → Without box-sizing, actual height is 56px

```scss
// ✅ Correct pattern
.button {
  height: 40px;
  padding: 8px 12px;
  box-sizing: border-box;  // Required!
}
```

**Fixed Width Container:**
- [ ] Apply `width` + `box-sizing: border-box` to containers with fixed width in Figma
- [ ] Ensure inner elements don't overflow container with `min-width: 0`

**Background Color Opacity Check (Required Before Using CSS Variables):**
- [ ] **Always** check `fills[0].opacity` value from Figma
- [ ] opacity = 1.0 → Can use CSS variable (`var(--gray50)`)
- [ ] opacity < 1.0 → **Cannot use CSS variable**, `rgba()` required
- [ ] Reason: CSS variables only store color value, not opacity

```js
// Check opacity with figma_execute (Required!)
const fills = node.fills;
if (fills && fills[0]) {
  return {
    color: fills[0].color,
    opacity: fills[0].opacity  // ← Use rgba() if this value is less than 1.0
  };
}
```

```scss
// ❌ Wrong pattern (ignoring opacity)
.content-area {
  background-color: var(--gray50);  // No opacity info → Renders opaque
}

// ✅ Correct pattern (reflecting opacity)
.content-area {
  background-color: rgba(242, 242, 242, 0.3);  // Figma opacity: 0.3 reflected
}
```

> **Lesson learned**: "Why is the background darker than Figma?" → Didn't check `fills[0].opacity`. CSS variables don't include opacity, so must use `rgba()` when opacity < 1.0.

**Icons — SVG Download from Figma Required:**
- [ ] All icons must be **exported as SVG files from Figma** (no manual coding)
- [ ] Select Figma icon node → Right-click → "Copy/Paste as" → "Copy as SVG" or Export → SVG
- [ ] Convert downloaded SVG to Vue component or use as `<img>` tag
- [ ] Reason: Hand-coded SVG has different path, viewBox from Figma original causing visual mismatch
- [ ] Exception: Use existing icon component if already defined in design system

**Typography — Mixin Usage Required:**
- [ ] **No hardcoding**: Do not write `font-size`, `font-weight`, `line-height` directly
- [ ] **Mixin usage required**: Always use typography mixin with `@include` statement
- [ ] **Check mixin existence before implementation**: Extract style name from Figma `textStyleId` → Check if corresponding mixin exists in `_mixin.scss`
  - Figma style: `Title5/SemiBold` → mixin: `@include title5SemiBold`
  - Figma style: `Body2/semiBold` → mixin: `@include body2SemiBold`
- [ ] **Add mixin first if not exists**: If corresponding mixin doesn't exist in design system, **add to `_mixin.scss` before implementation**
- [ ] Reason: Hardcoding breaks design system consistency and requires full modification for future changes

```scss
// ❌ Wrong pattern (hardcoding)
.card-title {
  font-weight: 600;
  font-size: 20px;
  line-height: 140%;
}

// ✅ Correct pattern (mixin usage)
.card-title {
  @include title5SemiBold;
  color: var(--gray1000);  // Only color specified separately
}
```

---

#### 🔴 Step 1: Structure Verification (MUST PASS FIRST)

**DOM Structure Match:**
- [ ] Does Figma node parent-child relationship match HTML structure?
- [ ] Is child element **order** same as Figma? (left→right, top→bottom)
- [ ] Is nesting depth identical? (no unnecessary wrappers)

**Layout Direction:**
- [ ] `layoutMode: HORIZONTAL` → `display: flex; flex-direction: row`
- [ ] `layoutMode: VERTICAL` → `display: flex; flex-direction: column`
- [ ] `layoutMode: NONE` → position absolute or grid

**Alignment:**
- [ ] `primaryAxisAlignItems` → `justify-content` match (horizontal alignment)
- [ ] `counterAxisAlignItems` → `align-items` match (vertical alignment)
- [ ] **Table cells**: `counterAxisAlignItems: CENTER` → `vertical-align: middle`
- [ ] Are elements correctly positioned center/left/right?
- [ ] Are elements correctly positioned top/center/bottom?

**Child Element Arrangement:**
- [ ] If element A is to the left of element B in Figma, is A before B in HTML?
- [ ] Check where element is positioned within parent in Figma (start/middle/end)

> **Screenshot Required:** After structure verification, always perform visual comparison with `figma_capture_screenshot`

---

#### 🟡 Step 2: Layout Value Verification

**Container Layout:**
- [ ] Overall container: `layoutMode`, `width`, `height`, `padding`, `gap(itemSpacing)`
- [ ] By sub-section: `layoutMode`, `padding`, `gap`, `cornerRadius`
- [ ] Does flex-direction match Figma `layoutMode`

**Spacing:**
- [ ] Do parent-child padding values exactly match Figma
- [ ] Do sibling element gap(itemSpacing) values match
- [ ] **Nested padding caution:** Is parent wrapper padding + child padding summing up to be larger than Figma

---

#### 🟢 Step 3: Property Verification

**Colors:**
- [ ] Background color: Figma `fills[0].color` + `fills[0].opacity` → CSS `background-color`
- [ ] **Opacity check required**: Always extract and verify `fills[0].opacity` value from Figma
  - opacity = 1.0 → Can use HEX or CSS variable
  - opacity < 1.0 → `rgba()` or HEX+alpha (e.g., `#f2f2f24d`) required
  - **CSS variables don't include opacity**, so use direct value instead of variable when opacity < 1.0
- [ ] Text color: Figma text fills → CSS `color`
- [ ] Border color: Figma `strokes` → CSS `border-color`
- [ ] Are state-specific colors (hover, active, card states, etc.) correct

**Typography:**
- [ ] fontSize: Figma px → **Source A:** SCSS mixin / **Source B:** Tailwind text class or CSS variable
- [ ] fontWeight: **Source A:** mixin mapping then weight override / **Source B:** Tailwind font-weight class
- [ ] Check for **different sizes/weights per state** for same elements (e.g., today badge 14px, other dates 16px)

**Component Details:**
- [ ] Button: padding, border, borderRadius, backgroundColor, fontSize
- [ ] Card: borderRadius, bar thickness, inner padding, state-specific colors
- [ ] Icon: size, fill color
- [ ] Dynamic elements like current time display: position, shape(borderRadius), size

**Visibility:**
- [ ] Are nodes with `visible: false` in Figma hidden (Source A: `display: none` / Source B: Tailwind `hidden`)
- [ ] Conversely, are nodes with `visible: true` not hidden in code

**Rendering Verification (Required After CSS Application):**
- [ ] `box-sizing` check: For elements with `height`/`width` specified that have `padding` or `border`, verify `box-sizing: border-box` is applied. Otherwise actual rendering size = height + padding + border, causing mismatch with Figma values.
- [ ] Check Figma node's `strokes` property to verify border/line existence. If no stroke, don't apply `border` in CSS. Don't maintain existing code border as-is, judge based on Figma.

**Responsive/Overflow:**
- [ ] Are overflow: hidden/auto/scroll settings appropriate
- [ ] Flex layout safety handling like flex: 1 / min-width: 0

### 3-3. Iteration Rules

- When difference found, **modify → build → re-compare with Figma node values**
- **Repeat until 99%+ match**
- **List all differences** found in one round, then batch modify
- After modification, **always re-verify** before claiming "matches"
- **Never do:** Don't report "100% match" when differences remain

### 3-4. Common Pitfalls and Solutions

| Pitfall | Symptom | Solution |
|---------|---------|----------|
| **Nested padding** | Parent wrapper padding + child padding sum to larger margin than Figma | Check Figma structure to identify where padding applies. Apply only one |
| **Missing opacity** | Background darker than Figma. Used CSS variable (`var(--gray50)`) but Figma had opacity | **Always** check fills `opacity` property. If less than 1.0, use `rgba()` or HEX+alpha (`#f2f2f24d`) instead of CSS variable. CSS variables don't include opacity |
| **font-weight mismatch** | Mixin/class already includes weight but override was missed | **Source A:** `@include label2SemiBold; font-weight: 500;` override after mixin / **Source B:** Use appropriate Tailwind class like `font-medium` |
| **borderRadius type confusion** | Circular button appears as rectangle | Distinguish Figma `cornerRadius: 18` (circular) vs `8` (rounded) |
| **Figma design inconsistency** | Korean/English mixed in same design | Follow main area format, ignore template/placeholder text |
| **Excessive min-width** | Element wider than Figma | Don't use `min-width` for auto-width elements in Figma |
| **CSS grid vs Figma auto-layout** | Column widths different | Check actual width of each column in Figma and set `grid-template-columns` |
| **Missing box-sizing** | `height: 80px` + `padding: 10px` + `border: 1px` → Renders 101px | When specifying `height`/`width` with `padding` or `border`, always add `box-sizing: border-box`. Always check computed size in DevTools after CSS application |
| **Border/line existence not checked** | Kept `border-right` from existing code but Figma doesn't have it | Don't follow existing code borders as-is, check Figma node's `strokes` property with `figma_execute` to determine border existence. Remove border if no stroke |
| **select/input flex expansion** | select/input expands excessively in flex container pushing adjacent icons | Apply `flex: 1; min-width: 0;` to form elements, `flex-shrink: 0` to icons. **Apply during implementation in Step 0** |

### 3-5. Verification Completion Criteria

- Figma screenshot and web screenshot layout, colors, spacing, typography are visually identical
- Core values extracted with `figma_execute` (padding, gap, fontSize, cornerRadius, fills) exactly match CSS values
- Build passes without errors
- Development-only UI like Nuxt dev toolbar excluded from comparison

---

### 3-6. Verification Failure Prevention Guide (Lessons Learned)

> This section analyzes past verification failure cases to avoid repeating the same mistakes.

#### Failure Case 1: Checked Properties Only, Ignored Structure

**Problem:**
- date-filter's individual properties (colors, fonts) were accurate, but internal element arrangement was completely different
- Figma: `[Dropdown | Divider | ← DateText →]` (arrows at both ends)
- Code: `[Dropdown | Divider | DateText | ← →]` (arrows grouped on right)

**Cause:**
- Only checked individual CSS properties (width, height, color)
- Did not check overall layout structure (child order, flex arrangement)

**Prevention:**
```
✅ Always verify in order: Structure (Step 1) → Values (Step 2) → Properties (Step 3)
✅ Check children array order first with figma_execute
✅ Compare visual arrangement with screenshots
```

#### Failure Case 2: Declared "Match" Without Screenshot

**Problem:**
- Reported "matches" after code modification without taking screenshot
- User directly verified with screenshot and found mismatch

**Cause:**
- Only performed code change → build check
- Did not visually verify actual rendering result

**Prevention:**
```
✅ Always perform figma_capture_screenshot after code modification
✅ Compare before/after screenshots
✅ Present screenshot evidence before saying "matches"
```

#### Failure Case 3: Declared Complete After Partial Check

**Problem:**
- Only checked table header color and said "table verification complete"
- Actually table row data date format was wrong

**Cause:**
- Only checked some properties of one area
- Did not systematically check all elements in that area

**Prevention:**
```
✅ Iterate through all child elements by area to verify
✅ Check each item in checklist one by one
✅ Review checklist before saying "complete"
```

#### Failure Case 4: Skipped Node Tree Extraction → Missing Fixed Width Wrapper

**Problem:**
- Figma: `main area > Frame 773 (width: 1100px, padding: 0 20px) > content`
- Code: `content-area > content` (1100px wrapper completely missing)
- Result: Content area renders much wider than Figma

**Cause:**
- Implemented by guessing "probably this structure" from screenshot only
- Skipped node tree extraction explicitly marked "never skip" in CLAUDE.md
- Did not recognize intermediate frame layer (Frame 773) in Figma

**Prevention:**
```
✅ Always extract node tree with figma_execute before implementation (never skip)
✅ Check for fixed width frames (1100px, 540px, etc.)
✅ Compare extracted tree 1:1 with code structure
✅ Especially check that "intermediate wrappers" are not missing
```

**Verification Checklist (Layout Structure):**
- [ ] Did you extract Figma node tree with `figma_execute`?
- [ ] Is there a fixed width container (Frame)? → Does same wrapper exist in code?
- [ ] Does code DOM depth match Figma node depth?
- [ ] Did you compare main container width values 1:1 with Figma?

> **Lesson learned**: "Why is the content area so wide?" → Implemented from screenshot only without node tree extraction. **"Never skip" really means never skip.**

---

#### Failure Case 5: Implemented Image Node as HTML/CSS

**Problem:**
- Figma: `RECTANGLE` node + `fills[0].type: 'IMAGE'` (imageHash exists)
- Code: Implemented card component directly with v-for loop + HTML/CSS
- Result: Different layout from design, unnecessary code complexity

**Cause:**
- Skipped `fills[0].type` check during node tree extraction
- Guessed "this is a card component" from screenshot only
- Did not recognize meaning of `imageHash` property

**Prevention:**
```
✅ Always check fills type during node tree extraction
✅ fillType: 'IMAGE' or imageHash exists → Handle as image file
✅ RECTANGLE + IMAGE fill = Image node (not HTML/CSS implementation target)
```

**Verification Checklist (Image Node):**
- [ ] Did you check for nodes with `fillType: 'IMAGE'` in node tree?
- [ ] Did you export image nodes from Figma and save as files?
- [ ] Does code reference the image with `<img>` tag?

> **Lesson learned**: "Why did you implement the image with code?" → Didn't check `fills[0].type`. **fillType check during node tree extraction is required.**

---

#### Self-Check Questions During Verification

Ask yourself before saying "matches" each time:

1. **Node tree:** Did you extract Figma node tree and compare with code structure?
2. **Fixed width:** If Figma has fixed width frame, does code have same wrapper?
3. **Image node:** Did you handle `fillType: 'IMAGE'` nodes as image files? (not HTML/CSS)
4. **Structure:** Did you verify all child element order and arrangement?
5. **Screenshot:** Did you directly compare Figma and code screenshots?
6. **Values:** Did you extract and compare actual values with figma_execute?
7. **Evidence:** Do you have verification evidence to show the user?

> **If any answer is "no", verification is not complete.**

---

## 4. Interaction Element Verification

> **Scope:** Performed in all implementations that include **interactive elements** like dropdowns, modals, toggles.

When design implementation includes interaction elements, **behavior verification** must be performed separately from visual verification.

### 4-1. Dropdown/Popover Verification

- [ ] **Open/close state transition** — Does it open and close normally on click
- [ ] **Outside click close** — Does it close when clicking outside dropdown area
- [ ] **Focus loss close** — Is close handling done on focusout event
- [ ] **Arrow icon rotation** — Does icon rotate based on open/closed state (including transition)
- [ ] **Menu position** — Is dropdown menu displayed in correct position (top/bottom/left/right)
- [ ] **z-index** — Is it displayed normally above other elements

### 4-2. Modal/Dialog Verification

- [ ] **Open/close** — Does it open on trigger click and close on close button/overlay click
- [ ] **Background overlay** — Is semi-transparent overlay displayed behind modal
- [ ] **Focus trap** — Does Tab key only cycle within modal
- [ ] **Scroll lock** — Is background scroll prevented when modal is open
- [ ] **ESC key close** — Does modal close with Escape key

### 4-3. Toggle/Switch Verification

- [ ] **State transition** — Does on/off state toggle on click
- [ ] **Visual feedback** — Does color/position change based on state
- [ ] **Transition** — Is smooth animation applied during state transition

### 4-4. Keyboard Accessibility Verification

- [ ] **Tab key** — Is Tab navigation between interactive elements possible
- [ ] **Enter/Space** — Are buttons/links activated with Enter or Space
- [ ] **Escape** — Do open popups/modals close with ESC
- [ ] **Focus indicator** — Is currently focused element visually distinguished

### 4-5. Responsive Interaction Verification

- [ ] **Desktop/mobile transition** — Are interactions maintained during responsive transition
- [ ] **Touch events** — Does it work normally with touch on mobile
- [ ] **Hover state** — Is hover effect applied on desktop

### 4-6. Verification Completion Criteria

- [ ] All interactive elements open/close normally
- [ ] Outside click and ESC key close handling complete
- [ ] Basic keyboard accessibility items met
- [ ] Visual feedback (icon rotation, color change, etc.) during state transition works normally
