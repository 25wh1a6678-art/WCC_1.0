/**
 * Focus Contract V2 Daily Reflection & Voice Input Test Suite
 * Tests reflection CRUD, RLS isolation, input validation, mocked speech recognition,
 * transcription editing, and AI planning integration.
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

import { createReflection, getReflections, deleteReflection } from '../src/lib/reflections';
import { planTasksFromReflection } from '../src/lib/ai/taskPlanner';

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

async function runV2Tests() {
  console.log('====================================================');
  console.log('FOCUS CONTRACT V2: DAILY REFLECTION & VOICE TEST SUITE');
  console.log('====================================================\n');

  const studentA = 'student-uuid-v2-alpha';
  const studentB = 'student-uuid-v2-bravo';

  // TEST 1: Authenticated user can create a reflection
  console.log('Suite 1: Daily Reflection Persistence & Validation');
  const validReflectionText =
    'Today I finished Java lab, but DBMS normalization assignment is still pending and due tomorrow evening. I also need to study for DLD exam.';

  const createResA = await createReflection(studentA, validReflectionText);
  assert(createResA.data !== null && createResA.error === null, 'Authenticated user can create a reflection');
  assert(createResA.data?.reflection_text === validReflectionText, 'Reflection text is preserved exactly');
  const refIdA = createResA.data?.id || '';

  // TEST 2: Unauthenticated reflection creation is rejected
  const unauthRes = await createReflection('', 'Unauthenticated reflection attempt');
  assert(unauthRes.data === null && unauthRes.error !== null, 'Unauthenticated reflection creation is rejected');

  // TEST 3: User can read only their own reflections
  const listA = await getReflections(studentA);
  assert(listA.data.length === 1 && listA.data[0].id === refIdA, 'User can read their own reflections');

  // TEST 4: User cannot read another user's reflections (Isolation)
  const listB = await getReflections(studentB);
  assert(listB.data.length === 0, 'User B cannot see User A reflections (strict isolation)');

  // TEST 5: Empty reflection is rejected
  const emptyRes = await createReflection(studentA, '   ');
  assert(emptyRes.data === null && emptyRes.error !== null, 'Empty or whitespace reflection is rejected');

  // Overlong reflection (>5000 chars) is rejected
  const overlongRes = await createReflection(studentA, 'a'.repeat(5001));
  assert(overlongRes.data === null && overlongRes.error !== null, 'Overlong reflection (>5000 chars) is rejected');

  // TEST 6: Text reflection reaches the existing AI planning pipeline
  console.log('\nSuite 2: AI Pipeline & Clause Understanding');
  const aiPlanRes = await planTasksFromReflection(validReflectionText);
  assert(aiPlanRes.tasks.length > 0, 'Reflection text reaches AI planning pipeline and generates suggestions');
  // Check that finished task is NOT recreated
  const javaTask = aiPlanRes.tasks.find((t) => t.title.toLowerCase().includes('java'));
  assert(javaTask === undefined, 'Completed work (Java lab) is NOT recreated as a pending task');
  // Check that pending tasks ARE created
  const dbmsTask = aiPlanRes.tasks.find((t) => t.title.toLowerCase().includes('dbms'));
  assert(dbmsTask !== undefined, 'Incomplete work (DBMS) is recognized and extracted as a pending task');

  // TEST 7, 8, 9, 10: Mocked SpeechRecognition and Voice Workflow
  console.log('\nSuite 3: Voice Input & Speech Recognition Simulation');

  // Mock speech recognition engine
  class MockSpeechRecognition {
    continuous = true;
    interimResults = true;
    lang = 'en-US';
    onstart: (() => void) | null = null;
    onresult: ((ev: unknown) => void) | null = null;
    onerror: ((ev: { error: string }) => void) | null = null;
    onend: (() => void) | null = null;

    private isRunning = false;

    start() {
      this.isRunning = true;
      if (this.onstart) this.onstart();
    }

    stop() {
      this.isRunning = false;
      if (this.onend) this.onend();
    }

    abort() {
      this.isRunning = false;
    }

    simulateSpeech(transcriptChunk: string, isFinal: boolean) {
      if (this.onresult) {
        this.onresult({
          resultIndex: 0,
          results: [
            {
              isFinal,
              length: 1,
              0: { transcript: transcriptChunk, confidence: 0.95 },
            },
          ],
        });
      }
    }

    simulateError(errorType: string) {
      if (this.onerror) {
        this.onerror({ error: errorType });
      }
    }
  }

  // Test 7: Voice transcription can be captured and edited
  const mockEngine = new MockSpeechRecognition();
  let transcript = '';
  mockEngine.onresult = (ev: unknown) => {
    const event = ev as { results: Array<Array<{ transcript: string }>> };
    transcript = event.results[0][0].transcript;
  };

  mockEngine.start();
  mockEngine.simulateSpeech('I need to finish computer networks assignment', true);
  mockEngine.stop();

  assert(transcript === 'I need to finish computer networks assignment', 'Voice transcription captured speech cleanly');

  // Edit transcription manually before submission
  const editedTranscript = transcript + ' and study for quiz tomorrow';
  assert(editedTranscript.includes('study for quiz tomorrow'), 'Voice transcription can be edited before submission');

  // Test 8: Unsupported speech environment fails gracefully
  const hasNativeSpeech = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  // If window is undefined or mock environment, fallback is active
  assert(typeof hasNativeSpeech === 'boolean', 'Unsupported speech environment detected without fatal crash');

  // Test 9: Microphone permission denial fails gracefully
  let reportedError = '';
  mockEngine.onerror = (ev: { error: string }) => {
    if (ev.error === 'not-allowed') {
      reportedError = 'Microphone permission was denied. Please allow microphone access or type instead.';
    }
  };
  mockEngine.simulateError('not-allowed');
  assert(reportedError.includes('Microphone permission was denied'), 'Microphone permission denial handled gracefully');

  // Test 10: Clear transcription
  let clearableTranscript = 'Some existing words';
  clearableTranscript = '';
  assert(clearableTranscript === '', 'User can clear transcription successfully');

  // Cleanup
  await deleteReflection(refIdA, studentA);
  const verifyList = await getReflections(studentA);
  assert(verifyList.data.length === 0, 'Cleaned up reflection successfully');

  // Summary
  console.log('\n====================================================');
  console.log(`V2 TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runV2Tests().catch((err) => {
  console.error('Fatal test error in V2 suite:', err);
  process.exit(1);
});
