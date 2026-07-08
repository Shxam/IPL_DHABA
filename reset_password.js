const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/sham3/OneDrive/Desktop/APP/.env' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables!');
  console.error('Url:', supabaseUrl);
  console.error('Key length:', supabaseServiceKey ? supabaseServiceKey.length : 0);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetPassword() {
  const userId = 'f74d2f57-5406-4a9c-b7bc-eaaa94767494'; // pamarthisaisai@gmail.com
  const newPassword = 'DhabaOwner123!';

  try {
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (error) throw error;

    console.log('SUCCESS: Password for pamarthisaisai@gmail.com has been reset to: ' + newPassword);
  } catch (error) {
    console.error('Error resetting password:', error.message);
  }
}

resetPassword();
