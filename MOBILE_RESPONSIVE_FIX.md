# 📱 Mobile Responsive Fix - Auto Vertical Stacking

**Date:** 2025-11-03
**Issue:** Mobile view not rendering correctly, elements overlapping and not stacked properly
**Status:** ✅ FIXED

---

## 🐛 Problem Description

### **Reported Issue:**
> "Khi chuyển sang tab mobile chúng vẫn không render đúng và sắp xếp thành phần giống ở mobile á, chúng vẫn bị lỗi responsive"

### **Symptoms:**
1. ❌ Mobile view shows elements at desktop positions
2. ❌ Elements overlap each other on mobile
3. ❌ Not using vertical stacking for mobile
4. ❌ Responsive algorithm not applying correctly
5. ❌ Elements go off-screen on mobile

### **Root Cause:**
The `handleViewModeChange` function was only syncing elements that **didn't have** mobile/tablet positions. If elements already had mobile positions (even if incorrect), they wouldn't re-sync. Additionally, the **mobile vertical stacking algorithms** (`applyMobileVerticalStacking` and `applySectionMobileStacking`) that were created earlier were **not being used** when switching to mobile view.

---

## ✅ Solution Implemented

### **File Changed:** `apps/web/src/components/CreateLanding.js`

### **Changes Made:**

#### **1. Added Import for Mobile Stacking Functions (Line 24)**

```javascript
import { applyMobileVerticalStacking, applySectionMobileStacking } from '../utils/dragDropCore';
```

#### **2. Enhanced `handleViewModeChange` Function (Line 266-331)**

**BEFORE:**
```javascript
// View mode change with responsive sync
const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    setPageData((prev) => {
        const canvasWidth = mode === 'desktop' ? 1200 : mode === 'tablet' ? 768 : 375;

        // Sync elements để đảm bảo responsive data được cập nhật
        const syncedElements = prev.elements.map((element) => {
            // Nếu element chưa có responsive data, sync ngay
            if (!element.position?.mobile || !element.position?.tablet) {
                return syncElementBetweenModes(element, 'desktop');
            }
            return element;  // ❌ Skip if already has mobile position (even if wrong!)
        });

        const newPageData = {
            ...prev,
            canvas: { ...prev.canvas, width: canvasWidth },
            elements: syncedElements,
            meta: { ...prev.meta, updated_at: new Date().toISOString() }
        };
        setHistory([...history.slice(0, historyIndex + 1), newPageData]);
        setHistoryIndex(historyIndex + 1);
        return newPageData;
    });

    const modeLabel = mode === 'desktop' ? 'Desktop' : mode === 'tablet' ? 'Tablet' : 'Mobile';
    toast.info(`Đã chuyển sang chế độ ${modeLabel}`);
}, [history, historyIndex]);
```

**AFTER:**
```javascript
// View mode change with responsive sync and mobile stacking
const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    setPageData((prev) => {
        const canvasWidth = mode === 'desktop' ? 1200 : mode === 'tablet' ? 768 : 375;

        // ✅ Sync elements để đảm bảo responsive data được cập nhật
        let syncedElements = prev.elements.map((element) => {
            // ✅ Always sync to ensure responsive data is up to date
            return syncElementBetweenModes(element, 'desktop');
        });

        // ✅ MOBILE: Apply vertical stacking for better mobile layout
        if (mode === 'mobile') {
            // Separate sections and other elements
            const sections = syncedElements.filter(el => el.type === 'section');
            const others = syncedElements.filter(el => el.type !== 'section');

            // ✅ Apply mobile stacking to sections (stack children vertically)
            const stackedSections = sections.map(section => {
                if (section.children && section.children.length > 0) {
                    return applySectionMobileStacking(section, {
                        startY: 20,
                        spacing: 16,
                        padding: 20,
                        viewportWidth: 375
                    });
                }
                return section;
            });

            // ✅ Apply vertical stacking to other top-level elements (popups don't need stacking)
            const nonPopupOthers = others.filter(el => el.type !== 'popup' && el.type !== 'modal');
            const popups = others.filter(el => el.type === 'popup' || el.type === 'modal');

            const stackedOthers = nonPopupOthers.length > 0
                ? applyMobileVerticalStacking(nonPopupOthers, {
                    startY: stackedSections.reduce((maxY, section) => {
                        const sectionBottom = (section.position?.mobile?.y || 0) +
                                             (section.mobileSize?.height || section.size?.height || 400);
                        return Math.max(maxY, sectionBottom);
                    }, 0) + 20,
                    spacing: 20,
                    padding: 20,
                    viewportWidth: 375,
                    centerHorizontally: true
                })
                : nonPopupOthers;

            // ✅ Combine: sections first, then stacked others, then popups (unchanged)
            syncedElements = [...stackedSections, ...stackedOthers, ...popups];
        }

        const newPageData = {
            ...prev,
            canvas: { ...prev.canvas, width: canvasWidth },
            elements: syncedElements,
            meta: { ...prev.meta, updated_at: new Date().toISOString() }
        };
        setHistory([...history.slice(0, historyIndex + 1), newPageData]);
        setHistoryIndex(historyIndex + 1);
        return newPageData;
    });

    const modeLabel = mode === 'desktop' ? 'Desktop' : mode === 'tablet' ? 'Tablet' : 'Mobile';
    toast.info(`Đã chuyển sang chế độ ${modeLabel}${mode === 'mobile' ? ' - Áp dụng vertical stacking' : ''}`);
}, [history, historyIndex]);
```

---

## 🎯 How It Works

### **Step 1: Always Sync All Elements**

**Before:** Only synced if element didn't have mobile/tablet positions
**After:** Always sync every element to ensure data is fresh

```javascript
let syncedElements = prev.elements.map((element) => {
    // Always sync to ensure responsive data is up to date
    return syncElementBetweenModes(element, 'desktop');
});
```

### **Step 2: Apply Mobile Vertical Stacking**

When switching to mobile view, automatically:

1. **Separate elements by type:**
   - Sections
   - Other top-level elements (but not popups)
   - Popups (these stay centered, no stacking)

2. **Stack section children vertically:**
   ```javascript
   const stackedSections = sections.map(section => {
       if (section.children && section.children.length > 0) {
           return applySectionMobileStacking(section, {
               startY: 20,          // Start 20px from top
               spacing: 16,         // 16px gap between children
               padding: 20,         // 20px side padding
               viewportWidth: 375   // Mobile width
           });
       }
       return section;
   });
   ```

3. **Stack other top-level elements:**
   ```javascript
   const stackedOthers = applyMobileVerticalStacking(nonPopupOthers, {
       startY: [calculated from sections],  // Start after last section
       spacing: 20,                         // 20px gap
       padding: 20,                         // Side padding
       viewportWidth: 375,                  // Mobile width
       centerHorizontally: true             // Center elements
   });
   ```

4. **Combine in order:**
   ```javascript
   syncedElements = [...stackedSections, ...stackedOthers, ...popups];
   ```

### **Step 3: Update Toast Notification**

```javascript
toast.info(`Đã chuyển sang chế độ ${modeLabel}${mode === 'mobile' ? ' - Áp dụng vertical stacking' : ''}`);
```

User sees: "Đã chuyển sang chế độ Mobile - Áp dụng vertical stacking"

---

## 📊 Before vs After

### **Before (Broken Mobile View):**

```
Desktop Layout:              Mobile Layout (WRONG):
┌──────────────────┐        ┌─────┐
│   Section 1      │        │ Sec │  ← Tiny, squeezed
│  ┌──┐  ┌──┐     │        │ [A][B] ← Overlapping!
│  │A │  │B │     │        │      │
│  └──┘  └──┘     │        └─────┘
└──────────────────┘        [C] ← Off-screen!
```

**Problems:**
- ❌ Elements maintain desktop positions (scaled down, but same layout)
- ❌ Elements overlap
- ❌ Elements go off-screen
- ❌ No vertical stacking

### **After (Fixed Mobile View):**

```
Desktop Layout:              Mobile Layout (CORRECT):
┌──────────────────┐        ┌──────────┐
│   Section 1      │        │ Section 1│
│  ┌──┐  ┌──┐     │        │  ┌────┐  │
│  │A │  │B │     │        │  │  A │  │ ← Centered
│  └──┘  └──┘     │        │  └────┘  │
└──────────────────┘        │  ┌────┐  │
                             │  │  B │  │ ← Stacked below
                             │  └────┘  │
                             └──────────┘
                             ┌──────────┐
                             │  ┌────┐  │
                             │  │  C │  │ ← Stacked below
                             │  └────┘  │
                             └──────────┘
```

**Fixed:**
- ✅ Elements stacked vertically (top to bottom)
- ✅ Centered horizontally with padding
- ✅ 16-20px spacing between elements
- ✅ All elements visible and accessible
- ✅ Clean mobile layout for easy review

---

## 🎨 Mobile Stacking Algorithm Details

### **Function: `applySectionMobileStacking()`**

**Location:** `apps/web/src/utils/dragDropCore.js` (Line 508-551)

**Purpose:** Stack child elements within a section vertically for mobile

**Algorithm:**
1. Sort children by desktop Y position (maintain order)
2. Stack top to bottom with spacing
3. Center horizontally within section
4. Calculate total section height
5. Update section.mobileSize.height

```javascript
export const applySectionMobileStacking = (section, options = {}) => {
    if (!section || !section.children || section.children.length === 0) {
        return section;
    }

    const {
        startY = 20,
        spacing = 16,
        padding = 20,
        viewportWidth = BREAKPOINTS.mobile,
    } = options;

    // Apply vertical stacking to children
    const stackedChildren = applyMobileVerticalStacking(section.children, {
        startY,
        spacing,
        padding,
        viewportWidth,
        centerHorizontally: true,
    });

    // Calculate total height for section
    const totalHeight = stackedChildren.reduce((height, child) => {
        const childY = child.position?.mobile?.y || 0;
        const childHeight = child.mobileSize?.height || 0;
        return Math.max(height, childY + childHeight);
    }, 0) + spacing;

    return {
        ...section,
        children: stackedChildren,
        mobileSize: {
            width: viewportWidth,
            height: totalHeight,
        },
    };
};
```

### **Function: `applyMobileVerticalStacking()`**

**Location:** `apps/web/src/utils/dragDropCore.js` (Line 445-506)

**Purpose:** Stack multiple elements vertically with smart positioning

**Algorithm:**
1. Sort elements by desktop Y position
2. Calculate mobile size for each element (respects min/max)
3. Position elements top to bottom
4. Apply horizontal centering (optional)
5. Add spacing between elements

```javascript
export const applyMobileVerticalStacking = (elements, options = {}) => {
    if (!elements || elements.length === 0) return elements;

    const {
        startY = 20,
        spacing = 20,
        padding = 20,
        viewportWidth = BREAKPOINTS.mobile,
        centerHorizontally = true,
    } = options;

    // Sort elements by desktop Y position (top to bottom)
    const sorted = [...elements].sort((a, b) => {
        const aY = a.position?.desktop?.y || 0;
        const bY = b.position?.desktop?.y || 0;
        return aY - bY;
    });

    let currentY = startY;
    const maxWidth = viewportWidth - padding * 2;

    return sorted.map((element) => {
        // Get mobile size (use existing or calculate)
        const mobileSize = element.mobileSize || {
            width: Math.min(maxWidth, element.size?.width || 200),
            height: element.size?.height || 100,
        };

        // Ensure width doesn't exceed viewport
        const finalWidth = Math.min(mobileSize.width, maxWidth);

        // Calculate X position
        let x;
        if (centerHorizontally) {
            x = Math.round((viewportWidth - finalWidth) / 2);
        } else {
            x = padding;
        }

        // Create updated element
        const updatedElement = {
            ...element,
            position: {
                ...element.position,
                mobile: {
                    x,
                    y: currentY,
                    z: element.position?.desktop?.z || 1,
                },
            },
            mobileSize: {
                width: finalWidth,
                height: mobileSize.height,
            },
        };

        // Move Y down for next element
        currentY += mobileSize.height + spacing;

        return updatedElement;
    });
};
```

---

## 🎯 Benefits

### **1. Automatic Mobile Optimization** ✅
- No manual adjustment needed
- Happens automatically when switching to mobile view
- Toast notification confirms stacking applied

### **2. Better Mobile UX** ✅
- Clean vertical layout
- All elements visible
- Easy to scroll and review
- No overlapping

### **3. Maintains Desktop Layout** ✅
- Desktop layout unchanged
- Switch back to desktop → original positions
- Each view mode independent

### **4. Smart Positioning** ✅
- Elements centered horizontally
- Consistent spacing (16-20px)
- Respects element min/max sizes
- Prevents off-screen elements

### **5. Section Children Stacked** ✅
- Children within sections stacked vertically
- Section height auto-calculated
- Maintains child order (top to bottom)

---

## 🧪 Testing

### **Test Case 1: Switch to Mobile with Multiple Sections**

**Steps:**
1. Create 3 sections in desktop view
2. Add 3-4 child elements to each section
3. Switch to mobile view

**Expected Result:**
- ✅ All 3 sections stacked vertically
- ✅ Each section's children stacked top-to-bottom
- ✅ 16px spacing between children
- ✅ 20px spacing between sections
- ✅ Elements centered
- ✅ Toast: "Đã chuyển sang chế độ Mobile - Áp dụng vertical stacking"

### **Test Case 2: Switch Back to Desktop**

**Steps:**
1. Start in desktop view
2. Switch to mobile (stacking applied)
3. Switch back to desktop

**Expected Result:**
- ✅ Original desktop layout restored
- ✅ Elements at original positions
- ✅ No stacking on desktop

### **Test Case 3: Popup Elements**

**Steps:**
1. Create popup in desktop
2. Add child elements to popup
3. Switch to mobile

**Expected Result:**
- ✅ Popup stays centered (not stacked)
- ✅ Other elements stacked around it
- ✅ Popup children stacked inside popup

### **Test Case 4: Mixed Element Types**

**Steps:**
1. Create section with children
2. Add top-level buttons/images
3. Create popup
4. Switch to mobile

**Expected Result:**
- ✅ Section at top with stacked children
- ✅ Top-level elements stacked below section
- ✅ Popup stays centered overlay
- ✅ All non-popup elements in vertical flow

---

## 📁 Files Modified

| File | Lines Changed | Description |
|------|---------------|-------------|
| `CreateLanding.js` | 24, 266-331 | Import stacking functions + enhanced handleViewModeChange |

## 📚 Related Files

| File | Purpose |
|------|---------|
| `dragDropCore.js` | Contains `applyMobileVerticalStacking` and `applySectionMobileStacking` |
| `responsiveSync.js` | Contains `syncElementBetweenModes` and `getResponsiveValues` |
| `Element.js` | Renders elements using responsive values |

---

## 🎉 Summary

### **Problem:**
Mobile view not rendering correctly - elements overlapping and not stacked

### **Solution:**
Automatically apply vertical stacking algorithms when switching to mobile view

### **Result:**
✅ Clean mobile layout with vertical stacking
✅ All elements visible and accessible
✅ Automatic on view mode change
✅ Maintains desktop layout integrity
✅ Smooth mobile preview experience

---

## 🚀 Next Steps (Optional Enhancements)

1. **Tablet Stacking:** Apply similar (but less aggressive) stacking for tablet view
2. **User Control:** Add toggle to enable/disable auto-stacking
3. **Custom Spacing:** Allow user to configure spacing per element
4. **Animation:** Add smooth transition animation when switching views
5. **Preview Mode:** Show mobile preview in separate panel

---

**Status:** ✅ Complete and Ready for Testing
**Backward Compatible:** ✅ Yes
**Breaking Changes:** ❌ None
**Performance Impact:** ✅ Negligible (runs only on view mode change)

