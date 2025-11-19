# 🚀 Quick Start Guide - New Design System

**For:** tDarts Tournament Platform - Redesigned UI
**Version:** 2.0.0
**Last Updated:** November 18, 2025

---

## 📦 What's Been Delivered

### Core System
✅ **Tailwind CSS v4** with glass morphism utilities
✅ **Framer Motion** animation library
✅ **shadcn/ui** components (DaisyUI removed)
✅ **8 enhanced components** with animations

---

## 🎯 Using Enhanced Components

### 1. Dialog (Modal)

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create Tournament</DialogTitle>
    </DialogHeader>
    {/* Your content */}
  </DialogContent>
</Dialog>
```

**Features:**
- ✨ Fade + scale entrance with Framer Motion
- 🔮 Glass morphism backdrop
- 📱 Mobile responsive

---

### 2. Sheet (Drawer/Panel)

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetContent side="right">  {/* or "left", "top", "bottom" */}
    <SheetHeader>
      <SheetTitle>Settings</SheetTitle>
    </SheetHeader>
    {/* Your content */}
  </SheetContent>
</Sheet>
```

**Features:**
- ✨ Smooth slide animation (4 directions)
- 🔮 Glass background
- 📱 Adaptive width on mobile

---

### 3. FormField (Input with validation)

```tsx
import { FormField } from "@/components/ui/form-field"
import { IconUser } from "@tabler/icons-react"

<FormField
  label="Username"
  placeholder="Enter username"
  error={errors.username?.message}
  helperText="Choose a unique username"
  required
  icon={<IconUser className="w-5 h-5" />}
  {...register('username')}
/>
```

**Features:**
- ✨ Shake animation on error
- ✨ Smooth error message transitions
- 🎯 Icon support
- 📱 Full width responsive

---

### 4. Tabs (Tab Navigation)

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="players">Players</TabsTrigger>
    <TabsTrigger value="matches">Matches</TabsTrigger>
  </TabsList>
  
  <TabsContent value="overview">
    {/* Content animates in */}
  </TabsContent>
  
  <TabsContent value="players">
    {/* Content animates in */}
  </TabsContent>
</Tabs>
```

**Features:**
- ✨ Tab content fade-in on switch
- 🎯 Active state visual feedback
- 📱 Responsive text sizing

---

### 5. Dropdown Menu

```tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost">Options</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuItem>Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Features:**
- ✨ Scale + fade entrance
- 🔮 Glass background with blur
- 🎯 Keyboard navigation

---

### 6. Tooltip

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon">
        <IconHelp className="w-4 h-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Help information</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Features:**
- ✨ Quick fade-in
- 🔮 Glass background
- 🎯 Position-aware

---

## 🎨 Using New Tailwind Utilities

### Glass Effects

```tsx
// Base glass (subtle)
<div className="bg-glass-bg backdrop-blur-lg border border-white/10">

// Elevated glass (cards)
<div className="bg-glass-bg-elevated backdrop-blur-xl border border-white/15">

// Modal glass (strongest)
<div className="bg-glass-bg-modal backdrop-blur-2xl border border-white/20">
```

### Glass Shadows

```tsx
// Glass shadow
<div className="shadow-glass">

// Glass shadow (larger)
<div className="shadow-glass-lg">

// Glass shadow (largest)
<div className="shadow-glass-xl">

// Primary glow
<div className="shadow-primary">
```

### Animations

```tsx
// Fade in
<div className="animate-fade-in">

// Slide in from right
<div className="animate-slide-in-from-right">

// Zoom in
<div className="animate-zoom-in">
```

---

## 🎬 Using Framer Motion Variants

### Import Variants

```tsx
import { motion } from "framer-motion"
import { 
  liquidIn,
  fadeInScale,
  slideInRight,
  hoverLift,
  liveUpdate,
  shake
} from "@/lib/motion"
```

### Apply to Components

```tsx
// Basic entrance animation
<motion.div
  variants={liquidIn}
  initial="initial"
  animate="animate"
  exit="exit"
>
  {/* Content */}
</motion.div>

// Hover animation
<motion.button
  variants={hoverLift}
  initial="rest"
  whileHover="hover"
  whileTap="tap"
>
  Click me
</motion.button>

// Conditional rendering with animation
<AnimatePresence mode="wait">
  {isVisible && (
    <motion.div
      variants={fadeInScale}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Content */}
    </motion.div>
  )}
</AnimatePresence>
```

---

## 🎯 Common Patterns

### Pattern 1: Animated Modal

```tsx
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/Button"

export function MyModal() {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Open Modal
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>My Modal</DialogTitle>
          </DialogHeader>
          <p>Content here</p>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

### Pattern 2: Form with Validation

```tsx
"use client"

import { useForm } from "react-hook-form"
import { FormField } from "@/components/ui/form-field"
import { Button } from "@/components/ui/Button"

export function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  
  const onSubmit = (data) => {
    console.log(data)
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label="Email"
        type="email"
        error={errors.email?.message}
        {...register('email', { required: 'Email is required' })}
      />
      
      <FormField
        label="Password"
        type="password"
        error={errors.password?.message}
        {...register('password', { required: 'Password is required' })}
      />
      
      <Button type="submit">Submit</Button>
    </form>
  )
}
```

### Pattern 3: Animated List

```tsx
import { motion } from "framer-motion"
import { staggerContainer, staggerChild } from "@/lib/motion"

const items = ['Item 1', 'Item 2', 'Item 3']

<motion.div
  variants={staggerContainer}
  initial="initial"
  animate="animate"
  className="space-y-2"
>
  {items.map((item, i) => (
    <motion.div
      key={i}
      variants={staggerChild}
      className="p-4 bg-glass-bg-elevated backdrop-blur-xl rounded-lg"
    >
      {item}
    </motion.div>
  ))}
</motion.div>
```

---

## ⚡ Performance Tips

### 1. Use `disableMotion` when needed

```tsx
// For lists with many items
<Button disableMotion>
  Static button (no hover animation)
</Button>

<Card disableMotion>
  Static card (no entrance animation)
</Card>
```

### 2. Lazy load heavy animations

```tsx
import dynamic from 'next/dynamic'

const HeavyAnimatedComponent = dynamic(
  () => import('@/components/HeavyAnimatedComponent'),
  { ssr: false }
)
```

### 3. Use `layoutId` for shared element transitions

```tsx
// When animating between states
<motion.div layoutId="unique-id">
  {/* Content */}
</motion.div>
```

---

## 📱 Mobile Considerations

### Responsive Breakpoints

```tsx
// Mobile first
<div className="text-sm sm:text-base md:text-lg">

// Conditional rendering
<div className="block md:hidden">
  {/* Mobile only */}
</div>

<div className="hidden md:block">
  {/* Desktop only */}
</div>
```

### Touch-Friendly Sizes

```tsx
// Minimum touch target: 48px (h-12)
<Button size="default">  {/* h-11 */}
<Button size="lg">       {/* h-12 ✅ */}
<Button size="xl">       {/* h-14 ✅ */}
```

---

## 🐛 Troubleshooting

### Issue: Animations not working

**Solution:** Ensure component is client-side
```tsx
"use client"  // Add at top of file
```

### Issue: Glass effect not visible

**Solution:** Check backdrop-blur and background opacity
```tsx
// ❌ Wrong
<div className="bg-white/95">

// ✅ Correct
<div className="bg-glass-bg-elevated backdrop-blur-xl">
```

### Issue: TypeScript errors with motion variants

**Solution:** Use type casting for custom variants
```tsx
const myVariants = {
  initial: { ... },
  animate: { ... },
  exit: { ... }
} as const
```

---

## 📚 Further Reading

- [Framer Motion Docs](https://www.framer.com/motion/)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS v4](https://tailwindcss.com)
- **Project Docs:**
  - `/docs/REDESIGN_FINAL_SUMMARY.md` - Complete overview
  - `/docs/COMPLETE_REDESIGN_STATUS.md` - Detailed status
  - `/docs/FRONTEND_REDESIGN_SPEC.md` - Original specification

---

## ✅ Checklist for New Components

When creating new components:

- [ ] Use `"use client"` directive if using motion
- [ ] Import motion variants from `@/lib/motion.ts`
- [ ] Apply glass effects (`bg-glass-*`, `backdrop-blur-*`)
- [ ] Add proper animations (`variants`, `initial`, `animate`, `exit`)
- [ ] Test mobile responsiveness
- [ ] Verify accessibility (ARIA, focus states)
- [ ] Run lint check (`npm run lint`)
- [ ] Test with keyboard navigation

---

**🎉 You're ready to build premium UI with the new system!**

