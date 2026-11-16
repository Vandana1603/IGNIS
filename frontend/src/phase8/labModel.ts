/**
 * Presentation-only visual helpers for the IGNIS qualitative laboratory.
 * These points are illustration markers, NEVER experimental particle tracks,
 * molecule counts, reaction outputs, or a physics simulation.
 */
export type LabFuel = 'liquid' | 'solid';

export type VisualParticle = {
  id: number;
  x: number;
  y: number;
  radius: number;
  delay: number;
  duration: number;
  tone: 'cyan' | 'blue';
};

/** Stable positions keep rerenders consistent and the demo reproducible. */
export function makeAmbientParticles(count: number, fuel: LabFuel): VisualParticle[] {
  const safeCount = Math.max(0, Math.min(120, Math.floor(Number.isFinite(count) ? count : 0)));
  return Array.from({ length: safeCount }, (_, id) => {
    const u = ((id * 0.618033988749895 + 0.17) % 1);
    const v = ((id * 0.7548776662466927 + 0.31) % 1);
    return {
      id,
      // Keep dots within a consistent viewBox safe zone.
      x: 64 + u * 652,
      y: 86 + v * 254,
      radius: 1.45 + ((id * 7) % 4) * 0.31,
      delay: -((id * 11) % 47) / 10,
      duration: (fuel === 'solid' ? 3.0 : 4.3) + (id % 6) * 0.32,
      tone: id % 3 === 0 ? 'cyan' : 'blue',
    };
  });
}

export function laboratorySourceUrl(source: 'PSI-25' | 'PSI-69'): string {
  return `https://psi.nasa.gov/physci/repo/data/investigations/${source}`;
}

/** Accurate wording: an imported subset can contain any number of verified records. */
export function recordScopeLabel(count: number): string {
  return `${count} imported ${count === 1 ? 'test' : 'tests'} · curated subset`;
}

export function qualitativeOutcome(raw: string | null): string {
  return raw?.trim() ? `Recorded test ending: ${raw.trim()}` : 'No test ending recorded in this subset';
}
