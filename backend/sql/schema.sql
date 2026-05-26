-- Enable UUID generation (run once per DB)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";



-- USERS TABLE

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
  email TEXT NOT NULL UNIQUE,                      
  password_hash TEXT NOT NULL,                     
  name TEXT NOT NULL,                         
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE, 
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);




-- EMAIL VERIFICATION TOKENS

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),   
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,                            
  expires_at TIMESTAMPTZ NOT NULL,                 
  used_at TIMESTAMPTZ,                             
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);




-- TASK LISTS

CREATE TABLE IF NOT EXISTS task_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                             
  sort_order INT DEFAULT 0,                        
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

for default task_lists:
ALTER TABLE task_lists
ADD COLUMN is_default BOOLEAN DEFAULT FALSE;





-- TASKS (including SUBTASKS)

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES task_lists(id) ON DELETE CASCADE,

  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE, 
  

  title TEXT NOT NULL,
  description TEXT,

  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_starred BOOLEAN NOT NULL DEFAULT FALSE,

  due_date DATE,
  reminder_at TIMESTAMPTZ,

  sort_order INT NOT NULL DEFAULT 0,               
  deleted_at TIMESTAMPTZ,                         
  completed_at TIMESTAMPTZ,                        

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- To delete reminder_at column in tasks table
ALTER TABLE tasks
DROP COLUMN IF EXISTS reminder_at;



-- For adding column google_id in users table
ALTER TABLE users
ADD COLUMN google_id TEXT UNIQUE;



-- Removing NOT NULL for password_hash in users table
ALTER TABLE users
ALTER COLUMN password_hash DROP NOT NULL;


-- A column to identify default lists:
ALTER TABLE task_lists
ADD COLUMN is_default BOOLEAN DEFAULT FALSE;


-- FOCUS MODE SESSIONS TABLE
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_end_time TIMESTAMPTZ NOT NULL,
  actual_end_time TIMESTAMPTZ,
  minutes_focused INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
