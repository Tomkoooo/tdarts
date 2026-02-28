import { NextRequest, NextResponse } from 'next/server';
import { TodoService } from '@/database/services/todo.service';
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(request: NextRequest) {
  try {
    // Admin jogosultság ellenőrzése
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const stats = await TodoService.getTodoStats();
    const overdueTodos = await TodoService.getOverdueTodos();
    
    return NextResponse.json({ 
      success: true, 
      stats,
      overdueCount: overdueTodos.length,
      overdueTodos: overdueTodos.slice(0, 5) // Csak az első 5 lejárt todo
    });
  } catch (error) {
    console.error('Error fetching todo stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withApiTelemetry('/api/admin/todos/stats', __GET as any);
