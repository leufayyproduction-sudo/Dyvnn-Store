import urllib.request,re,concurrent.futures
pages=['mobile-legends','pubg-mobile','free-fire','honor-of-kings','roblox']
def run(p):
 try:
  s=urllib.request.urlopen('https://www.codashop.com/id-id/'+p,timeout=25).read().decode()
  urls=list(dict.fromkeys(re.findall(r'https://cdn[^\s"<>]+(?:png|jpg|webp)',s)))
  print(p, '\n'+'\n'.join([u for u in urls if any(x in u.lower() for x in ['banner','denom','product'])][:12]))
 except Exception as e:print(p,e)
with concurrent.futures.ThreadPoolExecutor() as e:list(e.map(run,pages))
