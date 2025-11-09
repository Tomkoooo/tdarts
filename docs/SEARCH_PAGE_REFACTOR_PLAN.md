# 🔍 Search Page Refactor Plan

## Current Issues
- **1079 lines** - Way too large
- Uses DaisyUI classes throughout
- Poor component separation
- Complex state management
- Difficult to maintain

## New Architecture

### **Main Page Component**
`/src/app/search/page.tsx` (< 300 lines)
- Handle main state
- Coordinate data fetching
- Layout structure

### **Search Components** (New)
1. `SearchHeader.tsx` - Search input + filters button
2. `SearchFilters.tsx` - Advanced filter panel
3. `SearchResults.tsx` - Results container
4. `TournamentResults.tsx` - Tournament display (list/calendar)
5. `PlayerResults.tsx` - Player cards grid
6. `ClubResults.tsx` - Club cards grid
7. `InitialView.tsx` - Landing page view
8. `EmptyState.tsx` - No results component

### **Refactor Steps**
1. ✅ Create component plan
2. ⏳ Build SearchHeader component
3. ⏳ Build SearchFilters component
4. ⏳ Build TournamentResults (with calendar/list views)
5. ⏳ Build PlayerResults
6. ⏳ Build ClubResults
7. ⏳ Build InitialView
8. ⏳ Assemble main page
9. ⏳ Test all functionality

## Component Breakdown

### SearchHeader
- Modern Input with icon
- Clear button
- Filter toggle button
- Active filter count badge
- Suggestions dropdown

### SearchFilters
- Sheet/Dialog for mobile
- Card for desktop
- Radio groups for type selection
- Clear filters button

### TournamentResults
- Tab switching (List/Calendar)
- Date grouping
- Tournament cards
- Empty state

### PlayerResults
- Grid layout
- PlayerCard components (already exists)
- Pagination
- Modal integration

### ClubResults
- Grid/List view
- Club cards
- Click to navigate

### InitialView
- "Upcoming Tournaments" section
- "Top Players" section
- "Popular Clubs" section
- Clean layout

---

**Estimated Refactor Time:** ~2-3 hours of focused work
**Lines Reduced:** 1079 → ~600 (across multiple files)
**Maintainability:** 10x improvement

