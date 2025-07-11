import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from boards import boards_bp
from db import get_cursor, get_conn

app = Flask(__name__)
CORS(app)
app.register_blueprint(boards_bp)

# Helper to get or create a tag id
def get_tag(conn, name):
    cursor = get_cursor(conn)
    cursor.execute("SELECT id FROM tags WHERE name=%s", (name,))
    result = cursor.fetchone()
    cursor.close()
    if result:
        return result["id"]

    cursor = get_cursor(conn)
    cursor.execute("INSERT INTO tags (name) VALUES (%s)", (name,))
    conn.commit()
    tag_id = cursor.lastrowid
    cursor.close()
    return tag_id

@app.route("/")
def home():
    return "Welcome to the bulletin board!"

@app.route("/api/notes", methods=["GET"])
def get_notes():
    board_id = request.args.get("board_id", type=int)
    
    if board_id is None:
        return jsonify({"error": "Missing board_id"}), 400

    conn = get_conn()
    cursor = get_cursor(conn)
    cursor.execute("SELECT * FROM notes WHERE board_id = %s", (board_id,))
    notes = cursor.fetchall()
    cursor.close()

    cursor = get_cursor(conn)
    for note in notes:
        cursor.execute("""
            SELECT t.name FROM tags t
            JOIN note_tags nt ON t.id = nt.tag_id
            WHERE nt.note_id = %s
        """, (note["id"],))
        tags = cursor.fetchall()
        note["tags"] = [tag["name"] for tag in tags]
    cursor.close()
    conn.close()
    return jsonify(notes)

@app.route("/api/notes", methods=["POST"])
def post_note():
    data = request.get_json()
    board_id = data.get("board_id")

    if not board_id:
        return jsonify({"error": "Missing board_id"}), 400

    conn = get_conn()
    cursor = get_cursor(conn)
    query = "INSERT INTO notes (text, x, y, color, height, board_id) VALUES (%s, %s, %s, %s, %s, %s)"
    values = (
        data.get("text", ""),
        data.get("x", 100),
        data.get("y", 100),
        data.get("color", "#fffb7d"),
        data.get("height", 150),
        board_id
    )
    cursor.execute(query, values)
    conn.commit()
    note_id = cursor.lastrowid
    cursor.close()

    cursor = get_cursor(conn)
    tags = data.get("tags", [])
    for tag in tags:
        tag_id = get_tag(conn, tag)
        cursor.execute("INSERT INTO note_tags (note_id, tag_id) VALUES (%s, %s)", (note_id, tag_id))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"id": note_id, **data}), 201

@app.route("/api/notes/<int:id>", methods=["PUT"])
def put_note(id):
    data = request.get_json()
    conn = get_conn()
    cursor = get_cursor(conn)

    query = """
        UPDATE notes SET text=%s, x=%s, y=%s, color=%s, height=%s, board_id=%s WHERE id=%s
    """
    values = (
        data.get("text", ""),
        data.get("x", 100),
        data.get("y", 100),
        data.get("color", "#fffb7d"),
        data.get("height", 150),
        data.get("board_id"),
        id
    )
    cursor.execute(query, values)
    conn.commit()

    cursor.execute("DELETE FROM note_tags WHERE note_id = %s", (id,))
    tags = data.get("tags", [])
    for tag in tags:
        tag_id = get_tag(conn, tag)
        cursor.execute("INSERT INTO note_tags (note_id, tag_id) VALUES (%s, %s)", (id, tag_id))
    conn.commit()

    cursor.close()
    conn.close()
    return jsonify({"id": id, **data})

@app.route("/api/format", methods=["PUT"])
def format_note():
    data = request.get_json()
    note_id = data.get("note_id")
    text = data.get("text")
    format = data.get("format")

    if not text or not format:
        return jsonify({"error": "Missing text or format type"}), 400
    
    prompt = f"Reformat this text into a {format}: \n\n{text} \n\n Do not change words unless absolutely necessary. Do not return ANYTHING other than the reformatted text (do NOT return 'here is your reformatted text, etc)."
    response = requests.post(
        "http://localhost:11434/api/generate",
        json = {
            "model": "mistral",
            "prompt": prompt,
            "stream": False
        }
    )
    if response.status_code != 200:
        return jsonify({"error": "Failed to get AI response"})
    
    formatted_text = response.json().get("response", "").strip()

    conn = get_conn()
    cursor = get_cursor(conn)
    cursor.execute("UPDATE notes SET text = %s WHERE id = %s", (formatted_text, note_id))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"formatted": formatted_text})

@app.route("/api/notes/<int:id>", methods=["DELETE"])
def delete_note(id):
    conn = get_conn()
    cursor = get_cursor(conn)
    cursor.execute("DELETE FROM note_tags WHERE note_id=%s", (id,))
    cursor.execute("DELETE FROM notes WHERE id=%s", (id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Note deleted"})

if __name__ == "__main__":
    app.run(debug=True)
