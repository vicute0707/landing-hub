# 🚀 Popup Quick Start Guide

## Create Your First Popup in 5 Minutes

### ✅ Step 1: Create Popup (30 seconds)

1. Open **Component Library** (left sidebar)
2. Scroll to **Advanced Components**
3. Drag **"Popup"** onto canvas
4. Popup appears (you'll see it when selected)

---

### ✅ Step 2: Add Content to Popup (2 minutes)

**The popup is now selected and visible. Add content:**

1. Drag **"Heading"** into popup body
   - Change text to: "Special Offer!"

2. Drag **"Paragraph"** into popup body
   - Change text to: "Get 50% off your first order today!"

3. Drag **"Button"** into popup body
   - Change text to: "Claim Offer"
   - **Events tab** → Select "Đóng Popup"
   - Select current popup from dropdown

---

### ✅ Step 3: Create Trigger Button (1 minute)

**Go back to your main page section:**

1. Drag new **"Button"** into a section
2. Change text to: "Show Offer"
3. Click **"Sự kiện" tab** in Properties Panel
4. Select **"Mở Popup"** from dropdown
5. Select your popup from **"Chọn Popup"** dropdown

---

### ✅ Step 4: Test & Save (1 minute)

1. Click button in canvas → See toast: "Mô phỏng: Mở popup"
2. Click **Preview** button (top toolbar) to test for real
3. Click **Save** button → HTML exported to S3

---

## 🎯 Result

✅ Button opens popup
✅ Popup shows your content
✅ "Claim Offer" button closes popup
✅ Clicking overlay (dark background) closes popup
✅ X button in header closes popup
✅ HTML exported with working events

---

## 📋 Common Popup Patterns

### **Pattern 1: Newsletter Signup**

**Popup Content:**
- Heading: "Join Our Newsletter"
- Paragraph: "Get weekly tips and exclusive offers"
- Form: Email input
- Button: "Subscribe" (closes popup + submits)
- Button: "No Thanks" (closes popup)

**Trigger:**
- Button in hero section: "Get Free Guide"

---

### **Pattern 2: Video Player**

**Popup Content:**
- Iframe: YouTube video embed

**Trigger:**
- Button with play icon: "Watch Demo"

---

### **Pattern 3: Image Gallery**

**Popup Content:**
- Gallery component with full-size images
- Navigation arrows

**Trigger:**
- Image thumbnail: "View Full Size"

---

### **Pattern 4: Exit Intent**

**Popup Content:**
- Heading: "Wait! Don't Leave Yet"
- Paragraph: "Here's a special discount just for you"
- Button: "Get 20% Off"

**Trigger:**
- JavaScript: Trigger on mouse leave (requires custom code)

---

## ⚡ Event Types Reference

| Event | When to Use | Config |
|-------|-------------|--------|
| **Mở Popup** | Show popup | Select popup ID |
| **Đóng Popup** | Hide popup | Select popup ID |
| **Mở URL** | Navigate to page | Enter URL + new tab option |
| **Gửi Form** | Submit form | API URL + method |
| **Cuộn đến Section** | Smooth scroll | Select section ID |
| **Gọi API** | Custom action | API URL + method |

---

## 🎨 Styling Tips

### **Popup Container:**
- Default width: 600px
- Adjust in popup size properties
- Mobile: Automatically responsive (90vw)

### **Popup Background:**
- Change in popup styles.background
- Supports solid colors and gradients

### **Popup Content:**
- Add any component (heading, image, form, etc.)
- Position absolutely OR use auto-layout
- Full control over child styling

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't see popup | Click on popup element in canvas OR LayerManager |
| Button doesn't open popup | Check Events tab → Verify popup ID is selected |
| Popup content empty | Add child elements by dragging into popup body |
| Can't close popup | Add button with "Đóng Popup" event inside popup |
| Events don't work | Canvas shows simulation only. Test in Preview mode |

---

## 📚 Learn More

- **Full Guide:** See POPUP_AND_EVENTS_GUIDE.md
- **Event System:** EventUtils.js documentation
- **HTML Export:** pageUtils.js documentation

---

## ✅ Checklist

Before deploying your popup:

- [ ] Popup has meaningful title
- [ ] Popup contains all needed content
- [ ] Close button configured (or user can click overlay)
- [ ] Trigger button configured with correct popup ID
- [ ] Tested in Preview mode
- [ ] Popup looks good on mobile (check responsive view)
- [ ] Form submission works (if using form)
- [ ] Page saved successfully

---

**Ready to create amazing popups! 🎉**

