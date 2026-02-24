/**
 * Structured boundary and decision logging for ETL pipeline.
 * Use [transform], [enum], [dedup], [join], [filter] prefixes for searchable logs.
 * Per requirements-checklist §F.
 */

export function logTransformBoundary(
  entity: string,
  before: number,
  after: number
): void {
  console.log(`[transform] ${entity} before=${before} after=${after}`)
}

export function logEnumBoundary(
  entity: string,
  before: number,
  after: number
): void {
  console.log(`[enum] ${entity} before=${before} after=${after}`)
}

export function logDedupBoundary(
  entity: string,
  before: number,
  after: number,
  warnings: string[]
): void {
  console.log(`[dedup] ${entity} before=${before} after=${after}`)
  for (const w of warnings) {
    console.log(`[dedup] decision: ${entity} ${w}`)
  }
}

export function logJoinBoundary(
  stepName: string,
  leftEntity: string,
  rightEntity: string,
  before: number,
  after: number
): void {
  const missed = before - after
  const reason = missed > 0 ? ` (${missed} rows no match on ${leftEntity}→${rightEntity})` : ''
  console.log(`[join] ${stepName} before=${before} after=${after}${reason}`)
}

export function logFilterBoundary(
  before: number,
  after: number,
  ruleEffects: { ruleIndex: number; rule: string; type: string; excluded: number }[]
): void {
  console.log(`[filter] flat before=${before} after=${after} (excluded=${before - after})`)
  for (const e of ruleEffects) {
    if (e.excluded > 0) {
      console.log(`[filter] decision: rule ${e.ruleIndex} "${e.rule}" type=${e.type} excluded=${e.excluded}`)
    }
  }
}
