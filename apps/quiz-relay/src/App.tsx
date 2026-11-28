import { useEffect, useState } from 'react';

import type {
  QuizDraft,
  TeacherQuizSummary,
} from '@carrysync/domain/quiz-relay';

import { getQuizRelay } from './services/carrysync';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import PageHeader from './components/layout/PageHeader';
import DashboardOverview from "./components/dashboard/DashboardOverview";
import QuizForm from "./components/quiz-builder/QuizForm";
import type { BuilderQuestion } from "./components/quiz-builder/QuestionCard";
import PayloadImport from "./components/transfer/PayloadImport";

type QuestionDraft = BuilderQuestion;

type Page = 'dashboard' | 'create' ;

type QuizRelayService = Awaited<
  ReturnType<typeof getQuizRelay>
>['service'];

type QuizQrBatches = Awaited<
  ReturnType<QuizRelayService['prepareQuizExport']>
>;

const createQuestion = (): QuestionDraft => ({
  prompt: '',
  options: ['', ''],
  correctOptionIndex: 0,
});

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState<Page>('dashboard');

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    createQuestion(),
  ]);

  const [quizzes, setQuizzes] = useState<TeacherQuizSummary[]>([]);
  const [status, setStatus] = useState('Welcome to QuizRelay.');
  
  const [busy, setBusy] = useState(false);
  
type QrModalState = {
  title: string;
  batches: QuizQrBatches;
  loading: boolean;
  error: string | null;
};

const [qrModal, setQrModal] = useState<QrModalState | null>(null);


  // Load quizzes from the QuizRelay service.
  useEffect(() => {
    let active = true;

    async function loadQuizzes() {
      try {
const { service } = await getQuizRelay();
const result = await service.listQuizzes();
        if (active) {
          setQuizzes(result);
        }
      } catch {
        if (active) {
          setStatus('Unable to load quizzes right now.');
        }
      }
    }

    void loadQuizzes();

    return () => {
      active = false;
    };
  }, []);


  // Publish quiz using the actual QuizRelay service.
  async function publishQuiz() {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setStatus('Please enter a quiz title.');
      return;
    }

    const draft: QuizDraft = {
      title: cleanTitle,
      questions: questions.map((question) => ({
        prompt: question.prompt.trim(),
        options: question.options.map((option) => option.trim()),
        correctOptionIndex: question.correctOptionIndex,
      })),
    };

    setBusy(true);

    try {
const { service } = await getQuizRelay();

const published = await service.publishQuiz(draft);

const updatedQuizzes = await service.listQuizzes();

  setQuizzes(updatedQuizzes);

      setStatus(
        `Quiz published successfully! ${published.bytes} bytes ready for QR export.`,
      );

      setTitle('');
      setQuestions([createQuestion()]);
      setActivePage('dashboard');
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Unable to publish quiz.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleShowQr(quizId: string, title: string) {
  setQrModal({
    title,
    batches: [],
    loading: true,
    error: null,
  });

  try {
    const { service } = await getQuizRelay();
    const batches = await service.prepareQuizExport(quizId);

    setQrModal({
      title,
      batches,
      loading: false,
      error: null,
    });
  } catch (error) {
    setQrModal({
      title,
      batches: [],
      loading: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to generate quiz QR code.",
    });
  }
}


  function navigateTo(page: Page) {
    setActivePage(page);
    setSidebarOpen(false);
  }

  return (
<div className="app-shell min-h-screen bg-[var(--background)] text-[var(--text)]">
        {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={navigateTo}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main application */}
      <div className="min-h-screen lg:pl-64">
        {/* Topbar */}
        <Topbar
          title={
            activePage === 'dashboard'
              ? 'Dashboard'
              : 'Quiz builder'
          }
          onMenuClick={() => setSidebarOpen(true)}
          onCreateQuiz={() => navigateTo('create')}
        />

        <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
          <div className="page-content">

{activePage === "dashboard" ? (
  <>
    <DashboardOverview
      quizzes={quizzes}
      onCreateQuiz={() => navigateTo("create")}
      onShowQr={handleShowQr}
    />

<PayloadImport
  onImported={() => {
    void (async () => {
      const { service } = await getQuizRelay();
      const updatedQuizzes = await service.listQuizzes();
      setQuizzes(updatedQuizzes);
    })();
  }}
/>
  </>
) : (
  <div className="mx-auto w-full max-w-5xl space-y-6">
    <PageHeader
      title="Create a new quiz"
      description="Add your questions, set the correct answers, and publish your quiz when it is ready."
    />

    <QuizForm
      title={title}
      questions={questions}
      onTitleChange={setTitle}
      onQuestionsChange={setQuestions}
      onSubmit={publishQuiz}
      busy={busy}
      status={status}
    />
  </div>
)}


          </div>
        </main>
      </div>
      {/* Quiz QR Code Modal */}
{qrModal && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="qr-modal-title"
            className="text-xl font-bold text-[var(--text)]"
          >
            Share quiz
          </h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            {qrModal.title}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setQrModal(null)}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--hover)]"
        >
          Close
        </button>
      </div>

      {qrModal.loading ? (
        <div className="flex flex-col items-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--primary)]" />
          <p className="mt-4 text-sm text-[var(--muted)]">
            Generating quiz QR code...
          </p>
        </div>
      ) : qrModal.error ? (
        <div className="mt-6 rounded-xl bg-red-100 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          {qrModal.error}
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <p className="text-center text-sm text-[var(--muted)]">
            Students can scan these QR codes to import the quiz.
          </p>
{qrModal.batches.map(
  (batch: QuizQrBatches[number], index: number) => (
    <div
      key={index}
      className="flex flex-col items-center rounded-xl border border-[var(--border)] bg-white p-5"
    >
      <img
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(batch.svg)}`}
        alt="CarrySync transfer QR"
        className="h-56 w-56 max-w-full object-contain"
      />

      <p className="mt-3 text-xs font-semibold text-gray-600">
        QR Code {index + 1} of {qrModal.batches.length}
      </p>
    </div>
  ),
)}
        </div>
      )}
    </div>
  </div>
)}
    </div>
  );
}
