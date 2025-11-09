# 🏆 Tournament Bracket Visualization Guide

## 🎉 Overview

A stunning, modern knockout bracket visualization component with interactive features, zoom controls, fullscreen mode, and real-time status updates.

---

## ✨ Key Features

### **1. Visual Design**
- **Modern Card-based Layout** - Clean, professional appearance
- **Animated Transitions** - Smooth hover effects and status changes
- **Color-Coded Status** - Visual indicators for pending, live, and finished matches
- **Winner Highlighting** - Trophy icons and special styling for winners

### **2. Interactive Features**
- **Click to View Details** - Tap any match for more information
- **Quick Start Button** - Admin can start matches directly from the bracket
- **Zoom Controls** - Scale from 50% to 200%
- **Fullscreen Mode** - Immersive viewing experience

### **3. Match Information**
- **Player Names & Avatars** - Easy identification
- **Live Scores** - Real-time leg counts
- **Match Stats** - Highest checkout, 180 counts
- **Board Numbers** - See which table the match is on
- **Time Stamps** - When matches started/finished

### **4. Responsive Design**
- **Horizontal Scroll** - Navigate large brackets easily
- **Touch-Friendly** - Works great on tablets
- **Scalable** - Adapts to screen size

---

## 🚀 Usage

### **Basic Implementation**

```tsx
import { KnockoutBracketNew } from '@/components/tournament/KnockoutBracketNew';

function TournamentBracketPage() {
  const [rounds, setRounds] = useState<BracketRound[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = true;

  useEffect(() => {
    fetchBracketData();
  }, []);

  const handleMatchClick = (match: BracketMatch) => {
    // Open match details modal or navigate
    console.log('Match clicked:', match);
  };

  const handleStartMatch = async (match: BracketMatch) => {
    // Start the match
    await api.startMatch(match._id);
    fetchBracketData(); // Refresh
  };

  return (
    <div className="container mx-auto py-8">
      <KnockoutBracketNew
        rounds={rounds}
        loading={loading}
        onMatchClick={handleMatchClick}
        onStartMatch={handleStartMatch}
        isAdmin={isAdmin}
      />
    </div>
  );
}
```

---

## 📊 Data Structure

### **BracketRound**

```typescript
interface BracketRound {
  round: number;            // Round number (1, 2, 3, etc.)
  roundName: string;        // "Negyeddöntő", "Elődöntő", "Döntő"
  matches: BracketMatch[];  // Array of matches in this round
}
```

### **BracketMatch**

```typescript
interface BracketMatch {
  _id: string;                    // Unique match ID
  player1: BracketPlayer | null;  // First player
  player2: BracketPlayer | null;  // Second player
  status: 'pending' | 'in_progress' | 'finished';
  board?: number;                 // Table number
  round: number;                  // Which round this match is in
  matchNumber: number;            // Match number within the round
  startedAt?: Date;               // When match started
  finishedAt?: Date;              // When match finished
  winnerId?: string;              // ID of the winner
}
```

### **BracketPlayer**

```typescript
interface BracketPlayer {
  _id?: string;           // Player ID
  name: string;           // Player name
  score?: number;         // Overall score
  legsWon?: number;       // Legs won in this match
  isWinner?: boolean;     // Is this player the winner?
  highestCheckout?: number;    // Highest checkout in match
  oneEightiesCount?: number;   // Number of 180s thrown
}
```

---

## 🎨 Example Data

```typescript
const exampleRounds: BracketRound[] = [
  {
    round: 1,
    roundName: "Nyolcaddöntő",
    matches: [
      {
        _id: "match1",
        player1: {
          _id: "p1",
          name: "John Doe",
          legsWon: 3,
          highestCheckout: 120,
          oneEightiesCount: 2,
          isWinner: true
        },
        player2: {
          _id: "p2",
          name: "Jane Smith",
          legsWon: 1,
          highestCheckout: 80,
          oneEightiesCount: 0,
          isWinner: false
        },
        status: "finished",
        board: 1,
        round: 1,
        matchNumber: 1,
        winnerId: "p1",
        startedAt: new Date("2024-01-01T10:00:00"),
        finishedAt: new Date("2024-01-01T10:30:00")
      },
      // ... more matches
    ]
  },
  {
    round: 2,
    roundName: "Negyeddöntő",
    matches: [
      {
        _id: "match5",
        player1: {
          _id: "p1",
          name: "John Doe"
        },
        player2: null, // TBD - waiting for previous round
        status: "pending",
        board: 1,
        round: 2,
        matchNumber: 5
      },
      // ... more matches
    ]
  },
  // ... more rounds
];
```

---

## 🎯 Props Reference

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `rounds` | `BracketRound[]` | ✅ | Array of tournament rounds with matches |
| `loading` | `boolean` | ❌ | Show loading spinner |
| `onMatchClick` | `(match: BracketMatch) => void` | ❌ | Handler for match card clicks |
| `onStartMatch` | `(match: BracketMatch) => void` | ❌ | Handler for starting a match (admin only) |
| `isAdmin` | `boolean` | ❌ | Show admin controls (start button) |

---

## 🎨 Customization

### **Round Name Translations**

```typescript
// Map round numbers to Hungarian names
function getRoundName(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round + 1;
  
  if (fromEnd === 1) return "Döntő";
  if (fromEnd === 2) return "Elődöntő";
  if (fromEnd === 3) return "Negyeddöntő";
  if (fromEnd === 4) return "Nyolcaddöntő";
  
  return `${round}. kör`;
}
```

### **Custom Match Spacing**

```typescript
// Adjust vertical spacing between matches
const getMatchSpacing = (round: number) => {
  const baseSpacing = 100; // Change this value
  return baseSpacing * Math.pow(2, round - 1);
}
```

### **Color Customization**

```tsx
// In MatchCard component, customize colors:

// Live match color
{match.status === 'in_progress' && "ring-2 ring-success shadow-success/20"}

// Winner highlight color
{isWinner && "bg-primary/10 ring-2 ring-primary/30"}

// Hover effect
"hover:shadow-[0_8px_32px_0_oklch(51%_0.18_16_/_0.18)]"
```

---

## 🔧 Advanced Features

### **1. Real-Time Updates with Socket.io**

```tsx
function LiveBracket() {
  const [rounds, setRounds] = useState<BracketRound[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    // Initial load
    fetchBracket();

    // Listen for match updates
    socket.on('match:updated', (updatedMatch) => {
      setRounds(prevRounds => 
        prevRounds.map(round => ({
          ...round,
          matches: round.matches.map(match =>
            match._id === updatedMatch._id ? updatedMatch : match
          )
        }))
      );
    });

    // Listen for match completion
    socket.on('match:finished', (finishedMatch) => {
      fetchBracket(); // Refresh entire bracket
    });

    return () => {
      socket.off('match:updated');
      socket.off('match:finished');
    };
  }, []);

  return <KnockoutBracketNew rounds={rounds} />;
}
```

### **2. Match Details Modal**

```tsx
function BracketWithDetails() {
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleMatchClick = (match: BracketMatch) => {
    setSelectedMatch(match);
    setModalOpen(true);
  };

  return (
    <>
      <KnockoutBracketNew
        rounds={rounds}
        onMatchClick={handleMatchClick}
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meccs #{selectedMatch?.matchNumber}</DialogTitle>
          </DialogHeader>
          {/* Match details here */}
          <div>
            <h3>{selectedMatch?.player1?.name}</h3>
            <p>Legs: {selectedMatch?.player1?.legsWon}</p>
            {/* More details... */}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### **3. Export Bracket as Image**

```tsx
import html2canvas from 'html2canvas';

function ExportableBracket() {
  const bracketRef = useRef<HTMLDivElement>(null);

  const exportAsImage = async () => {
    if (!bracketRef.current) return;
    
    const canvas = await html2canvas(bracketRef.current);
    const dataUrl = canvas.toDataURL('image/png');
    
    // Download
    const link = document.createElement('a');
    link.download = 'tournament-bracket.png';
    link.href = dataUrl;
    link.click();
  };

  return (
    <div>
      <Button onClick={exportAsImage}>Export as Image</Button>
      <div ref={bracketRef}>
        <KnockoutBracketNew rounds={rounds} />
      </div>
    </div>
  );
}
```

### **4. Print-Friendly Version**

```css
/* Add to your CSS */
@media print {
  .bracket-container {
    zoom: 0.7;
    page-break-inside: avoid;
  }
  
  /* Hide controls when printing */
  .bracket-controls {
    display: none;
  }
}
```

---

## 📱 Mobile Optimization

### **Responsive Zoom**

```tsx
// Adjust initial zoom based on screen size
const [zoomLevel, setZoomLevel] = useState(() => {
  if (typeof window !== 'undefined') {
    return window.innerWidth < 768 ? 0.6 : 1;
  }
  return 1;
});
```

### **Touch Gestures**

```tsx
// Add pinch-to-zoom
import { useGesture } from '@use-gesture/react';

const bind = useGesture({
  onPinch: ({ offset: [scale] }) => {
    setZoomLevel(Math.max(0.5, Math.min(2, scale)));
  }
});

<div {...bind()}>
  <KnockoutBracketNew rounds={rounds} />
</div>
```

---

## 🎯 Use Cases

### **1. Tournament Organizers**
- View entire bracket at a glance
- Start matches directly
- Track progress in real-time

### **2. Spectators**
- Follow favorite players
- See live scores
- Check upcoming matches

### **3. Players**
- See their path through the tournament
- View opponent stats
- Know when they're up next

---

## 🐛 Troubleshooting

### **Issue: Bracket lines not connecting properly**

**Solution:** Ensure rounds are sorted correctly and matches are in proper order:

```typescript
const sortedRounds = rounds.sort((a, b) => a.round - b.round);
```

### **Issue: Player showing as "待定" (TBD)**

**Solution:** This is expected when a player is null (waiting for previous round). To show "TBD" in English:

```tsx
<span className="text-sm">TBD</span>
```

### **Issue: Zoom not working in fullscreen**

**Solution:** Make sure the container ref is attached:

```tsx
<div ref={containerRef}>
```

---

## 🎨 Design Patterns Used

### **1. Card-Based Layout**
Each match is a card for better visual separation and hover effects.

### **2. Progressive Disclosure**
Show essential info by default, reveal more on interaction.

### **3. Status Indicators**
Color-coded badges and icons for quick status recognition.

### **4. Visual Hierarchy**
Larger elements for winners, muted for eliminated players.

---

## 🚀 Performance Tips

### **1. Memoize Complex Calculations**

```tsx
const matchSpacing = useMemo(() => 
  getMatchSpacing(round.round), 
  [round.round]
);
```

### **2. Virtualize Large Brackets**

For tournaments with 64+ players, consider virtualizing:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
```

### **3. Lazy Load Match Details**

Don't fetch all match details upfront:

```tsx
const { data: matchDetails } = useQuery(
  ['match', match._id],
  () => fetchMatchDetails(match._id),
  { enabled: modalOpen }
);
```

---

## ✅ Best Practices

1. **Always validate data** - Handle null players gracefully
2. **Provide fallbacks** - Show loading states and empty states
3. **Keep it responsive** - Test on multiple screen sizes
4. **Optimize performance** - Memoize expensive calculations
5. **Add analytics** - Track which matches users view most
6. **Handle errors** - Show friendly messages if data fails to load

---

## 📚 Resources

- [TanStack Table](https://tanstack.com/table) - For data tables
- [Framer Motion](https://www.framer.com/motion/) - For advanced animations
- [React DnD](https://react-dnd.github.io/react-dnd/) - For drag-and-drop match reordering

---

## 🎉 Summary

The new Knockout Bracket component provides:

- ✅ **Beautiful Design** - Modern, professional appearance
- ✅ **Interactive** - Click, zoom, fullscreen
- ✅ **Real-time** - Live score updates
- ✅ **Mobile-Friendly** - Works great on all devices
- ✅ **Customizable** - Easy to adapt to your needs
- ✅ **Performant** - Optimized for large brackets

---

**Ready to showcase your tournament brackets in style?** Use this component and watch engagement soar! 🏆

---

**Created:** Now  
**Version:** 1.0.0  
**Status:** ✅ Ready for Deployment

