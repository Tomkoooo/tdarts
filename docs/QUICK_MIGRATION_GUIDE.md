# 🚀 Quick Migration Guide - DaisyUI → shadcn/ui

## 🎯 **Common Component Migrations**

### **Buttons**

```tsx
// ❌ OLD (DaisyUI)
<button className="btn btn-primary btn-lg">
  Submit
</button>

// ✅ NEW (shadcn/ui)
import { Button } from "@/components/ui/button"

<Button size="lg">
  Submit
</Button>
```

**Available variants:**
- `variant="default"` - Primary red (default)
- `variant="destructive"` - Danger red
- `variant="outline"` - Outlined
- `variant="ghost"` - Transparent
- `variant="secondary"` - Secondary style
- `variant="success"` - Green

**Available sizes:**
- `size="sm"` - Small
- `size="default"` - Medium (default)
- `size="lg"` - Large
- `size="xl"` - Extra large

---

### **Cards**

```tsx
// ❌ OLD (DaisyUI)
<div className="card bg-base-100 shadow-xl">
  <div className="card-body">
    <h2 className="card-title">Title</h2>
    <p>Content</p>
  </div>
</div>

// ✅ NEW (shadcn/ui)
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Content</p>
  </CardContent>
</Card>
```

**Or use DataCard for enhanced features:**

```tsx
import { DataCard } from "@/components/ui/data-card"

<DataCard 
  title="Title"
  icon={<IconTrophy className="w-6 h-6" />}
  loading={isLoading}
>
  <p>Content</p>
</DataCard>
```

---

### **Form Inputs**

```tsx
// ❌ OLD (DaisyUI)
<div>
  <label className="label">
    <span className="label-text">Email</span>
  </label>
  <input 
    type="email" 
    className="input input-bordered w-full" 
    {...register('email')}
  />
  {errors.email && (
    <span className="text-error">{errors.email.message}</span>
  )}
</div>

// ✅ NEW (shadcn/ui)
import { FormField } from "@/components/ui/form-field"
import { IconMail } from "@tabler/icons-react"

<FormField
  type="email"
  label="Email"
  placeholder="email@example.com"
  error={errors.email?.message}
  icon={<IconMail className="w-5 h-5" />}
  required
  {...register('email')}
/>
```

---

### **Badges**

```tsx
// ❌ OLD (DaisyUI)
<span className="badge badge-primary">Active</span>
<span className="badge badge-error">Error</span>

// ✅ NEW (shadcn/ui)
import { Badge } from "@/components/ui/badge"

<Badge>Active</Badge>
<Badge variant="destructive">Error</Badge>
```

**For status badges:**

```tsx
import { StatusBadge } from "@/components/ui/status-badge"

<StatusBadge status="pending" />
<StatusBadge status="group-stage" />
<StatusBadge status="finished" />
<StatusBadge status="idle" />        // Board status
<StatusBadge status="active" />      // Board status
```

---

### **Alerts**

```tsx
// ❌ OLD (DaisyUI)
<div className="alert alert-error">
  <svg>...</svg>
  <span>Error message</span>
</div>

// ✅ NEW (shadcn/ui)
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Error message</AlertDescription>
</Alert>
```

**Available variants:**
- `variant="default"` - Neutral
- `variant="destructive"` - Error (red)
- `variant="success"` - Success (green)
- `variant="warning"` - Warning (yellow)
- `variant="info"` - Info (blue)

---

### **Loading States**

```tsx
// ❌ OLD (DaisyUI)
<span className="loading loading-spinner loading-lg"></span>

// ✅ NEW (shadcn/ui)
import { LoadingSpinner, LoadingScreen } from "@/components/ui/loading-spinner"

// Small spinner
<LoadingSpinner size="sm" />

// With text
<LoadingSpinner size="lg" text="Betöltés..." />

// Full screen
<LoadingScreen text="Torna betöltése..." />
```

**For card loading:**

```tsx
import { DataCard } from "@/components/ui/data-card"

<DataCard loading={isLoading} title="Data">
  {data}
</DataCard>
// Shows skeleton automatically while loading
```

---

### **Tabs**

```tsx
// ❌ OLD (DaisyUI)
<div role="tablist" className="tabs tabs-boxed">
  <a role="tab" className="tab tab-active">Tab 1</a>
  <a role="tab" className="tab">Tab 2</a>
</div>

// ✅ NEW (shadcn/ui)
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

---

### **Modals/Dialogs**

```tsx
// ❌ OLD (DaisyUI)
<dialog open className="modal">
  <div className="modal-box">
    <h3>Title</h3>
    <p>Content</p>
    <div className="modal-action">
      <button className="btn">Close</button>
    </div>
  </div>
</dialog>

// ✅ NEW (shadcn/ui)
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <p>Content</p>
    <DialogFooter>
      <Button onClick={() => setIsOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 🎨 **Style Class Migrations**

### **Colors**

```tsx
// ❌ OLD
className="text-primary"
className="bg-error"
className="border-success"

// ✅ NEW (still works, but more semantic)
className="text-primary"          // Your red
className="text-destructive"      // Error red
className="text-success"          // Green
className="text-muted-foreground" // Gray text
```

### **Spacing**

```tsx
// ❌ OLD (DaisyUI uses custom spacing)
className="card-body"  // Fixed padding

// ✅ NEW (Tailwind standard)
className="p-6"        // Padding 1.5rem
className="space-y-4"  // Vertical spacing 1rem
className="gap-3"      // Gap 0.75rem
```

### **Shadows**

```tsx
// ❌ OLD
className="shadow-xl"

// ✅ NEW (custom project shadows)
className="shadow-[0_4px_24px_0_oklch(51%_0.18_16_/_0.12)]"

// Or use Card/DataCard which have built-in shadows
```

---

## 📝 **Form Validation Pattern**

### **Complete Form Example**

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const schema = z.object({
  email: z.string().email("Érvényes email szükséges"),
  password: z.string().min(6, "Minimum 6 karakter"),
});

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    // Handle submit
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            type="email"
            label="Email"
            error={errors.email?.message}
            {...register('email')}
          />
          
          <FormField
            type="password"
            label="Password"
            error={errors.password?.message}
            {...register('password')}
          />
          
          <Button type="submit" className="w-full">
            Login
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

---

## 🔄 **Migration Strategy**

### **Option 1: Gradual Migration (Recommended)**

1. **Keep both systems running**
   - DaisyUI components continue to work
   - Add new features with shadcn/ui
   - Migrate one page at a time

2. **Start with high-impact pages**
   - ✅ Login/Register (DONE)
   - ✅ Tournament Detail (DONE)
   - Next: Create Tournament Modal
   - Next: Navigation
   - Next: Homepage

3. **Test thoroughly**
   - Each migrated component
   - Mobile responsiveness
   - User feedback

### **Option 2: Big Bang Migration**

1. Search and replace all DaisyUI classes
2. Test everything at once
3. Fix issues as they arise

**⚠️ Not recommended** - Too risky for production

---

## 🎯 **Pro Tips**

1. **Use the `cn()` utility for dynamic classes**
   ```tsx
   import { cn } from "@/lib/utils"
   
   <Button className={cn(
     "w-full",
     isLoading && "opacity-50 cursor-not-allowed"
   )}>
     Submit
   </Button>
   ```

2. **Leverage component composition**
   ```tsx
   // Bad
   <div className="p-6 bg-card rounded-lg border">
     <h2 className="text-xl font-bold">Title</h2>
     <p>Content</p>
   </div>
   
   // Good
   <Card>
     <CardHeader>
       <CardTitle>Title</CardTitle>
     </CardHeader>
     <CardContent>
       <p>Content</p>
     </CardContent>
   </Card>
   ```

3. **Use TypeScript for type safety**
   ```tsx
   import { ButtonProps } from "@/components/ui/button"
   
   function MyButton(props: ButtonProps) {
     return <Button {...props} />
   }
   ```

4. **Extract repeated patterns**
   ```tsx
   // If you use the same DataCard pattern often:
   function TournamentCard({ tournament }: { tournament: Tournament }) {
     return (
       <DataCard
         title={tournament.name}
         icon={<IconTrophy className="w-6 h-6" />}
       >
         {/* Tournament content */}
       </DataCard>
     )
   }
   ```

---

## 🐛 **Common Issues & Solutions**

### **Issue: "Cannot find module '@/components/ui/button'"**

**Solution:** Make sure you've created the component file or installed it via shadcn CLI

```bash
npx shadcn-ui@latest add button
```

### **Issue: Styles not applying**

**Solution:** Check that Tailwind is processing the new component directory

```ts
// tailwind.config.ts
content: [
  "./src/components/**/*.{js,ts,jsx,tsx}",  // Make sure this includes ui/
]
```

### **Issue: TypeScript errors with ...register()**

**Solution:** Use the correct spreading syntax

```tsx
// Good
<FormField {...register('email')} />

// Also good
<Input {...register('email')} />
```

---

## 📚 **Additional Resources**

- **This Project's Components:** `/src/components/ui/`
- **shadcn/ui Docs:** https://ui.shadcn.com
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Radix UI:** https://www.radix-ui.com/primitives

---

**Last Updated:** Now  
**Version:** 1.0.0

