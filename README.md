# Begin Now

Application mobile de suivi d'objectifs quotidiens.

## Structure

```
begin-now/
├── frontend/   # React Native + Expo
├── backend/    # Node.js + Express (déployé sur Render)
└── supabase/   # Migrations SQL
```

## Stack

- **Frontend** : React Native, Expo, JavaScript
- **Backend** : Node.js, Express (Render)
- **Base de données** : Supabase (PostgreSQL)
- **Auth** : Supabase Auth

## Lancer le projet

### Backend
```bash
cd backend
npm install
cp .env.example .env  # remplir les variables
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env  # remplir les variables
npx expo start
```
