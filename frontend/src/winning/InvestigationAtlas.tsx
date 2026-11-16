import { useState } from 'react';
import { ArrowUpRight, Atom, Database, FlaskConical, Microscope, Wind } from 'lucide-react';
import type { TestRecord } from '../lib/types';
import { importedFamilyCount } from './science';
import './winning.css';

type Family = 'droplet' | 'flow' | 'acme' | 'aerosol';
const FAMILIES: { id: Family; short: string; title: string; hardware: string; investigations: string[]; context: string; sourceId: string | null; icon: typeof Atom }[] = [
  {
    id: 'droplet', short: 'Droplets', title: 'Liquid-droplet research',
    hardware: 'Multi-user Droplet Combustion Apparatus · Combustion Integrated Rack',
    investigations: ['FLEX', 'FLEX-2', 'CFI'],
    context: 'Compare original droplet composition, geometry, conditions, and recorded outcomes.',
    sourceId: 'PSI-69', icon: FlaskConical,
  },
  {
    id: 'flow', short: 'Flow duct', title: 'Solid / gaseous fuel research',
    hardware: 'Microgravity Science Glovebox · modular fan-driven flow duct',
    investigations: ['BASS', 'BASS-II', 'SPICE', 'SLICE'],
    context: 'Different fuels and flow environments share a hardware family, not automatically comparable measurements.',
    sourceId: 'PSI-25', icon: Wind,
  },
  {
    id: 'acme', short: 'Gaseous flames', title: 'ACME research family',
    hardware: 'Modular ACME hardware · Combustion Integrated Rack',
    investigations: ['ACME', 'BRE', 'CFI-G', 'E-FIELD Flames'],
    context: 'Explore flame configurations, material flammability questions, and oxygen-rich research conditions.',
    sourceId: null, icon: Atom,
  },
  {
    id: 'aerosol', short: 'Smoke & dust', title: 'Detection and aerosol studies',
    hardware: 'Smoke/dust measurement instruments across related investigations',
    investigations: ['SAME', 'SAME-R', 'DAFT', 'DAFT-2'],
    context: 'Discover why smoke-detection instrumentation and dust studies are relevant to environmental monitoring.',
    sourceId: null, icon: Microscope,
  },
];

/** Hardware groupings are sourced from the challenge considerations; only imported
 * PSI-25 / PSI-69 records are allowed to appear as measured data. */
export function InvestigationAtlas({ records }: { records: TestRecord[] }) {
  const [selected, setSelected] = useState<Family>('droplet');
  const item = FAMILIES.find(f => f.id === selected)!;
  const Icon = item.icon;
  const imported = importedFamilyCount(records, item.sourceId);
  return <div className="winning-atlas" aria-label="NASA investigation relationships">
    <div className="winning-atlas-pills" role="group" aria-label="Investigation family">
      {FAMILIES.map(f => <button type="button" key={f.id} className={f.id === selected ? 'active' : ''} aria-pressed={f.id === selected} onClick={() => setSelected(f.id)}>{f.short}</button>)}
    </div>
    <div className="winning-atlas-body">
      <div className="winning-atlas-icon"><Icon size={25}/></div>
      <div className="winning-atlas-info">
        <strong>{item.title}</strong>
        <span>{item.hardware}</span>
        <div className="winning-atlas-nodes" aria-label="Related investigations">
          {item.investigations.map(inv => <span key={inv} className={(inv === 'FLEX' && item.sourceId === 'PSI-69') || (inv === 'BASS-II' && item.sourceId === 'PSI-25') ? 'imported' : ''}>{inv}</span>)}
        </div>
        <p>{item.context}</p>
        <div className="winning-atlas-foot"><span><Database size={14}/> {imported ? `${imported} imported test records from one investigation` : 'Source context only · no imported measurements'}</span><a href="https://psi.nasa.gov/physci/repo/search?q=combustion" target="_blank" rel="noopener noreferrer">NASA PSI archive <ArrowUpRight size={14}/></a></div>
      </div>
    </div>
    <small>Shared hardware identifies research connections—not equivalent test conditions. Other investigation names are context, not imported data.</small>
  </div>;
}
