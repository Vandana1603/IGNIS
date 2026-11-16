import { useState } from 'react';
import { ArrowUpRight, BookOpen, Database, Flame, History, Lightbulb, PlayCircle, ShieldCheck } from 'lucide-react';
import { PageHeading } from '../components/Ui';
import './mission.css';

type Group = 'data' | 'science' | 'history' | 'spinoffs';
interface OfficialResource { title: string; text: string; url: string; group: Group; badge?: string }

/** Curated, explicitly distinguished NASA source roles. None of these background links is imported as a test measurement. */
export const NASA_RESOURCES: OfficialResource[] = [
  { group: 'data', title: 'NASA PSI · Combustion Science', text: 'Search the official archive of experimental investigations.', url: 'https://psi.nasa.gov/physci/repo/search?q=combustion', badge: 'PRIMARY DATA DISCOVERY' },
  { group: 'data', title: 'BASS-II · PSI-25', text: 'Solid-fuel investigation and original NASA test tables.', url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-25', badge: 'IMPORTED SUBSET' },
  { group: 'data', title: 'FLEX · PSI-69', text: 'Liquid-droplet combustion investigation and test tables.', url: 'https://psi.nasa.gov/physci/repo/data/investigations/PSI-69', badge: 'IMPORTED SUBSET' },
  { group: 'science', title: 'NASA Combustion Science', text: 'Investigation objectives and ISS laboratory facilities.', url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/' },
  { group: 'science', title: 'Researcher’s Guide', text: 'NASA overview of ISS combustion research and experiments.', url: 'https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/' },
  { group: 'science', title: 'ScienceCasts · Combustion on ISS', text: 'Short NASA explainer video about microgravity combustion.', url: 'https://www.youtube.com/watch?v=W1oXykoz9zg', badge: 'WATCH VIDEO' },
  { group: 'history', title: 'Apollo 1', text: 'Prelaunch cabin fire: accident investigation and lessons.', url: 'https://sma.nasa.gov/sma-disciplines/accllp/apollo-1' },
  { group: 'history', title: 'Apollo 13', text: 'Oxygen tank explosion: mission investigation and lessons; not an open-flame experiment.', url: 'https://sma.nasa.gov/sma-disciplines/accllp/apollo-13' },
  { group: 'history', title: 'Fire aboard Space Station Mir', text: 'NASA historical account of the 1997 oxygen-generator fire.', url: 'https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/' },
  { group: 'spinoffs', title: 'Fireman’s Air Tanks', text: 'Spacesuit technology adapted for firefighter breathing equipment.', url: 'https://spinoff.nasa.gov/node/9582' },
  { group: 'spinoffs', title: 'Fire Detector', text: 'NASA-linked smoke detection with reduced dust false alarms.', url: 'https://spinoff.nasa.gov/node/9407' },
  { group: 'spinoffs', title: 'New Technology for the Fire Attire', text: 'Protective clothing technology transfer and materials.', url: 'https://spinoff.nasa.gov/node/9918' },
];
const TABS: { value: Group; label: string; icon: typeof Database }[] = [
  { value: 'data', label: 'Experimental data', icon: Database },
  { value: 'science', label: 'Science & apparatus', icon: BookOpen },
  { value: 'history', label: 'Mission lessons', icon: History },
  { value: 'spinoffs', label: 'Earth applications', icon: Lightbulb },
];
export function SourceLibrary() {
  const [tab, setTab] = useState<Group>('data');
  const shown = NASA_RESOURCES.filter(r => r.group === tab);
  return <div className="page-stack ignite-source-library">
    <PageHeading eyebrow="RESEARCH / VERIFIED REFERENCES" title="NASA source library" description="The references behind the research. One compact place to explore original data, science context, lessons, and technology transfer."/>
    <div className="ignite-source-policy"><ShieldCheck size={19}/><span><strong>Experimental evidence ≠ background context.</strong> Only validated imported NASA PSI table fields power IGNIS measurements and Scientific Intelligence. Historical incidents and Spinoffs are reference material.</span></div>
    <div className="ignite-source-tabs" role="tablist" aria-label="NASA source category">
      {TABS.map(t => <button type="button" key={t.value} role="tab" aria-selected={tab === t.value} onClick={() => setTab(t.value)} className={tab === t.value ? 'active' : ''}><t.icon size={16}/>{t.label}</button>)}
    </div>
    <div className="ignite-resource-grid">
      {shown.map(resource => <a key={resource.url} className="ignite-resource" href={resource.url} target="_blank" rel="noopener noreferrer">
        <span className="ignite-resource-top"><span className="ignite-resource-symbol">{resource.badge === 'WATCH VIDEO' ? <PlayCircle size={23}/> : tab === 'history' ? <Flame size={22}/> : <BookOpen size={22}/>}</span><ArrowUpRight size={18}/></span>
        <strong>{resource.title}</strong><p>{resource.text}</p>
        {resource.badge && <span className="ignite-resource-badge">{resource.badge}</span>}
      </a>)}
    </div>
    <div className="ignite-source-foot"><ShieldCheck size={17}/><span>NASA links open their original pages. IGNIS is an independent Space Apps prototype, not an official NASA operational system.</span></div>
  </div>;
}
