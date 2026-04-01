const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY;

// Simple retry helper
const withRetry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
};

let supabase = null;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL or Key not found in environment variables. Supabase features will be disabled.');
  
  // Create a mock builder that allows chaining but eventually returns the error
  const mockBuilder = {
    select: () => mockBuilder,
    insert: () => mockBuilder,
    update: () => mockBuilder,
    delete: () => mockBuilder,
    eq: () => mockBuilder,
    neq: () => mockBuilder,
    gt: () => mockBuilder,
    lt: () => mockBuilder,
    gte: () => mockBuilder,
    lte: () => mockBuilder,
    like: () => mockBuilder,
    ilike: () => mockBuilder,
    is: () => mockBuilder,
    in: () => mockBuilder,
    contains: () => mockBuilder,
    containedBy: () => mockBuilder,
    range: () => mockBuilder,
    limit: () => mockBuilder,
    offset: () => mockBuilder,
    single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    maybeSingle: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    csv: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
    order: () => mockBuilder,
    then: (resolve) => resolve({ data: [], error: { message: 'Supabase not configured' }, count: 0 }) // Make it awaitable
  };

  supabase = {
    from: () => mockBuilder,
    auth: {
      admin: {
        listUsers: () => Promise.resolve({ data: { users: [] }, error: { message: 'Supabase not configured' } }),
        getUserById: () => Promise.resolve({ data: { user: null }, error: { message: 'Supabase not configured' } }),
        deleteUser: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      },
      signInWithPassword: () => Promise.resolve({ data: { session: null, user: null }, error: { message: 'Supabase not configured. Please add SUPABASE_URL and SUPABASE_KEY to .env' } }),
      signUp: () => Promise.resolve({ data: { session: null, user: null }, error: { message: 'Supabase not configured' } }),
      signOut: () => Promise.resolve({ error: { message: 'Supabase not configured' } }),
      getUser: () => Promise.resolve({ data: { user: null }, error: { message: 'Supabase not configured' } }),
    }
  };
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
}

module.exports = { supabase, withRetry };