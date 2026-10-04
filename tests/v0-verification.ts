/**
 * Focus Contract V0 Foundation Verification & Test Suite
 * Tests authentication logic, task CRUD, schema validation, and user data isolation
 */

import fs from 'fs';
import path from 'path';

// Setup Mock LocalStorage for testing environment
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string) {
    return this.store[key] || null;
  }
  setItem(key: string, value: string) {
    this.store[key] = value.toString();
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

// Polyfill global localStorage for the test runner
(global as unknown as { localStorage: MockLocalStorage }).localStorage = new MockLocalStorage();

import { createTask, getTasks, updateTask, deleteTask, toggleTaskComplete } from '../src/lib/tasks';
import { TaskFormData } from '../src/types/task';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
    testsFailed++;
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('FOCUS CONTRACT V0: AUTOMATED TEST & VERIFICATION SUITE');
  console.log('====================================================\n');

  // TEST SUITE 1: Required Files & Routes Inspection
  console.log('Suite 1: Verifying File & Route Structure');
  const requiredRoutes = [
    'src/app/page.tsx',
    'src/app/login/page.tsx',
    'src/app/signup/page.tsx',
    'src/app/dashboard/page.tsx',
    'src/app/tasks/page.tsx',
    'src/app/focus/page.tsx',
    'src/app/reflection/page.tsx',
    'src/app/rewards/page.tsx',
  ];

  for (const route of requiredRoutes) {
    const fullPath = path.resolve(process.cwd(), route);
    assert(fs.existsSync(fullPath), `Route file exists: ${route}`);
  }

  // TEST SUITE 2: Database Schema & RLS Verification
  console.log('\nSuite 2: Database Schema & RLS Verification');
  const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql');
  assert(fs.existsSync(schemaPath), 'schema.sql exists in supabase directory');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');

  assert(schemaContent.includes('create table if not exists public.users'), 'Schema defines "users" table');
  assert(schemaContent.includes('create table if not exists public.tasks'), 'Schema defines "tasks" table');
  assert(schemaContent.includes('alter table public.users enable row level security'), 'RLS enabled on "users" table');
  assert(schemaContent.includes('alter table public.tasks enable row level security'), 'RLS enabled on "tasks" table');
  assert(schemaContent.includes('auth.uid() = user_id'), 'Strict RLS policy checks auth.uid() = user_id');
  assert(schemaContent.includes('handle_new_user()'), 'Auto-sync trigger function for auth.users -> public.users');
  assert(schemaContent.includes('handle_updated_at()'), 'Auto-sync trigger function for updated_at');

  // TEST SUITE 3: Task Creation & Validation
  console.log('\nSuite 3: Task Creation & Validation');
  const student1Id = 'student-test-uuid-001';
  const student2Id = 'student-test-uuid-002';

  // Test 3.1: Reject empty title
  const invalidTask1: TaskFormData = {
    title: '   ',
    description: 'Empty title test',
    priority: 'high',
    estimated_minutes: 30,
    deadline: '',
    status: 'pending',
  };
  const res1 = await createTask(student1Id, invalidTask1);
  assert(res1.error !== null && res1.data === null, 'Rejects task with whitespace/empty title');

  // Test 3.2: Reject invalid duration
  const invalidTask2: TaskFormData = {
    title: 'Study DLD',
    description: 'Testing duration <= 0',
    priority: 'high',
    estimated_minutes: 0,
    deadline: '',
    status: 'pending',
  };
  const res2 = await createTask(student1Id, invalidTask2);
  assert(res2.error !== null && res2.data === null, 'Rejects task with estimated_minutes <= 0');

  // Test 3.3: Successfully create valid task
  const validTask: TaskFormData = {
    title: 'Study DLD Digital Logic',
    description: 'Review sequential circuits and flip-flops',
    priority: 'high',
    estimated_minutes: 45,
    deadline: new Date(Date.now() + 86400000).toISOString(),
    status: 'pending',
  };
  const createRes = await createTask(student1Id, validTask);
  assert(createRes.error === null && createRes.data !== null, 'Creates valid task successfully');
  const taskId = createRes.data?.id || '';
  assert(createRes.data?.title === 'Study DLD Digital Logic', 'Task title preserved correctly');
  assert(createRes.data?.estimated_minutes === 45, 'Task estimated duration preserved');
  assert(createRes.data?.priority === 'high', 'Task priority preserved');
  assert(createRes.data?.status === 'pending', 'Initial status defaults to pending');

  // TEST SUITE 4: Task Read, Edit, Complete, & Delete Operations
  console.log('\nSuite 4: Task Read, Edit, Complete, & Delete');

  // Fetch tasks
  const listRes = await getTasks(student1Id);
  assert(listRes.data.length === 1, 'Retrieves student tasks list');

  // Edit task
  const updateRes = await updateTask(taskId, student1Id, {
    title: 'Study DLD Sequential Logic (Updated)',
    estimated_minutes: 60,
    priority: 'urgent',
  });
  assert(updateRes.error === null && updateRes.data?.title === 'Study DLD Sequential Logic (Updated)', 'Updates task title');
  assert(updateRes.data?.estimated_minutes === 60, 'Updates task estimated duration');
  assert(updateRes.data?.priority === 'urgent', 'Updates task priority to urgent');

  // Toggle complete
  const toggleRes = await toggleTaskComplete(taskId, student1Id, 'pending');
  assert(toggleRes.data?.status === 'completed', 'Toggles task status to completed');
  assert(toggleRes.data?.completed_at !== null, 'Sets completed_at timestamp on completion');

  // Toggle back to pending
  const toggleBackRes = await toggleTaskComplete(taskId, student1Id, 'completed');
  assert(toggleBackRes.data?.status === 'pending', 'Toggles task status back to pending');

  // Add a second task for filtering tests
  await createTask(student1Id, {
    title: 'Complete DBMS Lab Exercise',
    description: 'Write SQL queries for relational algebra lab',
    priority: 'low',
    estimated_minutes: 20,
    deadline: '',
    status: 'completed',
  });

  // TEST SUITE 5: Task Filtering & Sorting
  console.log('\nSuite 5: Filtering and Sorting');
  const pendingFilter = await getTasks(student1Id, { status: 'pending' });
  assert(pendingFilter.data.length === 1 && pendingFilter.data[0].id === taskId, 'Filters by pending status');

  const completedFilter = await getTasks(student1Id, { status: 'completed' });
  assert(completedFilter.data.length === 1 && completedFilter.data[0].title === 'Complete DBMS Lab Exercise', 'Filters by completed status');

  const priorityFilter = await getTasks(student1Id, { priority: 'urgent' });
  assert(priorityFilter.data.length === 1 && priorityFilter.data[0].priority === 'urgent', 'Filters by priority');

  // TEST SUITE 6: Multi-User Data Isolation & Security
  console.log('\nSuite 6: Multi-User Data Isolation');
  // Student 2 should see 0 tasks
  const student2List = await getTasks(student2Id);
  assert(student2List.data.length === 0, 'Student 2 cannot see Student 1 tasks');

  // Student 2 cannot update Student 1's task
  const unauthorizedUpdate = await updateTask(taskId, student2Id, { title: 'Hacked Title' });
  assert(unauthorizedUpdate.error !== null, 'Student 2 cannot modify Student 1 task');

  // Student 2 cannot delete Student 1's task
  await deleteTask(taskId, student2Id);
  // Ensure the task still exists for student 1
  const student1Verify = await getTasks(student1Id);
  assert(student1Verify.data.some(t => t.id === taskId), 'Student 2 cannot delete Student 1 task');

  // Student 1 can delete their own task
  const deleteRes = await deleteTask(taskId, student1Id);
  assert(deleteRes.success, 'Student 1 can delete their own task');
  const afterDeleteList = await getTasks(student1Id);
  assert(!afterDeleteList.data.some(t => t.id === taskId), 'Task is removed from Student 1 list after deletion');

  // Summary
  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('====================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
