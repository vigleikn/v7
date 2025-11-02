# Transaction Management System - Project Rules

## Project Overview
Norwegian bank transaction management with CSV import, category engine, and React UI.
Personal finance tool with automatic categorization, rule-based engine, and persistent storage.

## Critical Constraints

### System Categories
- **System categories** (isIncome: true) CANNOT be deleted or renamed
- Three system categories exist: `cat_inntekter_default`, `sparing`, `overfort`
- Protection check: `if (!kategori || kategori.isIncome) return;`
- `allowSubcategories` flag controls subcategory creation

### CSV Import and Duplicates
- **CSV parser** imports ALL rows without internal duplicate checking
- **Duplicate detection** only happens against existing `store.transactions`
- Transaction ID format: `${dato}|${beløp}|${type}|${tekst}|${fraKonto}|${tilKonto}`
- Never check for duplicates within the same CSV file

### State Management
- **Filter sync** must use useEffect to sync to Zustand store
- Never duplicate filter logic (single source of truth in store)
- Use `state.filteredTransactions` for selections, not local filtered arrays
- Bulk select must only select filtered transactions, not all

### Color Preferences
- **Primary text color**: #002050B (user preference)
- Blue (#3b82f6) for system/info states
- Green (#10b981) for success/income categories
- Gray (#6b7280) for disabled/hidden items
- Red/Orange for errors/warnings

## Code Patterns

### TypeScript
- Use strict mode
- Explicit return types for all exported functions
- Prefer interfaces over types for object shapes
- Keep files under 600 lines where possible

### Zustand Store
- Use Immer middleware for all state updates
- Actions must check protection flags (isIncome, allowSubcategories)
- Single source of truth for filtered transactions
- Use store selectors for derived state

### Category Operations
```typescript
// Always check before modifying
if (!kategori || kategori.isIncome) return; // Protected

// Check before creating subcategories
if (hovedkategori.allowSubcategories === false) return;

// Use bulk operations for multiple items
store.addSubcategoriesBulk(id, names); // Not: names.forEach(...)
```

### Bulk Operations
- Use `addSubcategoriesBulk()` for multiple items, not loops
- Validate input: trim, dedupe (case-insensitive), check existing
- Provide live feedback during input
- Single state update, not N updates

### React Components
- Use shadcn/ui components for consistency
- All forms need keyboard shortcuts:
  - **Esc** = Cancel/Close
  - **Ctrl+Enter** (Cmd+Enter) = Save/Submit
- Keep components under 500 lines
- Extract complex logic to separate components

### Form Validation
- Real-time feedback (show valid count, duplicates, errors)
- Disable save button if no valid input
- Show keyboard hints to users
- Case-insensitive duplicate detection

## Testing Requirements

### Test Files
- All new features need corresponding test file in `dev/`
- Tests must be runnable with `tsx` (no React/UI dependencies)
- Use `console.log` for output with emoji indicators:
  - ✅ Success/Pass
  - ❌ Error/Fail
  - ℹ️ Info/Detail
  - ⛔ Duplicate/Blocked

### Test Structure
```typescript
// Standard test pattern
function logSection(title: string) {
  console.log('\n' + '='.repeat(70));
  console.log(`🔍 ${title}`);
  console.log('='.repeat(70));
}

// Test setup
const store = useTransactionStore.getState();
store.reset();

// Run tests with descriptive logging
logInfo('Starting test...');
// ... test logic
logSuccess('Test passed!');
```

## Common Anti-Patterns to Avoid

### ❌ Don't Do This
```typescript
// Don't check duplicates in CSV parser
if (seenHashes.has(hash)) {
  duplicates.push(transaction); // ❌ Wrong!
}

// Don't filter locally without syncing to store
const filtered = useMemo(() => transactions.filter(...)); // ❌ Wrong!

// Don't allow editing system categories
updateHovedkategori(id, updates); // ❌ Without isIncome check

// Don't loop for bulk operations
names.forEach(name => createUnderkategori(name, id)); // ❌ Slow
```

### ✅ Do This Instead
```typescript
// CSV parser: return ALL transactions
allTransactions.push(transaction); // ✅ Correct

// Sync filters to store
useEffect(() => {
  setFilters({ search: searchValue, ... });
}, [searchValue, setFilters]); // ✅ Correct

// Check protection before modifying
if (!kategori || kategori.isIncome) return; // ✅ Correct

// Use bulk operations
addSubcategoriesBulk(id, names); // ✅ Fast
```

## Import Statistics Logging

Always log comprehensive import statistics:
```typescript
console.log(`📄 CSV parsed: ${count} transaksjoner`);
console.log(`🔍 Duplicate check: ${dupes} duplikater mot eksisterende data`);
console.log(`✅ Import fullført:`);
console.log(`   Nye transaksjoner: ${imported}`);
console.log(`   Auto-kategorisert: ${autoCat}`);
console.log(`   Duplikater ignorert: ${dupes}`);
```

## Documentation Standards

### Code Comments
- Document WHY, not WHAT (code shows what)
- Mark protected logic: `// Cannot update system categories`
- Explain non-obvious decisions: `// Transaction IDs are generated by engine`

### TypeScript Interfaces
- Document all exported interfaces
- Include examples in JSDoc comments
- Note any constraints or validation rules

### Component Props
- Document each prop's purpose
- Note required vs optional
- Explain callbacks and their expected behavior

## Performance Considerations

- Bulk operations use single state update (Immer batch)
- `filteredTransactions` computed in store, not per component
- Debounce auto-save (500ms default)
- Use `React.memo` for expensive list items
- Keep render logic simple (move complex logic to store selectors)

## File Organization

### Keep These Patterns
- `/components` - React UI components
- `/components/ui` - Reusable shadcn/ui components
- `/services` - Persistence and external services
- `/dev` - Test files and development scripts
- `/data` - CSV files and persistent storage

### File Size Guidelines
- Components: < 500 lines (extract sub-components)
- Store: < 600 lines (consider splitting into modules)
- Services: < 400 lines
- Test files: Any size (comprehensiveness matters)

## When Making Changes

1. **Check protection flags** (isIncome, allowSubcategories)
2. **Sync state properly** (useEffect for filters)
3. **Use bulk operations** (not loops)
4. **Add tests** (in dev/ directory)
5. **Update documentation** (if behavior changes)
6. **Log statistics** (for imports and operations)
7. **Verify in browser** (test actual UI behavior)

## Common Questions

**Q: Can I delete "Inntekter"?**  
A: No, isIncome categories are protected

**Q: Should CSV parser remove duplicates?**  
A: No, only check against store during import

**Q: Where do filters live?**  
A: In Zustand store, synced from UI via useEffect

**Q: How to add many subcategories?**  
A: Use `addSubcategoriesBulk()`, not loop

**Q: What's a system category?**  
A: Category with isIncome: true (protected from changes)

