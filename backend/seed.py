#!/usr/bin/env python3
"""
Seed script for Gamblor - creates realistic mock data for development and testing.

Usage:
    python seed.py [--clear]
    
    --clear: Drop all data before seeding (optional)
"""

import asyncio
import random
import sys
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import List
from uuid import uuid4

from sqlmodel import Session, select, delete
from db import engine
from models import (
    User, Game, GamePlayer, Inning, Turn, Pick, PickAmendment, 
    LedgerEntry, Event, PlayerGameStats, UserLifetimeTotals
)


# Sample data
SAMPLE_USERS = [
    {"name": "Alice Johnson", "email": "alice@example.com", "google_sub": "alice123"},
    {"name": "Bob Smith", "email": "bob@example.com", "google_sub": "bob456"},
    {"name": "Charlie Brown", "email": "charlie@example.com", "google_sub": "charlie789"},
    {"name": "Diana Prince", "email": "diana@example.com", "google_sub": "diana101"},
    {"name": "Ethan Hunt", "email": "ethan@example.com", "google_sub": "ethan202"},
    {"name": "Fiona Gallagher", "email": "fiona@example.com", "google_sub": "fiona303"},
    {"name": "George Washington", "email": "george@example.com", "google_sub": "george404"},
    {"name": "Hannah Montana", "email": "hannah@example.com", "google_sub": "hannah505"},
]

GAME_TITLES = [
    "Yankees vs Red Sox Showdown",
    "World Series Game 7",
    "Dodgers vs Giants Rivalry",
    "Cubs Championship Dreams",
    "Astros Space City Special",
    "Mets vs Phillies NL East",
    "Angels vs Mariners West Coast",
    "Braves vs Nationals Southeast",
]

MLB_GAME_IDS = [
    "2024-10-15-NYY-BOS",
    "2024-10-20-LAD-HOU", 
    "2024-10-25-SF-LAD",
    "2024-11-01-CHC-STL",
    "2024-11-05-HOU-TEX",
    "2024-11-10-NYM-PHI",
    "2024-11-15-LAA-SEA",
    "2024-11-20-ATL-WSN",
]

CHOICE_CODES = ['K', 'G', 'F', 'D', 'T', 'N']
CHOICE_WEIGHTS = [0.25, 0.20, 0.15, 0.15, 0.15, 0.10]  # K most common

LEDGER_REASONS = ['ante', 'win', 'miss', 'amend_fee', 'admin_adjust', 'dp_rule']

EVENT_TYPES = [
    'game_created', 'game_started', 'game_finished', 'player_joined', 
    'player_left', 'inning_started', 'inning_ended', 'pick_made', 
    'pick_amended', 'turn_advanced', 'admin_action'
]


def clear_all_data(session: Session):
    """Clear all existing data from tables in correct order (respecting foreign keys)."""
    print(">> Clearing existing data...")
    
    # Delete in reverse dependency order
    tables_to_clear = [
        UserLifetimeTotals, PlayerGameStats, Event, LedgerEntry, 
        PickAmendment, Pick, Turn, Inning, GamePlayer, Game, User
    ]
    
    for table in tables_to_clear:
        session.exec(delete(table))
    
    session.commit()
    print(">> All data cleared successfully")


def create_users(session: Session) -> List[User]:
    """Create sample users."""
    print(">> Creating users...")
    
    users = []
    for user_data in SAMPLE_USERS:
        user = User(
            name=user_data["name"],
            email=user_data["email"],
            google_sub=user_data["google_sub"],
            avatar_url=f"https://i.pravatar.cc/150?u={user_data['email']}",
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 365)),
            updated_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 30))
        )
        session.add(user)
        users.append(user)
    
    session.commit()
    print(f">> Created {len(users)} users")
    return users


def generate_pin() -> str:
    """Generate a 6-character game PIN."""
    return ''.join([str(random.randint(0, 9)) for _ in range(6)])


def create_games(session: Session, users: List[User]) -> List[Game]:
    """Create sample games with different statuses."""
    print(">> Creating games...")
    
    games = []
    statuses = ['pending', 'active', 'final']
    adjudication_modes = ['admin_only', 'trust_turn_holder']
    
    for i in range(len(GAME_TITLES)):
        # Vary game timing
        created_days_ago = random.randint(1, 60)
        created_at = datetime.now(timezone.utc) - timedelta(days=created_days_ago)
        
        game = Game(
            title=GAME_TITLES[i],
            pin=generate_pin(),
            created_by=random.choice(users).id,
            mlb_game_id=MLB_GAME_IDS[i] if random.random() > 0.3 else None,
            ante_dollars=random.choice([1, 2, 5, 10]),
            adjudication_mode=random.choice(adjudication_modes),
            deadline_seconds=random.choice([None, 30, 60, 120]) if random.random() > 0.5 else None,
            status=random.choice(statuses),
            created_at=created_at
        )
        session.add(game)
        games.append(game)
    
    session.commit()
    print(f">> Created {len(games)} games")
    return games


def create_game_players(session: Session, games: List[Game], users: List[User]):
    """Create game players for each game."""
    print(">> Creating game players...")
    
    total_players = 0
    for game in games:
        # Each game has 3-6 players
        num_players = random.randint(3, 6)
        selected_users = random.sample(users, num_players)
        
        for i, user in enumerate(selected_users):
            # First player is always admin
            is_admin = (i == 0)
            
            player = GamePlayer(
                game_id=game.id,
                user_id=user.id,
                turn_order=i + 1,
                is_admin=is_admin,
                nickname=f"{user.name.split()[0]}{random.randint(10, 99)}" if random.random() > 0.7 else None,
                joined_at=game.created_at + timedelta(minutes=random.randint(0, 30)),
                last_seen_at=datetime.now(timezone.utc) - timedelta(minutes=random.randint(0, 1440))
            )
            session.add(player)
            total_players += 1
    
    session.commit()
    print(f">> Created {total_players} game players")


def create_innings_and_gameplay(session: Session, games: List[Game]):
    """Create innings, turns, picks, and ledger entries for active/final games."""
    print(">> Creating gameplay data (innings, turns, picks, ledger)...")
    
    # Only create gameplay for active and final games
    gameplay_games = [g for g in games if g.status in ['active', 'final']]
    
    total_innings = 0
    total_turns = 0
    total_picks = 0
    total_ledger_entries = 0
    total_amendments = 0
    
    for game in gameplay_games:
        # Get players for this game
        players = session.exec(
            select(GamePlayer).where(GamePlayer.game_id == game.id).order_by(GamePlayer.turn_order)
        ).all()
        
        if not players:
            continue
            
        # Create antes for all players
        for player in players:
            ante_entry = LedgerEntry(
                game_id=game.id,
                inning_id=None,  # Antes happen before any inning
                player_id=player.id,
                amount_dollars=-game.ante_dollars,
                reason='ante',
                note='Game entry ante',
                created_at=game.created_at + timedelta(minutes=random.randint(1, 10))
            )
            session.add(ante_entry)
            total_ledger_entries += 1
        
        # Determine number of innings (3-9 for variety)
        max_innings = 9 if game.status == 'final' else random.randint(3, 7)
        
        for inning_num in range(1, max_innings + 1):
            for half in ['top', 'bottom']:
                inning_start = game.created_at + timedelta(minutes=inning_num * 20 + (10 if half == 'bottom' else 0))
                
                # Skip bottom of final inning sometimes (walk-off scenario)
                if inning_num == max_innings and half == 'bottom' and random.random() > 0.7:
                    continue
                
                inning = Inning(
                    game_id=game.id,
                    inning_number=inning_num,
                    half=half,
                    outs=random.randint(0, 3) if game.status == 'active' else 3,
                    between_ab_locked=random.random() > 0.8,
                    started_at=inning_start,
                    closed_at=inning_start + timedelta(minutes=random.randint(8, 15)) if game.status == 'final' else None
                )
                session.add(inning)
                session.flush()  # Get inning ID
                total_innings += 1
                
                # Create turns for this inning (usually 1-3 turns)
                num_turns = random.randint(1, 3)
                for turn_idx in range(num_turns):
                    current_player = random.choice(players)
                    turn = Turn(
                        game_id=game.id,
                        inning_id=inning.id,
                        current_player_id=current_player.id,
                        created_at=inning_start + timedelta(minutes=turn_idx * 2)
                    )
                    session.add(turn)
                    total_turns += 1
                
                # Create picks for each player in this inning
                for player in players:
                    # Most players make picks, but sometimes they miss
                    if random.random() > 0.15:  # 85% pick rate
                        choice = random.choices(CHOICE_CODES, weights=CHOICE_WEIGHTS)[0]
                        
                        pick = Pick(
                            game_id=game.id,
                            inning_id=inning.id,
                            player_id=player.id,
                            choice_code=choice,
                            amend_count=0,
                            is_final=True,
                            created_at=inning_start + timedelta(minutes=random.randint(0, 5))
                        )
                        session.add(pick)
                        session.flush()  # Get pick ID
                        total_picks += 1
                        
                        # Sometimes players amend their picks
                        if random.random() > 0.85:  # 15% amendment rate
                            old_choice = choice
                            new_choice = random.choice([c for c in CHOICE_CODES if c != old_choice])
                            
                            amendment = PickAmendment(
                                game_id=game.id,
                                inning_id=inning.id,
                                pick_id=pick.id,
                                player_id=player.id,
                                old_code=old_choice,
                                new_code=new_choice,
                                fee_dollars=2,
                                created_at=pick.created_at + timedelta(minutes=random.randint(1, 3))
                            )
                            session.add(amendment)
                            total_amendments += 1
                            
                            # Update pick
                            pick.choice_code = new_choice
                            pick.amend_count = 1
                            
                            # Add amendment fee to ledger
                            fee_entry = LedgerEntry(
                                game_id=game.id,
                                inning_id=inning.id,
                                player_id=player.id,
                                amount_dollars=-2,
                                reason='amend_fee',
                                note=f'Amendment fee: {old_choice} → {new_choice}',
                                created_at=amendment.created_at
                            )
                            session.add(fee_entry)
                            total_ledger_entries += 1
                
                # For final games, determine winners and add winnings
                if game.status == 'final':
                    # Randomly determine 1-2 winners per inning
                    num_winners = random.randint(1, 2)
                    winning_players = random.sample(players, num_winners)
                    
                    # Calculate pot (antes + amendment fees)
                    pot_size = len(players) * game.ante_dollars + (total_amendments * 2)
                    pot_per_winner = pot_size // num_winners
                    
                    for winner in winning_players:
                        win_entry = LedgerEntry(
                            game_id=game.id,
                            inning_id=inning.id,
                            player_id=winner.id,
                            amount_dollars=pot_per_winner,
                            reason='win',
                            note=f'Won inning {inning_num}{half[0]} pot',
                            created_at=inning.closed_at or inning_start + timedelta(minutes=10)
                        )
                        session.add(win_entry)
                        total_ledger_entries += 1
                    
                    # Add miss entries for non-winners who made picks
                    inning_picks = session.exec(
                        select(Pick).where(Pick.inning_id == inning.id)
                    ).all()
                    
                    for pick in inning_picks:
                        if pick.player_id not in [w.id for w in winning_players]:
                            miss_entry = LedgerEntry(
                                game_id=game.id,
                                inning_id=inning.id,
                                player_id=pick.player_id,
                                amount_dollars=0,  # No money change, just tracking
                                reason='miss',
                                note=f'Missed inning {inning_num}{half[0]}',
                                created_at=inning.closed_at or inning_start + timedelta(minutes=10)
                            )
                            session.add(miss_entry)
                            total_ledger_entries += 1
    
    session.commit()
    print(f">> Created {total_innings} innings, {total_turns} turns, {total_picks} picks, {total_amendments} amendments, {total_ledger_entries} ledger entries")


def create_events(session: Session, games: List[Game]):
    """Create audit events for games."""
    print(">> Creating audit events...")
    
    total_events = 0
    
    for game in games:
        # Game creation event
        create_event = Event(
            game_id=game.id,
            type='game_created',
            payload={
                'title': game.title,
                'ante_dollars': game.ante_dollars,
                'adjudication_mode': game.adjudication_mode
            },
            actor_user_id=game.created_by,
            created_at=game.created_at
        )
        session.add(create_event)
        total_events += 1
        
        # Game status events
        if game.status == 'active':
            start_event = Event(
                game_id=game.id,
                type='game_started',
                payload={'status_change': 'pending → active'},
                actor_user_id=game.created_by,
                created_at=game.created_at + timedelta(minutes=random.randint(5, 30))
            )
            session.add(start_event)
            total_events += 1
        elif game.status == 'final':
            start_event = Event(
                game_id=game.id,
                type='game_started',
                payload={'status_change': 'pending → active'},
                actor_user_id=game.created_by,
                created_at=game.created_at + timedelta(minutes=random.randint(5, 30))
            )
            session.add(start_event)
            
            finish_event = Event(
                game_id=game.id,
                type='game_finished',
                payload={'status_change': 'active → final'},
                actor_user_id=game.created_by,
                created_at=game.created_at + timedelta(hours=random.randint(2, 6))
            )
            session.add(finish_event)
            total_events += 2
        
        # Player join events
        players = session.exec(select(GamePlayer).where(GamePlayer.game_id == game.id)).all()
        for player in players:
            join_event = Event(
                game_id=game.id,
                type='player_joined',
                payload={
                    'player_id': str(player.id),
                    'turn_order': player.turn_order,
                    'is_admin': player.is_admin
                },
                actor_user_id=player.user_id,
                created_at=player.joined_at
            )
            session.add(join_event)
            total_events += 1
    
    session.commit()
    print(f">> Created {total_events} audit events")


def create_player_game_stats(session: Session, games: List[Game]):
    """Create player game statistics for final games."""
    print(">> Creating player game statistics...")
    
    final_games = [g for g in games if g.status == 'final']
    total_stats = 0
    
    for game in final_games:
        players = session.exec(select(GamePlayer).where(GamePlayer.game_id == game.id)).all()
        
        for player in players:
            # Get all ledger entries for this player in this game
            entries = session.exec(
                select(LedgerEntry).where(
                    LedgerEntry.game_id == game.id,
                    LedgerEntry.player_id == player.id
                )
            ).all()
            
            # Get all picks for this player in this game
            picks = session.exec(
                select(Pick).where(
                    Pick.game_id == game.id,
                    Pick.player_id == player.id
                )
            ).all()
            
            # Calculate statistics
            net_dollars = sum(entry.amount_dollars for entry in entries)
            wins = len([e for e in entries if e.reason == 'win'])
            losses = 0  # Would need to calculate based on game logic
            misses = len([e for e in entries if e.reason == 'miss'])
            amendments = len([e for e in entries if e.reason == 'amend_fee'])
            
            biggest_pot = max([e.amount_dollars for e in entries if e.reason == 'win'], default=0)
            
            picks_total = len(picks)
            picks_k = len([p for p in picks if p.choice_code == 'K'])
            picks_g = len([p for p in picks if p.choice_code == 'G'])
            picks_f = len([p for p in picks if p.choice_code == 'F'])
            picks_d = len([p for p in picks if p.choice_code == 'D'])
            picks_t = len([p for p in picks if p.choice_code == 'T'])
            picks_n = len([p for p in picks if p.choice_code == 'N'])
            
            accuracy_pct = Decimal(str(round((wins / picks_total * 100) if picks_total > 0 else 0, 2)))
            
            stats = PlayerGameStats(
                game_id=game.id,
                player_id=player.id,
                net_dollars=net_dollars,
                wins=wins,
                losses=losses,
                misses=misses,
                amendments=amendments,
                biggest_pot_won=biggest_pot,
                picks_total=picks_total,
                picks_k=picks_k,
                picks_g=picks_g,
                picks_f=picks_f,
                picks_d=picks_d,
                picks_t=picks_t,
                picks_n=picks_n,
                accuracy_pct=accuracy_pct,
                created_at=datetime.now(timezone.utc)
            )
            session.add(stats)
            total_stats += 1
    
    session.commit()
    print(f">> Created {total_stats} player game statistics")


def create_lifetime_totals(session: Session, users: List[User]):
    """Create lifetime totals for users who have played final games."""
    print(">> Creating user lifetime totals...")
    
    total_created = 0
    
    for user in users:
        # Get all player game stats for this user
        player_stats = session.exec(
            select(PlayerGameStats)
            .join(GamePlayer, PlayerGameStats.player_id == GamePlayer.id)
            .where(GamePlayer.user_id == user.id)
        ).all()
        
        if not player_stats:
            continue
        
        # Aggregate statistics
        net_dollars = sum(stat.net_dollars for stat in player_stats)
        games_played = len(player_stats)
        wins = sum(stat.wins for stat in player_stats)
        losses = sum(stat.losses for stat in player_stats)
        misses = sum(stat.misses for stat in player_stats)
        amendments = sum(stat.amendments for stat in player_stats)
        biggest_pot_won = max([stat.biggest_pot_won for stat in player_stats], default=0)
        
        picks_total = sum(stat.picks_total for stat in player_stats)
        picks_k = sum(stat.picks_k for stat in player_stats)
        picks_g = sum(stat.picks_g for stat in player_stats)
        picks_f = sum(stat.picks_f for stat in player_stats)
        picks_d = sum(stat.picks_d for stat in player_stats)
        picks_t = sum(stat.picks_t for stat in player_stats)
        picks_n = sum(stat.picks_n for stat in player_stats)
        
        lifetime_totals = UserLifetimeTotals(
            user_id=user.id,
            net_dollars=net_dollars,
            games_played=games_played,
            wins=wins,
            losses=losses,
            misses=misses,
            amendments=amendments,
            biggest_pot_won=biggest_pot_won,
            picks_total=picks_total,
            picks_k=picks_k,
            picks_g=picks_g,
            picks_f=picks_f,
            picks_d=picks_d,
            picks_t=picks_t,
            picks_n=picks_n,
            updated_at=datetime.now(timezone.utc)
        )
        session.add(lifetime_totals)
        total_created += 1
    
    session.commit()
    print(f">> Created {total_created} user lifetime totals")


def main():
    """Main seeding function."""
    clear_data = '--clear' in sys.argv
    
    print(">> Starting Gamblor database seeding...")
    print(f">> Clear existing data: {'Yes' if clear_data else 'No'}")
    
    with Session(engine) as session:
        if clear_data:
            clear_all_data(session)
        
        # Create all seed data
        users = create_users(session)
        games = create_games(session, users)
        create_game_players(session, games, users)
        create_innings_and_gameplay(session, games)
        create_events(session, games)
        create_player_game_stats(session, games)
        create_lifetime_totals(session, users)
    
    print("\n>> Database seeding completed successfully!")
    print("\n>> Summary:")
    print(f"   - {len(SAMPLE_USERS)} users created")
    print(f"   - {len(GAME_TITLES)} games created")
    print(f"   - Various innings, picks, and gameplay data")
    print(f"   - Player statistics and lifetime totals")
    print("\n>> Your application now has realistic mock data for dashboard development!")


if __name__ == "__main__":
    main()
