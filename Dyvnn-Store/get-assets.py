import urllib.request,re,json
u='https://www.codashop.com/id-id/'
try:
 s=urllib.request.urlopen(u,timeout=30).read().decode()
 open('assets-source.html','w',encoding='utf8').write(s)
 urls=list(dict.fromkeys(re.findall(r'https[^\s"<>]+(?:png|jpg|webp)',s)))
 print('\n'.join(urls[:100]))
except Exception as e:print(e)
