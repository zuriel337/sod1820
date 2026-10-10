import React, { useId } from 'react';
import NavigationIcon2029 from '../experience2029/NavigationIcon2029.jsx';
import { BUILDINGS, CHALLENGES, buildingLevel } from '../../lib/kingdom/kingdomPreview.js';

// Gameplay scenery, not a second icon family. Every added feature is derived
// from replayed building level; SVG stays CPU-only and has no animation loop.
function Crystal({ x, y, scale = 1 }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} className="km-crystal">
    <path d="M0 -36 13 -15 9 7 0 14 -11 4 -14 -16Z" />
    <path d="M0 -36 0 14 13 -15M0 -36 -14 -16 0 -8 13 -15" fill="none" />
  </g>;
}
function Tree({ x, y, scale = 1 }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <ellipse cy="5" rx="18" ry="8" className="km-shadow" />
    <path d="M0 3V-43" className="km-edge" strokeWidth="4" />
    <path d="M0 -57C-32 -50 -28 -19 0 -20C28 -18 30 -47 0 -57Z" className="km-leaf" />
    <path d="M0 -51V-21M0 -29 -15 -39M0 -36 14 -44" className="km-edge" />
  </g>;
}
function Garden({ level, paint }) {
  return <g data-world-building="garden" data-level={level}>
    <ellipse cy="39" rx="139" ry="46" className="km-shadow" />
    <path d="M-128 5Q0 -62 128 5V21Q0 92 -128 21Z" fill={paint('stone')} className="km-outline" />
    <ellipse cy="5" rx="128" ry="55" fill={paint('terrace')} className="km-outline" />
    <ellipse cy="2" rx="99" ry="39" className="km-water" />
    <path d="M-96 4Q-50 -24 1 3T96 4" className="km-path" />
    {/* Curved glass conservatory, grounded by six ribs and open entrances. */}
    <path d="M-62 -15V-55Q0 -162 62 -55V-15Q0 20 -62 -15Z" fill={paint('glass')} className="km-glass" />
    <path d="M-62 -55Q0 -19 62 -55M-62 -15Q0 20 62 -15M0 -112V2M-32 -93Q-42 -60 -32 -1M32 -93Q42 -60 32 -1" className="km-rib" />
    <path d="M-11 0V-32Q0 -52 11 -32V0" className="km-door" />
    <Tree x={-87} y={5} scale={.75} /><Tree x={80} y={-4} scale={.7} />
    {level >= 2 && <g data-feature="garden-colonnade">
      <path d="M-117 12Q0 86 117 12" className="km-path" />
      {[-100, -70, 70, 100].map((x) => <path key={x} d={`M${x} ${38-Math.abs(x)*.17}v-37`} className="km-rib" strokeWidth="4" />)}
      <path d="M-100 -16Q0 39 100 -16L100 -24Q0 31 -100 -24Z" fill={paint('stone')} className="km-outline" />
    </g>}
    {level >= 3 && <g data-feature="garden-bloom">
      <Tree x={-106} y={-24} scale={1.12} /><Tree x={104} y={-18} scale={1} />
      {[-75,-40,40,75].map(x=><g key={x} transform={`translate(${x} ${48-Math.abs(x)*.16})`}><path d="M0 0v-19" className="km-edge"/><path d="M0 -19C-17 -34 -19 -11 0 -12C19 -11 17 -34 0 -19" className="km-leaf"/></g>)}
    </g>}
  </g>;
}
function Mine({ level, paint }) {
  return <g data-world-building="mine" data-level={level}>
    <ellipse cy="33" rx="130" ry="46" className="km-shadow" />
    <path d="M-131 10 -94 -57 -56 -75 -22 -157 32 -188 72 -114 98 -96 127 18 48 58 -53 51Z" fill={paint('rock')} className="km-outline" />
    <path d="M32 -188 12 -79 -56 -75 -22 -157ZM12 -79 72 -114 98 -96 48 58ZM-94 -57 -37 -30 -53 51 -131 10Z" className="km-rock-facet" />
    <path d="M32 -188 72 -114 12 -79 -22 -157M-56 -75 -37 -30 12 -79 48 58M-94 -57 -37 -30 -53 51" className="km-edge" />
    <path d="M-51 28V-22Q-12 -83 27 -22V40Z" className="km-door" strokeWidth="8" />
    <path d="M-40 30V-19Q-12 -61 16 -19V36M-32 1 5 8M-33 16 5 23" className="km-rib" />
    <path d="M-36 31 -72 56M9 41 -30 69M-44 38 -2 48M-57 47 -15 58" className="km-rail" />
    <Crystal x={71} y={18} scale={.8} /><Crystal x={92} y={24} scale={.45} />
    {level >= 2 && <g data-feature="mine-lens">
      <path d="M-81 -14V-69M-112 2V-52M-118 -49 -76 -73 -69 -65 -111 -40Z" fill={paint('stone')} className="km-rib" />
      <ellipse cx="-94" cy="-76" rx="21" ry="27" transform="rotate(25 -94 -76)" fill={paint('glass')} className="km-rib" />
      <path d="M-94 -100V-52M-112 -76H-76" className="km-edge" />
    </g>}
    {level >= 3 && <g data-feature="mine-crystal-vein">
      <Crystal x={31} y={-133} scale={1.1} /><Crystal x={53} y={-122} scale={.65}/><Crystal x={-54} y={-49} scale={.6}/>
      <path d="M31 -115 12 -79 30 -38 71 2" className="km-vein" />
    </g>}
  </g>;
}
function Factory({ level, pending, paint }) {
  return <g data-world-building="factory" data-level={level}>
    <ellipse cy="42" rx="133" ry="43" className="km-shadow" />
    <path d="M-108 0A108 48 0 0 0 108 0V24A108 48 0 0 1 -108 24Z" fill={paint('stone')} className="km-outline" />
    <ellipse rx="108" ry="48" fill={paint('terrace')} className="km-outline" />
    <path d="M-64 -90A64 30 0 0 0 64 -90V-11A64 30 0 0 1 -64 -11Z" fill={paint('glass')} className="km-glass" />
    <ellipse cy="-90" rx="64" ry="30" fill={paint('stone')} className="km-outline" />
    <ellipse cy="-90" rx="44" ry="19" className="km-water" />
    <path d="M-64 -53A64 30 0 0 0 64 -53M-45 -70V10M0 -60V20M45 -70V10" className="km-rib" />
    <path d="M-93 -1V-73L-74 -86M93 -1V-73L74 -86" className="km-rib" strokeWidth="6" />
    <path d="M-89 15Q0 69 89 15M-89 25Q0 79 89 25" className="km-edge" />
    <Crystal x={0} y={-83} scale={.9} />
    <path d="M-72 -12 -93 1 -54 26 -35 15ZM35 15 55 26 93 1 72 -12Z" fill={paint('glass')} className="km-outline" />
    {level >= 2 && <g data-feature="factory-prism">
      <path d="M-89 7V-118M89 7V-118" className="km-rib" strokeWidth="5" />
      <ellipse cy="-118" rx="89" ry="44" fill="none" className="km-rib" strokeWidth="6" />
      <ellipse cy="-118" rx="64" ry="31" fill="none" className="km-vein" />
      <path d="M0 -166 23 -127 0 -87 -23 -127Z" fill={paint('glass')} className="km-glass" />
    </g>}
    {pending > 0 && <g data-feature="production-ready"><Crystal x={64} y={57} scale={.55}/><Crystal x={81} y={48} scale={.4}/><Crystal x={48} y={64} scale={.4}/></g>}
  </g>;
}
const CENTERS = { garden: [245, 274], mine: [510, 198], factory: [762, 315] };
export default function KingdomMap2029({ state, selected, onChoose, mapRef, moment, still, onToggleMotion }) {
  const id = useId().replace(/:/g, '');
  const paint = name => `url(#${id}-${name})`;
  const levels = Object.fromEntries(BUILDINGS.map(b => [b.id, buildingLevel(state, b.id)]));
  return <section className="kingdom-map" aria-label="מפת הממלכה" data-focus={selected} data-still={still}>
    <div className="kingdom-map-caption"><div><p className="kingdom-eyebrow">הממלכה שלכם</p><h2>מגלים. בונים. מאירים.</h2></div>
      <button type="button" aria-pressed={still} onClick={onToggleMotion}>{still ? 'הפעלת תנועה' : 'ללא תנועה'}</button>
    </div>
    <div className="kingdom-world" style={{ '--km-focus-x': `${CENTERS[selected][0] * .9}px` }}>
      <svg viewBox="0 0 1000 480" className="kingdom-world-art" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-stone`} x2=".3" y2="1"><stop stopColor="var(--s29-panel)"/><stop offset="1" stopColor="var(--s29-accent-secondary)" stopOpacity=".42"/></linearGradient>
          <linearGradient id={`${id}-terrace`} x2="1" y2="1"><stop stopColor="var(--s29-panel)"/><stop offset="1" stopColor="var(--s29-accent)" stopOpacity=".22"/></linearGradient>
          <linearGradient id={`${id}-glass`} x2=".8" y2="1"><stop stopColor="var(--s29-discovery)" stopOpacity=".6"/><stop offset=".48" stopColor="var(--s29-panel)" stopOpacity=".7"/><stop offset="1" stopColor="var(--s29-accent-secondary)" stopOpacity=".65"/></linearGradient>
          <linearGradient id={`${id}-rock`} x2=".7" y2="1"><stop stopColor="var(--s29-muted)"/><stop offset="1" stopColor="var(--s29-panel-soft)"/></linearGradient>
          <radialGradient id={`${id}-aura`}><stop stopColor="var(--s29-discovery)" stopOpacity=".18"/><stop offset="1" stopColor="var(--s29-discovery)" stopOpacity="0"/></radialGradient>
        </defs>
        {/* Single terrain, paths and shared watercourse anchor the three places. */}
        <path d="M50 286 484 71 947 301 517 465Z" className="km-ground-side" />
        <path d="M50 274 484 59 947 289 517 453Z" fill={paint('terrace')} className="km-outline" />
        <path d="M50 274 517 453 947 289M517 453V465" className="km-edge" />
        <path d="M73 277 513 439 923 287M93 273 511 426 901 285" className="km-contour" />
        <path d="M321 342Q369 301 419 306T527 340T664 362Q713 359 727 381L600 425Q549 374 464 364T321 342Z" className="km-water" />
        <path d="M274 305 405 248 494 253 628 320 710 343" className="km-road-base" />
        <path d="M274 305 405 248 494 253 628 320 710 343" className={`km-road ${levels.mine ? 'is-open' : ''}`} />
        {levels.mine > 0 && <path d="M292 297 405 248 472 251" className="km-path" data-feature="garden-path"/>}
        {levels.factory > 0 && <path d="M517 265 628 320 710 343" className="km-path" data-feature="factory-path"/>}
        <path d="M481 353 511 339 547 353 516 368Z" fill={paint('stone')} className="km-outline" />
        {[0,1,2,3,4].map(i=><path key={i} d={`M${484+i*6} ${354-i*3}l31 15`} className="km-edge"/>)}
        <Tree x={365} y={203} scale={.7}/><Tree x={628} y={211} scale={.6}/><Tree x={588} y={397} scale={.65}/>
        <Crystal x={379} y={364} scale={.45}/><Crystal x={855} y={304} scale={.5}/>
        {/* Painter order is stable; focus never reorders world geometry. */}
        {['mine', 'garden', 'factory'].map(key => <g key={key} transform={`translate(${CENTERS[key].join(' ')})`} className={`km-site ${levels[key] ? '' : 'is-locked'}`} data-selected={selected === key}>
          {selected === key && <ellipse cy="8" rx="175" ry="108" fill={paint('aura')} />}
          {key === 'garden' ? <Garden level={levels[key]} paint={paint}/> : key === 'mine' ? <Mine level={levels[key]} paint={paint}/> : <Factory level={levels[key]} pending={state.pending} paint={paint}/>}
          {moment?.building === key && <ellipse key={moment.id} cy="15" rx="139" ry="60" className={`km-event km-event-${moment.type}`} />}
        </g>)}
      </svg>
      <div className="kingdom-world-hotspots">
        {BUILDINGS.map(b=><button key={b.id} aria-label={`כניסה אל ${b.name}`} aria-controls="kingdom-workbench" style={{left:`${CENTERS[b.id][0]/10}%`,top:`${(CENTERS[b.id][1]-65)/4.8}%`}} onClick={()=>onChoose(b.id)} title={b.name} />)}
      </div>
    </div>
    <div className="kingdom-buildings" ref={mapRef}>
      {BUILDINGS.map(item => <button type="button" key={item.id} data-building={item.id}
        className={`kingdom-building ${selected === item.id ? 'is-selected' : ''} ${levels[item.id] ? '' : 'is-locked'}`}
        aria-pressed={selected === item.id} aria-controls="kingdom-workbench" onClick={()=>onChoose(item.id)}>
        <NavigationIcon2029 name={item.icon} size={24}/><span className="kingdom-building-name">{item.name}</span>
        <span>{levels[item.id] ? <>רמה {levels[item.id]} · <bdi>{CHALLENGES.filter(c=>c.building===item.id&&state.completed.includes(c.id)).length}/{CHALLENGES.filter(c=>c.building===item.id).length}</bdi> גילויים</> : 'טרם נפתח'}</span>
      </button>)}
    </div>
    <p className="kingdom-map-legend">{selected === 'garden' ? 'חממת האותיות · פתרו חידות כדי להצמיח את הגן' : selected === 'mine' ? 'המכרה · העמיקו בגילויים וחשפו גבישים' : `המפעל · ${state.pending ? `${state.pending} אור מחכים לאיסוף` : 'הגילויים מניעים את מנסרת האור'}`}</p>
  </section>;
}
