# 📝 Bulk Add Subcategories Feature

## Overview

Enhanced the category management UI to allow creating multiple subcategories at once under a hovedkategori.

---

## 🎯 Features

### 1. New "Legg til flere" Button
- Located in the CategoryCard header, next to the "+" button
- Shows "📝 Legg til flere" (responsive: icon only on mobile)
- Only visible for categories that allow subcategories

### 2. Inline Textarea Input
- Appears when the "Legg til flere" button is clicked
- Blue-tinted background to distinguish from single-add mode
- Multiline textarea with placeholder examples
- Monospaced font for better readability

### 3. Live Feedback
Shows real-time validation:
- ✓ Number of valid subcategories to be created
- ⚠️ Number of duplicates (will be ignored)
- · Number of empty lines

### 4. Smart Parsing
- **One subcategory per line**
- **Ignores empty lines** automatically
- **Ignores duplicates** (case-insensitive):
  - Duplicates within the input
  - Already existing subcategories
- **Preserves original casing** of the input

### 5. Keyboard Shortcuts
- **Esc**: Cancel and close the textarea
- **Ctrl+Enter** (or **Cmd+Enter** on Mac): Save all valid subcategories

### 6. User Feedback
- Save button shows count: "Lagre (5)" when 5 valid items
- Save button disabled if no valid items
- Keyboard shortcut hints displayed at the bottom

---

## 📁 Files Modified

### New File
- `components/ui/textarea.tsx` - shadcn/ui-style textarea component

### Modified Files
- `components/CategoryPage.tsx`
  - Added `BulkAddSubcategories` component
  - Enhanced `CategoryCard` with bulk add functionality
  - Added state management for bulk add mode

---

## 🎨 UI/UX Details

### Visual Design
- **Background**: Blue-tinted (`bg-blue-50`) with blue border
- **Header**: "📝 Legg til flere underkategorier" with close button
- **Textarea**: Minimum height 120px, monospaced font
- **Feedback**: Color-coded (green for valid, orange for warnings, gray for info)
- **Footer**: Keyboard hints on left, action buttons on right

### Responsive Behavior
- On small screens (mobile): Button shows only "📝" icon
- On larger screens: Shows "📝 Legg til flere" full text

### Mutual Exclusivity
- Bulk add and single add modes don't show simultaneously
- Clicking one closes the other automatically

---

## 💡 Usage Examples

### Example 1: Adding Multiple Categories
```
Dagligvarer
Mat ute
Klær
Sko
```
Result: 4 subcategories created

### Example 2: With Duplicates
```
Dagligvarer
Mat ute
dagligvarer
Klær
```
Result: 3 subcategories created (second "dagligvarer" ignored)

### Example 3: With Existing Categories
If "Dagligvarer" already exists:
```
Dagligvarer
Mat ute
Klær
```
Result: 2 subcategories created ("Dagligvarer" ignored)

### Example 4: With Empty Lines
```
Dagligvarer

Mat ute


Klær
```
Result: 3 subcategories created (empty lines ignored)

---

## 🔧 Technical Implementation

### Component Structure
```typescript
interface BulkAddSubcategoriesProps {
  hovedkategoriId: string;
  existingSubcategories: Underkategori[];
  onCancel: () => void;
  onSave: (names: string[]) => void;
}
```

### Parsing Logic
1. Split input by newlines
2. Trim each line
3. Check for empty lines → ignore
4. Convert to lowercase for comparison
5. Check against existing subcategories → ignore duplicates
6. Check against already seen in input → ignore duplicates
7. Add valid lines to result array
8. Preserve original casing for valid items

### State Management
```typescript
const [showBulkAdd, setShowBulkAdd] = useState(false);
const [text, setText] = useState('');
const [feedback, setFeedback] = useState<{
  valid: number;
  duplicates: number;
  empty: number;
} | null>(null);
```

### Keyboard Handling
```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Escape') {
    onCancel();
  }
  
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    handleSave();
  }
};
```

---

## ✨ Benefits

1. **Time Saving**: Add many subcategories at once instead of one by one
2. **Bulk Import**: Copy-paste from spreadsheets or documents
3. **Smart Validation**: Automatically handles duplicates and empty lines
4. **User Friendly**: Live feedback shows what will happen before saving
5. **Keyboard Efficient**: Power users can use Ctrl+Enter to save quickly
6. **Error Prevention**: Can't save invalid data or duplicates

---

## 🚀 Future Enhancements (Optional)

- Import from CSV file
- Bulk edit existing subcategories
- Drag-and-drop reordering in bulk mode
- Export subcategories to clipboard
- Undo/redo for bulk operations

---

## 📸 Visual Preview

```
┌─────────────────────────────────────────────────────────┐
│ 💰 Inntekter [System]          + 📝 Legg til flere  ✏️ │
├─────────────────────────────────────────────────────────┤
│ ╔═══════════════════════════════════════════════════╗ │
│ ║ 📝 Legg til flere underkategorier             ✕  ║ │
│ ╟───────────────────────────────────────────────────╢ │
│ ║ Skriv inn underkategorier, én per linje...       ║ │
│ ║                                                   ║ │
│ ║ Dagligvarer                                       ║ │
│ ║ Mat ute                                           ║ │
│ ║ Klær                                              ║ │
│ ╟───────────────────────────────────────────────────╢ │
│ ║ ✓ 3 vil bli opprettet                            ║ │
│ ╟───────────────────────────────────────────────────╢ │
│ ║ Esc avbryt · Ctrl+Enter lagre  [Avbryt] [Lagre (3)]║ │
│ ╚═══════════════════════════════════════════════════╝ │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Testing Checklist

- [x] Bulk add creates multiple subcategories
- [x] Duplicates are ignored (case-insensitive)
- [x] Empty lines are ignored
- [x] Existing subcategories are not duplicated
- [x] Esc key closes the textarea
- [x] Ctrl+Enter saves the subcategories
- [x] Live feedback updates correctly
- [x] Save button shows correct count
- [x] Cancel button works
- [x] Close (×) button works
- [x] Mutually exclusive with single-add mode
- [x] Responsive design (mobile/desktop)
- [x] No linter errors
- [x] Auto-focus on textarea when opened

---

**Status**: ✅ Complete and Ready for Use

The bulk add feature is now live in the category management UI!

