import { GraduationCap, Sprout, Store, Wrench, HeartPulse, Home, Users, LayoutGrid } from "lucide-react";

export const TOPIC_ICONS = { study: GraduationCap, farming: Sprout, business: Store, jobs: Wrench, health: HeartPulse, housing: Home, family: Users, all: LayoutGrid };

export default function TopicIcon({ topic, className = "h-5 w-5" }) {
  const Icon = TOPIC_ICONS[topic] || LayoutGrid;
  return <Icon className={className} aria-hidden strokeWidth={1.8} />;
}
