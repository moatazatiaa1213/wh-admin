// Builds a human-readable baggage allowance string from an airline's
// structured luggage fields, e.g. "2 × 23kg checked, 7kg carry-on".
// Parts are omitted independently when their underlying value is unset.

interface BaggageFields {
  checked_bags_count?: number
  checked_bags_weight_kg?: number
  carry_on_weight_kg?: number
}

export function formatBaggage(a: BaggageFields): string {
  const parts: string[] = []

  if (a.checked_bags_count && a.checked_bags_weight_kg) {
    parts.push(`${a.checked_bags_count} × ${a.checked_bags_weight_kg}kg checked`)
  } else if (a.checked_bags_weight_kg) {
    parts.push(`${a.checked_bags_weight_kg}kg checked`)
  }

  if (a.carry_on_weight_kg) {
    parts.push(`${a.carry_on_weight_kg}kg carry-on`)
  }

  return parts.join(', ')
}
