export type TimerMode = "stopwatch" | "countdown";
export type FinancialAccountType = "liquid" | "investment";
export type FinancialPriority = "high" | "medium" | "low";
export type TacticalQuadrant = "q1" | "q2" | "q3" | "q4";
export type TacticalBlockType = "deep-work" | "meeting" | "admin" | "break";
export type FocusTargetKind = "general" | "objective" | "kr" | "custom";

export interface UserRow {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface NorthStarRow {
  id: string;
  user_id: string;
  mission_statement: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KeyResultRow {
  id: string;
  user_id: string;
  north_star_id: string;
  title: string;
  progress: number;
  status: "on-track" | "at-risk" | "behind";
  color: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ObjectiveRow {
  id: string;
  user_id: string;
  north_star_id: string;
  key_result_id: string | null;
  tier: "Decade" | "Year" | "Quarter" | "Month";
  title: string;
  progress: number;
  status: "on-track" | "at-risk" | "behind";
  color: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ObjectiveKeyResultRow {
  id: string;
  user_id: string;
  objective_id: string;
  title: string;
  progress: number;
  status: "on-track" | "at-risk" | "behind";
  color: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskRow {
  id: string;
  user_id: string;
  objective_id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done" | "cancelled";
  actual_min: number;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalTaskRow {
  id: string;
  user_id: string;
  objective_id: string | null;
  project_id: string | null;
  title: string;
  description: string | null;
  status: "backlog" | "todo" | "in-progress" | "review" | "done";
  priority: "critical" | "high" | "medium" | "low";
  assignee: string | null;
  due_date: string | null;
  tags: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TimeBlockRow {
  id: string;
  user_id: string;
  objective_id: string;
  task_id: string | null;
  title: string;
  start_time: string;
  end_time: string;
  is_deep_work: boolean;
  created_at: string;
  updated_at: string;
}

export interface NorthStarMilestoneRow {
  id: string;
  user_id: string;
  title: string;
  due_date: string | null;
  is_done: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FocusTimerSessionRow {
  id: string;
  user_id: string;
  target_kind: FocusTargetKind;
  target_id: string | null;
  target_label: string;
  mode: TimerMode;
  planned_seconds: number | null;
  seconds: number;
  completed: boolean;
  started_at: string;
  ended_at: string;
  created_at: string;
}

export interface FinancialAccountRow {
  id: string;
  user_id: string;
  name: string;
  type: FinancialAccountType;
  balance: number;
  currency: string;
  health: number;
  icon_type: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FinancialFlowRow {
  id: string;
  user_id: string;
  name: string;
  type: "income" | "expense";
  amount: number;
  frequency: string;
  category: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FinancialBucketRow {
  id: string;
  user_id: string;
  name: string;
  target: number;
  current: number;
  priority: FinancialPriority;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BiometricProtocolRow {
  id: string;
  user_id: string;
  name: string;
  weight: number;
  reps: number;
  sets: number;
  completed: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BiometricIntakeRow {
  id: string;
  user_id: string;
  name: string;
  calories: number;
  protein: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BiometricRow {
  id: string;
  user_id: string;
  date: string;
  sleep_score: number | null;
  hydration_l: number | null;
  nutrition_cal: number | null;
  created_at: string;
  updated_at: string;
}

export interface TacticalMatrixItemRow {
  id: string;
  user_id: string;
  quadrant: TacticalQuadrant;
  title: string;
  done: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TacticalCommandRow {
  id: string;
  user_id: string;
  title: string;
  done: boolean;
  time_estimate: number | null;
  objective_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TacticalBlockRow {
  id: string;
  user_id: string;
  day_offset: number;
  start_hr: number;
  end_hr: number;
  title: string;
  type: TacticalBlockType;
  task_id: string | null;
  objective_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TacticalInboxItemRow {
  id: string;
  user_id: string;
  title: string;
  done: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TelemetryRow {
  user_id: string;
  vm_score: number;
  execution_rate: number;
  focus_quality: number;
  system_health: number;
  stress_coeff: number;
  alignment_score: number;
  last_calculated: string;
}
