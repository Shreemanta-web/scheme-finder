export const OPTIONS = {
  age: ["under_14", "14_17", "18_25", "26_40", "41_59", "60_69", "70_plus"],
  gender: ["female", "male", "other"],
  area: ["rural", "urban"],
  income: ["below_1l", "1l_2_5l", "2_5l_5l", "5l_9l", "above_9l"],
  occupation: ["student", "farmer", "business", "artisan", "worker", "salaried", "job_seeker", "homemaker", "retired", "other"],
  category: ["general", "obc", "sc", "st", "minority"],
  disability: ["yes", "no"],
  education: ["up_to_8", "class_9_10", "class_11_12", "college", "not_studying"],
  land: ["owner", "tenant", "no_land"],
  house: ["pucca", "kutcha", "no_house"],
  taxpayer: ["yes", "no"],
  business_stage: ["new", "existing"],
  girl_child: ["yes", "no"],
};
export const RULE_KEYS = Object.keys(OPTIONS).filter((k) => k !== "age" && k !== "income");
export const MULTI = new Set(["occupation"]);
export const SENSITIVE = new Set(["category", "disability", "income", "gender"]);
export const CAN_BE_UNSURE = new Set(["income", "land", "taxpayer", "house", "category", "girl_child", "business_stage"]);
export const UNKNOWN = new Set(["not_sure", "prefer_not", "skip"]);

const BASE = ["age", "gender", "area", "income", "occupation"];
const BY_TOPIC = {
  study: ["education", "category", "disability"], farming: ["land", "taxpayer"], business: ["business_stage"],
  jobs: ["education"], health: [], housing: ["house"], family: ["taxpayer", "girl_child", "disability"],
};

export function questionsFor(topics) {
  const keys = [...BASE];
  (topics || []).forEach((t) => (BY_TOPIC[t] || []).forEach((q) => !keys.includes(q) && keys.push(q)));
  return keys;
}

export const TOPICS = ["study", "farming", "business", "jobs", "health", "housing", "family"];
export const BENEFIT_TYPES = ["cash", "insurance", "loan", "subsidy", "scholarship", "pension", "service", "training"];
