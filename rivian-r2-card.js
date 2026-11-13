/*
 * Rivian R2 Card for Home Assistant
 * https://github.com/jabella/rivian-r2-card
 *
 * Requires the Rivian (Unofficial) integration:
 * https://github.com/bretterer/home-assistant-rivian
 *
 * No other frontend dependencies (no card_mod, no bar-card).
 * MIT License.
 */

const CARD_VERSION = "0.1.2";

/* ------------------------------------------------------------------ *
 * Closure schematic
 *
 * A top-down diagram drawn in code (viewBox 0 0 100 220, front at the
 * top), so it lines up exactly for every owner and needs no tracing.
 * Doors swing out from their front hinge when open; other closures
 * light up in place.
 * ------------------------------------------------------------------ */
const BODY = "M24 8 Q50 2 76 8 Q86 12 87 30 L88 196 Q87 212 74 216 Q50 220 26 216 Q13 212 12 196 L13 30 Q14 12 24 8 Z";
const CABIN = "M27 70 Q50 64 73 70 L72 176 Q50 180 28 176 Z";
const SCHEMATIC = [
  { id: "frunk",        key: "binary_sensor.closure_frunk_closed",      label: "Frunk",
    d: "M26 13 Q50 7 74 13 Q78 30 76 52 Q50 56 24 52 Q22 30 26 13 Z" },
  { id: "windshield",   d: "M26 58 Q50 54 74 58 L72 70 Q50 66 28 70 Z", glass: true },
  { id: "rear_glass",   key: "binary_sensor.window_rear_closed",        label: "Rear glass",
    d: "M29 178 Q50 182 71 178 L73 190 Q50 194 27 190 Z", glass: true },
  { id: "liftgate",     key: "binary_sensor.closure_liftgate_closed",   label: "Liftgate",
    d: "M25 193 Q50 197 75 193 L76 204 Q74 212 50 214 Q26 212 24 204 Z" },
  { id: "door_fl",      key: "binary_sensor.door_front_left_closed",    label: "Driver door",
    d: "M12 78 L18 78 L18 124 L12 124 Z", hinge: [12, 78], swing: 35 },
  { id: "door_rl",      key: "binary_sensor.door_rear_left_closed",     label: "Rear left door",
    d: "M12 127 L18 127 L18 168 L12 168 Z", hinge: [12, 127], swing: 35 },
  { id: "door_fr",      key: "binary_sensor.door_front_right_closed",   label: "Passenger door",
    d: "M82 78 L88 78 L88 124 L82 124 Z", hinge: [88, 78], swing: -35 },
  { id: "door_rr",      key: "binary_sensor.door_rear_right_closed",    label: "Rear right door",
    d: "M82 127 L88 127 L88 168 L82 168 Z", hinge: [88, 127], swing: -35 },
  { id: "win_fl",       key: "binary_sensor.window_front_left_closed",  label: "Driver window",
    d: "M20 82 L25 82 L25 120 L20 120 Z", glass: true },
  { id: "win_rl",       key: "binary_sensor.window_rear_left_closed",   label: "Rear left window",
    d: "M20 131 L25 131 L25 164 L20 164 Z", glass: true },
  { id: "win_fr",       key: "binary_sensor.window_front_right_closed", label: "Passenger window",
    d: "M75 82 L80 82 L80 120 L75 120 Z", glass: true },
  { id: "win_rr",       key: "binary_sensor.window_rear_right_closed",  label: "Rear right window",
    d: "M75 131 L80 131 L80 164 L75 164 Z", glass: true },
];

/* Overlays traced on the integration's R2 overhead render (same canvas for
   the light and dark versions), in that image's pixel space. The card crops
   to the car's box so the shapes stay aligned at any display size. */
const OVERHEAD = {
  canvas: [516, 1173],
  box: [37, 42, 450, 961], // x, y, w, h of the car within the canvas
  shapes: {
    liftgate: { d: "M95.5 799.3 L428.5 799.3 L433.0 935.7 L415.0 988.6 L262.0 999.2 L109.0 988.6 L91.0 935.7 Z" },
    rear_glass: { d: "M106.8 806.0 L417.2 806.0 L419.5 933.8 L104.5 933.8 Z" },
    frunk: { d: "M154.0 57.4 L370.0 57.4 L372.2 229.4 L363.2 237.1 L160.8 237.1 L151.8 229.4 Z" },
    win_fl: { d: "M93.2 445.6 L114.4 445.6 L116.2 557.1 L93.7 557.1 Z" },
    win_rl: { d: "M93.7 570.5 L116.2 570.5 L118.0 733.9 L94.6 733.9 Z" },
    win_fr: { d: "M409.6 445.6 L430.8 445.6 L430.3 557.1 L407.8 557.1 Z" },
    win_rr: { d: "M407.8 570.5 L430.3 570.5 L429.4 733.9 L406.0 733.9 Z" },
    door_fl: { d: "M70.8 339.9 L113.5 339.9 L115.8 560.9 L69.4 560.9 Z", hinge: [70.8, 339.9], swing: 35 },
    door_rl: { d: "M69.4 564.8 L115.8 564.8 L118.0 762.8 L70.3 762.8 Z", hinge: [69.4, 564.8], swing: 35 },
    door_fr: { d: "M410.5 339.9 L453.2 339.9 L454.6 560.9 L408.2 560.9 Z", hinge: [453.2, 339.9], swing: -35 },
    door_rr: { d: "M408.2 564.8 L454.6 564.8 L453.7 762.8 L406.0 762.8 Z", hinge: [454.6, 564.8], swing: -35 },
  },
};

/* Entity roles → "<domain>.<translation_key>" from the integration */
const ROLES = {
  lock:            ["lock.closures", "binary_sensor.locked_state"],
  soc:             ["sensor.battery_level"],
  range:           ["sensor.distance_to_empty"],
  odometer:        ["sensor.vehicle_mileage"],
  charging:        ["binary_sensor.charger_state"],
  plugged:         ["binary_sensor.charger_status"],
  limit:           ["number.charge_limit", "sensor.battery_limit"],
  elapsed:         ["sensor.charging_time_elapsed"],
  remaining:       ["sensor.time_to_end_of_charge"],
  rate:            ["sensor.charging_rate", "sensor.power"],
  cost:            ["sensor.charging_cost"],
  energy:          ["sensor.charging_energy_delivered"],
  range_added:     ["sensor.charging_range_added"],
  cabin_temp:      ["sensor.cabin_temperature"],
  preconditioning: ["binary_sensor.cabin_preconditioning_status"],
  power_state:     ["sensor.power_state"],
};

const ON = "on";

class RivianR2Card extends HTMLElement {
  static getStubConfig(hass) {
    const dev = RivianR2Card._findDevice(hass);
    return { view: "status", ...(dev ? { device_id: dev } : {}) };
  }

  static _findDevice(hass, preferred) {
    if (!hass?.devices) return undefined;
    if (preferred && hass.devices[preferred]) return preferred;
    const rivian = Object.values(hass.devices).filter(
      (d) => (d.manufacturer || "").toLowerCase() === "rivian"
    );
    const r2 = rivian.find((d) => /\bR2\b/i.test(d.model || ""));
    return (r2 || rivian[0])?.id;
  }

  setConfig(config) {
    if (config.view && !["overhead", "status", "charging"].includes(config.view)) {
      throw new Error("view must be 'status' or 'charging'");
    }
    this._config = {
      view: "status",
      show_status: true,
      ...config,
    };
    this._sig = undefined;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._resolve();
    const sig = this._signature();
    if (sig === this._sig) return;
    this._sig = sig;
    this._render();
  }

  getCardSize() {
    return this._config?.view === "charging" ? 4 : 5;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  /* -------------------------------------------------------------- */

  _resolve() {
    const hass = this._hass;
    const deviceId = RivianR2Card._findDevice(hass, this._config.device_id);
    if (deviceId === this._deviceId && this._map) return;
    this._deviceId = deviceId;
    this._map = {};
    this._images = [];
    this._tracker = undefined;
    if (!deviceId || !hass.entities) return;

    for (const ent of Object.values(hass.entities)) {
      if (ent.device_id !== deviceId) continue;
      const domain = ent.entity_id.split(".")[0];
      if (domain === "image") this._images.push(ent.entity_id);
      if (domain === "device_tracker") this._tracker = ent.entity_id;
      if (ent.translation_key) this._map[`${domain}.${ent.translation_key}`] = ent.entity_id;
    }
  }

  /* Look up an entity: explicit config override → translation_key map */
  _eid(roleOrKey) {
    const override = this._config.entities?.[roleOrKey];
    if (override) return override;
    const keys = ROLES[roleOrKey] || [roleOrKey];
    for (const k of keys) if (this._map?.[k]) return this._map[k];
    return undefined;
  }

  _st(roleOrKey) {
    const id = this._eid(roleOrKey);
    return id ? this._hass.states[id] : undefined;
  }

  _isOn(roleOrKey) {
    return this._st(roleOrKey)?.state === ON;
  }

  _fmt(stateObj, fallback = "—") {
    if (!stateObj || ["unavailable", "unknown"].includes(stateObj.state)) return fallback;
    if (this._hass.formatEntityState) return this._hass.formatEntityState(stateObj);
    const u = stateObj.attributes.unit_of_measurement;
    return u ? `${stateObj.state} ${u}` : stateObj.state;
  }

  _num(roleOrKey) {
    const v = parseFloat(this._st(roleOrKey)?.state);
    return Number.isFinite(v) ? v : undefined;
  }

  _darkMode() {
    if (this._config.theme === "dark") return true;
    if (this._config.theme === "light") return false;
    return !!this._hass.themes?.darkMode;
  }

  /* Pick a vehicle render. `prefer` overrides the alias list for a placement.
     Exact placement names (image.<car>_<placement>_<light|dark>) win over
     substring matches, so "side" doesn't grab "side_charging". */
  _image(placement, prefer) {
    const override = this._config[`${placement}_image`];
    let id = override;
    if (!id) {
      const want = this._darkMode() ? "dark" : "light";
      const exact = (p) => this._images.filter((e) => e.endsWith(`_${p}_dark`) || e.endsWith(`_${p}_light`));
      const fuzzy = (p) => this._images.filter((e) => e.includes(p));
      const ALIASES = {
        hero: [this._config.hero, "three_quarter", "threequarter", "quarter", "front", "side"],
        side: ["side", "profile"],
        overhead: ["overhead", "top"],
      };
      const aliases = (prefer || ALIASES[placement] || [placement]).filter(Boolean);
      for (const find of [exact, fuzzy]) {
        for (const a of aliases) {
          const hits = find(a);
          id = hits.find((e) => e.endsWith(want)) || hits[0];
          if (id) break;
        }
        if (id) break;
      }
    }
    if (!id) return undefined;
    if (id.startsWith("http") || id.startsWith("/")) return id;
    return this._hass.states[id]?.attributes?.entity_picture;
  }

  /* Integration renders sit on a large transparent canvas. Measure the
     opaque area once per URL and crop to it so the car fills the card. */
  _vehicleImg(src) {
    const t = (this._trim ||= {})[src];
    if (!t) return `<div class="crop"><img class="vehicle" src="${src}" alt="" data-trim></div>`;
    return `<div class="crop" style="aspect-ratio:${t.w} / ${t.h}">
      <img class="vehicle trimmed" src="${src}" alt=""
        style="width:${t.sw}%;margin-left:-${t.sx}%;margin-top:-${t.sy}%"></div>`;
  }

  _measure(img) {
    const src = img.getAttribute("src");
    try {
      const W = 240, H = Math.round((W * img.naturalHeight) / img.naturalWidth);
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, W, H);
      const px = ctx.getImageData(0, 0, W, H).data;
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          if (px[(y * W + x) * 4 + 3] > 16) {
            if (x < x0) x0 = x; if (x > x1) x1 = x;
            if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
      if (x1 < 0) return; // fully transparent or opaque edge case
      const pad = 2;
      x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
      x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      if (bw > W * 0.97 && bh > H * 0.97) return; // nothing worth trimming
      (this._trim ||= {})[src] = {
        w: bw, h: bh,
        sw: ((W / bw) * 100).toFixed(2),
        sx: ((x0 / bw) * 100).toFixed(2),
        sy: ((y0 / bw) * 100).toFixed(2), // margin % is relative to width
      };
      this._render();
    } catch (e) {
      /* cross-origin image: leave it untrimmed */
    }
  }

  _signature() {
    if (!this._map) return "";
    const ids = new Set(Object.values(this._map));
    if (this._tracker) ids.add(this._tracker);
    let s = `${this._deviceId}|${this._darkMode()}|`;
    for (const id of ids) {
      const st = this._hass.states[id];
      if (st) s += `${st.state};${st.attributes.entity_picture || ""}|`;
    }
    return s;
  }

  _moreInfo(entityId) {
    if (!entityId) return;
    const ev = new Event("hass-more-info", { bubbles: true, composed: true });
    ev.detail = { entityId };
    this.dispatchEvent(ev);
  }

  /* -------------------------------------------------------------- */

  _render() {
    if (!this.shadowRoot || !this._config || !this._hass) return;
    if (!this._deviceId) {
      this.shadowRoot.innerHTML = `${STYLE}<ha-card><div class="empty">
        No Rivian vehicle found. Install the Rivian (Unofficial) integration
        or set <code>device_id</code>.</div></ha-card>`;
      return;
    }
    const body = this._config.view === "charging" ? this._renderCharging() : this._renderOverhead();
    this.shadowRoot.innerHTML = `${STYLE}<ha-card>${this._header()}${body}</ha-card>`;
    this.shadowRoot.querySelectorAll("[data-entity]").forEach((el) =>
      el.addEventListener("click", () => this._moreInfo(el.dataset.entity))
    );
    this.shadowRoot.querySelectorAll("img[data-trim]").forEach((img) => {
      if (img.complete && img.naturalWidth) this._measure(img);
      else img.addEventListener("load", () => this._measure(img), { once: true });
    });
  }

  _header() {
    if (this._config.title === false) return "";
    const name =
      this._config.title ||
      this._hass.devices?.[this._deviceId]?.name_by_user ||
      this._hass.devices?.[this._deviceId]?.name ||
      "R2";
    return `<div class="header"><span class="name">${esc(name)}</span>${this._powerBadge()}</div>`;
  }

  _powerBadge() {
    const p = this._st("power_state");
    if (!p || ["unavailable", "unknown"].includes(p.state)) return "";
    return `<span class="badge" data-entity="${p.entity_id}">${esc(this._fmt(p))}</span>`;
  }

  _renderOverhead() {
    const hero = this._config.hero === "none" ? undefined : this._image("hero");
    const top = this._image("overhead");
    const unlocked = this._lockState() === "unlocked";
    const openList = SCHEMATIC.filter((p) => p.key && this._isOn(p.key)).map((p) => p.label);

    return `
      ${hero ? `<div class="stage hero">${this._vehicleImg(hero)}</div>` : ""}
      <div class="row">
        ${top ? this._overheadImage(top, unlocked) : this._schematic(unlocked)}
        <div class="side">
          <div class="summary ${openList.length ? "warn" : ""}">${
            openList.length ? `Open: ${openList.map(esc).join(", ")}` : "All closed"}</div>
          ${this._config.show_status ? this._statusRow() : ""}
        </div>
      </div>`;
  }

  _partState(p) {
    const id = p.key ? this._eid(p.key) : undefined;
    const st = id ? this._hass.states[id] : undefined;
    return { id, open: st?.state === ON, missing: !!p.key && !st };
  }

  _schematic(unlocked) {
    const parts = SCHEMATIC.map((p) => {
      const { id, open, missing } = this._partState(p);
      const cls = ["part", p.glass ? "glass" : "panel", open ? "open" : "", missing ? "na" : ""].join(" ");
      const tf = open && p.hinge ? ` transform="rotate(${p.swing} ${p.hinge[0]} ${p.hinge[1]})"` : "";
      const title = p.label ? `<title>${p.label}${open ? " open" : missing ? " (no sensor)" : ""}</title>` : "";
      return `<path class="${cls}" d="${p.d}"${tf}${id ? ` data-entity="${id}"` : ""}>${title}</path>`;
    }).join("");
    return `<svg class="schematic ${unlocked ? "unlocked" : ""}" viewBox="-14 -4 128 228">
      <path class="body" d="${BODY}"/><path class="cabin" d="${CABIN}"/>${parts}</svg>`;
  }

  _overheadImage(src, unlocked) {
    const [cw] = OVERHEAD.canvas;
    const [bx, by, bw, bh] = OVERHEAD.box;
    const parts = SCHEMATIC.filter((p) => OVERHEAD.shapes[p.id]).map((p) => {
      const { id, open } = this._partState(p);
      if (!open) return id ? `<path class="hit" d="${OVERHEAD.shapes[p.id].d}" data-entity="${id}"><title>${p.label}</title></path>` : "";
      const sh = OVERHEAD.shapes[p.id];
      const swung = sh.hinge
        ? `<path class="ov open" d="${sh.d}" transform="rotate(${sh.swing} ${sh.hinge[0]} ${sh.hinge[1]})"/>`
        : "";
      return `<path class="ov ${sh.hinge ? "gap" : "open"}" d="${sh.d}" data-entity="${id}"><title>${p.label} open</title></path>${swung}`;
    }).join("");
    return `<div class="topview ${unlocked ? "unlocked" : ""}" style="aspect-ratio:${bw} / ${bh}">
      <img src="${src}" alt="" style="width:${(cw / bw) * 100}%;margin-left:-${(bx / bw) * 100}%;margin-top:-${(by / bw) * 100}%">
      <svg viewBox="${bx} ${by} ${bw} ${bh}">${parts}</svg>
    </div>`;
  }

  _lockState() {
    const l = this._st("lock");
    if (!l) return undefined;
    if (l.entity_id.startsWith("lock.")) return l.state; // locked / unlocked / locking…
    return l.state === ON ? "unlocked" : "locked"; // binary_sensor.lock: on = unlocked
  }

  _statusRow() {
    const lockId = this._eid("lock");
    const lockState = this._lockState();
    const charging = this._isOn("charging");
    const plugged = this._isOn("plugged");
    const tracker = this._tracker ? this._hass.states[this._tracker] : undefined;

    const chips = [];
    if (lockId) {
      const locked = lockState === "locked";
      chips.push(chip(lockId, locked ? "mdi:lock" : "mdi:lock-open-variant",
        locked ? "Locked" : "Unlocked", locked ? "" : "warn"));
    }
    if (tracker) {
      const home = tracker.state === "home";
      chips.push(chip(tracker.entity_id, home ? "mdi:home" : "mdi:map-marker",
        this._fmt(tracker)));
    }
    const soc = this._st("soc");
    if (soc) {
      const icon = charging ? "mdi:battery-charging" : plugged ? "mdi:power-plug" : "mdi:battery";
      const range = this._st("range");
      chips.push(chip(soc.entity_id, icon,
        `${this._fmt(soc)}${range ? ` · ${this._fmt(range)}` : ""}`, charging ? "charging" : ""));
    }
    const odo = this._st("odometer");
    if (odo) chips.push(chip(odo.entity_id, "mdi:counter", this._fmt(odo)));
    if (this._isOn("preconditioning")) {
      const cab = this._st("cabin_temp");
      chips.push(chip(this._eid("preconditioning"), "mdi:fan",
        cab ? this._fmt(cab) : "Preconditioning", "active"));
    }
    return `<div class="status">${chips.join("")}</div>${soc ? this._socBar() : ""}`;
  }

  _socBar() {
    const soc = this._num("soc");
    if (soc === undefined) return "";
    const limit = this._num("limit");
    const charging = this._isOn("charging");
    const level = soc <= 15 ? "low" : soc <= 30 ? "mid" : "ok";
    return `<div class="bar ${level} ${charging ? "charging" : ""}" data-entity="${this._eid("soc")}">
      <div class="fill" style="width:${clamp(soc)}%"></div>
      ${limit !== undefined ? `<div class="limit" style="left:${clamp(limit)}%" title="Limit ${limit}%"></div>` : ""}
    </div>`;
  }

  _renderCharging() {
    const plugged = this._isOn("plugged");
    const charging = this._isOn("charging");
    // Rivian's "side_charging" render shows a cable in the port; use the
    // matching cable-free "side_rear" render when the car isn't plugged in.
    const img = this._image("side", plugged || charging
      ? ["side_charging", "side_rear", "side", "profile"]
      : ["side_rear", "side", "profile"]);

    const stat = (role, icon, label) => {
      const st = this._st(role);
      if (!st) return "";
      return `<div class="stat" data-entity="${st.entity_id}">
        <ha-icon icon="${icon}"></ha-icon>
        <div class="v">${esc(this._fmt(st))}</div><div class="l">${label}</div></div>`;
    };

    const stats = plugged
      ? [
          stat("limit", "mdi:battery-lock", "limit"),
          stat("rate", "mdi:speedometer", "rate"),
          stat("elapsed", "mdi:clock-start", "elapsed"),
          stat("remaining", "mdi:clock-end", "remaining"),
          stat("energy", "mdi:lightning-bolt", "delivered"),
          stat("range_added", "mdi:map-marker-distance", "added"),
          stat("cost", "mdi:cash", "cost"),
        ].join("")
      : [stat("range", "mdi:map-marker-distance", "range"), stat("limit", "mdi:battery-lock", "limit")].join("");

    const soc = this._st("soc");
    const stateLabel = charging ? "Charging" : plugged ? "Plugged in" : "Unplugged";
    const stateIcon = charging ? "mdi:ev-station" : plugged ? "mdi:power-plug" : "mdi:power-plug-off";

    return `
      <div class="stage side">
        ${img ? this._vehicleImg(img) : ""}
      </div>
      <div class="charge-head">
        <span class="cstate ${charging ? "charging" : ""}" data-entity="${this._eid("plugged") || ""}">
          <ha-icon icon="${stateIcon}"></ha-icon>${stateLabel}</span>
        ${soc ? `<span class="socbig" data-entity="${soc.entity_id}">${esc(this._fmt(soc))}</span>` : ""}
      </div>
      ${this._socBar()}
      <div class="stats">${stats}</div>`;
  }
}

function chip(entity, icon, text, cls = "") {
  return `<button class="chip ${cls}" data-entity="${entity}">
    <ha-icon icon="${icon}"></ha-icon><span>${esc(text)}</span></button>`;
}
function clamp(v) {
  return Math.max(0, Math.min(100, v));
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const STYLE = `<style>
  :host { --r2-open: var(--error-color, #db4437); --r2-ok: var(--success-color, #43a047);
          --r2-warn: var(--warning-color, #ffa600); --r2-accent: #ffb600; }
  ha-card { padding: 12px 16px 16px; overflow: hidden; }
  .empty { padding: 16px; color: var(--secondary-text-color); }
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
  .name { font-size: 1.15em; font-weight: 500; }
  .badge { font-size: .8em; padding: 2px 8px; border-radius: 10px; cursor: pointer;
           background: var(--secondary-background-color); color: var(--secondary-text-color); }
  .stage { position: relative; margin: 0 auto; }
  .stage.hero, .stage.side { width: 100%; }
  .crop { overflow: hidden; width: 100%; max-width: 480px; margin: 0 auto; }
  .vehicle { display: block; width: 100%; height: auto; }
  .row { display: flex; gap: 14px; align-items: center; margin-top: 8px; }
  .side { flex: 1; min-width: 0; }
  .schematic { flex: 0 0 auto; width: 88px; height: auto; overflow: visible; }
  .schematic .body { fill: var(--secondary-background-color); stroke: var(--divider-color); stroke-width: 1.2; }
  .schematic .cabin { fill: none; stroke: var(--divider-color); stroke-width: .8; }
  .schematic.unlocked .body { stroke: var(--r2-open); stroke-width: 2; }
  .part { cursor: pointer; stroke-width: 1; transition: transform .3s, fill .3s; }
  .part.panel { fill: var(--secondary-background-color); stroke: var(--divider-color); }
  .part.glass { fill: var(--state-icon-color); fill-opacity: .25; stroke: none; }
  .part.na { opacity: .35; }
  .part.open { fill: var(--r2-open); fill-opacity: .8; stroke: var(--r2-open); animation: pulse 1.6s ease-in-out infinite; }
  .topview { position: relative; flex: 0 0 auto; width: 96px; min-height: 0; overflow: visible; }
  .topview img { display: block; height: auto; pointer-events: none; }
  .topview svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .topview.unlocked { filter: drop-shadow(0 0 6px var(--r2-open)); }
  .topview .hit { fill: transparent; cursor: pointer; }
  .topview .ov { cursor: pointer; }
  .topview .ov.open { fill: var(--r2-open); fill-opacity: .6; stroke: var(--r2-open); stroke-width: 3;
                      animation: pulse 1.6s ease-in-out infinite; }
  .topview .ov.gap { fill: #000; fill-opacity: .55; stroke: var(--r2-open); stroke-width: 2; stroke-dasharray: 6 4; }
  .summary { font-size: .95em; color: var(--secondary-text-color); }
  .summary.warn { color: var(--r2-open); font-weight: 500; }
  .status { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .chip { display: inline-flex; align-items: center; gap: 6px; border: none; cursor: pointer;
          font: inherit; font-size: .85em; color: var(--primary-text-color);
          background: var(--secondary-background-color); border-radius: 16px; padding: 4px 10px; }
  .chip ha-icon { --mdc-icon-size: 18px; color: var(--state-icon-color); }
  .chip.warn ha-icon { color: var(--r2-open); }
  .chip.charging ha-icon, .chip.active ha-icon { color: var(--r2-ok); animation: pulse 1.6s infinite; }
  .bar { position: relative; height: 8px; border-radius: 4px; margin: 12px 4px 0; cursor: pointer;
         background: var(--secondary-background-color); overflow: visible; }
  .bar .fill { height: 100%; border-radius: 4px; background: var(--r2-ok); transition: width .6s; }
  .bar.mid .fill { background: var(--r2-warn); }
  .bar.low .fill { background: var(--r2-open); }
  .bar.charging .fill { background-image: linear-gradient(90deg, transparent 0 40%, rgba(255,255,255,.35) 50%, transparent 60%);
                        background-size: 200% 100%; animation: flow 2s linear infinite; }
  .bar .limit { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--primary-text-color);
                opacity: .6; transform: translateX(-1px); }
  .charge-head { display: flex; justify-content: space-between; align-items: baseline; margin-top: 8px; }
  .cstate { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; color: var(--secondary-text-color); }
  .cstate.charging { color: var(--r2-ok); }
  .cstate.charging ha-icon { animation: pulse 1.6s infinite; }
  .socbig { font-size: 1.6em; font-weight: 500; cursor: pointer; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(84px, 1fr)); gap: 8px; margin-top: 12px; }
  .stat { text-align: center; cursor: pointer; padding: 6px 2px; border-radius: 10px;
          background: var(--secondary-background-color); }
  .stat ha-icon { --mdc-icon-size: 20px; color: var(--state-icon-color); }
  .stat .v { font-weight: 500; font-size: .95em; }
  .stat .l { font-size: .75em; color: var(--secondary-text-color); }
  @keyframes pulse { 50% { opacity: .45; } }
  @keyframes flow { from { background-position: 200% 0; } to { background-position: 0 0; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
</style>`;

customElements.define("rivian-r2-card", RivianR2Card);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "rivian-r2-card",
  name: "Rivian R2 Card",
  description: "Overhead door/window/closure status and charging view for the Rivian R2.",
  preview: true,
  documentationURL: "https://github.com/jabella/rivian-r2-card",
});

console.info(`%c RIVIAN-R2-CARD %c v${CARD_VERSION} `,
  "color:#000;background:#ffb600;font-weight:700", "color:#ffb600;background:#000");
