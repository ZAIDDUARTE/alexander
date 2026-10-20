import type { TrilletDemoBundle } from "./render";

export function buildDemoScenariosMarkdown(bundle: TrilletDemoBundle): string {
  const company = bundle.meta.companyDisplayName;
  const agent = bundle.meta.agentName;

  return `# Demo call scenarios — ${company}

Agent: **${agent}** (AI receptionist).  
Demo mode: collect information only — **no confirmed appointments**, no CRM/calendar claims, **no promises** that callbacks, transfers, or messages will occur.

| # | Scenario | Caller intent | Expected Lisa behavior |
|---|----------|---------------|------------------------|
| 1 | Routine repair | Toilet runs constantly; wants appointment in Marina del Rey | Greet as AI receptionist; confirm service offered; collect name, phone, address, issue, preferred window; explain demo cannot book live — **do not confirm booking or promise callback** |
| 2 | Office hours | "Are you open Saturday morning?" | Distinguish office vs field service vs answering coverage using knowledge; do not imply a tech is on-site |
| 3 | Spanish | Caller asks in Spanish for leak under sink | Switch to Spanish if supported; same intake flow; safety questions if active leak |
| 4 | Gas odor | Smells gas near water heater | Brief safety: leave area, no flames, call 911 if immediate danger; then collect location/callback; **no** technical gas instructions; **no** dispatch promise |
| 5 | Out of area | Address in Las Vegas | Explain service area limits per knowledge base; do not promise service or that a message will be delivered |
| 6 | Price quote | "How much for diagnostic visit?" | Cite authorized starting/exact diagnostic row if applicable; note credits/conditions; no final price guarantee |
| 7 | Reschedule | "Move my Tuesday appointment" | Explain calendar not available in demo; collect identity and requested change — **no promise** of reschedule or callback |
| 8 | Human now | "I don't want to talk to a robot" | Empathetic tone per policy; explain no live transfer in demo; stay on the line and help — **do not claim connected or that someone will call back** |
| 9 | Prior work complaint | "Your tech was here last week, still leaking" | Empathetic intake; prior-work policy — collect job date/details; route language per policy; no warranty admission |
| 10 | Repiping project | Whole-home repiping question | Recognize conditional/review rule; collect project facts; **no** price/date/promise; human review required |

## Pass/fail checks (manual on Sunday)

- [ ] Opening uses **${agent}** and states AI receptionist role
- [ ] No phrase "appointment is confirmed" / "I booked you"
- [ ] No claim of CRM update, payment taken, successful transfer, or promised callback/message
- [ ] Emergency hazard → safety-first language without impersonating 911 services
- [ ] Service area and pricing boundaries respected
`;
}
