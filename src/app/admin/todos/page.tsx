"use client";
import TodoManager from '@/components/admin/TodoManager';

export default function AdminTodosPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gradient-red mb-2">Todo Kezelés</h1>
        <p className="text-base-content/60">Feladatok és eszrevételek követése</p>
      </div>

      <TodoManager />
    </div>
  );
}