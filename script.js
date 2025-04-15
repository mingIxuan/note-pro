const PREFIX = "note_"
const DEFAULT_COLOR = "#4fc3f7"
const USERS_KEY = "notes_app_users"

const Vue = window.Vue

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
    this.DEFAULT_COLOR = DEFAULT_COLOR
  },
  mounted() {
    this.loadUsers()

    const savedUser = localStorage.getItem("current_user")
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser)
      this.loadNotes()
      this.loadLastUsedColor()
    }
  },
  watch: {
    editingNote(newVal) {
      if (newVal) {
        this.selectedColor = newVal.color || DEFAULT_COLOR
      } else {
        this.loadLastUsedColor()
      }
    },
  },
  methods: {
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
      localStorage.setItem(this.getUserColorKey(), this.selectedColor)

      if (this.editingNote) {
        this.editingNote.color = this.selectedColor

        const index = this.notes.findIndex((n) => n.id === this.editingNote.id)
        if (index !== -1) {
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

    generateNoteId() {
      return this.getUserPrefix() + Date.now() + Math.random().toString(36).substr(2, 9)
    },

    loadNotes() {
      const prefix = this.getUserPrefix()
      this.notes = []

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(prefix)) {
          try {
            const noteStr = localStorage.getItem(key)
            if (noteStr) {
              const note = JSON.parse(noteStr)

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

      this.notes.sort((a, b) => b.time - a.time)
    },

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

      localStorage.setItem(noteId, JSON.stringify(note))

      this.notes.unshift(note)

      this.newNote.title = ""
      this.newNote.content = ""

      this.focusTextarea()
    },

    editNote(note) {
      this.editingNote = {
        id: note.id,
        title: note.title,
        content: note.content,
        color: note.color || DEFAULT_COLOR,
        time: note.time,
      }
    },

    saveEditingNote() {
      if (!this.editingNote) return

      if (!this.editingNote.title.trim()) {
        return alert("¡Por favor ingresa un título para la nota!")
      }

      if (!this.editingNote.content.trim()) {
        return alert("¡Por favor escribe contenido para la nota!")
      }

      this.editingNote.time = Date.now()

      this.editingNote.color = this.selectedColor

      localStorage.setItem(this.editingNote.id, JSON.stringify(this.editingNote))

      const index = this.notes.findIndex((n) => n.id === this.editingNote.id)
      if (index !== -1) {
        const updatedNote = { ...this.editingNote }
        this.notes.splice(index, 1, updatedNote)

        this.notes.sort((a, b) => b.time - a.time)
      }

      this.editingNote = null
    },

    cancelEdit() {
      this.editingNote = null
      this.focusTextarea()
    },

    deleteNote(note) {
      if (!confirm("¿Realmente deseas eliminar esta nota?")) return

      localStorage.removeItem(note.id)

      const index = this.notes.findIndex((n) => n.id === note.id)
      if (index !== -1) {
        this.notes.splice(index, 1)
      }
    },
  },
})