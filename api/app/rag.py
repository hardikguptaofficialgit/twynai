"""Knowledge retrieval. Local hashing embeddings (no key needed); swap embed() for a real model + pgvector later."""
import json, math, re, hashlib
DIM = 512
_tok = re.compile(r"[\w\u0900-\u0DFF]+", re.UNICODE)

def tokens(t): return [w.lower().rstrip("s") if len(w) > 3 else w.lower() for w in _tok.findall(t)]

def embed(text):
    v = [0.0] * DIM
    toks = tokens(text)
    for w in toks + [a + b for a, b in zip(toks, toks[1:])]:
        h = int(hashlib.md5(w.encode()).hexdigest(), 16)
        v[h % DIM] += 1.0 if (h >> 9) & 1 else -1.0
    n = math.sqrt(sum(x * x for x in v)) or 1.0
    return [x / n for x in v]

def chunk_text(text, size=700, overlap=120):
    text = re.sub(r"\s+", " ", text).strip()
    out, i = [], 0
    while i < len(text):
        out.append(text[i:i + size]); i += size - overlap
    return [c for c in out if c.strip()]

def search(chunks, query, k=4):
    q = embed(query)
    scored = [(sum(a * b for a, b in zip(q, json.loads(c.embedding))), c) for c in chunks]
    scored.sort(key=lambda x: -x[0])
    return [(s, c) for s, c in scored[:k] if s > 0.05]
