from datetime import datetime, timezone
from typing import List, Optional, Annotated
import random
import string

from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from fastapi.responses import JSONResponse
from sqlmodel import Session, select, func
from sqlalchemy import case
from uuid import UUID as PyUUID, UUID
from pydantic import BaseModel, Field

from db import get_session as get_db, get_session
from models import (
    Game, GameCreate, GameRead, GamePlayer, GamePlayerCreate, GamePlayerRead,
    User, Event, Inning, Turn, Pick, LedgerEntry, PickAmendment
)
from auth import get_current_user_id, get_optional_user_id


router = APIRouter(prefix="/games", tags=["games"])


# Request/Response Models
class GameCreateRequest(BaseModel):
    title: Optional[str] = None
    mlb_game_id: Optional[str] = None
    ante_dollars: Optional[int] = 1
    adjudication_mode: Optional[str] = "admin_only"


class GameJoinRequest(BaseModel):
    pass  # User ID comes from authentication context


class GameUpdateRequest(BaseModel):
    ante_dollars: Optional[int] = None
    adjudication_mode: Optional[str] = None
    deadline_seconds: Optional[int] = None
    mlb_game_id: Optional[str] = None
    status: Optional[str] = None  # For starting/finalizing


class GameSummaryResponse(BaseModel):
    game: GameRead
    players: List[GamePlayerRead]
    player_count: int
    is_joinable: bool


class PlayerStateInfo(BaseModel):
    id: UUID
    user_id: UUID
    user_name: str
    turn_order: int
    is_admin: bool
    nickname: Optional[str] = None
    character: Optional[str] = None
    is_current_player: bool = False


class LeaderboardEntry(BaseModel):
    player_id: UUID
    user_name: str
    net_dollars: int
    wins: int
    misses: int
    picks_total: int


class GameStateResponse(BaseModel):
    current_inning_id: Optional[str] = None
    inning_number: Optional[int] = None
    half: Optional[str] = None  # 'top' or 'bottom'
    outs: int = 0
    between_ab_locked: bool = False
    pot_dollars: int = 0
    ante_dollars: int
    current_player: Optional[PlayerStateInfo] = None
    your_pick: Optional[str] = None  # Your pick for current inning
    amend_allowed: bool = False
    players: List[PlayerStateInfo]
    leaderboard: List[LeaderboardEntry]
    last_event_id: Optional[UUID] = None
    game_status: str


class MyGameEntry(BaseModel):
    game: GameRead
    is_admin: bool
    player_id: UUID
# Character update models
class CharacterUpdateRequest(BaseModel):
    character: str = Field(min_length=1, max_length=50)

class CharacterUpdateResponse(BaseModel):
    player_id: UUID
    character: str



# Helper Functions
def generate_pin() -> str:
    """Generate a unique 6-character game PIN."""
    return ''.join(random.choices(string.digits, k=6))


def get_unique_pin(session: Session) -> str:
    """Generate a PIN that doesn't already exist in the database."""
    max_attempts = 100
    for _ in range(max_attempts):
        pin = generate_pin()
        existing = session.exec(select(Game).where(Game.pin == pin)).first()
        if not existing:
            return pin
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Unable to generate unique PIN after multiple attempts"
    )


def create_audit_event(session: Session, game_id: UUID, event_type: str, payload: dict, actor_user_id: Optional[UUID] = None):
    """Helper to create audit events."""
    event = Event(
        game_id=game_id,
        type=event_type,
        payload=payload,
        actor_user_id=actor_user_id,
        created_at=datetime.now(timezone.utc)
    )
    session.add(event)


# Endpoints
@router.post("", response_model=GameRead, status_code=status.HTTP_201_CREATED)
def create_game(
    payload: GameCreateRequest, 
    current_user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session)
):
    """Create a new game. Creator automatically becomes admin."""
    
    # Validate user exists
    user = session.get(User, current_user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Generate unique PIN
    pin = get_unique_pin(session)
    
    # Create game
    game = Game(
        title=payload.title or f"{user.name}'s Game",
        pin=pin,
        created_by=current_user_id,
        mlb_game_id=payload.mlb_game_id,
        ante_dollars=payload.ante_dollars or 1,
        adjudication_mode=payload.adjudication_mode or "admin_only",
        status="pending"
    )
    session.add(game)
    session.flush()  # Get the game ID
    
    # Add creator as admin player
    game_player = GamePlayer(
        game_id=game.id,
        user_id=current_user_id,
        turn_order=1,
        is_admin=True,
        joined_at=datetime.now(timezone.utc),
        last_seen_at=datetime.now(timezone.utc)
    )
    session.add(game_player)
    
    # Create audit event
    create_audit_event(
        session, 
        game.id, 
        "game_created",
        {
            "title": game.title,
            "pin": game.pin,
            "ante_dollars": game.ante_dollars,
            "adjudication_mode": game.adjudication_mode
        },
        current_user_id
    )
    
    session.commit()
    session.refresh(game)
    return game


@router.post("/{pin}/join", response_model=GamePlayerRead, status_code=status.HTTP_201_CREATED)
def join_game_by_pin(
    pin: str,
    payload: GameJoinRequest,
    current_user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session)
):
    """Join a game using its PIN."""
    
    # Find game by PIN
    game = session.exec(select(Game).where(Game.pin == pin)).first()
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found with that PIN"
        )
    
    # Check if game is joinable
    if game.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game is not accepting new players"
        )
    
    # Validate user exists
    user = session.get(User, current_user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user is already in this game
    existing_player = session.exec(
        select(GamePlayer).where(
            GamePlayer.game_id == game.id,
            GamePlayer.user_id == current_user_id
        )
    ).first()
    if existing_player:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already in this game"
        )
    
    # Get next turn order
    max_turn_order = session.exec(
        select(GamePlayer.turn_order)
        .where(GamePlayer.game_id == game.id)
        .order_by(GamePlayer.turn_order.desc())
    ).first()
    next_turn_order = (max_turn_order or 0) + 1
    
    # Add player to game
    game_player = GamePlayer(
        game_id=game.id,
        user_id=current_user_id,
        turn_order=next_turn_order,
        is_admin=False,
        joined_at=datetime.now(timezone.utc),
        last_seen_at=datetime.now(timezone.utc)
    )
    session.add(game_player)
    
    # Create audit event
    create_audit_event(
        session,
        game.id,
        "player_joined",
        {
            "user_id": str(current_user_id),
            "user_name": user.name,
            "turn_order": next_turn_order
        },
        current_user_id
    )
    
    session.commit()
    session.refresh(game_player)
    return game_player


@router.patch("/{game_id}", response_model=GameRead)
def update_game(
    game_id: UUID,
    payload: GameUpdateRequest,
    current_user_id: UUID = Depends(get_current_user_id),
    session: Session = Depends(get_session)
):
    """Update game settings. Only admins can update games."""
    
    # Get game
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found"
        )
    
    # Check if user is admin of this game
    player = session.exec(
        select(GamePlayer).where(
            GamePlayer.game_id == game_id,
            GamePlayer.user_id == current_user_id,
            GamePlayer.is_admin == True
        )
    ).first()
    if not player:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only game admins can update game settings"
        )
    
    # Track changes for audit
    changes = {}
    
    # Update fields
    if payload.ante_dollars is not None:
        changes["ante_dollars"] = {"old": game.ante_dollars, "new": payload.ante_dollars}
        game.ante_dollars = payload.ante_dollars
    
    if payload.adjudication_mode is not None:
        if payload.adjudication_mode not in ["admin_only", "trust_turn_holder"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid adjudication_mode"
            )
        changes["adjudication_mode"] = {"old": game.adjudication_mode, "new": payload.adjudication_mode}
        game.adjudication_mode = payload.adjudication_mode
    
    if payload.deadline_seconds is not None:
        changes["deadline_seconds"] = {"old": game.deadline_seconds, "new": payload.deadline_seconds}
        game.deadline_seconds = payload.deadline_seconds
    
    if payload.mlb_game_id is not None:
        changes["mlb_game_id"] = {"old": game.mlb_game_id, "new": payload.mlb_game_id}
        game.mlb_game_id = payload.mlb_game_id
    
    if payload.status is not None:
        if payload.status not in ["pending", "active", "final"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status"
            )
        
        # Validate status transitions
        if game.status == "final":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change status of finalized game"
            )
        
        if game.status == "pending" and payload.status == "final":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot finalize game that hasn't started"
            )
        
        changes["status"] = {"old": game.status, "new": payload.status}
        game.status = payload.status
    
    # Create audit event if there were changes
    if changes:
        event_type = "game_updated"
        if "status" in changes:
            if changes["status"]["new"] == "active":
                event_type = "game_started"
            elif changes["status"]["new"] == "final":
                event_type = "game_finished"
        
        create_audit_event(
            session,
            game.id,
            event_type,
            {"changes": changes},
            current_user_id
        )
    
    session.commit()
    session.refresh(game)
    return game


@router.get("/{game_id}", response_model=GameSummaryResponse)
def get_game(game_id: UUID, session: Session = Depends(get_session)):
    """Get game summary with players."""
    
    # Get game
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found"
        )
    
    # Get players
    players = session.exec(
        select(GamePlayer)
        .where(GamePlayer.game_id == game_id)
        .order_by(GamePlayer.turn_order)
    ).all()
    
    return GameSummaryResponse(
        game=game,
        players=players,
        player_count=len(players),
        is_joinable=game.status == "pending"
    )


@router.get("/{game_id}/state", response_model=GameStateResponse)
def get_game_state(
    game_id: UUID, 
    response: Response,
    current_user_id: Optional[UUID] = Depends(get_optional_user_id),
    session: Session = Depends(get_session)
):
    """Get real-time game state with caching headers for SWR."""
    
    # Get game
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found"
        )
    
    # Get players with user info
    players_query = (
        select(GamePlayer, User)
        .join(User, GamePlayer.user_id == User.id)
        .where(GamePlayer.game_id == game_id)
        .order_by(GamePlayer.turn_order)
    )
    player_results = session.exec(players_query).all()
    
    # Get current inning
    current_inning = session.exec(
        select(Inning)
        .where(Inning.game_id == game_id, Inning.closed_at.is_(None))
        .order_by(Inning.inning_number.desc(), Inning.half.desc())
    ).first()
    
    # Get current turn if there's an active inning
    current_turn = None
    current_player_info = None
    if current_inning:
        current_turn = session.exec(
            select(Turn, GamePlayer, User)
            .join(GamePlayer, Turn.current_player_id == GamePlayer.id)
            .join(User, GamePlayer.user_id == User.id)
            .where(Turn.inning_id == current_inning.id)
            .order_by(Turn.created_at.desc())
        ).first()
        
        if current_turn:
            turn_obj, turn_player, turn_user = current_turn
            current_player_info = PlayerStateInfo(
                id=turn_player.id,
                user_id=turn_player.user_id,
                user_name=turn_user.name,
                turn_order=turn_player.turn_order,
                is_admin=turn_player.is_admin,
                nickname=turn_player.nickname,
                character=getattr(turn_player, "character", None),
                is_current_player=True
            )
    
    # Get your pick for current inning (if authenticated and inning exists)
    your_pick = None
    amend_allowed = False
    if current_user_id and current_inning:
        # Find current user's player record
        current_user_player = None
        for player, user in player_results:
            if user.id == current_user_id:
                current_user_player = player
                break
        
        if current_user_player:
            # Get current pick
            user_pick = session.exec(
                select(Pick)
                .where(
                    Pick.game_id == game_id,
                    Pick.inning_id == current_inning.id,
                    Pick.player_id == current_user_player.id
                )
                .order_by(Pick.created_at.desc())
            ).first()
            
            if user_pick:
                your_pick = user_pick.choice_code
                # Allow amendments if pick is not final and game allows it
                amend_allowed = (
                    not user_pick.is_final and 
                    game.adjudication_mode == "trust_turn_holder" and
                    not current_inning.between_ab_locked
                )
    
    # Calculate pot (sum of antes + amendment fees for this game)
    pot_query = session.exec(
        select(func.sum(LedgerEntry.amount_dollars))
        .where(
            LedgerEntry.game_id == game_id,
            LedgerEntry.amount_dollars < 0  # Negative amounts are payments into pot
        )
    ).first()
    pot_dollars = abs(pot_query or 0)  # Make positive since we're showing pot size
    
    # Build players list
    players_list = []
    for player, user in player_results:
        is_current = bool(
            current_player_info and 
            current_player_info.id == player.id
        )
        players_list.append(PlayerStateInfo(
            id=player.id,
            user_id=player.user_id,
            user_name=user.name,
            turn_order=player.turn_order,
            is_admin=player.is_admin,
            nickname=player.nickname,
            character=getattr(player, "character", None),
            is_current_player=is_current
        ))
    
    # Build leaderboard with separate aggregates to avoid row multiplication
    ledger_agg_query = (
        select(
            GamePlayer.id.label("player_id"),
            User.name.label("user_name"),
            func.coalesce(func.sum(LedgerEntry.amount_dollars), 0).label("net_dollars"),
            func.sum(case((LedgerEntry.reason == "win", 1), else_=0)).label("wins"),
            func.sum(case((LedgerEntry.reason == "miss", 1), else_=0)).label("misses"),
        )
        .select_from(GamePlayer)
        .join(User, GamePlayer.user_id == User.id)
        .outerjoin(LedgerEntry, LedgerEntry.player_id == GamePlayer.id)
        .where(GamePlayer.game_id == game_id)
        .group_by(GamePlayer.id, User.name)
    )

    picks_agg_query = (
        select(
            GamePlayer.id.label("player_id"),
            func.count(Pick.id).label("picks_total"),
        )
        .select_from(GamePlayer)
        .outerjoin(Pick, Pick.player_id == GamePlayer.id)
        .where(GamePlayer.game_id == game_id)
        .group_by(GamePlayer.id)
    )

    ledger_rows = session.exec(ledger_agg_query).all()
    picks_rows = session.exec(picks_agg_query).all()
    picks_map = {row[0]: int(row[1] or 0) for row in picks_rows}

    # Order by net_dollars desc NULLS LAST
    ledger_rows.sort(key=lambda r: (r[2] is None, r[2]), reverse=True)

    leaderboard = [
        LeaderboardEntry(
            player_id=row[0],
            user_name=row[1],
            net_dollars=int(row[2] or 0),
            wins=int(row[3] or 0),
            misses=int(row[4] or 0),
            picks_total=picks_map.get(row[0], 0),
        )
        for row in ledger_rows
    ]
    
    # Get last event for cache invalidation
    last_event = session.exec(
        select(Event)
        .where(Event.game_id == game_id)
        .order_by(Event.created_at.desc())
    ).first()
    
    # Set caching headers
    if last_event:
        # Use last event time as Last-Modified
        last_modified = last_event.created_at.strftime("%a, %d %b %Y %H:%M:%S GMT")
        response.headers["Last-Modified"] = last_modified
        
        # Generate ETag from game_id + last_event_id + current_user_id
        etag_data = f"{game_id}:{last_event.id}:{current_user_id or 'anonymous'}"
        etag = f'"{hash(etag_data) % (10**16):016x}"'  # 16-char hex hash
        response.headers["ETag"] = etag
        
        # Set cache control for SWR
        response.headers["Cache-Control"] = "max-age=5, stale-while-revalidate=30"
    
    return GameStateResponse(
        current_inning_id=str(current_inning.id) if current_inning else None,
        inning_number=current_inning.inning_number if current_inning else None,
        half=current_inning.half if current_inning else None,
        outs=current_inning.outs if current_inning else 0,
        between_ab_locked=current_inning.between_ab_locked if current_inning else False,
        pot_dollars=pot_dollars,
        ante_dollars=game.ante_dollars,
        current_player=current_player_info,
        your_pick=your_pick,
        amend_allowed=amend_allowed,
        players=players_list,
        leaderboard=leaderboard,
        last_event_id=last_event.id if last_event else None,
        game_status=game.status
    )


@router.get("/mine", response_model=List[MyGameEntry])
def list_my_games(
    status_filter: Optional[str] = Query(None, description="Filter by status: pending, active, final"),
    session: Session = Depends(get_session),
    current_user_id: UUID = Depends(get_current_user_id)
):
    """List games associated with the current user (as a player)."""
    q = (
        select(GamePlayer, Game)
        .join(Game, GamePlayer.game_id == Game.id)
        .where(GamePlayer.user_id == current_user_id)
        .order_by(Game.created_at.desc())
    )
    if status_filter:
        q = q.where(Game.status == status_filter)

    rows = session.exec(q).all()
    results: List[MyGameEntry] = []
    for gp, game in rows:
        results.append(MyGameEntry(game=game, is_admin=gp.is_admin, player_id=gp.id))
    return results


@router.patch("/{game_id}/players/me/character", response_model=CharacterUpdateResponse)
def update_my_character(
    game_id: UUID,
    payload: CharacterUpdateRequest,
    session: Session = Depends(get_session),
    current_user_id: UUID = Depends(get_current_user_id)
):
    """Update the current user's character for a specific game."""
    # Validate game
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Find the player's GamePlayer row
    game_player = session.exec(
        select(GamePlayer)
        .where(GamePlayer.game_id == game_id)
        .where(GamePlayer.user_id == current_user_id)
    ).first()

    if not game_player:
        raise HTTPException(status_code=403, detail="You are not a player in this game")

    # Update character
    game_player.character = payload.character
    session.add(game_player)

    # Audit event
    create_audit_event(
        session,
        game_id,
        "player_character_updated",
        {"player_id": str(game_player.id), "character": payload.character},
        current_user_id
    )

    session.commit()
    session.refresh(game_player)

    return CharacterUpdateResponse(player_id=game_player.id, character=game_player.character)


# Pick creation and amendment request models
class PickCreateRequest(BaseModel):
    inning_id: PyUUID
    choice_code: str = Field(..., pattern="^[KGFDTN]$")

class PickAmendRequest(BaseModel):
    new_code: str = Field(..., pattern="^[KGFDTN]$")

class PickResponse(BaseModel):
    id: PyUUID
    choice_code: str
    amend_count: int
    is_final: bool
    created_at: datetime


@router.post("/{game_id}/picks", response_model=PickResponse)
async def create_pick(
    game_id: PyUUID,
    request: PickCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user_id: Annotated[PyUUID, Depends(get_current_user_id)]
):
    """Create or overwrite a pick for the current player in the specified inning"""
    
    # Get game and validate it exists and is active
    game = db.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game.status != "active":
        raise HTTPException(status_code=400, detail="Game is not active")
    
    # Get game player
    game_player = db.exec(
        select(GamePlayer)
        .where(GamePlayer.game_id == game_id)
        .where(GamePlayer.user_id == current_user_id)
    ).first()
    
    if not game_player:
        raise HTTPException(status_code=403, detail="Not a player in this game")
    
    # Get inning and validate it exists and belongs to this game
    inning = db.get(Inning, request.inning_id)
    if not inning or inning.game_id != game_id:
        raise HTTPException(status_code=404, detail="Inning not found")
    
    if inning.closed_at:
        raise HTTPException(status_code=400, detail="Inning is already closed")
    
    # Get current turn to validate this is the current player
    current_turn = db.exec(
        select(Turn)
        .where(Turn.game_id == game_id)
        .where(Turn.inning_id == request.inning_id)
        .order_by(Turn.created_at.desc())
    ).first()
    
    if not current_turn or current_turn.current_player_id != game_player.id:
        raise HTTPException(status_code=403, detail="Not your turn to pick")
    
    # Check if player already has a pick for this inning - if so, overwrite
    existing_pick = db.exec(
        select(Pick)
        .where(Pick.game_id == game_id)
        .where(Pick.inning_id == request.inning_id)
        .where(Pick.player_id == game_player.id)
    ).first()
    
    if existing_pick:
        # Update existing pick
        existing_pick.choice_code = request.choice_code
        existing_pick.is_final = True
        existing_pick.created_at = datetime.now(timezone.utc)
        db.add(existing_pick)
        pick = existing_pick
    else:
        # Create new pick
        pick = Pick(
            game_id=game_id,
            inning_id=request.inning_id,
            player_id=game_player.id,
            choice_code=request.choice_code,
            amend_count=0,
            is_final=True
        )
        db.add(pick)
    
    # Create audit event
    await create_audit_event(
        db=db,
        game_id=game_id,
        event_type="pick_created" if not existing_pick else "pick_updated",
        payload={
            "inning_id": str(request.inning_id),
            "choice_code": request.choice_code,
            "player_id": str(game_player.id),
            "is_overwrite": bool(existing_pick)
        },
        actor_user_id=current_user_id
    )
    
    db.commit()
    db.refresh(pick)
    
    return PickResponse(
        id=pick.id,
        choice_code=pick.choice_code,
        amend_count=pick.amend_count,
        is_final=pick.is_final,
        created_at=pick.created_at
    )


@router.post("/{game_id}/picks/{pick_id}/amend", response_model=PickResponse)
async def amend_pick(
    game_id: PyUUID,
    pick_id: PyUUID,
    request: PickAmendRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user_id: Annotated[PyUUID, Depends(get_current_user_id)]
):
    """Amend an existing pick with validation and fee"""
    
    # Get game and validate
    game = db.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game.status != "active":
        raise HTTPException(status_code=400, detail="Game is not active")
    
    # Get game player
    game_player = db.exec(
        select(GamePlayer)
        .where(GamePlayer.game_id == game_id)
        .where(GamePlayer.user_id == current_user_id)
    ).first()
    
    if not game_player:
        raise HTTPException(status_code=403, detail="Not a player in this game")
    
    # Get pick and validate ownership
    pick = db.get(Pick, pick_id)
    if not pick or pick.game_id != game_id:
        raise HTTPException(status_code=404, detail="Pick not found")
    
    if pick.player_id != game_player.id:
        raise HTTPException(status_code=403, detail="Not your pick")
    
    # Get inning and validate between-AB state
    inning = db.get(Inning, pick.inning_id)
    if not inning:
        raise HTTPException(status_code=404, detail="Inning not found")
    
    if inning.closed_at:
        raise HTTPException(status_code=400, detail="Inning is closed, cannot amend")
    
    if not inning.between_ab_locked:
        raise HTTPException(status_code=400, detail="Can only amend picks between at-bats")
    
    # Validate current player (only current player can amend)
    current_turn = db.exec(
        select(Turn)
        .where(Turn.game_id == game_id)
        .where(Turn.inning_id == pick.inning_id)
        .order_by(Turn.created_at.desc())
    ).first()
    
    if not current_turn or current_turn.current_player_id != game_player.id:
        raise HTTPException(status_code=403, detail="Only the current player can amend picks")
    
    # Check D/T threshold limitations (example: max 2 amends for these picks)
    if pick.choice_code in ["D", "T"] and pick.amend_count >= 2:
        raise HTTPException(
            status_code=400, 
            detail=f"Maximum amendments reached for {pick.choice_code} picks"
        )
    
    # Validate the new choice is different
    if request.new_code == pick.choice_code:
        raise HTTPException(status_code=400, detail="New choice must be different from current choice")
    
    # Create pick amendment record
    amendment = PickAmendment(
        game_id=game_id,
        inning_id=pick.inning_id,
        pick_id=pick.id,
        player_id=game_player.id,
        old_code=pick.choice_code,
        new_code=request.new_code,
        fee_dollars=2
    )
    db.add(amendment)
    
    # Create ledger entry for amendment fee
    fee_entry = LedgerEntry(
        game_id=game_id,
        inning_id=pick.inning_id,
        player_id=game_player.id,
        amount_dollars=-2,  # Negative = fee charged
        reason="amend_fee",
        note=f"Amendment fee: {pick.choice_code} → {request.new_code}"
    )
    db.add(fee_entry)
    
    # Update the pick
    pick.choice_code = request.new_code
    pick.amend_count += 1
    db.add(pick)
    
    # Create audit event
    await create_audit_event(
        db=db,
        game_id=game_id,
        event_type="pick_amended",
        payload={
            "pick_id": str(pick.id),
            "old_code": amendment.old_code,
            "new_code": amendment.new_code,
            "amend_count": pick.amend_count,
            "fee_dollars": 2,
            "player_id": str(game_player.id)
        },
        actor_user_id=current_user_id
    )
    
    db.commit()
    db.refresh(pick)
    
    return PickResponse(
        id=pick.id,
        choice_code=pick.choice_code,
        amend_count=pick.amend_count,
        is_final=pick.is_final,
        created_at=pick.created_at
    )

# Adjudication request models
class AdjudicationRequest(BaseModel):
    inning_id: PyUUID
    result_code: str = Field(..., pattern="^[KGFDTN]$")

class MissRequest(BaseModel):
    inning_id: PyUUID

class AdjudicationResponse(BaseModel):
    inning_id: PyUUID
    result_code: str
    winners: List[PyUUID]  # Player IDs who won
    pot_awarded: int
    new_outs: int
    inning_closed: bool
    next_inning_started: bool


@router.post("/{game_id}/outs", response_model=AdjudicationResponse)
async def adjudicate_outcome(
    game_id: PyUUID,
    request: AdjudicationRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user_id: Annotated[PyUUID, Depends(get_current_user_id)]
):
    """Adjudicate the outcome of an at-bat and advance game state"""
    
    # Get game and validate
    game = db.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game.status != "active":
        raise HTTPException(status_code=400, detail="Game is not active")
    
    # Get game player
    game_player = db.exec(
        select(GamePlayer)
        .where(GamePlayer.game_id == game_id)
        .where(GamePlayer.user_id == current_user_id)
    ).first()
    
    if not game_player:
        raise HTTPException(status_code=403, detail="Not a player in this game")
    
    # Check adjudication permissions
    if game.adjudication_mode == "admin_only":
        if not game_player.is_admin:
            raise HTTPException(status_code=403, detail="Only admin can adjudicate in admin_only mode")
    elif game.adjudication_mode == "trust_turn_holder":
        # Get current turn to validate this is the current player
        current_turn = db.exec(
            select(Turn)
            .where(Turn.game_id == game_id)
            .where(Turn.inning_id == request.inning_id)
            .order_by(Turn.created_at.desc())
        ).first()
        
        if not current_turn or current_turn.current_player_id != game_player.id:
            raise HTTPException(status_code=403, detail="Only current turn holder can adjudicate")
    
    # Get inning and validate
    inning = db.get(Inning, request.inning_id)
    if not inning or inning.game_id != game_id:
        raise HTTPException(status_code=404, detail="Inning not found")
    
    if inning.closed_at:
        raise HTTPException(status_code=400, detail="Inning is already closed")
    
    # Calculate current pot from ledger entries
    pot_query = db.exec(
        select(func.sum(LedgerEntry.amount_dollars))
        .where(LedgerEntry.game_id == game_id)
        .where(LedgerEntry.inning_id == request.inning_id)
    )
    current_pot = pot_query.one() or 0
    current_pot = abs(current_pot)  # Convert to positive for display
    
    # Get all picks for this inning
    picks = db.exec(
        select(Pick)
        .where(Pick.game_id == game_id)
        .where(Pick.inning_id == request.inning_id)
        .where(Pick.is_final == True)
    ).all()
    
    # Determine winners (players whose final choice matches result)
    winners = []
    total_pot_awarded = 0
    
    if request.result_code != "N":  # N means no one wins
        for pick in picks:
            if pick.choice_code == request.result_code:
                winners.append(pick.player_id)
    
    # Award pot if there are winners
    if winners and current_pot > 0:
        pot_per_winner = current_pot // len(winners)
        total_pot_awarded = pot_per_winner * len(winners)
        
        for winner_id in winners:
            # Award pot to winner
            win_entry = LedgerEntry(
                game_id=game_id,
                inning_id=request.inning_id,
                player_id=winner_id,
                amount_dollars=pot_per_winner,
                reason="win",
                note=f"Won pot for correct pick: {request.result_code}"
            )
            db.add(win_entry)
    
    # Record miss entries for players who picked wrong or didn't pick
    all_players_in_game = db.exec(
        select(GamePlayer.id)
        .where(GamePlayer.game_id == game_id)
    ).all()
    
    players_who_picked = {pick.player_id for pick in picks}
    
    for player_id in all_players_in_game:
        # Check if player picked incorrectly or didn't pick at all
        player_pick = next((p for p in picks if p.player_id == player_id), None)
        
        if not player_pick:
            # Player didn't pick - record miss
            miss_entry = LedgerEntry(
                game_id=game_id,
                inning_id=request.inning_id,
                player_id=player_id,
                amount_dollars=0,
                reason="miss",
                note="No pick made"
            )
            db.add(miss_entry)
        elif player_pick.choice_code != request.result_code and request.result_code != "N":
            # Player picked wrong - record miss (no financial impact, just tracking)
            miss_entry = LedgerEntry(
                game_id=game_id,
                inning_id=request.inning_id,
                player_id=player_id,
                amount_dollars=0,
                reason="miss",
                note=f"Incorrect pick: {player_pick.choice_code} vs {request.result_code}"
            )
            db.add(miss_entry)
    
    # Update outs based on result code
    new_outs = inning.outs
    if request.result_code == "D":
        new_outs = min(3, inning.outs + 2)
    elif request.result_code == "T":
        new_outs = min(3, inning.outs + 3)
    else:  # K, G, F, N increment by 1
        new_outs = min(3, inning.outs + 1)
    
    inning.outs = new_outs
    db.add(inning)
    
    # Check if inning should end (3 outs)
    inning_closed = False
    next_inning_started = False
    
    if new_outs >= 3:
        # Close current inning
        inning.closed_at = datetime.now(timezone.utc)
        inning_closed = True
        db.add(inning)
        
        # Start next half/inning
        if inning.half == "top":
            # Start bottom half of same inning
            next_inning = Inning(
                game_id=game_id,
                inning_number=inning.inning_number,
                half="bottom",
                outs=0,
                between_ab_locked=False
            )
            db.add(next_inning)
            db.flush()  # Get the new inning ID
            next_inning_started = True
            
            # Create turn for first player in bottom half
            players = db.exec(
                select(GamePlayer)
                .where(GamePlayer.game_id == game_id)
                .order_by(GamePlayer.turn_order)
            ).all()
            
            if players:
                first_turn = Turn(
                    game_id=game_id,
                    inning_id=next_inning.id,
                    current_player_id=players[0].id
                )
                db.add(first_turn)
        else:
            # Start top half of next inning
            next_inning = Inning(
                game_id=game_id,
                inning_number=inning.inning_number + 1,
                half="top",
                outs=0,
                between_ab_locked=False
            )
            db.add(next_inning)
            db.flush()  # Get the new inning ID
            next_inning_started = True
            
            # Create turn for first player in next inning
            players = db.exec(
                select(GamePlayer)
                .where(GamePlayer.game_id == game_id)
                .order_by(GamePlayer.turn_order)
            ).all()
            
            if players:
                first_turn