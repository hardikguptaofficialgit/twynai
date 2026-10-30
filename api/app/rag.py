"""Knowledge retrieval behind two small interfaces:
- Embedder: FastEmbed (local ONNX, multilingual, no key) with a hashing fallback.
- VectorStore: SqlVectorStore scans JSON vectors in SQL (fine for one persona's notes);
  PgVectorStore is the drop-in for Supabase (embedding vector(384), ORDER BY embedding <=> :q).
Select with EMBED_MODEL / VECTOR_STORE env vars."""
import json, math, os, re, hashlib, logging
log = logging.getLogger("rag")
EMBED_MODEL = os.getenv("EMBED_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
MIN_SCORE = float(os.getenv("RAG_MIN_SCORE", "0.27"))

class HashEmbedder:
    name, dim = "hash-512", 512
    _tok = re.compile(r"[\w\u0900-\u0DFF]+", re.UNICODE)
    min_score = 0.05
    def embed(self, texts):
        out = []
        for t in texts:
            toks = [w.lower() for w in self._tok.findall(t)]; v = [0.0] * self.dim
            for w in toks + [a + b for a, b in zip(toks, toks[1:])]:
                h = int(hashlib.md5(w.encode()).hexdigest(), 16); v[h % self.dim] += 1.0 if (h >> 9) & 1 else -1.0
            n = math.sqrt(sum(x * x for x in v)) or 1.0; out.append([x / n for x in v])
        return out

class FastEmbedder:
    min_score = MIN_SCORE
    def __init__(self, model):
        from fastembed import TextEmbedding
        self.m = TextEmbedding(model_name=model); self.name = model
        self.dim = len(next(iter(self.m.embed(["probe"]))))
    def embed(self, texts):
        return [[float(x) for x in v] for v in self.m.embed(list(texts))]

_E = None
def embedder():
    global _E
    if _E is None:
        try: _E = FastEmbedder(EMBED_MODEL) if EMBED_MODEL != "hash" else HashEmbedder()
        except Exception as e: log.warning("fastembed unavailable (%s); using hashing embeddings", e); _E = HashEmbedder()
    return _E

# Romanised Hindi -> English glosses. The multilingual model is trained on native scripts, so
# Latin-script Hinglish queries embed poorly; glossing them puts the query back in a space it knows.
GLOSS = {"kya": "what", "kitna": "how much", "kitne": "how much", "kitni": "how much", "paisa": "price", "paise": "price", "fees": "fees",
    "aap": "you", "aapka": "your", "aapki": "your", "apka": "your", "tum": "you", "tumhara": "your", "mera": "my", "mujhe": "me",
    "kab": "when", "kahan": "where", "kaise": "how", "kaisa": "how", "kyun": "why", "kaun": "who", "hai": "is", "hain": "are", "ho": "are",
    "karte": "do", "karta": "do", "karna": "do", "kar": "do", "sakte": "can", "sakta": "can", "milna": "meet", "milte": "meet", "baat": "talk",
    "kaam": "work", "naukri": "job", "bhasha": "language", "bhashayein": "languages", "mausam": "weather", "khana": "food", "gaana": "song",
    "free": "free", "kal": "tomorrow", "aaj": "today", "abhi": "now", "hafte": "week", "bhai": "", "yaar": "", "ji": "", "nahi": "not", "haan": "yes",
    "ke": "", "ka": "", "ki": "", "ko": "", "se": "from", "mein": "in", "liye": "for", "par": "on", "bhi": "also", "toh": ""}
def gloss(text):
    w = re.findall(r"\w+|\W+", text)
    hits = sum(t.lower() in GLOSS and GLOSS[t.lower()] != t.lower() for t in w)
    return text if hits < 2 else "".join(GLOSS.get(t.lower(), t) for t in w)

def embed(text): return embedder().embed([text])[0]
def embed_many(texts): return embedder().embed(texts) if texts else []

def chunk_text(text, size=700, overlap=120):
    text = re.sub(r"\s+", " ", text).strip(); out, i = [], 0
    while i < len(text): out.append(text[i:i + size]); i += size - overlap
    return [c for c in out if c.strip()]

def _cos(a, b):
    na = math.sqrt(sum(x * x for x in a)) or 1; nb = math.sqrt(sum(x * x for x in b)) or 1
    return sum(x * y for x, y in zip(a, b)) / (na * nb)

class SqlVectorStore:
    """Chunks live in the `chunks` table with JSON vectors; similarity computed in Python."""
    def search(self, chunks, query, k=4):
        q = embed(gloss(query)); scored = []
        for c in chunks:
            v = json.loads(c.embedding)
            if len(v) == len(q): scored.append((_cos(q, v), c))
        scored.sort(key=lambda x: -x[0])
        return [(s, c) for s, c in scored[:k] if s > embedder().min_score]

class PgVectorStore(SqlVectorStore):
    """Supabase/pgvector: same interface. Run SQL `ORDER BY embedding <=> :q LIMIT :k`. Enable with VECTOR_STORE=pgvector."""
    def search(self, chunks, query, k=4):
        raise NotImplementedError("pgvector store is wired at Supabase migration time")

store = PgVectorStore() if os.getenv("VECTOR_STORE") == "pgvector" else SqlVectorStore()
def search(chunks, query, k=4): return store.search(chunks, query, k)

def reembed_stale(session, Chunk):
    """Re-embed any chunk whose vector size does not match the current model (e.g. after switching from hash)."""
    d = embedder().dim; stale = [c for c in session.query(Chunk).all() if len(json.loads(c.embedding or "[]")) != d]
    for i in range(0, len(stale), 64):
        part = stale[i:i + 64]
        for c, v in zip(part, embed_many([c.text for c in part])): c.embedding = json.dumps(v)
    session.commit(); return len(stale)
