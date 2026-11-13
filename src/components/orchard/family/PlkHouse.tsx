// @ts-nocheck
// COPY of HouseArt from the CRM's app/portal/login/PortalLoginClient.jsx
// (ck-crm-template): the sign-in house that draws itself and keeps moving
// (smoke, clouds, birds, sun rays, beating heart, glowing windows). Same
// drawing on the web portal and in the app; change both together.
export function PlkHouse({ className = '', style = undefined }: any) {
  return (
    <svg style={style} className={`plk-house ${className}`} viewBox="0 0 320 230" fill="none" stroke="#1C2E29" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g className="cloud c1"><path d="M30 52c0-7 6-12 13-12 3-7 10-11 18-9 6 1 10 6 11 11 6 0 10 4 10 10H30z" fill="#fff" stroke="none" opacity=".9" /></g>
      <g className="cloud c2"><path d="M196 30c0-5 4-9 9-9 2-5 7-8 13-7 4 1 7 4 8 8 4 0 7 3 7 8h-37z" fill="#fff" stroke="none" opacity=".8" /></g>
      <g className="sun">
        <circle className="glow" cx="268" cy="62" r="16" fill="#EEF8C8" stroke="none" />
        <g className="rays" stroke="#C9DE6B" strokeWidth="2">
          <path d="M268 36v-7M268 95v-7M242 62h-7M301 62h-7M250 44l-5-5M291 85l-5-5M250 80l-5 5M291 39l-5 5" />
        </g>
        <circle className="d d7" cx="268" cy="62" r="16" stroke="#B9D44A" />
      </g>
      <g className="bird b1"><path className="wing" d="M214 52c4-4 8-4 10 0c2-4 6-4 10 0" stroke="#5F6D68" strokeWidth="2" /></g>
      <g className="bird b2"><path className="wing" d="M236 70c3-3 6-3 8 0c2-3 5-3 8 0" stroke="#86928C" strokeWidth="1.8" /></g>
      <line className="d d1" x1="20" y1="210" x2="300" y2="210" stroke="#86928C" />
      <path className="d d2" d="M70 210V122l90-62 90 62v88" />
      <path className="d d2b" d="M206 90V66h16v35" />
      <g className="smoke"><circle cx="214" cy="56" r="5" /><circle cx="219" cy="44" r="6.5" /><circle cx="213" cy="30" r="8" /></g>
      <rect className="d d3" x="140" y="150" width="40" height="60" rx="4" />
      <circle className="knob" cx="172" cy="182" r="2" fill="#1C2E29" stroke="none" />
      <rect className="win" x="93" y="135" width="28" height="24" rx="3" fill="#FFF3B0" stroke="none" />
      <rect className="win w2" x="199" y="135" width="28" height="24" rx="3" fill="#FFF3B0" stroke="none" />
      <rect className="d d4" x="90" y="132" width="34" height="30" rx="4" />
      <rect className="d d4" x="196" y="132" width="34" height="30" rx="4" />
      <path className="d d4" d="M107 132v30M213 132v30" strokeWidth="1.6" />
      <path className="d d5" d="M160 210c0 10 -6 14 -6 20" stroke="#B5BDB8" strokeWidth="1.8" />
      <g className="plant"><path className="d d5" d="M38 210c0-22 13-32 13-32s13 10 13 32" stroke="#2F7556" /><path className="d d5" d="M51 210v-26" stroke="#2F7556" /></g>
      <g className="plant p2"><path className="d d5" d="M268 210c0-14 8-20 8-20s8 6 8 20" stroke="#2F7556" /></g>
      <g className="heart"><path className="d d6" d="M160 102s-14-8-14-17a7 7 0 0 1 14-3 7 7 0 0 1 14 3c0 9-14 17-14 17z" stroke="#E8714F" fill="#FBD5CA" /></g>
    </svg>
  );
}

export const PLK_HOUSE_CSS = `
.plk-house { align-self:center; width:min(360px,82%); height:auto; position:relative; overflow:visible; animation:plkFloat 6s ease-in-out 2.6s infinite; }
.plk-house .d { stroke-dasharray:640; stroke-dashoffset:640; animation:plkDraw 1.3s ease forwards; }
.plk-house .d1 { animation-duration:.8s; } .plk-house .d2 { animation-delay:.15s; } .plk-house .d2b { animation-delay:.45s; }
.plk-house .d3 { animation-delay:.55s; } .plk-house .d4 { animation-delay:.7s; } .plk-house .d5 { animation-delay:.85s; }
.plk-house .d6 { fill-opacity:0; animation:plkDraw 1s ease 1s forwards, plkFill .4s ease 1.7s forwards; } .plk-house .d7 { animation-delay:1.1s; }
.plk-house .knob { opacity:0; animation:plkFade .3s ease 1.4s forwards; }
.plk-house .win { opacity:0; animation:plkFade .5s ease 1.6s forwards, plkFlicker 5s ease-in-out 3s infinite; }
.plk-house .win.w2 { animation-delay:1.8s, 4.4s; }
.plk-house .heart { transform-box:fill-box; transform-origin:center; animation:plkBeat 2.4s ease-in-out 2.1s infinite; }
.plk-house .sun .glow { transform-box:fill-box; transform-origin:center; opacity:0; animation:plkGlow 3.2s ease-in-out 1.8s infinite; }
.plk-house .rays { transform-box:view-box; transform-origin:268px 62px; opacity:0; animation:plkFade .6s ease 1.6s forwards, plkSpin 24s linear 1.6s infinite; }
.plk-house .smoke circle { fill:#fff; stroke:#C9D0C6; stroke-width:1.5; opacity:0; transform-box:fill-box; transform-origin:center; animation:plkSmoke 3.6s ease-out infinite; }
.plk-house .smoke circle:nth-child(1) { animation-delay:2s; } .plk-house .smoke circle:nth-child(2) { animation-delay:3.2s; } .plk-house .smoke circle:nth-child(3) { animation-delay:4.4s; }
.plk-house .cloud { opacity:0; animation:plkFade .8s ease 1.2s forwards, plkCloud 18s ease-in-out 1.2s infinite; }
.plk-house .cloud.c2 { animation:plkFade .8s ease 1.5s forwards, plkCloud 22s ease-in-out -6s infinite reverse; }
.plk-house .bird { opacity:0; animation:plkFade .5s ease 2s forwards, plkFly 9s ease-in-out 2s infinite; }
.plk-house .bird.b2 { animation:plkFade .5s ease 2.4s forwards, plkFly 11s ease-in-out -3s infinite reverse; }
.plk-house .wing { transform-box:fill-box; transform-origin:center; animation:plkFlap .5s ease-in-out infinite alternate; }
.plk-house .plant { transform-box:fill-box; transform-origin:bottom center; animation:plkSway 4s ease-in-out 2s infinite; }
.plk-house .plant.p2 { animation-delay:2.8s; }
@keyframes plkRise { from { opacity:0; transform:translateY(12px); } }
@keyframes plkDraw { to { stroke-dashoffset:0; } }
@keyframes plkFill { to { fill-opacity:1; } }
@keyframes plkFade { to { opacity:1; } }
@keyframes plkFlicker { 0%,100% { opacity:1; } 50% { opacity:.6; } }
@keyframes plkBeat { 0%,100% { transform:scale(1); } 12% { transform:scale(1.18); } 24% { transform:scale(1); } 36% { transform:scale(1.1); } 48% { transform:scale(1); } }
@keyframes plkGlow { 0%,100% { opacity:0; transform:scale(1); } 50% { opacity:1; transform:scale(1.6); } }
@keyframes plkSpin { to { transform:rotate(360deg); } }
@keyframes plkSmoke { 0% { opacity:0; transform:translate(0,6px) scale(.5); } 25% { opacity:.9; } 100% { opacity:0; transform:translate(10px,-22px) scale(1.4); } }
@keyframes plkCloud { 0%,100% { transform:translateX(0); } 50% { transform:translateX(26px); } }
@keyframes plkFly { 0%,100% { transform:translate(0,0); } 25% { transform:translate(-18px,-8px); } 50% { transform:translate(-30px,2px); } 75% { transform:translate(-12px,6px); } }
@keyframes plkFlap { from { transform:scaleY(1); } to { transform:scaleY(.55); } }
@keyframes plkSway { 0%,100% { transform:rotate(0deg); } 50% { transform:rotate(4deg); } }
@keyframes plkFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
@keyframes plkDrift { 0%,100% { transform:translate(0,0); } 50% { transform:translate(-22px,16px); } }
@keyframes plkPop { 0% { transform:scale(.86); } 60% { transform:scale(1.08); } 100% { transform:scale(1); } }
@keyframes plkBlink { 50% { opacity:0; } }
@keyframes plkShine { to { transform:translateX(100%); } }
@keyframes plkShake { 0%,100% { transform:none; } 25% { transform:translateX(-4px); } 75% { transform:translateX(4px); } }
@keyframes plkSheet { from { transform:translateY(70px); } }
  .plk-house { width:min(250px,72%); margin:4px auto 0; }
  .plk-house .d { stroke-dashoffset:0; } .plk-house .d6 { fill-opacity:1; }
  .plk-house .win, .plk-house .knob, .plk-house .rays, .plk-house .cloud, .plk-house .bird { opacity:1; }
  .plk-house .smoke circle { opacity:0; }
@media (prefers-reduced-motion: reduce) { .plk-house, .plk-house * { animation:none !important; } .plk-house .d { stroke-dashoffset:0; } .plk-house .d6 { fill-opacity:1; } .plk-house .win, .plk-house .knob, .plk-house .rays, .plk-house .cloud, .plk-house .bird { opacity:1; } .plk-house .smoke circle { opacity:0; } }
`;

export function PlkHouseStyles() {
  return <style dangerouslySetInnerHTML={{ __html: PLK_HOUSE_CSS }} />;
}
