const { useState, useEffect, useRef, useMemo, useLayoutEffect, useId, useCallback, useReducer } = React;
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
;
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Brush / washi / irregular block primitives.
// All in plain inline SVG so each instance can vary seed for organic feel.



// Global SVG defs — one <svg> with filters used via filter:url(#id)
function BrushDefs() {
  return /*#__PURE__*/React.createElement("svg", {
    width: "0",
    height: "0",
    style: {
      position: 'absolute',
      pointerEvents: 'none'
    },
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("filter", {
    id: "brushEdge",
    x: "-15%",
    y: "-15%",
    width: "130%",
    height: "130%"
  }, /*#__PURE__*/React.createElement("feTurbulence", {
    type: "fractalNoise",
    baseFrequency: "0.018 0.025",
    numOctaves: "2",
    seed: "3"
  }), /*#__PURE__*/React.createElement("feDisplacementMap", {
    in: "SourceGraphic",
    scale: "7",
    xChannelSelector: "R",
    yChannelSelector: "G"
  })), /*#__PURE__*/React.createElement("filter", {
    id: "brushEdgeSoft",
    x: "-15%",
    y: "-15%",
    width: "130%",
    height: "130%"
  }, /*#__PURE__*/React.createElement("feTurbulence", {
    type: "fractalNoise",
    baseFrequency: "0.012 0.02",
    numOctaves: "2",
    seed: "7"
  }), /*#__PURE__*/React.createElement("feDisplacementMap", {
    in: "SourceGraphic",
    scale: "4",
    xChannelSelector: "R",
    yChannelSelector: "G"
  })), /*#__PURE__*/React.createElement("filter", {
    id: "brushEdgeWild",
    x: "-20%",
    y: "-20%",
    width: "140%",
    height: "140%"
  }, /*#__PURE__*/React.createElement("feTurbulence", {
    type: "fractalNoise",
    baseFrequency: "0.04 0.06",
    numOctaves: "3",
    seed: "11"
  }), /*#__PURE__*/React.createElement("feDisplacementMap", {
    in: "SourceGraphic",
    scale: "12",
    xChannelSelector: "R",
    yChannelSelector: "G"
  })), /*#__PURE__*/React.createElement("filter", {
    id: "capWobble",
    x: "-8%",
    y: "-8%",
    width: "116%",
    height: "116%"
  }, /*#__PURE__*/React.createElement("feTurbulence", {
    type: "fractalNoise",
    baseFrequency: "0.012 0.02",
    numOctaves: "2",
    seed: "4"
  }), /*#__PURE__*/React.createElement("feDisplacementMap", {
    in: "SourceGraphic",
    scale: "4",
    xChannelSelector: "R",
    yChannelSelector: "G"
  })), /*#__PURE__*/React.createElement("filter", {
    id: "flyAway",
    x: "0%",
    y: "0%",
    width: "100%",
    height: "100%"
  }, /*#__PURE__*/React.createElement("feTurbulence", {
    type: "fractalNoise",
    baseFrequency: "0.6",
    numOctaves: "2",
    seed: "5"
  }), /*#__PURE__*/React.createElement("feColorMatrix", {
    values: " 0 0 0 0 0.92 0 0 0 0 0.88 0 0 0 0 0.78 0 0 0 -2.5 1.6"
  }), /*#__PURE__*/React.createElement("feComposite", {
    in2: "SourceGraphic",
    operator: "in",
    result: "specks"
  }), /*#__PURE__*/React.createElement("feMerge", null, /*#__PURE__*/React.createElement("feMergeNode", {
    in: "SourceGraphic"
  }), /*#__PURE__*/React.createElement("feMergeNode", {
    in: "specks"
  }))), /*#__PURE__*/React.createElement("filter", {
    id: "flyAwayDry"
  }, /*#__PURE__*/React.createElement("feTurbulence", {
    type: "fractalNoise",
    baseFrequency: "0.18 0.9",
    numOctaves: "2",
    seed: "9"
  }), /*#__PURE__*/React.createElement("feColorMatrix", {
    values: " 0 0 0 0 0.93 0 0 0 0 0.89 0 0 0 0 0.80 0 0 0 -1.6 1.05"
  }), /*#__PURE__*/React.createElement("feComposite", {
    in2: "SourceGraphic",
    operator: "in",
    result: "specks"
  }), /*#__PURE__*/React.createElement("feMerge", null, /*#__PURE__*/React.createElement("feMergeNode", {
    in: "SourceGraphic"
  }), /*#__PURE__*/React.createElement("feMergeNode", {
    in: "specks"
  }))), /*#__PURE__*/React.createElement("filter", {
    id: "paperGrain",
    x: "0",
    y: "0",
    width: "100%",
    height: "100%"
  }, /*#__PURE__*/React.createElement("feTurbulence", {
    type: "fractalNoise",
    baseFrequency: "0.9",
    numOctaves: "2",
    seed: "2"
  }), /*#__PURE__*/React.createElement("feColorMatrix", {
    values: " 0 0 0 0 .12 0 0 0 0 .09 0 0 0 0 .05 0 0 0 .12 0"
  }), /*#__PURE__*/React.createElement("feComposite", {
    in2: "SourceGraphic",
    operator: "in"
  })), /*#__PURE__*/React.createElement("pattern", {
    id: "washiDots",
    patternUnits: "userSpaceOnUse",
    width: "22",
    height: "22"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "1.2",
    fill: "rgba(44,42,35,.18)"
  })), /*#__PURE__*/React.createElement("pattern", {
    id: "washiCross",
    patternUnits: "userSpaceOnUse",
    width: "18",
    height: "18"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M9 3 L9 15 M3 9 L15 9",
    stroke: "rgba(44,42,35,.13)",
    strokeWidth: "0.8"
  }))));
}

// BrushBlock — an irregular painted rectangle. Children placed on top.
// props: color, w, h, edge ('soft'|'normal'|'wild'), dry (bool), seed
function BrushBlock({
  color = 'var(--sage)',
  edge = 'normal',
  dry = true,
  className = '',
  style = {},
  rounded = 40,
  children,
  flyaway = null,
  // override 飛白 intensity 0..1 (else uses --brush-flyaway)
  flat = false,
  ...rest
}) {
  if (flat) {
    return /*#__PURE__*/React.createElement("div", _extends({
      className: `relative ${className}`,
      style: { ...style, background: color, borderRadius: rounded }
    }, rest), /*#__PURE__*/React.createElement("div", {
      className: "relative z-10 w-full h-full"
    }, children));
  }
  const filterMap = {
    soft: 'brushEdgeSoft',
    normal: 'brushEdge',
    wild: 'brushEdgeWild'
  };
  const edgeFilter = filterMap[edge];
  const seedH = useId();
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `relative ${className}`,
    style: style
  }, rest), /*#__PURE__*/React.createElement("svg", {
    className: "absolute inset-0 w-full h-full",
    preserveAspectRatio: "none",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3%",
    y: "3%",
    width: "94%",
    height: "94%",
    rx: rounded,
    ry: rounded,
    fill: color,
    filter: `url(#${edgeFilter})`
  }), dry && /*#__PURE__*/React.createElement("rect", {
    x: "3%",
    y: "3%",
    width: "94%",
    height: "94%",
    rx: rounded,
    ry: rounded,
    fill: color,
    filter: `url(#flyAwayDry)`,
    style: {
      opacity: flyaway ?? 'var(--brush-flyaway)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "relative z-10 w-full h-full"
  }, children));
}

// Capsule / pill shape with a soft, slightly-wavering hand-drawn outline.
// The body stays a clean pill; only the contour stroke gets gentle turbulence,
// echoing the reference's uneven-but-smooth outline.
function CapsuleShape({
  fill = '#9C9C9C',
  stroke = 'rgba(70,66,58,0.55)',
  className = '',
  style = {},
  children
}) {
  // Pill via a stroked rounded-rect inside a 100x140 viewBox (rx = half width)
  return /*#__PURE__*/React.createElement("div", {
    className: `relative ${className}`,
    style: style
  }, /*#__PURE__*/React.createElement("svg", {
    className: "absolute inset-0 w-full h-full",
    viewBox: "0 0 100 150",
    preserveAspectRatio: "none",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "5",
    width: "88",
    height: "140",
    rx: "44",
    ry: "44",
    fill: fill
  }), /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "5",
    width: "88",
    height: "140",
    rx: "44",
    ry: "44",
    fill: "none",
    stroke: stroke,
    strokeWidth: "1.1",
    vectorEffect: "non-scaling-stroke",
    filter: "url(#capWobble)"
  })), /*#__PURE__*/React.createElement("div", {
    className: "relative z-10 w-full h-full"
  }, children));
}

// Cloud-shaped frame — hand-drawn look: a few loosely-offset sketchy strokes
// (like the reference) tracing a puffy cloud, thin line in a soft warm grey.
function CloudFrame({
  stroke = '#C7C1A7',
  fill = 'rgba(253,251,246,0.96)',
  bumps = 8,
  amp = 0.07,
  seed = 1,
  className = '',
  style = {},
  children,
  contentClass = ''
}) {
  const VW = 340,
    VH = 320;
  const base = React.useMemo(() => {
    const cx = VW / 2,
      cy = VH / 2,
      rx = VW * 0.43,
      ry = VH * 0.42;
    const N = 200;
    const pts = [];
    for (let k = 0; k < N; k++) {
      const t = k / N * Math.PI * 2;
      // puffier top, flatter bottom: top half (sin<0) gets larger bumps
      const topBias = 1 + 0.45 * -Math.sin(t); // 1.45 at top, 0.55 at bottom
      const wob = 1 + amp * topBias * Math.sin(bumps * t + seed) + amp * 0.35 * Math.sin((bumps * 2 + 1) * t + seed * 1.7);
      // squash the bottom a touch so it reads like a cloud sitting on air
      const ryK = ry * (Math.sin(t) > 0 ? 0.9 : 1);
      pts.push([cx + Math.cos(t) * rx * wob, cy + Math.sin(t) * ryK * wob]);
    }
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)} `;
    for (let i = 0; i < N; i++) {
      const p0 = pts[(i - 1 + N) % N],
        p1 = pts[i],
        p2 = pts[(i + 1) % N],
        p3 = pts[(i + 2) % N];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6,
        c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6,
        c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += `C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} `;
    }
    return d + 'Z';
  }, [bumps, amp, seed]);

  // a few offset/rotated copies → loose hand-drawn line bundle
  const strokes = [{
    t: 'translate(0,0)',
    w: 1.5,
    o: 0.95
  }, {
    t: `translate(2.4,1.6) rotate(0.5 ${VW / 2} ${VH / 2})`,
    w: 1.1,
    o: 0.6
  }, {
    t: `translate(-2.2,1.2) rotate(-0.6 ${VW / 2} ${VH / 2})`,
    w: 1.0,
    o: 0.45
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: `relative ${className}`,
    style: style
  }, /*#__PURE__*/React.createElement("svg", {
    className: "absolute inset-0 w-full h-full",
    viewBox: `0 0 ${VW} ${VH}`,
    preserveAspectRatio: "none",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("path", {
    d: base,
    fill: fill,
    stroke: "none"
  }), strokes.map((s, i) => /*#__PURE__*/React.createElement("path", {
    key: i,
    d: base,
    fill: "none",
    stroke: stroke,
    strokeWidth: s.w,
    strokeOpacity: s.o,
    strokeLinecap: "round",
    vectorEffect: "non-scaling-stroke",
    transform: s.t
  }))), /*#__PURE__*/React.createElement("div", {
    className: `relative z-10 w-full h-full ${contentClass}`
  }, children));
}

// Washi tape strip with torn (hand-ripped) ends — left/right edges are
// jagged; top/bottom stay straight, like a piece torn off a roll.
function WashiTape({
  color = 'var(--persimmon)',
  rotate = -3,
  className = '',
  children
}) {
  // torn vertical edges as a polygon outline; semi-transparent so it reads as tape
  const jag = (x, dir) => {
    // build a vertical jagged edge at x (0..100%) — dir +1 points right
    const pts = [];
    const steps = 7;
    for (let i = 0; i <= steps; i++) {
      const y = i / steps * 100;
      const off = (i % 2 === 0 ? 0 : 2.4 * dir) + Math.sin(i * 1.7) * 1.1 * dir;
      pts.push([x + off, y]);
    }
    return pts;
  };
  const left = jag(3, 1);
  const right = jag(97, -1);
  const poly = [...left, ...right.reverse()].map(p => `${p[0]},${p[1]}`).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: `relative inline-block px-6 py-2 ${className}`,
    style: {
      transform: `rotate(${rotate}deg)`
    }
  }, /*#__PURE__*/React.createElement("svg", {
    className: "absolute inset-0 w-full h-full",
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("polygon", {
    points: poly,
    fill: color,
    opacity: "0.92"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: poly,
    fill: "none",
    stroke: "rgba(255,255,255,0.35)",
    strokeWidth: "0.6"
  })), /*#__PURE__*/React.createElement("span", {
    className: "relative z-10"
  }, children));
}

// Underline brush stroke
function BrushUnderline({
  color = 'var(--persimmon)',
  className = '',
  height = 14,
  offsetY = 4,
  behind = false,
  inset = 0
}) {
  return /*#__PURE__*/React.createElement("svg", {
    className: `absolute pointer-events-none ${className}`,
    style: {
      left: `${inset}%`,
      width: `${100 - 2 * inset}%`,
      bottom: -offsetY,
      height,
      zIndex: behind ? -1 : 'auto'
    },
    preserveAspectRatio: "none",
    viewBox: "0 0 200 14",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2 8 C 40 2 80 12 120 7 S 180 4 198 9",
    stroke: color,
    strokeWidth: "5",
    strokeLinecap: "round",
    fill: "none",
    filter: "url(#flyAwayDry)"
  }));
}

// Stamp seal — red square with text, like a Japanese hanko
function Hanko({
  text = '阿布',
  className = '',
  size = 64
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `relative inline-flex items-center justify-center select-none ${className}`,
    style: {
      width: size,
      height: size
    }
  }, /*#__PURE__*/React.createElement("svg", {
    className: "absolute inset-0",
    viewBox: "0 0 64 64"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "60",
    height: "60",
    fill: "#B83A2E",
    filter: "url(#brushEdge)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "60",
    height: "60",
    fill: "#B83A2E",
    filter: "url(#flyAwayDry)",
    opacity: ".7"
  })), /*#__PURE__*/React.createElement("span", {
    className: "relative z-10 font-bold tracking-widest",
    style: {
      fontFamily: 'var(--serif-zh)',
      color: '#F5E9D8',
      fontSize: size * 0.32,
      lineHeight: 1
    }
  }, text));
}

// Hand-drawn arrow ➤ (we'll use SVG so it looks intentional, not emoji)
function BulletArrow({
  color = 'var(--persimmon)',
  size = 28
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    className: "inline-block flex-shrink-0",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 8 L22 16 L6 24 Z",
    fill: color,
    filter: "url(#flyAwayDry)"
  }));
}

// Section number — big italic en numeral with a brush block behind
function SectionNum({
  n,
  color = 'var(--mauve)'
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "relative inline-block"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "absolute -inset-3",
    preserveAspectRatio: "none",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "50%",
    cy: "50%",
    r: "32",
    fill: color,
    filter: "url(#brushEdgeSoft)"
  })), /*#__PURE__*/React.createElement("span", {
    className: "relative en italic font-medium text-3xl",
    style: {
      color: 'var(--paper)'
    }
  }, String(n).padStart(2, '0')));
}
Object.assign(window, {
  BrushDefs,
  BrushBlock,
  CapsuleShape,
  CloudFrame,
  WashiTape,
  BrushUnderline,
  Hanko,
  BulletArrow,
  SectionNum
});
;
// Landscape decorative SVGs — mountains, trees, sun, city, clouds, etc.
// All use the brush filters from brush.jsx for organic watercolor edges.
// Each scene component returns a positioned SVG meant to be absolutely placed.

// A puffy cloud — single soft path so brush displacement doesn't shred it
function Cloud({
  x = 0,
  y = 0,
  scale = 1,
  opacity = .7
}) {
  return /*#__PURE__*/React.createElement("svg", {
    className: "absolute pointer-events-none",
    style: {
      left: x,
      top: y,
      width: 260 * scale,
      height: 90 * scale,
      opacity
    },
    viewBox: "0 0 260 90",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("g", {
    filter: "url(#brushEdgeSoft)"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M 30 60 Q 10 55 18 38 Q 22 18 50 22 Q 60 5 90 12 Q 110 0 130 14 Q 160 4 175 22 Q 210 16 220 38 Q 245 40 240 60 Q 245 78 215 80 L 50 80 Q 18 80 30 60 Z",
    fill: "#FBF6E8",
    stroke: "rgba(60,40,20,.08)",
    strokeWidth: "1"
  })));
}

// The big sun — solid persimmon disc with brushy edges
function Sun({
  x = 0,
  y = 0,
  size = 180,
  color = "var(--persimmon)"
}) {
  return /*#__PURE__*/React.createElement("svg", {
    className: "absolute",
    style: {
      left: x,
      top: y,
      width: size,
      height: size
    },
    viewBox: "0 0 100 100",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "50",
    cy: "50",
    r: "40",
    fill: color,
    filter: "url(#brushEdge)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "50",
    cy: "50",
    r: "40",
    fill: color,
    filter: "url(#flyAwayDry)",
    opacity: ".6"
  }));
}

// Layered mountain range — pass an array of {color, points} layers back-to-front
function Mountains({
  x = 0,
  y = 0,
  w = 1600,
  h = 420,
  layers = null
}) {
  const def = layers || [{
    color: 'var(--mauve)',
    points: '0,300 130,140 240,260 360,90 510,280 660,170 820,300 980,180 1140,290 1320,150 1500,280 1600,200 1600,420 0,420'
  }, {
    color: 'var(--sage-deep)',
    points: '0,320 90,210 220,310 340,200 480,330 620,240 770,340 920,260 1080,340 1240,230 1400,330 1600,260 1600,420 0,420'
  }, {
    color: 'var(--olive)',
    points: '0,360 120,300 260,360 400,310 550,370 700,310 860,370 1020,310 1180,370 1340,310 1500,360 1600,330 1600,420 0,420'
  }];
  return /*#__PURE__*/React.createElement("svg", {
    className: "absolute pointer-events-none",
    style: {
      left: x,
      top: y,
      width: w,
      height: h
    },
    viewBox: `0 0 1600 420`,
    preserveAspectRatio: "none",
    "aria-hidden": true
  }, layers !== null || true ? def.map((L, i) => /*#__PURE__*/React.createElement("g", {
    key: i
  }, /*#__PURE__*/React.createElement("polygon", {
    points: L.points,
    fill: L.color,
    filter: "url(#brushEdgeSoft)"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: L.points,
    fill: L.color,
    filter: "url(#flyAwayDry)",
    opacity: ".5"
  }))) : null);
}

// Sea — wavy bands
function Sea({
  x = 0,
  y = 0,
  w = 1600,
  h = 420
}) {
  const bands = [{
    color: 'var(--indigo)',
    yPath: 'M0 80 Q 200 40 400 90 T 800 95 T 1200 80 T 1600 90 V 420 H 0 Z'
  }, {
    color: '#6E89A1',
    yPath: 'M0 140 Q 200 100 400 150 T 800 160 T 1200 140 T 1600 155 V 420 H 0 Z'
  }, {
    color: '#90A8B8',
    yPath: 'M0 210 Q 200 180 400 220 T 800 230 T 1200 215 T 1600 225 V 420 H 0 Z'
  }];
  return /*#__PURE__*/React.createElement("svg", {
    className: "absolute pointer-events-none",
    style: {
      left: x,
      top: y,
      width: w,
      height: h
    },
    viewBox: "0 0 1600 420",
    preserveAspectRatio: "none",
    "aria-hidden": true
  }, bands.map((b, i) => /*#__PURE__*/React.createElement("g", {
    key: i
  }, /*#__PURE__*/React.createElement("path", {
    d: b.yPath,
    fill: b.color,
    filter: "url(#brushEdgeSoft)"
  }), /*#__PURE__*/React.createElement("path", {
    d: b.yPath,
    fill: b.color,
    filter: "url(#flyAwayDry)",
    opacity: ".4"
  }))), /*#__PURE__*/React.createElement("g", {
    opacity: ".6"
  }, Array.from({
    length: 18
  }).map((_, i) => /*#__PURE__*/React.createElement("ellipse", {
    key: i,
    cx: 80 + i * 90 + i % 3 * 10,
    cy: 75 + i % 2 * 8,
    rx: "14",
    ry: "3",
    fill: "#FBF6E8",
    filter: "url(#flyAwayDry)"
  }))));
}

// City skyline — chunky building silhouettes
function City({
  x = 0,
  y = 0,
  w = 1600,
  h = 420
}) {
  return /*#__PURE__*/React.createElement("svg", {
    className: "absolute pointer-events-none",
    style: {
      left: x,
      top: y,
      width: w,
      height: h
    },
    viewBox: "0 0 1600 420",
    preserveAspectRatio: "none",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("g", {
    filter: "url(#brushEdgeSoft)",
    opacity: ".75"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "220",
    width: "120",
    height: "200",
    fill: "var(--mauve)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "130",
    y: "200",
    width: "80",
    height: "220",
    fill: "var(--mauve)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "220",
    y: "240",
    width: "100",
    height: "180",
    fill: "var(--mauve)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "330",
    y: "190",
    width: "60",
    height: "230",
    fill: "var(--mauve)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "400",
    y: "230",
    width: "140",
    height: "190",
    fill: "var(--mauve)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "550",
    y: "210",
    width: "70",
    height: "210",
    fill: "var(--mauve)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "630",
    y: "240",
    width: "110",
    height: "180",
    fill: "var(--mauve)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "750",
    y: "200",
    width: "60",
    height: "220",
    fill: "var(--mauve)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "820",
    y: "230",
    width: "90",
    height: "190",
    fill: "var(--mauve)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "920",
    y: "210",
    width: "120",
    height: "210",
    fill: "var(--mauve)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1050",
    y: "240",
    width: "80",
    height: "180",
    fill: "var(--mauve)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1140",
    y: "200",
    width: "60",
    height: "220",
    fill: "var(--mauve)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1210",
    y: "220",
    width: "130",
    height: "200",
    fill: "var(--mauve)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1350",
    y: "240",
    width: "90",
    height: "180",
    fill: "var(--mauve)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1450",
    y: "200",
    width: "150",
    height: "220",
    fill: "var(--mauve)"
  })), /*#__PURE__*/React.createElement("g", {
    filter: "url(#brushEdge)"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "280",
    width: "160",
    height: "140",
    fill: "var(--mauve-deep)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "140",
    y: "260",
    width: "80",
    height: "160",
    fill: "var(--mauve-deep)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "230",
    y: "300",
    width: "120",
    height: "120",
    fill: "var(--mauve-deep)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "360",
    y: "270",
    width: "90",
    height: "150",
    fill: "var(--mauve-deep)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "460",
    y: "290",
    width: "180",
    height: "130",
    fill: "var(--mauve-deep)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "650",
    y: "260",
    width: "100",
    height: "160",
    fill: "var(--mauve-deep)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "760",
    y: "300",
    width: "80",
    height: "120",
    fill: "var(--mauve-deep)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "850",
    y: "280",
    width: "150",
    height: "140",
    fill: "var(--mauve-deep)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1010",
    y: "270",
    width: "90",
    height: "150",
    fill: "var(--mauve-deep)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1110",
    y: "300",
    width: "160",
    height: "120",
    fill: "var(--mauve-deep)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1280",
    y: "270",
    width: "100",
    height: "150",
    fill: "var(--mauve-deep)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1390",
    y: "290",
    width: "120",
    height: "130",
    fill: "var(--mauve-deep)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "1520",
    y: "270",
    width: "80",
    height: "150",
    fill: "var(--mauve-deep)"
  })), /*#__PURE__*/React.createElement("g", {
    fill: "var(--persimmon)",
    opacity: ".7"
  }, Array.from({
    length: 60
  }).map((_, i) => /*#__PURE__*/React.createElement("rect", {
    key: i,
    x: i * 37 % 1600,
    y: 310 + i * 23 % 80,
    width: "4",
    height: "6"
  }))));
}

// Tree (simple)
function Tree({
  x = 0,
  y = 0,
  size = 120,
  color = 'var(--olive)'
}) {
  return /*#__PURE__*/React.createElement("svg", {
    className: "absolute",
    style: {
      left: x,
      top: y,
      width: size,
      height: size * 1.4
    },
    viewBox: "0 0 100 140",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("rect", {
    x: "44",
    y: "80",
    width: "12",
    height: "50",
    fill: "#6B4A2C",
    filter: "url(#brushEdgeSoft)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "50",
    cy: "60",
    rx: "42",
    ry: "38",
    fill: color,
    filter: "url(#brushEdge)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "50",
    cy: "60",
    rx: "42",
    ry: "38",
    fill: color,
    filter: "url(#flyAwayDry)",
    opacity: ".55"
  }));
}

// Pine tree (triangular)
function Pine({
  x = 0,
  y = 0,
  size = 100,
  color = 'var(--sage-deep)'
}) {
  return /*#__PURE__*/React.createElement("svg", {
    className: "absolute",
    style: {
      left: x,
      top: y,
      width: size,
      height: size * 1.6
    },
    viewBox: "0 0 100 160",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("rect", {
    x: "44",
    y: "120",
    width: "12",
    height: "40",
    fill: "#6B4A2C",
    filter: "url(#brushEdgeSoft)"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "50,10 18,60 82,60",
    fill: color,
    filter: "url(#brushEdge)"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "50,40 12,90 88,90",
    fill: color,
    filter: "url(#brushEdge)"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "50,75 8,130 92,130",
    fill: color,
    filter: "url(#brushEdge)"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "50,10 18,60 82,60",
    fill: color,
    filter: "url(#flyAwayDry)",
    opacity: ".5"
  }));
}

// Floating lantern
function Lantern({
  x = 0,
  y = 0,
  size = 60
}) {
  return /*#__PURE__*/React.createElement("svg", {
    className: "absolute",
    style: {
      left: x,
      top: y,
      width: size,
      height: size * 1.7
    },
    viewBox: "0 0 60 100",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("line", {
    x1: "30",
    y1: "0",
    x2: "30",
    y2: "15",
    stroke: "var(--ink)",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "30",
    cy: "45",
    rx: "22",
    ry: "28",
    fill: "#B83A2E",
    filter: "url(#brushEdge)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "30",
    cy: "45",
    rx: "22",
    ry: "28",
    fill: "#B83A2E",
    filter: "url(#flyAwayDry)",
    opacity: ".6"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "10",
    y: "40",
    width: "40",
    height: "3",
    fill: "var(--ink)",
    opacity: ".4"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "10",
    y: "48",
    width: "40",
    height: "3",
    fill: "var(--ink)",
    opacity: ".4"
  }));
}

// Hot spring bath stones with steam
function HotSpring({
  x = 0,
  y = 0,
  scale = 1
}) {
  return /*#__PURE__*/React.createElement("svg", {
    className: "absolute",
    style: {
      left: x,
      top: y,
      width: 200 * scale,
      height: 200 * scale
    },
    viewBox: "0 0 200 200",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("g", {
    opacity: ".7",
    filter: "url(#brushEdgeSoft)"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M70 50 Q 60 30 80 20 Q 100 10 90 30 Q 80 50 100 60",
    stroke: "#FBF6E8",
    strokeWidth: "6",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M110 60 Q 100 40 120 30 Q 140 20 130 40 Q 120 60 140 70",
    stroke: "#FBF6E8",
    strokeWidth: "6",
    fill: "none"
  })), /*#__PURE__*/React.createElement("ellipse", {
    cx: "100",
    cy: "150",
    rx: "80",
    ry: "20",
    fill: "#7E6E55",
    filter: "url(#brushEdge)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "100",
    cy: "145",
    rx: "68",
    ry: "14",
    fill: "var(--indigo)",
    filter: "url(#brushEdgeSoft)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "100",
    cy: "145",
    rx: "68",
    ry: "14",
    fill: "var(--indigo)",
    filter: "url(#flyAwayDry)",
    opacity: ".4"
  }));
}

// Pagoda
function Pagoda({
  x = 0,
  y = 0,
  scale = 1
}) {
  return /*#__PURE__*/React.createElement("svg", {
    className: "absolute",
    style: {
      left: x,
      top: y,
      width: 120 * scale,
      height: 180 * scale
    },
    viewBox: "0 0 120 180",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("g", {
    filter: "url(#brushEdgeSoft)"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "60,5 95,30 25,30",
    fill: "#5A4A3A"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "35",
    y: "30",
    width: "50",
    height: "22",
    fill: "#A0633A"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "60,55 100,75 20,75",
    fill: "#5A4A3A"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "38",
    y: "75",
    width: "44",
    height: "22",
    fill: "#A0633A"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "60,100 105,120 15,120",
    fill: "#5A4A3A"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "40",
    y: "120",
    width: "40",
    height: "55",
    fill: "#A0633A"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "55",
    y: "135",
    width: "10",
    height: "40",
    fill: "#3A2A20"
  })));
}

// Castle silhouette (the one from the source image)
function CastleSilhouette({
  x = 0,
  y = 0,
  scale = 1
}) {
  return /*#__PURE__*/React.createElement("svg", {
    className: "absolute",
    style: {
      left: x,
      top: y,
      width: 160 * scale,
      height: 240 * scale
    },
    viewBox: "0 0 160 240",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("g", {
    filter: "url(#brushEdgeSoft)"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "40",
    y: "80",
    width: "80",
    height: "150",
    fill: "#9CA8A0"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "55",
    y: "40",
    width: "50",
    height: "50",
    fill: "#9CA8A0"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "40,80 80,30 120,80",
    fill: "#4D6275"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "55,40 80,10 105,40",
    fill: "#4D6275"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "70",
    y: "120",
    width: "20",
    height: "40",
    fill: "#3A2A20"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "55",
    y: "160",
    width: "14",
    height: "20",
    fill: "#3A2A20"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "91",
    y: "160",
    width: "14",
    height: "20",
    fill: "#3A2A20"
  })));
}

// Sheep (cute, watercolor-y)
function Sheep({
  x = 0,
  y = 0,
  scale = 1
}) {
  return /*#__PURE__*/React.createElement("svg", {
    className: "absolute",
    style: {
      left: x,
      top: y,
      width: 100 * scale,
      height: 80 * scale
    },
    viewBox: "0 0 100 80",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("g", {
    filter: "url(#brushEdgeSoft)"
  }, /*#__PURE__*/React.createElement("ellipse", {
    cx: "50",
    cy: "45",
    rx: "35",
    ry: "22",
    fill: "#FBF6E8"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "75",
    cy: "38",
    rx: "14",
    ry: "14",
    fill: "#5A4A3A"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "36",
    y: "60",
    width: "6",
    height: "14",
    fill: "#5A4A3A"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "58",
    y: "60",
    width: "6",
    height: "14",
    fill: "#5A4A3A"
  })));
}

// Bridge/dock
function Dock({
  x = 0,
  y = 0,
  scale = 1
}) {
  return /*#__PURE__*/React.createElement("svg", {
    className: "absolute",
    style: {
      left: x,
      top: y,
      width: 200 * scale,
      height: 80 * scale
    },
    viewBox: "0 0 200 80",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("g", {
    filter: "url(#brushEdgeSoft)"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "30",
    width: "200",
    height: "8",
    fill: "#7E6E55"
  }), [10, 40, 70, 100, 130, 160, 190].map((px, i) => /*#__PURE__*/React.createElement("rect", {
    key: i,
    x: px,
    y: "38",
    width: "6",
    height: "36",
    fill: "#7E6E55"
  }))));
}

// Road horizon line (the "ground" the car drives on)
function GroundLine({
  color = 'var(--ink)',
  dashed = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "absolute left-0 right-0",
    style: {
      bottom: '12%',
      height: 2,
      opacity: .45
    }
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-full h-full",
    preserveAspectRatio: "none",
    viewBox: "0 0 1000 2",
    "aria-hidden": true
  }, dashed ? /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "1",
    x2: "1000",
    y2: "1",
    stroke: color,
    strokeWidth: "2",
    strokeDasharray: "8 8",
    filter: "url(#flyAwayDry)"
  }) : /*#__PURE__*/React.createElement("path", {
    d: "M0 1 Q 250 0 500 1 T 1000 1",
    stroke: color,
    strokeWidth: "2",
    fill: "none",
    filter: "url(#flyAwayDry)"
  })));
}

// Composition switcher — given comp ('mountain'|'sea'|'city') and panel index, render appropriate scenery
function BackdropForPanel({
  comp = 'mountain',
  idx = 0,
  w,
  h
}) {
  // Each comp has 3 variations cycled through panels for visual rhythm
  if (comp === 'sea') {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Sun, {
      x: w * 0.7,
      y: 60,
      size: 160,
      color: "var(--persimmon)"
    }), /*#__PURE__*/React.createElement(Cloud, {
      x: w * 0.1,
      y: 50,
      scale: 1.2
    }), /*#__PURE__*/React.createElement(Cloud, {
      x: w * 0.55,
      y: 120,
      scale: 0.9,
      opacity: .7
    }), /*#__PURE__*/React.createElement(Sea, {
      x: 0,
      y: h * 0.55,
      w: w,
      h: h * 0.5
    }), idx % 2 === 0 && /*#__PURE__*/React.createElement(Dock, {
      x: w * 0.1,
      y: h * 0.62,
      scale: 1.4
    }));
  }
  if (comp === 'city') {
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Sun, {
      x: w * 0.75,
      y: 80,
      size: 130,
      color: "var(--persimmon)"
    }), /*#__PURE__*/React.createElement(Cloud, {
      x: w * 0.05,
      y: 70,
      scale: 1.1
    }), /*#__PURE__*/React.createElement(Cloud, {
      x: w * 0.6,
      y: 140,
      scale: 0.8,
      opacity: .7
    }), /*#__PURE__*/React.createElement(City, {
      x: 0,
      y: h * 0.45,
      w: w,
      h: h * 0.55
    }));
  }
  // mountain (default) — varies by idx for rhythm
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Sun, {
    x: w * 0.78,
    y: 70,
    size: 150,
    color: "var(--persimmon)"
  }), /*#__PURE__*/React.createElement(Cloud, {
    x: w * 0.08,
    y: 60,
    scale: 1.1
  }), /*#__PURE__*/React.createElement(Cloud, {
    x: w * 0.5,
    y: 130,
    scale: 0.85,
    opacity: .7
  }), /*#__PURE__*/React.createElement(Mountains, {
    x: 0,
    y: h * 0.42,
    w: w,
    h: h * 0.55
  }), idx % 2 === 0 && /*#__PURE__*/React.createElement(Pine, {
    x: w * 0.15,
    y: h * 0.55,
    size: 70
  }), idx % 3 === 0 && /*#__PURE__*/React.createElement(Tree, {
    x: w * 0.7,
    y: h * 0.6,
    size: 60
  }), idx % 4 === 0 && /*#__PURE__*/React.createElement(Sheep, {
    x: w * 0.45,
    y: h * 0.78,
    scale: 0.7
  }));
}
Object.assign(window, {
  Cloud,
  Sun,
  Mountains,
  Sea,
  City,
  Tree,
  Pine,
  Lantern,
  HotSpring,
  Pagoda,
  CastleSilhouette,
  Sheep,
  Dock,
  GroundLine,
  BackdropForPanel
});
;
// Section components — content panels for the horizontal-scroll site.
// Each section is a full-viewport (100vw × 100vh) panel.



// ─────────────────────────── Shared chrome ────────────────────────────
// Watermark-style corner labels and footers removed per request — kept as
// no-op components so existing call sites stay valid.
function PanelChrome() {
  return null;
}
function PanelFooter() {
  return null;
}

// ─────────────────────────── 01 Hero ──────────────────────────────────
// Hero illustration: the WHOLE artwork (scenery + car + driver) is one moving
// layer; the driver's hand waves on top. Drive-in handled by the parent.
function HeroIllustration() {
  return /*#__PURE__*/React.createElement("div", {
    className: "relative w-full h-full"
  }, /*#__PURE__*/React.createElement("img", {
    src: window.__asset('heroBase', 'asset/hero-base.webp'),
    alt: "\u963F\u5E03\u62C9\u99D5\u99DB Subaru Forester\uFF0C\u884C\u7D93\u4E2D\u53F0\u7063\u7684\u98A8\u8ECA\u6D77\u5CB8\u3001\u5927\u4F5B\u3001\u5EDF\u5B87\u8207\u5C71\u666F\uFF08\u4E3B\u8996\u89BA\uFF0C\u8ACB\u4F9D\u5BE6\u969B\u5716\u7247\u4FEE\u6539\u63CF\u8FF0\uFF09",
    className: "absolute inset-0 w-full h-full object-contain object-center select-none",
    draggable: false
  }), /*#__PURE__*/React.createElement("img", {
    src: window.__asset('heroHand', 'asset/hero-hand.webp'),
    alt: "\u963F\u5E03\u62C9\u63EE\u624B\u81F4\u610F\u7684\u624B\u90E8\u52D5\u756B\u5716\u5C64\uFF08\u88DD\u98FE\u7528\u758A\u5C64\uFF09",
    "aria-hidden": "true",
    className: "absolute inset-0 w-full h-full object-contain object-center select-none hero-wave",
    draggable: false
  }));
}
function HeroSection({
  idx,
  total,
  wide = 1
}) {
  const pinRef = useRef(null);
  const illoRef = useRef(null);
  const titleRef = useRef(null);
  const subRef = useRef(null);
  useEffect(() => {
    const gsap = window.gsap;
    if (!gsap) return;
    const ctx = gsap.context(() => {
      // (1) Whole illustration drives in from the upper-left, slightly smaller.
      gsap.from(illoRef.current, {
        autoAlpha: 0,
        duration: 1.0,
        ease: 'power2.out'
      });
      // (2) Title + subtitle rise up into place.
      gsap.from(titleRef.current, {
        y: 26,
        autoAlpha: 0,
        duration: 0.9,
        ease: 'power2.out',
        delay: 0.15
      });
      gsap.from(subRef.current, {
        y: 18,
        autoAlpha: 0,
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.45
      });
      // Map-pin placard slowly turns about its vertical centre axis.
      gsap.set(pinRef.current, {
        transformPerspective: 700,
        transformOrigin: '50% 50%'
      });
      gsap.to(pinRef.current, {
        rotationY: 360,
        duration: 6.5,
        ease: 'none',
        repeat: -1
      });
    });
    return () => ctx.revert();
  }, []);
  return /*#__PURE__*/React.createElement("header", {
    className: "relative w-screen h-screen flex-shrink-0 grain overflow-hidden",
    "data-screen-label": "01 Hero",
    "data-no-fit": "true"
  }, /*#__PURE__*/React.createElement(PanelChrome, {
    idx: idx,
    total: total,
    label: "introduction"
  }), wide >= 2 ?
  /*#__PURE__*/
  /* ───── Stacked hero — phone / tablet (2× panels): wide text on top,
           big drive-in illustration below, all within the first viewport. */
  React.createElement("div", {
    className: "absolute inset-y-0 left-0 overflow-hidden flex flex-col items-center justify-center px-[3vw]",
    style: {
      width: '100vw'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "pointer-events-auto flex flex-col items-center text-center",
    style: {
      width: 'min(100%, 780px)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    ref: pinRef,
    src: window.__asset('mapPin', 'asset/map-pin.webp'),
    alt: "\u5730\u5716\u5B9A\u4F4D\u5716\u91D8\u88DD\u98FE\u5716\u793A\uFF08\u88DD\u98FE\u7528\uFF09",
    "aria-hidden": "true",
    className: "select-none mb-3",
    style: {
      width: 'clamp(34px, 6.5vw, 54px)'
    },
    draggable: false
  }), /*#__PURE__*/React.createElement("h1", {
    ref: titleRef,
    className: "zh font-bold leading-[1.3] tracking-[-0.01em]",
    style: {
      fontSize: 'clamp(1.35rem, 6vw, 3.4rem)',
      color: 'var(--ink)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "block whitespace-nowrap"
  }, "\u628A\u5FC3\u529B\u7559\u7D66", /*#__PURE__*/React.createElement("span", {
    className: "relative inline-block whitespace-nowrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "relative",
    style: {
      zIndex: 1
    }
  }, "\u65C5\u904A\u6216\u5546\u52D9\u884C\u7A0B"), /*#__PURE__*/React.createElement(BrushUnderline, {
    color: "var(--persimmon)",
    height: 14,
    offsetY: -2,
    behind: true
  })), "\uFF0C"), /*#__PURE__*/React.createElement("span", {
    className: "block whitespace-nowrap"
  }, "\u958B\u8ECA\u53CA\u63A5\u99C1\uFF0C", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--mauve-deep)'
    }
  }, "\u4E0D\u8A72\u662F\u60A8\u7684\u7169\u60F1\u3002"))), /*#__PURE__*/React.createElement("p", {
    ref: subRef,
    className: "mt-5 leading-[1.6] mix",
    style: {
      color: 'var(--ink-soft)',
      fontSize: 'clamp(1rem, 2.4vw, 1.4rem)',
      maxWidth: '42ch'
    }
  }, "\u628A\u8DEF\u4E0A\u7684\u7463\u4E8B\u4EA4\u7D66\u4E2D\u53F0\u7063\u5728\u5730\u53F8\u6A5F\u963F\u5E03\u62C9\uFF0C\u9AD4\u9A57\u771F\u6B63", /*#__PURE__*/React.createElement("span", {
    className: "en italic align-middle px-0.5",
    style: {
      color: 'var(--persimmon)',
      fontSize: '1.4em'
    }
  }, "\""), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold",
    style: {
      color: 'var(--ink)'
    }
  }, "\u653E\u7A7A"), /*#__PURE__*/React.createElement("span", {
    className: "en italic align-middle px-0.5",
    style: {
      color: 'var(--persimmon)',
      fontSize: '1.4em'
    }
  }, "\""), "\u7684\u9AD8\u8CEA\u611F\u79FB\u52D5\u751F\u6D3B\u3002")), /*#__PURE__*/React.createElement("div", {
    ref: illoRef,
    className: "mt-[3.5vh]",
    style: {
      width: 'min(94vw, 820px)',
      aspectRatio: '1412 / 1086'
    }
  }, /*#__PURE__*/React.createElement(HeroIllustration, null))) :
  /*#__PURE__*/
  /* ───── Desktop two-column hero ───── */
  React.createElement("div", {
    className: "absolute inset-y-0 left-0 overflow-hidden",
    style: {
      width: '100vw'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-y-0 right-0 z-0 flex items-center justify-center overflow-hidden pointer-events-none",
    style: {
      width: '64%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: illoRef,
    style: {
      height: '120%',
      aspectRatio: '1412 / 1086',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement(HeroIllustration, null))), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex items-center px-[7vw] z-10 pointer-events-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-[48%] relative pointer-events-auto"
  }, /*#__PURE__*/React.createElement("img", {
    ref: pinRef,
    src: window.__asset('mapPin', 'asset/map-pin.webp'),
    alt: "\u5730\u5716\u5B9A\u4F4D\u5716\u91D8\u88DD\u98FE\u5716\u793A\uFF08\u88DD\u98FE\u7528\uFF09",
    "aria-hidden": "true",
    className: "absolute select-none",
    style: {
      width: 'clamp(40px, 4vw, 62px)',
      top: '-3.1em',
      left: '-0.15em'
    },
    draggable: false
  }), /*#__PURE__*/React.createElement("h1", {
    ref: titleRef,
    className: "zh font-bold leading-[1.18] tracking-[-0.01em]",
    style: {
      fontSize: 'clamp(1.8rem, 3.7vw, 4.2rem)',
      color: 'var(--ink)'
    }
  }, "\u628A\u5FC3\u529B\u7559\u7D66", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    className: "relative inline-block whitespace-nowrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "relative",
    style: {
      zIndex: 1
    }
  }, "\u65C5\u904A\u6216\u5546\u52D9\u884C\u7A0B"), /*#__PURE__*/React.createElement(BrushUnderline, {
    color: "var(--persimmon)",
    height: 14,
    offsetY: -2,
    behind: true
  })), "\uFF0C", /*#__PURE__*/React.createElement("br", null), "\u958B\u8ECA\u53CA\u63A5\u99C1\uFF0C", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--mauve-deep)'
    }
  }, "\u4E0D\u8A72\u662F\u60A8\u7684\u7169\u60F1\u3002")), /*#__PURE__*/React.createElement("p", {
    ref: subRef,
    className: "mt-6 max-w-[34ch] text-[0.95rem] md:text-[1.1rem] leading-[1.5] mix",
    style: {
      color: 'var(--ink-soft)'
    }
  }, "\u628A\u8DEF\u4E0A\u7684\u7463\u4E8B\u4EA4\u7D66\u4E2D\u53F0\u7063\u5728\u5730\u53F8\u6A5F\u963F\u5E03\u62C9\uFF0C", /*#__PURE__*/React.createElement("br", null), "\u9AD4\u9A57\u771F\u6B63", /*#__PURE__*/React.createElement("span", {
    className: "en italic text-[1.4em] align-middle px-0.5",
    style: {
      color: 'var(--persimmon)'
    }
  }, "\""), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold",
    style: {
      color: 'var(--ink)'
    }
  }, "\u653E\u7A7A"), /*#__PURE__*/React.createElement("span", {
    className: "en italic text-[1.4em] align-middle px-0.5",
    style: {
      color: 'var(--persimmon)'
    }
  }, "\""), "\u7684\u9AD8\u8CEA\u611F\u79FB\u52D5\u751F\u6D3B\u3002")))), /*#__PURE__*/React.createElement(PanelFooter, null, "scroll \u2192"));
}

// ─────────────────────────── 02 Pain points ───────────────────────────
const PAIN_ITEMS = [{
  title: ['消失的', '好心情'],
  body: '找車位讓人好焦慮，好心情也消耗殆盡。'
}, {
  title: ['耗盡的', '體力'],
  body: '牽就大眾運輸的時間好累人，無法自在從容。'
}, {
  title: ['時間運用', '無彈性'],
  body: '想回信或小憩，卻得專心開車。'
}, {
  title: ['隨機叫車', '的擔憂'],
  body: '車內侷促，或司機磁場讓你不安。'
}];

// staggered vertical offsets + float timing, echoing the reference layout
const PAIN_LAYOUT = [{
  dy: 18,
  dur: 4.6,
  delay: 0.0
}, {
  dy: 64,
  dur: 5.2,
  delay: 0.7
}, {
  dy: -18,
  dur: 4.2,
  delay: 0.3
}, {
  dy: 34,
  dur: 5.6,
  delay: 1.1
}];
function PainSection({
  idx,
  total,
  progress = 0,
  forceShow = false
}) {
  const CAP = '#9C9C9C'; // neutral grey — conveys the "trouble" mood
  const capRefs = useRef([]);
  const center = idx / (total - 1);
  const shown = forceShow || Math.abs(progress - center) < 0.07;
  useEffect(() => {
    const gsap = window.gsap;
    const els = capRefs.current.filter(Boolean);
    if (!gsap || !els.length) return;
    if (shown) {
      gsap.to(els, {
        autoAlpha: 1,
        y: 0,
        duration: 0.95,
        ease: 'power2.out',
        stagger: 0.16,
        overwrite: true
      });
    } else {
      gsap.set(els, {
        autoAlpha: 0,
        y: 30
      });
    }
  }, [shown]);
  return /*#__PURE__*/React.createElement("section", {
    className: "relative w-screen h-screen flex-shrink-0 grain overflow-hidden",
    "data-screen-label": "02 Pain points"
  }, /*#__PURE__*/React.createElement(PanelChrome, {
    idx: idx,
    total: total,
    label: "the problem"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 px-[7vw] pt-[14vh] pb-[14vh] flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 pl-[3vw]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 mb-3"
  }, /*#__PURE__*/React.createElement(BulletArrow, {
    color: "var(--persimmon)",
    size: 22
  }), /*#__PURE__*/React.createElement("span", {
    className: "en italic text-lg leading-none whitespace-nowrap",
    style: {
      color: 'var(--persimmon)'
    }
  }, "have you ever\u2026")), /*#__PURE__*/React.createElement("h2", {
    className: "zh font-bold leading-[1.25]",
    style: {
      fontSize: 'clamp(1.5rem, 2.8vw, 2.8rem)',
      color: 'var(--ink)'
    }
  }, "\u4F60\u662F\u5426\u4E5F\u66FE\u9047\u904E\u9019\u4E9B\u8B93", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--persimmon)'
    }
  }, "\u5047\u671F"), "\u53CA", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--mauve-deep)'
    }
  }, "\u5546\u52D9\u884C\u7A0B"), "\u6263\u5206\u7684\u77AC\u9593\uFF1F")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full flex items-center justify-center gap-[3vw]"
  }, PAIN_ITEMS.map((it, i) => {
    const L = PAIN_LAYOUT[i];
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        transform: `translateY(${L.dy}px)`
      }
    }, /*#__PURE__*/React.createElement("div", {
      ref: el => capRefs.current[i] = el,
      style: {
        opacity: 0,
        visibility: 'hidden'
      }
    }, /*#__PURE__*/React.createElement(CapsuleShape, {
      fill: CAP,
      stroke: "none",
      style: {
        width: 'clamp(168px, 16.5vw, 238px)',
        height: 'clamp(244px, 38vh, 388px)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-full h-full flex flex-col items-center justify-center text-center px-6"
    }, /*#__PURE__*/React.createElement("span", {
      className: "en italic font-medium leading-none mb-3",
      style: {
        fontSize: '2.4rem',
        color: 'rgba(255,255,255,0.55)'
      }
    }, "0", i + 1), /*#__PURE__*/React.createElement("h3", {
      className: "zh font-bold leading-[1.2]",
      style: {
        fontSize: 'clamp(1.2rem, 1.5vw, 1.62rem)',
        color: '#F4F2EE'
      }
    }, it.title[0], /*#__PURE__*/React.createElement("br", null), it.title[1]), /*#__PURE__*/React.createElement("span", {
      className: "block my-3",
      style: {
        width: 30,
        height: 2,
        background: 'rgba(255,255,255,0.5)'
      }
    }), /*#__PURE__*/React.createElement("p", {
      className: "zh leading-[1.6] text-[0.88rem]",
      style: {
        color: '#EFEDE8'
      }
    }, it.body)))));
  })))), /*#__PURE__*/React.createElement(PanelFooter, null, "02 \xB7 pain"));
}

// ─────────────────────────── 03 Why us ────────────────────────────────
const WHY_ITEMS = [{
  title: '安全舒適守護',
  en: 'safety & comfort',
  body: 'Subaru Forester 大空間，過彎平穩、高安全評價，給你最堅實的防護。',
  pull: '高安全評價 · 全車防護'
}, {
  title: '貼心設備支援',
  en: 'thoughtful hardware',
  body: '充電線、飲料座、吊掛區一應俱全，並免費代備兒童安全座椅。',
  pull: '高速充電 · 童座代備'
}, {
  title: '職人服務',
  en: 'a craftsman’s manner',
  body: '中台灣在地人，守時、不打擾的靜謐服務，也樂於分享私房景點。',
  pull: '守時 · 靜謐 · 在地'
}];

// supporting photos for the 貼心硬體支援 (hardware) column
const HARDWARE_PHOTOS = [{
  id: 'featCharge',
  src: 'asset/feat-charge.webp',
  label: '充電線',
  alt: '車內提供的手機充電線（請依實際設備修改）'
}, {
  id: 'featCup',
  src: 'asset/feat-cup.webp',
  label: '杯架',
  alt: '車內座位旁的飲料杯架（請依實際設備修改）'
}, {
  id: 'featHook',
  src: 'asset/feat-hook.webp',
  label: '吊掛區',
  alt: '車內物品吊掛區（請依實際設備修改）'
}, {
  id: 'featChildseat',
  src: 'asset/feat-childseat.webp',
  label: '兒童座椅',
  alt: '免費代備的兒童安全座椅（請依實際設備修改）',
  contain: true
}];

// a persimmon-ringed circular photo that enlarges on hover
function RingPhoto({
  src,
  label,
  alt,
  size,
  contain = false,
  rotate = 0
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-full overflow-hidden shrink-0 zoom-photo",
    style: {
      width: size,
      height: size,
      border: '4px solid var(--persimmon)',
      background: contain ? '#F2EEE4' : 'transparent',
      boxShadow: '0 2px 8px rgba(60,50,35,0.16)',
      transform: `rotate(${rotate}deg)`
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: alt || label,
    className: "w-full h-full",
    style: {
      objectFit: contain ? 'contain' : 'cover',
      padding: contain ? '8%' : 0
    },
    draggable: false
  })), /*#__PURE__*/React.createElement("span", {
    className: "zh text-[0.72rem] tracking-[0.08em] whitespace-nowrap",
    style: {
      color: 'var(--ink-soft)'
    }
  }, label));
}

// A cloud frame drawn from the provided hand-sketched cloud line art.
// Text inside reveals (gently rises + fades in) when `shown` becomes true.
function WhyCloud({
  w,
  size,
  z = 10,
  marginLeft = 0,
  dy = 0,
  shown = true,
  delay = 0
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "relative",
    style: {
      transform: `translateY(${dy}px)`,
      marginLeft,
      zIndex: z
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative",
    style: size
  }, /*#__PURE__*/React.createElement("img", {
    src: window.__asset('cloudFrame', 'asset/cloud-frame.webp'),
    alt: "\u624B\u7E6A\u96F2\u6735\u5916\u6846\u88DD\u98FE\uFF08\u88DD\u98FE\u7528\uFF09",
    "aria-hidden": "true",
    draggable: false,
    className: "absolute inset-0 w-full h-full select-none",
    style: {
      objectFit: 'contain'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex flex-col items-center justify-center text-center px-[15%]",
    style: {
      transform: 'translateY(2.5%)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      opacity: shown ? 1 : 0,
      transform: shown ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity .9s ease, transform .9s cubic-bezier(.2,.7,.2,1)',
      transitionDelay: shown ? `${delay}s` : '0s'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    className: "zh font-bold",
    style: {
      fontSize: 'clamp(1.08rem, 1.5vw, 1.6rem)',
      color: 'var(--ink)'
    }
  }, w.title), /*#__PURE__*/React.createElement("span", {
    className: "block mx-auto my-2",
    style: {
      width: 38,
      height: 1,
      background: 'var(--sage-deep)',
      opacity: 0.55
    }
  }), /*#__PURE__*/React.createElement("p", {
    className: "zh leading-[1.5] text-[0.8rem]",
    style: {
      color: 'var(--ink-soft)'
    }
  }, w.body)))));
}
function WhySection({
  idx,
  total,
  progress = 0,
  forceShow = false
}) {
  // organic scatter values for the 4 hardware photos
  const PH = [{
    size: 'clamp(60px, 6vw, 92px)',
    dy: 6,
    rot: -7
  }, {
    size: 'clamp(72px, 7.2vw, 108px)',
    dy: -14,
    rot: 5
  }, {
    size: 'clamp(58px, 5.6vw, 86px)',
    dy: 18,
    rot: 8
  }, {
    size: 'clamp(70px, 6.8vw, 102px)',
    dy: -4,
    rot: -5
  }];
  // Reveal text when this panel is centred in view (panel 03 ≈ idx/(total-1)).
  const center = idx / (total - 1);
  const shown = forceShow || Math.abs(progress - center) < 0.07;
  return /*#__PURE__*/React.createElement("section", {
    className: "relative w-screen h-screen flex-shrink-0 grain overflow-hidden",
    "data-screen-label": "03 Why"
  }, /*#__PURE__*/React.createElement(PanelChrome, {
    idx: idx,
    total: total,
    label: "why abura"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 px-[7vw] pt-[13vh] pb-[16vh] flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 pl-[3vw]",
    style: {
      opacity: shown ? 1 : 0,
      transform: shown ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity .9s ease, transform .9s cubic-bezier(.2,.7,.2,1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 mb-3"
  }, /*#__PURE__*/React.createElement(BulletArrow, {
    color: "var(--persimmon)",
    size: 22
  }), /*#__PURE__*/React.createElement("span", {
    className: "en italic text-lg leading-none whitespace-nowrap",
    style: {
      color: 'var(--persimmon)'
    }
  }, "the difference is in the detail.")), /*#__PURE__*/React.createElement("h2", {
    className: "zh font-bold leading-[1.25]",
    style: {
      fontSize: 'clamp(1.5rem, 2.8vw, 2.8rem)',
      color: 'var(--ink)'
    }
  }, "\u70BA\u4EC0\u9EBC\u9078\u64C7\u963F\u5E03\u62C9\uFF1F\u56E0\u70BA\u6211\u5011\u5728\u4E4E\u90A3\u4E9B", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--persimmon)'
    }
  }, "\u5225\u4EBA\u5FFD\u7565"), "\u7684\u7D30\u7BC0\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex flex-col justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center items-center"
  }, /*#__PURE__*/React.createElement(WhyCloud, {
    w: WHY_ITEMS[0],
    shown: shown,
    delay: 0.15,
    size: {
      width: 'clamp(244px, 25vw, 338px)',
      height: 'clamp(196px, 20.5vw, 276px)'
    },
    z: 10,
    dy: 40
  }), /*#__PURE__*/React.createElement(WhyCloud, {
    w: WHY_ITEMS[1],
    shown: shown,
    delay: 0.3,
    size: {
      width: 'clamp(280px, 28.5vw, 388px)',
      height: 'clamp(224px, 23.5vw, 318px)'
    },
    z: 20,
    dy: -22,
    marginLeft: '-4.5vw'
  }), /*#__PURE__*/React.createElement(WhyCloud, {
    w: WHY_ITEMS[2],
    shown: shown,
    delay: 0.45,
    size: {
      width: 'clamp(244px, 25vw, 338px)',
      height: 'clamp(196px, 20.5vw, 276px)'
    },
    z: 10,
    dy: 10,
    marginLeft: '-4.5vw'
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center items-center gap-[2.4vw] mt-[1.5vh] relative",
    style: {
      zIndex: 30
    }
  }, HARDWARE_PHOTOS.map((p, k) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      transform: `translateY(${PH[k].dy}px)`
    }
  }, /*#__PURE__*/React.createElement(RingPhoto, {
    src: window.__asset(p.id, p.src),
    label: p.label,
    alt: p.alt,
    contain: p.contain,
    size: PH[k].size,
    rotate: PH[k].rot
  })))))), /*#__PURE__*/React.createElement(PanelFooter, null, "03 \xB7 why"));
}

// ─────────────────────────── 04 Testimonials ──────────────────────────
const QUOTES = [{
  body: '以前全家出門總是要自己盯著導航、找車位，回到家累癱了。自從預約阿布拉的接送，我終於能陪孩子在後座玩耍，這才是真正的度假！',
  tag: 'family',
  color: 'var(--sage)'
}, {
  body: '他開車非常穩，車內空間夠舒服。最棒的是行經山路，也沒有以前過彎時坐後座被甩來甩去的不適，這錢花得非常值得。',
  tag: 'business',
  color: 'var(--mauve)'
}];
function TestimonialsSection({
  idx,
  total,
  progress = 0,
  forceShow = false
}) {
  // Reveal when the panel is centred in view (panel 04 ≈ 3/7 ≈ 0.428).
  const center = idx / (total - 1);
  const shown = forceShow || Math.abs(progress - center) < 0.06;
  return /*#__PURE__*/React.createElement("section", {
    className: "relative w-screen h-screen flex-shrink-0 grain overflow-hidden",
    "data-screen-label": "04 Voices"
  }, /*#__PURE__*/React.createElement(PanelChrome, {
    idx: idx,
    total: total,
    label: "voices"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 px-[8vw] pt-[13vh] pb-[18vh] flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 pl-[2vw]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 mb-3"
  }, /*#__PURE__*/React.createElement(BulletArrow, {
    color: "var(--persimmon)",
    size: 22
  }), /*#__PURE__*/React.createElement("span", {
    className: "en italic text-lg leading-none whitespace-nowrap",
    style: {
      color: 'var(--ink-soft)'
    }
  }, "in their own words.")), /*#__PURE__*/React.createElement("h2", {
    className: "zh font-bold leading-[1.25]",
    style: {
      fontSize: 'clamp(1.5rem, 2.8vw, 2.8rem)',
      color: 'var(--ink)'
    }
  }, "\u4E58\u5BA2\u7684", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--persimmon)'
    }
  }, "\u771F\u5FC3\u8A71"))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex items-start pt-[3vh]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full grid grid-cols-2 gap-14"
  }, QUOTES.map((q, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "relative",
    style: {
      transform: `rotate(${i % 2 === 0 ? -0.5 : 0.6}deg) translateY(${shown ? 0 : 34}px)`,
      opacity: shown ? 1 : 0,
      transition: 'opacity .8s ease, transform .8s cubic-bezier(.2,.7,.2,1)',
      transitionDelay: shown ? `${i * 0.18}s` : '0s'
    }
  }, /*#__PURE__*/React.createElement(BrushBlock, {
    color: "var(--paper-deep)",
    rounded: 36,
    edge: "soft",
    flyaway: 0.35,
    flat: true
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-10 pt-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "en italic font-medium leading-none",
    style: {
      fontSize: '4rem',
      color: q.color,
      marginBottom: '-1.2rem'
    }
  }, "\u201C"), /*#__PURE__*/React.createElement("p", {
    className: "zh leading-[1.7] mix text-[1.12rem]",
    style: {
      color: 'var(--ink)'
    }
  }, q.body))), /*#__PURE__*/React.createElement("div", {
    className: "absolute -left-3 rotate-[-6deg]",
    style: {
      top: '-0.6rem'
    }
  }, /*#__PURE__*/React.createElement(WashiTape, {
    color: q.color,
    rotate: -6
  }, /*#__PURE__*/React.createElement("span", {
    className: "en italic text-sm font-medium",
    style: {
      color: '#F7EFDA'
    }
  }, q.tag)))))))), /*#__PURE__*/React.createElement(PanelFooter, null, "04 \xB7 voices"));
}

// ─────────────────────────── 05 About ─────────────────────────────────
// Number that counts up from 0 → `to` the first time `shown` is true,
// then holds the final value (never resets back to 0).
function CountUp({
  to,
  duration = 1600,
  shown,
  className = '',
  style = {}
}) {
  const [val, setVal] = useState(0);
  const played = useRef(false);
  useEffect(() => {
    if (!shown || played.current) return;
    played.current = true;
    let raf, start;
    const tick = ts => {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setVal(Math.round(eased * to));
      if (t < 1) raf = requestAnimationFrame(tick);else setVal(to);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shown, to, duration]);
  return /*#__PURE__*/React.createElement("span", {
    className: className,
    style: style
  }, val);
}
function AboutSection({
  idx,
  total,
  progress = 0,
  forceShow = false
}) {
  const center = idx / (total - 1);
  const shown = forceShow || Math.abs(progress - center) < 0.07;
  const IG_URL = 'https://www.instagram.com/kenji.senzaki/';
  return /*#__PURE__*/React.createElement("section", {
    className: "relative w-screen h-screen flex-shrink-0 grain overflow-hidden",
    "data-screen-label": "05 About"
  }, /*#__PURE__*/React.createElement(PanelChrome, {
    idx: idx,
    total: total,
    label: "meet abura"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 px-[8vw] pt-[11vh] pb-[23vh] flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 pl-[1vw]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 mb-3"
  }, /*#__PURE__*/React.createElement(BulletArrow, {
    color: "var(--persimmon)",
    size: 22
  }), /*#__PURE__*/React.createElement("span", {
    className: "en italic text-lg leading-none whitespace-nowrap",
    style: {
      color: 'var(--persimmon)'
    }
  }, "nice to meet you.")), /*#__PURE__*/React.createElement("h2", {
    className: "zh font-bold leading-[1.25]",
    style: {
      fontSize: 'clamp(1.5rem, 2.8vw, 2.8rem)',
      color: 'var(--ink)'
    }
  }, "\u4E2D\u53F0\u7063\u5728\u5730\u53F8\u6A5F", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--persimmon)'
    }
  }, "\u963F\u5E03\u62C9"), "\u4ECB\u7D39")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 grid grid-cols-12 gap-12 items-center mt-[1vh]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-4 relative flex justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative",
    style: {
      width: 'min(100%, 268px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": true,
    className: "absolute",
    style: {
      inset: '-3% -6% -7% -15%',
      backgroundImage: 'radial-gradient(var(--sage-deep) 1.25px, transparent 1.5px)',
      backgroundSize: '7px 7px',
      borderRadius: '9999px',
      transform: 'rotate(-4deg)',
      opacity: 0.8,
      zIndex: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative overflow-hidden",
    style: {
      borderRadius: '9999px',
      aspectRatio: '1 / 1.35',
      boxShadow: '0 3px 10px rgba(60,50,35,0.18)',
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: window.__asset('aburaPortrait', 'asset/abura-portrait.webp'),
    alt: "\u4E2D\u53F0\u7063\u5728\u5730\u5305\u8ECA\u53F8\u6A5F\u963F\u5E03\u62C9\u7684\u500B\u4EBA\u7167\uFF08\u8ACB\u4F9D\u5BE6\u969B\u7167\u7247\u4FEE\u6539\u63CF\u8FF0\uFF09",
    draggable: false,
    className: "w-full h-full object-cover select-none",
    style: {
      objectPosition: '46% 20%'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    className: "col-span-5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block mb-5",
    style: {
      width: 46,
      height: 2,
      background: 'var(--persimmon)'
    }
  }), /*#__PURE__*/React.createElement("p", {
    className: "zh leading-[1.7] text-[1.06rem]",
    style: {
      color: 'var(--ink)',
      textAlign: 'justify'
    }
  }, "\u6211\u662F\u963F\u5E03\u62C9\uFF0C\u64C1\u6709 ", /*#__PURE__*/React.createElement("span", {
    className: "en italic font-semibold",
    style: {
      color: 'var(--persimmon)'
    }
  }, "3"), " \u5E74\u5305\u8ECA\u63A5\u9001\u7D93\u9A57\u3002\u6211\u5C0D\u300C\u63A5\u9001\u300D\u7684\u7406\u89E3\u4E0D\u53EA\u662F\u628A\u4EBA\u9001\u5230\u4F4D\uFF0C\u800C\u662F\u5275\u9020\u4E00\u500B", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--persimmon)'
    }
  }, "\u300C\u4EE5\u5BA2\u4EBA\u70BA\u5148\uFF0C\u8212\u9069\u5B89\u5168\u7684\u884C\u7A0B\u300D"), "\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "zh leading-[1.7] text-[1.06rem] mt-4",
    style: {
      color: 'var(--ink-soft)',
      textAlign: 'justify'
    }
  }, "\u6211\u61C2\u5F97\u5B89\u975C\u5730\u89C0\u5BDF\u5BA2\u6236\u7684\u9700\u6C42\uFF0C\u5728\u60A8\u9700\u8981\u4F11\u606F\u6642\u4FDD\u6301\u7D55\u5C0D\u5B89\u975C\uFF0C\u5728\u60A8\u9700\u8981\u5354\u52A9\u6642\u63D0\u4F9B\u6700\u5C08\u696D\u7684\u670D\u52D9\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "col-span-3 flex flex-col items-center justify-center gap-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline justify-center gap-2"
  }, /*#__PURE__*/React.createElement(CountUp, {
    to: 3,
    shown: shown,
    className: "en italic font-medium",
    style: {
      fontSize: 'clamp(3.8rem, 6vw, 7rem)',
      color: 'var(--persimmon)',
      lineHeight: 0.9
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "zh font-semibold",
    style: {
      fontSize: 'clamp(1.4rem,1.8vw,2rem)',
      color: 'var(--ink)'
    }
  }, "\u5E74")), /*#__PURE__*/React.createElement("div", {
    className: "zh text-sm tracking-[0.28em] mt-1",
    style: {
      color: 'var(--ink-soft)'
    }
  }, "\u670D\u52D9\u5E74\u8CC7")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: '72%',
      height: 1,
      background: 'var(--ink)',
      opacity: 0.2
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline justify-center gap-1"
  }, /*#__PURE__*/React.createElement(CountUp, {
    to: 500,
    shown: shown,
    className: "en italic font-medium",
    style: {
      fontSize: 'clamp(3.8rem, 6vw, 7rem)',
      color: 'var(--persimmon)',
      lineHeight: 0.9
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "en italic font-medium",
    style: {
      fontSize: 'clamp(1.8rem,2.4vw,2.8rem)',
      color: 'var(--persimmon)'
    }
  }, "+"), /*#__PURE__*/React.createElement("span", {
    className: "zh font-semibold",
    style: {
      fontSize: 'clamp(1.4rem,1.8vw,2rem)',
      color: 'var(--ink)'
    }
  }, "\u7D44")), /*#__PURE__*/React.createElement("div", {
    className: "zh text-sm tracking-[0.28em] mt-1",
    style: {
      color: 'var(--ink-soft)'
    }
  }, "\u63A5\u9001\u5BA2\u4EBA"))))), /*#__PURE__*/React.createElement("a", {
    href: IG_URL,
    target: "_blank",
    rel: "noreferrer",
    className: "absolute group",
    style: {
      right: '7vw',
      bottom: '11vh',
      zIndex: 30,
      transform: 'rotate(-5deg)'
    },
    "aria-label": "\u67E5\u770B\u963F\u5E03\u62C9\u7684 Instagram \u8077\u4EBA\u65E5\u5E38"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 pl-5 pr-4 py-3 rounded-2xl transition-transform duration-300 group-hover:scale-[1.04]",
    style: {
      background: 'var(--paper-deep)',
      boxShadow: '0 2px 8px rgba(60,50,35,0.16)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-right zh leading-tight"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[0.8rem] tracking-[0.12em]",
    style: {
      color: 'var(--ink-soft)'
    }
  }, "\u78BA\u8A8D\u6211\u5011\u662F\u5426\u5408\u62CD"), /*#__PURE__*/React.createElement("div", {
    className: "font-semibold text-[1.04rem]",
    style: {
      color: 'var(--ink)'
    }
  }, "\u67E5\u770B\u6211\u7684\u8077\u4EBA\u65E5\u5E38 ", /*#__PURE__*/React.createElement("span", {
    className: "en italic"
  }, "IG"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center shrink-0",
    style: {
      width: 52,
      height: 52,
      borderRadius: 15,
      background: 'radial-gradient(circle at 30% 107%, #FDD25C 0%, #FA7E1E 28%, #D62976 60%, #962FBF 80%, #4F5BD5 100%)',
      boxShadow: '0 2px 8px rgba(60,50,35,0.18)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "30",
    height: "30",
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    style: {
      color: '#FFFFFF'
    }
  }, /*#__PURE__*/React.createElement("path", {
    fill: "currentColor",
    d: "M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.25a1.25 1.25 0 0 0-2.5 0 1.25 1.25 0 0 0 2.5 0zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"
  }))))), /*#__PURE__*/React.createElement(PanelFooter, null, "05 \xB7 meet abura"));
}

// ─────────────────────────── 06 For Who ───────────────────────────────
const AUDIENCES = [{
  tag: 'family',
  title: '家庭出遊行程',
  body: '不想讓長輩擠車、帶孩子出遊行李多也不怕，讓專業司機到府接送。',
  en: 'for your family',
  color: 'var(--sage)'
}, {
  tag: 'friends',
  title: '三五朋友共遊',
  body: '想要隨走隨停，那些大眾運輸到不了的「絕美秘境」，阿布拉帶你去。',
  en: 'for your group',
  color: 'var(--mauve)'
}, {
  tag: 'business',
  title: '商務接待需求',
  body: '協助接送會議或活動行程貴賓、配合商務或參訪行程便捷交通接送。',
  en: 'for your business',
  color: 'var(--indigo)'
}];
function ForWhoSection({
  idx,
  total,
  progress = 0,
  forceShow = false
}) {
  const center = idx / (total - 1);
  const shown = forceShow || Math.abs(progress - center) < 0.07;
  return /*#__PURE__*/React.createElement("section", {
    className: "relative w-screen h-screen flex-shrink-0 grain overflow-hidden",
    "data-screen-label": "06 For who"
  }, /*#__PURE__*/React.createElement(PanelChrome, {
    idx: idx,
    total: total,
    label: "for whom"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 px-[7vw] pt-[13vh] pb-[16vh] flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline gap-5"
  }, /*#__PURE__*/React.createElement(BulletArrow, {
    color: "var(--persimmon)"
  }), /*#__PURE__*/React.createElement("span", {
    className: "en italic text-xl",
    style: {
      color: 'var(--persimmon)'
    }
  }, "book your easy afternoon.")), /*#__PURE__*/React.createElement("h2", {
    className: "zh font-bold leading-[1.2] mt-3",
    style: {
      fontSize: 'clamp(1.8rem, 3.2vw, 3.2rem)',
      color: 'var(--ink)'
    }
  }, "\u6709\u4EE5\u4E0B\u9700\u6C42\uFF0C", /*#__PURE__*/React.createElement("br", null), "\u4F86\u9810\u7D04\u60A8\u7684", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--persimmon)'
    }
  }, "\u5F9E\u5BB9\u6642\u5149"), "\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 flex-1 flex items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full grid grid-cols-3 gap-9",
    style: {
      height: 'min(56vh, 440px)'
    }
  }, AUDIENCES.map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "relative",
    style: {
      opacity: shown ? 1 : 0,
      transform: `translateY(${shown ? 0 : 18}px)`,
      transition: 'opacity .8s ease, transform .8s cubic-bezier(.2,.7,.2,1)',
      transitionDelay: shown ? `${i * 0.15}s` : '0s'
    }
  }, /*#__PURE__*/React.createElement(BrushBlock, {
    color: "#9D7C8C",
    rounded: 44,
    className: "h-full",
    flat: true,
    edge: i === 1 ? 'normal' : 'soft',
    flyaway: 0.4 + i % 2 * 0.15,
    style: {
      transform: `rotate(${[-0.5, 0.4, -0.3][i]}deg)`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full p-7 pt-8 flex flex-col",
    style: {
      color: '#F7EFDA'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    className: "zh font-bold leading-[1.2]",
    style: {
      fontSize: 'clamp(1.12rem, 1.7vw, 1.9rem)'
    }
  }, "\u3010", a.title, "\u3011"), /*#__PURE__*/React.createElement("div", {
    className: "w-14 h-[2px] bg-current opacity-50 my-4"
  }), /*#__PURE__*/React.createElement("p", {
    className: "zh leading-[1.6] text-[1rem] opacity-95 flex-1",
    style: {
      textAlign: 'justify'
    }
  }, a.body)))))))), /*#__PURE__*/React.createElement(PanelFooter, null, "06 \xB7 for whom"));
}

// ─────────────────────────── 07 FAQ ───────────────────────────────────
const FAQ = [{
  q: '收費是否包含油錢、過路費？',
  a: '報價已包含所有油資與過路費，透明且固定，讓您預算好掌控。'
}, {
  q: '請問可以幫我們排行程嗎？',
  a: '我們專注於高品質接送。建議由您決定喜愛的去處，由我來執行最順暢的動線。若遇到突發路況，我也會即時提供在地人的修改建議。'
}, {
  q: '車上有充電設備嗎？',
  a: '有的！我們提供各類型手機充電線，讓您在旅途中拍照、辦公永不斷電。'
}, {
  q: '我們有帶小孩，需要安全座椅怎麼辦？',
  a: '沒問題！只要提前告知寶貝的年紀與體重，阿布拉會免費為您代為準備符合安全規範的兒童座椅。'
}, {
  q: '阿布拉會跟我們一起下車介紹嗎？',
  a: '阿布拉不是專業導遊，可以與您們像朋友一樣聊聊自己知道的。下車後的時光仍主要保留給您與同行家人親友夥伴享受私密時光。'
}, {
  q: '我們有 5–8 人，不想擠一台大 9 人座，這樣能預約嗎？',
  a: '可以為您安排另一位 5 人座在地司機一起為您服務。'
}];
function FaqSection({
  idx,
  total
}) {
  const [open, setOpen] = useState(0);
  return /*#__PURE__*/React.createElement("section", {
    className: "relative w-screen h-screen flex-shrink-0 grain overflow-hidden",
    "data-screen-label": "07 FAQ"
  }, /*#__PURE__*/React.createElement(PanelChrome, {
    idx: idx,
    total: total,
    label: "frequently asked"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 px-[7vw] pt-[13vh] pb-[12vh] grid grid-cols-12 gap-12",
    style: {
      gridTemplateRows: '1fr'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-4 flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline gap-4 mb-3"
  }, /*#__PURE__*/React.createElement(BulletArrow, {
    color: "var(--persimmon)"
  }), /*#__PURE__*/React.createElement("span", {
    className: "en italic text-xl",
    style: {
      color: 'var(--persimmon)'
    }
  }, "questions, answered.")), /*#__PURE__*/React.createElement("h2", {
    className: "zh font-bold leading-[1.15]",
    style: {
      fontSize: 'clamp(2rem, 3.6vw, 3.6rem)',
      color: 'var(--ink)'
    }
  }, "\u5E38\u898B", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--mauve-deep)'
    }
  }, "\u554F\u984C")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2",
    style: {
      fontFamily: "'Noto Serif TC',serif",
      fontWeight: 700,
      fontSize: 'clamp(2.4rem,4vw,3.6rem)',
      color: 'var(--persimmon)',
      letterSpacing: '0.06em',
      lineHeight: 1
    }
  }, "Q&A"), /*#__PURE__*/React.createElement("p", {
    className: "zh mt-7 leading-[2] text-[1rem] max-w-[28ch]",
    style: {
      color: 'var(--ink-soft)'
    }
  }, "\u5982\u6709\u5176\u4ED6\u7591\u554F\uFF0C\u6B61\u8FCE\u900F\u904E ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold",
    style: {
      color: 'var(--ink)'
    }
  }, "LINE"), " \u76F4\u63A5\u8A62\u554F\u963F\u5E03\u62C9\uFF0C\u6211\u6703\u5728\u6536\u5230\u8A0A\u606F\u5F8C\u76E1\u5FEB\u56DE\u8986\u3002")), /*#__PURE__*/React.createElement("div", {
    className: "col-span-8 flex flex-col justify-between"
  }, FAQ.map((f, i) => {
    const isOpen = open === i;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: () => setOpen(isOpen ? -1 : i),
      className: "text-left relative group transition-all",
      style: {
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "relative"
    }, /*#__PURE__*/React.createElement(BrushBlock, {
      color: isOpen ? 'var(--paper-deep)' : 'var(--paper)',
      edge: "soft",
      rounded: 22,
      flyaway: 0.25,
      className: "transition-all"
    }, /*#__PURE__*/React.createElement("div", {
      className: "px-7 py-[1.05rem] flex items-start gap-5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-semibold text-2xl flex-shrink-0 mt-[-1px]",
      style: {
        fontFamily: "'Fraunces','Noto Serif TC',serif",
        color: 'var(--persimmon)'
      }
    }, "Q", i + 1, "."), /*#__PURE__*/React.createElement("div", {
      className: "flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "zh font-semibold text-[1.08rem] leading-[1.5]",
      style: {
        color: 'var(--ink)'
      }
    }, f.q), /*#__PURE__*/React.createElement("div", {
      className: "overflow-hidden transition-all",
      style: {
        maxHeight: isOpen ? 200 : 0,
        opacity: isOpen ? 1 : 0
      }
    }, /*#__PURE__*/React.createElement("p", {
      className: "zh text-[0.96rem] mt-3 leading-[1.85] pt-3 border-t",
      style: {
        color: 'var(--ink-soft)',
        borderTopColor: 'rgba(44,42,35,0.15)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-semibold mr-2",
      style: {
        fontFamily: "'Fraunces','Noto Serif TC',serif",
        color: 'var(--sage-deep)'
      }
    }, "A."), f.a))), /*#__PURE__*/React.createElement("span", {
      className: "text-2xl opacity-60 flex-shrink-0 transition-transform",
      style: {
        color: 'var(--ink)',
        transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)'
      }
    }, "\uFF0B")))));
  }))), /*#__PURE__*/React.createElement(PanelFooter, null, "07 \xB7 faq"));
}

// ─────────────────────────── 08 Final CTA ─────────────────────────────
function CtaSection({
  idx,
  total,
  lineUrl = '#',
  igUrl = '#'
}) {
  return /*#__PURE__*/React.createElement("footer", {
    className: "relative w-screen h-screen flex-shrink-0 grain overflow-hidden",
    "data-screen-label": "08 Book"
  }, /*#__PURE__*/React.createElement(PanelChrome, {
    idx: idx,
    total: total,
    label: "book today"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 px-[7vw] pt-[15vh] pb-[14vh] flex flex-col items-center justify-center text-center"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "zh font-bold leading-[1.3] max-w-[22ch]",
    style: {
      fontSize: 'clamp(1.8rem, 3.7vw, 4.2rem)',
      color: 'var(--ink)'
    }
  }, "\u628A\u65B9\u5411\u76E4", /*#__PURE__*/React.createElement("br", null), "\u4EA4\u7D66", /*#__PURE__*/React.createElement("span", {
    className: "relative inline-block",
    style: {
      color: 'var(--persimmon)'
    }
  }, "\u963F\u5E03\u62C9", /*#__PURE__*/React.createElement(BrushUnderline, {
    color: "var(--persimmon)",
    height: 16,
    offsetY: 0,
    behind: true,
    inset: 8
  })), "\uFF0C", /*#__PURE__*/React.createElement("br", null), "\u628A", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--mauve-deep)'
    }
  }, "\u98A8\u666F\u548C\u5BB6\u4EBA"), "\u7559\u7D66\u81EA\u5DF1\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "mt-16 flex items-start justify-center gap-20"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-5"
  }, /*#__PURE__*/React.createElement("a", {
    href: lineUrl,
    target: "_blank",
    rel: "noreferrer",
    "aria-label": "\u7ACB\u5373\u900F\u904E LINE \u9810\u7D04",
    className: "flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-1",
    style: {
      width: 88,
      height: 88,
      borderRadius: 26,
      background: '#06C755',
      boxShadow: '0 2px 8px rgba(60,50,35,0.2)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "50",
    height: "50",
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    style: {
      color: '#FBFFF5'
    }
  }, /*#__PURE__*/React.createElement("path", {
    fill: "currentColor",
    d: "M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.63V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "zh"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-[1.18rem] tracking-[0.05em]",
    style: {
      color: 'var(--ink)'
    }
  }, "\u7ACB\u5373\u900F\u904E LINE \u9810\u7D04"), /*#__PURE__*/React.createElement("div", {
    className: "en italic text-sm mt-0.5",
    style: {
      color: 'var(--ink-soft)'
    }
  }, "book via LINE"))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-5"
  }, /*#__PURE__*/React.createElement("a", {
    href: igUrl,
    target: "_blank",
    rel: "noreferrer",
    "aria-label": "\u67E5\u770B\u963F\u5E03\u62C9\u7684\u8077\u4EBA\u65E5\u5E38 IG",
    className: "flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-1",
    style: {
      width: 88,
      height: 88,
      borderRadius: 26,
      background: 'radial-gradient(circle at 30% 107%, #FDD25C 0%, #FA7E1E 28%, #D62976 60%, #962FBF 80%, #4F5BD5 100%)',
      boxShadow: '0 2px 8px rgba(60,50,35,0.2)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "48",
    height: "48",
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    style: {
      color: '#FFFFFF'
    }
  }, /*#__PURE__*/React.createElement("path", {
    fill: "currentColor",
    d: "M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.25a1.25 1.25 0 0 0-2.5 0 1.25 1.25 0 0 0 2.5 0zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "zh"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-[1.18rem] tracking-[0.05em]",
    style: {
      color: 'var(--ink)'
    }
  }, "\u67E5\u770B\u6211\u7684\u8077\u4EBA\u65E5\u5E38"), /*#__PURE__*/React.createElement("div", {
    className: "en italic text-sm mt-0.5",
    style: {
      color: 'var(--ink-soft)'
    }
  }, "follow on IG"))))), /*#__PURE__*/React.createElement(LegalFooter, null));
}

// ─── Shared legal footer (copyright + terms / privacy) ────────────────
function LegalFooter({
  mobile = false
}) {
  const linkStyle = {
    color: 'var(--ink-soft)',
    textDecoration: 'none',
    borderBottom: '1px solid transparent',
    transition: 'border-color .2s ease'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "absolute left-0 right-0 flex flex-col items-center text-center pointer-events-auto",
    style: {
      bottom: mobile ? '3.4vh' : '5vh',
      gap: 6,
      zIndex: 30,
      padding: '0 6vw'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-3 zh",
    style: {
      fontSize: mobile ? '0.86rem' : '0.92rem'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "terms.html",
    target: "_blank",
    rel: "noopener",
    style: linkStyle,
    onMouseEnter: e => e.currentTarget.style.borderBottomColor = 'var(--persimmon)',
    onMouseLeave: e => e.currentTarget.style.borderBottomColor = 'transparent'
  }, "\u670D\u52D9\u689D\u6B3E"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-soft)',
      opacity: .45
    }
  }, "|"), /*#__PURE__*/React.createElement("a", {
    href: "privacy.html",
    target: "_blank",
    rel: "noopener",
    style: linkStyle,
    onMouseEnter: e => e.currentTarget.style.borderBottomColor = 'var(--persimmon)',
    onMouseLeave: e => e.currentTarget.style.borderBottomColor = 'transparent'
  }, "\u96B1\u79C1\u6B0A\u689D\u6B3E")), /*#__PURE__*/React.createElement("div", {
    className: "zh",
    style: {
      fontSize: mobile ? '0.74rem' : '0.8rem',
      color: 'var(--ink-soft)',
      opacity: .8,
      letterSpacing: '0.02em'
    }
  }, "\u7248\u6B0A \xA9 2026 -  (\u4E2D\u53F0\u7063\u5728\u5730\u53F8\u6A5F\u963F\u5E03\u62C9) \u4FDD\u7559\u4E00\u5207\u6B0A\u5229"));
}
Object.assign(window, {
  HeroSection,
  PainSection,
  WhySection,
  TestimonialsSection,
  LegalFooter,
  AboutSection,
  ForWhoSection,
  FaqSection,
  CtaSection,
  // Content + helpers reused by the dedicated mobile layout (mobile.jsx)
  HeroIllustration,
  RingPhoto,
  WhyCloud,
  CountUp,
  PAIN_ITEMS,
  WHY_ITEMS,
  HARDWARE_PHOTOS,
  QUOTES,
  AUDIENCES,
  FAQ
});
;
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// ──────────────────────────────────────────────────────────────────────
// mobile-view.jsx — Phone / tablet (<1024px) experience.
// A HORIZONTAL filmstrip you scroll through (same spirit as desktop). Each
// section: TITLE first (left-aligned), then scroll right to reveal each element
// one at a time. Full-bleed; the car rides the progress line through a tall
// watercolor landscape, exactly like the desktop background. Tablet shows ~2
// elements per screen. Reuses content + helpers exported to window.
// ──────────────────────────────────────────────────────────────────────


// Vertical scroll → horizontal progress (0..1); publishes --scroll-progress +
// scroll direction (car flip).
function useMobileProgress() {
  const [p, setP] = useState(0);
  const [facingRight, setFacingRight] = useState(true);
  const last = useRef(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const np = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        setP(np);
        document.documentElement.style.setProperty('--scroll-progress', String(np));
        if (np > last.current + 0.0004) setFacingRight(true);else if (np < last.current - 0.0004) setFacingRight(false);
        last.current = np;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, {
      passive: true
    });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return {
    p,
    facingRight
  };
}
function useInViewBlock(threshold = 0.35) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) setShown(true);
    }), {
      threshold
    });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, shown];
}
function HReveal({
  children,
  delay = 0,
  y = 26,
  className = '',
  style = {}
}) {
  const [ref, shown] = useInViewBlock(0.3);
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: className,
    style: {
      opacity: shown ? 1 : 0,
      transform: shown ? 'none' : `translateY(${y}px)`,
      transition: `opacity .7s ease ${delay}s, transform .7s cubic-bezier(.2,.7,.2,1) ${delay}s`,
      ...style
    }
  }, children);
}

// Full-bleed filmstrip block — full height, fixed width, NO top/bottom padding.
function Block({
  w = '78vw',
  start,
  label,
  align = 'center',
  bleed = false,
  children,
  className = ''
}) {
  const props = {};
  if (start != null) {
    props.id = 'mh-sec-' + start;
    props['data-screen-label'] = label;
  }
  const justify = align === 'start' ? 'justify-center items-stretch' : 'justify-center items-center';
  return /*#__PURE__*/React.createElement("div", _extends({}, props, {
    className: `shrink-0 h-screen flex flex-col ${justify} ${className}`,
    style: {
      width: w,
      padding: bleed ? '0' : '0 6vw',
      boxSizing: 'border-box'
    }
  }), children);
}

// Section title — left-aligned, bigger, NO "scroll" hint.
function TitleBlock({
  start,
  label,
  en,
  enColor = 'var(--persimmon)',
  w,
  children
}) {
  return /*#__PURE__*/React.createElement(Block, {
    start: start,
    label: label,
    align: "start",
    w: w
  }, /*#__PURE__*/React.createElement(HReveal, null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2.5 mb-4"
  }, /*#__PURE__*/React.createElement(BulletArrow, {
    color: "var(--persimmon)",
    size: 20
  }), /*#__PURE__*/React.createElement("span", {
    className: "en italic leading-none",
    style: {
      color: enColor,
      fontSize: 'clamp(1rem,4.4vw,1.3rem)'
    }
  }, en)), /*#__PURE__*/React.createElement("h2", {
    className: "zh font-bold leading-[1.32] text-left",
    style: {
      fontSize: 'clamp(1.5rem,6vw,2.3rem)',
      color: 'var(--ink)'
    }
  }, children)));
}

// ─────────────────────────── Background chrome ────────────────────────
function MobileLandscape({
  p,
  appearStart = 0.1
}) {
  const appear = Math.max(0, Math.min(1, (p - appearStart) / 0.04));
  return /*#__PURE__*/React.createElement("div", {
    className: "absolute left-0 right-0 bottom-0 pointer-events-none",
    "aria-hidden": true,
    style: {
      height: 'clamp(180px, 24vh, 280px)',
      backgroundImage: `url(${window.__asset('landscapeBand', 'asset/landscape-band.webp')})`,
      backgroundRepeat: 'repeat-x',
      backgroundSize: 'auto 100%',
      backgroundPositionY: 'bottom',
      backgroundPositionX: 'calc(var(--scroll-progress,0) * -260vw)',
      opacity: appear,
      visibility: appear <= 0.01 ? 'hidden' : 'visible',
      zIndex: 3
    }
  });
}
function MobileCar({
  p,
  facingRight,
  appearStart = 0.1
}) {
  const appear = Math.max(0, Math.min(1, (p - appearStart) / 0.04));
  const left = 12 + p * 66;
  const scaleX = facingRight ? -1 : 1;
  return /*#__PURE__*/React.createElement("div", {
    className: "absolute pointer-events-none",
    "aria-hidden": true,
    style: {
      left: `${left}%`,
      bottom: '6vh',
      width: 104,
      zIndex: 41,
      opacity: appear,
      visibility: appear <= 0.01 ? 'hidden' : 'visible'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      transform: `scaleX(${scaleX})`,
      transition: 'transform 360ms ease'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: window.__asset('carSide', 'asset/car-side.webp'),
    alt: "\u963F\u5E03\u62C9\u7684\u8ECA\uFF08\u88DD\u98FE\u52D5\u756B\uFF09",
    "aria-hidden": "true",
    className: "w-full h-auto block select-none",
    draggable: false,
    style: {
      filter: 'drop-shadow(0 2px 4px rgba(60,40,20,.25))'
    }
  })));
}
function MobileProgress({
  p,
  current,
  total
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "absolute left-0 right-0 z-40",
    style: {
      bottom: '6.8vh',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mx-auto flex items-center gap-3",
    style: {
      width: '78vw'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "en italic",
    style: {
      color: 'var(--persimmon)',
      fontSize: '0.72rem'
    }
  }, String(current + 1).padStart(2, '0')), /*#__PURE__*/React.createElement("div", {
    className: "relative flex-1 h-[2px]",
    style: {
      background: 'rgba(44,42,35,0.25)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute left-0 top-0 bottom-0",
    style: {
      width: `${p * 100}%`,
      background: 'var(--persimmon)',
      height: 2
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "en italic",
    style: {
      color: 'var(--ink-soft)',
      fontSize: '0.72rem'
    }
  }, String(total).padStart(2, '0'))));
}

// ─────────────────────────── Hero (mobile) ────────────────────────────
function MHeroText({
  tab
}) {
  return /*#__PURE__*/React.createElement(Block, {
    start: 0,
    label: "01 Hero",
    align: "start",
    w: tab ? '50vw' : '60vw'
  }, /*#__PURE__*/React.createElement(HReveal, null, /*#__PURE__*/React.createElement("img", {
    src: window.__asset('mapPin', 'asset/map-pin.webp'),
    alt: "\u5730\u5716\u5B9A\u4F4D\u5716\u91D8\u88DD\u98FE\u5716\u793A\uFF08\u88DD\u98FE\u7528\uFF09",
    "aria-hidden": "true",
    className: "select-none mb-4",
    style: {
      width: 'clamp(38px,9vw,56px)'
    },
    draggable: false
  }), /*#__PURE__*/React.createElement("h1", {
    className: "zh font-bold leading-[1.28] tracking-[-0.01em] text-left",
    style: {
      fontSize: 'clamp(1.7rem,7vw,2.6rem)',
      color: 'var(--ink)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "block whitespace-nowrap"
  }, "\u628A\u5FC3\u529B\u7559\u7D66", tab ? null : /*#__PURE__*/React.createElement("br", { key: "hb" }), /*#__PURE__*/React.createElement("span", {
    className: "relative inline-block whitespace-nowrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "relative",
    style: {
      zIndex: 1
    }
  }, "\u65C5\u904A\u6216\u5546\u52D9\u884C\u7A0B"), /*#__PURE__*/React.createElement(BrushUnderline, {
    color: "var(--persimmon)",
    height: 14,
    offsetY: -2,
    behind: true
  })), "\uFF0C"), /*#__PURE__*/React.createElement("span", {
    className: "block whitespace-nowrap"
  }, "\u958B\u8ECA\u53CA\u63A5\u99C1\uFF0C"), /*#__PURE__*/React.createElement("span", {
    className: "block whitespace-nowrap"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--mauve-deep)'
    }
  }, "\u4E0D\u8A72\u662F\u60A8\u7684\u7169\u60F1\u3002"))), /*#__PURE__*/React.createElement("p", {
    className: "mt-6 leading-[1.9] zh text-left",
    style: {
      color: 'var(--ink-soft)',
      fontFamily: 'var(--serif-zh)',
      fontSize: 'clamp(1rem,4vw,1.2rem)',
      maxWidth: '30ch'
    }
  }, "\u628A\u8DEF\u4E0A\u7684\u7463\u4E8B\u4EA4\u7D66", /*#__PURE__*/React.createElement("br", null), "\u4E2D\u53F0\u7063\u5728\u5730\u53F8\u6A5F\u963F\u5E03\u62C9\uFF0C", /*#__PURE__*/React.createElement("br", null), "\u9AD4\u9A57\u771F\u6B63", /*#__PURE__*/React.createElement("span", {
    className: "en italic align-middle px-0.5",
    style: {
      color: 'var(--persimmon)',
      fontSize: '1.35em'
    }
  }, "\""), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold",
    style: {
      color: 'var(--ink)'
    }
  }, "\u653E\u7A7A"), /*#__PURE__*/React.createElement("span", {
    className: "en italic align-middle px-0.5",
    style: {
      color: 'var(--persimmon)',
      fontSize: '1.35em'
    }
  }, "\""), "\u7684", /*#__PURE__*/React.createElement("br", null), "\u9AD8\u8CEA\u611F\u79FB\u52D5\u751F\u6D3B\u3002")));
}

// Hero illustration — a bit smaller, its BOTTOM resting on the progress line,
// and wide enough that its left edge already peeks before you scroll.
function MHeroImage() {
  const illoRef = useRef(null);
  const [ref, shown] = useInViewBlock(0.2);
  // entrance animation removed — hero illustration is static on mobile/tablet
  return /*#__PURE__*/React.createElement("div", {
    className: "shrink-0 h-screen flex items-end",
    style: {
      width: 'calc(80vh * 1412 / 1086)',
      paddingBottom: '6.8vh'
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: illoRef,
    style: {
      width: '100%',
      height: '80vh'
    }
  }, /*#__PURE__*/React.createElement(HeroIllustration, null))));
}

// ─────────────────────────── Pain (mobile) ────────────────────────────
function MPainBlocks(tab) {
  const CAP = '#9C9C9C';
  const capW = tab ? 'min(30vw,212px)' : 'min(57vw,228px)';
  const capDy = [0, 30, -14, 18]; // gentle stagger, echoing the desktop row
  return [/*#__PURE__*/React.createElement(TitleBlock, {
    key: "t",
    start: 1,
    label: "02 Pain points",
    en: "have you ever\u2026",
    w: tab ? '54vw' : '88vw'
  }, "\u4F60\u662F\u5426\u4E5F\u66FE\u9047\u904E", /*#__PURE__*/React.createElement("br", null), "\u9019\u4E9B\u8B93", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--persimmon)'
    }
  }, "\u884C\u7A0B"), "\u6263\u5206\u7684", /*#__PURE__*/React.createElement("br", null), "\u77AC\u9593\uFF1F"),
  /*#__PURE__*/
  // 4 capsules as one tight row (matched to desktop aspect ratio) — wider, closer together
  React.createElement(Block, {
    key: "caps",
    bleed: true,
    w: "max-content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center",
    style: {
      gap: tab ? '2.6vw' : '4vw',
      padding: '0 6vw'
    }
  }, PAIN_ITEMS.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      transform: `translateY(${capDy[i]}px)`
    }
  }, /*#__PURE__*/React.createElement(HReveal, null, /*#__PURE__*/React.createElement(CapsuleShape, {
    fill: CAP,
    stroke: "none",
    style: {
      width: capW,
      aspectRatio: '238 / 388'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full h-full flex flex-col items-center justify-center text-center px-6"
  }, /*#__PURE__*/React.createElement("span", {
    className: "en italic font-medium leading-none mb-2",
    style: {
      fontSize: '2.2rem',
      color: 'rgba(255,255,255,0.55)'
    }
  }, "0", i + 1), /*#__PURE__*/React.createElement("h3", {
    className: "zh font-bold leading-[1.25]",
    style: {
      fontSize: '1.32rem',
      color: '#F4F2EE'
    }
  }, it.title[0], /*#__PURE__*/React.createElement("br", null), it.title[1]), /*#__PURE__*/React.createElement("span", {
    className: "block my-3",
    style: {
      width: 30,
      height: 2,
      background: 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("p", {
    className: "zh leading-[1.7]",
    style: {
      fontSize: '0.95rem',
      color: '#EFEDE8'
    }
  }, it.body))))))))];
}

// ─────────────────────────── Why (mobile) ─────────────────────────────
// Small arc photo — image + caption scale together on hover (.arc-photo).
function MArcPhoto({
  src,
  label,
  alt,
  size,
  contain = false,
  rotate = 0
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "arc-photo flex flex-col items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-full overflow-hidden shrink-0",
    style: {
      width: size,
      height: size,
      border: '3px solid var(--persimmon)',
      background: contain ? '#F2EEE4' : 'transparent',
      boxShadow: '0 2px 8px rgba(60,50,35,0.16)',
      transform: `rotate(${rotate}deg)`
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: alt || label,
    className: "w-full h-full",
    draggable: false,
    style: {
      objectFit: contain ? 'contain' : 'cover',
      padding: contain ? '8%' : 0
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "zh tracking-[0.05em] whitespace-nowrap",
    style: {
      fontSize: '0.72rem',
      color: 'var(--ink-soft)'
    }
  }, label));
}
function MWhyBlocks(tab) {
  const PH = [{
    rot: -6
  }, {
    rot: 5
  }, {
    rot: 7
  }, {
    rot: -5
  }];
  const cloudSize = tab ? {
    width: 'min(44vw,420px)',
    height: 'min(31vw,300px)'
  } : {
    width: 'min(86vw,440px)',
    height: 'min(61vw,312px)'
  };
  const blocks = [/*#__PURE__*/React.createElement(TitleBlock, {
    key: "t",
    start: 2,
    label: "03 Why",
    en: "the difference is in the detail.",
    w: tab ? '56vw' : '90vw'
  }, "\u70BA\u4EC0\u9EBC\u9078\u64C7", /*#__PURE__*/React.createElement("br", null), "\u963F\u5E03\u62C9\uFF1F", /*#__PURE__*/React.createElement("br", null), "\u56E0\u70BA\u6211\u5011\u5728\u4E4E", /*#__PURE__*/React.createElement("br", null), "\u90A3\u4E9B", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--persimmon)'
    }
  }, "\u5225\u4EBA\u5FFD\u7565"), "\u7684\u7D30\u7BC0\u3002")];
  // 3 features — order swapped on mobile per request: 安全 → 職人服務 → 貼心設備
  const order = [0, 2, 1];
  const dys = [-26, 30, -14]; // stagger up/down so the clouds don't sit in a rigid line
  order.forEach((idx, i) => {
    const w = WHY_ITEMS[idx];
    blocks.push(/*#__PURE__*/React.createElement(Block, {
      key: 'w' + i,
      w: tab ? '48vw' : '90vw'
    }, /*#__PURE__*/React.createElement(HReveal, {
      className: "w-full flex justify-center"
    }, /*#__PURE__*/React.createElement(WhyCloud, {
      w: w,
      shown: true,
      delay: 0,
      z: 10,
      dy: dys[i],
      size: cloudSize
    }))));
  });
  // hardware: 4 feature photos curving in an arc that wraps the cloud (steep at top-right,
  // flattening toward bottom-left) — a subsidiary of the 3rd cloud. Captions stay clear of neighbours.
  // 4 photos on an equal-angle quarter-circle arc → identical spacing between each pair,
  // steep at the top and flattening outward toward the bottom-left (wraps the cloud).
  const ringSize = tab ? 'min(13vw,96px)' : 'min(23vw,90px)';
  const POS = [{
    left: '86%',
    top: '19%'
  },
  // top — steep start
  {
    left: '77%',
    top: '47%'
  }, {
    left: '50%',
    top: '61%'
  }, {
    left: '14%',
    top: '66%'
  } // bottom-left — flattened end
  ];
  blocks.push(/*#__PURE__*/React.createElement(Block, {
    key: "hw",
    w: tab ? '64vw' : '94vw'
  }, /*#__PURE__*/React.createElement(HReveal, {
    className: "w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative w-full",
    style: {
      height: '72vh'
    }
  }, HARDWARE_PHOTOS.map((p, k) => /*#__PURE__*/React.createElement("div", {
    key: k,
    className: "absolute",
    style: {
      left: POS[k].left,
      top: POS[k].top,
      transform: 'translate(-50%,-50%)'
    }
  }, /*#__PURE__*/React.createElement(MArcPhoto, {
    src: window.__asset(p.id, p.src),
    label: p.label,
    alt: p.alt,
    contain: p.contain,
    size: ringSize,
    rotate: PH[k].rot
  })))))));
  return blocks;
}

// ─────────────────────────── Voices (mobile) ──────────────────────────
function MVoiceBlocks(tab) {
  return [/*#__PURE__*/React.createElement(TitleBlock, {
    key: "t",
    start: 3,
    label: "04 Voices",
    en: "in their own words.",
    enColor: "var(--ink-soft)",
    w: tab ? '50vw' : '88vw'
  }, "\u4E58\u5BA2\u7684", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--persimmon)'
    }
  }, "\u771F\u5FC3\u8A71")), ...QUOTES.map((q, i) => /*#__PURE__*/React.createElement(Block, {
    key: i,
    w: tab ? '48vw' : '86vw'
  }, /*#__PURE__*/React.createElement(HReveal, {
    className: "w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative",
    style: {
      transform: `rotate(${i % 2 === 0 ? -0.6 : 0.6}deg)`
    }
  }, /*#__PURE__*/React.createElement(BrushBlock, {
    color: "var(--paper-deep)",
    rounded: 30,
    edge: "soft",
    flyaway: 0.32,
    flat: true
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-8 py-9"
  }, /*#__PURE__*/React.createElement("div", {
    className: "en italic font-medium leading-none",
    style: {
      fontSize: '3.6rem',
      color: q.color,
      marginBottom: '-1.1rem'
    }
  }, "\u201C"), /*#__PURE__*/React.createElement("p", {
    className: "zh leading-[1.9] mix",
    style: {
      fontSize: '1.08rem',
      color: 'var(--ink)'
    }
  }, q.body))), /*#__PURE__*/React.createElement("div", {
    className: "absolute -left-2 rotate-[-6deg]",
    style: {
      top: '-0.6rem'
    }
  }, /*#__PURE__*/React.createElement(WashiTape, {
    color: q.color,
    rotate: -6
  }, /*#__PURE__*/React.createElement("span", {
    className: "en italic text-sm font-medium",
    style: {
      color: '#F7EFDA'
    }
  }, q.tag)))))))];
}

// ─────────────────────────── About (mobile) ───────────────────────────
function MAboutBlocks(tab, igUrl) {
  return [/*#__PURE__*/React.createElement(TitleBlock, {
    key: "t",
    start: 4,
    label: "05 About",
    en: "nice to meet you.",
    w: tab ? '52vw' : '88vw'
  }, tab ? ["\u4E2D\u53F0\u7063\u5728\u5730\u53F8\u6A5F", /*#__PURE__*/React.createElement("br", { key: "b" }), /*#__PURE__*/React.createElement("span", { key: "s", style: { color: 'var(--persimmon)' } }, "\u963F\u5E03\u62C9"), "\u4ECB\u7D39"] : ["\u4E2D\u53F0\u7063", /*#__PURE__*/React.createElement("br", { key: "b1" }), "\u5728\u5730\u53F8\u6A5F", /*#__PURE__*/React.createElement("br", { key: "b2" }), /*#__PURE__*/React.createElement("span", { key: "s", style: { color: 'var(--persimmon)' } }, "\u963F\u5E03\u62C9"), /*#__PURE__*/React.createElement("br", { key: "b3" }), "\u4ECB\u7D39"]), /*#__PURE__*/React.createElement(Block, {
    key: "portrait",
    w: tab ? '40vw' : '72vw'
  }, /*#__PURE__*/React.createElement(HReveal, {
    className: "w-full flex justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative",
    style: {
      width: tab ? 'min(34vw,280px)' : 'min(64vw,280px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": true,
    className: "absolute",
    style: {
      inset: '-3% -6% -7% -12%',
      backgroundImage: 'radial-gradient(var(--sage-deep) 1.25px, transparent 1.5px)',
      backgroundSize: '7px 7px',
      borderRadius: '9999px',
      transform: 'rotate(-4deg)',
      opacity: 0.8,
      zIndex: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative overflow-hidden",
    style: {
      borderRadius: '9999px',
      aspectRatio: '1 / 1.32',
      boxShadow: '0 3px 10px rgba(60,50,35,0.18)',
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: window.__asset('aburaPortrait', 'asset/abura-portrait.webp'),
    alt: "\u4E2D\u53F0\u7063\u5728\u5730\u5305\u8ECA\u53F8\u6A5F\u963F\u5E03\u62C9\u7684\u500B\u4EBA\u7167\uFF08\u8ACB\u4F9D\u5BE6\u969B\u7167\u7247\u4FEE\u6539\u63CF\u8FF0\uFF09",
    draggable: false,
    className: "w-full h-full object-cover select-none",
    style: {
      objectPosition: '46% 20%'
    }
  }))))), /*#__PURE__*/React.createElement(Block, {
    key: "bio",
    align: "start",
    w: tab ? '56vw' : '88vw'
  }, /*#__PURE__*/React.createElement(HReveal, null, /*#__PURE__*/React.createElement("span", {
    className: "block mb-5",
    style: {
      width: 46,
      height: 2,
      background: 'var(--persimmon)'
    }
  }), /*#__PURE__*/React.createElement("p", {
    className: "zh leading-[1.95]",
    style: {
      fontSize: '1.08rem',
      color: 'var(--ink)',
      textAlign: 'justify'
    }
  }, "\u6211\u662F\u963F\u5E03\u62C9\uFF0C\u64C1\u6709 ", /*#__PURE__*/React.createElement("span", {
    className: "en italic font-semibold",
    style: {
      color: 'var(--persimmon)'
    }
  }, "3"), " \u5E74\u5305\u8ECA\u63A5\u9001\u7D93\u9A57\u3002\u6211\u5C0D\u300C\u63A5\u9001\u300D\u7684\u7406\u89E3\u4E0D\u53EA\u662F\u628A\u4EBA\u9001\u5230\u4F4D\uFF0C\u800C\u662F\u5275\u9020\u4E00\u500B", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--persimmon)'
    }
  }, "\u300C\u4EE5\u5BA2\u4EBA\u70BA\u5148\uFF0C\u8212\u9069\u5B89\u5168\u7684\u884C\u7A0B\u300D"), "\u3002"), /*#__PURE__*/React.createElement("p", {
    className: "zh leading-[1.95] mt-4",
    style: {
      fontSize: '1.04rem',
      color: 'var(--ink-soft)',
      textAlign: 'justify'
    }
  }, "\u6211\u61C2\u5F97\u5B89\u975C\u5730\u89C0\u5BDF\u5BA2\u6236\u7684\u9700\u6C42\uFF0C\u5728\u60A8\u9700\u8981\u4F11\u606F\u6642\u4FDD\u6301\u7D55\u5C0D\u5B89\u975C\uFF0C\u5728\u60A8\u9700\u8981\u5354\u52A9\u6642\u63D0\u4F9B\u6700\u5C08\u696D\u7684\u670D\u52D9\u3002"))), /*#__PURE__*/React.createElement(MAboutStats, {
    key: "stats",
    tab: tab,
    igUrl: igUrl
  })];
}
function MAboutStats({
  tab,
  igUrl
}) {
  const [ref, shown] = useInViewBlock(0.4);
  return /*#__PURE__*/React.createElement(Block, {
    w: tab ? '44vw' : '84vw'
  }, /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-stretch justify-center gap-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline justify-center gap-1.5"
  }, /*#__PURE__*/React.createElement(CountUp, {
    to: 3,
    shown: shown,
    className: "en italic font-medium",
    style: {
      fontSize: 'clamp(3.2rem,15vw,4.8rem)',
      color: 'var(--persimmon)',
      lineHeight: 0.9
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "zh font-semibold",
    style: {
      fontSize: '1.4rem',
      color: 'var(--ink)'
    }
  }, "\u5E74")), /*#__PURE__*/React.createElement("div", {
    className: "zh text-sm tracking-[0.24em] mt-1",
    style: {
      color: 'var(--ink-soft)'
    }
  }, "\u670D\u52D9\u5E74\u8CC7")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      background: 'var(--ink)',
      opacity: 0.2
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-baseline justify-center gap-0.5"
  }, /*#__PURE__*/React.createElement(CountUp, {
    to: 500,
    shown: shown,
    className: "en italic font-medium",
    style: {
      fontSize: 'clamp(3.2rem,15vw,4.8rem)',
      color: 'var(--persimmon)',
      lineHeight: 0.9
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "en italic font-medium",
    style: {
      fontSize: '2rem',
      color: 'var(--persimmon)'
    }
  }, "+"), /*#__PURE__*/React.createElement("span", {
    className: "zh font-semibold",
    style: {
      fontSize: '1.4rem',
      color: 'var(--ink)'
    }
  }, "\u7D44")), /*#__PURE__*/React.createElement("div", {
    className: "zh text-sm tracking-[0.24em] mt-1",
    style: {
      color: 'var(--ink-soft)'
    }
  }, "\u63A5\u9001\u5BA2\u4EBA"))), /*#__PURE__*/React.createElement("div", {
    className: "mt-9 flex justify-center"
  }, /*#__PURE__*/React.createElement("a", {
    href: igUrl,
    target: "_blank",
    rel: "noreferrer",
    "aria-label": "\u67E5\u770B\u963F\u5E03\u62C9\u7684 Instagram \u8077\u4EBA\u65E5\u5E38",
    className: "flex items-center gap-3 pl-5 pr-4 py-3 rounded-2xl",
    style: {
      background: 'var(--paper-deep)',
      boxShadow: '0 2px 8px rgba(60,50,35,0.16)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-right zh leading-tight"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '0.78rem',
      color: 'var(--ink-soft)'
    }
  }, "\u78BA\u8A8D\u6211\u5011\u662F\u5426\u5408\u62CD"), /*#__PURE__*/React.createElement("div", {
    className: "font-semibold",
    style: {
      fontSize: '1rem',
      color: 'var(--ink)'
    }
  }, "\u67E5\u770B\u8077\u4EBA\u65E5\u5E38 ", /*#__PURE__*/React.createElement("span", {
    className: "en italic"
  }, "IG"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center shrink-0",
    style: {
      width: 48,
      height: 48,
      borderRadius: 14,
      background: 'radial-gradient(circle at 30% 107%, #FDD25C 0%, #FA7E1E 28%, #D62976 60%, #962FBF 80%, #4F5BD5 100%)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "27",
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    style: {
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("path", {
    fill: "currentColor",
    d: "M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.25a1.25 1.25 0 0 0-2.5 0 1.25 1.25 0 0 0 2.5 0zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"
  })))))));
}

// ─────────────────────────── For who (mobile) ─────────────────────────
function MForWhoBlocks(tab) {
  return [/*#__PURE__*/React.createElement(TitleBlock, {
    key: "t",
    start: 5,
    label: "06 For who",
    en: "book your easy afternoon.",
    w: tab ? '56vw' : '90vw'
  }, "\u6709\u4EE5\u4E0B\u9700\u6C42\uFF0C", /*#__PURE__*/React.createElement("br", null), "\u4F86\u9810\u7D04\u60A8\u7684", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--persimmon)'
    }
  }, "\u5F9E\u5BB9\u6642\u5149"), "\u3002"), ...AUDIENCES.map((a, i) => /*#__PURE__*/React.createElement(Block, {
    key: i,
    w: tab ? '46vw' : '82vw'
  }, /*#__PURE__*/React.createElement(HReveal, {
    className: "w-full"
  }, /*#__PURE__*/React.createElement(BrushBlock, {
    color: "#9D7C8C",
    rounded: 32,
    flat: true,
    edge: i === 1 ? 'normal' : 'soft',
    flyaway: 0.4,
    style: {
      transform: `rotate(${[-0.4, 0.4, -0.3][i]}deg)`
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-8 py-9 text-center",
    style: {
      color: '#F7EFDA'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    className: "zh font-bold leading-[1.3] text-center",
    style: {
      fontSize: '1.5rem'
    }
  }, tab ? ["\u3010", a.title, "\u3011"] : (function(){ var L = [["\u5BB6\u5EAD\u51FA\u904A", "\u884C\u7A0B"], ["\u4E09\u4E94\u670B\u53CB", "\u540C\u904A"], ["\u5546\u52D9\u63A5\u5F85", "\u9700\u6C42"]][i]; return [L[0], /*#__PURE__*/React.createElement("br", { key: "cb" }), L[1]]; })()), /*#__PURE__*/React.createElement("div", {
    className: "my-4 mx-auto",
    style: {
      width: 52,
      height: 2,
      background: 'currentColor',
      opacity: 0.5
    }
  }), /*#__PURE__*/React.createElement("p", {
    className: "zh leading-[1.85] opacity-95",
    style: {
      fontSize: '1.04rem'
    }
  }, a.body), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 en italic",
    style: {
      fontSize: '0.86rem',
      opacity: 0.85
    }
  }, a.en))))))];
}

// ─────────────────────────── FAQ (mobile) — desktop-style accordion, default ALL closed ──
function MFaqStrip({
  tab
}) {
  const [openIdx, setOpenIdx] = useState(-1); // all answers closed by default
  return React.createElement(React.Fragment, null, React.createElement(TitleBlock, {
    start: 6,
    label: "07 FAQ",
    en: "questions, answered.",
    w: tab ? '54vw' : '88vw'
  }, "\u5E38\u898B", React.createElement("span", {
    style: { color: 'var(--mauve-deep)' }
  }, "\u554F\u984C"), " ", React.createElement("span", {
    style: { fontFamily: "'Noto Serif TC',serif", color: 'var(--persimmon)', letterSpacing: '0.06em' }
  }, "Q&A")), React.createElement(Block, {
    w: tab ? '74vw' : '92vw'
  }, React.createElement(HReveal, {
    className: "w-full"
  }, React.createElement("div", {
    className: "mob-faq-scroll w-full",
    style: { maxHeight: '84vh', overflowY: 'auto', overflowX: 'hidden', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }
  }, React.createElement("ul", {
    className: "w-full flex flex-col"
  }, FAQ.map((f, i) => {
    const open = openIdx === i;
    return React.createElement("li", {
      key: i,
      style: { borderTop: i === 0 ? 'none' : '1px solid rgba(44,42,35,0.1)' }
    }, React.createElement("button", {
      onClick: () => setOpenIdx(open ? -1 : i),
      className: "text-left w-full",
      "aria-expanded": open
    }, React.createElement("div", {
      className: "flex items-baseline",
      style: { gap: tab ? '1.1rem' : '0.65rem', padding: tab ? '1.35vh 0' : '0.5vh 0' }
    }, React.createElement("span", {
      className: "font-bold flex-shrink-0",
      style: { fontFamily: "'Noto Serif TC',serif", fontSize: tab ? '1.5rem' : '1.08rem', color: 'var(--persimmon)', letterSpacing: '0.01em' }
    }, "Q", i + 1, "."), React.createElement("span", {
      className: "zh font-semibold leading-[1.4] flex-1",
      style: { fontSize: tab ? '1.18rem' : '0.97rem', color: 'var(--ink)' }
    }, f.q), React.createElement("span", {
      className: "flex-shrink-0 transition-transform",
      style: { fontSize: '1.4rem', fontWeight: 300, lineHeight: 1, color: 'var(--ink-soft)', transform: open ? 'rotate(45deg)' : 'none' }
    }, "\uFF0B")), React.createElement("div", {
      className: "overflow-hidden transition-all",
      style: { maxHeight: open ? 360 : 0, opacity: open ? 1 : 0 }
    }, React.createElement("p", {
      className: "zh leading-[1.85]",
      style: { fontSize: tab ? '1rem' : '0.94rem', color: 'var(--ink-soft)', paddingLeft: tab ? '2.7rem' : '2.3rem', paddingBottom: '1.4vh' }
    }, React.createElement("span", {
      className: "font-bold mr-1.5",
      style: { fontFamily: "'Noto Serif TC',serif", color: 'var(--sage-deep)' }
    }, "A."), f.a))));
  }))))));
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 CTA (mobile) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function MCtaBlock({
  lineUrl,
  igUrl,
  tab
}) {
  return /*#__PURE__*/React.createElement(Block, {
    start: 7,
    label: "08 Book",
    align: "center",
    w: tab ? '64vw' : '94vw'
  }, /*#__PURE__*/React.createElement(HReveal, {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "zh font-bold leading-[1.4] text-center",
    style: {
      fontSize: 'clamp(1.6rem,6.2vw,2.4rem)',
      color: 'var(--ink)'
    }
  }, "\u628A\u65B9\u5411\u76E4", /*#__PURE__*/React.createElement("br", null), "\u4EA4\u7D66", /*#__PURE__*/React.createElement("span", {
    className: "relative inline-block",
    style: {
      color: 'var(--persimmon)'
    }
  }, "\u963F\u5E03\u62C9", /*#__PURE__*/React.createElement(BrushUnderline, {
    color: "var(--persimmon)",
    height: 15,
    offsetY: 0,
    behind: true,
    inset: 6
  })), "\uFF0C", /*#__PURE__*/React.createElement("br", null), "\u628A", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--mauve-deep)'
    }
  }, "\u98A8\u666F\u548C\u5BB6\u4EBA"), /*#__PURE__*/React.createElement("br", null), "\u7559\u7D66\u81EA\u5DF1\u3002"), /*#__PURE__*/React.createElement("div", {
    className: "mt-12 flex items-start justify-center gap-12"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-4"
  }, /*#__PURE__*/React.createElement("a", {
    href: lineUrl,
    target: "_blank",
    rel: "noreferrer",
    "aria-label": "\u7ACB\u5373\u900F\u904E LINE \u9810\u7D04",
    className: "flex items-center justify-center active:scale-95 transition-transform",
    style: {
      width: 78,
      height: 78,
      borderRadius: 22,
      background: '#06C755',
      boxShadow: '0 2px 8px rgba(60,50,35,0.2)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "46",
    height: "46",
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    style: {
      color: '#FBFFF5'
    }
  }, /*#__PURE__*/React.createElement("path", {
    fill: "currentColor",
    d: "M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.63V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "zh font-bold",
    style: {
      fontSize: '1.04rem',
      color: 'var(--ink)'
    }
  }, "\u7ACB\u5373 LINE \u9810\u7D04")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-4"
  }, /*#__PURE__*/React.createElement("a", {
    href: igUrl,
    target: "_blank",
    rel: "noreferrer",
    "aria-label": "\u67E5\u770B\u963F\u5E03\u62C9\u7684\u8077\u4EBA\u65E5\u5E38 IG",
    className: "flex items-center justify-center active:scale-95 transition-transform",
    style: {
      width: 78,
      height: 78,
      borderRadius: 22,
      background: 'radial-gradient(circle at 30% 107%, #FDD25C 0%, #FA7E1E 28%, #D62976 60%, #962FBF 80%, #4F5BD5 100%)',
      boxShadow: '0 2px 8px rgba(60,50,35,0.2)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "44",
    height: "44",
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    style: {
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("path", {
    fill: "currentColor",
    d: "M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.25a1.25 1.25 0 0 0-2.5 0 1.25 1.25 0 0 0 2.5 0zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "zh font-bold",
    style: {
      fontSize: '1.04rem',
      color: 'var(--ink)'
    }
  }, "\u8FFD\u8E64\u8077\u4EBA\u65E5\u5E38"))), /*#__PURE__*/React.createElement("div", {
    className: "mt-12 flex flex-col items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-3 zh",
    style: {
      fontSize: '0.92rem'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "terms.html",
    target: "_blank",
    rel: "noopener",
    style: {
      color: 'var(--ink-soft)',
      textDecoration: 'underline',
      textUnderlineOffset: '3px'
    }
  }, "\u670D\u52D9\u689D\u6B3E"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-soft)',
      opacity: .45
    }
  }, "|"), /*#__PURE__*/React.createElement("a", {
    href: "privacy.html",
    target: "_blank",
    rel: "noopener",
    style: {
      color: 'var(--ink-soft)',
      textDecoration: 'underline',
      textUnderlineOffset: '3px'
    }
  }, "\u96B1\u79C1\u6B0A\u689D\u6B3E")), /*#__PURE__*/React.createElement("div", {
    className: "zh",
    style: {
      fontSize: '0.74rem',
      color: 'var(--ink-soft)',
      opacity: .8,
      textAlign: 'center',
      lineHeight: 1.6
    }
  }, "\u7248\u6B0A \xA9 2026 -  (\u4E2D\u53F0\u7063\u5728\u5730\u53F8\u6A5F\u963F\u5E03\u62C9)", /*#__PURE__*/React.createElement("br", null), "\u4FDD\u7559\u4E00\u5207\u6B0A\u5229"))));
}

// ─────────────────────────── Mobile site (horizontal) ─────────────────
function MobileSite({
  lineUrl = '#',
  igUrl = '#'
}) {
  const scrollerRef = useRef(null);
  const trackRef = useRef(null);
  const [trackW, setTrackW] = useState(0);
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 390);
  const [vh, setVh] = useState(typeof window !== 'undefined' ? window.innerHeight : 700);
  const [p, setP] = useState(0);
  const [facingRight, setFacingRight] = useState(true);
  const lastP = useRef(0);
  const TOTAL = 8;
  const tab = vw >= 600;

  useLayoutEffect(() => {
    const measure = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
      if (trackRef.current) setTrackW(trackRef.current.scrollWidth);
    };
    measure();
    const t1 = setTimeout(measure, 500);
    const t2 = setTimeout(measure, 1400);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [tab]);

  // Native horizontal scroll drives progress (0..1) + facing direction.
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = sc.scrollWidth - sc.clientWidth;
        const np = max > 0 ? Math.min(1, Math.max(0, sc.scrollLeft / max)) : 0;
        setP(np);
        document.documentElement.style.setProperty('--scroll-progress', String(np));
        if (np > lastP.current + 0.0004) setFacingRight(true);
        else if (np < lastP.current - 0.0004) setFacingRight(false);
        lastP.current = np;
      });
    };
    onScroll();
    sc.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      sc.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [trackW]);

  const travel = Math.max(1, trackW - vw);

  // Robust pointer-drag scrolling (touch + mouse) so the horizontal swipe always
  // works regardless of native overflow-touch quirks. The FAQ slide drags vertically.
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    let down = false, sx = 0, sy = 0, startLeft = 0, axis = null, faqEl = null, startTop = 0, captured = false;
    let lastX = 0, lastT = 0, vx = 0, mom = 0;
    const onDown = (e) => {
      down = true; axis = null; captured = false;
      sx = e.clientX; sy = e.clientY; startLeft = sc.scrollLeft;
      lastX = e.clientX; lastT = performance.now(); vx = 0;
      faqEl = e.target && e.target.closest ? e.target.closest('.mob-faq-scroll') : null;
      if (faqEl) startTop = faqEl.scrollTop;
      cancelAnimationFrame(mom);
    };
    const onMove = (e) => {
      if (!down) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!axis) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        if (!captured) { try { sc.setPointerCapture(e.pointerId); } catch (_) {} captured = true; }
      }
      if (axis === 'x') {
        sc.scrollLeft = startLeft - dx;
        const now = performance.now();
        if (now > lastT) { vx = (e.clientX - lastX) / (now - lastT); lastX = e.clientX; lastT = now; }
        e.preventDefault();
      } else if (axis === 'y' && faqEl) {
        faqEl.scrollTop = startTop - dy;
        e.preventDefault();
      }
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      if (axis === 'x' && Math.abs(vx) > 0.06) {
        let v = vx * 18;
        const step = () => { v *= 0.94; sc.scrollLeft -= v; if (Math.abs(v) > 0.4) mom = requestAnimationFrame(step); };
        mom = requestAnimationFrame(step);
      }
    };
    const onWheel = (e) => {
      const fe = e.target && e.target.closest ? e.target.closest('.mob-faq-scroll') : null;
      if (fe && fe.scrollHeight > fe.clientHeight + 2) { fe.scrollTop += e.deltaY; }
      else { sc.scrollLeft += (Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY); }
    };
    sc.addEventListener('pointerdown', onDown);
    sc.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    sc.addEventListener('pointercancel', onUp);
    sc.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      sc.removeEventListener('pointerdown', onDown);
      sc.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      sc.removeEventListener('pointercancel', onUp);
      sc.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(mom);
    };
  }, [trackW]);

  const [offsets, setOffsets] = useState([]);
  useEffect(() => {
    if (!trackRef.current || !trackW) return;
    const arr = [];
    for (let i = 0; i < TOTAL; i++) {
      const el = trackRef.current.querySelector('#mh-sec-' + i);
      arr[i] = el ? el.offsetLeft : 0;
    }
    setOffsets(arr);
    window.__mobileJump = i => {
      const el = trackRef.current && trackRef.current.querySelector('#mh-sec-' + i);
      const x = el ? el.offsetLeft : 0;
      if (scrollerRef.current) scrollerRef.current.scrollTo({ left: x, behavior: 'smooth' });
    };
    return () => {
      if (window.__mobileJump) delete window.__mobileJump;
    };
  }, [trackW]);

  const scrollX = p * travel;
  let current = 0;
  for (let i = 0; i < offsets.length; i++) {
    if (scrollX >= offsets[i] - vw * 0.4) current = i;
  }
  const appearStart = travel > 0 && offsets[1] ? Math.min(0.9, offsets[1] / travel) : 0.12;

  return React.createElement("div", {
    style: { position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--paper)' }
  }, React.createElement(MobileLandscape, {
    p: p,
    appearStart: appearStart
  }), React.createElement(MobileCar, {
    p: p,
    facingRight: facingRight,
    appearStart: appearStart
  }), React.createElement("div", {
    ref: scrollerRef,
    className: "mob-scroller",
    style: { position: 'absolute', inset: 0, overflowX: 'auto', overflowY: 'hidden', zIndex: 10, WebkitOverflowScrolling: 'touch' }
  }, React.createElement("div", {
    ref: trackRef,
    className: "flex items-stretch h-screen",
    style: { width: 'max-content' }
  }, React.createElement(MHeroText, {
    tab: tab
  }), React.createElement(MHeroImage, null), MPainBlocks(tab), MWhyBlocks(tab), MVoiceBlocks(tab), MAboutBlocks(tab, igUrl), MForWhoBlocks(tab), React.createElement(MFaqStrip, {
    tab: tab
  }), React.createElement(MCtaBlock, {
    lineUrl: lineUrl,
    igUrl: igUrl,
    tab: tab
  }))), React.createElement(MobileProgress, {
    p: p,
    current: current,
    total: TOTAL
  }), React.createElement(FloatingLineCta, {
    lineUrl: lineUrl,
    show: current >= 1 && current < 7
  }));
}
Object.assign(window, {
  MobileSite
});
;
// Root app — orchestrates layout, the horizontal-scroll engine,
// the persistent car/CTA layer, and the Tweaks panel.



// ─── Palette presets ──────────────────────────────────────────────────
const PALETTES = {
  origin: {
    label: '原',
    sub: 'sage · mauve · persimmon',
    vars: {
      '--paper': '#FFFFFF',
      '--paper-deep': '#F2EBDC',
      '--sage': '#9CB290',
      '--sage-deep': '#6F7E5A',
      '--mauve': '#A28590',
      '--mauve-deep': '#7E5E6B',
      '--persimmon': '#D9854A',
      '--persimmon-deep': '#A0633A',
      '--olive': '#7C8E5C',
      '--indigo': '#4D6275',
      '--ink': '#2C2A23',
      '--ink-soft': '#5C564B'
    }
  },
  plum: {
    label: '梅',
    sub: 'mauve · indigo · clay',
    vars: {
      '--paper': '#FFFFFF',
      '--paper-deep': '#F1E6D3',
      '--sage': '#8C9F84',
      '--sage-deep': '#6F7D55',
      '--mauve': '#8E6C7A',
      '--mauve-deep': '#5F3F4F',
      '--persimmon': '#C56F3E',
      '--persimmon-deep': '#8F4B26',
      '--olive': '#6F7D55',
      '--indigo': '#3F5366',
      '--ink': '#2A2520',
      '--ink-soft': '#5A4E45'
    }
  },
  sea: {
    label: '海',
    sub: 'sea · sand · ember',
    vars: {
      '--paper': '#FFFFFF',
      '--paper-deep': '#F3E7CD',
      '--sage': '#7FA39A',
      '--sage-deep': '#587068',
      '--mauve': '#C4A876',
      '--mauve-deep': '#9E854E',
      '--persimmon': '#C9683C',
      '--persimmon-deep': '#8F421F',
      '--olive': '#6F8262',
      '--indigo': '#5F8095',
      '--ink': '#25282A',
      '--ink-soft': '#4F555A'
    }
  }
};

// ─── Font presets ─────────────────────────────────────────────────────
const FONTS = {
  classic: {
    label: '原',
    sub: 'Noto Serif TC · Cormorant',
    vars: {
      '--serif-zh': "'Noto Serif TC', serif",
      '--serif-en': "'Cormorant Garamond', serif"
    }
  },
  scroll: {
    label: '古',
    sub: 'Shippori Mincho · EB Garamond',
    vars: {
      '--serif-zh': "'Shippori Mincho','Noto Serif TC', serif",
      '--serif-en': "'EB Garamond', serif"
    }
  },
  modern: {
    label: '雅',
    sub: 'Klee One · Fraunces',
    vars: {
      '--serif-zh': "'Klee One','Noto Serif TC', serif",
      '--serif-en': "'Fraunces', serif"
    }
  }
};
const HERO_COMPS = {
  mountain: {
    label: '山',
    sub: 'mountain'
  },
  sea: {
    label: '海',
    sub: 'sea'
  },
  city: {
    label: '城',
    sub: 'city'
  }
};

// ─── App ──────────────────────────────────────────────────────────────
function App() {
  // Tweaks state — defaults block (parsable JSON between EDITMODE markers)
  const [t, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "palette": "origin",
    "fonts": "classic",
    "brush": 30,
    "carSpeed": 1.0,
    "heroComp": "mountain",
    "lineUrl": "https://line.me/ti/p/fqUALJxqgs",
    "igUrl": "https://www.instagram.com/kenji.senzaki/"
  } /*EDITMODE-END*/);

  // Apply palette + fonts as CSS vars on :root
  useLayoutEffect(() => {
    const root = document.documentElement;
    const palette = PALETTES[t.palette] || PALETTES.origin;
    const fonts = FONTS[t.fonts] || FONTS.classic;
    Object.entries(palette.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    Object.entries(fonts.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    // brush intensity → flyaway opacity + edge scale
    const f = Math.max(0, Math.min(1, (t.brush ?? 50) / 100));
    root.style.setProperty('--brush-flyaway', String(0.15 + f * 0.7));
  }, [t.palette, t.fonts, t.brush]);

  // Hide splash after first paint
  useEffect(() => {
    const splash = document.getElementById('splash');
    if (splash) setTimeout(() => splash.classList.add('hidden'), 350);
  }, []);
  const isDesktop = useIsDesktop();
  const TOTAL = 8;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(BrushDefs, null), /*#__PURE__*/React.createElement(HamburgerNav, {
    total: TOTAL,
    lineUrl: t.lineUrl,
    isDesktop: isDesktop
  }), isDesktop ? /*#__PURE__*/React.createElement(HorizontalTrack, {
    total: TOTAL,
    carSpeed: t.carSpeed,
    heroComp: t.heroComp,
    lineUrl: t.lineUrl,
    igUrl: t.igUrl
  }) : /*#__PURE__*/React.createElement(MobileSite, {
    lineUrl: t.lineUrl,
    igUrl: t.igUrl
  }), /*#__PURE__*/React.createElement(TweaksUI, {
    t: t,
    setTweak: setTweak
  }));
}

// ─── Hamburger nav (top-left) ──────────────────────────────────
function HamburgerNav({
  total,
  lineUrl = '#',
  isDesktop = true
}) {
  const [open, setOpen] = useState(false);
  const jump = i => {
    if (isDesktop) {
      // Desktop: horizontal track — scroll body proportionally to panel index.
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({
        top: max * (i / (total - 1)),
        behavior: 'smooth'
      });
    } else {
      // Mobile: horizontal filmstrip — delegate to the offset map the mobile
      // component publishes (maps section index → body scroll position).
      if (typeof window.__mobileJump === 'function') window.__mobileJump(i);
    }
    setOpen(false);
  };
  const items = [{
    label: '服務特色',
    en: 'why abura',
    idx: 2
  }, {
    label: '阿布拉簡介',
    en: 'meet abura',
    idx: 4
  }, {
    label: '問題 FAQ',
    en: 'questions',
    idx: 6
  }];
  const line = [2.5, 24];
  return /*#__PURE__*/React.createElement("nav", {
    className: "fixed top-0 left-0 z-[60]",
    style: {
      padding: '2.4vh 2vw'
    },
    "aria-label": "\u4E3B\u9078\u55AE"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(o => !o),
    "aria-label": "\u5C55\u958B\u9078\u55AE",
    "aria-expanded": open,
    className: "flex flex-col items-center justify-center gap-[6px] rounded-2xl transition-all",
    style: {
      width: 54,
      height: 54,
      background: 'rgba(255,255,255,0.95)',
            boxShadow: '0 2px 8px rgba(60,50,35,0.14)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: line[1],
      height: line[0],
      background: 'var(--ink)',
      borderRadius: 2,
      transition: 'transform .35s ease, opacity .25s ease',
      transform: open ? 'translateY(8.5px) rotate(45deg)' : 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: line[1],
      height: line[0],
      background: 'var(--ink)',
      borderRadius: 2,
      transition: 'opacity .2s ease',
      opacity: open ? 0 : 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: line[1],
      height: line[0],
      background: 'var(--ink)',
      borderRadius: 2,
      transition: 'transform .35s ease',
      transform: open ? 'translateY(-8.5px) rotate(-45deg)' : 'none'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 overflow-hidden transition-all duration-300",
    style: {
      maxHeight: open ? 360 : 0,
      opacity: open ? 1 : 0,
      transform: open ? 'translateY(0)' : 'translateY(-8px)',
      pointerEvents: open ? 'auto' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl overflow-hidden",
    style: {
      background: 'rgba(255,255,255,0.97)',
            boxShadow: '0 2px 8px rgba(60,50,35,0.16)',
      minWidth: 232
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => jump(it.idx),
    className: "w-full text-left px-6 py-4 flex items-baseline gap-3 transition-colors",
    style: {
      borderBottom: '1px solid rgba(44,42,35,0.10)'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'rgba(217,133,74,0.10)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, /*#__PURE__*/React.createElement("span", {
    className: "zh font-semibold text-[1.15rem]",
    style: {
      color: 'var(--ink)'
    }
  }, it.label), /*#__PURE__*/React.createElement("span", {
    className: "en italic text-[0.8rem]",
    style: {
      color: 'var(--ink-soft)',
      opacity: .65
    }
  }, it.en))), /*#__PURE__*/React.createElement("a", {
    href: lineUrl,
    target: "_blank",
    rel: "noreferrer",
    className: "w-full text-left px-6 py-4 flex items-center gap-3",
    style: {
      background: '#06C755',
      color: '#FBFFF5'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("path", {
    fill: "currentColor",
    d: "M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08-.018.182-.058.351-.082.451-.06.298-.252 1.231 1.058.671 1.31-.561 7.115-4.186 9.717-7.176 1.815-1.985 2.176-3.991 2.176-5.224"
  })), /*#__PURE__*/React.createElement("span", {
    className: "zh font-bold text-[1.1rem] tracking-[0.06em]"
  }, "\u7ACB\u5373\u9810\u7D04")))));
}

// ─── Hooks ────────────────────────────────────────────────────────────
// Desktop = horizontal-scroll experience at ≥768px; below that a dedicated
// vertical mobile/tablet layout (MobileSite) takes over. Print build forces mobile.
function useIsDesktop() {
  const mq = '(min-width: 1024px)';
  const [is, set] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (window.__printMode) return false;
    return window.matchMedia(mq).matches;
  });
  useEffect(() => {
    if (typeof window !== 'undefined' && window.__printMode) {
      set(false);
      return;
    }
    const m = window.matchMedia(mq);
    const fn = () => set(m.matches);
    fn();
    m.addEventListener('change', fn);
    return () => m.removeEventListener('change', fn);
  }, []);
  return is;
}
function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const np = max > 0 ? window.scrollY / max : 0;
        setP(np);
        document.documentElement.style.setProperty('--scroll-progress', String(np));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, {
      passive: true
    });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return p;
}

// ─── Horizontal scroll track (desktop) ───────────────────────────────
function HorizontalTrack({
  total,
  carSpeed = 1,
  heroComp = 'mountain',
  lineUrl,
  igUrl
}) {
  const progress = useScrollProgress();
  // Use `left` (not transform) so html-to-image / Devtools can serialize panel layouts predictably.
  const trackLeft = `calc(var(--scroll-progress, 0) * -1 * (${total - 1} * 100vw))`;

  // Track scroll DIRECTION (true = forward / right, false = backward / left)
  const lastRef = useRef(0);
  const [facingRight, setFacingRight] = useState(true);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const np = max > 0 ? window.scrollY / max : 0;
      if (np > lastRef.current + 0.0005) setFacingRight(true);else if (np < lastRef.current - 0.0005) setFacingRight(false);
      lastRef.current = np;
    };
    window.addEventListener('scroll', onScroll, {
      passive: true
    });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Touch tablets in landscape see the desktop horizontal deck. We want the content
  // to FOLLOW the finger horizontally (drag right → deck moves right, drag left →
  // deck moves left) and vertical swipes to do NOTHING. So we disable native touch
  // scrolling (touch-action:none) and convert a horizontal finger-drag into the
  // (vertical-scroll-based) progress. Mouse-wheel scrolling is unaffected.
  useEffect(() => {
    const onlyCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (!onlyCoarse) return; // leave mouse/trackpad desktops on native wheel scroll
    const prevHtml = document.documentElement.style.touchAction;
    const prevBody = document.body.style.touchAction;
    document.documentElement.style.touchAction = 'none';
    document.body.style.touchAction = 'none';
    let sx = 0, startY = 0, vx = 0, lastX = 0, lastT = 0, dragging = false, mom = 0;
    const onStart = (e) => {
      const t = e.touches ? e.touches[0] : e;
      sx = t.clientX; startY = window.scrollY; dragging = true;
      lastX = t.clientX; lastT = performance.now(); vx = 0;
      cancelAnimationFrame(mom);
    };
    const onMove = (e) => {
      if (!dragging) return;
      const t = e.touches ? e.touches[0] : e;
      const dx = t.clientX - sx;
      const k = window.innerHeight / Math.max(1, window.innerWidth);
      window.scrollTo(0, startY - dx * k);
      const now = performance.now();
      if (now > lastT) { vx = (t.clientX - lastX) / (now - lastT); lastX = t.clientX; lastT = now; }
      if (e.cancelable) e.preventDefault();
    };
    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      const k = window.innerHeight / Math.max(1, window.innerWidth);
      let v = vx * 16; // flick momentum
      const step = () => {
        v *= 0.92;
        window.scrollBy(0, -v * k);
        if (Math.abs(v) > 0.4) mom = requestAnimationFrame(step);
      };
      if (Math.abs(vx) > 0.05) mom = requestAnimationFrame(step);
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      cancelAnimationFrame(mom);
      document.documentElement.style.touchAction = prevHtml;
      document.body.style.touchAction = prevBody;
    };
  }, []);

  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      height: `${total * 100}vh`,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(ContinuousSky, {
    total: total,
    heroComp: heroComp
  }), /*#__PURE__*/React.createElement(ContinuousLandscape, {
    total: total,
    progress: progress
  }), /*#__PURE__*/React.createElement(CarLayer, {
    progress: progress,
    speed: carSpeed,
    lineUrl: lineUrl,
    facingRight: facingRight
  }), /*#__PURE__*/React.createElement("main", {
    className: "flex h-screen absolute top-0",
    style: {
      width: `${total * 100}vw`,
      left: trackLeft,
      willChange: 'left',
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement(HeroSection, {
    idx: 0,
    total: total
  }), /*#__PURE__*/React.createElement(PainSection, {
    idx: 1,
    total: total,
    progress: progress
  }), /*#__PURE__*/React.createElement(WhySection, {
    idx: 2,
    total: total,
    progress: progress
  }), /*#__PURE__*/React.createElement(TestimonialsSection, {
    idx: 3,
    total: total,
    progress: progress
  }), /*#__PURE__*/React.createElement(AboutSection, {
    idx: 4,
    total: total,
    progress: progress
  }), /*#__PURE__*/React.createElement(ForWhoSection, {
    idx: 5,
    total: total,
    progress: progress
  }), /*#__PURE__*/React.createElement(FaqSection, {
    idx: 6,
    total: total
  }), /*#__PURE__*/React.createElement(CtaSection, {
    idx: 7,
    total: total,
    lineUrl: lineUrl,
    igUrl: igUrl
  })), /*#__PURE__*/React.createElement(ProgressRail, {
    progress: progress,
    total: total
  }))), /*#__PURE__*/React.createElement(FloatingLineCta, {
    lineUrl: lineUrl,
    show: progress > 0.08 && progress < 0.9
  }));
}

// ─── Sky (back layer) — pure white, no sun/clouds per request ─────────
function ContinuousSky({
  total,
  heroComp = 'mountain'
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 pointer-events-none",
    style: {
      zIndex: 1,
      background: 'var(--paper)'
    },
    "aria-hidden": true
  });
}

// ─── Continuous landscape strip (provided panorama) ───────────────────
function ContinuousLandscape({
  total,
  progress = 0
}) {
  // Hidden during hero; fades in as soon as we leave the hero (panel 02 enters).
  const appear = Math.max(0, Math.min(1, (progress - 0.035) / 0.04));
  return /*#__PURE__*/React.createElement("div", {
    className: "absolute left-0 right-0 bottom-0 pointer-events-none",
    "aria-hidden": true,
    style: {
      height: '20vh',
      backgroundImage: `url(${window.__asset('landscapeBand', 'asset/landscape-band.webp')})`,
      backgroundRepeat: 'repeat-x',
      backgroundSize: 'auto 100%',
      backgroundPositionY: 'bottom',
      backgroundPositionX: 'calc(var(--scroll-progress, 0) * -150vw)',
      opacity: appear,
      visibility: appear <= 0.01 ? 'hidden' : 'visible',
      zIndex: 3,
      willChange: 'background-position'
    }
  });
}

// ─── The car layer — fixed on screen with subtle motion ───────────────
function CarLayer({
  progress,
  speed = 1,
  lineUrl = '#',
  facingRight = true
}) {
  // No vertical bounce — straight-line travel only.
  const bounceY = 0;
  // Car always small — drives along the road (progress rail)
  const widthPx = 130;
  // Moves horizontally with scroll progress (left → right), in a straight line.
  const baseLeft = 18 + progress * 60; // sweeps 18% … 78% across the viewport
  // Car only appears from the Pain section (panel 02) onward — hidden during hero.
  // Panel 02 begins at progress = 1/(total-1) ≈ 0.143.
  // Car appears as soon as the hero leaves — in step with the capsules.
  const appear = Math.max(0, Math.min(1, (progress - 0.035) / 0.04));
  const opacity = appear; // fully solid once visible
  const bottomVh = 1.4; // rides along the bottom progress rail (the "road")
  const dx = 0;
  // Flip horizontally based on scroll direction. The source PNG faces LEFT (front bumper on left),
  // so when facingRight (forward scroll) we apply scaleX(-1) to flip → front on the right.
  const scaleX = facingRight ? -1 : 1;
  return /*#__PURE__*/React.createElement("div", {
    className: "absolute pointer-events-none",
    style: {
      left: `calc(${baseLeft}% + ${dx}vw)`,
      bottom: `${bottomVh}vh`,
      width: `${widthPx}px`,
      transform: `translate3d(0, ${bounceY}px, 0)`,
      zIndex: 41,
      opacity,
      visibility: opacity <= 0.01 ? 'hidden' : 'visible'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative",
    style: {
      transform: `scaleX(${scaleX})`,
      transition: 'transform 380ms ease'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: window.__asset('carSide', 'asset/car-side.webp'),
    alt: "\u963F\u5E03\u62C9\u7684 Subaru Forester \u5074\u9762\u63D2\u756B\uFF08\u88DD\u98FE\u52D5\u756B\uFF09",
    "aria-hidden": "true",
    className: "w-full h-auto select-none block",
    draggable: false,
    style: {
      filter: `drop-shadow(0 2px 4px rgba(60,40,20,.25))`
    }
  }), /*#__PURE__*/React.createElement("svg", {
    className: "absolute pointer-events-none",
    style: {
      left: '-30%',
      bottom: '6%',
      width: '55%',
      height: '38%'
    },
    viewBox: "0 0 200 60",
    "aria-hidden": true
  }, [0, 1, 2, 3].map(i => /*#__PURE__*/React.createElement("ellipse", {
    key: i,
    cx: 20 + i * 40 + Math.sin((progress * 12 + i) * Math.PI) * 5,
    cy: 35 + i * 2,
    rx: 14 - i * 2.5,
    ry: 4 - i * 0.5,
    fill: "#D8CFB8",
    opacity: 0.55 - i * 0.12,
    filter: "url(#flyAwayDry)"
  })))));
}

// ─── Floating LINE CTA — icon-only rounded square ─────────────────────
function FloatingLineCta({
  lineUrl = '#',
  show = true
}) {
  return /*#__PURE__*/React.createElement("a", {
    href: lineUrl,
    target: "_blank",
    rel: "noreferrer",
    "aria-label": "\u7ACB\u5373\u9810\u7D04",
    className: "fixed pointer-events-auto group",
    style: {
      right: 'max(3.5vw, 16px)',
      bottom: '13vh',
      zIndex: 45,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 7,
      textDecoration: 'none',
      opacity: show ? 1 : 0,
      transform: show ? 'translateY(0)' : 'translateY(14px)',
      transition: 'opacity .45s ease, transform .45s ease',
      pointerEvents: show ? 'auto' : 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "zh font-bold",
    style: {
      fontFamily: 'var(--serif-zh)',
      fontSize: 'clamp(0.8rem, 2.4vw, 0.95rem)',
      color: 'var(--ink)',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
      background: 'rgba(253,251,246,.93)',
      padding: '3px 11px',
      borderRadius: 999,
      boxShadow: '0 1px 5px rgba(60,50,35,.16)'
    }
  }, "\u7ACB\u5373\u9810\u7D04"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center transition-transform duration-300 group-hover:scale-105",
    style: {
      width: 60,
      height: 60,
      borderRadius: 16,
      background: '#06C755',
      filter: 'drop-shadow(0 2px 5px rgba(40,20,10,.2))'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: 42,
    height: 42,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    style: {
      color: '#FBFFF5'
    }
  }, /*#__PURE__*/React.createElement("path", {
    fill: "currentColor",
    d: "M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.63V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"
  }))));
}

// ─── Bottom progress rail ─────────────────────────────────────────────
const PANEL_LABELS = ['ABOUT', 'PAIN', 'WHY', 'VOICES', 'MEET', 'WHOM', 'FAQ', 'BOOK'];
function ProgressRail({
  progress,
  total
}) {
  const currentIdx = Math.round(progress * (total - 1));
  const jumpTo = idx => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({
      top: max * (idx / (total - 1)),
      behavior: 'smooth'
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "absolute left-0 right-0 z-40",
    style: {
      bottom: '2.2vh',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mx-auto",
    style: {
      width: 'min(80vw, 900px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 text-[0.7rem] mix tracking-[0.3em] uppercase",
    style: {
      color: 'var(--ink-soft)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "en italic",
    style: {
      color: 'var(--persimmon)'
    }
  }, String(currentIdx + 1).padStart(2, '0')), /*#__PURE__*/React.createElement("div", {
    className: "relative flex-1 h-[2px]",
    style: {
      background: 'rgba(44,42,35,0.15)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute left-0 top-0 bottom-0",
    style: {
      width: `${progress * 100}%`,
      background: 'var(--persimmon)',
      height: 2
    }
  }), Array.from({
    length: total
  }).map((_, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => jumpTo(i),
    "aria-label": `go to panel ${i + 1}`,
    className: "absolute top-1/2 rounded-full transition-all",
    style: {
      left: `${i / (total - 1) * 100}%`,
      width: i === currentIdx ? 12 : 8,
      height: i === currentIdx ? 12 : 8,
      background: i <= currentIdx ? 'var(--persimmon)' : 'var(--paper)',
      border: '1.5px solid var(--persimmon)',
      transform: 'translate(-50%, -50%)',
      cursor: 'pointer',
      pointerEvents: 'auto',
      padding: 0
    }
  }))), /*#__PURE__*/React.createElement("span", {
    className: "en italic"
  }, String(total).padStart(2, '0')))));
}

// ─── Mobile vertical layout lives in mobile.jsx (window.MobileSite) ───

// ─── Tweaks panel ─────────────────────────────────────────────────────
function TweaksUI({
  t,
  setTweak
}) {
  return /*#__PURE__*/React.createElement(TweaksPanel, {
    title: "Tweaks \xB7 \u963F\u5E03\u62C9"
  }, /*#__PURE__*/React.createElement(TweakSection, {
    label: "\u8272\u7968  Palette"
  }), /*#__PURE__*/React.createElement(TweakRadio, {
    label: PALETTES[t.palette]?.sub || 'palette',
    value: t.palette,
    options: Object.entries(PALETTES).map(([k, v]) => ({
      value: k,
      label: v.label
    })),
    onChange: v => setTweak('palette', v)
  }), /*#__PURE__*/React.createElement(TweakSection, {
    label: "\u5B57\u9AD4  Typography"
  }), /*#__PURE__*/React.createElement(TweakRadio, {
    label: FONTS[t.fonts]?.sub || 'fonts',
    value: t.fonts,
    options: Object.entries(FONTS).map(([k, v]) => ({
      value: k,
      label: v.label
    })),
    onChange: v => setTweak('fonts', v)
  }), /*#__PURE__*/React.createElement(TweakSection, {
    label: "\u52D5\u614B  Motion"
  }), /*#__PURE__*/React.createElement(TweakSlider, {
    label: "\u98DB\u767D\u5F37\u5EA6",
    value: t.brush,
    min: 0,
    max: 100,
    step: 5,
    unit: "%",
    onChange: v => setTweak('brush', v)
  }), /*#__PURE__*/React.createElement(TweakSlider, {
    label: "\u8ECA\u901F",
    value: t.carSpeed,
    min: 0.3,
    max: 2.2,
    step: 0.1,
    unit: "\xD7",
    onChange: v => setTweak('carSpeed', v)
  }), /*#__PURE__*/React.createElement(TweakSection, {
    label: "Hero \u69CB\u5716  Backdrop"
  }), /*#__PURE__*/React.createElement(TweakRadio, {
    label: HERO_COMPS[t.heroComp]?.sub || 'backdrop',
    value: t.heroComp,
    options: Object.entries(HERO_COMPS).map(([k, v]) => ({
      value: k,
      label: v.label
    })),
    onChange: v => setTweak('heroComp', v)
  }), /*#__PURE__*/React.createElement(TweakSection, {
    label: "\u9023\u7D50  Links"
  }), /*#__PURE__*/React.createElement(TweakText, {
    label: "LINE",
    value: t.lineUrl,
    onChange: v => setTweak('lineUrl', v),
    placeholder: "https://line.me/..."
  }), /*#__PURE__*/React.createElement(TweakText, {
    label: "Instagram",
    value: t.igUrl,
    onChange: v => setTweak('igUrl', v),
    placeholder: "https://instagram.com/..."
  }));
}

// ─── Mount ────────────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(/*#__PURE__*/React.createElement(App, null));