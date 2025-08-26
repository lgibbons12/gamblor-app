# 🌱 Gamblor Database Seeding Guide

This guide explains how to populate your Gamblor database with realistic mock data for development and testing.

## 📋 Prerequisites

1. **Database Setup**: Ensure your PostgreSQL database is running and accessible
2. **Environment**: Make sure your `.env` file has the correct `DATABASE_URL`
3. **Migrations**: Run all Alembic migrations first:
   ```bash
   cd backend
   uv run alembic upgrade head
   ```

## 🚀 Quick Start

### Option 1: Using the Runner Script (Recommended)
```bash
cd backend
python run_seed.py
```

To clear existing data first:
```bash
python run_seed.py --clear
```

### Option 2: Direct Execution
```bash
cd backend
uv run python seed.py
```

To clear existing data first:
```bash
uv run python seed.py --clear
```

## 📊 What Gets Created

The seed script creates realistic mock data across all tables:

### 👥 Users (8 total)
- Alice Johnson, Bob Smith, Charlie Brown, Diana Prince, etc.
- Each with Google OAuth integration
- Avatar URLs from Pravatar
- Varied creation dates (1-365 days ago)

### 🎮 Games (8 total)
- Mix of **pending**, **active**, and **final** status games
- Realistic titles: "Yankees vs Red Sox Showdown", "World Series Game 7", etc.
- MLB game IDs for some games
- Random ante amounts (1, 2, 5, or 10 dollars)
- Various adjudication modes and deadline settings

### 👤 Game Players
- 3-6 players per game
- Turn order and admin assignments
- Nicknames for some players
- Realistic join and last-seen timestamps

### ⚾ Gameplay Data (for active/final games only)
- **Innings**: Multiple innings with top/bottom halves
- **Turns**: 1-3 turns per inning
- **Picks**: Player choices (K, G, F, D, T, N) with realistic distributions
- **Amendments**: ~15% of picks get amended with fees
- **Ledger Entries**: Antes, winnings, losses, amendment fees

### 📋 Audit Trail
- Game creation, start, and finish events
- Player join events
- All with proper timestamps and payloads

### 📊 Statistics (for final games only)
- **Player Game Stats**: Per-game performance snapshots
- **User Lifetime Totals**: Aggregated lifetime statistics

## 🎯 Data Scenarios

The seed creates several realistic scenarios:

### Game Statuses
- **Pending Games**: Just created, waiting to start
- **Active Games**: In progress with live data
- **Final Games**: Completed with full statistics

### Player Behaviors
- **Active Players**: Make picks regularly
- **Casual Players**: Sometimes miss innings
- **Amendment Users**: Change picks and pay fees
- **Winners**: Some players perform better than others

### Financial Flow
- Antes paid by all players at game start
- Amendment fees for pick changes
- Winnings distributed to successful players
- Net dollar tracking across all transactions

## 🛠️ Customization

### Modifying Sample Data
Edit these variables in `seed.py`:

```python
SAMPLE_USERS = [...]          # Add/modify users
GAME_TITLES = [...]           # Change game names
CHOICE_CODES = ['K', 'G', ...] # Modify pick options
CHOICE_WEIGHTS = [0.25, ...]   # Adjust pick probabilities
```

### Adjusting Game Scenarios
- Change `max_innings` for longer/shorter games
- Modify `num_players` range for different game sizes
- Adjust probability values for picks, amendments, etc.

## 🔍 Verifying Seed Data

After running the seed, verify with these queries:

```sql
-- Check user count
SELECT COUNT(*) FROM users;

-- Check games by status
SELECT status, COUNT(*) FROM games GROUP BY status;

-- Check total players across all games
SELECT COUNT(*) FROM game_players;

-- Check ledger balance (should show money flow)
SELECT 
  reason, 
  COUNT(*) as count, 
  SUM(amount_dollars) as total_amount 
FROM ledger_entries 
GROUP BY reason;

-- Check lifetime totals
SELECT 
  u.name, 
  ult.games_played, 
  ult.net_dollars, 
  ult.picks_total 
FROM user_lifetime_totals ult 
JOIN users u ON ult.user_id = u.id 
ORDER BY ult.net_dollars DESC;
```

## 🧹 Cleaning Up

To remove all seed data:
```bash
cd backend
python run_seed.py --clear
```

Or manually:
```bash
uv run python seed.py --clear
```

## 🐛 Troubleshooting

### Common Issues

1. **Import Errors**: Make sure you're in the `backend` directory
2. **Database Connection**: Verify your `DATABASE_URL` in `.env`
3. **Missing Tables**: Run `uv run alembic upgrade head` first
4. **Permission Errors**: Ensure database user has CREATE/INSERT permissions

### Reset Everything
```bash
cd backend
uv run alembic downgrade base  # Remove all tables
uv run alembic upgrade head    # Recreate tables
python run_seed.py             # Reseed data
```

## 📈 Dashboard Development

With this seed data, you can now build dashboards that show:

- **User Profiles**: Lifetime stats, recent games, performance trends
- **Game Leaderboards**: Live standings, pick distributions, money flow
- **Analytics**: Win rates by pick type, player behavior patterns
- **Admin Views**: Game management, audit trails, financial summaries

The data is designed to be realistic enough for meaningful dashboard development while covering edge cases and various game states.

---

🎉 **Happy Dashboard Building!** Your Gamblor app now has rich, realistic data to work with.
