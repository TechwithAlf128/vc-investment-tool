import { HardScreenResult, ExtractedDeal } from './types';
import redFlagRules from '../config/red_flag_rules.json';

export function runHardScreen(deal: Partial<ExtractedDeal>): HardScreenResult {
  const reasons: string[] = [];
  const flags: string[] = [];
  let status: 'pass' | 'fail' | 'escalate' = 'pass';

  const getValue = (field: keyof ExtractedDeal): string => {
    const f = deal[field] as { value: unknown } | undefined;
    return String(f?.value ?? '').toLowerCase();
  };

  // Check hard fail triggers
  for (const trigger of redFlagRules.hard_fail_triggers) {
    const value = getValue(trigger.field as keyof ExtractedDeal);
    if (value && new RegExp(trigger.pattern, 'i').test(value)) {
      status = 'fail';
      reasons.push(`Hard fail: ${trigger.flag} detected in ${trigger.field}`);
      flags.push(trigger.flag);
    }
  }

  // Check US geography
  const location = getValue('hq_location');
  if (location && !/(united states|usa|u\.s\.a|u\.s\.|,\s*(tx|ca|ny|fl|wa|ma|co|il|ga|nc|va|az|mn|oh|pa|nv|or|ut|md|ct|mi|wi|in|tn|mo|al|sc|ky|ia|ks|ar|ms|ok|ne|nm|id|nh|me|ri|sd|nd|mt|wv|wy|vt|de|ak|hi))/i.test(location)) {
    if (/(china|india|uk|europe|canada|australia|singapore|israel)/i.test(location)) {
      status = 'fail';
      reasons.push(`Hard fail: Company appears to be primarily non-US based (${location})`);
      flags.push('non_us_primary');
    }
  }

  // Check escalate triggers (only if not already failed)
  if (status !== 'fail') {
    for (const trigger of redFlagRules.escalate_triggers) {
      const value = getValue(trigger.field as keyof ExtractedDeal);
      if (value && new RegExp(trigger.pattern, 'i').test(value)) {
        status = 'escalate';
        reasons.push(`Escalate: ${trigger.flag} concern in ${trigger.field}`);
        flags.push(trigger.flag);
      }
    }
  }

  if (status === 'pass' && reasons.length === 0) {
    reasons.push('All hard screen criteria passed');
  }

  return { status, reasons, flags };
}
