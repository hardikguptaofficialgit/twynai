"""Data layer. SQLAlchemy so DATABASE_URL can point at SQLite now and Supabase Postgres later."""
import json, uuid, datetime as dt
from sqlalchemy import create_engine, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker, relationship
from .config import DATABASE_URL

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:  # Neon Postgres: survive scale-to-zero (idle connections get dropped after ~5 min)
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300, pool_size=5, max_overflow=5)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

def uid(): return uuid.uuid4().hex[:12]
def now(): return dt.datetime.utcnow()

class Base(DeclarativeBase): pass

class Owner(Base):
    __tablename__ = "owners"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    email: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String, default="")
    google_tokens: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)

class AuthSession(Base):
    __tablename__ = "sessions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: uuid.uuid4().hex + uuid.uuid4().hex)
    owner_id: Mapped[str] = mapped_column(ForeignKey("owners.id"))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)

class Persona(Base):
    __tablename__ = "personas"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("owners.id"))
    handle: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String)
    headline: Mapped[str] = mapped_column(String, default="")
    bio: Mapped[str] = mapped_column(Text, default="")
    rates: Mapped[str] = mapped_column(Text, default="")
    faqs: Mapped[str] = mapped_column(Text, default="[]")    # json [{q,a}]
    links: Mapped[str] = mapped_column(Text, default="[]")   # json [{label,url}]
    tone: Mapped[str] = mapped_column(String, default="warm, concise, professional")
    accent: Mapped[str] = mapped_column(String, default="lilac")
    avatar_path: Mapped[str] = mapped_column(String, default="")
    voice_embedding: Mapped[str] = mapped_column(Text, default="")  # json speaker_embedding
    voice_sample_path: Mapped[str] = mapped_column(String, default="")
    languages: Mapped[str] = mapped_column(Text, default='["en","hi"]')
    availability: Mapped[str] = mapped_column(Text, default='{}')
    published: Mapped[bool] = mapped_column(default=False)
    onboarding_step: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)

    def to_dict(self, public=False):
        d = dict(id=self.id, handle=self.handle, name=self.name, headline=self.headline, bio=self.bio,
                 rates=self.rates, faqs=json.loads(self.faqs or "[]"), links=json.loads(self.links or "[]"),
                 tone=self.tone, accent=self.accent, avatar_url=(f"/api/p/{self.handle}/avatar" if self.avatar_path else ""), languages=json.loads(self.languages or "[]"), availability=json.loads(self.availability or "{}"), published=bool(self.published), onboarding_step=self.onboarding_step or 0, has_voice=bool(self.voice_embedding or self.voice_sample_path))
        if not public: d["owner_id"] = self.owner_id
        return d

class Chunk(Base):
    __tablename__ = "chunks"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    persona_id: Mapped[str] = mapped_column(ForeignKey("personas.id"))
    source: Mapped[str] = mapped_column(String)
    text: Mapped[str] = mapped_column(Text)
    embedding: Mapped[str] = mapped_column(Text)  # json list; pgvector column on Supabase

class Conversation(Base):
    __tablename__ = "conversations"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    persona_id: Mapped[str] = mapped_column(ForeignKey("personas.id"))
    visitor_name: Mapped[str] = mapped_column(String, default="Visitor")
    channel: Mapped[str] = mapped_column(String, default="chat")
    language: Mapped[str] = mapped_column(String, default="en-IN")
    summary: Mapped[str] = mapped_column(Text, default="")
    takeover: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)
    messages = relationship("Message", order_by="Message.created_at", lazy="selectin")

class Message(Base):
    __tablename__ = "messages"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"))
    role: Mapped[str] = mapped_column(String)  # visitor | persona | owner | tool
    text: Mapped[str] = mapped_column(Text)
    meta: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)

class Lead(Base):
    __tablename__ = "leads"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    persona_id: Mapped[str] = mapped_column(ForeignKey("personas.id"))
    conversation_id: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String, default="")
    contact: Mapped[str] = mapped_column(String, default="")
    intent: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)

class Booking(Base):
    __tablename__ = "bookings"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    persona_id: Mapped[str] = mapped_column(ForeignKey("personas.id"))
    conversation_id: Mapped[str] = mapped_column(String)
    guest_name: Mapped[str] = mapped_column(String, default="")
    guest_email: Mapped[str] = mapped_column(String, default="")
    start: Mapped[str] = mapped_column(String)
    end: Mapped[str] = mapped_column(String)
    topic: Mapped[str] = mapped_column(String, default="")
    calendar_event_id: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)

def row(o):
    return {c.name: (getattr(o, c.name).isoformat() + "Z" if isinstance(getattr(o, c.name), dt.datetime) else getattr(o, c.name)) for c in o.__table__.columns}

def init_db():
    Base.metadata.create_all(engine)
    from sqlalchemy import inspect, text
    have = {c["name"] for c in inspect(engine).get_columns("personas")}
    add = {"languages": "TEXT DEFAULT '[\"en\",\"hi\"]'", "availability": "TEXT DEFAULT '{}'", "published": "BOOLEAN DEFAULT 0", "onboarding_step": "INTEGER DEFAULT 0", "avatar_path": "VARCHAR DEFAULT ''"}
    with engine.begin() as c:
        for k, v in add.items():
            if k not in have: c.execute(text(f"ALTER TABLE personas ADD COLUMN {k} {v}"))
