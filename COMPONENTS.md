# React Components - Category Management

Complete ShadCN-based React components for the category management page.

## Components Created

### Main Component

**`CategoryPage.tsx`** - Complete category management interface
- Sidebar navigation with active state
- Category cards with CRUD operations
- Inline editing for names
- Confirmation dialogs for deletions
- Transaction count warnings

### UI Components (ShadCN-based)

**`components/ui/card.tsx`** - Card components
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

**`components/ui/button.tsx`** - Button component
- Variants: default, destructive, outline, ghost, link
- Sizes: default, sm, lg, icon

**`components/ui/input.tsx`** - Input component
- Text input with proper styling

**`components/ui/alert-dialog.tsx`** - Alert dialog components
- `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, etc.
- Used for delete confirmations

### Subcomponents

**`Sidebar`** - Left navigation menu
- Menu items: Hjem, Transaksjoner, Kategorier
- Active state highlighting
- Header and footer sections

**`CategoryCard`** - Individual category display
- Hovedkategori header with icon and name
- Action buttons: + (add subcategory), ✏️ (edit), 🗑️ (delete)
- List of underkategorier
- Inline editing for both hovedkategori and underkategorier
- Protected "Inntekter" category (system default)

**`NewSubcategoryInput`** - Inline input for new subcategory
- Auto-focus input field
- Save/Cancel buttons
- Enter to save, Escape to cancel

**`EditCategoryName`** - Inline editing for category names
- Pre-filled with current name
- Save/Cancel buttons
- Enter to save, Escape to cancel

**`DeleteCategoryDialog`** - Confirmation dialog for deletions
- Shows category name
- Warning if category has transactions
- Cancel/Confirm buttons

## Features

### ✅ Complete Functionality

1. **Hovedkategori Management**
   - Create new hovedkategorier
   - Edit existing names (except "Inntekter")
   - Delete (except "Inntekter")
   - Visual icon and color support

2. **Underkategori Management**
   - Add underkategorier to any hovedkategori
   - Edit underkategori names
   - Delete underkategorier
   - Nested display under parent

3. **User Experience**
   - Inline editing (no modals for editing)
   - Confirmation dialogs for destructive actions
   - Transaction count warnings on delete
   - Keyboard shortcuts (Enter/Escape)
   - Visual feedback (hover states, disabled states)

4. **System Protection**
   - "Inntekter" category is locked (marked as "System")
   - Cannot delete or rename "Inntekter"
   - Can still add underkategorier to "Inntekter"

5. **Zustand Integration**
   - Connected to `useTransactionStore`
   - Uses selectors for optimal performance
   - All state updates through store actions

## Usage

### Basic Setup

```tsx
import { CategoryPage } from './components/CategoryPage';
import './styles/globals.css';

function App() {
  return <CategoryPage />;
}
```

### With Routing

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CategoryPage } from './components/CategoryPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/kategorier" element={<CategoryPage />} />
        {/* Other routes */}
      </Routes>
    </BrowserRouter>
  );
}
```

## Styling

The components use Tailwind CSS with a custom configuration that matches ShadCN's design system.

### Color Scheme

- **Primary**: Blue (`hsl(222 84% 51%)`)
- **Destructive**: Red (`hsl(0 84% 60%)`)
- **Background**: White
- **Muted**: Gray tones

### Customization

Edit `tailwind.config.js` to customize colors, spacing, and other design tokens.

## Component Structure

```
CategoryPage
├── Sidebar
│   ├── Header (Logo/Title)
│   ├── Navigation Menu
│   └── Footer
│
└── Main Content
    ├── Page Header
    ├── New Category Button/Input
    └── Category Cards
        ├── CategoryCard (for each hovedkategori)
        │   ├── Card Header
        │   │   ├── Icon + Name (or EditCategoryName)
        │   │   └── Action Buttons
        │   │       ├── + (Add Subcategory)
        │   │       ├── ✏️ (Edit - not for Income)
        │   │       └── 🗑️ (Delete - not for Income)
        │   │
        │   └── Card Content
        │       ├── NewSubcategoryInput (conditional)
        │       └── Underkategorier List
        │           └── Each Underkategori
        │               ├── Name (or EditCategoryName)
        │               └── Action Buttons (✏️, 🗑️)
        │
        ├── DeleteCategoryDialog (for hovedkategori)
        └── DeleteCategoryDialog (for underkategori)
```

## State Management

### Zustand Store Integration

The component uses these store selectors and actions:

**Selectors:**
- `selectHovedkategorier` - Get sorted list of hovedkategorier

**Actions:**
- `createHovedkategori(name, options)` - Create new hovedkategori
- `createUnderkategori(name, hovedkategoriId)` - Create new underkategori
- `updateHovedkategori(id, updates)` - Update hovedkategori
- `updateUnderkategori(id, updates)` - Update underkategori
- `deleteHovedkategori(id)` - Delete hovedkategori
- `deleteUnderkategori(id)` - Delete underkategori
- `getHovedkategoriWithUnderkategorier(id)` - Get hovedkategori with its underkategorier

### Local State

Components use local state for UI interactions:
- `showNewSubcategory` - Toggle new subcategory input
- `editingName` - Toggle edit mode for names
- `showDeleteDialog` - Toggle delete confirmation
- `editingSubcategoryId` - Track which subcategory is being edited

## TypeScript

All components are fully typed with TypeScript:

```typescript
interface CategoryCardProps {
  hovedkategori: Hovedkategori;
  underkategorier: Underkategori[];
}
```

## Keyboard Shortcuts

- **Enter** - Save when editing
- **Escape** - Cancel when editing

## Transaction Count Warning

When deleting a category that has transactions:

```
⚠️ Denne kategorien har 15 transaksjon(er). 
   Disse vil bli ukategoriserte.
```

## Responsive Design

- Sidebar: Fixed width (256px)
- Main content: Flexible, max-width container
- Cards: Full width within container
- Mobile: Consider adding responsive sidebar (drawer on mobile)

## Installation

```bash
# Install dependencies
npm install

# For Tailwind CSS (if not already configured)
npx tailwindcss init -p
```

## Files Created

```
components/
├── CategoryPage.tsx           # Main component
└── ui/
    ├── card.tsx              # Card components
    ├── button.tsx            # Button component
    ├── input.tsx             # Input component
    └── alert-dialog.tsx      # Alert dialog components

styles/
└── globals.css               # Tailwind directives

tailwind.config.js            # Tailwind configuration
```

## Production Ready

This component is production-ready with:

✅ Full TypeScript support
✅ Error handling
✅ Accessibility (keyboard navigation)
✅ User confirmations for destructive actions
✅ Transaction count warnings
✅ Protected system categories
✅ Optimized re-renders (Zustand selectors)
✅ Clean, maintainable code structure
✅ Consistent styling (Tailwind)
✅ Modular components

## Future Enhancements

Possible additions:
- Drag & drop for reordering
- Color picker for categories
- Icon picker for categories
- Search/filter categories
- Bulk operations
- Undo/redo
- Mobile responsive sidebar (drawer)
- Export/import categories

## License

MIT

