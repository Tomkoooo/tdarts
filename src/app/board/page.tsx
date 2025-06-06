import { Suspense } from "react";
import BoardPageClient from "@/components/board/boardClientPage";

export default function BoardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Betöltés...</div>}>
      <BoardPageClient />
    </Suspense>
  );
}