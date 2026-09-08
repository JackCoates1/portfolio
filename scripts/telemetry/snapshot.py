"""Build a public, historical globe dataset from PRIVATE read-only captures.
No SSH credentials, network requests, deployment, or raw IP output here.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import ipaddress
import json
import math
from pathlib import Path


def public_ip(value):
    if not isinstance(value, str):
        return False
    try:
        address = ipaddress.ip_address(value)
        return address.is_global and not address.is_multicast
    except (ValueError, TypeError):
        return False


def location(source):
    try:
        lat, lon = float(source['latitude']), float(source['longitude'])
        country = source['cn']
        if not math.isfinite(lat) or not math.isfinite(lon) or not -90 <= lat <= 90 or not -180 <= lon <= 180:
            return None
        if not isinstance(country, str) or len(country) != 2 or not country.isascii() or not country.isalpha():
            return None
        # Coarse coordinates intentionally describe GeoIP region, never a person.
        return country.upper(), round(lat, 1), round(lon, 1)
    except (KeyError, TypeError, ValueError):
        return None


def iso(value):
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if parsed.tzinfo is None:
            return None
        return parsed.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')
    except ValueError:
        return None


def crowdsec_feed(alerts):
    groups = {}
    skipped = Counter()
    seen = set()
    for alert in alerts:
        identifier = alert.get('uuid') or alert.get('id')
        if identifier is None or identifier in seen:
            skipped['duplicate_or_unidentified'] += 1
            continue
        seen.add(identifier)
        source = alert.get('source') or {}
        decisions = alert.get('decisions') or []
        if alert.get('simulated') or any(d.get('origin') != 'crowdsec' for d in decisions):
            skipped['nonlocal_or_simulated'] += 1
            continue
        if not public_ip(source.get('ip')):
            skipped['nonpublic_source'] += 1
            continue
        loc = location(source)
        start, end = iso(alert.get('start_at')), iso(alert.get('stop_at'))
        if not loc or not start or not end or datetime.fromisoformat(start) > datetime.fromisoformat(end):
            skipped['missing_location_or_time'] += 1
            continue
        country, lat, lon = loc
        key = f'{country}:{lat}:{lon}'
        group = groups.setdefault(key, dict(id=hashlib.sha256(key.encode()).hexdigest()[:12],country=country,latitude=lat,longitude=lon,count=0,firstSeen=start,lastSeen=end,categories=Counter()))
        group['count'] += 1
        group['firstSeen'] = min(group['firstSeen'], start)
        group['lastSeen'] = max(group['lastSeen'], end)
        scenario = alert.get('scenario', '')
        category = ('SSH reconnaissance detection' if 'ssh-enum' in scenario else
                    'SSH brute-force detection' if '/ssh-' in scenario else
                    'Web exploit detection' if any(w in scenario.lower() for w in ['cve', 'rce', 'traversal']) else
                    'Web reconnaissance detection' if '/http-' in scenario else 'Security detection')
        group['categories'][category] += 1
    nodes = sorted(groups.values(),key=lambda g: (-g['count'],g['id']))
    for node in nodes:
        node['categories'] = [dict(label=k,count=v) for k,v in sorted(node['categories'].items())]
    return dict(id='vps',label='VPS · CrowdSec',kind='detections',description='Historical local detections on my public VPS. These are not homelab detections or community blocklist entries.',geoSource='Coordinates recorded by CrowdSec GeoIP enrichment; rounded to 0.1°.',inputRecords=len(alerts),count=sum(n['count'] for n in nodes),excluded=dict(skipped),nodes=nodes)


def homelab_feed(raw):
    """Rebuild only allowlisted aggregate fields; never pass private input through."""
    def count(value):
        if type(value) is not int or value < 0:
            raise ValueError('Invalid observation count')
        return value
    nodes = []
    seen = set()
    for n in raw['nodes']:
        loc = location(dict(cn=n['country'], latitude=n['latitude'], longitude=n['longitude']))
        start, end = iso(n['firstSeen']), iso(n['lastSeen'])
        if not loc or not start or not end or datetime.fromisoformat(start) > datetime.fromisoformat(end):
            raise ValueError('Invalid firewall location or time')
        country, lat, lon = loc
        key = f'{country}:{lat}:{lon}'
        if key in seen:
            raise ValueError('Duplicate firewall geographic group')
        seen.add(key)
        records = count(n['count'])
        if records == 0:
            raise ValueError('Empty geographic group')
        nodes.append(dict(id=hashlib.sha256(key.encode()).hexdigest()[:12], country=country,
                          latitude=lat, longitude=lon, count=records, firstSeen=start,lastSeen=end,
                          categories=[dict(label='Inbound firewall block · not classified as an attack',count=records)]))
    records = sum(n['count'] for n in nodes)
    if records != count(raw['count']) or records > count(raw['inputRecords']):
        raise ValueError('Firewall counts do not reconcile')
    return dict(id='homelab',label='Homelab · OPNsense',kind='blocks',
                description='Public-source inbound blocks in a bounded firewall log capture. Blocking alone does not establish malicious intent. Private CrowdSec sources and Suricata events are not included.',
                geoSource='ipwho.is lookup at capture time; rounded to 0.1°. IPs remain private.',
                inputRecords=raw['inputRecords'],count=records,
                excluded={k:count(raw.get('excluded',{}).get(k,0)) for k in ['privateCrowdSecAlerts','suricataAlerts']},nodes=nodes)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--crowdsec',type=Path,required=True)
    parser.add_argument('--homelab',type=Path,required=True,help='Sanitized firewall GeoIP aggregates only')
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--captured-at',required=True,help='Actual source capture timestamp, with timezone; never substituted with processing time')
    args=parser.parse_args()
    captured = iso(args.captured_at)
    if not captured:
        parser.error('captured-at must be an ISO timestamp with timezone')
    data=dict(version=1,mode='snapshot',capturedAt=captured,feeds=[crowdsec_feed(json.loads(args.crowdsec.read_text())),homelab_feed(json.loads(args.homelab.read_text()))])
    if any(datetime.fromisoformat(n['lastSeen']) > datetime.fromisoformat(captured) for f in data['feeds'] for n in f['nodes']):
        parser.error('capture time precedes an observation')
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(data,indent=2)+'\n')
    print('Wrote sanitized snapshot:',[(f['id'],f['count'],len(f['nodes'])) for f in data['feeds']])

if __name__=='__main__': main()
