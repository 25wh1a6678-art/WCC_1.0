import type { Commitment } from '../src/types/commitment';
import {
  getRewardOverview,
  grantLocalCommitmentReward,
  purchaseReward,
  calculateStreakProgress,
} from '../src/lib/rewards';

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

function makeCommitment(
  userId: string,
  id: string,
  duration: number,
  taskId = `task-${id}`
): Commitment {
  const now = new Date().toISOString();
  return {
    id,
    user_id: userId,
    task_id: taskId,
    duration_minutes: duration,
    status: 'completed',
    started_at: now,
    completed_at: now,
    created_at: now,
    updated_at: now,
  };
}

async function runV5Tests() {
  console.log('====================================================');
  console.log('FOCUS CONTRACT V5: REWARDS TEST SUITE');
  console.log('====================================================\n');

  const mainUser = 'test-user-v5-main';
  const otherUser = 'test-user-v5-other';

  await grantLocalCommitmentReward(mainUser, makeCommitment(mainUser, 'contract-1', 30));
  let rewards = await getRewardOverview(mainUser);
  assert(rewards.data.balance === 60, 'Awards duration reward plus first daily bonus');
  assert(rewards.data.currentStreak === 1, 'Starts a streak after first completed contract');

  await grantLocalCommitmentReward(mainUser, makeCommitment(mainUser, 'contract-1', 30));
  rewards = await getRewardOverview(mainUser);
  assert(rewards.data.balance === 60, 'Repeated completion does not duplicate FocusCoins');

  await grantLocalCommitmentReward(mainUser, makeCommitment(mainUser, 'contract-2', 4));
  rewards = await getRewardOverview(mainUser);
  assert(rewards.data.balance === 60, 'Contracts below five minutes earn no coins');
  assert(rewards.data.currentStreak === 1, 'Same-day contract completions count as one streak day');
  await grantLocalCommitmentReward(
    mainUser,
    makeCommitment(mainUser, 'contract-3', 30, 'task-contract-2')
  );
  assert(
    (await getRewardOverview(mainUser)).data.balance === 60,
    'A task below the reward threshold cannot later be reused to farm coins'
  );

  await grantLocalCommitmentReward(otherUser, makeCommitment(otherUser, 'contract-other', 25));
  const otherRewards = await getRewardOverview(otherUser);
  assert(otherRewards.data.balance === 45, 'Awards correct 15-29 minute reward tier and daily bonus');
  assert(rewards.data.balance !== otherRewards.data.balance, 'Reward balances are isolated between users');

  for (let index = 0; index < 5; index++) {
    await grantLocalCommitmentReward(
      mainUser,
      makeCommitment(mainUser, `cap-contract-${index}`, 60)
    );
  }
  rewards = await getRewardOverview(mainUser);
  assert(rewards.data.balance === 200, 'Applies the 200 FocusCoin daily earning cap');

  const purchase = await purchaseReward(mainUser, 'break-pass');
  assert(purchase.error === null, 'Allows a purchase when the balance covers its cost');
  assert(purchase.data?.balance === 100, 'Deducts the catalog price from the balance');
  assert(
    Boolean(purchase.data?.inventory.some((item) => item.reward_key === 'break-pass')),
    'Adds purchased reward to the user inventory'
  );
  assert(
    Boolean(purchase.data?.transactions.some(
      (transaction) => transaction.transaction_type === 'reward_purchase' && transaction.amount === -100
    )),
    'Records reward spending in the transaction history'
  );

  const insufficient = await purchaseReward(otherUser, 'streak-recovery');
  assert(insufficient.error !== null, 'Rejects a purchase when the balance is insufficient');
  assert((await getRewardOverview(otherUser)).data.balance === 45, 'Rejected purchase leaves balance unchanged');

  const invalid = await purchaseReward(mainUser, 'unknown-reward');
  assert(invalid.error !== null, 'Rejects reward keys outside the catalog');

  const preCompletedUser = 'test-user-v5-precompleted';
  await grantLocalCommitmentReward(
    preCompletedUser,
    makeCommitment(preCompletedUser, 'precompleted-contract', 45),
    false
  );
  const preCompleted = await getRewardOverview(preCompletedUser);
  assert(preCompleted.data.balance === 0, 'Does not award coins for a task completed before focus started');

  const consecutive = calculateStreakProgress(2, '2026-10-02', '2026-10-03', 1);
  assert(consecutive.currentStreak === 3, 'Increments the streak on a consecutive success day');
  const protectedGap = calculateStreakProgress(4, '2026-10-01', '2026-10-03', 1);
  assert(protectedGap.currentStreak === 5 && protectedGap.recoveryPasses === 0, 'Recovery pass bridges one missed day');
  const missedGap = calculateStreakProgress(4, '2026-10-01', '2026-10-03', 0);
  assert(missedGap.currentStreak === 1, 'Resets streak after a missed day when no recovery pass is available');
  const sameDay = calculateStreakProgress(4, '2026-10-04', '2026-10-04', 0);
  assert(sameDay.currentStreak === 4, 'Keeps the streak unchanged for multiple completions on one day');

  console.log('\n====================================================');
  console.log(`V5 TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runV5Tests().catch((error) => {
  console.error('Fatal V5 test error:', error);
  process.exit(1);
});
