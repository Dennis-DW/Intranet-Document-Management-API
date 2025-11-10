# Intranet Document Management API

This repository contains the backend API for the  Intranet Document Management platform. It is a secure, robust, and scalable system built with Node.js, Express, and MongoDB, designed to handle user authentication, role-based access control, document versioning, team management, and asynchronous security scanning.

---

## ✨ Features

- **Secure Authentication**: JWT-based authentication using a secure `accessToken` and `refreshToken` system stored in HttpOnly cookies.
- **Role-Based Access Control (RBAC)**: Pre-defined roles (`Admin`, `Manager`, `User`) with a clear permission hierarchy.
- **Document Management**: Full CRUD operations for documents, including version history for every file update.
- **Granular Access Levels**: Documents can be set to `private`, `team`, or `public` access levels.
- **Asynchronous Virus Scanning**: All file uploads are queued and scanned for malware in the background using BullMQ, Redis, and the VirusTotal API, ensuring the API remains responsive.
- **Team Management**: Managers can create and manage their own teams, controlling access to team-level documents.
- **User Profile Management**: Users can update their profile information, change their password, and upload a custom avatar.
- **Bulk User Registration**: Admins can bulk-import new users from a CSV file.
- **Admin Statistics Dashboard**: An endpoint that provides aggregated system-wide statistics for administrative overview.
- **IP Whitelisting**: API access is restricted to a configurable list of trusted IP addresses.
- **Audit Logging**: Critical actions (upload, download, delete, etc.) are logged for security and compliance.
- **Notifications**: Users are notified of important events, such as being added to a team or when a new team document is uploaded.

---

## 🚀 Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Job Queue**: BullMQ & Redis for background job processing
- **Authentication**: JSON Web Tokens (JWT)
- **Security**: `bcrypt` for password hashing, `helmet` for security headers, `express-rate-limit` for brute-force protection.
- **File Storage**: Local disk storage with an optional connector for Google Cloud Storage (GCS).
- **Process Management**: PM2 for running the application in a cluster in production.

---

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed on your local machine:

- Node.js (v18.x or later)
- MongoDB
- Redis

---

## 🛠️ Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Dennis-DW/Intranet-Document-Management-API.git
    cd intranet-mvp
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create the environment file:**
    Copy the example environment file to a new `.env` file.
    ```bash
    cp .env.example .env
    ```

4.  **Configure Environment Variables:**
    Open the `.env` file and fill in the required values. At a minimum, you need to set up the database URI and JWT secrets. See the *Configuration* section below for details.

---

## ▶️ Running the Application

### Development

1.  **Start the main API server:**
    This command starts the server with `nodemon`, which will automatically restart on file changes.
    ```bash
    npm run dev
    ```
    The API will be available at `http://localhost:8000`.

2.  **Start the background worker:**
    In a **separate terminal**, run this command to start the worker process that handles virus scanning.
    ```bash
    npm run worker:scan
    ```

3.  **(Optional) Seed the database:**
    To populate the database with test users and documents for easy testing, run:
    ```bash
    npm run seed
    ```
    This will output login credentials and testing scenarios to your console.

4.  **(Optional) Clear the database:**
    To completely wipe the database collections, run:
    ```bash
    npm run clear:db
    ```

### Production

For production, PM2 is used to run the application as a cluster, maximizing performance and ensuring it restarts automatically if it crashes.

```bash
npm run start
```

To manage the production processes:
- `npm run stop`: Stops all running PM2 processes.
- `npm run delete`: Stops and removes all processes from PM2's list.

---

## 🔧 Configuration (`.env` file)

| Variable               | Description                                                                                             | Example                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `PORT`                 | The port the server will run on.                                                                        | `8000`                                |
| `FRONTEND_URL`         | The URL of the frontend application for CORS.                                                           | `http://localhost:3000`               |
| `DB_URI`               | Your MongoDB connection string.                                                                         | `mongodb://localhost:27017/intranet`  |
| `JWT_SECRET`           | Secret key for signing short-lived access tokens. **Use a long, random string.**                          | `your-super-secret-key`               |
| `JWT_REFRESH_SECRET`   | A different, more complex secret for signing long-lived refresh tokens.                                 | `another-even-stronger-secret`        |
| `WHITELISTED_IPS`      | Comma-separated list of IPs allowed to access the API. For local dev, `::1` and `127.0.0.1` are needed. | `::1,127.0.0.1,192.168.1.100`         |
| `IP_NAME_MAPPING`      | (Optional) Assign friendly names to whitelisted IPs for the documentation page.                           | `::1:Local Dev,192.168.1.100:Office`  |
| `VIRUSTOTAL_API_KEY`   | (Optional) Your API key from virustotal.com. If blank, virus scanning is skipped.                         | `your-virustotal-api-key`             |
| `REDIS_HOST`           | The hostname for your Redis server.                                                                     | `127.0.0.1`                           |
| `REDIS_PORT`           | The port for your Redis server.                                                                         | `6379`                                |
| `GCS_PROJECT_ID`       | (Optional) Google Cloud project ID for GCS storage.                                                     | `my-gcp-project`                      |
| `GCS_BUCKET_NAME`      | (Optional) The name of the GCS bucket for avatar uploads.                                               | `achap-avatars`                       |
| `GCS_KEYFILE_PATH`     | (Optional) Path to your GCS JSON keyfile.                                                               | `./gcs-keyfile.json`                  |

---

## 🗺️ API Endpoints

The base URL for all endpoints is `/api`.

- **`GET /health`**: Public endpoint to check API and database health.
- **`/auth`**: User registration, login, logout, and token refresh.
- **`/users`**: User profile updates (password, avatar).
- **`/documents`**: Document upload, download, search, versioning, and metadata updates.
- **`/team`**: Team management for `Manager` and `Admin` roles.
- **`/stats`**: Aggregated system statistics for `Admin` roles.
- **`/notifications`**: Fetching and marking user notifications as read.

For detailed endpoint information, run the application and visit the root URL (`http://localhost:8000`) from a whitelisted IP address to view the live API documentation.
