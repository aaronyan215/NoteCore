# NoteCore

NoteCore is a note taking and task managing app that prioritizes simplicity, efficiency, and fluidity. NoteCore is extremely simple to use, allows for unlimited notes, and also contains an AI feature for auto-formatting.

## Features

With NoteCore, you can:

- Create as many notes as you want
- Create, rename, and delete as many boards as you want
- Drag notes anywhere on the board, and overlap notes
- Utilize AI for easy formatting
- Change note colors
- Add tags to notes for easy organization/filtering
- Delete notes with a simple drag and drop feature

## Built With

NoteCore was coded entirely with:

- **Flask:** Backend
- **React:** Frontend
- **Rest API:** For communication between Flask and React
- **MySQL:** Database used to store boards and notes
- **Ollama:** Local AI model server
- **Mistral:** AI language model integrated via Ollama for note auto-formatting

## Setup

#### 1. Clone the repository

```bash
git clone https://github.com/aaronyan215
```

#### 2. Create and activate virtual environment (optional)

```bash
python -m venv .venv
.venv\Scripts\activate
```

#### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

#### 4. Install and set up MySQL

Make sure MySQL is installed, then start MySQL server and log in.
```bash
mysql -u root -p
```

Create the database and tables.
```sql
CREATE DATABASE bulletin_board;
USE bulletin_board;

CREATE TABLE boards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    text TEXT,
    x INT,
    y INT,
    color VARCHAR(20),
    height INT,
    board_id INT,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

CREATE TABLE tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE
);

CREATE TABLE note_tags (
    note_id INT,
    tag_id INT,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```
#### 5. Install and run Ollama and Mistral

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama serve
ollama run mistral
```

#### 6. Start Flask backend and React frontend

```bash
cd backend
python app.py

cd frontend
npm install
npm start
```

