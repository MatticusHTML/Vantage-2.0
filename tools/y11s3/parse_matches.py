import re,json,sys
def load_lines(path):
    a=json.load(open(path,encoding='utf-8'))
    x=a[0]['text'] if isinstance(a,list) else a
    dec=json.JSONDecoder()
    while isinstance(x,str):
        x,_=dec.raw_decode(x.lstrip())
    return x
isdate=lambda s: re.fullmatch(r'[A-Z][a-z]{2} \d{1,2}',s) is not None
def parse(L):
    days=[];rows=[];anom=[];date=None
    # layout A: "<map>", "Ranked", "4d ago", a, ":", b ...   layout B: "2w ago<map>", "Ranked", "Score", a, ":", b ...
    layoutB=re.compile(r'^\d+\w+ ago')
    starts=[i for i in range(len(L)-2) if L[i+1]=='Ranked' and (L[i+2].endswith('ago') or (L[i+2]=='Score' and layoutB.match(L[i])))]
    # day headers
    dayidx={}
    for i in range(len(L)-2):
        # plain header: date, n, RPΔ, d, "xW", "yL"   |   streak header: date, n, "2", "W", "Streak", RPΔ, d, "xW", "yL"
        if isdate(L[i]) and L[i+1].isdigit() and 'RPΔ' in L[i+2:i+7]:
            r=L[i+2:i+7].index('RPΔ')+i+2
            days.append(dict(date=L[i],n=int(L[i+1]),drp=L[r+1],w=int(L[r+2].split()[0]),l=int(L[r+3].split()[0]))); dayidx[i]=L[i]
    cur=None; di=sorted(dayidx)
    for si,i in enumerate(starts):
        cur=[dayidx[k] for k in di if k<i][-1]
        end=starts[si+1] if si+1<len(starts) else len(L)
        # cut at next day header
        for k in di:
            if i<k<end: end=k
        seg=L[i:end]
        for stop in ('Load More','End of Results'):
            if stop in seg: seg=seg[:seg.index(stop)]
        mp=layoutB.sub('',seg[0]) if seg[2]=='Score' else seg[0]; a,b=seg[3],seg[5]
        try:
            hs=seg.index('HS %'); kda=seg.index('K/D/A')
            k,d,aa=seg[kda+1:kda+4]; hsv=seg[hs+1]
            body=seg[6:seg.index('K/D')]  # before first K/D label
            rp=None;drp=None
            if 'RP' in body:
                r=body.index('RP'); badges=body[:r]; rest=body[r+1:]
                rp=int(rest[0].replace(',','')) if rest else None
                drp=rest[1] if len(rest)>1 else None
            else: badges=body
            rows.append(dict(date=cur,map=mp,score=f'{a}:{b}',badges=badges,rp=rp,drp=drp,k=int(k),d=int(d),a=int(aa),hs=float(hsv.strip('%'))))
        except Exception as e:
            anom.append((cur,seg[:14],str(e)))
    return days,rows,anom
def expand(bd):
    out=[]
    for b in bd:
        m=re.fullmatch(r'x(\d+)',b)
        if m and out: out+= [out[-1]]*(int(m.group(1))-1)
        else: out.append(b)
    return out
if __name__=='__main__':
    L=load_lines(sys.argv[1]); days,rows,anom=parse(L)
    print('lines',len(L),'days',len(days),'rows',len(rows),'anomalies',len(anom))
    for x in anom[:10]: print(x)
    json.dump(dict(days=days,rows=rows),open(sys.argv[2],'w'))
