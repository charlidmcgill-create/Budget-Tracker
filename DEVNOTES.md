# Budget Tracker – Dev Notes

## Project Goal
Build a full-stack budget tracking app with:
- REST API backend
- CSV bank-statement imports
- Frontend dashboard for insights

Primary focus: clean architecture and real-world workflows.

---

## Current Architecture
- Frontend: React
- Backend: Node.js + Express
- Database: PostgreSQL
- Auth: 
---

## What’s Done
- Repo initialized
- Frontend/backend folder structure created
- npm initialized for both projects

---

## In Progress
- Backend setup
  - Express server
  - Basic health check route

---

## Design Decisions
- CSV imports instead of direct bank auth
  - Avoids handling sensitive credentials
  - Easier to demo and test
- Separate frontend/backend repos inside one project
  - Clear separation of concerns

---

## Known Issues / Questions
- How to prevent duplicate transaction imports?
- Best way to auto-categorize transactions?

---

## Next Steps
1. Set up Express server
2. Add `/health` route
3. Connect PostgreSQL
4. Design transactions schema

---

## Ideas / Future Features
- Recurring transactions
- Budget alerts
