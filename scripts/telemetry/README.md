# Historical security snapshot

This branch does **not** install a collector, change a service, expose an API, or deploy a feed. The globe reads a bundled, explicitly historical snapshot. `capturedAt` is the source capture time, never the time someone happens to rebuild the site.

## Actual capture, 2026-09-08

Read-only commands used on already-authorized machines:

- VPS: `cscli alerts list -o json --limit 200` (local alerts, not `cscli decisions list` or a community blocklist). 200 records, 83 public source IPs, 45 rounded geographic groups, 21 countries. Coverage 5–8 September 2026. Existing CrowdSec GeoIP enrichment supplies coordinates. A null decisions field represents an expired/no-current-decision historical alert; it does not make an event a community decision.
- OPNsense: `cscli alerts list -o json` yielded 31 private-source records, excluded. A bounded tail of Suricata `eve.json` yielded 4,734 events and zero alert events. Detect-only Suricata is never described as blocking attacks.
- OPNsense firewall: `tail -n 5000 /var/log/filter/latest.log`, select actual filterlog IPv4 records where action is `block`, direction `in`, source is a public unicast address. Four observations, two distinct public sources. Three ICMP, one UDP. These are observations, not proven attacks. No extrapolation to daily rates or total attack counts.
- Two public firewall sources were looked up using HTTPS `ipwho.is`, sequentially with a 1.5-second gap. Failed lookups would be omitted, never assigned a made-up location. Raw source addresses remain private. Existing CrowdSec coordinates required no external lookups.

The capture was handled in a private directory outside git. SSH routes, credentials, raw logs, usernames, source IPs, destinations and private machine identifiers must never be added to this repository. There is no browser request to a GeoIP service or private endpoint.

## Rebuilding from a new real capture

Keep raw captures in a private directory. Build the homelab GeoIP input as the same aggregate shape as the `homelab` feed in the current dataset, after validating action/direction/public source and grouping by country + rounded coordinates. The builder re-creates only allowlisted fields, drops arbitrary text/identifiers, checks counts and rejects invalid locations/times.

```sh
python3 scripts/telemetry/snapshot.py \
  --crowdsec /PRIVATE/PATH/local-alerts.json \
  --homelab /PRIVATE/PATH/firewall-aggregates.json \
  --captured-at ACTUAL_ISO_CAPTURE_TIME_WITH_TIMEZONE \
  --output public/data/security-snapshot.json
python3 -m unittest discover -s scripts/telemetry -p 'test_*.py'
node --test scripts/telemetry/frontend.test.mjs
```

Review the output diff before committing. Frontend totals, coverage and capture labels derive from the same snapshot, not independently hardcoded numbers. Unknown/missing datasets show an unavailable state; empty valid datasets show zero observations. Dates remain visible indefinitely; this visualization never calls itself live.

## Geography

`build-land.py INPUT_NATURAL_EARTH_GEOJSON OUTPUT_JSON` generates coastlines and a Fibonacci-distributed land point cloud locally. Natural Earth 1:110m land is public domain; see `docs/ASSETS.md`. It is geography only, never synthetic attack data.

## Future live option

A future deployment could run a scheduled, least-privilege exporter on the source machines, atomically publish these aggregates, and include capture age/coverage. That needs a separate operational change and review. Do not publish CrowdSec API keys, open a router API, run a public GeoIP proxy, or relabel this static snapshot as live. The globe's arcs are schematic visual links to a symbolic Bradford home anchor, not observed packet routes or the physical location of the VPS.
