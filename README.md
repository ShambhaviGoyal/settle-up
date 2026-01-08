# 💰 Smart Expense Splitter

A comprehensive full-stack expense splitting application that helps users split bills with friends, roommates, and groups. Features automatic balance calculations, receipt scanning with AI, payment tracking, and intelligent spending insights.

## ✨ Features

### Core Functionality
- 🔐 **Secure Authentication** - JWT-based user authentication with password hashing
- 👥 **Group Management** - Create and manage multiple expense groups (roommates, trips, events)
- 💰 **Smart Expense Splitting** - Split expenses equally, by percentage, custom amounts, or itemized from receipts
- 📸 **Receipt Scanning** - AI-powered OCR using OpenAI Vision API to extract expense details from photos
- 📊 **Real-time Balance Tracking** - Automatic calculation of who owes whom
- 💳 **Payment Integration** - Generate deep links for Venmo, Zelle, and PayPal
- 🔔 **Notifications** - Get notified about group invitations, payments, and expense updates
- 📬 **Group Invitations** - Send and manage group invitations via email
- 🔄 **Recurring Expenses** - Set up automated recurring expenses (daily, weekly, monthly)
- 💡 **AI Insights** - Get spending analysis and recommendations using GPT-4o-mini
- 💵 **Budget Tracking** - Set and track budgets by category and time period
- 🔍 **Expense Search** - Search and filter expenses by description, category, date, and amount

### User Experience
- 📱 **Cross-platform** - iOS, Android, and Web support via React Native/Expo
- 🎨 **Modern UI** - Clean, intuitive interface with consistent design system
- ⚡ **Fast & Responsive** - Optimized performance with efficient state management
- 🔒 **Secure** - Industry-standard security practices (bcrypt, JWT)

## 🛠️ Tech Stack

### Frontend
- **React Native** (Expo SDK ~54)
- **TypeScript** - Type-safe development
- **Expo Router** - File-based routing
- **Axios** - HTTP client for API calls
- **AsyncStorage** - Local data persistence
- **Expo Camera** - Receipt photo capture
- **Expo Image Manipulator** - Image processing
- **React Navigation** - Navigation system

### Backend
- **Node.js** + **Express** - RESTful API server
- **TypeScript** - Type-safe backend code
- **PostgreSQL** - Relational database
- **JWT** (jsonwebtoken) - Authentication tokens
- **bcrypt** - Password hashing
- **OpenAI API** - Receipt OCR and AI insights
- **node-cron** - Scheduled tasks for recurring expenses
- **CORS** - Cross-origin resource sharing

## 📁 Project Structure

```
expense-splitter-project/
├── expense-splitter-frontend/          # React Native mobile app
│   ├── app/                            # Screen components (file-based routing)
│   │   ├── (tabs)/                     # Tab navigation screens
│   │   │   ├── index.tsx              # Home screen
│   │   │   ├── expenses.tsx           # Add expenses
│   │   │   ├── balances.tsx          # View balances
│   │   │   └── profile.tsx            # User profile
│   │   ├── login.tsx                  # Login screen
│   │   ├── register.tsx              # Registration screen
│   │   ├── group-details.tsx         # Group detail view
│   │   ├── budgets.tsx               # Budget management
│   │   ├── insights.tsx              # AI insights
│   │   ├── invitations.tsx           # Group invitations
│   │   ├── notifications.tsx         # User notifications
│   │   ├── settlements.tsx           # Payment settlements
│   │   └── search-expenses.tsx       # Expense search
│   ├── components/                     # Reusable UI components
│   │   ├── ExpenseCard.tsx
│   │   ├── GroupCard.tsx
│   │   ├── CreateGroupModal.tsx
│   │   ├── AddMemberModal.tsx
│   │   ├── ReceiptScanner.tsx
│   │   ├── PaymentButton.tsx
│   │   └── RecurringExpenseModal.tsx
│   ├── services/                       # API client
│   │   └── api.ts                     # Axios configuration & API methods
│   ├── constants/                      # App constants
│   │   └── theme.ts                   # Design system (colors, typography, spacing)
│   └── hooks/                          # Custom React hooks
│
└── expense-splitter-backend/            # Node.js API server
    ├── src/
    │   ├── controllers/                # Request handlers
    │   │   ├── authController.ts
    │   │   ├── expenseController.ts
    │   │   ├── groupController.ts
    │   │   ├── ocrController.ts
    │   │   ├── insightsController.ts
    │   │   ├── recurringController.ts
    │   │   ├── budgetController.ts
    │   │   ├── invitationController.ts
    │   │   └── notificationController.ts
    │   ├── routes/                      # API route definitions
    │   ├── middleware/                  # Express middleware
    │   │   └── auth.ts                 # JWT authentication
    │   ├── config/                      # Configuration files
    │   │   ├── database.ts             # PostgreSQL connection
    │   │   ├── schema.sql              # Main database schema
    │   │   ├── budgets-schema.sql      # Budget tables
    │   │   └── invitations-notifications-schema.sql  # Invitations & notifications
    │   └── server.ts                   # Express app entry point
    └── dist/                            # Compiled JavaScript (generated)
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **PostgreSQL** v14 or higher
- **npm** or **yarn**
- **Expo CLI** (install globally: `npm install -g expo-cli`)
- **iOS Simulator** (Mac) or **Android Emulator** (optional, can use Expo Go app)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd expense-splitter-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the backend root:
   ```env
   PORT=3000
   DB_USER=your_postgres_username
   DB_HOST=localhost
   DB_NAME=expense_splitter
   DB_PASSWORD=your_postgres_password
   DB_PORT=5432
   JWT_SECRET=your_super_secret_jwt_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Create and set up database**
   ```bash
   # Create database
   createdb expense_splitter
   
   # Run main schema
   psql -d expense_splitter -f src/config/schema.sql
   
   # Run budgets schema
   psql -d expense_splitter -f src/config/budgets-schema.sql
   
   # Run invitations & notifications schema
   psql -d expense_splitter -f src/config/invitations-notifications-schema.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The backend API will be running on `http://localhost:3000`

   For production:
   ```bash
   npm run build
   npm start
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd expense-splitter-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API URL**

   Edit `services/api.ts` and update the `API_URL`:
   ```typescript
   const API_URL = 'http://YOUR_LOCAL_IP:3000/api';
   ```
   
   To find your local IP:
   - **Mac/Linux**: `ifconfig | grep "inet " | grep -v 127.0.0.1`
   - **Windows**: `ipconfig` (look for IPv4 Address)

4. **Start Expo development server**
   ```bash
   npx expo start
   ```

5. **Run on your device/simulator**
   - Press `i` for iOS Simulator (Mac only)
   - Press `a` for Android Emulator
   - Scan QR code with **Expo Go** app on your phone
   - Press `w` for web browser

## 📊 Database Schema

### Core Tables
- **users** - User accounts and profiles
- **groups** - Expense groups
- **group_members** - Group membership relationships
- **expenses** - Expense records
- **expense_splits** - Individual split amounts per user
- **receipt_items** - Items extracted from receipts (for itemized expenses)
- **itemized_splits** - Item-to-user assignments
- **settlements** - Payment tracking and status
- **recurring_expenses** - Automated recurring expense definitions
- **budgets** - User budget settings by category
- **invitations** - Group invitation records
- **notifications** - User notification records

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/logout` - Logout user

### Groups
- `GET /api/groups` - Get all user groups
- `POST /api/groups` - Create new group
- `GET /api/groups/:id` - Get group details
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group
- `GET /api/groups/:id/members` - Get group members
- `POST /api/groups/:id/leave` - Leave group

### Expenses
- `GET /api/expenses` - Get expenses (with filters)
- `POST /api/expenses` - Create expense
- `GET /api/expenses/:id` - Get expense details
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense
- `GET /api/expenses/balances/:groupId` - Get balances for group

### OCR & Receipts
- `POST /api/ocr/scan` - Scan receipt image and extract data

### Insights
- `GET /api/insights` - Get AI-generated spending insights

### Recurring Expenses
- `GET /api/recurring` - Get recurring expenses
- `POST /api/recurring` - Create recurring expense
- `PUT /api/recurring/:id` - Update recurring expense
- `DELETE /api/recurring/:id` - Delete recurring expense
- `PATCH /api/recurring/:id/pause` - Pause/resume recurring expense

### Budgets
- `GET /api/budgets` - Get user budgets
- `POST /api/budgets` - Create budget
- `PUT /api/budgets/:id` - Update budget
- `DELETE /api/budgets/:id` - Delete budget

### Invitations
- `GET /api/invitations/pending` - Get pending invitations
- `POST /api/invitations` - Send invitation
- `PATCH /api/invitations/:id/accept` - Accept invitation
- `PATCH /api/invitations/:id/decline` - Decline invitation

### Notifications
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Settlements
- `POST /api/expenses/settlements` - Mark payment as paid
- `PATCH /api/expenses/settlements/:id/confirm` - Confirm payment received

## 🎯 Key Features Explained

### Expense Splitting Methods
1. **Equal Split** - Divide expense equally among selected members
2. **Custom Split** - Specify exact amounts for each member
3. **Percentage Split** - Split by percentage allocation
4. **Itemized Split** - Assign specific items from receipt to members

### Receipt Scanning
- Take a photo of a receipt or upload an image
- AI extracts: total amount, items, vendor, date, tax, tip, category
- Automatically populates expense form
- Supports itemized splitting from extracted items

### Balance Calculations
- Automatically calculates who owes whom
- Shows simplified settlement suggestions (minimizes transactions)
- Tracks payment status (pending, confirmed)
- Real-time updates when expenses are added/modified

### Recurring Expenses
- Set up expenses that repeat automatically
- Supports daily, weekly, monthly frequencies
- Automatically creates expenses at scheduled times
- Can pause/resume recurring expenses

### AI Insights
- Analyzes spending patterns
- Provides category breakdowns
- Suggests budget recommendations
- Generates personalized insights using GPT-4o-mini

## 🧪 Testing

### Backend Testing
The backend includes health check endpoints:
- `GET /` - API status
- `GET /health` - Health check with timestamp

### Frontend Testing
Use Expo Go app on your phone or simulators for testing:
- iOS Simulator (Mac): `npx expo start` then press `i`
- Android Emulator: `npx expo start` then press `a`
- Physical device: Scan QR code with Expo Go app

## 📝 Environment Variables

### Backend (.env)
```env
PORT=3000
DB_USER=postgres
DB_HOST=localhost
DB_NAME=expense_splitter
DB_PASSWORD=your_password
DB_PORT=5432
JWT_SECRET=your_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key
```

## 🚧 Development Notes

- Backend uses TypeScript and compiles to `dist/` folder
- Frontend uses Expo Router for file-based routing
- Database migrations are SQL files in `src/config/`
- Recurring expenses run via cron job (daily at midnight)
- All API endpoints require JWT authentication except `/api/auth/*`


## 🤝 Contributing

This is a personal project, but feedback and suggestions are welcome!

Built with ❤️ using React Native, Node.js, and PostgreSQL
