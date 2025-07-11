import React, { useEffect, useState, useRef, useCallback } from "react";
import Draggable from "react-draggable";
import TextareaAutosize from "react-textarea-autosize";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashAlt, faStickyNote, faGear, faXmark } from "@fortawesome/free-solid-svg-icons";
import "./App.css";

function NotesBoard() {
  const [notes, setNotes] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editColor, setEditColor] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [editHeight, setEditHeight] = useState(null);
  const [topId, setTopId] = useState(null);
  const [editTags, setEditTags] = useState([]);
  const [filterTags, setFilterTags] = useState([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [boards, setBoards] = useState([]);
  const [currentBoardId, setCurrentBoardId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState("");

  const trashRef = useRef(null);
  const noteRefs = useRef({});

  const allTags = [...new Set(notes.flatMap(note => note.tags || []))];
  const hasUntagged = notes.some(note => !note.tags || note.tags.length === 0);
  const allFilterTags = hasUntagged ? [...allTags, "__no_tags__"] : allTags;

  useEffect(() => {
    if (currentBoardId === null) return;

    fetch(`http://localhost:5000/api/notes?board_id=${currentBoardId}`)
      .then(res => res.json())
      .then(data => {
        setNotes(data);

        // On first load, check all tags (including no_tags if needed)
        const tags = [...new Set(data.flatMap(note => note.tags || []))];
        const hasUntagged = data.some(note => !note.tags || note.tags.length === 0);
        const fullList = hasUntagged ? [...tags, "__no_tags__"] : tags;

        setFilterTags(prev => {
          if (prev.length === 0) return fullList;
          const merged = [...new Set([...prev, ...fullList])];
          return merged;
        });
      });
  }, [currentBoardId]);

  useEffect(() => {
    fetch("http://localhost:5000/api/boards")
      .then(res => res.json())
      .then(data => {
        setBoards(data)
        if (data.length > 0) {
          setCurrentBoardId(data[0].id);
        }
      })
  }, []);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const handleAdd = () => {
    const centerX = window.innerWidth / 2 - 100;
    const centerY = window.innerHeight / 2 - 75;

    const newNote = {
      text: "",
      x: centerX,
      y: centerY,
      color: "#fffb7d",
      height: 150,
      board_id: currentBoardId
    };

    fetch("http://localhost:5000/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newNote)
    })
      .then(res => res.json())
      .then(createdNote => {
        setNotes(prev => [...prev, createdNote]);
      });
  };

  const handleDelete = (id) => {
    fetch(`http://localhost:5000/api/notes/${id}`, {
      method: "DELETE"
    })
      .then(() => {
        setNotes(prev => prev.filter(note => note.id !== id));
      });
  };

  const handlePut = useCallback((note) => {
    const updatedNote = { ...note, text: editText, color: editColor, height: editHeight, tags: editTags, board_id: currentBoardId };
    fetch(`http://localhost:5000/api/notes/${note.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedNote)
    })
      .then(res => res.json())
      .then((updated) => {
        setNotes(prev =>
          prev.map(n => (n.id === updated.id ? updated : n))
        );
        setFilterTags(prev => {
          const updatedTags = updated.tags || [];
          const merged = [...new Set([...prev, ...updatedTags])];
          if (prev.includes("__no_tags__")) merged.push("__no_tags__");
          return merged;
        });
        setEditId(null);
        setEditText("");
        setEditColor("");
        setEditHeight(null);
        setShowSettings(false);
      });
  }, [editText, editColor, editHeight, editTags, currentBoardId]);

  const handleFormatNote = () => {
    fetch("http://localhost:5000/api/format", {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ text: editText, format: selectedFormat })
    })
      .then(res => res.json())
      .then(data => {
        if (data.formatted) {
          setEditText(data.formatted);
        } else {
          alert("Failed to format text");
        }
      })
      .catch(err => {
        console.error("Error formatting:", err);
        alert("An error occured");
      });
  };

  useEffect(() => {
    function handleClickOutside(event) {
      const noteRef = noteRefs.current[editId];
      if (
        editId !== null &&
        noteRef &&
        noteRef.current &&
        !noteRef.current.contains(event.target)
      ) {
        const note = notes.find(n => n.id === editId);
        if (note) {
          handlePut(note);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editId, notes, handlePut]);

  const handleStop = (e, data, note) => {
    const trashBox = trashRef.current.getBoundingClientRect();
    const noteBox = e.target.getBoundingClientRect();

    const isInTrash =
      noteBox.right > trashBox.left &&
      noteBox.left < trashBox.right &&
      noteBox.bottom > trashBox.top &&
      noteBox.top < trashBox.bottom;

    if (isInTrash) {
      handleDelete(note.id);
    } else {
      const updatedNote = { ...note, x: data.x, y: data.y };
      fetch(`http://localhost:5000/api/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedNote)
      })
        .then(res => res.json())
        .then((updated) => {
          setNotes(prev =>
            prev.map(n => (n.id === updated.id ? updated : n))
          );
        });
    }
  };

  return (
    <div className="bulletin-board">
      <button className="add-button" onClick={handleAdd}>
        <FontAwesomeIcon icon={faStickyNote} />
      </button>
      <div className="trash-zone" ref={trashRef}>
        <FontAwesomeIcon icon={faTrashAlt} style={{ color: "black" }} />
      </div>

      <div style={{ position: "absolute", top: "1rem", left: "7.5rem", zIndex: 999 }}>
        <select
          value={currentBoardId || ""}
          onChange={(e) => setCurrentBoardId(Number(e.target.value))}
          onContextMenu={(e) => {
            e.preventDefault();
            const option = e.target;
            const boardId = Number(option.value);
            if (!isNaN(boardId)) {
              setContextMenu({ x: e.clientX, y: e.clientY, boardId });
            }
          }}
          style={{
            padding: "6px",
            fontSize: "0.9rem",
            maxWidth: "200px"
          }}
        >
          {boards.map(board => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </select>


        <button
          onClick={() => {
            const name = prompt("Board name?");
            if (name) {
              fetch("http://localhost:5000/api/boards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({name})
              })
                .then(res => res.json())
                .then(newBoard => {
                  setBoards(prev => [...prev, newBoard]);
                  setCurrentBoardId(newBoard.id);
                });
            }
          }}
          style={{ marginLeft: "8px", padding: "6px", fontSize: "0.9rem" }}
        >
          + New Board
        </button>
      </div>

      {/* Filter Tag Dropdown */}
      <div style={{ position: "absolute", top: "1rem", left: "1rem", zIndex: 999 }}>
        <button
          onClick={() => setShowFilterDropdown(prev => !prev)}
          style={{
            padding: "6px 12px",
            fontSize: "0.9rem",
            cursor: "pointer"
          }}
        >
          Filter Tags
        </button>

        <div
          className={`dropdown-menu ${showFilterDropdown ? "show" : ""}`}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            backgroundColor: "#fff",
            border: "1px solid #ccc",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
            padding: "0.5rem",
            marginTop: "0.25rem",
            zIndex: 1000,
            minWidth: "160px"
          }}
        >
          {/* "All" checkbox */}
          <label style={{ display: "flex", alignItems: "center", marginBottom: "4px", fontWeight: "bold" }}>
            <input
              type="checkbox"
              checked={filterTags.length === allFilterTags.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setFilterTags(allFilterTags);
                } else {
                  setFilterTags([]);
                }
              }}
              style={{ marginRight: "0.5rem" }}
            />
            All
          </label>

          {/* "No Tags" checkbox */}
          {hasUntagged && (
            <label style={{ display: "flex", alignItems: "center", marginBottom: "4px", fontWeight: "bold" }}>
              <input
                type="checkbox"
                value="__no_tags__"
                checked={filterTags.includes("__no_tags__")}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setFilterTags(prev =>
                    checked ? [...prev, "__no_tags__"] : prev.filter(t => t !== "__no_tags__")
                  );
                }}
                style={{ marginRight: "0.5rem" }}
              />
              No Tags
            </label>
          )}

          {/* Individual Tag Checkboxes */}
          {allTags.map(tag => (
            <label
              key={tag}
              style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}
            >
              <input
                type="checkbox"
                value={tag}
                checked={filterTags.includes(tag)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setFilterTags(prev =>
                    checked ? [...prev, tag] : prev.filter(t => t !== tag)
                  );
                }}
                style={{ marginRight: "0.5rem" }}
              />
              {tag}
            </label>
          ))}
        </div>
      </div>

      {/* Render Notes */}
      {notes
        .filter(note => {
          if (!filterTags.length) return false;
          const noteTags = note.tags || [];
          const hasNoTags = noteTags.length === 0;
          const noTagsSelected = filterTags.includes("__no_tags__");
          const allTagsSelected = filterTags.length === allFilterTags.length;

          if (allTagsSelected) return true;
          return (
            (noTagsSelected && hasNoTags) ||
            noteTags.some(tag => filterTags.includes(tag))
          );
        })
        .map(note => {
          if (!noteRefs.current[note.id]) {
            noteRefs.current[note.id] = React.createRef();
          }

          const nodeRef = noteRefs.current[note.id];

          return (
            <Draggable
              key={note.id}
              nodeRef={nodeRef}
              position={{ x: note.x || 100, y: note.y || 100 }}
              disabled={editId === note.id}
              onStart={() => setTopId(note.id)}
              onStop={(e, data) => handleStop(e, data, note)}
            >
              <div
                ref={nodeRef}
                className={`sticky-note ${note.id === topId ? "active" : ""} ${editId === note.id ? "editing" : ""}`}
                style={{
                  backgroundColor: note.color || "#fffb7d",
                  zIndex: note.id === topId ? 1000 : 1,
                  width: note.width || 200
                }}
                onDoubleClick={() => {
                  setEditId(note.id);
                  setEditText(note.text);
                  setEditColor(note.color || "#fffb7d");
                  setTopId(note.id);
                  setEditHeight(note.height || 150);
                  setEditTags(note.tags || []);
                }}
              >
                {/* Edit Mode */}
                {editId === note.id ? (
                  <>
                    <TextareaAutosize
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onHeightChange={(height) => setEditHeight(height)}
                      style={{
                        width: "100%",
                        height: editHeight,
                        border: "none",
                        background: "transparent",
                        resize: "none",
                        outline: "none",
                        fontFamily: "inherit"
                      }}
                      minRows={3}
                    />
                    <div className="note-controls" style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                      <button onClick={() => setShowSettings(prev => !prev)} style={{ backgroundColor: "transparent", border: "none" }}>
                        <FontAwesomeIcon icon={faGear} />
                      </button>
                      <button onClick={() => setEditId(null)} style={{ backgroundColor: "transparent", border: "none", fontSize: "1.1rem" }}>
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>
                    {showSettings && (
                      <div className="note-settings" style={{ marginTop: "0.5rem" }}>
                        <label>
                          Color:
                          <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} />
                        </label>
                        <div style={{ marginTop: "0.5rem" }}>
                          <input
                            type="text"
                            placeholder="add tags"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && e.target.value.trim() !== "") {
                                const tag = e.target.value.trim();
                                if (!editTags.includes(tag)) {
                                  setEditTags([...editTags, tag]);
                                }
                                e.target.value = "";
                              }
                            }}
                            style={{
                              display: "block",
                              width: "100%",
                              boxSizing: "border-box",
                              padding: "6px 8px",
                              fontSize: "0.85rem",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                              marginTop: "0.25rem"
                            }}
                          />
                          <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "5px" }}>
                            {editTags.map(tag => (
                              <span
                                key={tag}
                                style={{
                                  backgroundColor: "#ddd",
                                  padding: "2px 6px",
                                  borderRadius: "12px",
                                  fontSize: "0.75rem"
                                }}
                              >
                                {tag}
                                <button
                                  onClick={() => setEditTags(editTags.filter(t => t !== tag))}
                                  style={{ marginLeft: "4px", border: "none", background: "transparent", cursor: "pointer" }}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                        <select
                          value={selectedFormat}
                          onChange={(e) => setSelectedFormat(e.target.value)}
                          style={{ marginTop: "0.5rem", width: "100%" }}
                        >
                          <option value="starred list, like a bulleted list with * instead of -">Bulleted List</option>
                          <option value="numbered list">To-Do List</option>
                          <option value="bulleted list -">Dashed List</option>
                        </select>

                        <button
                          onClick={() => handleFormatNote()}
                          style={{
                            marginTop: "0.5rem",
                            width: "100%",
                            padding: "6px",
                            backgroundColor: "#f0f0f0",
                            border: "1px solid #ccc",
                            cursor: "pointer"
                          }}
                          disabled={!selectedFormat || !editText}
                        >
                          Auto-format with AI (beta)
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{note.text || "double click to edit"}</div>
                    {(note.tags || []).length > 0 && (
                      <div style={{ marginTop: "2.5rem", display: "flex", flexWrap: "wrap", gap: "5px" }}>
                        {note.tags.map(tag => (
                          <span
                            key={tag}
                            style={{
                              backgroundColor: "#eee",
                              padding: "2px 6px",
                              borderRadius: "12px",
                              fontSize: "0.75rem"
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </Draggable>
          );
        })}

      {contextMenu && (
        <div
          style={{
            position: "absolute",
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: "white",
            border: "1px solid #ccc",
            padding: "5px 0",
            zIndex: 10000,
            boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.2)",
            minWidth: "140px"
          }}
          onBlur={() => setContextMenu(null)}
        >
          <div
            onClick={() => {
              const newName = prompt("Enter new board name:");
              if (newName && newName.trim()) {
                fetch(`http://localhost:5000/api/boards/${contextMenu.boardId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: newName.trim() })
                })
                  .then(res => res.json())
                  .then(updatedBoard => {
                    setBoards(prev =>
                      prev.map(b =>
                        b.id === updatedBoard.id ? { ...b, name: updatedBoard.name } : b
                      )
                    );
                    setContextMenu(null);
                  });
              } else {
                setContextMenu(null);
              }
            }}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              borderBottom: "1px solid #eee",
              fontSize: "0.9rem"
            }}
          >
            Rename Board
          </div>

          <div
            onClick={() => {
              const confirmed = window.confirm("Are you sure you want to delete this board?");
              if (confirmed) {
                fetch(`http://localhost:5000/api/boards/${contextMenu.boardId}`, {
                  method: "DELETE",
                }).then(() => {
                  setBoards(prev => prev.filter(b => b.id !== contextMenu.boardId));
                  if (contextMenu.boardId === currentBoardId) {
                    setCurrentBoardId(prev => {
                      const remaining = boards.filter(b => b.id !== contextMenu.boardId);
                      return remaining.length > 0 ? remaining[0].id : null;
                    });
                  }
                  setContextMenu(null);
                });
              } else {
                setContextMenu(null);
              }
            }}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            Delete Board
          </div>
        </div>
      )}

    </div>
  );
}

export default NotesBoard;
