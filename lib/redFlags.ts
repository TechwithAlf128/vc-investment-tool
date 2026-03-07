import { RedFlag, ExtractedDeal } from './types';
import rules from '../config/red_flag_rules.json';

export function detectRedFlags(deal: Partial<ExtractedDeal>): RedFlag[] {
  const flags: RedFlag[] = [];

  const getValue = (field: keyof ExtractedDeal): string => {
    const f = deal[field] as { value: unknown } | undefined;
    return String(f?.value ?? '').toLowerCase();
  };

  const allTriggers = [
    ...rules.hard_fail_triggers,
    ...rules.escalate_triggers,
  ];

  for (const trigger of allTriggers) {
    const value = getValue(trigger.field as keyof ExtractedDeal);
    if (value && new RegExp(trigger.pattern, 'i').test(value)) {
      flags.push({
        category: trigger.flag as RedFlag['category'],
        severity: trigger.severity as RedFlag['severity'],
        triggered_by: `Field: ${trigger.field} = "${value}"`,
        questions: getQuestionsForFlag(trigger.flag),
      });
    }
  }

  return flags;
}

function getQuestionsForFlag(flag: string): string[] {
  const questionMap: Record<string, string[]> = {
    crypto: ['Does the company have any crypto/token components?', 'Is blockchain core to the business model?'],
    gambling: ['Is any revenue derived from gambling activities?'],
    non_us_primary: ['Where is the primary business operated?', 'Where are key employees located?'],
    china_exposure: ['What is the nature of China exposure?', 'Are any key suppliers or customers in China?'],
    legal_compliance: ['What is the current status of legal proceedings?', 'Has counsel reviewed all compliance matters?'],
    founder_integrity: ['What is the source of the integrity concern?', 'Have references been checked?', 'Is there public record of any issues?'],
    cap_table: ['Who controls the board?', 'Are there any side letters?', 'What is the full cap table structure?'],
  };
  return questionMap[flag] ?? ['Please investigate this flag further.'];
}
