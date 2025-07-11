import mysql.connector

def get_conn():
    return mysql.connector.connect(
        host="localhost",
        user="zyan4",
        password="Xiot6peda",  # Use your actual password
        database="bulletin_board"
    )

def get_cursor(conn):
    return conn.cursor(dictionary=True)