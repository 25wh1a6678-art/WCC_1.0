/**
 * FOCUS CONTRACT — V3 AUTOMATED TEST SUITE
 * Verifies Commitment Creation, Focus Timer, Status Transitions, and Multi-user Isolation
 */

import {
  createCommitment,
  getActiveCommitment,
  getCommitments,
  completeCommitment,
  rescheduleCommitment,
  abandonCommitment,
  getCommitmentStats,
  deleteCommitment,
} from '../src/lib/commitments';
import { createTask, getTaskById } from '../src/lib/tasks';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runV3Tests() {
  console.log('====================================================');
  console.log('FOCUS CONTRACT V3: COMMITMENT MODE TEST SUITE');
  console.log('====================================================\n');

  const userA = 'test-user-v3-alpha';
  const userB = 'test-user-v3-beta';

  // Create prerequisite tasks for User A and User B
  const taskARes = await createTask(userA, {
    title: 'Study DLD Logic Gates',
    description: 'Prepare chapters 1-3 for tomorrow exam',
    priority: 'high',
    estimated_minutes: 30,
  });
  const taskA = taskARes.data!;

  const taskBRes = await createTask(userB, {
    title: 'Complete Java Lab 4',
    description: 'Implement interfaces and inheritance',
    priority: 'medium',
    estimated_minutes: 45,
  });
  const taskB = taskBRes.data!;

  // --------------------------------------------------------------------------
  console.log('Suite 1: Commitment Creation & Input Validation');
  // --------------------------------------------------------------------------
  {
    // Rejects missing user
    const noUser = await createCommitment('', {
      taskId: taskA.id,
      durationMinutes: 25,
    });
    assert(noUser.error !== null, 'Rejects unauthenticated commitment creation');

    // Rejects missing taskId
    const noTask = await createCommitment(userA, {
      taskId: '',
      durationMinutes: 25,
    });
    assert(noTask.error !== null, 'Rejects commitment without task ID');

    const otherUsersTask = await createCommitment(userA, {
      taskId: taskB.id,
      durationMinutes: 25,
    });
    assert(otherUsersTask.error !== null, 'Rejects a task owned by another user');

    // Rejects invalid duration <= 0
    const zeroDuration = await createCommitment(userA, {
      taskId: taskA.id,
      durationMinutes: 0,
    });
    assert(zeroDuration.error !== null, 'Rejects commitment with duration <= 0');

    // Rejects non-existent task
    const fakeTask = await createCommitment(userA, {
      taskId: 'fake-task-id-999',
      durationMinutes: 25,
    });
    assert(fakeTask.error !== null, 'Rejects commitment with non-existent task ID');

    // Creates valid commitment
    const valid = await createCommitment(userA, {
      taskId: taskA.id,
      durationMinutes: 30,
    });
    assert(valid.error === null && valid.data !== null, 'Creates valid focus commitment');
    assert(valid.data?.status === 'active', 'Initial commitment status is "active"');
    assert(valid.data?.duration_minutes === 30, 'Commitment duration matches 30 minutes');
    assert(valid.data?.task?.title === 'Study DLD Logic Gates', 'Joined task title is preserved');
  }

  // --------------------------------------------------------------------------
  console.log('\nSuite 2: Active Commitment & Automatic Superseding');
  // --------------------------------------------------------------------------
  {
    const activeRes = await getActiveCommitment(userA);
    assert(activeRes.data !== null, 'Retrieves active commitment for user');
    assert(activeRes.data?.duration_minutes === 30, 'Active commitment is current');

    // Creating a second commitment automatically abandons the first one
    const taskA2Res = await createTask(userA, {
      title: 'DBMS Normalization Problem Set',
      priority: 'urgent',
      estimated_minutes: 20,
    });
    const taskA2 = taskA2Res.data!;

    const commit2Res = await createCommitment(userA, {
      taskId: taskA2.id,
      durationMinutes: 20,
    });
    assert(commit2Res.error === null, 'Creates replacement focus commitment');

    const newActiveRes = await getActiveCommitment(userA);
    assert(
      newActiveRes.data?.id === commit2Res.data?.id,
      'New commitment becomes the single active focus session'
    );

    const allA = await getCommitments(userA);
    const prev = allA.data.find((c) => c.task_id === taskA.id);
    assert(
      prev?.status === 'abandoned',
      'Previous uncompleted commitment was automatically abandoned'
    );
  }

  // --------------------------------------------------------------------------
  console.log('\nSuite 3: Status Transitions & Task Auto-Completion');
  // --------------------------------------------------------------------------
  {
    const active = (await getActiveCommitment(userA)).data!;

    // Reschedule
    const rescheduled = await rescheduleCommitment(active.id, 45);
    assert(rescheduled.data?.status === 'rescheduled', 'Transitions status to "rescheduled"');
    assert(rescheduled.data?.duration_minutes === 45, 'Updated duration on reschedule');

    // Start a fresh active commitment to test completion
    const fresh = (
      await createCommitment(userA, {
        taskId: taskA.id,
        durationMinutes: 25,
      })
    ).data!;

    // Verify task is currently pending
    const taskBefore = (await getTaskById(taskA.id)).data!;
    assert(taskBefore.status === 'pending', 'Task is pending before commitment completion');

    // Complete commitment with autoCompleteTask = true
    const completed = await completeCommitment(fresh.id, true);
    assert(completed.data?.status === 'completed', 'Transitions status to "completed"');
    assert(completed.data?.completed_at !== null, 'Sets completed_at timestamp on finish');

    // Verify linked task was automatically marked completed
    const taskAfter = (await getTaskById(taskA.id)).data!;
    assert(
      taskAfter.status === 'completed',
      'Linked task automatically completed upon commitment fulfillment'
    );

    // Abandon
    const abandonTarget = (
      await createCommitment(userA, {
        taskId: taskA.id,
        durationMinutes: 15,
      })
    ).data!;
    const abandoned = await abandonCommitment(abandonTarget.id);
    assert(abandoned.data?.status === 'abandoned', 'Transitions status to "abandoned"');
  }

  // --------------------------------------------------------------------------
  console.log('\nSuite 4: Focus Statistics & Metrics Calculation');
  // --------------------------------------------------------------------------
  {
    const statsA = await getCommitmentStats(userA);
    assert(statsA.totalCommitments >= 3, 'Calculates total commitments count');
    assert(statsA.completedCommitments >= 1, 'Counts completed commitments accurately');
    assert(statsA.totalFocusedMinutes >= 25, 'Aggregates total deep work focused minutes');
  }

  // --------------------------------------------------------------------------
  console.log('\nSuite 5: Multi-User Isolation & Security');
  // --------------------------------------------------------------------------
  {
    // User B creates a commitment
    const commitB = (
      await createCommitment(userB, {
        taskId: taskB.id,
        durationMinutes: 45,
      })
    ).data!;

    // User A should not see User B's commitment
    const commitmentsA = (await getCommitments(userA)).data;
    const hasBInA = commitmentsA.some((c) => c.user_id === userB || c.id === commitB.id);
    assert(!hasBInA, 'User A cannot access or view User B commitments');

    // User B should only see their own commitment
    const commitmentsB = (await getCommitments(userB)).data;
    const allBelongToB = commitmentsB.every((c) => c.user_id === userB);
    assert(allBelongToB, 'User B only sees commitments belonging to User B');

    // Deletion
    const delRes = await deleteCommitment(commitB.id);
    assert(delRes.success, 'Commitment deleted successfully');
    const remainingB = (await getCommitments(userB)).data;
    assert(
      !remainingB.some((c) => c.id === commitB.id),
      'Commitment was removed from user history'
    );
  }

  // --------------------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`V3 TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runV3Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
