# Turl Street Group Assignment - Frontend

This is the frontend for the Turl Street Group Assignment project. It connects to the [TSG Geospatial Backend](https://github.com/khushhal/tsg-geospatial-backend) and uses Mapbox for mapping.

---

## 🚀 Getting Started

### 1. 📥 Clone the Repository

```bash
git clone https://github.com/your-username/tsg-frontend.git
cd tsg-frontend
```

### 2. 🔁 Make Sure Backend is Set Up First

Before running the frontend, you must have the backend running.

Set up the backend using this repository:
👉 https://github.com/khushhal/tsg-geospatial-backend

Make sure the backend is fully configured and running on http://127.0.0.1:8000.

### 3. ⚙️ Set Up the Environment Variables

Create a .env file from the provided example:

```bash
cp .env.example .env
```

Then update your .env file with:

```bash
VITE_API_URL=http://127.0.0.1:8000/api
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

To get your Mapbox access token, sign up and create one from:
👉 https://account.mapbox.com/access-tokens/

### 4. 📦 Install Dependencies

Make sure you are using Node.js version 18 or higher. You can check your version with:

```bash
node -v
```

If you're ready, install the dependencies:

```bash
npm install
```

### 5. ▶️ Run the Development Server

```bash
npm run dev
```

This will start the Vite dev server, usually at:

```bash
http://localhost:8080
```

Make sure your backend (Django API) is running on http://127.0.0.1:8000 before testing the frontend.

## 📬 Questions?

Feel free to raise an issue or reach out to the maintainer.
