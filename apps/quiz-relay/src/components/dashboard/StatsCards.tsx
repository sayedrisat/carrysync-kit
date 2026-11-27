
import {
  BookOpen,
  CheckCircle2,
  Users,
} from "lucide-react";
import type { TeacherQuizSummary } from "@carrysync/domain/quiz-relay";

interface StatsCardsProps {
  quizzes: TeacherQuizSummary[];
}

export default function StatsCards({ quizzes }: StatsCardsProps) {
  const totalQuizzes = quizzes.length;

  const readyQuizzes = quizzes.filter(
    (quiz) => quiz.status === "ready"
  ).length;

  const totalParticipants = quizzes.reduce(
    (total, quiz) => total + quiz.participantCount,
    0
  );

  const stats = [
    {
      label: "Total quizzes",
      value: totalQuizzes,
      description: "Quizzes available on this device",
      icon: BookOpen,
    },
    {
      label: "Ready quizzes",
      value: readyQuizzes,
      description: "Quizzes ready to use",
      icon: CheckCircle2,
    },
    {
      label: "Participants",
      value: totalParticipants,
      description: "Participants across your quizzes",
      icon: Users,
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map((stat, index) => {
        const Icon = stat.icon;

        return (
          <article
            key={stat.label}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--muted)]">
                  {stat.label}
                </p>

                <h3
  data-testid={
    stat.label === "Total quizzes" ? "quiz-count" : undefined
  }
  className="mt-3 text-3xl font-extrabold tracking-tight text-[var(--text)]"
>
  {stat.value}
</h3>
              </div>

              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  index === 1
                    ? "bg-[var(--soft-surface)] text-[var(--accent)]"
                    : "bg-[var(--hover)] text-[var(--primary)]"
                }`}
              >
                <Icon size={21} strokeWidth={1.8} />
              </div>
            </div>

            <p className="mt-4 text-xs text-[var(--muted)]">
              {stat.description}
            </p>
          </article>
        );
      })}
    </section>
  );
}
