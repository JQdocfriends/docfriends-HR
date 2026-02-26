# Design / CLAUDE.md

This document defines the guidelines that Claude must follow when performing screen design and design system-related work for the **Doctalk Reservation Platform**.

> Claude serves **only as a proposer of design decisions**,
> The **final design decision authority belongs to the designer**

---

## Table of Contents

### 1️⃣ [Designer Workflow](#designer-workflow-design-types)
- [Basic Guidelines](#basic-guidelines) - Initial questions (Design type + Design system source)
- [Design Type Selection Rules](#design-type-selection-rules)
- [Design System Source Detailed Rules](#design-system-source-detailed-rules)
  - A. Existing (internal repo)
  - B. New (package)

### 2️⃣ [Design Type - New/Improved Screen Design Proposal](#newimproved-screen-design-proposal)
- Step 0: Basic Guidelines
- Step 1: Requirements Confirmation
- Step 2: Current State Analysis (for improvements)
- Step 3: Structure Design (IA + User Flow)
- Step 4: Design Implementation
  - 4-0: Local Development Environment Setup
  - 4-1: UXUI Guidelines Review
  - 4-2: Implementation
- Step 5: Design System Compliance Verification

### 3️⃣ [Design Type - Figma Design Implementation](#figma-design-request)
- 0. MCP Tool Selection
- 1. Token Verification
- 2. Figma → Code Implementation Procedure
- 3. Visual Verification Loop

### 4️⃣ [Figma Screen Creation Guide (Code → Figma)](#figma-screen-creation-guide-code--figma)
- 0. When to Use
- 1. Frame Creation Basics
- 2. Auto Layout Sizing Rules
- 3. Library Paint Style Binding
- 4. Library Component Instantiation
- 5. Color Binding Verification

### 5️⃣ [Other Guidelines](#other-guidelines)
- Figma console MCP Pre-connection Guide
- Playwright MCP Visual Verification Guide

---

# Designer Workflow (Design Types)

## Basic Guidelines

Before starting work, Designer **must first ask the user** about the design type and design system source.

→ `Which design type would you like to proceed with? [1 / 2]`

- **1. New/Improved Screen Design Proposal**
- **2. Proceed with existing Figma design (figma link required)**

→ `Which design system should be used as the basis? [A / B]`

- **A. Existing (internal repo design system)**
- **B. New (doctalk-design-system-vue package)**

---

## Starting a New Design Task

**Important:** When starting a **new** design task (not continuing a previous task):

1. **Clear Context**
   - Do **NOT** reference any previous design tasks, file names, or implementation details from earlier conversations
   - Treat this as a completely fresh start
   - Only use information explicitly provided by the user for the new task

2. **Basic Guidelines Re-confirmation**
   - Always ask the Basic Guidelines questions (design type + design system) for the new task
   - Do not assume the same choices from previous tasks

3. **When NOT to Clear Context**
   - If user explicitly says "continue with [previous task name]" or "add to [previous work]"
   - If user provides specific references to previous implementation (file paths, component names)
   - If working within the same PR/branch that's still in progress

**Indicators of a New Task:**
- User says "새로운 작업" (new task) or "다른 작업" (different task)
- User says previous task is "완료" (completed) or "끝났어" (finished)
- User provides a new Figma link without referencing previous work
- User switches to a completely different feature or screen

---

## Design Type Selection Rules

- If user selects **Option 1**
  → Proceed with `## New/Improved Screen Design Proposal` procedure based on the selected design system source (A or B).

- If user selects **Option 2**
  → Move to `## Figma Design Request` procedure based on the selected design system source (A or B).

- If user does not make a clear selection
  → Do not proceed with work, **request design type and design system source selection again.**

---

## Design System Source Detailed Rules

Follow the rules below according to the design system source (A or B) selected above.

### A. Existing (internal repo design system)

- Use SCSS tokens and components within the target repository.
- Colors: `assets/scss/base/_color.scss` (CSS variables: `--dg500`, `--gray100`, etc.)
- Typography: `assets/scss/abstracts/_mixin.scss` (SCSS mixin)
- Responsive: `assets/scss/abstracts/_variables.scss` (breakpoints)
- Components: `components/common/`, `components/service/common/`

#### Typography Rules (Source A Only)

- Do not hardcode `font-family`, `font-weight`, `font-size`, `line-height` directly.
- Always use `@include` directive from `_mixin.scss`.
- If there's no exact matching mixin, **`@include` the closest mixin and override only individual properties**.
  ```scss
  // Example: Using label2SemiBold(600/12px) as base, override weight and size only
  .card-name {
    @include label2SemiBold;
    font-weight: 500;
    font-size: 13px;
  }
  ```
- To use mixins in Vue scoped style, **`@use` import at the top is required**.
  ```scss
  <style lang="scss" scoped>
    @use '../../assets/scss/abstracts/mixin' as *;
    // Adjust path based on component location
  </style>
  ```

#### Main Mixin Categories

| Category | Example | Usage |
|----------|---------|-------|
| display | `display1Bold` | Large titles |
| title | `title1Bold`, `title2SemiBold` | Section headings |
| body | `body1Medium`, `body2Medium` | Body text, navigation text |
| label | `label1SemiBold`, `label2SemiBold` | Labels, captions, meta info |
| text | `text1Bold` | Other text |
| oneLineText | `oneLineText` | Text truncation |

> All mixins include `font-family: 'Pretendard Variable' !important`, so font-family is automatically applied when using mixins.

#### Application Rules

- Use only SCSS variables and mixins within the target repository.
- Colors: Do not use HEX directly, use CSS variables from `_color.scss` (`--dg500`, `--gray100`, etc.).
- Typography: Do not use `font-family`, `font-weight`, `font-size`, `line-height` directly, use `@include` from `_mixin.scss`.
- If a value not in tokens is needed (both color and typography), always ask the user before implementation.
- Question example: `This color (#1690ed) is not in _color.scss. The closest token is --blue-900(#2f95d0). [1] Add token / [2] Use closest token / [3] Allow hardcoding`
- **When [2] is selected:** Use the closest token in code, and **update the binding to that token in the Figma design file as well** (to prevent design-code inconsistency).
- Even if hardcoding exists in existing code, do not follow it directly and ask the same question.

### B. New (doctalk-design-system-vue package)

- Install and use the external package `doctalk-design-system-vue`.
- Installation: `npm install file:../doctalk-design-system-vue`
- Follow the package's tokens, components, and style rules.

#### Design Guidelines Reference (Source B Only)

- To review guidelines for design implementation, **first explore and reference the design guideline documents existing in the specified GitHub repository**.

- Reference repository: https://github.com/linddd3e/doctalk-design-system
- **Prioritize checking** documents in the following locations that contain design-related guidelines:
- `README.md`
- Design rule explanations in code comments (if needed)

> Even if design rules are not explicitly separated,
> all documents containing UI / UX / Design System descriptions are considered as rule candidates.

#### Application Rules

- Use **only** the package's tokens and components (no mixing with internal repo SCSS tokens).
- If a value not in tokens is needed, always ask the user before implementation.
- Question example: `This color (#667085) is not in doctalk-design-system-vue tokens. The closest token is --muted-foreground(#64748b). [1] Add token / [2] Use closest token / [3] Allow hardcoding`
- **When [2] is selected:** Use the closest token in code, and **update the binding to that token in the Figma design file as well** (to prevent design-code inconsistency).

### Common Rules

- **Do not mix A and B.**
  → Mixing existing tokens and new package tokens within a project breaks consistency,
  → Always select and work with only one source.

- **If a component not in the design system is needed**, always ask the user before implementation.

  → `The corresponding component for this UI element does not exist in the design system. [1 / 2 / 3]`

  - **[1] Add component to design system**
    - When reusability is high (button variants, card types, etc.)
    - Add component to design system package and rebuild
  - **[2] Create as local component within project**
    - When needed only for this project (including specific business logic, etc.)
    - **Use design system tokens** but create new component structure
    - Source A: Create in `components/common/` or `components/service/common/`
    - Source B: Create by combining package tokens/existing components
  - **[3] Combine/extend existing component**
    - If a similar component exists in design system, wrap or extend it
    - Example: Basic `Button` exists but `IconButton` doesn't → Wrap `Button` and add icon slot

---

## New/Improved Screen Design Proposal

### Step 0. Basic Guidelines

- All screen design must proceed in the following order:

  **For New Screens:**
  **(1) Requirements Confirmation → (2) Structure Design → (3) Design Implementation → (4) Design System Compliance Verification**

  **For Improvements (including UT-based):**
  **(1) Requirements Confirmation → (1-1) Problem Clarification (if UT-based) → (2) Current State Analysis → (2-3) Derive Improvements → (3) Structure Design → (4) Design Implementation → (5) Design System Compliance Verification**

- **Critical Rule for UT-based Improvements:**
  - Never propose AS-IS/TO-BE wireframes without verifying the actual current screen
  - Always ask clarifying questions when UT descriptions contain ambiguous terms
  - Explore codebase or request Figma/screenshots before Step 2-3

### Step 1. Requirements Confirmation

Understand requirements through one of the following methods:

**Method A: When PRD.md exists**
- Proceed based on **PRD.md**.
- **task.md** is referenced **only for cross-verification** to check if IA and user flow match the work scope.

**Method B: When PRD.md does not exist**
- Listen to requirements directly from the user.
- Confirm the following information:
  - **Screen purpose**: What is this screen/feature for?
  - **Problems**: (For improvements) What problems exist currently?
  - **Expected results**: What state is desired?

**Method C: When UT (User Testing) results exist**
- Proceed based on **UT results document**.
- Must complete **Step 1-1. Problem Clarification** before proceeding to Step 2.


### Step 2. Current State Analysis (For Improvements)

> **Skip this step for new screen additions.**

When improving existing screens/features, perform the following analysis:

#### 2-1. Understand Existing Structure

> ⚠️ **This step is MANDATORY before Step 2-3 (Derive Improvement Options).**
> You must complete actual codebase exploration or screen verification before proposing any AS-IS/TO-BE wireframes.

Explore related code and **organize the current structure visually**:

**Exploration Methods:**
1. **Codebase exploration (Preferred):**
   - Clone/access the relevant repository
   - Find and read component files (GNB, navigation, target pages)
   - Understand routing structure and layout hierarchy
   - Check responsive breakpoints and conditional rendering

2. **Figma/Screenshot review:**
   - If codebase is unavailable, request Figma link or screenshots
   - Verify all relevant screens and states

**Required Check Items:**
- Routing structure (pages/ folder structure)
- Layout structure (layouts/, component hierarchy)
- Navigation patterns (GNB, sidebar, tabs, etc.)
- Responsive handling (behavior per breakpoint)
- **Component visibility conditions** (e.g., mobile-only menus, desktop-only features)

**Deliverable Format:**
```
## Current Structure Analysis

**Routing Structure:**
/path1  → Page description
/path2  → Page description

**Current Navigation Pattern:**
(Visualize with ASCII wireframe)

**Responsive Handling:**
| Screen | Behavior |
|--------|----------|
| Desktop | ... |
| Tablet | ... |
| Mobile | ... |
```

#### 2-2. UX Problem Analysis

- Organize problems users experience
- Identify causes of problems (UI recognition, information structure, accessibility, etc.)
- Identify bottlenecks in current user flow

#### 2-3. Derive Improvement Options

> **Pre-check before proceeding:**
> - [ ] Completed Step 1-1 Problem Clarification (if UT-based)
> - [ ] Verified actual screen structure via codebase or Figma/screenshots
> - [ ] Documented current navigation patterns and component locations
> - [ ] Identified responsive differences (desktop vs. mobile)
>
> ❌ **Do NOT proceed if any checkbox is unchecked.**

Present 3-5 improvement options **considering existing patterns**.

**Content to include in each improvement option:**

1. **AS-IS / TO-BE Wireframes** (ASCII)
   ```
   **Current (AS-IS):**
   ┌─────────────────────────┐
   │ [Existing UI Structure] │
   └─────────────────────────┘

   **Improved (TO-BE):**
   ┌─────────────────────────┐
   │ [Improved UI Structure] │
   └─────────────────────────┘
   ```

2. **Pros/Cons Table**
   | Pros | Cons |
   |------|------|
   | ... | ... |

3. **Existing Pattern Utilization**
   - ✅ Uses existing pattern (specify which pattern)
   - ❌ New pattern introduction needed

4. **Modification Scope**
   - List of files to modify
   - Expected implementation difficulty

**Comprehensive Comparison Table:**

| Option | Uses Existing Pattern | Implementation Difficulty | UX Improvement | Change Scope |
|--------|----------------------|--------------------------|----------------|--------------|
| 1. ... | ✅/❌ | ⭐~⭐⭐⭐⭐ | ⭐~⭐⭐⭐⭐ | N files |

**Recommendation:**
- Quick implementation → Option N (reason)
- Fundamental solution → Option N (reason)

> **Before sending improvement options to user, verify all requirements:**
> - [ ] Each option includes AS-IS/TO-BE ASCII wireframes
> - [ ] Each option includes Pros/Cons table
> - [ ] Each option includes Existing Pattern Utilization section
> - [ ] Each option includes Modification Scope section
> - [ ] Comprehensive Comparison Table across all options provided
> - [ ] Recommendation section included
>
> ❌ **Do NOT send to user if any checkbox is unchecked.**

---

After presenting improvement options, ask the user:

→ `Which improvement option would you like to proceed with?`

- If user selects an option → Move to Step 3
- If additional analysis is needed → Re-propose after analysis

### Step 3. Structure Design

Before applying design, **the following items must be proposed first**.

#### 3-1. IA (Information Architecture)

**Deliverable Format Selection:**

Before starting IA work, ask the user:

→ `How would you like to review the IA? [1 / 2]`

- **1. Text format** - Review directly in chat
- **2. FigJam** - Review as visual diagram (FigJam file creation)

**Work Content:**
- Information priority within screen
- Relationships between main elements
- Menu structure (if applicable)

**Deliverables:**
- Menu structure diagram (if navigation exists)
  - Hierarchy of each menu
  - Main content/function description of each page

After completing IA proposal, **the following question must be presented** to the user.

→ `Are there any modifications to the IA? [Y/N/Skip]`

- **Y** → Reflect modifications and repeat the same question
- **N** → Move to 3-2. User Flow
- **Skip** → Skip IA and move to 3-2. User Flow

#### 3-2. User Flow

**Deliverable Format Selection:**

Before starting user flow work, ask the user:

→ `How would you like to review the user flow? [1 / 2]`

- **1. Text format** - Review directly in chat
- **2. FigJam** - Review as visual flowchart (FigJam file creation)

**Work Content:**

User flow should be written **in detail** so UX/UI designers can review.

**Required Items:**

1. **User Goal**
   - The goal the user wants to achieve through this flow
   - Example: "Complete reservation creation", "View patient information"

2. **Entry Point**
   - Where does the user enter this flow from
   - Example: "Click reservation management menu", "'New Reservation' button on dashboard"

3. **Main Steps**
   - List each step the user goes through in order
   - Actions performed by user and system responses at each step
   - Example:
     ```
     1. Select date → Display calendar
     2. Select time → Filter available time slots
     3. Select patient → Search patient list
     4. Click confirm button → Call reservation creation API
     ```

4. **Decision Points**
   - Branch points where user must make a choice
   - Next steps for each choice
   - Example: "If patient doesn't exist → Move to new patient registration flow"

5. **State Changes**
   - Loading state: During data retrieval, API call
   - Success state: Completion message, navigate to next screen
   - Error state: Error message, retry option

6. **Error Handling**
   - Possible error scenarios
   - User guidance and recovery methods for each error
   - Example: "Duplicate reservation → Warning message + View existing reservation option"

7. **Edge Cases**
   - Handling exceptional situations
   - Example: "Attempting reservation outside business hours", "Capacity exceeded"

8. **Exit Points**
   - Success: Final screen, confirmation message
   - Failure: Exit path, retry method
   - Cancellation: Cancel button location, confirmation dialog

**Deliverables:**
- User scenarios + State transition table

After completing user flow proposal, **the following question must be presented** to the user.

→ `Are there any modifications to the user flow? [Y/N/Skip]`

- **Y** → Reflect modifications and repeat the same question
- **N** → Move to Step 4
- **Skip** → Skip user flow and move to Step 4

> **Important:** 3-1 and 3-2 are **approved independently**.
> Even if user selects "Skip" in 3-1, the question about 3-2 must be asked separately.
> Skipping one item does not automatically skip the remaining items.



### Step 4. Design Implementation

#### 4-0. Local Development Environment Setup (Required Before Implementation)

Before verifying design implementation, the local development server must be running.

**Repository Location:**
```
repos/doctalk_front_homepage/
```

**Setup Commands:**
```bash
# 1. Navigate to project directory
cd repos/doctalk_front_homepage

# 2. Install dependencies (first time only)
npm install

# 3. Start development server
npm run dev
```

**Available Scripts:**
| Script | Port | Usage |
|--------|------|-------|
| `npm run dev` | 3000 (or next available) | Development with hot reload |
| `npm run local` | 9300 | Local environment |

**Access URL:**
- Primary: `http://localhost:3000`
- If port 3000 is occupied, check terminal output for alternative port (e.g., `http://localhost:3002`)

**Troubleshooting:**

| Issue | Solution |
|-------|----------|
| `Unknown command` error | Verify you're in the correct directory (`repos/doctalk_front_homepage/`) |
| `node_modules` not found | Run `npm install` first |
| Port already in use | Server will auto-select next available port, check terminal output |
| Build errors | Check for TypeScript/syntax errors in modified files |

**Verification Checklist:**
- [ ] Server starts without errors
- [ ] Page loads in browser
- [ ] No console errors in browser DevTools
- [ ] Modified components render correctly

---

#### 4-1. UXUI Guidelines Review (Required Before Implementation)

**Review the following guidelines** before design implementation.

**When Source A (existing internal repo) is selected:**

To understand the patterns and principles of the existing design system, check the following:

1. **HIG (Human Interface Guidelines) Reference**
   - Check basic design principles such as Apple HIG, Material Design
   - Understand platform-specific UI patterns

2. **Existing Screen Pattern Analysis**
   - Check design patterns of existing screens in the project
   - Understand component usage, layout structure, interaction patterns
   - Example: Usage examples of components in `components/common/`, `components/service/common/`

3. **Maintain Consistency**
   - Apply same patterns as existing screens
   - Request user confirmation when introducing new patterns

**When Source B (new package) is selected:**

→ Follow the [Design System Source Detailed Rules > B. New > Design Guidelines Reference](#b-new-doctalk-design-system-vue-package) section.

#### 4-2. Implementation

- **0. ⚠️ Pre-Implementation Component Audit (MANDATORY)**

  **Before writing ANY template/style code, you MUST complete this audit:**

  1. **Search for existing components** in the design system:
     ```bash
     # Search in components/common/ and components/service/common/
     Glob: components/common/**/*.vue
     Glob: components/service/common/**/*.vue
     ```

  2. **List all components that will be used** in your implementation:
     - Buttons → Check for `*Button*.vue` components
     - Inputs → Check for `*Input*.vue`, `*Field*.vue` components
     - Cards, Modals, etc. → Check for matching component patterns

  3. **Only if no matching component exists**, proceed to ask the user:
     - **Do not create plain HTML elements** (`<button>`, `<input>`, `<select>`, etc.) without confirming component availability first
     - Refer to [Common Rules](#common-rules) section for component creation options

  **❌ FORBIDDEN:**
  - Writing `<button>`, `<input>`, `<select>` etc. before completing component audit
  - Assuming components don't exist without searching
  - Creating custom styles for standard UI elements without checking design system first

  **✅ REQUIRED:**
  - Run Glob searches before implementation
  - Document which existing components will be used
  - Ask user if creating new component is needed

---

- **1.** Verify the selected design system source.
  - **Source A** → Check if internal SCSS tokens (`_color.scss`, `_mixin.scss`, `_variables.scss`) are available.
  - **Source B** → Check if `doctalk-design-system-vue` local package is installed, if not, install it. (`npm install file:../doctalk-design-system-vue`)

- **2.** Implement the design in code.

  > Use token names (variable names) and mixins from the selected source without hardcoding.
  > For Source A, be sure to follow the `Typography Rules (Source A Only)` section above.

- **3.** After applying the design, verify that the design is correctly applied on localhost.

---




### Step 5. Design System Compliance Verification

After completing design implementation, **verify** that the selected design system was used correctly.

> **For detailed procedures, refer to [VERIFICATION.md](./VERIFICATION.md#2-design-system-compliance-verification).**

#### Verification Item Summary

**Source A (existing repo):**
- Direct use of HEX values (automated verification: `grep`)
- Direct use of typography properties (automated verification: `grep`)
- Existence of mixin import in component files (Vue/TSX/JSX)

**Source B (new package):**
- Package import and usage verification
- Hardcoded color/font usage
- Check if Tailwind classes are based on design system tokens (including safelist omission check)

#### Verification Result Report

Report results to user after verification completion:

→ `Design system verification result: [Pass / Needs Modification]`

- **Pass**: Design confirmed → Proceed to next step as defined in **CLAUDE.md**
- **Needs Modification**: List problems and re-verify after modification




---


## Figma Design Request

- If design already exists in Figma, proceed with this procedure.

### 0. MCP Tool Selection (Required Prerequisite)

When receiving a Figma design request, **first** ask the user:

> `Where is the design source located? [1 / 2]`
> 1. **Figma** (.fig) → Use `figma-console` MCP
> 2. **Pencil** (.pen) → Use `pencil` MCP

- Check if the selected MCP is connected with `claude mcp list`.
- If Option 1 (`figma-console` MCP) is selected and `figma-console: ✓ Connected` is not in the list, follow **Other Guidelines > Figma console MCP Pre-connection Guide**.
  - The agent directly performs the **automatable steps** in this guide (MCP registration, repository clone, Figma restart, port verification), and only guides the user through the **manual required steps** (plugin import, plugin execution).

After MCP tool selection, confirm with user which **design system source the Figma file was created with**:

> `Which design system source was this Figma file created with? [A / B]`

---

### 0-1. Figma Frame Pre-analysis (Required Before Screenshot)

**Before taking a screenshot**, always check the size of the target frame.

#### Size Limit Check

```js
// Check frame size with figma_execute
const node = await figma.getNodeByIdAsync("nodeId");
return {
  width: node.width,
  height: node.height,
  name: node.name,
  // Expected size when scale=2 is applied
  estimatedAt2x: { width: node.width * 2, height: node.height * 2 }
};
```

#### 8000px Limit Handling

Claude API returns an error if image width or height **exceeds 8000px**.

| Frame Size | scale=2 Result | Recommended Action |
|------------|----------------|-------------------|
| 3000px or less | 6000px (safe) | Can use scale=2 |
| 3000~4000px | 6000~8000px (borderline) | scale=1 recommended |
| Over 4000px | Over 8000px (error) | **Split capture required** |

#### Split Capture Strategy

Handle large frames (over 4000px) with the following methods:

1. **Structure-first extraction**: Extract node tree first with `figma_execute` to understand overall structure
2. **Capture by region**: Capture individual sections/components by nodeId with scale=2
3. **Full capture**: Use scale=1 or scale=0.5

```js
// Example: Check size of child nodes
const node = await figma.getNodeByIdAsync("nodeId");
const children = node.children.map(c => ({
  id: c.id, name: c.name,
  width: c.width, height: c.height
}));
return children;
```

> **Lesson learned**: "Is there another way besides lowering the scale?" → Combining structure extraction + region-by-region capture is the best alternative.
> - **A. Existing (internal repo design system)** — SCSS tokens (`_color.scss`, `_mixin.scss`)
> - **B. New (doctalk-design-system-vue package)** — Tailwind CSS tokens

- This question is to determine the correct mapping criteria for subsequent token verification and code implementation.
- **If the source selected in basic guidelines differs from the Figma file's source**, inform user of the mismatch and confirm which one to use:
  → `You selected Source A in basic guidelines, but this Figma file appears to be created with Source B. Which should we use as the basis? [1] Based on Figma file (Source B) / [2] Keep existing selection (Source A)`

---

### 1. Token Verification

> **For detailed procedures, refer to [VERIFICATION.md](./VERIFICATION.md#1-token-verification-figma--design-system).**

---

### 1-1. Component Inventory Comparison

After token verification, before code implementation, **identify components used in Figma design and compare with design system**.

#### Step 1: Classify Figma Node Types

Extract types of all child nodes within target frame with `figma_execute`.

```js
const node = await figma.getNodeByIdAsync("nodeId");
if (!node) return 'Node not found';

function collectComponents(n, depth = 0) {
  if (depth > 5) return [];
  const results = [];
  if (n.type === 'INSTANCE') {
    // Note: Cannot directly access n.mainComponent in dynamic-page mode
    // Infer component name from n.name or check componentProperties
    results.push({
      name: n.name,
      type: 'INSTANCE',
      componentProperties: n.componentProperties,
    });
  } else if (n.type === 'FRAME' || n.type === 'GROUP') {
    results.push({ name: n.name, type: n.type });
  }
  if ('children' in n) {
    for (const child of n.children) {
      results.push(...collectComponents(child, depth + 1));
    }
  }
  return results;
}
return collectComponents(node, 0);
```

#### Step 2: Check if FRAME Nodes Were Originally Components

When designer **detaches** an instance in Figma, it converts from `INSTANCE` → `FRAME`. In this case, it should still be implemented as a component, so **ask user about FRAME type nodes that look like UI components**:

> `Please confirm if the following FRAME nodes were originally components (instances):`
> - `{node name 1}` — Was this originally a component? [Y / N]
> - `{node name 2}` — Was this originally a component? [Y / N]

- FRAMEs that user answers **Y** to are treated as components same as INSTANCE afterwards.
- Don't ask about all FRAMEs, only **UI elements that are not containers/wrappers** (buttons, cards, input fields, etc.).

#### Step 3: Compare with Design System Components

Compare the confirmed component list with existing components in the design system:

- **Source A (internal repo):** Search for matching components in the repo's `components/` directory
- **Source B (package):** Compare with exported component list of `doctalk-design-system-vue` package

| Comparison Result | Action |
|-------------------|--------|
| **Exists** in design system | Import and use that component |
| **Does not exist** in design system | Execute **Component not in design system handling** question flow from common rules ([1] Add to DS / [2] Local component / [3] Extend existing component) |

> **Note:** Component inventory comparison must be completed **before** code implementation. Discovering missing components during implementation breaks workflow and causes rework.

#### Step 4: Check Existing Component Slot Utilization

When using components that **exist** in the design system, check if the component **supports slots**.

**Why it matters:**
- When you need to add icons, badges, additional text to a component, you can use existing component slots instead of creating new components
- The pattern of **passing child elements via slots** rather than passing through props is common

**Verification Procedure:**

1. Open component file and check for `<slot>` tag existence
2. If slot exists → Pass desired content (icon, text, badge, etc.) to slot
3. If no slot → Check props or consider component extension

**Examples of Components with Slot Utilization:**

| Component Type | Slot Usage Example |
|----------------|-------------------|
| Button | Icon + text combination |
| Card | Custom content in header, body, footer areas |
| List Item | Left icon, right action button |
| Modal/Dialog | Title, content, action button areas |
| Input Field | prefix/suffix icons |

**Usage Example:**

```vue
<!-- Button with icon + text -->
<ServiceCommonTextButton48Filled>
  <svg class="btn-icon">...</svg>
  <span>Load Reservation Product</span>
</ServiceCommonTextButton48Filled>

<!-- Card with custom content -->
<BaseCard>
  <template #header>Custom Header</template>
  <template #default>Main Content</template>
</BaseCard>
```

> **Lesson learned**: "The icon isn't added as a TextButton48Filled property, it's inserted via slot, so it's possible" — Checking existing component slots first can avoid unnecessary custom component creation.

---

### 1-2. Screen Navigation Understanding

**Before** code implementation, understand the connection relationships between screens in Figma design.

**Check Items:**

1. **Entry Point**: From which screen does user enter this screen?
2. **Navigation**: Which screen does user go to when clicking buttons/links?
3. **Back**: How to return to previous screen?

**How to Check in Figma:**

- Infer screen relationships from frame names (e.g., "Login", "Dashboard")
- Identify navigation targets from button/link text
- Request flow confirmation from designer

**Implementation Reflection:**

| Figma Element | Vue Implementation |
|---------------|-------------------|
| Logo click → Home | `<NuxtLink to="/">` |
| Button click → Next screen | `router.push('/next-page')` |
| Back | `router.back()` or explicit path |

**Example:**

```typescript
// ai-test-form-v2.vue → Navigate to dashboard
const handleSubmit = () => {
  router.push('/ai-test-dashboard')
}

// ai-test-dashboard.vue → Return to form
<NuxtLink to="/ai-test-form-v2">
```

> **Lesson learned**: "You need to understand the connection relationships between screens too" — Implementing individual screens only results in missing navigation.

---

### 2. Figma → Code Implementation Procedure

When implementing Figma screens in code, do not guess from screenshots only and **follow the order below**.

#### 2.1 Node Tree Extraction (Common, Never Skip)

Extract the **entire structure programmatically** with `figma_execute` for the target node.

Properties to extract:
- `layoutMode` (VERTICAL / HORIZONTAL / NONE)
- `itemSpacing` (gap)
- `paddingTop / Right / Bottom / Left`
- `width`, `height`, `layoutSizingHorizontal`, `layoutSizingVertical` (FILL / HUG / FIXED)
- `visible` (hidden status)
- `cornerRadius`
- `fills` (including color binding variables)
- **`fills[0].type`** (SOLID / IMAGE / GRADIENT, etc. — **required for image node identification**)
- **`fills[0].imageHash`** (exists if image fill)
- `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`
- `characters` (text content)
- `componentProperties` (properties of component instances — Placeholder text, State, Type, etc.)

```js
// Example: Extract node tree with figma_execute (must use async/await)
const node = await figma.getNodeByIdAsync("3:1369");
if (!node) return 'Node not found';

function extract(n, depth = 0) {
  if (depth > 5) return { name: n.name, type: n.type }; // depth limit required
  const info = {
    name: n.name, type: n.type, visible: n.visible,
    layoutMode: n.layoutMode, itemSpacing: n.itemSpacing,
    padding: [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft],
    width: n.width, height: n.height,
    sizingH: n.layoutSizingHorizontal, sizingV: n.layoutSizingVertical,
  };
  // Extract type + color + opacity from fills (symbol check)
  if ('fills' in n && typeof n.fills !== 'symbol') {
    const visibleFills = n.fills?.filter(f => f.visible !== false);
    if (visibleFills?.length > 0) {
      const f = visibleFills[0];
      info.fillType = f.type; // 'SOLID', 'IMAGE', 'GRADIENT', etc.
      if (f.type === 'IMAGE') {
        info.isImageNode = true; // ⚠️ Not an HTML/CSS implementation target → Handle as image file
        info.imageHash = f.imageHash;
      } else if (f.type === 'SOLID' && f.color) {
        info.fill = `rgb(${Math.round(f.color.r*255)},${Math.round(f.color.g*255)},${Math.round(f.color.b*255)})`;
        info.fillOpacity = f.opacity; // Need rgba() if less than 1.0
      }
    }
  }
  // cornerRadius (symbol check)
  if ('cornerRadius' in n && typeof n.cornerRadius !== 'symbol') {
    info.cornerRadius = n.cornerRadius;
  }
  // Text node
  if (n.type === 'TEXT') {
    info.characters = n.characters;
    info.fontSize = n.fontSize;
    info.fontWeight = n.fontName?.style;
  }
  // Extract properties if component instance
  if (n.type === 'INSTANCE') {
    info.componentProperties = n.componentProperties;
  }
  // Recursive children traversal
  if ('children' in n) {
    info.children = n.children.map(c => extract(c, depth + 1));
  }
  return info;
}
return extract(node, 0);
```

> **Practical tips:**
> - `strokes` property often causes symbol errors during serialization. Extract needed values (color, weight) first into separate variables before returning.
> - Traversing too deep at once will timeout. Set depth limit (5-6) and traverse needed child nodes with separate calls.
> - Figma designs may have mixed **template/placeholder text** (e.g., English placeholder in Korean design). Implement based on the format of main areas.

> **Why is this required:** With screenshots alone, you can't know exact values for gap, padding, layoutMode, etc., leading to multiple revision cycles.

> ⚠️ **Common Mistakes (Must Know):**
> ```
> ❌ Looking at screenshot only and guessing "it's probably this structure" for implementation
> ❌ Missing fixed width container (wrapper)
> ❌ Ignoring Figma's intermediate frame layers
> ```
> **Actual case:**
> - Figma: `main area > Frame 773 (width: 1100px) > content`
> - Wrong implementation: `content-area > content` (1100px wrapper missing)
> - Result: Content area renders wider than Figma
>
> **Lesson**: "Why is the content area so wide?" → Implemented from screenshot only without node tree extraction. **"Never skip" really means never skip.**

**Figma componentProperties → Vue props Mapping:**

| Figma `componentProperties` key | Vue component prop / HTML attr | Note |
|--------------------------------|-------------------------------|------|
| `Placeholder text#...` | `placeholder="value"` | input/textarea |
| `State#...` | Conditional class or `:class` binding | State branching like active, disabled |
| `Type#...` | prop or HTML `type` attribute | Determines component variant |
| Other custom keys | Check project-specific component props | Extract key list with `figma_execute` and map |

**⚠️ Image Node Identification and Handling (Required Check):**

If `isImageNode: true` or `fillType: 'IMAGE'` is found in node tree extraction results, **do not implement with HTML/CSS.**

| Extraction Result | Meaning | Handling Method |
|-------------------|---------|-----------------|
| `fillType: 'IMAGE'` | Node with image fill applied | **Export as image file** |
| `fillType: 'SOLID'` + has children | Normal container | Implement with HTML/CSS |
| `type: 'TEXT'` | Text element | Implement as HTML text |

**Image Node Handling Procedure:**
1. Select the node in Figma and `Export` (PNG/SVG)
2. Save to project's `assets/imgs/` folder
3. Use `<img src="~/assets/imgs/filename.png" />` in Vue

> ⚠️ **Common Mistakes (Must Know):**
> ```
> ❌ Looking at screenshot only and guessing "this is a card component" → Implement with v-for loop
> ❌ Skipping fillType check → Re-implementing image as HTML/CSS
> ```
> **Actual case:**
> - Figma: `RECTANGLE` + `fills[0].type: 'IMAGE'` (doctor card image)
> - Wrong implementation: v-for + doctor-card component (HTML/CSS)
> - Result: Different layout from design, unnecessary code complexity
>
> **Lesson**: "Why did you implement the image with code?" → Didn't check `fills[0].type`. **fillType check during node tree extraction is required.**

#### 2.2 Figma Property → CSS Property Mapping (Common)

Follow the mapping below when converting Figma node properties to CSS.

| Figma Property | CSS Property | Notes |
|----------------|--------------|-------|
| `layoutMode: HORIZONTAL` | `display: flex; flex-direction: row;` or `display: grid` | Specify `grid-template-columns` when using grid |
| `layoutMode: VERTICAL` | `display: flex; flex-direction: column;` | |
| `itemSpacing` | `gap` | Use Figma px value directly |
| `paddingTop/Right/Bottom/Left` | `padding` | Shorthand order: top right bottom left |
| `cornerRadius` | `border-radius` | Symbol check required for mixed values |
| `fills[0].color` (opacity 1) | **Source A:** CSS variable (`var(--dg500)`, `var(--gray100)`, etc.) / **Source B:** Tailwind class (`bg-{token}`) or CSS variable (`var(--dt-color-*)`) | Token mapping first, `#hex` hardcoding as last resort |
| `fills[0].color` (opacity < 1) | **Source A:** `background-color: rgba(r, g, b, opacity)` / **Source B:** Tailwind `bg-{token}/{opacity}` or inline `rgba()` | **Always check Figma opacity** |
| `strokes` | `border` | Note strokeWeight, strokeAlign (inside/outside/center) |
| `primaryAxisAlignItems` | `justify-content` (based on flex-direction: row) | MIN→flex-start, CENTER→center, MAX→flex-end, SPACE_BETWEEN→space-between |
| `counterAxisAlignItems` | `align-items` | MIN→flex-start, CENTER→center, MAX→flex-end |
| `layoutGrow: 1` | `flex: 1` | FILL container behavior |
| `layoutSizingHorizontal: FILL` | `width: 100%` or `flex: 1` | Determined by parent layout |
| `layoutSizingVertical: FILL` | `height: 100%` or `flex: 1` | Determined by parent layout |

**Figma opacity → CSS rgba Conversion:**
```scss
// Figma: color { r: 0.949, g: 0.949, b: 0.949 }, opacity: 0.3
// → CSS: rgba(242, 242, 242, 0.3)
// Calculation: r * 255 = 242, g * 255 = 242, b * 255 = 242
background-color: rgba(242, 242, 242, 0.3);
```

> **Important:** If Figma fills `opacity` value is less than 1.0, you must use `rgba()` in CSS. `var(--token)` CSS variables do not include opacity, so hardcoded `rgba()` must be used when opacity exists.

> ⚠️ **Common Mistakes (Must Know):**
> ```scss
> // ❌ Using CSS variable without checking opacity
> background-color: var(--gray50);  // Figma opacity: 0.3 ignored → Renders opaque
>
> // ✅ Using rgba() after checking opacity
> background-color: rgba(242, 242, 242, 0.3);  // Figma opacity reflected
> ```
> **Lesson**: "Why is the background darker than Figma?" → Didn't check `fills[0].opacity`. **Always check opacity value before applying color.**

#### 2.3 Figma Variable → Design System Token Mapping Table (A/B Branch)

**Resolve the actual value of Figma variables** bound to nodes with `figma_execute`, then 1:1 map with design system tokens.

```js
// Example: Resolve variable value (must use async)
const fills = node.fills;
if (fills[0]?.boundVariables?.color) {
  const varId = fills[0].boundVariables.color.id;
  const variable = await figma.variables.getVariableByIdAsync(varId);
  // variable.resolveForConsumer() → Check actual HEX value
}
```

**Source A (existing repo SCSS):**

| Figma Variable | Actual Value | CSS Variable (`_color.scss`) | Usage Example |
|----------------|--------------|------------------------------|---------------|
| dg500 | #2fd096 | `var(--dg500)` | `color: var(--dg500);` |
| gray100 | #f2f2f2 | `var(--gray100)` | `background-color: var(--gray100);` |

> If mapping doesn't match, **modify SCSS variables in `_color.scss` before writing code**.

**Source B (new package Tailwind):**

| Figma Variable | Actual Value | CSS Variable | Tailwind Class |
|----------------|--------------|--------------|----------------|
| accent | #f5f5f5 | `--accent: 0 0% 96%` | `bg-accent` |
| foreground | #1a1a2e | `--foreground: 240 33% 14%` | `text-foreground` |

> If mapping doesn't match, **modify CSS variables in `index.css` and rebuild design system before writing code**.

#### 2.4 Figma px → SCSS Conversion (Source A Only)

In SCSS projects, **write Figma's px values directly in CSS**. No Tailwind conversion needed.

```scss
// Figma: padding 16 20 16 20, gap 12, cornerRadius 16
.waiting-item {
  padding: 16px 20px;
  gap: 12px;              // itemSpacing → gap
  border-radius: 16px;    // cornerRadius → border-radius
}
```

**Figma fontSize/fontWeight → mixin Mapping Order:**
1. Find a mixin in `_mixin.scss` that **exactly matches fontSize + fontWeight combination**.
2. If exact match, use only `@include mixinName;`.
3. If no exact match, `@include` a mixin with same fontSize and override only `font-weight`.

```scss
// Figma: 12px Medium (weight 500)
// _mixin.scss has label2SemiBold (12px/600) → include then override weight
.time-label {
  @include label2SemiBold;
  font-weight: 500;
}

// Figma: 16px SemiBold (weight 600)
// _mixin.scss has body2Medium (16px/500) → include then override weight
.today-button {
  @include body2Medium;
  font-weight: 600;
}
```

#### 2.5 Figma px → Tailwind Class Conversion Rules (Source B Only)

Figma's spacing values (padding, gap, margin, etc.) are in **px units**. Tailwind spacing classes use a **value × 4px** system, so you must convert by **÷ 4**.

| Figma (px) | Calculation | Tailwind Class |
|------------|-------------|----------------|
| 4px | 4 ÷ 4 = 1 | `p-1`, `gap-1` |
| 8px | 8 ÷ 4 = 2 | `p-2`, `gap-2` |
| 12px | 12 ÷ 4 = 3 | `p-3`, `gap-3` |
| 16px | 16 ÷ 4 = 4 | `p-4`, `gap-4` |
| 24px | 24 ÷ 4 = 6 | `p-6`, `gap-6` |
| 28px | 28 ÷ 4 = 7 | `p-7`, `gap-7` |
| 32px | 32 ÷ 4 = 8 | `p-8`, `gap-8` |
| 36px | 36 ÷ 4 = 9 | `p-9`, `gap-9` |
| 40px | 40 ÷ 4 = 10 | `p-10`, `gap-10` |

> **Note:** Don't use `pb-12` (48px) for Figma `paddingBottom: 12`. `pb-3` (12px) is correct. Don't directly substitute Figma values into Tailwind numbers.

#### 2.6 CSS Safelist Check (Source B Only)

When design system is built with Vite library mode, **unused Tailwind classes are not included in dist/styles.css.**

The following patterns are highly likely not in safelist, so **write as inline styles**:

| Tailwind Class (doesn't work) | Inline Style Alternative |
|------------------------------|--------------------------|
| `min-h-screen` | `style="min-height: 100vh"` |
| `flex-1` | `style="flex: 1"` |
| `max-w-screen-2xl` | `style="max-width: 1536px"` |
| `gap-[60px]` (arbitrary value) | `style="gap: 60px"` |
| `w-full` (depends on context) | `style="width: 100%"` |

> **Rule:** If Tailwind class doesn't work after applying, switch to inline style before checking DevTools.

#### 2.7 Nuxt Page Setup Checklist (Common)

**Must check** when creating new pages in Nuxt projects:

- [ ] `definePageMeta({ layout: false })` — Whether to remove default layout (header/sidebar, etc.)
- [ ] Add path to `publicPaths` array in `middleware/auth.global.ts` — If page needs to be accessed without authentication
- [ ] Call `definePageMeta` in separate `<script setup>` block (separate from Options API `<script>` block)

#### 2.8 Hidden Element Handling (Common)

- Nodes with `visible: false` in Figma should be hidden in code.
  - **Source A:** Project utility class or apply `display: none` directly
  - **Source B:** Apply Tailwind `hidden` class
- Always check `visible` property during node tree extraction.

---

### 3. Visual Verification Loop (Required After Implementation)

> For detailed content, refer to **[VERIFICATION.md - Visual Verification Loop](./VERIFICATION.md#3-visual-verification-loop-figma-based)**.

After code implementation, you must execute the comparison-modification loop from `VERIFICATION.md`.

---

## Figma Screen Creation Guide (Code → Figma)

구현된 화면을 Figma 내에서 프로그래밍으로 재현할 때의 가이드. `figma_execute`를 통해 프레임, 텍스트, 컴포넌트를 생성하고 라이브러리 스타일/컴포넌트를 바인딩하는 과정을 다룬다.

> **방향 주의:** 기존 "Figma Design Request" 섹션은 **Figma → Code** 방향이고, 이 섹션은 **Code → Figma** 방향이다.

---

### 0. When to Use

- 구현 완료된 화면을 Figma에 디자인 산출물로 남겨야 할 때
- 디자이너에게 전달할 UI 상태별 프레임(asking, input, error 등)을 생성할 때
- Playwright 스크린샷을 참고하여 Figma 프레임으로 재현할 때

---

### 1. Frame Creation Basics

#### 1.1 Section 컨테이너 우선 생성

Figma에서 프레임을 생성할 때 **빈 캔버스에 바로 배치하지 않는다.** 반드시 Section 또는 상위 Frame 안에 배치한다.

```js
// Section 찾기 또는 생성
let section = figma.currentPage.findOne(
  n => n.type === 'SECTION' && n.name === 'Components'
);
if (!section) {
  section = figma.createSection();
  section.name = 'Components';
  section.x = 0;
  section.y = 0;
}

// 프레임을 Section 안에 배치
const frame = figma.createFrame();
section.appendChild(frame);
```

#### 1.2 Frame Resize 순서 (Critical)

`resize()` 호출 시 높이를 너무 작게 설정하면(예: 1px) Auto Layout이 적용되어도 확장되지 않는다.

```js
// ❌ WRONG: 1px 높이로 resize 후 AUTO 설정 → 프레임이 1px로 유지됨
frame.resize(480, 1);
frame.primaryAxisSizingMode = 'AUTO';

// ✅ CORRECT: 충분한 높이로 resize 후 AUTO 설정
frame.resize(480, 200);
frame.primaryAxisSizingMode = 'AUTO'; // 이후 콘텐츠에 맞게 줄어듦
```

> **Lesson learned**: "프레임이 가로 선처럼 보인다" → `resize(width, 1)` 후 `primaryAxisSizingMode = 'AUTO'`를 설정해도 1px에서 확장되지 않음. 초기 높이를 200px 이상으로 설정한 뒤 AUTO로 전환해야 함.

---

### 2. Auto Layout Sizing Rules

Figma Plugin API의 sizing 관련 enum 값은 코드에서 사용하는 용어와 다르다.

#### 2.1 primaryAxisSizingMode / counterAxisSizingMode

| 속성 | 허용 값 | 의미 |
|------|--------|------|
| `primaryAxisSizingMode` | `'FIXED'` \| `'AUTO'` | `'AUTO'` = Hug contents (콘텐츠에 맞춤) |
| `counterAxisSizingMode` | `'FIXED'` \| `'AUTO'` | `'AUTO'` = Hug contents |

```js
// ❌ WRONG: 'HUG', 'FILL' 은 유효하지 않은 값
frame.primaryAxisSizingMode = 'HUG';  // Error!
frame.counterAxisSizingMode = 'FILL'; // Error!

// ✅ CORRECT
frame.primaryAxisSizingMode = 'AUTO';  // = Hug contents
frame.counterAxisSizingMode = 'AUTO';  // = Hug contents
```

#### 2.2 Fill Container 구현

자식 요소가 부모의 cross axis를 채우게 하려면(Fill container), **부모가 아닌 자식**에서 `layoutAlign = 'STRETCH'`를 설정한다.

```js
// ❌ WRONG: 부모에서 counterAxisSizingMode = 'FILL' 설정
parent.counterAxisSizingMode = 'FILL'; // Error!

// ✅ CORRECT: 자식에서 layoutAlign = 'STRETCH' 설정
child.layoutAlign = 'STRETCH';

// 부모는 AUTO로 설정
parent.counterAxisSizingMode = 'AUTO';
```

#### 2.3 layoutSizingHorizontal / layoutSizingVertical

개별 노드의 sizing은 `layoutSizingHorizontal`과 `layoutSizingVertical`로 설정한다.

```js
// 자식이 부모의 가로를 채우도록
child.layoutSizingHorizontal = 'FILL';

// 자식이 콘텐츠에 맞추도록
child.layoutSizingVertical = 'HUG';
```

> **주의:** `layoutSizingHorizontal/Vertical`는 `'FILL'` | `'HUG'` | `'FIXED'`를 허용하지만, `primaryAxisSizingMode/counterAxisSizingMode`는 `'FIXED'` | `'AUTO'`만 허용한다. 혼동하지 않도록 주의.

---

### 3. Library Paint Style Binding

이 프로젝트의 Figma 파일은 **paint styles**(칠 스타일)을 사용한다. Variables(변수)가 아님에 주의.

#### 3.1 스타일 바인딩은 반드시 Async 메서드 사용

dynamic-page 모드(incremental mode)에서는 직접 할당이 불가하다.

```js
// ❌ WRONG: 직접 할당 → "Cannot call with documentAccess: dynamic-page" 에러
node.fillStyleId = styleId;

// ✅ CORRECT: Async 메서드 사용
await node.setFillStyleIdAsync(styleId);
await node.setStrokeStyleIdAsync(styleId);
```

#### 3.2 라이브러리 스타일 탐색 방법

`figma.teamLibrary` API는 제한적이므로, **기존 노드에서 스타일 ID를 수집**하는 방법이 가장 신뢰적이다.

```js
// 페이지 내 모든 노드를 순회하며 사용 중인 paint style 수집
const styles = new Map();
figma.currentPage.findAll(n => {
  if (n.fillStyleId && typeof n.fillStyleId === 'string') {
    const style = figma.getStyleById(n.fillStyleId);
    if (style) styles.set(style.name, style.id);
  }
  if (n.strokeStyleId && typeof n.strokeStyleId === 'string') {
    const style = figma.getStyleById(n.strokeStyleId);
    if (style) styles.set(style.name, style.id);
  }
  return false;
});
return Object.fromEntries(styles);
```

#### 3.3 이름으로 매칭 실패 시 RGB 값으로 매칭

일부 노드는 이름이 "Frame"처럼 범용적이어서 이름 기반 매칭이 불가능하다. 이 경우 **RGB 색상 값으로 매칭**한다.

```js
// RGB 값으로 가장 가까운 스타일 찾기
function findStyleByColor(r, g, b, styleMap) {
  for (const [name, style] of styleMap) {
    const paint = style.paints[0];
    if (paint?.type === 'SOLID') {
      const dr = Math.abs(paint.color.r - r);
      const dg = Math.abs(paint.color.g - g);
      const db = Math.abs(paint.color.b - b);
      if (dr < 0.01 && dg < 0.01 && db < 0.01) return style.id;
    }
  }
  return null;
}
```

#### 3.4 바인딩 검증

모든 노드의 스타일 바인딩이 완료되었는지 검증한다.

```js
// 바인딩되지 않은 SOLID fill 노드 찾기
const unbound = [];
figma.currentPage.findAll(n => {
  if ('fills' in n && typeof n.fills !== 'symbol') {
    const solidFills = n.fills.filter(f => f.type === 'SOLID' && f.visible !== false);
    if (solidFills.length > 0 && !n.fillStyleId) {
      unbound.push({ id: n.id, name: n.name });
    }
  }
  return false;
});
return { unboundCount: unbound.length, nodes: unbound };
```

> **Lesson learned**: "아직 바인딩 안 된 컬러들이 있어" → 첫 패스에서 이름 기반 매칭만 했더니 "Frame" 같은 범용 이름 노드 16개가 누락됨. RGB 값 기반 2차 패스로 해결.

---

### 4. Library Component Instantiation

#### 4.1 `importComponentByKeyAsync` 실패 대응

라이브러리 컴포넌트를 key로 가져오는 API가 실패할 수 있다 ("Could not find published component").

```js
// ❌ 실패할 수 있음
const component = await figma.teamLibrary.importComponentByKeyAsync(componentKey);

// ✅ 대안: 페이지 내 기존 인스턴스를 찾아서 clone
const existingInstance = figma.currentPage.findOne(
  n => n.type === 'INSTANCE' && n.name.includes('Text Button')
);
if (existingInstance) {
  const clone = existingInstance.clone();
  targetFrame.appendChild(clone);
}
```

#### 4.2 컴포넌트 검색

```js
// 페이지 내 INSTANCE 노드 검색
const instances = figma.currentPage.findAll(n => n.type === 'INSTANCE');
return instances.map(n => ({
  id: n.id,
  name: n.name,
  componentProperties: n.componentProperties,
}));
```

#### 4.3 인스턴스 속성 변경

클론한 인스턴스의 텍스트나 속성을 변경할 때:

```js
const clone = existingInstance.clone();

// 텍스트 변경: 자식 TEXT 노드를 찾아서 수정
const textNode = clone.findOne(n => n.type === 'TEXT');
if (textNode) {
  await figma.loadFontAsync(textNode.fontName);
  textNode.characters = '완료';
}

// 컴포넌트 속성 변경
clone.setProperties({ 'State': 'Default', 'Size': '36' });
```

> **Lesson learned**: "`importComponentByKeyAsync`로 컴포넌트를 가져올 수 없다" → 라이브러리 publish 상태에 따라 실패할 수 있음. 페이지 내 기존 인스턴스를 clone하는 방식이 가장 안정적.

---

### 5. Color Binding Verification Checklist

Figma 화면 생성 후 아래 항목을 반드시 검증한다:

- [ ] 모든 SOLID fill 노드에 paint style이 바인딩되어 있는가
- [ ] 모든 stroke 노드에 paint style이 바인딩되어 있는가
- [ ] 로컬 변수(Variable)를 불필요하게 생성하지 않았는가 (라이브러리 스타일 사용이 원칙)
- [ ] 라이브러리 컴포넌트가 존재하는 UI 요소(버튼 등)는 인스턴스로 교체되었는가
- [ ] 프레임 auto layout sizing이 의도대로 작동하는가

---

### Summary: Common Mistakes & Solutions

| 실수 | 원인 | 해결 |
|------|------|------|
| 프레임이 1px 선으로 렌더링 | `resize(w, 1)` 후 `primaryAxisSizingMode = 'AUTO'` | 초기 높이를 200px 이상으로 설정 |
| `'HUG'` 또는 `'FILL'` 에러 | `primaryAxisSizingMode`에 잘못된 enum 사용 | `'AUTO'` (hug) 또는 `'FIXED'` 만 사용 |
| Fill container 미작동 | 부모에 `counterAxisSizingMode = 'FILL'` 시도 | 자식에 `layoutAlign = 'STRETCH'` 설정 |
| `fillStyleId` 할당 에러 | dynamic-page 모드에서 직접 할당 | `setFillStyleIdAsync()` 사용 |
| 스타일 바인딩 누락 | 이름 기반 매칭만 수행 | RGB 값 기반 2차 매칭 추가 |
| 컴포넌트 import 실패 | `importComponentByKeyAsync` 실패 | 기존 인스턴스 clone으로 대체 |
| 로컬 변수 잘못 생성 | 라이브러리가 paint styles 사용 중인데 variables 생성 | 기존 노드에서 paint style 수집 후 바인딩 |

---

## Other Guidelines

- This section should **only be checked when explicitly instructed to refer to it** from other sections.
- Unless otherwise instructed, do not read or apply these guidelines in advance.

---

### 1. Figma console MCP Pre-connection Guide

`figma-console` MCP connects directly to Figma Desktop app to enable tools like `figma_execute`, `figma_capture_screenshot`.

> **Principle:** Agent directly performs automatable steps, and only guides user through manual steps that can only be done in Figma UI.

#### 1.1 Connection Check (Automated)

```bash
claude mcp list
```

- If `figma-console: ✓ Connected` appears in output → Do not proceed with this guide.
- If not → Follow the procedure below.

---

#### 1.2 `.mcp.json` Registration (Automated)

Agent checks if `figma-console` configuration exists in project root's `.mcp.json` file, and **registers it directly if not**.

```bash
# Check .mcp.json
cat .mcp.json 2>/dev/null || echo "NOT_FOUND"

# Register if configuration doesn't exist
claude mcp add -s project figma-console -- npx -y figma-console-mcp --mode local
```

After registration, **Claude Code session must be restarted** for MCP server to load.

Expected `.mcp.json` configuration:
```json
{
  "mcpServers": {
    "figma-console": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "figma-console-mcp", "--mode", "local"],
      "env": {}
    }
  }
}
```

---

#### 1.3 Figma Desktop Restart (Automated)

`figma-console-mcp` local mode connects to Figma Desktop via Chrome Remote Debugging Protocol.
**Normal execution won't connect**, you must open the debugging port.

> **Key Note:** If you run `open -a "Figma" --args --remote-debugging-port=9222` while Figma is already running, **the existing process is maintained** and the flag won't be applied. You must **completely quit and restart**.

Agent **executes the following commands in order**:

```bash
# 1. Force quit Figma
pkill -9 -f "Figma"

# 2. Wait 3 seconds then restart with debugging port
sleep 3 && open -a "Figma" --args --remote-debugging-port=9222

# 3. Wait 5 seconds then verify port (JSON response means success)
sleep 5 && curl -s http://localhost:9222/json/version
```

- If JSON response comes → Proceed to next step
- If no response or error → Retry procedure from beginning

---

#### 1.4 Desktop Bridge Plugin Installation (Automated + Manual)

Core tools like `figma_execute`, `figma_capture_screenshot` require **Desktop Bridge plugin** to be running in Figma.
This plugin is **not in Figma Community**, must be manually imported from GitHub repository.

> **Note:** MCP server connection (`figma_get_status` success) and Desktop Bridge plugin are **separate**.
> Even if MCP server is connected, `figma_execute` call will return "Desktop Bridge plugin not found" error if plugin is not running.

**Automated Steps** (Agent performs directly):

```bash
# 1. Clone if repository doesn't exist
ls /tmp/figma-console-mcp/figma-desktop-bridge/manifest.json 2>/dev/null || \
  git clone https://github.com/southleft/figma-console-mcp.git /tmp/figma-console-mcp
```

After cloning, re-verify `manifest.json` existence. If not present, attempt automated recovery in the following order:

```bash
# 2. Re-verify
ls /tmp/figma-console-mcp/figma-desktop-bridge/manifest.json 2>/dev/null || \
  echo "CLONE_FAILED"
```

**`CLONE_FAILED` Automated Recovery Procedure:**

1. **Retry**: Delete existing folder and clone again.
   ```bash
   rm -rf /tmp/figma-console-mcp
   git clone https://github.com/southleft/figma-console-mcp.git /tmp/figma-console-mcp
   ```

2. **ZIP Download (alternative if git fails)**: Download ZIP with `curl` and extract.
   ```bash
   curl -L https://github.com/southleft/figma-console-mcp/archive/refs/heads/main.zip -o /tmp/figma-console-mcp.zip
   unzip -o /tmp/figma-console-mcp.zip -d /tmp
   mv /tmp/figma-console-mcp-main /tmp/figma-console-mcp
   ```

3. **User Guidance (only if all above fail)**: Guide user only when automated recovery is impossible:
   → `Desktop Bridge plugin repository download failed. Please manually download the https://github.com/southleft/figma-console-mcp repository and let me know the figma-desktop-bridge folder location.`
   - Once user provides the path, use the `manifest.json` at that path to guide subsequent manual steps.

**Manual Steps** (Guide to user):

Agent delivers the following content to user:

1. Open the file to work on in Figma Desktop.
2. Click **Plugins** → **Development** → **Import plugin from manifest...**.
3. Select `manifest.json` in file selection dialog:
   - Press `Cmd + Shift + G` in Finder.
   - Paste the following path and press Enter:
     ```
     /private/tmp/figma-console-mcp/figma-desktop-bridge
     ```
   - Select `manifest.json` → **Open**
   > On macOS, `/tmp` is a symbolic link to `/private/tmp`, so you need to access via `/private/tmp` in Finder.

4. After import, **right-click** in that file → **Plugins** → **Development** → **Figma Desktop Bridge** to run.
   - When executed, a small popup UI with "MCP ready" indicator appears.
   - **Do not close this UI window.** `figma_execute` only works when UI is open.

> **Note:** Plugin must be executed in the **target work file**.
> If multiple file tabs are open, MCP may connect to a different tab, so run the plugin with **only the target file open** and call `figma_reconnect`.

**Verification Method:**

- After plugin execution, call `figma_execute` to verify normal response.
  ```js
  // Test code
  return { nodeCount: figma.currentPage.children.length };
  ```
- If "Desktop Bridge plugin not found" error appears, plugin is not running, so perform manual step 4 again.

---

#### 1.5 Connection Verification

1. Restart Claude Code session.
2. Call `figma_get_status` tool to check connection status.
   - `setup.valid: true` + `debugPortAccessible: true` → MCP server connection success
   - **⚠️ Note:** This alone is insufficient. Must perform step 3.
3. **Check `currentFileName` field (Important):**
   - Actual filename displayed (e.g., `"[Shared] Reservation Home Enhancement"`) → Desktop Bridge plugin normal
   - `"(Desktop Bridge not running - file name unavailable)"` → **Plugin not running**
4. **Test actual connection with `figma_execute` (Required):**
   ```js
   return { nodeCount: figma.currentPage.children.length, fileName: figma.root.name };
   ```
   - Normal response → Connection complete
   - Error occurs → Process checklist below in order
5. If connection fails, check the following **in order**:

   | Order | Check Item | Verification Method | Action |
   |-------|-----------|---------------------|--------|
   | 1 | Is debugging port open? | `curl -s http://localhost:9222/json/version` | Agent performs **1.3 Automated Restart** |
   | 2 | Was Figma launched with flag? | `pgrep -fl Figma` | Agent performs **1.3 Automated Restart** |
   | 3 | Is `.mcp.json` configuration correct? | Check `.mcp.json` file | Agent performs **1.2 Automated Registration** then restart session |
   | 4 | Is Desktop Bridge plugin running? | Test with `figma_execute` | Guide user through **1.4 Manual Steps** |

> **Common mistake:** Even if `figma_get_status` shows `setup.valid: true`, `figma_execute` will fail if Desktop Bridge plugin is not running. Always verify with `currentFileName` and `figma_execute` test.

---

#### 1.6 Notes

- `figma-console-mcp` **does not require Figma API Key** (local mode).
- However, `figma_take_screenshot` is REST API based so **FIGMA_ACCESS_TOKEN is separately required**. Use `figma_capture_screenshot` for local screenshots.
- **Image size limit:** Images returned from all screenshot tools (`figma_capture_screenshot`, `figma_take_screenshot`) must be **8000px or less** in width/height. Always use `scale=1` or lower for large frame captures, and capture regions separately if needed.
- When Figma Desktop session ends, MCP connection also disconnects, so if you restart Figma, you must also restart Claude Code.
- Desktop Bridge plugin runs **per file**. If you move to a different file, you must run the plugin again in that file.
- **Multiple tabs warning:** If multiple file tabs are open in Figma, MCP may connect to a different tab causing `figma_execute` to fail. Close tabs other than target file and call `figma_reconnect`.
- `.mcp.json` is a project-level configuration, so to use in another project, you must register the same way in that project.

---

### 2. Playwright MCP Visual Verification Guide

`playwright` MCP provides headless browser automation via tools like `browser_navigate`, `browser_screenshot`, `browser_evaluate`. Use this for visual verification of page layouts after implementation changes.

> **Principle:** Agent automates navigation, cookie setup, and screenshot capture end-to-end. No manual browser interaction required.

#### 2.1 Connection Check (Automated)

```bash
claude mcp list
```

- If `playwright: ✓ Connected` appears → Ready to use.
- If not → Follow 2.2 below.

#### 2.2 `.mcp.json` Registration & Browser Install

`.mcp.json` configuration should already exist in the project root (see below). If missing, register via:

```bash
claude mcp add -s project playwright -- npx -y playwright-mcp
```

> **Important:** The package name is `playwright-mcp`. Do **not** use `@anthropic-ai/mcp-server-playwright` or other variants.

Expected `.mcp.json` entry:
```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "playwright-mcp"],
      "env": {}
    }
  }
}
```

After registration, install the Chromium browser binary:

```bash
npx playwright install chromium
```

Restart Claude Code session for the MCP server to load.

#### 2.3 Viewport Configuration

The default Playwright viewport width is **1200px**, which falls in the **tablet breakpoint** (max-width: 1080px — 1280px) for this project. At this width, desktop-only components such as **ServiceLNB** are hidden.

Always set viewport to **1440×900** before navigating to verify desktop layouts:

```
browser_set_viewport({ width: 1440, height: 900 })
```

| Breakpoint | Width Range | Notes |
|------------|-------------|-------|
| Desktop | ≥ 1081px | LNB visible, settings sidebar active |
| Tablet | 781–1080px | LNB hidden, mobile menu used |
| Mobile | ≤ 780px | Single column layout |

#### 2.4 Auth Bypass (Settings Pages)

Settings pages (`/settings/**`) require authenticated cookies to render content. The Playwright MCP does **not** expose `page.context.addCookies()` — cookie injection must be done via `browser_evaluate` after an initial navigation to the target origin.

**Procedure:**

1. Navigate to the local dev server root first (to establish the origin):
   ```
   browser_navigate({ url: "http://localhost:3000" })
   ```

2. Set all required cookies via `document.cookie` in a single evaluate call:
   ```
   browser_evaluate({
     expression: `
       document.cookie = 'accessToken=<TOKEN>; path=/';
       document.cookie = 'refreshToken=<TOKEN>; path=/';
       document.cookie = 'reservationHospitalUuid=<UUID>; path=/';
       document.cookie = 'reservationUuid=<UUID>; path=/';
       return document.cookie;
     `
   })
   ```

3. Navigate to the target settings page:
   ```
   browser_navigate({ url: "http://localhost:3000/settings/hospital-info" })
   ```

> **Why `document.cookie` instead of `addCookies`?** The Playwright MCP tool set does not expose the browser context's cookie API. `document.cookie` assignment after navigating to the origin is the only reliable method.

#### 2.5 API Route Interception

Settings pages make API calls on mount. Without interception, these return 401/404 errors and the page may render empty or show error states even with valid cookies.

Intercept the following routes and return mock 200 responses before navigating to settings pages:

| Route Pattern | Used By |
|---------------|---------|
| `/v1/hospitals/**` | Hospital info, platform sync pages |
| `/v1/products**` | Product listing page |
| `/emr/**` | EMR platform sync status |

Example (adjust mock payloads as needed for the specific verification goal):
```
browser_route_intercept({
  url: "**/v1/hospitals/**",
  handler: { status: 200, body: "{}" }
})
```

> **Note:** Route interception must be set up **before** `browser_navigate` to the target page. If the page has already loaded and made the request, the intercept will not apply retroactively.

#### 2.6 Available Tools

| Tool | Purpose |
|------|---------|
| `browser_navigate` | Navigate to a URL |
| `browser_screenshot` | Capture full-page or viewport screenshot |
| `browser_evaluate` | Execute JavaScript in the page context (cookie setting, DOM inspection) |
| `browser_set_viewport` | Set browser viewport dimensions |
| `browser_route_intercept` | Intercept network requests with mock responses |
| `browser_get_dom` | Retrieve page DOM for element inspection |

#### 2.7 Notes

- **Cookie values:** Use actual valid token values from a logged-in session. Placeholder values will still trigger auth redirects even if the cookie names are correct.
- **`reservationHospitalUuid` and `reservationUuid`** are required in addition to auth tokens — omitting either causes settings pages to fail silently or redirect.
- **Dev server must be running** (`npm run dev` in `repos/doctalk_front_homepage/`) before using Playwright MCP for local verification.
- If a page renders blank after cookie + intercept setup, check the browser console via `browser_evaluate({ expression: 'JSON.stringify(window.__NUXT__?.state)' })` to inspect Nuxt hydration state.
- `.mcp.json` is project-level — if working in a different repo, register the Playwright MCP in that repo's `.mcp.json` as well.
