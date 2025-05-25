# SketchFlow

SketchFlow is a full-stack web application for real-time collaborative diagramming, inspired by Excalidraw. Built with the MERN stack, it allows users to create, edit, and share diagrams with features like shape drawing, text input, sticky notes, and a markdown editor. The app supports multi-user collaboration with live cursor tracking, making it ideal for brainstorming, education, and system design.

**[Live Demo](https://sketchflow.vercel.app)** | **[GitHub](https://github.com/sahilpate-221s/SketchFlow)**

## Features

- **Canvas Diagramming**:
  - Draw shapes: rectangles, circles, lines, arrows, freehand.
  - Add text boxes with font size, color, and alignment.
  - Customize colors, stroke styles (solid/dashed/dotted), and stroke widths.
  - Support grid snapping (10px), zoom, pan, undo/redo, copy/paste.
- **Real-Time Collaboration**:
  - Multi-user editing with instant shape/text sync via Socket.io.
  - Live cursor tracking with user-specific colors.
  - Public/private boards with shareable links.
- **Sticky Notes**:
  - Unique sidebar for resizable, colorful sticky note annotations.
- **Markdown Editor**:
  - Collapsible sidebar for technical notes with live preview.
- **Export/Import**:
  - Export diagrams as PNG, SVG, or JSON.
  - Import JSON to restore diagrams.
- **Authentication**:
  - JWT-based login/signup; guest access for public boards.
- **Responsive UI**:
  - Excalidraw-inspired design with Tailwind CSS (Handlee font, light backgrounds).
  - Keyboard shortcuts: Ctrl+Z (undo), Ctrl+C/V (copy/paste).

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Konva.js, Redux, react-color, React Markdown, React Router
- **Backend**: Node.js, Express.js, MongoDB (mongoose), Socket.io, JWT
- **Deployment**: Vercel (frontend), Render (backend), MongoDB Atlas
- **Tools**: Git, VS Code, Postman

## Screenshots

| Canvas Drawing | Real-Time Collaboration | Sticky Notes & Markdown |
|----------------|-------------------------|--------------------------|
| ![Canvas](screenshots/canvas.png) | ![Collaboration](screenshots/collaboration.png) | ![Notes](screenshots/notes.png) |

*Replace placeholders with actual screenshots.*

## Prerequisites

- Node.js (v18+)
- MongoDB Atlas account
- Vercel and Render accounts for deployment
- Git installed

## Setup Instructions

### Local Development

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/sahilpate-221s/sketchflow.git
   cd sketchflow
   ```

2. **Install Dependencies**:
   - Frontend:
     ```bash
     cd client
     npm install
     ```
   - Backend:
     ```bash
     cd server
     npm install
     ```

3. **Set Up Environment Variables**:
   - Create `/client/.env`:
     ```env
     VITE_API_URL=http://localhost:5000
     ```
   - Create `/server/.env`:
     ```env
     MONGO_URI=your_mongodb_atlas_uri
     JWT_SECRET=your_jwt_secret
     CLIENT_URL=http://localhost:3000
     ```

4. **Run the Application**:
   - Backend:
     ```bash
     cd server
     npm run start
     ```
   - Frontend:
     ```bash
     cd client
     npm run dev
     ```
   - Access at `http://localhost:3000`.

5. **Test Features**:
   - Draw shapes/text/sticky notes.
   - Open multiple browser tabs to test collaboration.
   - Export/import diagrams and use markdown editor.

### Deployment

1. **Frontend (Vercel)**:
   - Push `/client` to a GitHub repo.
   - Import repo in Vercel, set environment variable `VITE_API_URL` to backend URL.
   - Deploy and note the URL.

2. **Backend (Render)**:
   - Push `/server` to a GitHub repo.
   - Create a Render web service, add `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`.
   - Deploy and verify API endpoints.

3. **MongoDB Atlas**:
   - Create a cluster and whitelist Render’s IP.
   - Update `MONGO_URI` in Render.

## Usage

1. **Sign Up/Login**: Create an account or use guest access for public boards.
2. **Create a Board**: Start a new diagram or join via a shareable link.
3. **Draw and Collaborate**:
   - Use the toolbar to select tools (shapes, text, sticky notes).
   - Draw with grid snapping; zoom/pan for navigation.
   - Collaborate in real-time with live cursors.
4. **Add Notes**: Use the markdown editor for technical notes.
5. **Export/Import**: Save diagrams as PNG/SVG/JSON or import JSON.

## Challenges and Solutions

- **Challenge**: Achieving low-latency real-time collaboration.
  - **Solution**: Used Socket.io with optimized event handling (e.g., `update-shape`, `update-cursor`) and timestamp-based conflict resolution.
- **Challenge**: Implementing smooth zoom/pan with Konva.js.
  - **Solution**: Leveraged `stage.scale()` and `stage.position()` with scroll/pinch event listeners, synced via Socket.io.
- **Challenge**: Creating a hand-drawn aesthetic.
  - **Solution**: Applied Tailwind CSS with Handlee font and rounded, light-themed components.
- **Challenge**: Undo/redo across collaborators.
  - **Solution**: Stored actions in Redux stack, synced via Socket.io to maintain consistency.

## Contributing

Contributions are welcome! Please:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/xyz`).
3. Commit changes (`git commit -m 'Add xyz feature'`).
4. Push to the branch (`git push origin feature/xyz`).
5. Open a pull request.

## License

[MIT License](LICENSE)

## Contact

- **Portfolio**: [sahil.dev](https://sahildev0.netlify.app/)
- **GitHub**: [sahilpate-221s](https://github.com/sahilpate-221s)
- **Email**: [s.sahil007patel@gmail.com]

Built with 💻 by Sahil Pate.
