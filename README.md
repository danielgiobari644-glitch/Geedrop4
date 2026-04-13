# Geedrop

Geedrop is a high-performance, social-first file sharing and communication platform. It combines secure cloud storage with real-time messaging and community-driven groups.

## 🚀 Features

- **Instant File Sharing**: Upload and manage files with a sleek, intuitive interface.
- **Real-time Messaging**: Direct and group chats integrated directly into the platform.
- **Communities**: Create and join groups to collaborate and share assets with specific teams.
- **Nearby Share**: A discovery mode for finding and sharing content with users in your immediate vicinity.
- **Forever Hosting**: Direct URLs for images and videos, perfect for embedding in websites or forums.
- **Secure Authentication**: Supports Google and Email/Password authentication via Firebase.
- **Modern UI**: Built with a "Glassmorphic" design using Tailwind CSS.

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Build Tool**: Vite

## 📦 Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `firebase-applet-config.json` file in the root directory with your Firebase configuration:
   ```json
   {
     "apiKey": "YOUR_API_KEY",
     "authDomain": "YOUR_AUTH_DOMAIN",
     "projectId": "YOUR_PROJECT_ID",
     "storageBucket": "YOUR_STORAGE_BUCKET",
     "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
     "appId": "YOUR_APP_ID",
     "firestoreDatabaseId": "(default)"
   }
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## 📄 License

This project is licensed under the MIT License.
