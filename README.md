# Expense Splitter - Full Stack App

A comprehensive expense splitting application built with React Native (Expo) and Node.js. Helps users split bills with friends, roommates, and groups with automatic balance calculations and payment tracking.

## 🚀 Features

- 📱 Cross-platform mobile app (iOS & Android)
- 🔐 Secure JWT authentication
- 👥 Group management for roommates, trips, events
- 💰 Smart expense splitting with automatic calculations
- 📸 Receipt scanning capability
- 📊 Real-time balance tracking
- 💳 Payment integration (Venmo, Zelle, PayPal links)
- 🎨 Modern, intuitive UI

## 🛠️ Tech Stack

**Frontend:**
- React Native (Expo)
- TypeScript
- Expo Router
- Axios
- AsyncStorage

**Backend:**
- Node.js + Express
- TypeScript
- PostgreSQL
- JWT Authentication
- bcrypt

## 📁 Project Structure
```
expense-splitter-project/
├── expense-splitter-frontend/    # Mobile app
│   ├── app/                      # Screens
│   ├── components/               # UI components
│   └── services/                 # API client
├── expense-splitter-backend/     # API server
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── config/
│   └── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL v14+
- Expo CLI
- iOS Simulator (Mac) or Android Emulator

### Backend Setup

1. Navigate to backend
```bash
cd expense-splitter-backend
npm install
```

2. Configure environment variables

Create `.env` file:
```env
PORT=3000
DB_USER=your_username
DB_HOST=localhost
DB_NAME=expense_splitter
DB_PASSWORD=your_password
DB_PORT=5432
JWT_SECRET=your_secret_key
```

3. Setup database
```bash
psql -d postgres -c "CREATE DATABASE expense_splitter;"
psql -d expense_splitter -f src/config/schema.sql
```

4. Start server
```bash
npm run dev
```

Backend runs on `http://localhost:3000`

### Frontend Setup

1. Navigate to frontend
```bash
cd expense-splitter-frontend
npm install
```

2. Update API URL

Edit `services/api.ts`:
```typescript
const API_URL = 'http://YOUR_LOCAL_IP:3000/api';
```

3. Start Expo
```bash
npx expo start
```

4. Open with Expo Go app or simulator

## 💡 Key Features

### Expense Management
- Add expenses manually
- Take photos of receipts
- Categorize expenses
- Split equally, by percentage, or custom amounts

### Group Features
- Create multiple groups
- Add members by email
- Track group expenses
- View group balances

### Balance Calculations
- Automatic split calculations
- Simplified settlements (minimizes number of transactions)
- Real-time balance updates
- Payment status tracking

### User Management
- Secure authentication
- Profile customization
- Payment method storage (Venmo, Zelle handles)
- Usage statistics

## 📊 Database Schema

**Core Tables:**
- `users` - User accounts
- `groups` - Expense groups
- `group_members` - Group membership
- `expenses` - Expense records
- `expense_splits` - Split details
- `settlements` - Payment tracking
- `recurring_expenses` - Automated bills

## 🎯 Roadmap

**Phase 1 (Completed) ✅**
- User authentication
- Group creation and management
- Manual expense entry
- Balance calculations
- Mobile UI

**Phase 2 (In Progress) 🚧**
- Receipt OCR processing
- Payment integration
- Expense editing/deletion
- Profile updates

**Phase 3 (Planned) 📋**
- Recurring expenses automation
- AI spending insights
- Push notifications
- Analytics dashboard
- Multi-currency support

## 🤝 Contributing

This is a personal project for portfolio purposes. Feedback and suggestions are welcome!

## 📝 License

MIT
