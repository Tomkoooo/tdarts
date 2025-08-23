import { NextRequest, NextResponse } from 'next/server';
import { TodoService } from '@/database/services/todo.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { AuthService } from '@/database/services/auth.service';

export async function GET(request: NextRequest) {
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

    // Query paraméterek kinyerése
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const assignedTo = searchParams.get('assignedTo');

    const filters: any = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (category) filters.category = category;
    if (assignedTo) filters.assignedTo = assignedTo;

    const todos = await TodoService.getAllTodos(filters);
    
    return NextResponse.json({ success: true, todos });
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Admin jogosultság ellenőrzése
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await AuthorizationService.checkAdminOnly(user._id.toString(), '');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, priority, category, assignedTo, dueDate, tags, isPublic } = body;

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const todo = await TodoService.createTodo(user._id.toString(), {
      title: title.trim(),
      description: description?.trim(),
      priority,
      category,
      assignedTo,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      tags: tags || [],
      isPublic
    });

    return NextResponse.json({ success: true, todo }, { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
