import unittest
from snapshot import crowdsec_feed, public_ip, location, homelab_feed

class SnapshotTests(unittest.TestCase):
    def alert(self, **changes):
        a=dict(id=1,source=dict(ip='1.1.1.1',cn='AU',latitude=-33.8,longitude=151.2),decisions=[dict(origin='crowdsec')],scenario='crowdsecurity/ssh-bf',start_at='2026-09-01T00:00:00Z',stop_at='2026-09-01T00:01:00Z')
        a.update(changes); return a
    def test_excludes_private_multicast_and_documentation_addresses(self):
        for ip in ['192.168.8.154','127.0.0.1','224.0.0.1','203.0.113.1','::1','ff02::1','bad',None]: self.assertFalse(public_ip(ip))
    def test_nonlocal_decisions_and_simulation_are_not_attacks(self):
        for origin in ['CAPI','lists','cscli',None]: self.assertEqual(crowdsec_feed([self.alert(decisions=[dict(origin=origin)])])['count'],0)
        self.assertEqual(crowdsec_feed([self.alert(simulated=True)])['count'],0)
    def test_dedupe_and_no_raw_ip_or_machine_info(self):
        import json
        a=self.alert(machine_id='PRIVATE_MACHINE',message='PRIVATE_LOG')
        f=crowdsec_feed([a,a]);self.assertEqual(f['count'],1)
        for value in ['1.1.1.1','PRIVATE_MACHINE','PRIVATE_LOG']: self.assertNotIn(value,json.dumps(f))
    def test_missing_geo_does_not_fabricate_origin(self):
        self.assertEqual(crowdsec_feed([self.alert(source=dict(ip='1.1.1.1'))])['count'],0)
        for n in [float('nan'),float('inf'),91]: self.assertIsNone(location(dict(latitude=n,longitude=0,cn='GB')))
    def test_null_decisions_valid_local_historical_alert(self):
        self.assertEqual(crowdsec_feed([self.alert(decisions=None)])['count'],1)
    def test_bad_time_excluded(self):
        self.assertEqual(crowdsec_feed([self.alert(start_at='not-time')])['count'],0)

    def test_naive_and_reversed_time_excluded(self):
        for start in ['2026-09-01T00:00:00', '2026-09-02T00:00:00Z']:
            self.assertEqual(crowdsec_feed([self.alert(start_at=start)])['count'],0)
    def test_ssh_enumeration_not_mislabelled_as_bruteforce(self):
        f=crowdsec_feed([self.alert(scenario='crowdsecurity/ssh-enum')])
        self.assertEqual(f['nodes'][0]['categories'][0]['label'],'SSH reconnaissance detection')
    def test_homelab_allowlist_removes_private_fields_and_rejects_wrong_counts(self):
        import json
        n=crowdsec_feed([self.alert()])['nodes'][0]
        n.update(ip='PRIVATE_IP',message='PRIVATE_MESSAGE')
        f=dict(nodes=[n],count=1,inputRecords=10,description='PRIVATE_DESCRIPTION')
        self.assertNotIn('PRIVATE',json.dumps(homelab_feed(f)))
        f['count']=2
        with self.assertRaises(ValueError): homelab_feed(f)

if __name__=='__main__': unittest.main()
