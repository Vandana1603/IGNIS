import { describe, expect, it } from 'vitest';
import { laboratorySourceUrl, makeAmbientParticles, qualitativeOutcome, recordScopeLabel } from '../src/phase8/labModel';

describe('laboratory visual model integrity', () => {
  it('draws many stable illustration markers without changing data', () => {
    const first = makeAmbientParticles(72, 'liquid');
    expect(first).toHaveLength(72);
    expect(first).toEqual(makeAmbientParticles(72, 'liquid'));
    expect(new Set(first.map(p => p.id)).size).toBe(72);
    expect(first.every(p => p.x >= 64 && p.x <= 716 && p.y >= 86 && p.y <= 340)).toBe(true);
  });
  it('changes particle motion parameters for a solid-fuel illustration', () => {
    const liquid = makeAmbientParticles(72, 'liquid');
    const solid = makeAmbientParticles(72, 'solid');
    expect(solid[0].duration).not.toBe(liquid[0].duration);
  });
  it('bounds non-data visual counts', () => {
    expect(makeAmbientParticles(100000, 'solid')).toHaveLength(120);
    expect(makeAmbientParticles(-5, 'solid')).toHaveLength(0);
    expect(makeAmbientParticles(Number.NaN, 'liquid')).toHaveLength(0);
  });
  it('discloses that record counts represent imported subsets', () => {
    expect(recordScopeLabel(3)).toMatch(/3 imported tests.*curated subset/);
    expect(recordScopeLabel(8)).toMatch(/8 imported tests.*curated subset/);
  });
  it('links to the proper official investigation instead of a fabricated source', () => {
    expect(laboratorySourceUrl('PSI-25')).toBe('https://psi.nasa.gov/physci/repo/data/investigations/PSI-25');
    expect(laboratorySourceUrl('PSI-69')).toBe('https://psi.nasa.gov/physci/repo/data/investigations/PSI-69');
  });
  it('does not invent outcomes for BASS-II', () => {
    expect(qualitativeOutcome(null)).toMatch(/No test ending recorded/);
    expect(qualitativeOutcome('Extinction')).toBe('Recorded test ending: Extinction');
  });
});
