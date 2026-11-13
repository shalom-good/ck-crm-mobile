/**
 * The front door's little scene (Shalom 2026-11-10: "the moving house,
 * make it gorgeous"). A home on a hill: the sun turns, clouds drift, the
 * windows glow, smoke rises from the chimney, the heart beats, the tree
 * sways. All CSS (.ck-scene in orchard-family.css); still under
 * prefers-reduced-motion.
 */
export function HomeScene({ width = 300 }: { width?: number | string }) {
  return (
    <svg className="ck-scene" width={width} viewBox="0 0 320 190" preserveAspectRatio="xMidYMax meet" fill="none" aria-hidden>
      {/* sun */}
      <g className="ck-sun">
        <circle cx="262" cy="46" r="30" fill="#D7F36E" opacity=".28" className="ck-sun-halo" />
        <g className="ck-sun-rays" stroke="#B9D44A" strokeWidth="3" strokeLinecap="round">
          <path d="M262 8v9M262 75v9M224 46h9M291 46h9M235 19l6.5 6.5M283 67l6.5 6.5M289 19l-6.5 6.5M241 67l-6.5 6.5" />
        </g>
        <circle cx="262" cy="46" r="17" fill="#D7F36E" stroke="#B9D44A" strokeWidth="2" />
      </g>

      {/* clouds */}
      <g className="ck-cloud ck-cloud-a" fill="#fff" opacity=".9">
        <ellipse cx="52" cy="40" rx="20" ry="9" /><ellipse cx="68" cy="34" rx="14" ry="10" /><ellipse cx="82" cy="41" rx="15" ry="8" />
      </g>
      <g className="ck-cloud ck-cloud-b" fill="#fff" opacity=".75">
        <ellipse cx="178" cy="22" rx="13" ry="6" /><ellipse cx="190" cy="18" rx="10" ry="7" /><ellipse cx="200" cy="23" rx="10" ry="5" />
      </g>

      {/* the hill */}
      <path d="M0 190c40-34 96-44 160-44s120 10 160 44z" fill="#C9E3D1" />
      <path d="M0 190c50-22 104-28 160-28s110 6 160 28z" fill="#B7D8C2" />

      {/* tree */}
      <g className="ck-tree">
        <path d="M258 158v-30" stroke="#276449" strokeWidth="4" strokeLinecap="round" />
        <circle cx="258" cy="112" r="20" fill="#2F7556" />
        <circle cx="246" cy="122" r="12" fill="#3A6557" />
        <circle cx="270" cy="121" r="11" fill="#3A6557" />
        <circle cx="252" cy="106" r="5" fill="#D7F36E" opacity=".7" />
      </g>

      {/* chimney smoke */}
      <g fill="#fff">
        <circle className="ck-smoke ck-smoke-1" cx="196" cy="62" r="6" />
        <circle className="ck-smoke ck-smoke-2" cx="196" cy="62" r="5" />
        <circle className="ck-smoke ck-smoke-3" cx="196" cy="62" r="4" />
      </g>

      {/* the home */}
      <g className="ck-home">
        <rect x="188" y="64" width="16" height="30" rx="3" fill="#F3F5F1" stroke="#16211C" strokeWidth="2.4" />
        <rect x="104" y="98" width="112" height="64" rx="6" fill="#FFFFFF" stroke="#16211C" strokeWidth="2.4" />
        <path d="M94 102 160 54l66 48" fill="#2F7556" stroke="#16211C" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M94 102h132" stroke="#16211C" strokeWidth="2.4" strokeLinecap="round" />
        {/* heart */}
        <path className="ck-heart" d="M160 90s-10-6-10-13a5.2 5.2 0 0 1 10-2.2A5.2 5.2 0 0 1 170 77c0 7-10 13-10 13z" fill="#EE7A5B" />
        {/* windows */}
        <rect className="ck-win" x="116" y="112" width="24" height="22" rx="4" fill="#FBEFA6" stroke="#16211C" strokeWidth="2.2" />
        <rect className="ck-win ck-win-2" x="180" y="112" width="24" height="22" rx="4" fill="#FBEFA6" stroke="#16211C" strokeWidth="2.2" />
        <path d="M128 112v22M116 123h24M192 112v22M180 123h24" stroke="#16211C" strokeWidth="1.6" />
        {/* door */}
        <rect x="149" y="124" width="22" height="38" rx="5" fill="#D7F36E" stroke="#16211C" strokeWidth="2.4" />
        <circle cx="165" cy="144" r="1.8" fill="#16211C" />
      </g>

      {/* path and bushes */}
      <path d="M152 162c-4 10-14 18-30 28h56c-12-10-18-18-18-28z" fill="#F3F5F1" opacity=".85" />
      <g className="ck-bush"><ellipse cx="88" cy="160" rx="16" ry="10" fill="#3A6557" /><ellipse cx="74" cy="163" rx="10" ry="7" fill="#2F7556" /></g>
      <ellipse cx="228" cy="162" rx="10" ry="6" fill="#3A6557" />
    </svg>
  );
}
