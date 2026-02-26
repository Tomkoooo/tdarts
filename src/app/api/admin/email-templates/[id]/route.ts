import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/database/services/auth.service';
import { EmailTemplateService } from '@/database/services/emailtemplate.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check authentication
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch template by ID
    const template = await EmailTemplateService.getTemplateById(id);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      template,
      templateGroup: await EmailTemplateService.getTemplateGroupById(id),
    });
  } catch (error) {
    console.error('Error fetching email template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check authentication
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get update data
    const body = await request.json();
    const { subject, htmlContent, textContent, isActive, name, description, locales } = body;

    const updates: any = {};
    if (subject !== undefined) updates.subject = subject;
    if (htmlContent !== undefined) updates.htmlContent = htmlContent;
    if (textContent !== undefined) updates.textContent = textContent;
    if (isActive !== undefined) updates.isActive = isActive;
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    // Support grouped locale updates in one request
    if (locales && typeof locales === 'object') {
      const existing = await EmailTemplateService.getTemplateById(id);
      if (!existing) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      const templateGroup = await EmailTemplateService.upsertTemplateLocales(
        existing.key,
        locales,
        user._id.toString()
      );

      return NextResponse.json({
        success: true,
        template: await EmailTemplateService.getTemplateById(id),
        templateGroup,
      });
    }

    // Update single template fallback (legacy)
    const template = await EmailTemplateService.updateTemplate(
      id,
      updates,
      user._id.toString()
    );

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      template,
      templateGroup: await EmailTemplateService.getTemplateGroupById(id),
    });
  } catch (error) {
    console.error('Error updating email template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = await request.json();

    // Check authentication
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'preview') {
      // Get preview request
      const { variables } = await request.json();
      
      // Fetch template
      const template = await EmailTemplateService.getTemplateById(id);
      
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      // Render with provided variables
      const rendered = await EmailTemplateService.getRenderedTemplate(
        template.key,
        variables || {},
        { locale: template.locale || 'hu' }
      );

      if (!rendered) {
        return NextResponse.json({ error: 'Failed to render template' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        preview: rendered,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in email template action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
