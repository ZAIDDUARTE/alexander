import type { TrilletDemoBundle } from "./render";

export function buildInstallationInstructions(bundle: TrilletDemoBundle): string {
  return `# Trillet manual installation — Sunday callable demo

**Customer:** ${bundle.meta.companyDisplayName}  
**Voice agent name:** ${bundle.meta.agentName}  
**Do not use Trillet API from this repo for this step — configure in the dashboard.**

## Files in this folder (what to upload where)

| File | Trillet destination |
|------|---------------------|
| \`FINAL_AGENT_INSTRUCTIONS.md\` | **Agent / Call flow → Instructions** (use this — not the bulky \`shared-prompt.md\`) |
| \`company-knowledge.md\` | **Knowledge base** document (create KB, upload or paste text) |
| \`greeting-suggestion.txt\` | Included at top of \`FINAL_AGENT_INSTRUCTIONS.md\` (only fixed script) |

## Step-by-step (dashboard)

1. **Sign in** to [app.trillet.ai](https://app.trillet.ai) (workspace for Alexander demo).
2. **Create a knowledge base** (see Trillet docs: *Create Knowledge Base*).  
   - Name suggestion: \`${bundle.meta.companyDisplayName} — Company Knowledge\`  
   - Upload or paste contents of \`company-knowledge.md\`.
3. **Create or open a call agent / call flow** (see Trillet Help: *Create and configure a call flow* — help.trillet.ai).  
   - Attach the knowledge base to the agent/flow if the UI provides a KB selector.
4. **Paste \`FINAL_AGENT_INSTRUCTIONS.md\`** into the agent **Instructions** / system prompt field (concise; no JSON).
5. **Voice & language**  
   - Configure feminine-presenting / warm professional voice per customer preference.  
   - Enable **English** and **Spanish** if supported in your Trillet plan.
7. **Tools / API actions**  
   - For Sunday demo: **disable** custom API tools (no CRM/calendar/booking tools).  
   - This prevents the model from claiming tool success.
8. **Phone number**  
   - Assign inbound number to this call flow (operator provides number in Trillet UI).
9. **Test call**  
   - Run through \`demo-call-scenarios.md\` checklist before Phillip's call.

## Trillet documentation references

- Quickstart: [docs.trillet.ai/documentation/quickstart](https://docs.trillet.ai/documentation/quickstart) — prompting and agent setup  
- Knowledge bases API (for later automation): [Create Knowledge Base](https://docs.trillet.ai/v1/api-reference/endpoints/knowledge-base/create)  
- Call flows: [Trillet Help — Create a call flow](https://trillet.ai/help-center/platform/create-a-call-flow)

## Profile metadata

- Policy profile review state: **${bundle.meta.reviewState}**
- Answers content SHA-256: \`${bundle.meta.profileContentSha256}\`
- Approx. prompt size: ${bundle.meta.approxPromptChars} characters (confirm within model context limits in Trillet UI)

## After Sunday

When integrations are ready, replace demo constraints with tool-backed instructions — do not delete the reusable Agent Instructions v1.1 core.
`;
}
