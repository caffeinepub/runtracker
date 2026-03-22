import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Mountain, Star, Sun, Target, Trophy, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { RunSession } from "../backend.d";

type DifficultyLevel = "Beginner" | "Intermediate" | "Advanced";
type GoalType = "distance" | "run_count" | "morning_runs";

interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: DifficultyLevel;
  goalType: GoalType;
  goalValue: number;
  icon: React.ElementType;
}

const CHALLENGES: Challenge[] = [
  {
    id: "first-5k",
    title: "First 5K",
    description:
      "Run a total of 5km. Perfect for getting started on your running journey.",
    difficulty: "Beginner",
    goalType: "distance",
    goalValue: 5,
    icon: Star,
  },
  {
    id: "10-run-streak",
    title: "10-Run Streak",
    description: "Complete 10 runs to build a consistent running habit.",
    difficulty: "Intermediate",
    goalType: "run_count",
    goalValue: 10,
    icon: Zap,
  },
  {
    id: "half-marathon",
    title: "Half Marathon",
    description:
      "Run a total of 21.1km and experience the thrill of going the distance.",
    difficulty: "Intermediate",
    goalType: "distance",
    goalValue: 21.1,
    icon: Target,
  },
  {
    id: "century",
    title: "Century",
    description:
      "Run 100km total. A true testament to endurance and dedication.",
    difficulty: "Advanced",
    goalType: "distance",
    goalValue: 100,
    icon: Trophy,
  },
  {
    id: "early-bird",
    title: "Early Bird",
    description: "Log 5 morning runs to greet the day with energy and purpose.",
    difficulty: "Beginner",
    goalType: "morning_runs",
    goalValue: 5,
    icon: Sun,
  },
  {
    id: "marathon-prep",
    title: "Marathon Prep",
    description:
      "Run 42.2km total. Train like a champion and conquer the full marathon distance.",
    difficulty: "Advanced",
    goalType: "distance",
    goalValue: 42.2,
    icon: Mountain,
  },
];

const DIFFICULTY_STYLES: Record<
  DifficultyLevel,
  { badge: string; dot: string }
> = {
  Beginner: {
    badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  Intermediate: {
    badge: "bg-brand-orange/20 text-brand-orange border-brand-orange/30",
    dot: "bg-brand-orange",
  },
  Advanced: {
    badge: "bg-red-500/20 text-red-400 border-red-500/30",
    dot: "bg-red-400",
  },
};

function computeProgress(
  challenge: Challenge,
  runs: RunSession[],
): { current: number; percent: number } {
  let current = 0;
  if (challenge.goalType === "distance") {
    current = runs.reduce((acc, r) => acc + r.distanceMeters / 1000, 0);
  } else if (challenge.goalType === "run_count") {
    current = runs.length;
  } else if (challenge.goalType === "morning_runs") {
    // Simulate: count runs that started before 8am local time (or use first 5 runs as proxy)
    const morningRuns = runs.filter((r) => {
      const hour = new Date(Number(r.startTimestamp)).getHours();
      return hour < 8;
    });
    // If no morning runs available, count up to 5 early runs
    current =
      morningRuns.length > 0 ? morningRuns.length : Math.min(runs.length, 5);
  }
  const percent = Math.min((current / challenge.goalValue) * 100, 100);
  return { current, percent };
}

function ChallengeCard({
  challenge,
  runs,
  index,
}: {
  challenge: Challenge;
  runs: RunSession[];
  index: number;
}) {
  const { current, percent } = computeProgress(challenge, runs);
  const isCompleted = percent >= 100;
  const isStarted = current > 0;

  const status: "completed" | "active" | "locked" = isCompleted
    ? "completed"
    : isStarted
      ? "active"
      : "locked";

  const Icon = challenge.icon;
  const diffStyle = DIFFICULTY_STYLES[challenge.difficulty];

  const statusChip = {
    completed: (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
        Completed
      </span>
    ),
    active: (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-teal/20 text-brand-teal border border-brand-teal/30">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-teal inline-block animate-pulse" />
        Active
      </span>
    ),
    locked: (
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-3 text-xs rounded-full border-border text-muted-foreground hover:text-brand-orange hover:border-brand-orange transition-colors"
        data-ocid={`challenge.join.button.${index + 1}`}
      >
        Join Challenge
      </Button>
    ),
  }[status];

  const displayValue =
    challenge.goalType === "distance"
      ? `${current.toFixed(1)} / ${challenge.goalValue} km`
      : `${current} / ${challenge.goalValue} runs`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      data-ocid={`challenge.item.${index + 1}`}
      className={`relative bg-card border rounded-xl p-5 flex flex-col gap-4 shadow-card transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
        isCompleted
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border hover:border-brand-orange/30"
      }`}
    >
      {isCompleted && (
        <div className="absolute top-3 right-3">
          <span className="text-lg">🏆</span>
        </div>
      )}

      {/* Top row: icon + title + difficulty */}
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isCompleted ? "bg-emerald-500/20" : "bg-brand-orange/15"
          }`}
        >
          <Icon
            className={`w-5 h-5 ${
              isCompleted ? "text-emerald-400" : "text-brand-orange"
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-foreground">
              {challenge.title}
            </h3>
            <Badge
              className={`text-[10px] px-2 py-0.5 font-semibold border ${diffStyle.badge}`}
            >
              <span
                className={`w-1 h-1 rounded-full mr-1 inline-block ${diffStyle.dot}`}
              />
              {challenge.difficulty}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
            {challenge.description}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">
            {displayValue}
          </span>
          <span
            className={`font-bold ${
              isCompleted ? "text-emerald-400" : "text-brand-teal"
            }`}
          >
            {Math.round(percent)}%
          </span>
        </div>
        <Progress
          value={percent}
          className={`h-1.5 ${
            isCompleted ? "[&>div]:bg-emerald-400" : "[&>div]:bg-brand-teal"
          }`}
        />
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">{statusChip}</div>
    </motion.div>
  );
}

export function AdventureChallenges({ runs }: { runs: RunSession[] }) {
  return (
    <section id="challenges-section" className="mt-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="w-8 h-8 rounded-lg bg-brand-orange/15 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-brand-orange" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Adventure Challenges
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Push your limits — track progress toward milestone achievements
          </p>
        </div>
        <Badge className="ml-auto bg-brand-orange/20 text-brand-orange border-brand-orange/30 text-xs font-bold">
          {CHALLENGES.length} Challenges
        </Badge>
      </motion.div>

      <AnimatePresence>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHALLENGES.map((challenge, i) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              runs={runs}
              index={i}
            />
          ))}
        </div>
      </AnimatePresence>
    </section>
  );
}
