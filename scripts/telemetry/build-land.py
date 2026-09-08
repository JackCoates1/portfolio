"""Deterministic globe geography derived from public-domain Natural Earth land."""
import json,math,sys
from pathlib import Path
source=json.loads(Path(sys.argv[1]).read_text())
polygons=[];coasts=[]
for feature in source['features']:
 geometry=feature['geometry']; ps=geometry['coordinates'] if geometry['type']=='MultiPolygon' else [geometry['coordinates']]
 for rings in ps:
  outer=rings[0]; xs=[p[0] for p in outer];ys=[p[1] for p in outer]
  polygons.append((min(xs),min(ys),max(xs),max(ys),rings))
  coasts.append([[round(x,2),round(y,2)] for x,y in outer])
def inside(x,y,ring):
 odd=False;j=len(ring)-1
 for i in range(len(ring)):
  a,b=ring[i];c,d=ring[j]
  if ((b>y)!=(d>y)) and x<(c-a)*(y-b)/(d-b)+a:odd=not odd
  j=i
 return odd
points=[]
for i in range(40000):
 y=1-2*(i+.5)/40000;lat=math.degrees(math.asin(y));lon=(i*137.50776405)%360-180
 if any(lo<=lon<=hi and bot<=lat<=top and inside(lon,lat,r[0]) and not any(inside(lon,lat,h) for h in r[1:]) for lo,bot,hi,top,r in polygons):points.append([round(lon,2),round(lat,2)])
Path(sys.argv[2]).write_text(json.dumps(dict(points=points,coasts=coasts),separators=(',',':'))+'\n')
print('Land points',len(points))
