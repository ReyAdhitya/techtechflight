# Questions for the drone team

Purpose: unblock design of the ground-station dashboard. Ordered by how much each
answer changes the software. Each question states the default we will assume if we
get no answer — object to the default rather than writing an essay.

---

## Tier 0 — the one that matters most

**0. Is the air-to-ground protocol already decided, or can the software side influence it?**

If it is not yet locked, we would like a say. Adopting an existing standard (MAVLink)
instead of inventing a custom format would save the software team weeks and give us a
free simulator. If it is already locked, tell us what it is and we will conform.

---

## Tier 1 — blocks dashboard design today

**1. What flight controller / firmware is on the aircraft?**
ArduPilot, PX4, Betaflight/iNav, or fully custom firmware?
*Why we care:* standard firmware means the telemetry vocabulary already exists and we
can develop against a simulator running the real firmware. Custom firmware means we
must invent the schema, the wire format, and the simulator ourselves.
*Default we will assume:* custom firmware.

**2. How does data get from the aircraft to the ground?**
Name the radio (WiFi, LoRa, SiK/915MHz, ELRS, LTE modem, Bluetooth, ...).
Specifically: **is it an IP network, or a dumb serial pipe?**
*Why we care:* an IP link means we can use normal web protocols and send generous
JSON. A serial pipe means tightly packed binary and a ground-side bridge process.
*Default we will assume:* WiFi, i.e. an IP network.

**3. What downlink bandwidth and update rate can we expect?**
Rough numbers are fine — bytes/sec, and how many telemetry updates per second.
*Why we care:* this decides whether the dashboard can show smooth live gauges or has
to interpolate between sparse updates. It is the difference between 20 Hz and 1 Hz UI.
*Default we will assume:* a few kB/s, ~5 updates per second.

**4. What is the mission, and what is the maximum range and flight time?**
*Why we care:* sanity-checks everything above, and tells us whether "lost link" is a
rare edge case or a routine, expected event we must design the whole UI around.
*Default we will assume:* within visual line of sight, a few hundred metres,
~20 minutes of flight.

---

## Tier 2 — shapes the design, can proceed without

**5. Is there a companion computer onboard (Raspberry Pi, Jetson, ESP32) or only the
flight controller?**
*Why we care:* if there is a Linux board onboard, our telemetry agent can live there
and speak a modern protocol directly to the browser. That is dramatically simpler than
bridging a raw radio link on the ground.

**6. What sensors and payload are onboard?**
GPS? IMU? Barometer? Camera? Rangefinder? Anything mission-specific?
*Why we care:* each one is a panel on the dashboard. We would rather know now than
retrofit.

**7. Battery: chemistry, cell count, and is there a current sensor — or only voltage?**
*Why we care:* this is the single most-requested number on the dashboard and the
easiest to get wrong. Without a current sensor, "percent remaining" cannot be computed
honestly; we can only show voltage and a rough state. We need to know which promise we
are allowed to make.

**8. How many aircraft will be in the air at the same time?**
*Why we care:* one aircraft and a fleet are different products, and it is expensive to
retrofit fleet support later.

---

## Tier 3 — flight-day integration, answer later

**9. When will there be hardware we can test against, even partially?**
A bench-powered flight controller on a desk is enough. Earlier is much better than a
complete aircraft later.

**10. Where is the dashboard operated from?**
A laptop in the field next to the pilot, a tent, or somewhere remote over the internet?

**11. Does the dashboard ever *command* the aircraft, or is it strictly read-only?**
*Why we care:* read-only is a display. Sending commands makes it flight-safety-critical
and a completely different scope of work.

---

## Also worth asking for

- **A sample of real telemetry** — even a few lines from a serial monitor. One concrete
  example is worth more than a paragraph of description.
- **Any existing protocol document, struct definition, or firmware source** we can read.
