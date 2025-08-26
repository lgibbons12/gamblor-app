from datetime import datetime, timezone
from typing import List, Optional
import random
import string

from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import JSONResponse
from sqlmodel import Session, select, func
from uuid import UUID
from pydantic import BaseModel

from db import get_session
from models import (
    Game, GameCreate, GameRead, GamePlayer, GamePlayerCreate, GamePlayerRead,
    User, Event, Inning, Turn, Pick, LedgerEntry
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
    is_current_player: bool = False


class LeaderboardEntry(BaseModel):
    player_id: UUID
    user_name: str
    net_dollars: int
    wins: int
    misses: int
    picks_total: int


class GameStateResponse(BaseModel):
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
        is_current = (
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
            is_current_player=is_current
        ))
    
    # Build leaderboard (net dollars from ledger entries)
    leaderboard_query = (
        select(
            GamePlayer.id,
            User.name,
            func.coalesce(func.sum(LedgerEntry.amount_dollars), 0).label("net_dollars"),
            func.count(
                func.case((LedgerEntry.reason == "win", 1))
            ).label("wins"),
            func.count(
                func.case((LedgerEntry.reason == "miss", 1))
            ).label("misses"),
            func.count(Pick.id).label("picks_total")
        )
        .select_from(GamePlayer)
        .join(User, GamePlayer.user_id == User.id)
        .outerjoin(LedgerEntry, LedgerEntry.player_id == GamePlayer.id)
        .outerjoin(Pick, Pick.player_id == GamePlayer.id)
        .where(GamePlayer.game_id == game_id)
        .group_by(GamePlayer.id, User.name)
        .order_by(func.sum(LedgerEntry.amount_dollars).desc().nullslast())
    )
    
    leaderboard_results = session.exec(leaderboard_query).all()
    leaderboard = [
        LeaderboardEntry(
            player_id=result[0],
            user_name=result[1],
            net_dollars=int(result[2] or 0),
            wins=int(result[3] or 0),
            misses=int(result[4] or 0),
            picks_total=int(result[5] or 0)
        )
        for result in leaderboard_results
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

