/**
 * Focus Contract V1 AI Task Planning Test Suite
 * Tests Zod runtime schema validation, error boundaries, task extraction,
 * selective persistence, and backward compatibility with V0.
 */

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

(global as unknown as { localStorage: MockLocalStorage }).localStorage = new MockLocalStorage();

import { validateAIPlanResponse } from '../src/lib/ai/schemas';
import { planTasksFromReflection } from '../src/lib/ai/taskPlanner';
import { createTask, getTasks, deleteTask } from '../src/lib/tasks';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

async function runV1Tests() {
  console.log('====================================================');
  console.log('FOCUS CONTRACT V1: AI TASK PLANNING TEST SUITE');
  console.log('====================================================\n');

  // TEST 1: Valid AI response parses successfully
  console.log('Suite 1: Runtime Schema Validation with Zod');
  const validAiPayload = JSON.stringify({
    tasks: [
      {
        title: 'Finish DBMS normalization assignment',
        description: 'Complete 3NF and BCNF problems from chapter 4',
        priority: 'high',
        estimated_minutes: 45,
        deadline: '2026-10-05T18:00:00.000Z',
        reasoning: 'Assignment explicitly mentioned as due tomorrow',
      },
      {
        title: 'Study DLD sequential circuits',
        description: null,
        priority: 'urgent',
        estimated_minutes: 30,
        deadline: null,
        reasoning: 'Test scheduled for tomorrow morning',
      },
    ],
  });

  const res1 = validateAIPlanResponse(validAiPayload);
  assert(res1.success === true, 'Valid AI response parses successfully');
  assert(res1.data?.tasks.length === 2, 'Extracts both tasks from valid response');
  assert(res1.data?.tasks[0].title === 'Finish DBMS normalization assignment', 'Title preserved correctly');

  // TEST 2: Invalid JSON format is rejected
  const invalidJson = '{"tasks": [ { "title": "Incomplete json...';
  const res2 = validateAIPlanResponse(invalidJson);
  assert(res2.success === false, 'Invalid JSON is rejected safely');
  assert(res2.error?.includes('Invalid JSON format') ?? false, 'Returns descriptive JSON parse error');

  // TEST 3: Missing title is rejected
  const missingTitle = JSON.stringify({
    tasks: [
      {
        priority: 'high',
        estimated_minutes: 30,
      },
    ],
  });
  const res3 = validateAIPlanResponse(missingTitle);
  assert(res3.success === false, 'Missing title is rejected');

  // TEST 4: Empty / whitespace title is rejected
  const emptyTitle = JSON.stringify({
    tasks: [
      {
        title: '   ',
        priority: 'medium',
        estimated_minutes: 25,
      },
    ],
  });
  const res4 = validateAIPlanResponse(emptyTitle);
  assert(res4.success === false, 'Empty or whitespace title is rejected');

  // TEST 5: Invalid priority is rejected
  const invalidPriority = JSON.stringify({
    tasks: [
      {
        title: 'Study Algorithms',
        priority: 'super_high', // Not in ('low', 'medium', 'high', 'urgent')
        estimated_minutes: 40,
      },
    ],
  });
  const res5 = validateAIPlanResponse(invalidPriority);
  assert(res5.success === false, 'Invalid priority is rejected by enum validation');

  // TEST 6: estimated_minutes <= 0 is rejected
  const nonPositiveMinutes = JSON.stringify({
    tasks: [
      {
        title: 'Quick Review',
        priority: 'low',
        estimated_minutes: 0,
      },
    ],
  });
  const res6 = validateAIPlanResponse(nonPositiveMinutes);
  assert(res6.success === false, 'estimated_minutes <= 0 is rejected');

  const negativeMinutes = JSON.stringify({
    tasks: [
      {
        title: 'Quick Review',
        priority: 'low',
        estimated_minutes: -15,
      },
    ],
  });
  const res6b = validateAIPlanResponse(negativeMinutes);
  assert(res6b.success === false, 'Negative estimated_minutes is rejected');

  // TEST 7: null deadline is accepted
  const nullDeadlineToTest = JSON.stringify({
    tasks: [
      {
        title: 'General Reading',
        priority: 'low',
        estimated_minutes: 30,
        deadline: null,
      },
    ],
  });
  const res7 = validateAIPlanResponse(nullDeadlineToTest);
  assert(res7.success === true, 'null deadline is accepted');
  assert(res7.data?.tasks[0].deadline === null, 'Deadline remains null without inventing dates');

  // TEST 8: Valid deadline string is accepted
  const validDeadlineIso = '2026-10-10T12:00:00.000Z';
  const validDeadlineToTest = JSON.stringify({
    tasks: [
      {
        title: 'Submit Project Report',
        priority: 'urgent',
        estimated_minutes: 60,
        deadline: validDeadlineIso,
      },
    ],
  });
  const res8 = validateAIPlanResponse(validDeadlineToTest);
  assert(res8.success === true, 'Valid ISO deadline is accepted');
  assert(res8.data?.tasks[0].deadline === validDeadlineIso, 'ISO deadline is preserved exactly');

  // TEST 9: Empty student input is rejected
  console.log('\nSuite 2: Task Planner Service & Error Boundaries');
  const emptyInputRes = await planTasksFromReflection('   ');
  assert(emptyInputRes.tasks.length === 0, 'Empty student input yields 0 tasks');
  assert(emptyInputRes.error !== null, 'Empty student input returns controlled user-friendly error');

  // TEST 10: AI Failure returns controlled application error
  // Clean markdown block stripping test
  const markdownFencedJson = '```json\n{"tasks":[{"title":"Read chapter 3","priority":"medium","estimated_minutes":20,"deadline":null}]}\n```';
  const resMarkdown = validateAIPlanResponse(markdownFencedJson);
  assert(resMarkdown.success === true, 'Markdown code fences are handled cleanly');
  assert(resMarkdown.data?.tasks[0].title === 'Read chapter 3', 'Parsed fenced task title correctly');

  // TEST 11 & 12: Selective Persistence (Unaccepted suggestions NOT persisted, Accepted ARE persisted)
  console.log('\nSuite 3: Task Persistence & Workflow Integrity');
  const testStudentId = 'student-v1-test-user-999';

  // Let's generate a plan with 2 suggestions
  const planResult = await planTasksFromReflection(
    'I have a DBMS assignment due tomorrow and a physics lab report to submit.'
  );
  assert(planResult.tasks.length > 0, 'Plan generated task suggestions');

  // Check database before acceptance: MUST be empty!
  const beforeAccept = await getTasks(testStudentId);
  assert(beforeAccept.data.length === 0, 'Unaccepted AI suggestions are NOT persisted to database');

  // Accept ONLY the first suggestion
  const taskToAccept = planResult.tasks[0];
  const acceptedRes = await createTask(testStudentId, {
    title: taskToAccept.title,
    description: taskToAccept.description || '',
    priority: taskToAccept.priority,
    estimated_minutes: taskToAccept.estimated_minutes,
    deadline: taskToAccept.deadline || '',
    status: 'pending',
  });
  assert(acceptedRes.data !== null && acceptedRes.error === null, 'Accepted suggestion persisted through task service');

  // Verify in database: exactly 1 task exists
  const afterAccept = await getTasks(testStudentId);
  assert(afterAccept.data.length === 1, 'Only accepted task was persisted');
  assert(afterAccept.data[0].title === taskToAccept.title, 'Persisted task matches accepted AI suggestion');

  // Cleanup
  await deleteTask(afterAccept.data[0].id, testStudentId);
  const afterDelete = await getTasks(testStudentId);
  assert(afterDelete.data.length === 0, 'Cleaned up test task successfully');

  // TEST 13 & 14: Existing V0 Compatibility
  console.log('\nSuite 4: Backward Compatibility with V0');
  const manualTask = await createTask(testStudentId, {
    title: 'Manual Task V0 Check',
    description: 'Verifying V0 manual CRUD unaffected by V1',
    priority: 'high',
    estimated_minutes: 25,
    deadline: '',
    status: 'pending',
  });
  assert(manualTask.data !== null, 'Existing manual task creation works unchanged');
  const listV0 = await getTasks(testStudentId);
  assert(listV0.data.length === 1 && listV0.data[0].title === 'Manual Task V0 Check', 'V0 task retrieval works unchanged');
  await deleteTask(manualTask.data!.id, testStudentId);

  // Summary
  console.log('\n====================================================');
  console.log(`V1 TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runV1Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
