# 🎨 Live Demo - Category Management UI

## ✅ Server is Running!

The development server should now be running at:

**http://localhost:3000**

## 🖱️ How to Try It

1. **Open your browser** and go to: `http://localhost:3000`

2. **You'll see the Category Management Page** with:
   - A dark sidebar on the left
   - The main content area with category cards

## 🎯 Things to Try

### Add a New Main Category
1. Click **"+ Ny hovedkategori"** (blue button at the top)
2. Type a name (e.g., "Transport", "Fritid", "Shopping")
3. Click **"Lagre"** or press **Enter**

### Add a Subcategory
1. Find any category card
2. Click the **+** button in the card header
3. Type a subcategory name
4. Click **"Lagre"** or press **Enter**

### Edit a Category Name
1. Click the **✏️** button on any category (except "Inntekter")
2. Change the name
3. Click **"Lagre"** or press **Enter**
4. Press **Escape** to cancel

### Delete a Category
1. Click the **🗑️** button on any category (except "Inntekter")
2. You'll see a confirmation dialog
3. Click **"Slett kategori"** to confirm or **"Avbryt"** to cancel

### Notice the Protected Category
- **"Inntekter"** has a "System" badge
- It only has the **+** button (no ✏️ or 🗑️)
- This is the protected income category

## 🎨 UI Features

- **Inline editing** - No pop-ups, everything edits in-place
- **Keyboard shortcuts** - Enter to save, Escape to cancel
- **Visual feedback** - Hover effects, button states
- **Confirmation dialogs** - Prevents accidental deletions
- **Nested categories** - Subcategories show under their parent

## 🛑 To Stop the Server

When you're done, you can stop the server by:
1. Going back to your terminal
2. Pressing **Ctrl+C**

## 💡 The Data

The categories you create are stored in the **Zustand store** (in-memory for this demo). If you refresh the page, they'll reset to the default "Inntekter" category.

## 🔗 Full Integration

This UI is fully connected to:
- ✅ Zustand store for state management
- ✅ The category engine for rules and logic
- ✅ Transaction tracking (when integrated with the full app)

Enjoy clicking around! 🎉

