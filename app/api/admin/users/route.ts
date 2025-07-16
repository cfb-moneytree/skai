import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('List Users API: Authentication error', authError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userIsAdmin = user?.user_metadata?.role === 'admin';
    if (!userIsAdmin) {
      console.warn(`List Users API: User ${user.id} is not an admin.`);
      return NextResponse.json({ error: 'Not authorized. Admin role required.' }, { status: 403 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      console.error('List Users API: Missing Supabase service role key or URL environment variables.');
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const supabaseAdminClient = createAdminClient(supabaseUrl, serviceRoleKey);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('perPage') || '10', 10);

    const { data: usersData, error: listUsersError } = await supabaseAdminClient.auth.admin.listUsers({
      page: page,
      perPage: perPage,
    });

    if (listUsersError) {
      console.error('List Users API: Error listing users:', listUsersError);
      return NextResponse.json({ error: `Failed to list users: ${listUsersError.message}` }, { status: 500 });
    }
    
    return NextResponse.json(usersData, { status: 200 });

  } catch (e: any) {
    console.error('List Users API: Unexpected error:', e);
    return NextResponse.json({ error: 'An unexpected error occurred: ' + e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Create User API: Authentication error', authError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userIsAdmin = user?.user_metadata?.role === 'admin';
    if (!userIsAdmin) {
      console.warn(`Create User API: User ${user.id} is not an admin.`);
      return NextResponse.json({ error: 'Not authorized. Admin role required.' }, { status: 403 });
    }

    const { email, password, user_metadata } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required to create a user.' }, { status: 400 });
    }
    if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      console.error('Create User API: Missing Supabase service role key or URL environment variables.');
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const supabaseAdminClient = createAdminClient(supabaseUrl, serviceRoleKey);
    const { data: newUserResponse, error: createUserError } = await supabaseAdminClient.auth.admin.createUser({
      email,
      password,
      user_metadata: user_metadata || {},
      email_confirm: true, 
    });

    if (createUserError) {
      console.error('Create User API: Error creating user:', createUserError);
      return NextResponse.json({ error: `Failed to create user: ${createUserError.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: 'User created successfully', user: newUserResponse.user }, { status: 201 });

  } catch (e: any) {
    console.error('Create User API: Unexpected error:', e);
    if (e instanceof SyntaxError && e.message.includes('JSON')) {
        return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred: ' + e.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !adminUser) {
      console.error('Update User API: Authentication error', authError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const isAdmin = adminUser?.user_metadata?.role === 'admin';
    if (!isAdmin) {
      console.warn(`Update User API: User ${adminUser.id} is not an admin.`);
      return NextResponse.json({ error: 'Not authorized. Admin role required.' }, { status: 403 });
    }

    const { userId, email, user_metadata } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required to update a user.' }, { status: 400 });
    }

    const updatePayload: { email?: string; user_metadata?: any } = {};
    if (email) {
      updatePayload.email = email;
    }
    if (user_metadata) {
      updatePayload.user_metadata = user_metadata;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No update data provided.' }, { status: 400 });
    }
    
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      console.error('Update User API: Missing Supabase service role key or URL environment variables.');
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const supabaseAdminClient = createAdminClient(supabaseUrl, serviceRoleKey);
    const { data: updatedUserResponse, error: updateUserError } = await supabaseAdminClient.auth.admin.updateUserById(
      userId,
      updatePayload
    );

    if (updateUserError) {
      console.error(`Update User API: Error updating user ${userId}:`, updateUserError);
      return NextResponse.json({ error: `Failed to update user: ${updateUserError.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: 'User updated successfully', user: updatedUserResponse.user }, { status: 200 });

  } catch (e: any) {
    console.error('Update User API: Unexpected error:', e);
    if (e instanceof SyntaxError && e.message.includes('JSON')) {
        return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred: ' + e.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !adminUser) {
      console.error('Delete User API: Authentication error', authError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const isAdmin = adminUser?.user_metadata?.role === 'admin';
    if (!isAdmin) {
      console.warn(`Delete User API: User ${adminUser.id} is not an admin.`);
      return NextResponse.json({ error: 'Not authorized. Admin role required.' }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required to delete a user.' }, { status: 400 });
    }
    
    if (userId === adminUser.id) {
      return NextResponse.json({ error: 'Admins cannot delete their own account through this API.' }, { status: 403 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      console.error('Delete User API: Missing Supabase service role key or URL environment variables.');
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const supabaseAdminClient = createAdminClient(supabaseUrl, serviceRoleKey);
    const { error: deleteUserError } = await supabaseAdminClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error(`Delete User API: Error deleting user ${userId}:`, deleteUserError);
      return NextResponse.json({ error: `Failed to delete user: ${deleteUserError.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: `User ${userId} deleted successfully.` }, { status: 200 });

  } catch (e: any) {
    console.error('Delete User API: Unexpected error:', e);
    if (e instanceof SyntaxError && e.message.includes('JSON')) {
        return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred: ' + e.message }, { status: 500 });
  }
}