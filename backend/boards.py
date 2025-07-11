from flask import Blueprint, request, jsonify
from db import get_conn, get_cursor

boards_bp = Blueprint('boards', __name__)

@boards_bp.route("/api/boards", methods=["GET"])
def get_boards():
    conn = get_conn()
    cursor = get_cursor(conn)
    cursor.execute("SELECT * FROM boards")
    boards = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(boards)

@boards_bp.route("/api/boards", methods=["POST"])
def create_board():
    data = request.get_json()
    name = data.get("name", "New Board")

    conn = get_conn()
    cursor = get_cursor(conn)
    cursor.execute("INSERT INTO boards (name) VALUES (%s)", (name,))
    conn.commit()
    board_id = cursor.lastrowid
    cursor.close()
    conn.close()
    return jsonify({"id": board_id, "name": name}), 201

@boards_bp.route("/api/boards/<int:board_id>", methods=["GET"])
def get_board(board_id):
    conn = get_conn()
    cursor = get_cursor(conn)
    cursor.execute("SELECT * FROM boards WHERE id=%s", (board_id,))
    board = cursor.fetchone()
    cursor.close()
    conn.close()
    if board:
        return jsonify(board)
    else:
        return jsonify({"error": "Board not found"}), 404
    
@boards_bp.route("/api/boards/<int:board_id>", methods=["DELETE"])
def delete_board(board_id):
    conn = get_conn()
    cursor = get_cursor(conn)

    cursor.execute("SELECT id FROM notes WHERE board_id=%s", (board_id,))  
    note_ids = [row["id"] for row in cursor.fetchall()]

    for note_id in note_ids:
        cursor.execute("DELETE FROM note_tags WHERE note_id=%s", (note_id,))
        cursor.execute("DELETE FROM notes WHERE id=%s", (note_id,))  

    cursor.execute("DELETE FROM boards WHERE id=%s", (board_id,))
    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"error": "Board deleted"}), 200

@boards_bp.route("/api/boards/<int:board_id>", methods=["PUT"])
def rename_board(board_id):
    data = request.get_json()
    new_name = data.get("name", "").strip()
    if not new_name:
        return jsonify({"error": "Missing name"}), 400
    
    conn = get_conn()
    cursor = get_cursor(conn)
    cursor.execute("UPDATE boards SET name=%s WHERE id=%s", (new_name, board_id))
    conn.commit()
    cursor.execute("SELECT * FROM boards WHERE id=%s", (board_id,))
    updated_board = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(updated_board)

