# 📝 Form Validation & Error Feedback Guide

## 🎉 Overview

A comprehensive form validation system using **React Hook Form** + **Zod** with shadcn/ui components. Features include real-time validation, beautiful error messages, success feedback, and accessible form controls.

---

## 🏗️ Architecture

### **Core Components**
- `/src/components/ui/form.tsx` - Form components with validation support
- `/src/lib/validations.ts` - Reusable Zod schemas and validators

### **Example Forms**
- `/src/components/forms/CreateTournamentFormEnhanced.tsx` - Full example with best practices

---

## ✨ Features

### **1. Real-time Validation**
- Validate on blur
- Validate on submit
- Validate on change (optional)

### **2. Beautiful Error Messages**
- Icon indicators
- Smooth animations
- Clear, actionable messages in Hungarian

### **3. Success Feedback**
- Success messages
- Form reset on success
- Loading states

### **4. Accessibility**
- ARIA labels
- Error announcements
- Keyboard navigation

### **5. Reusable Schemas**
- Pre-built validators
- Type-safe
- Easy to extend

---

## 🚀 Usage

### **Basic Form Example**

```tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { loginSchema, LoginFormData } from "@/lib/validations"

export function LoginForm() {
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    console.log(data)
    // Handle login
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Email</FormLabel>
              <FormControl>
                <Input placeholder="pelda@email.com" {...field} />
              </FormControl>
              <FormDescription>
                Add meg a regisztrált email címed
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Jelszó</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Bejelentkezés</Button>
      </form>
    </Form>
  )
}
```

---

## 📊 Available Validators

### **Base Validators**

| Validator | Description | Example Error |
|-----------|-------------|---------------|
| `emailValidator` | Valid email address | "Érvénytelen email cím formátum" |
| `passwordValidator` | Strong password (8+ chars, upper, lower, number) | "A jelszónak tartalmaznia kell legalább egy nagybetűt" |
| `usernameValidator` | 3-20 chars, alphanumeric + underscore | "A felhasználónév csak betűket, számokat és aláhúzást tartalmazhat" |
| `nameValidator` | 2-50 chars, letters only | "A névnek legalább 2 karakter hosszúnak kell lennie" |
| `phoneValidator` | Valid phone number | "Érvénytelen telefonszám formátum" |
| `urlValidator` | Valid URL | "Érvénytelen URL formátum" |
| `positiveNumberValidator` | Positive number | "Az értéknek pozitívnak kell lennie" |
| `nonNegativeNumberValidator` | Non-negative number | "Az érték nem lehet negatív" |

### **Pre-built Schemas**

#### **Auth Schemas**
```typescript
import { loginSchema, registerSchema } from "@/lib/validations"

// Login
const loginForm = useForm({
  resolver: zodResolver(loginSchema),
})

// Register
const registerForm = useForm({
  resolver: zodResolver(registerSchema),
})
```

#### **Tournament Schemas**
```typescript
import { createTournamentSchema } from "@/lib/validations"

const tournamentForm = useForm({
  resolver: zodResolver(createTournamentSchema),
})
```

#### **Club Schemas**
```typescript
import { createClubSchema } from "@/lib/validations"

const clubForm = useForm({
  resolver: zodResolver(createClubSchema),
})
```

---

## 🎨 Form Components

### **FormField**
Wraps a form input with validation.

```tsx
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Label</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### **FormLabel**
Label with optional required indicator.

```tsx
<FormLabel required>Email Address</FormLabel>
// Renders: Email Address *
```

### **FormDescription**
Helper text for the field.

```tsx
<FormDescription>
  Add meg a regisztrált email címed
</FormDescription>

// With icon
<FormDescription icon={<IconInfoCircle className="w-4 h-4" />}>
  Ez az email cím nyilvános lesz
</FormDescription>
```

### **FormMessage**
Error message display.

```tsx
<FormMessage /> // Automatic error from validation

<FormMessage showIcon={false} /> // Without icon
```

### **FormSuccess**
Success message display.

```tsx
<FormSuccess>
  Sikeres mentés!
</FormSuccess>
```

---

## 🎯 Advanced Patterns

### **1. Conditional Validation**

```tsx
const schema = z.object({
  isPublic: z.boolean(),
  password: z.string().optional(),
}).refine(
  (data) => {
    // If private, password is required
    if (!data.isPublic && !data.password) {
      return false
    }
    return true
  },
  {
    message: "Privát versenyhez jelszó szükséges",
    path: ["password"],
  }
)
```

### **2. Field Dependencies**

```tsx
const schema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "A jelszavak nem egyeznek",
  path: ["confirmPassword"], // Error shows on confirmPassword field
})
```

### **3. Custom Error Messages**

```tsx
const customSchema = z.object({
  email: z
    .string()
    .min(1, "Az email cím megadása kötelező")
    .email("Ez nem egy érvényes email cím"),
  age: z
    .number()
    .min(18, "Legalább 18 évesnek kell lenned")
    .max(100, "Érvénytelen életkor"),
})
```

### **4. Dynamic Field Arrays**

```tsx
import { useFieldArray } from "react-hook-form"

function TournamentForm() {
  const form = useForm({
    defaultValues: {
      boards: [{ number: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "boards",
  })

  return (
    <div>
      {fields.map((field, index) => (
        <FormField
          key={field.id}
          control={form.control}
          name={`boards.${index}.number`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}

      <Button
        type="button"
        onClick={() => append({ number: fields.length + 1 })}
      >
        Add Board
      </Button>
    </div>
  )
}
```

### **5. Async Validation**

```tsx
const checkUsernameAvailable = async (username: string) => {
  const response = await fetch(`/api/check-username?username=${username}`)
  return response.ok
}

const schema = z.object({
  username: z.string().refine(
    async (username) => {
      return await checkUsernameAvailable(username)
    },
    {
      message: "Ez a felhasználónév már foglalt",
    }
  ),
})
```

### **6. Date Range Validation**

```tsx
const eventSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: "A befejezési dátumnak a kezdési dátum után kell lennie",
    path: ["endDate"],
  }
)
```

---

## 🎨 Styling Form States

### **Error State**

```tsx
<Input 
  className={cn(errors.email && "border-destructive")}
  {...field}
/>
```

### **Success State**

```tsx
<Input 
  className={cn(
    !errors.email && field.value && "border-success"
  )}
  {...field}
/>
```

### **Loading State**

```tsx
<Button disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
      Mentés...
    </>
  ) : (
    "Mentés"
  )}
</Button>
```

---

## 🎯 Best Practices

### **1. Always Provide Helpful Error Messages**

```typescript
// ❌ Bad
z.string().min(8)

// ✅ Good
z.string().min(8, "A jelszónak legalább 8 karakter hosszúnak kell lennie")
```

### **2. Use FormDescription for Guidance**

```tsx
<FormDescription>
  A jelszónak tartalmaznia kell legalább 8 karaktert, egy nagybetűt és egy számot
</FormDescription>
```

### **3. Mark Required Fields**

```tsx
<FormLabel required>Email cím</FormLabel>
```

### **4. Show Success Feedback**

```tsx
{submitSuccess && (
  <FormSuccess>
    A verseny sikeresen létrehozva!
  </FormSuccess>
)}
```

### **5. Disable Submit While Loading**

```tsx
<Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
  Küldés
</Button>
```

### **6. Reset Form After Success**

```tsx
const onSubmit = async (data) => {
  await api.submit(data)
  form.reset() // Reset to default values
}
```

### **7. Use Type-Safe Forms**

```tsx
// Define type from schema
type FormData = z.infer<typeof mySchema>

// Use in form
const form = useForm<FormData>({
  resolver: zodResolver(mySchema),
})
```

---

## 🔧 Creating Custom Validators

### **Simple Custom Validator**

```typescript
export const customValidator = z
  .string()
  .refine(
    (value) => value.includes("@"),
    { message: "Must contain @" }
  )
```

### **Complex Custom Validator**

```typescript
export const customPasswordValidator = z
  .string()
  .min(8, "Minimum 8 characters")
  .refine(
    (password) => /[A-Z]/.test(password),
    { message: "Must contain uppercase" }
  )
  .refine(
    (password) => /[a-z]/.test(password),
    { message: "Must contain lowercase" }
  )
  .refine(
    (password) => /[0-9]/.test(password),
    { message: "Must contain number" }
  )
  .refine(
    (password) => /[!@#$%^&*]/.test(password),
    { message: "Must contain special character" }
  )
```

### **Reusable Validator Factory**

```typescript
export function createMinMaxValidator(min: number, max: number, fieldName: string) {
  return z
    .number()
    .min(min, `${fieldName} must be at least ${min}`)
    .max(max, `${fieldName} must be at most ${max}`)
}

// Usage
const ageValidator = createMinMaxValidator(18, 100, "Age")
```

---

## 📱 Mobile Optimization

### **Touch-Friendly Inputs**

```tsx
<Input 
  className="h-12" // Larger touch targets
  {...field}
/>
```

### **Virtual Keyboard Hints**

```tsx
<Input 
  type="email"
  inputMode="email"
  autoComplete="email"
  {...field}
/>

<Input 
  type="tel"
  inputMode="tel"
  autoComplete="tel"
  {...field}
/>

<Input 
  type="number"
  inputMode="numeric"
  {...field}
/>
```

---

## ♿ Accessibility

### **1. Associate Labels**

```tsx
<FormLabel htmlFor={field.id}>Email</FormLabel>
<Input id={field.id} {...field} />
```

### **2. Announce Errors**

```tsx
<FormMessage 
  role="alert"
  aria-live="polite"
/>
```

### **3. Required Fields**

```tsx
<Input 
  required
  aria-required="true"
  {...field}
/>
```

### **4. Error States**

```tsx
<Input 
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? "email-error" : undefined}
  {...field}
/>
<FormMessage id="email-error" />
```

---

## 🐛 Common Issues & Solutions

### **Issue: Validation not triggering**

**Solution:** Ensure resolver is set:
```tsx
const form = useForm({
  resolver: zodResolver(mySchema), // Don't forget this!
})
```

### **Issue: Form not resetting**

**Solution:** Call `form.reset()` after successful submission:
```tsx
const onSubmit = async (data) => {
  await api.submit(data)
  form.reset() // Reset form
}
```

### **Issue: Errors not displaying**

**Solution:** Make sure `<FormMessage />` is inside `<FormItem>`:
```tsx
<FormItem>
  <FormLabel>Field</FormLabel>
  <FormControl>
    <Input {...field} />
  </FormControl>
  <FormMessage /> {/* Must be here */}
</FormItem>
```

### **Issue: Default values not working**

**Solution:** Use `defaultValues` in `useForm`:
```tsx
const form = useForm({
  defaultValues: {
    email: "",
    name: "",
  },
})
```

---

## 📚 Resources

- [React Hook Form Docs](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [shadcn/ui Forms](https://ui.shadcn.com/docs/components/form)
- [WCAG Form Guidelines](https://www.w3.org/WAI/tutorials/forms/)

---

## ✅ Validation Checklist

Before deploying forms, ensure:

- [ ] All fields have proper validation
- [ ] Error messages are clear and actionable
- [ ] Required fields are marked
- [ ] Success feedback is shown
- [ ] Loading states are handled
- [ ] Form resets after success
- [ ] Accessible (ARIA labels, keyboard navigation)
- [ ] Mobile-friendly (touch targets, virtual keyboard)
- [ ] Tested with various inputs (edge cases)
- [ ] Type-safe (using TypeScript types from Zod)

---

## 🎉 Summary

The enhanced form validation system provides:

- ✅ **Type Safety** - Full TypeScript support
- ✅ **Beautiful UX** - Animated errors and success messages
- ✅ **Accessible** - WCAG compliant
- ✅ **Reusable** - Pre-built validators and schemas
- ✅ **Developer Friendly** - Easy to use and extend
- ✅ **Production Ready** - Battle-tested patterns

---

**Ready to build bulletproof forms?** Use these components and never worry about validation again! 📝✨

---

**Created:** Now  
**Version:** 1.0.0  
**Status:** ✅ Ready for Use

