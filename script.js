const PREFIX = "note_"
const DEFAULT_COLOR = "#4fc3f7"
const USERS_KEY = "notes_app_users"

const Vue = window.Vue // Declaring Vue variable

Vue.filter("toLocaleDateString", (value) =>
  new Date(value).toLocaleDateString("es-ES", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }),
)

new Vue({
  el: "#app",
  data: {
    notes: [],
    selectedColor: DEFAULT_COLOR,
    newNote: {
      title: "",
      content: "",
    },
    editingNote: null,
    currentUser: null,
    isLogin: true,
    auth: {
      username: "",
      password: "",
    },
    users: [],
  },
  created() {
    // Make DEFAULT_COLOR available in templates
    this.DEFAULT_COLOR = DEFAULT_COLOR
  },
  mounted() {
    // Load users from localStorage
    this.loadUsers()

    // Check if a user is already logged in
    const savedUser = localStorage.getItem("current_user")
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser)
      this.loadNotes()
      this.loadLastUsedColor()
    }
  },
  watch: {
    // Watch for changes in editingNote to update the color picker
    editingNote(newVal) {
      if (newVal) {
        // When starting to edit a note, set the color picker to the note's color
        this.selectedColor = newVal.color || DEFAULT_COLOR
      } else {
        // When finishing editing, load the last used color
        this.loadLastUsedColor()
      }
    },
  },
  methods: {
    // User management methods
    loadUsers() {
      const savedUsers = localStorage.getItem(USERS_KEY)
      this.users = savedUsers ? JSON.parse(savedUsers) : []
    },

    saveUsers() {
      localStorage.setItem(USERS_KEY, JSON.stringify(this.users))
    },

    handleAuth() {
      if (!this.auth.username || !this.auth.password) {
        return alert("Por favor, ingresa nombre de usuario y contraseña")
      }

      if (this.isLogin) {
        this.login()
      } else {
        this.register()
      }
    },

    login() {
      const user = this.users.find((u) => u.username === this.auth.username && u.password === this.auth.password)

      if (user) {
        this.currentUser = {
          id: user.id,
          username: user.username,
        }
        localStorage.setItem("current_user", JSON.stringify(this.currentUser))
        this.loadNotes()
        this.loadLastUsedColor()
        this.resetAuthForm()
      } else {
        alert("Usuario o contraseña incorrectos")
      }
    },

    register() {
      // Check if username already exists
      if (this.users.some((u) => u.username === this.auth.username)) {
        return alert("El nombre de usuario ya existe")
      }

      const newUser = {
        id: "user_" + Math.random().toString(36).substr(2, 9),
        username: this.auth.username,
        password: this.auth.password,
      }

      this.users.push(newUser)
      this.saveUsers()

      // Auto login after registration
      this.currentUser = {
        id: newUser.id,
        username: newUser.username,
      }
      localStorage.setItem("current_user", JSON.stringify(this.currentUser))
      this.resetAuthForm()
    },

    logout() {
      this.currentUser = null
      localStorage.removeItem("current_user")
      this.notes = []
    },

    resetAuthForm() {
      this.auth.username = ""
      this.auth.password = ""
    },

    // Note management methods
    getUserPrefix() {
      return this.currentUser ? `${this.currentUser.id}_${PREFIX}` : PREFIX
    },

    getUserColorKey() {
      return this.currentUser ? `${this.currentUser.id}_last_color` : "last_color"
    },

    loadLastUsedColor() {
      const savedColor = localStorage.getItem(this.getUserColorKey())
      if (savedColor) {
        this.selectedColor = savedColor
      }
    },

    onColorChanged() {
      // Save the selected color
      localStorage.setItem(this.getUserColorKey(), this.selectedColor)

      // If we're editing a note, update its color
      if (this.editingNote) {
        this.editingNote.color = this.selectedColor

        // Also update the note in the array to see changes immediately
        const index = this.notes.findIndex((n) => n.id === this.editingNote.id)
        if (index !== -1) {
          // Create a temporary object with updated color for visual feedback
          const updatedNote = { ...this.notes[index], color: this.selectedColor }
          this.notes.splice(index, 1, updatedNote)
        }
      }
    },

    focusTextarea() {
      if (this.$refs.textarea) {
        this.$refs.textarea.focus()
      }
    },

    // Generate a unique ID for notes
    generateNoteId() {
      return this.getUserPrefix() + Date.now() + Math.random().toString(36).substr(2, 9)
    },

    // Load all notes for the current user
    loadNotes() {
      const prefix = this.getUserPrefix()
      this.notes = []

      // Get all keys from localStorage that start with the user prefix
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(prefix)) {
          try {
            const noteStr = localStorage.getItem(key)
            if (noteStr) {
              const note = JSON.parse(noteStr)

              // Make sure the note has a color
              if (!note.color) {
                note.color = DEFAULT_COLOR
                localStorage.setItem(key, JSON.stringify(note))
              }

              this.notes.push(note)
            }
          } catch (e) {
            console.error("Error loading note:", e)
          }
        }
      }

      // Sort notes by time (newest first)
      this.notes.sort((a, b) => b.time - a.time)
    },

    // Save a new note
    saveNote() {
      if (!this.newNote.title.trim()) {
        return alert("¡Por favor ingresa un título para la nota!")
      }

      if (!this.newNote.content.trim()) {
        return alert("¡Por favor escribe contenido para la nota!")
      }

      const noteId = this.generateNoteId()

      const note = {
        id: noteId,
        title: this.newNote.title.trim(),
        content: this.newNote.content.trim(),
        color: this.selectedColor,
        time: Date.now(),
      }

      // Save to localStorage
      localStorage.setItem(noteId, JSON.stringify(note))

      // Add to the beginning of the notes array
      this.notes.unshift(note)

      // Clear the form
      this.newNote.title = ""
      this.newNote.content = ""

      this.focusTextarea()
    },

    // Edit an existing note
    editNote(note) {
      // Create a copy of the note to edit
      this.editingNote = {
        id: note.id,
        title: note.title,
        content: note.content,
        color: note.color || DEFAULT_COLOR,
        time: note.time,
      }
    },

    // Save changes to an edited note
    saveEditingNote() {
      if (!this.editingNote) return

      if (!this.editingNote.title.trim()) {
        return alert("¡Por favor ingresa un título para la nota!")
      }

      if (!this.editingNote.content.trim()) {
        return alert("¡Por favor escribe contenido para la nota!")
      }

      // Update the time
      this.editingNote.time = Date.now()

      // Make sure the color is properly set (using the selectedColor from the color picker)
      this.editingNote.color = this.selectedColor

      // Save to localStorage
      localStorage.setItem(this.editingNote.id, JSON.stringify(this.editingNote))

      // Update the note in the array
      const index = this.notes.findIndex((n) => n.id === this.editingNote.id)
      if (index !== -1) {
        // Create a new object to ensure reactivity
        const updatedNote = { ...this.editingNote }
        this.notes.splice(index, 1, updatedNote)

        // Sort notes by time (newest first) after updating
        this.notes.sort((a, b) => b.time - a.time)
      }

      // Clear the editing state
      this.editingNote = null
    },

    // Cancel editing
    cancelEdit() {
      this.editingNote = null
      this.focusTextarea()
    },

    // Delete a note
    deleteNote(note) {
      if (!confirm("¿Realmente deseas eliminar esta nota?")) return

      // Remove from localStorage
      localStorage.removeItem(note.id)

      // Remove from the array
      const index = this.notes.findIndex((n) => n.id === note.id)
      if (index !== -1) {
        this.notes.splice(index, 1)
      }
    },
  },
})
