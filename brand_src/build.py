import cairosvg, io, json, os
from PIL import Image
OUT="/workspace/proxy/web/public/brand"; os.makedirs(OUT,exist_ok=True)
LILAC="#B9A6F2"; INK="#1C1A24"; PAPER="#F6F1FB"; CANVAS="#F5F1EA"
def mark(c1=LILAC,c2=INK,hole_bg=None):
    up="M56 256A110 110 0 0 1 166 146H346A110 110 0 0 1 456 256ZM162 256A80 38 0 0 1 322 256Z"
    lo="M56 256A110 110 0 0 0 166 366H346A110 110 0 0 0 456 256ZM162 256A80 38 0 0 0 322 256Z"
    return f'<g transform="rotate(-40 256 256)"><path fill-rule="evenodd" fill="{c1}" d="{up}"/><path fill-rule="evenodd" fill="{c2}" d="{lo}"/></g>'
def svg(body,w=512,h=512,vb="0 0 512 512"): return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="{vb}">{body}</svg>'
mark_svg=svg(mark()); open(f"{OUT}/mark.svg","w").write(mark_svg)
open(f"{OUT}/mark-mono.svg","w").write(svg(mark(INK,INK)))
open(f"{OUT}/mark-dark.svg","w").write(svg(mark(LILAC,"#F5F1EA")))
icon_body=f'<rect width="512" height="512" rx="112" fill="{PAPER}"/><g transform="translate(51 51) scale(.8)">{mark()}</g>'
icon_svg=svg(icon_body); open(f"{OUT}/icon.svg","w").write(icon_svg)
def png(s,size,path): cairosvg.svg2png(bytestring=s.encode(),output_width=size,output_height=size,write_to=path)
png(mark_svg,1024,f"{OUT}/mark.png"); png(mark_svg,512,f"{OUT}/mark-512.png")
for s in (512,192,180): png(icon_svg,s,f"{OUT}/icon-{s}.png")
os.replace(f"{OUT}/icon-180.png",f"{OUT}/apple-touch-icon.png")
# maskable: full bleed square
mk=svg(f'<rect width="512" height="512" fill="{PAPER}"/><g transform="translate(102 102) scale(.6)">{mark()}</g>'); png(mk,512,f"{OUT}/icon-maskable-512.png")
im=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=icon_svg.encode(),output_width=256,output_height=256)))
im.save(f"{OUT}/favicon.ico",sizes=[(16,16),(32,32),(48,48)])
NAME="Twyn"
FULL="Twyn AI"
def word(fg,c2):
    return svg(f'<g transform="scale(.125)">{mark(LILAC,c2)}</g><text x="74" y="44" font-family="Gloock, Georgia, serif" font-size="44" fill="{fg}" letter-spacing="-0.5">{NAME}</text>',200,64,"0 0 200 64")
open(f"{OUT}/wordmark-light.svg","w").write(word(INK,INK)); open(f"{OUT}/wordmark-dark.svg","w").write(word("#F5F1EA","#F5F1EA"))
og=svg(f'''<rect width="1200" height="630" fill="{CANVAS}"/>
<line x1="80" y1="96" x2="1120" y2="96" stroke="#DCD4C6"/><line x1="80" y1="534" x2="1120" y2="534" stroke="#DCD4C6"/>
<rect x="760" y="140" width="350" height="350" rx="80" fill="{PAPER}"/><g transform="translate(785 165) scale(.586)">{mark()}</g>
<text x="80" y="300" font-family="Georgia, serif" font-size="150" fill="{INK}" letter-spacing="-3">{FULL}</text>
<text x="84" y="372" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#55516A">An AI you, at a link. It talks, chats and books.</text>
<text x="84" y="580" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="#7A7690">Voice by Gnani  /  Hindi, Hinglish, Tamil, English</text>''',1200,630,"0 0 1200 630")
open(f"{OUT}/og.svg","w").write(og); cairosvg.svg2png(bytestring=og.encode(),write_to=f"{OUT}/og.png")
json.dump({"name":"Twyn AI","short_name":"Twyn","description":"An AI you, at a link.","start_url":"/","display":"standalone","background_color":CANVAS,"theme_color":CANVAS,
 "icons":[{"src":"/brand/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"/brand/icon-512.png","sizes":"512x512","type":"image/png"},
 {"src":"/brand/icon-maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"},{"src":"/brand/icon.svg","sizes":"any","type":"image/svg+xml"}]},open(f"{OUT}/../manifest.webmanifest","w"),indent=1)
# preview sheet
sheet=Image.new("RGB",(1600,1000),CANVAS)
def paste(p,xy,sz):
    i=Image.open(p).convert("RGBA"); i.thumbnail(sz); sheet.paste(i,xy,i)
paste(f"{OUT}/mark.png",(40,40),(400,400)); paste(f"{OUT}/icon-512.png",(480,40),(400,400))
paste(f"{OUT}/icon-192.png",(920,40),(192,192)); paste(f"{OUT}/apple-touch-icon.png",(1140,40),(180,180))
for k,s in enumerate((48,32,16)):
    i=im.resize((s,s)); sheet.paste(i,(920+k*70,280),i)
dark=Image.new("RGB",(700,160),INK); sheet.paste(dark,(860,340))
wl=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=word(INK,INK).encode(),output_width=500))).convert("RGBA"); sheet.paste(wl,(40,470),wl)
wd=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=word("#F5F1EA","#F5F1EA").encode(),output_width=500))).convert("RGBA"); sheet.paste(wd,(900,340),wd)
paste(f"{OUT}/og.png",(600,560),(760,400))
os.makedirs("/workspace/proxy/shots/brand",exist_ok=True); sheet.save("/workspace/proxy/shots/brand/logo-sheet.png")
