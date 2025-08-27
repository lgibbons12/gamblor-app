from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from uuid import UUID as PyUUID, uuid4
from decimal import Decimal
from sqlalchemy import Column, JSON, BigInteger, String, Index, UniqueConstraint, CheckConstraint, ForeignKey, Text, Boolean, Integer, DECIMAL
from sqlalchemy.dialects.postgresql import UUID as PGUUID, TIMESTAMP
from sqlmodel import Field, SQLModel, Relationship

# ======================
# BASE MODELS
# ======================

class UserBase(SQLModel):
    name: str
    email: str
    google_sub: Optional[str] = None
    avatar_url: Optional[str] = None


class User(UserBase, table=True):
    __tablename__ = "users"

    id: PyUUID = Field(default_factory=uuid4, primary_key=True, sa_type=PGUUID(as_uuid=True))
    google_sub: Optional[str] = Field(default=None, unique=True, index=True)
    avatar_url: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_type=TIMESTAMP(timezone=True))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_type=TIMESTAMP(timezone=True))

    # Relationships
    created_games: List["Game"] = Relationship(back_populates="creator")
    game_players: List["GamePlayer"] = Relationship(back_populates="user")
    lifetime_totals: Optional["UserLifetimeTotals"] = Relationship(back_populates="user")


class UserCreate(UserBase):
    google_sub: Optional[str] = None
    avatar_url: Optional[str] = None


class UserRead(UserBase):
    id: PyUUID
    created_at: datetime
    updated_at: datetime


# ======================
# GAMING MODELS
# ======================

class GameBase(SQLModel):
    title: str
    ante_dollars: int = Field(default=1)
    pin: Optional[str] = Field(default=None, max_length=6)
    mlb_game_id: Optional[str] = Field(default=None)
    adjudication_mode: str = Field(default="admin_only")
    deadline_seconds: Optional[int] = Field(default=None)
    status: str = Field(default="pending")


class Game(GameBase, table=True):
    __tablename__ = "games"
    __table_args__ = (
        CheckConstraint("adjudication_mode IN ('admin_only', 'trust_turn_holder')", name="check_adjudication_mode"),
        CheckConstraint("status IN ('pending', 'active', 'final')", name="check_status"),
        UniqueConstraint("pin", name="uq_games_pin"),
    )

    id: PyUUID = Field(default_factory=uuid4, primary_key=True, sa_type=PGUUID(as_uuid=True))
    created_by: PyUUID = Field(foreign_key="users.id", sa_type=PGUUID(as_uuid=True))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_type=TIMESTAMP(timezone=True))

    # Relationships
    creator: User = Relationship(back_populates="created_games")
    players: List["GamePlayer"] = Relationship(back_populates="game")
    innings: List["Inning"] = Relationship(back_populates="game")
    turns: List["Turn"] = Relationship(back_populates="game")
    picks: List["Pick"] = Relationship(back_populates="game")
    pick_amendments: List["PickAmendment"] = Relationship(back_populates="game")
    ledger_entries: List["LedgerEntry"] = Relationship(back_populates="game")
    events: List["Event"] = Relationship(back_populates="game")
    player_stats: List["PlayerGameStats"] = Relationship(back_populates="game")


class GamePlayerBase(SQLModel):
    turn_order: int
    is_admin: bool = Field(default=False)
    nickname: Optional[str] = Field(default=None)
    character: str = Field(default="ace")


class GamePlayer(GamePlayerBase, table=True):
    __tablename__ = "game_players"
    __table_args__ = (
        Index("ix_game_players_game_turn_order", "game_id", "turn_order"),
    )

    id: PyUUID = Field(default_factory=uuid4, primary_key=True, sa_type=PGUUID(as_uuid=True))
    game_id: PyUUID = Field(foreign_key="games.id", sa_type=PGUUID(as_uuid=True))
    user_id: PyUUID = Field(foreign_key="users.id", sa_type=PGUUID(as_uuid=True))
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_type=TIMESTAMP(timezone=True))
    last_seen_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_type=TIMESTAMP(timezone=True))

    # Relationships
    game: Game = Relationship(back_populates="players")
    user: User = Relationship(back_populates="game_players")
    turns: List["Turn"] = Relationship(back_populates="current_player")
    picks: List["Pick"] = Relationship(back_populates="player")
    pick_amendments: List["PickAmendment"] = Relationship(back_populates="player")
    ledger_entries: List["LedgerEntry"] = Relationship(back_populates="player")
    game_stats: List["PlayerGameStats"] = Relationship(back_populates="player")


class InningBase(SQLModel):
    inning_number: int = Field(ge=1)
    half: str
    outs: int = Field(default=0, ge=0, le=3)
    between_ab_locked: bool = Field(default=False)
    closed_at: Optional[datetime] = Field(default=None)


class Inning(InningBase, table=True):
    __tablename__ = "innings"
    __table_args__ = (
        CheckConstraint("half IN ('top', 'bottom')", name="check_half"),
        CheckConstraint("outs >= 0 AND outs <= 3", name="check_outs"),
        Index("ix_innings_game_inning_half", "game_id", "inning_number", "half"),
    )

    id: PyUUID = Field(default_factory=uuid4, primary_key=True, sa_type=PGUUID(as_uuid=True))
    game_id: PyUUID = Field(foreign_key="games.id", sa_type=PGUUID(as_uuid=True))
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_type=TIMESTAMP(timezone=True))
    closed_at: Optional[datetime] = Field(default=None, sa_type=TIMESTAMP(timezone=True))

    # Relationships
    game: Game = Relationship(back_populates="innings")
    turns: List["Turn"] = Relationship(back_populates="inning")
    picks: List["Pick"] = Relationship(back_populates="inning")
    pick_amendments: List["PickAmendment"] = Relationship(back_populates="inning")
    ledger_entries: List["LedgerEntry"] = Relationship(back_populates="inning")


class TurnBase(SQLModel):
    pass


class Turn(TurnBase, table=True):
    __tablename__ = "turns"

    id: PyUUID = Field(default_factory=uuid4, primary_key=True, sa_type=PGUUID(as_uuid=True))
    game_id: PyUUID = Field(foreign_key="games.id", sa_type=PGUUID(as_uuid=True))
    inning_id: PyUUID = Field(foreign_key="innings.id", sa_type=PGUUID(as_uuid=True))
    current_player_id: PyUUID = Field(foreign_key="game_players.id", sa_type=PGUUID(as_uuid=True))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_type=TIMESTAMP(timezone=True))

    # Relationships
    game: Game = Relationship(back_populates="turns")
    inning: Inning = Relationship(back_populates="turns")
    current_player: GamePlayer = Relationship(back_populates="turns")


class PickBase(SQLModel):
    choice_code: str = Field(max_length=1)
    amend_count: int = Field(default=0)
    is_final: bool = Field(default=True)


class Pick(PickBase, table=True):
    __tablename__ = "picks"
    __table_args__ = (
        CheckConstraint("choice_code IN ('K', 'G', 'F', 'D', 'T', 'N')", name="check_choice_code"),
        Index("ix_picks_game_inning_player", "game_id", "inning_id", "player_id"),
    )

    id: PyUUID = Field(default_factory=uuid4, primary_key=True, sa_type=PGUUID(as_uuid=True))
    game_id: PyUUID = Field(foreign_key="games.id", sa_type=PGUUID(as_uuid=True))
    inning_id: PyUUID = Field(foreign_key="innings.id", sa_type=PGUUID(as_uuid=True))
    player_id: PyUUID = Field(foreign_key="game_players.id", sa_type=PGUUID(as_uuid=True))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_type=TIMESTAMP(timezone=True))

    # Relationships
    game: Game = Relationship(back_populates="picks")
    inning: Inning = Relationship(back_populates="picks")
    player: GamePlayer = Relationship(back_populates="picks")
    amendments: List["PickAmendment"] = Relationship(back_populates="pick")


class PickAmendmentBase(SQLModel):
    old_code: str = Field(max_length=1)
    new_code: str = Field(max_length=1)
    fee_dollars: int = Field(default=2)


class PickAmendment(PickAmendmentBase, table=True):
    __tablename__ = "pick_amendments"

    id: PyUUID = Field(default_factory=uuid4, primary_key=True, sa_type=PGUUID(as_uuid=True))
    game_id: PyUUID = Field(foreign_key="games.id", sa_type=PGUUID(as_uuid=True))
    inning_id: PyUUID = Field(foreign_key="innings.id", sa_type=PGUUID(as_uuid=True))
    pick_id: PyUUID = Field(foreign_key="picks.id", sa_type=PGUUID(as_uuid=True))
    player_id: PyUUID = Field(foreign_key="game_players.id", sa_type=PGUUID(as_uuid=True))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_type=TIMESTAMP(timezone=True))

    # Relationships
    game: Game = Relationship(back_populates="pick_amendments")
    inning: Inning = Relationship(back_populates="pick_amendments")
    pick: Pick = Relationship(back_populates="amendments")
    player: GamePlayer = Relationship(back_populates="pick_amendments")


class LedgerEntryBase(SQLModel):
    amount_dollars: int  # positive=award, negative=ante/fee
    reason: str
    note: Optional[str] = Field(default=None)


class LedgerEntry(LedgerEntryBase, table=True):
    __tablename__ = "ledger_entries"
    __table_args__ = (
        CheckConstraint("reason IN ('ante', 'win', 'miss', 'amend_fee', 'admin_adjust', 'dp_rule')", name="check_reason"),
        Index("ix_ledger_entries_game_inning_player", "game_id", "inning_id", "player_id"),
    )

    id: PyUUID = Field(default_factory=uuid4, primary_key=True, sa_type=PGUUID(as_uuid=True))
    game_id: PyUUID = Field(foreign_key="games.id", sa_type=PGUUID(as_uuid=True))
    inning_id: Optional[PyUUID] = Field(default=None, foreign_key="innings.id", sa_type=PGUUID(as_uuid=True))
    player_id: Optional[PyUUID] = Field(default=None, foreign_key="game_players.id", sa_type=PGUUID(as_uuid=True))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_type=TIMESTAMP(timezone=True))

    # Relationships
    game: Game = Relationship(back_populates="ledger_entries")
    inning: Optional[Inning] = Relationship(back_populates="ledger_entries")
    player: Optional[GamePlayer] = Relationship(back_populates="ledger_entries")


class EventBase(SQLModel):
    type: str
    payload: Dict[str, Any] = Field(sa_column=Column(JSON))
    note: Optional[str] = Field(default=None)


class Event(EventBase, table=True):
    __tablename__ = "events"

    id: PyUUID = Field(default_factory=uuid4, primary_key=True, sa_type=PGUUID(as_uuid=True))
    game_id: PyUUID = Field(foreign_key="games.id", sa_type=PGUUID(as_uuid=True))
    actor_user_id: Optional[PyUUID] = Field(default=None, foreign_key="users.id", sa_type=PGUUID(as_uuid=True))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_type=TIMESTAMP(timezone=True))

    # Relationships
    game: Game = Relationship(back_populates="events")
    actor: Optional[User] = Relationship()


# ======================
# CREATE/READ MODELS
# ======================

class GameCreate(GameBase):
    pass


class GameRead(GameBase):
    id: PyUUID
    created_by: PyUUID
    created_at: datetime


class GamePlayerCreate(GamePlayerBase):
    game_id: PyUUID
    user_id: PyUUID


class GamePlayerRead(GamePlayerBase):
    id: PyUUID
    game_id: PyUUID
    user_id: PyUUID
    joined_at: datetime
    last_seen_at: datetime


class InningCreate(InningBase):
    game_id: PyUUID


class InningRead(InningBase):
    id: PyUUID
    game_id: PyUUID
    started_at: datetime


class TurnCreate(TurnBase):
    game_id: PyUUID
    inning_id: PyUUID
    current_player_id: PyUUID


class TurnRead(TurnBase):
    id: PyUUID
    game_id: PyUUID
    inning_id: PyUUID
    current_player_id: PyUUID
    created_at: datetime


class PickCreate(PickBase):
    game_id: PyUUID
    inning_id: PyUUID
    player_id: PyUUID


class PickRead(PickBase):
    id: PyUUID
    game_id: PyUUID
    inning_id: PyUUID
    player_id: PyUUID
    created_at: datetime


class PickAmendmentCreate(PickAmendmentBase):
    game_id: PyUUID
    inning_id: PyUUID
    pick_id: PyUUID
    player_id: PyUUID


class PickAmendmentRead(PickAmendmentBase):
    id: PyUUID
    game_id: PyUUID
    inning_id: PyUUID
    pick_id: PyUUID
    player_id: PyUUID
    created_at: datetime


class LedgerEntryCreate(LedgerEntryBase):
    game_id: PyUUID
    inning_id: Optional[PyUUID] = None
    player_id: Optional[PyUUID] = None


class LedgerEntryRead(LedgerEntryBase):
    id: PyUUID
    game_id: PyUUID
    inning_id: Optional[PyUUID]
    player_id: Optional[PyUUID]
    created_at: datetime


class EventCreate(EventBase):
    game_id: PyUUID
    actor_user_id: Optional[PyUUID] = None


class EventRead(EventBase):
    id: PyUUID
    game_id: PyUUID
    actor_user_id: Optional[PyUUID]
    created_at: datetime


# ======================
# STATS MODELS
# ======================

class PlayerGameStatsBase(SQLModel):
    net_dollars: int
    wins: int
    losses: int
    misses: int
    amendments: int
    biggest_pot_won: int
    picks_total: int
    picks_k: int
    picks_g: int
    picks_f: int
    picks_d: int
    picks_t: int
    picks_n: int
    accuracy_pct: Optional[Decimal] = Field(default=None, sa_type=DECIMAL(5, 2))


class PlayerGameStats(PlayerGameStatsBase, table=True):
    __tablename__ = "player_game_stats"

    id: PyUUID = Field(default_factory=uuid4, primary_key=True, sa_type=PGUUID(as_uuid=True))
    game_id: PyUUID = Field(foreign_key="games.id", sa_type=PGUUID(as_uuid=True))
    player_id: PyUUID = Field(foreign_key="game_players.id", sa_type=PGUUID(as_uuid=True))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_type=TIMESTAMP(timezone=True))

    # Relationships
    game: Game = Relationship(back_populates="player_stats")
    player: GamePlayer = Relationship(back_populates="game_stats")


class UserLifetimeTotalsBase(SQLModel):
    net_dollars: int
    games_played: int
    wins: int
    losses: int
    misses: int
    amendments: int
    biggest_pot_won: int
    picks_total: int
    picks_k: int
    picks_g: int
    picks_f: int
    picks_d: int
    picks_t: int
    picks_n: int


class UserLifetimeTotals(UserLifetimeTotalsBase, table=True):
    __tablename__ = "user_lifetime_totals"

    user_id: PyUUID = Field(primary_key=True, foreign_key="users.id", sa_type=PGUUID(as_uuid=True))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_type=TIMESTAMP(timezone=True))

    # Relationships
    user: User = Relationship(back_populates="lifetime_totals")


class PlayerGameStatsCreate(PlayerGameStatsBase):
    game_id: PyUUID
    player_id: PyUUID


class PlayerGameStatsRead(PlayerGameStatsBase):
    id: PyUUID
    game_id: PyUUID
    player_id: PyUUID
    created_at: datetime


class UserLifetimeTotalsCreate(UserLifetimeTotalsBase):
    pass


class UserLifetimeTotalsRead(UserLifetimeTotalsBase):
    user_id: PyUUID
    updated_at: datetime



