import { TodoModel, TodoDocument } from '@/database/models/todo.model';
import { connectMongo } from '@/lib/mongoose';
import { BadRequestError } from '@/middleware/errorHandle';

export interface CreateTodoData {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'bug' | 'feature' | 'improvement' | 'maintenance' | 'other';
  assignedTo?: string;
  dueDate?: Date;
  tags?: string[];
  isPublic?: boolean;
}

export interface UpdateTodoData {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  category?: 'bug' | 'feature' | 'improvement' | 'maintenance' | 'other';
  assignedTo?: string;
  dueDate?: Date;
  tags?: string[];
  isPublic?: boolean;
  completedAt?: Date;
  completedBy?: string;
}

export class TodoService {
  static async createTodo(creatorId: string, todoData: CreateTodoData): Promise<TodoDocument> {
    await connectMongo();

    const todo = new TodoModel({
      ...todoData,
      createdBy: creatorId,
      isPublic: todoData.isPublic ?? true
    });

    return await todo.save();
  }

  static async getAllTodos(filters?: {
    status?: string;
    priority?: string;
    category?: string;
    assignedTo?: string;
    isPublic?: boolean;
  }): Promise<TodoDocument[]> {
    await connectMongo();

    const query: any = {};
    
    if (filters?.status) query.status = filters.status;
    if (filters?.priority) query.priority = filters.priority;
    if (filters?.category) query.category = filters.category;
    if (filters?.assignedTo) query.assignedTo = filters.assignedTo;
    if (filters?.isPublic !== undefined) query.isPublic = filters.isPublic;

    return await TodoModel.find(query)
      .populate('createdBy', 'username name')
      .populate('assignedTo', 'username name')
      .populate('completedBy', 'username name')
      .sort({ priority: -1, createdAt: -1 });
  }

  static async getTodoById(todoId: string): Promise<TodoDocument | null> {
    await connectMongo();

    return await TodoModel.findById(todoId)
      .populate('createdBy', 'username name')
      .populate('assignedTo', 'username name')
      .populate('completedBy', 'username name');
  }

  static async updateTodo(todoId: string, userId: string, updates: UpdateTodoData): Promise<TodoDocument> {
    await connectMongo();

    const todo = await TodoModel.findById(todoId);
    if (!todo) {
      throw new BadRequestError('Todo not found');
    }

    // Ha a státusz completed-re változik, állítsuk be a completedAt és completedBy mezőket
    if (updates.status === 'completed' && todo.status !== 'completed') {
      updates.completedAt = new Date();
      updates.completedBy = userId;
    }

    // Ha a státusz completed-ről változik, töröljük a completedAt és completedBy mezőket
    if (updates.status && updates.status !== 'completed' && todo.status === 'completed') {
      updates.completedAt = undefined;
      updates.completedBy = undefined;
    }

    const updatedTodo = await TodoModel.findByIdAndUpdate(
      todoId,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedTodo) {
      throw new BadRequestError('Failed to update todo');
    }

    return updatedTodo;
  }

  static async deleteTodo(todoId: string): Promise<void> {
    await connectMongo();

    const result = await TodoModel.findByIdAndDelete(todoId);
    if (!result) {
      throw new BadRequestError('Todo not found');
    }
  }

  static async getTodoStats(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }> {
    await connectMongo();

    const stats = await TodoModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } }
        }
      }
    ]);

    return stats[0] || {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
  }

  static async getOverdueTodos(): Promise<TodoDocument[]> {
    await connectMongo();

    const now = new Date();
    return await TodoModel.find({
      dueDate: { $lt: now },
      status: { $nin: ['completed', 'cancelled'] }
    })
      .populate('createdBy', 'username name')
      .populate('assignedTo', 'username name')
      .sort({ dueDate: 1 });
  }
}
