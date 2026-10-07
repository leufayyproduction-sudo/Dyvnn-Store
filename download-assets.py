import urllib.request,concurrent.futures
base='https://cdn1.codashop.com/S/content/mobile/images/'
assets={'mlbb.jpg':'product-tiles/MLBB-2025-tiles-178x178.jpg','pubg.jpg':'product-tiles/pubgm_tile_aug2024.jpg','ff.png':'product-tiles/Free_Fire_Lapak_178x178.png','hok.png':'product-tiles-plain/Honor-of-Kings-Tile.png','roblox.png':'product-tiles/Roblox-Gift-Cards-tile.png'}
def run(item):
 name,path=item
 urllib.request.urlretrieve(base+path,'public/images/'+name)
 print(name)
with concurrent.futures.ThreadPoolExecutor() as e:list(e.map(run,assets.items()))
