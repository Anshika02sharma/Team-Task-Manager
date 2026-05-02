
# 🚀 Team Task Manager

A simple full-stack task management web application built using **React (Vite)** and **Supabase**.
This app allows users to create, view, and delete tasks in real-time.

---

## 🔗 Live Demo

👉 https://team-task-manager-one-delta.vercel.app

---

## 📌 Features

* ✅ Add new tasks
* 📋 View all tasks
* ❌ Delete tasks
* ⚡ Real-time database integration using Supabase
* 🌐 Deployed on Vercel

---

## 🛠️ Tech Stack

* **Frontend:** React (Vite)
* **Backend/Database:** Supabase
* **Deployment:** Vercel

---

## 📁 Project Structure

```
team-task-manager/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── supabaseClient.js
├── index.html
├── package.json
└── vite.config.js
```

---

## ⚙️ Installation & Setup

1. Clone the repository

```
git clone https://github.com/YOUR_USERNAME/team-task-manager.git
cd team-task-manager
```

2. Install dependencies

```
npm install
```

3. Create a `.env` file in root and add:

```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

4. Run the app

```
npm run dev
```

---

## 🗄️ Database Setup (Supabase)

Run the following SQL in Supabase SQL Editor:

```
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  title text
);
```

---

## 🚀 Deployment

This project is deployed using **Vercel**:

* Build Command: `npm run build`
* Output Directory: `dist`

---

## 💡 Future Improvements

* 🔐 Authentication (Login/Signup)
* 📊 Dashboard UI
* 🧑‍🤝‍🧑 Multi-user collaboration

---

Clean version without branding.
