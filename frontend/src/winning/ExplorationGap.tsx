import { ArrowUpRight, Orbit } from 'lucide-react';
import './winning.css';

/** A contextual research question, not a prediction of lunar or spacecraft fire behavior. */
export function ExplorationGap() {
  return <aside className="winning-gap" aria-label="Exploration research gap">
    <div className="winning-gap-heading"><Orbit size={20}/><div><span>WHY THIS RESEARCH MATTERS</span><strong>Next frontier: lunar conditions</strong></div></div>
    <div className="winning-gap-journey" aria-label="Current evidence versus unanswered research question">
      <div><small>WHAT IGNIS HAS</small><strong>Microgravity records</strong><span>BASS-II + FLEX imported subset</span></div>
      <span aria-hidden="true" className="winning-gap-arrow">→</span>
      <div><small>WHAT REMAINS OPEN</small><strong>Partial-gravity combustion</strong><span>No such experiments in this imported catalog</span></div>
    </div>
    <p>Oxygen-rich habitats and lunar gravity motivate new research. IGNIS helps locate existing evidence but does not predict flammability or Moon/Mars safety.</p>
    <a href="https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/" target="_blank" rel="noopener noreferrer">NASA researcher’s guide <ArrowUpRight size={14}/></a>
  </aside>;
}
