# University Facility Booking System

A simple web app for booking university rooms (study rooms, meeting rooms, labs, computer rooms, sports rooms).

**Tech:** HTML · CSS · JavaScript (frontend) · Node.js · Express · MySQL · JWT login · bcrypt passwords

The look of the website follows the team's Figma design **CAMPUS FACILITY BOOKING**:
a teal page with white cards for students and teachers, and a dark sidebar for the admin.

One command starts everything: the backend also serves the website at **http://localhost:3000**.

> 🇻🇳 Hướng dẫn chạy bằng tiếng Việt: [HUONG_DAN_CHAY.md](HUONG_DAN_CHAY.md)

---

## 1. What the system does

It follows the team's workflow diagram:

```
Register (students) / Login ──► Is it a university email? ──► Role? ──► User home / Admin home

USER:   View rooms ► Search/filter ► Room details ► Choose date + one 30-min slot
        ► Time conflict? ── yes ─► "Choose another time"
                        └─ no ──► Enter purpose (required) ► Send request ► status = PENDING

ADMIN:  View request ► Check user, room, date, time, purpose
        ► Approve? ── yes ─► APPROVED
                   ├─ no ──► REJECTED
                   └─ no action ─► stays PENDING
```

### Business rules (from the 07 Sep 2026 meeting)

| Rule | Where in the code |
|---|---|
| One booking = one 30-minute slot (07:01–07:30, 07:31–08:00, … 20:31–21:00) | `src/slots.js` |
| Two valid bookings can't overlap in the same room | `routes/bookings.js`, step 3 |
| Back-to-back slots are OK (10:01–10:30 and 10:31–11:00) | uses `<` and `>` in the overlap check |
| The purpose is required | `checkBookingInput()` |
| The role decides which rooms a user may book (a room type rule, or a rule for one room) | `facility_categories.allowed_roles`, `facilities.allowed_roles` |
| Room capacity is a whole number from 1 to 300 (never negative) | `CHECK` in the database + `admin.js` |
| Status flow: PENDING → APPROVED / REJECTED (plus CANCELLED) | `bookings.status` |
| Creation time stored with hour, minute, second | `bookings.created_at` |
| Same-moment requests can't both succeed | `SELECT ... FOR UPDATE` lock, step 1 |
| A teacher/staff booking can replace a student booking that starts more than 24h from now | step 4, `PRIORITY` |
| Only university emails can log in (`anhnq2410071@usth.edu.vn`) | `routes/auth.js`, `checkEmail()` |
| Only student emails (name + student code) can register | `routes/auth.js`, `checkStudentEmail()` |
| A new account from the register page is always a STUDENT | `POST /api/auth/register` |
| Teacher, staff and admin accounts are made by the admin | `POST /api/admin/users` |

---

## 2. Project structure

```
facility-booking/
├── README.md                      ← you are here
├── HUONG_DAN_CHAY.md              ← run guide in Vietnamese
├── frontend/                      ← the website (served by the backend)
│   ├── index.html                 ← sends you to login or your home page
│   ├── login.html                 ← log in + register (students only)
│   ├── dashboard.html             ← USER: numbers, next bookings, quick book
│   ├── rooms.html                 ← USER: list, search, filter rooms
│   ├── room.html                  ← USER: room details, slots, booking form
│   ├── my-bookings.html           ← USER: my booking history, cancel
│   ├── account.html               ← USER: profile, change password
│   ├── admin-dashboard.html       ← ADMIN: numbers, recent bookings, approval queue
│   ├── admin-bookings.html        ← ADMIN: approve / reject, details box, history
│   ├── admin-rooms.html           ← ADMIN: add, edit, close, remove rooms
│   ├── admin-users.html           ← ADMIN: create accounts, change role, lock accounts
│   ├── admin-settings.html        ← ADMIN: profile, change password
│   ├── img/room-placeholder.svg   ← shown when a room has no picture
│   ├── css/style.css              ← one stylesheet for all pages
│   └── js/
│       ├── common.js              ← api(), login state, navigation, icons, helpers
│       └── <page>.js              ← one script per page
├── database/
│   ├── 01_create_database.sql     ← database + 4 tables
│   ├── 02_seed_data.sql           ← sample users and rooms
│   └── 03_useful_queries.sql      ← queries to check your data
└── backend/
    ├── .env.example               ← copy to .env
    ├── package.json
    ├── api-tests.http             ← ready-made test requests
    ├── scripts/race-test.js       ← proves there is no double booking
    └── src/
        ├── server.js              ← START HERE (API + serves the frontend)
        ├── db.js                  ← MySQL connection: query() and transaction()
        ├── slots.js               ← the 28 time slots of a day
        ├── rules.js               ← booking rules (days ahead, teacher priority, …)
        ├── middleware.js          ← requireLogin, requireRole, errorHandler
        └── routes/
            ├── auth.js            ← login, my account, change password
            ├── facilities.js      ← list, search, details, free times
            ├── bookings.js        ← create booking (all rules), my bookings, cancel
            └── admin.js           ← review bookings, manage rooms, create/manage users
```

### Database (4 tables)

```
users ──< bookings >── facilities >── facility_categories
```

- One user has many bookings.
- One facility has many bookings (at different times).
- One category has many facilities.

Small additions to the team's original schema are marked `-- added` in `01_create_database.sql`:
`users.is_active`, `facility_categories.allowed_roles`, `facilities.allowed_roles` (a rule for one room),
`facilities.image_url` (the photo on a room card), a CHECK that capacity is 1–300,
facility status `HIDDEN`, booking status `CANCELLED`, `bookings.admin_note`,
a CHECK that end time > start time, and an index.

---

## 3. How to run

### 3.1 Install (once)

- **MySQL 8.0.16+** (keep port 3306 and remember the root password) and **MySQL Workbench**
- **Node.js 18+** (22 LTS recommended)
- **VS Code** with the **REST Client** extension (or use Postman)

### 3.2 Create the database

In MySQL Workbench: **File → Open SQL Script**, then run each file with the ⚡ button:

1. `database/01_create_database.sql`
2. `database/02_seed_data.sql`

> Running `01` again deletes all data. Run `02` after it.

### 3.3 Set up and start the backend

```bash
cd backend
npm install
copy .env.example .env        # macOS/Linux: cp .env.example .env
```

Open `.env` and set **`DB_PASSWORD`** to your MySQL root password. Change `JWT_SECRET` to any long random text.

```bash
npm run dev
```

You should see:

```
Connected to MySQL
Website:  http://localhost:3000
API:      http://localhost:3000/api
```

### 3.4 Use the website

Open **<http://localhost:3000>** and log in with a sample account below.

| Try this | Where |
|---|---|
| Register a student account (`anhnq2410099@usth.edu.vn`) | Log in page → "Create a student account" |
| See your numbers, next bookings and popular rooms | Dashboard |
| Search and filter rooms (category, capacity, available today) | Facilities |
| Pick a date, choose a free 30-minute slot, enter a purpose, send the request | Rooms → View & book |
| Try a slot that is already taken → it is greyed out in the list | same page |
| Try Chemistry Lab D101 as a student → booking is blocked (teachers only) | Rooms → View & book |
| Cancel a booking | My bookings |
| Log in as a teacher and take a student's slot (2+ days ahead) | Rooms → View & book |
| Log in as admin: approve / reject, see all history | Bookings |
| Add, edit, close or remove a room | Rooms (admin) |
| See the numbers and the approval queue | Dashboard (admin) |
| Create an account, change a role, lock an account | Users (admin) |

### 3.5 Test the API directly (optional)

1. Open `backend/api-tests.http` in VS Code.
2. Change `@day` at the top to a date **2 to 30 days from today**.
3. Click **Send Request** on each block, from top to bottom.

Sample accounts (password **`Password@123`**):

| Role | Email |
|---|---|
| ADMIN | admin@usth.edu.vn |
| TEACHER | huydt@usth.edu.vn |
| STAFF | hapt@usth.edu.vn |
| STUDENT | antt2410071@usth.edu.vn |
| STUDENT | binhlm2410072@usth.edu.vn |

The login email must be a university email: letters, an optional student code, then
`@usth.edu.vn` (for example `anhnq2410071@usth.edu.vn`). The **register page needs the
student code**, so `huydt@usth.edu.vn` cannot register — teacher, staff and admin
accounts are created by the admin. You can change the domain with `EMAIL_DOMAIN` in `backend/.env`.

Double-booking test (in a second terminal, with the server running):

```bash
npm run test:race
# Status codes: 201 409 409 409 409 409 409 409 409 409
# PASS: only one booking was saved
```

---

## 4. How the frontend talks to the backend

Every page loads `js/common.js`, which has one helper for calling the API:

```js
const rooms = await api('GET', '/facilities?search=lab');
await api('POST', '/bookings', { facilityId: 1, bookingDate: '2026-09-20',
                                 startTime: '10:01', endTime: '10:30', purpose: '...' });
```

- After login, the token and user are saved in `localStorage`, and `api()` sends the token automatically.
- `requireLogin('ADMIN')` at the top of a page sends the wrong users back to their own home page.
- Every text from the database goes through `esc()` before it is put into HTML, so a user can't inject HTML or scripts.

## 5. API

Send the login token in every request (except login):
`Authorization: Bearer <token>`

Errors always look like `{ "message": "..." }`.

| Method | URL | Who | What it does |
|---|---|---|---|
| POST | `/api/auth/register` | anyone | Register a STUDENT (name + student code email) |
| POST | `/api/auth/login` | anyone | Log in with a university email, get a token |
| GET | `/api/auth/me` | logged in | My account |
| PUT | `/api/auth/password` | logged in | Change my password |
| GET | `/api/facilities/categories` | logged in | Room types + allowed roles |
| GET | `/api/facilities?search=&categoryId=&minCapacity=&onlyAvailable=` | logged in | List / search / filter rooms |
| GET | `/api/facilities/:id` | logged in | Room details |
| GET | `/api/facilities/:id/availability?date=` | logged in | The 28 slots of a day + their status |
| POST | `/api/bookings` | student, teacher, staff | Send a booking request |
| GET | `/api/bookings/summary` | logged in | Numbers and lists for my dashboard |
| GET | `/api/bookings/my?status=` | logged in | My booking history |
| PATCH | `/api/bookings/:id/cancel` | owner | Cancel my booking |
| GET | `/api/admin/summary` | admin | Numbers and lists for the admin dashboard |
| GET | `/api/admin/bookings?status=&facilityId=&date=` | admin | All bookings |
| PATCH | `/api/admin/bookings/:id` | admin | Approve / reject |
| POST | `/api/admin/facilities` | admin | Add a room |
| PUT | `/api/admin/facilities/:id` | admin | Edit a room |
| PATCH | `/api/admin/facilities/:id/status` | admin | AVAILABLE / UNAVAILABLE |
| DELETE | `/api/admin/facilities/:id` | admin | Hide a room |
| POST | `/api/admin/users` | admin | Create an account |
| GET | `/api/admin/users?search=&role=` | admin | List users |
| PATCH | `/api/admin/users/:id` | admin | Change role / lock account |

### Example: create a booking

```http
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "facilityId": 1,
  "bookingDate": "2026-09-20",
  "startTime": "10:01",
  "endTime": "10:30",
  "purpose": "Group study for the database exam"
}
```

| Result | Meaning |
|---|---|
| `201` | Saved as PENDING |
| `400` | Wrong input (date, not a real slot, missing purpose, …) |
| `403` | Your role can't book this room |
| `404` | Room not found |
| `409` | Time already taken, or the room is unavailable |

---

## 6. Booking rules you can change

The times are in `backend/src/slots.js`:

| Setting | Default |
|---|---|
| `OPEN_HOUR` / `CLOSE_HOUR` | 7 – 21 (first slot 07:01–07:30, last slot 20:31–21:00) |
| `SLOT_MINUTES` | 30 minutes → 28 slots a day |

The rest is in `backend/src/rules.js`:

| Setting | Default |
|---|---|
| `maxDaysAhead` | 30 days |
| `minPurposeLength` | 10 characters |
| `replaceAfterHours` | 24 hours (a teacher can take a student's slot only before that) |
| `PRIORITY` | STUDENT 1, STAFF 2, TEACHER 2 |

Who may book a room:

- **the room type rule** → `allowed_roles` in `facility_categories` (e.g. Teacher Meeting Room → `TEACHER`)
- **a rule for one room** → `allowed_roles` in `facilities` (e.g. Chemistry Lab D101 → `TEACHER`).
  Empty (NULL) means the room follows its room type. The admin sets it with the tick boxes on the **Rooms** page.

The capacity limit (1–300) is in `MAX_CAPACITY` in `backend/src/routes/admin.js` and in the `CHECK` in `01_create_database.sql`.

---

## 7. Common errors

| Error | Fix |
|---|---|
| `ECONNREFUSED 127.0.0.1:3306` | MySQL is not running. Start the **MySQL80** service |
| `Access denied for user 'root'@'localhost'` | Wrong `DB_PASSWORD`, or `.env` is not saved yet. Use your Workbench password and press Ctrl+S (the server restarts by itself). XAMPP: leave `DB_PASSWORD=` empty |
| `Unknown database 'FacilityBookingDB'` | Run `01_create_database.sql` |
| `Cannot find module ...` | Run `npm install` inside `backend` |
| `EADDRINUSE :::3000` | Port 3000 is busy. Stop the old server or set `PORT=3001` |
| "The start time must be in the future" | Your test date is in the past. Change `@day` |
| "Choose one time slot, for example 07:01-07:30." | A booking must be exactly one slot; `10:00-12:00` is not allowed |
| "Use your university email …" | Log in with `name + code @usth.edu.vn`, e.g. `anhnq2410071@usth.edu.vn` |
| Website shows old pages after you edit a file | Press **Ctrl+F5** to reload without the browser cache |
| Page keeps going back to login | Your token expired (8 hours). Log in again |
