const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    if (!line || line.trim().startsWith("#")) return;
    const idx = line.indexOf("=");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  });
}

function seedId(label) {
  const hash = crypto.createHash("md5").update(label).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

loadEnv(path.resolve(__dirname, "..", ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.SUPABASE_USER_ID;

if (!supabaseUrl || !serviceKey || !userId) {
  console.error("Missing env vars. Ensure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_USER_ID are set in .env.local.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const northStarId = seedId("north-star:yana");
const objectives = [
  {
    id: seedId("objective:ship-yana"),
    tier: "Quarter",
    title: "Ship YANA v2.0 with full command center",
    progress: 72,
    status: "on-track",
    keyResults: [
      { title: "Complete dashboard UI redesign", progress: 90, status: "on-track" },
      { title: "Implement real-time sync engine", progress: 60, status: "at-risk" },
      { title: "Deploy to production cluster", progress: 40, status: "on-track" },
    ],
  },
  {
    id: seedId("objective:enterprise-pilots"),
    tier: "Quarter",
    title: "Close 3 enterprise pilot contracts",
    progress: 33,
    status: "at-risk",
    keyResults: [
      { title: "Identify 10 potential enterprise leads", progress: 70, status: "on-track" },
      { title: "Complete enterprise feature set", progress: 20, status: "behind" },
    ],
  },
  {
    id: seedId("objective:auth-migration"),
    tier: "Month",
    title: "Complete auth microservice migration",
    progress: 85,
    status: "on-track",
    keyResults: [],
  },
  {
    id: seedId("objective:waitlist"),
    tier: "Month",
    title: "Launch landing page + waitlist funnel",
    progress: 55,
    status: "on-track",
    keyResults: [],
  },
  {
    id: seedId("objective:blog"),
    tier: "Year",
    title: "Establish technical blog with 50 articles",
    progress: 18,
    status: "at-risk",
    keyResults: [],
  },
];

const milestones = [
  { id: seedId("milestone:mvp-freeze"), title: "MVP Feature Freeze", date: "2026-10-15", done: true },
  { id: seedId("milestone:beta-launch"), title: "Beta Launch", date: "2026-10-22", done: false },
  { id: seedId("milestone:pilot-start"), title: "Enterprise Pilot Start", date: "2026-11-01", done: false },
  { id: seedId("milestone:public-launch"), title: "Public Launch", date: "2026-11-15", done: false },
];

const northStarKeyResults = [
  { id: seedId("kr:platform-stability"), title: "Raise platform stability to 99.9%", progress: 72, status: "on-track" },
  { id: seedId("kr:enterprise-pipeline"), title: "Build enterprise pipeline to $500k ARR", progress: 28, status: "at-risk" },
  { id: seedId("kr:community-growth"), title: "Grow community to 10k operators", progress: 18, status: "behind" },
];

const objectiveKeyResults = objectives.flatMap((objective) =>
  objective.keyResults.map((kr, index) => ({
    id: seedId(`objkr:${objective.id}:${index}`),
    objective_id: objective.id,
    title: kr.title,
    progress: kr.progress,
    status: kr.status,
  }))
);

const tacticalMatrix = [
  { id: seedId("matrix:q1:auth"), quadrant: "q1", title: "Fix production auth bug", done: false },
  { id: seedId("matrix:q1:contract"), quadrant: "q1", title: "Finalize enterprise contract", done: true },
  { id: seedId("matrix:q2:roadmap"), quadrant: "q2", title: "Design roadmap Q1", done: false },
  { id: seedId("matrix:q2:reading"), quadrant: "q2", title: "Read system design book", done: false },
  { id: seedId("matrix:q3:emails"), quadrant: "q3", title: "Reply to vendor emails", done: false },
  { id: seedId("matrix:q4:scroll"), quadrant: "q4", title: "Scroll X/Twitter", done: false },
];

const tacticalCommands = [
  { id: seedId("command:standup"), title: "Daily standup", done: true, time_estimate: 15 },
  { id: seedId("command:review-pr"), title: "Review PR #412", done: false, time_estimate: 30 },
  { id: seedId("command:okr"), title: "Draft Q4 OKRs", done: false, time_estimate: 60 },
  { id: seedId("command:inbox"), title: "Clear inbox", done: false, time_estimate: 20 },
];

const tacticalBlocks = [
  { id: seedId("block:0-9"), day_offset: 0, start_hr: 9, end_hr: 10.5, title: "Deep Work: Sync Engine", type: "deep-work" },
  { id: seedId("block:0-11"), day_offset: 0, start_hr: 11, end_hr: 11.5, title: "Team Standup", type: "meeting" },
  { id: seedId("block:0-12"), day_offset: 0, start_hr: 12, end_hr: 13, title: "Lunch / Walk", type: "break" },
  { id: seedId("block:0-13"), day_offset: 0, start_hr: 13.5, end_hr: 15.5, title: "Deep Work: V2 UI", type: "deep-work" },
  { id: seedId("block:0-16"), day_offset: 0, start_hr: 16, end_hr: 17, title: "Admin & Emails", type: "admin" },
  { id: seedId("block:1-demo"), day_offset: 1, start_hr: 10, end_hr: 11.5, title: "Client Demo", type: "meeting" },
  { id: seedId("block:1-infra"), day_offset: 1, start_hr: 13, end_hr: 17, title: "Deep Work: Infrastructure", type: "deep-work" },
  { id: seedId("block:2-plan"), day_offset: 2, start_hr: 9, end_hr: 12, title: "Weekly Planning", type: "admin" },
];

const tacticalInbox = [
  { id: seedId("inbox:vendor"), title: "Follow up with vendor on contract" },
  { id: seedId("inbox:market"), title: "Capture new market research notes" },
];

const financialAccounts = [
  { id: seedId("account:chase"), name: "Chase Operating", type: "liquid", balance: 14500, currency: "USD", health: 85, icon_type: "bank" },
  { id: seedId("account:cbe"), name: "CBE Reserve", type: "liquid", balance: 850000, currency: "ETB", health: 92, icon_type: "bank" },
  { id: seedId("account:telebirr"), name: "Telebirr Cash", type: "liquid", balance: 45000, currency: "ETB", health: 40, icon_type: "mobile" },
  { id: seedId("account:vanguard"), name: "Vanguard ETF", type: "investment", balance: 32000, currency: "USD", health: 70, icon_type: "stock" },
  { id: seedId("account:cold"), name: "Cold Storage", type: "investment", balance: 18500, currency: "USD", health: 99, icon_type: "crypto" },
];

const financialFlows = [
  { id: seedId("flow:retainers"), name: "Client Retainers", type: "income", amount: 6500, frequency: "monthly", category: "B2B", active: true },
  { id: seedId("flow:royalties"), name: "SaaS Royalties", type: "income", amount: 1200, frequency: "monthly", category: "Passive", active: true },
  { id: seedId("flow:servers"), name: "Server Infrastructure", type: "expense", amount: 450, frequency: "monthly", category: "DevOps", active: true },
  { id: seedId("flow:office"), name: "Office Leasing", type: "expense", amount: 1200, frequency: "monthly", category: "Ops", active: true },
  { id: seedId("flow:legal"), name: "Legal Retainer", type: "expense", amount: 800, frequency: "monthly", category: "Compliance", active: false },
];

const financialBuckets = [
  { id: seedId("bucket:emergency"), name: "Emergency Fund", target: 500000, current: 400000, priority: "high" },
  { id: seedId("bucket:tax"), name: "Q3 Tax Liability", target: 120000, current: 85000, priority: "high" },
  { id: seedId("bucket:equipment"), name: "New Equipment", target: 200000, current: 45000, priority: "medium" },
];

const biometricProtocols = [
  { id: seedId("bio:protocol:squat"), name: "Barbell Back Squat", weight: 140, sets: 4, reps: 8, completed: true },
  { id: seedId("bio:protocol:rdl"), name: "Romanian Deadlift", weight: 120, sets: 3, reps: 10, completed: false },
  { id: seedId("bio:protocol:pullups"), name: "Weighted Pull-ups", weight: 20, sets: 4, reps: 8, completed: true },
  { id: seedId("bio:protocol:press"), name: "Overhead Press", weight: 60, sets: 3, reps: 10, completed: false },
];

const biometricIntakes = [
  { id: seedId("bio:intake:postworkout"), name: "Post-Workout Mix", calories: 450, protein: 50 },
  { id: seedId("bio:intake:steak"), name: "Steak & Rice", calories: 850, protein: 65 },
  { id: seedId("bio:intake:yogurt"), name: "Greek Yogurt Bowl", calories: 250, protein: 25 },
];

const nutritionCal = biometricIntakes.reduce((sum, item) => sum + item.calories, 0);

const tasks = [
  { title: "Design system audit & tokens", status: "done" },
  { title: "Implement auth microservice", status: "in_progress" },
  { title: "Real-time sync engine", status: "in_progress" },
  { title: "API documentation v2", status: "todo" },
  { title: "Payment gateway integration", status: "todo" },
  { title: "Product listing page redesign", status: "in_progress" },
  { title: "Cart persistence layer", status: "todo" },
  { title: "User role management", status: "in_progress" },
  { title: "Analytics dashboard", status: "todo" },
  { title: "Onboarding flow wireframes", status: "todo" },
  { title: "Push notification service", status: "todo" },
  { title: "Offline data sync", status: "todo" },
];

async function upsert(table, rows) {
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows);
  if (error) throw error;
}

async function run() {
  await upsert("north_stars", [
    {
      id: northStarId,
      user_id: userId,
      mission_statement: "Build YANA into an autonomous operating system.",
      is_active: true,
    },
  ]);

  await upsert(
    "key_results",
    northStarKeyResults.map((kr) => ({
      id: kr.id,
      user_id: userId,
      north_star_id: northStarId,
      title: kr.title,
      progress: kr.progress,
      status: kr.status,
    }))
  );

  await upsert(
    "objectives",
    objectives.map((obj) => ({
      id: obj.id,
      user_id: userId,
      north_star_id: northStarId,
      tier: obj.tier,
      title: obj.title,
      progress: obj.progress,
      status: obj.status,
    }))
  );

  await upsert(
    "objective_key_results",
    objectiveKeyResults.map((kr) => ({
      id: kr.id,
      user_id: userId,
      objective_id: kr.objective_id,
      title: kr.title,
      progress: kr.progress,
      status: kr.status,
    }))
  );

  await upsert(
    "north_star_milestones",
    milestones.map((ms) => ({
      id: ms.id,
      user_id: userId,
      title: ms.title,
      due_date: ms.date,
      is_done: ms.done,
    }))
  );

  await upsert(
    "tasks",
    tasks.map((task, index) => ({
      id: seedId(`task:${index}:${task.title}`),
      user_id: userId,
      objective_id: objectives[0].id,
      title: task.title,
      status: task.status,
      actual_min: 0,
    }))
  );

  await upsert(
    "tactical_matrix_items",
    tacticalMatrix.map((item, index) => ({
      id: item.id,
      user_id: userId,
      quadrant: item.quadrant,
      title: item.title,
      done: item.done,
      sort_order: index,
    }))
  );

  await upsert(
    "tactical_commands",
    tacticalCommands.map((item, index) => ({
      id: item.id,
      user_id: userId,
      title: item.title,
      done: item.done,
      time_estimate: item.time_estimate,
      objective_id: objectives[0].id,
      sort_order: index,
    }))
  );

  await upsert(
    "tactical_blocks",
    tacticalBlocks.map((item, index) => ({
      id: item.id,
      user_id: userId,
      day_offset: item.day_offset,
      start_hr: item.start_hr,
      end_hr: item.end_hr,
      title: item.title,
      type: item.type,
      sort_order: index,
    }))
  );

  await upsert(
    "tactical_inbox_items",
    tacticalInbox.map((item, index) => ({
      id: item.id,
      user_id: userId,
      title: item.title,
      done: false,
      sort_order: index,
    }))
  );

  await upsert(
    "financial_accounts",
    financialAccounts.map((item, index) => ({
      id: item.id,
      user_id: userId,
      name: item.name,
      type: item.type,
      balance: item.balance,
      currency: item.currency,
      health: item.health,
      icon_type: item.icon_type,
      sort_order: index,
    }))
  );

  await upsert(
    "financial_flows",
    financialFlows.map((item, index) => ({
      id: item.id,
      user_id: userId,
      name: item.name,
      type: item.type,
      amount: item.amount,
      frequency: item.frequency,
      category: item.category,
      active: item.active,
      sort_order: index,
    }))
  );

  await upsert(
    "financial_buckets",
    financialBuckets.map((item, index) => ({
      id: item.id,
      user_id: userId,
      name: item.name,
      target: item.target,
      current: item.current,
      priority: item.priority,
      sort_order: index,
    }))
  );

  await upsert(
    "biometric_protocols",
    biometricProtocols.map((item, index) => ({
      id: item.id,
      user_id: userId,
      name: item.name,
      weight: item.weight,
      reps: item.reps,
      sets: item.sets,
      completed: item.completed,
      sort_order: index,
    }))
  );

  await upsert(
    "biometric_intakes",
    biometricIntakes.map((item, index) => ({
      id: item.id,
      user_id: userId,
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      sort_order: index,
    }))
  );

  await upsert("biometrics", [
    {
      id: seedId("biometrics:today"),
      user_id: userId,
      date: new Date().toISOString().slice(0, 10),
      hydration_l: 2.2,
      nutrition_cal: nutritionCal,
    },
  ]);

  console.log("✅ Seed complete");
}

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
