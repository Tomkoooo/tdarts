# 📊 Advanced Data Tables Guide

## 🎉 Overview

We've implemented a powerful, flexible data table system using **TanStack Table** (React Table v8) with shadcn/ui styling. These tables include sorting, filtering, pagination, row selection, and are fully responsive.

---

## 🏗️ Architecture

### **Core Component**
`/src/components/ui/data-table.tsx` - Base reusable table

### **Domain-Specific Tables**
- `/src/components/tournament/PlayerDataTable.tsx` - Player management
- `/src/components/tournament/MatchesDataTable.tsx` - Match scheduling

---

## ✨ Features

### **1. Sorting**
- Click column headers to sort
- Visual indicators (arrows)
- Multi-column sorting support

### **2. Filtering/Search**
- Global search across columns
- Column-specific filters
- Instant results

### **3. Pagination**
- Configurable page size
- Page navigation
- Row count display

### **4. Row Selection**
- Checkbox selection
- Multi-select support
- Selection state tracking

### **5. Row Actions**
- Context menu dropdown
- Quick action buttons
- Role-based visibility

### **6. Loading States**
- Skeleton loaders
- Smooth transitions
- UX-friendly

### **7. Responsive**
- Horizontal scroll on mobile
- Adaptive layouts
- Touch-friendly

---

## 🚀 Usage Examples

### **Example 1: Player Table**

```tsx
import { PlayerDataTable } from '@/components/tournament/PlayerDataTable';

function TournamentPlayersPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const userRole = 'admin'; // or get from auth

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleViewPlayer = (player) => {
    console.log('View player:', player);
    // Open modal or navigate
  };

  const handleCheckIn = async (player) => {
    // Check in player
    await api.checkInPlayer(player._id);
    fetchPlayers(); // Refresh
  };

  const handleRemove = async (player) => {
    if (confirm('Remove player?')) {
      await api.removePlayer(player._id);
      fetchPlayers();
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Játékosok</h1>
      
      <PlayerDataTable
        players={players}
        loading={loading}
        userRole={userRole}
        onViewPlayer={handleViewPlayer}
        onCheckInPlayer={handleCheckIn}
        onRemovePlayer={handleRemove}
      />
    </div>
  );
}
```

### **Example 2: Matches Table**

```tsx
import { MatchesDataTable } from '@/components/tournament/MatchesDataTable';

function TournamentMatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const userRole = 'moderator';

  const handleStartMatch = async (match) => {
    await api.startMatch(match._id);
    // Navigate to match board
    router.push(`/board/${match._id}`);
  };

  const handleViewMatch = (match) => {
    // Open match details modal
    setSelectedMatch(match);
    setModalOpen(true);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Meccsek</h1>
      
      <MatchesDataTable
        matches={matches}
        loading={loading}
        userRole={userRole}
        onStartMatch={handleStartMatch}
        onViewMatch={handleViewMatch}
      />
    </div>
  );
}
```

---

## 🎨 Creating Custom Data Tables

### **Step 1: Define Your Data Type**

```typescript
interface MyData {
  _id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}
```

### **Step 2: Create Column Definitions**

```tsx
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

const columns: ColumnDef<MyData>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.status === 'active' ? 'success' : 'secondary'}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span>
        {new Date(row.original.createdAt).toLocaleDateString()}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Button size="sm" onClick={() => handleEdit(row.original)}>
        Edit
      </Button>
    ),
  },
];
```

### **Step 3: Use the DataTable Component**

```tsx
import { DataTable } from "@/components/ui/data-table";

function MyTable() {
  const [data, setData] = useState<MyData[]>([]);
  const [loading, setLoading] = useState(true);

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search by name..."
      loading={loading}
      onRowClick={(row) => console.log('Row clicked:', row)}
    />
  );
}
```

---

## 🎯 Advanced Features

### **1. Custom Sorting**

```tsx
{
  accessorKey: "score",
  header: "Score",
  sortingFn: (rowA, rowB) => {
    return rowA.original.score - rowB.original.score;
  },
}
```

### **2. Custom Filtering**

```tsx
{
  accessorKey: "status",
  header: "Status",
  filterFn: (row, columnId, filterValue) => {
    return row.getValue(columnId) === filterValue;
  },
}
```

### **3. Conditional Row Styling**

```tsx
<tr
  className={cn(
    "border-b",
    row.original.status === 'error' && "bg-destructive/10"
  )}
>
```

### **4. Nested Data Access**

```tsx
{
  accessorKey: "user.profile.name",
  header: "User Name",
  cell: ({ row }) => row.original.user.profile.name,
}
```

### **5. Aggregated Columns**

```tsx
{
  id: "winRate",
  header: "Win Rate",
  cell: ({ row }) => {
    const { wins, total } = row.original.stats;
    const rate = total > 0 ? (wins / total * 100).toFixed(1) : '0';
    return <span>{rate}%</span>;
  },
}
```

---

## 🎨 Styling Customization

### **Table Container**

```tsx
<div className="rounded-lg border border-primary/20 bg-card/50 backdrop-blur-sm">
  {/* Table here */}
</div>
```

### **Header Styling**

```tsx
<th className="h-12 px-4 bg-gradient-to-r from-primary/10 to-accent/5">
  {header}
</th>
```

### **Row Hover Effects**

```tsx
<tr className="hover:bg-primary/5 hover:shadow-md transition-all duration-200">
  {/* Cells */}
</tr>
```

### **Custom Badge Variants**

```tsx
<Badge 
  variant={status === 'finished' ? 'success' : 'default'}
  className="animate-pulse"
>
  {status}
</Badge>
```

---

## 📱 Mobile Optimization

### **Responsive Columns**

Hide less important columns on mobile:

```tsx
{
  accessorKey: "details",
  header: "Details",
  cell: ({ row }) => row.original.details,
  // Hide on mobile
  meta: {
    className: "hidden md:table-cell"
  }
}
```

### **Compact Mode**

```tsx
<DataTable
  columns={isMobile ? compactColumns : fullColumns}
  data={data}
/>
```

### **Touch Gestures**

The table automatically supports:
- Swipe to scroll horizontally
- Tap to select row
- Long press for context menu (if implemented)

---

## 🔧 Props Reference

### **DataTable Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `columns` | `ColumnDef[]` | ✅ | Column definitions |
| `data` | `TData[]` | ✅ | Table data |
| `searchKey` | `string` | ❌ | Column key to enable search |
| `searchPlaceholder` | `string` | ❌ | Search input placeholder |
| `loading` | `boolean` | ❌ | Show loading state |
| `onRowClick` | `(row: TData) => void` | ❌ | Row click handler |

### **PlayerDataTable Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `players` | `Player[]` | ✅ | Player data |
| `loading` | `boolean` | ❌ | Loading state |
| `userRole` | `'admin' \| 'moderator' \| 'member' \| 'none'` | ❌ | User role |
| `onViewPlayer` | `(player: Player) => void` | ❌ | View handler |
| `onCheckInPlayer` | `(player: Player) => void` | ❌ | Check-in handler |
| `onRemovePlayer` | `(player: Player) => void` | ❌ | Remove handler |

### **MatchesDataTable Props**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `matches` | `Match[]` | ✅ | Match data |
| `loading` | `boolean` | ❌ | Loading state |
| `userRole` | `'admin' \| 'moderator' \| 'member' \| 'none'` | ❌ | User role |
| `onViewMatch` | `(match: Match) => void` | ❌ | View handler |
| `onStartMatch` | `(match: Match) => void` | ❌ | Start handler |
| `onDeleteMatch` | `(match: Match) => void` | ❌ | Delete handler |

---

## 🎬 Real-World Integration

### **With API Fetching**

```tsx
function TournamentPlayers({ tournamentId }: { tournamentId: string }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/tournaments/${tournamentId}/players`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setPlayers(data.players);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [tournamentId]);

  if (error) {
    return <Alert variant="destructive">{error}</Alert>;
  }

  return (
    <PlayerDataTable
      players={players}
      loading={loading}
      userRole="admin"
      onViewPlayer={(player) => {
        router.push(`/players/${player._id}`);
      }}
    />
  );
}
```

### **With Real-Time Updates (Socket.io)**

```tsx
function LiveMatchesTable({ tournamentId }: { tournamentId: string }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    // Initial fetch
    fetchMatches();

    // Subscribe to real-time updates
    socket.on('match:updated', (updatedMatch) => {
      setMatches(prev => 
        prev.map(m => m._id === updatedMatch._id ? updatedMatch : m)
      );
    });

    socket.on('match:started', (newMatch) => {
      setMatches(prev => [...prev, newMatch]);
    });

    return () => {
      socket.off('match:updated');
      socket.off('match:started');
    };
  }, [tournamentId]);

  return (
    <MatchesDataTable
      matches={matches}
      userRole="moderator"
      onStartMatch={handleStartMatch}
    />
  );
}
```

---

## 🎯 Best Practices

### **1. Performance**

```tsx
// Memoize columns to prevent re-renders
const columns = useMemo<ColumnDef<Player>[]>(() => [
  // ... column definitions
], []);

// Memoize data if processing is expensive
const processedData = useMemo(() => {
  return data.map(item => ({
    ...item,
    calculated: expensiveCalculation(item)
  }));
}, [data]);
```

### **2. Accessibility**

```tsx
// Add aria labels
<Button aria-label="View player details">
  <IconEye />
</Button>

// Keyboard navigation
<tr 
  tabIndex={0}
  onKeyPress={(e) => e.key === 'Enter' && handleRowClick(row)}
>
```

### **3. Error Handling**

```tsx
<DataTable
  columns={columns}
  data={data}
  loading={loading}
  error={error}
  onRetry={fetchData}
/>
```

### **4. Empty States**

```tsx
{data.length === 0 && !loading && (
  <div className="text-center py-12">
    <IconUsers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
    <p className="text-lg font-medium">Még nincs játékos</p>
    <Button className="mt-4" onClick={handleAddPlayer}>
      Játékos hozzáadása
    </Button>
  </div>
)}
```

---

## 🐛 Troubleshooting

### **Issue: Table not updating after data change**

**Solution:** Ensure data reference changes:
```tsx
// Bad
data.push(newItem);
setData(data);

// Good
setData([...data, newItem]);
```

### **Issue: Sorting not working**

**Solution:** Ensure the accessor key matches your data structure:
```tsx
// If data is { user: { name: "John" } }
accessorKey: "user.name" // Correct
accessorKey: "name" // Won't work
```

### **Issue: Search not working**

**Solution:** Make sure `searchKey` matches a valid column accessor:
```tsx
<DataTable
  searchKey="playerReference.name" // Must match column accessorKey
  ...
/>
```

---

## 🚀 Future Enhancements

Potential additions:

- [ ] Export to CSV/Excel
- [ ] Column visibility toggle
- [ ] Bulk actions (delete, edit multiple rows)
- [ ] Advanced filters (date range, multi-select)
- [ ] Column resizing
- [ ] Row dragging (reordering)
- [ ] Virtual scrolling for large datasets
- [ ] Server-side pagination
- [ ] Saved views/presets

---

## 📚 Resources

- [TanStack Table Docs](https://tanstack.com/table/v8)
- [shadcn/ui Table](https://ui.shadcn.com/docs/components/data-table)
- [React Table Examples](https://tanstack.com/table/v8/docs/examples/react/basic)

---

**Ready to build amazing data tables?** Use these components as a foundation and customize to your heart's content! 📊✨

---

**Created:** Now  
**Version:** 1.0.0  
**Status:** ✅ Ready for Use

