import { NextRequest, NextResponse } from 'next/server';
import { TodoService } from '@/database/services/todo.service';
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Admin jogosultság ellenőrzése
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const todo = await TodoService.getTodoById(id);
    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, todo });
  } catch (error) {
    console.error('Error fetching todo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function __PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Admin jogosultság ellenőrzése
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, priority, status, category, assignedTo, dueDate, tags, isPublic } = body;

    if (title !== undefined && title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title cannot be empty' },
        { status: 400 }
      );
    }

    const updatedTodo = await TodoService.updateTodo(id, user._id.toString(), {
      title: title?.trim(),
      description: description?.trim(),
      priority,
      status,
      category,
      assignedTo,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      tags,
      isPublic
    });

    return NextResponse.json({ success: true, todo: updatedTodo });
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function __DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Admin jogosultság ellenőrzése
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await TodoService.deleteTodo(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withApiTelemetry('/api/admin/todos/[id]', __GET as any);
export const PUT = withApiTelemetry('/api/admin/todos/[id]', __PUT as any);
export const DELETE = withApiTelemetry('/api/admin/todos/[id]', __DELETE as any);
