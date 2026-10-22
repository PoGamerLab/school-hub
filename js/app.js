// Initial Default Datasets
const defaultStudents = [
  {
    id: "ali-hassan",
    name: "Ali Hassan",
    initials: "AH",
    roll: "07",
    role: "GRADE 10 · SECTION B · ROLL NO. 07",
    category: "Sports",
    tags: "Cricket · Chess",
    gradient: "linear-gradient(150deg, #1E6B4C, #0E271A)",
    bio: "Ali's the one who keeps the class cricket team's overs straight and can recall K2 base camp routes from memory. Loves a good debate almost as much as a good six.",
    favSubject: "Physics",
    hobbies: "Cricket, Chess, Trekking",
    favQuote: '"Slow and steady wins the climb."',
    birthday: "14 March",
    funFact: "Has hiked to Deosai twice",
    contact: "Instagram @ali.hassan"
  },
  {
    id: "sana-karim",
    name: "Sana Karim",
    initials: "SK",
    roll: "22",
    role: "GRADE 10 · SECTION B · ROLL NO. 22",
    category: "Art",
    tags: "Painting · Poetry",
    gradient: "linear-gradient(150deg, #D9A441, #A6742A)",
    bio: "Sana brings life to the classroom with her watercolor landscapes of the Karakoram range and reflective Urdu poetry.",
    favSubject: "Fine Arts & Literature",
    hobbies: "Painting, Sketching, Poetry",
    favQuote: '"Art enables us to find ourselves and lose ourselves at the same time."',
    birthday: "22 August",
    funFact: "Won 1st place in regional art competition",
    contact: "Instagram @sana.art"
  },
  {
    id: "zainab-bibi",
    name: "Zainab Bibi",
    initials: "ZB",
    roll: "15",
    role: "GRADE 10 · SECTION B · ROLL NO. 15",
    category: "Coding",
    tags: "Robotics · Reading",
    gradient: "linear-gradient(150deg, #153826, #1E6B4C)",
    bio: "Zainab is passionate about robotics and STEM. She leads the class science project group and loves solving complex algorithmic puzzles.",
    favSubject: "Computer Science",
    hobbies: "Robotics, Coding, Sci-Fi Novels",
    favQuote: '"The computer was born to solve problems that did not exist before."',
    birthday: "05 November",
    funFact: "Built a solar-powered mini rover model",
    contact: "GitHub @zainab-code"
  },
  {
    id: "musa-jaffer",
    name: "Musa Jaffer",
    initials: "MJ",
    roll: "31",
    role: "GRADE 10 · SECTION B · ROLL NO. 31",
    category: "Music",
    tags: "Football · Guitar",
    gradient: "linear-gradient(150deg, #A63B32, #7A2A23)",
    bio: "Musa lead-guitars for school assembly tunes and plays center-forward for the campus football team.",
    favSubject: "Mathematics",
    hobbies: "Football, Acoustic Guitar, Jamming",
    favQuote: '"Where words fail, music speaks."',
    birthday: "19 January",
    funFact: "Can play over 40 songs on guitar by ear",
    contact: "Instagram @musa.strings"
  },
  {
    id: "rukhsana-fida",
    name: "Rukhsana Fida",
    initials: "RF",
    roll: "03",
    role: "GRADE 10 · SECTION B · ROLL NO. 03",
    category: "Coding",
    tags: "Coding · Debate",
    gradient: "linear-gradient(150deg, #1E6B4C, #153826)",
    bio: "Rukhsana is an outspoken debater and web enthusiast who helped organize this class directory portal.",
    favSubject: "English Literature",
    hobbies: "Coding, Parliamentary Debate",
    favQuote: '"Knowledge is power, speech is its vector."',
    birthday: "30 April",
    funFact: "Best Speaker award at inter-school declamation",
    contact: "Email rukhsana@aps-skardu.edu.pk"
  },
  {
    id: "imran-karim",
    name: "Imran Karim",
    initials: "IK",
    roll: "11",
    role: "GRADE 10 · SECTION B · ROLL NO. 11",
    category: "Sports",
    tags: "Cricket · Hiking",
    gradient: "linear-gradient(150deg, #D9A441, #153826)",
    bio: "Imran is an all-rounder on the cricket pitch and an active mountaineering enthusiast exploring local Baltistan trails.",
    favSubject: "Geography",
    hobbies: "Cricket, Trail Hiking, Photography",
    favQuote: '"Over every mountain peak lies a new horizon."',
    birthday: "12 September",
    funFact: "Scaled 4,000m ridge during summer break",
    contact: "Instagram @imran.hikes"
  },
  {
    id: "nadia-aslam",
    name: "Nadia Aslam",
    initials: "NA",
    roll: "19",
    role: "GRADE 10 · SECTION B · ROLL NO. 19",
    category: "Music",
    tags: "Music · Baking",
    gradient: "linear-gradient(150deg, #0E271A, #1E6B4C)",
    bio: "Nadia sings in the school choir and bakes delicious treats for class celebrations.",
    favSubject: "Chemistry",
    hobbies: "Vocal Music, Pastry Baking, Keyboard",
    favQuote: '"Baking is love made edible."',
    birthday: "03 June",
    funFact: "Baked a 3-tier cake for school foundation day",
    contact: "Instagram @nadia.bakes"
  },
  {
    id: "hamza-wali",
    name: "Hamza Wali",
    initials: "HW",
    roll: "27",
    role: "GRADE 10 · SECTION B · ROLL NO. 27",
    category: "Sports",
    tags: "Football · Chess",
    gradient: "linear-gradient(150deg, #A6742A, #D9A441)",
    bio: "Hamza combines tactical chess thinking with sharp footwork on the football field as class captain.",
    favSubject: "Physics",
    hobbies: "Football, Chess, Table Tennis",
    favQuote: '"Strategy requires thought, execution requires courage."',
    birthday: "18 December",
    funFact: "Unbeaten in class chess tournament for 2 years",
    contact: "Instagram @hamza.fc"
  }
];

const defaultGallery = [
  {
    id: "gal-1",
    caption: "APSACS Official Crest & Campus Emblem",
    url: "images/apsacs-logo.png"
  },
  {
    id: "gal-2",
    caption: "Classroom 10B Learning & Study Wing",
    url: "images/apsacs-logo.png"
  },
  {
    id: "gal-3",
    caption: "Skardu Campus Grounds & Mountain Panorama",
    url: "images/apsacs-logo.png"
  }
];

const defaultTeachers = [
  {
    id: "tch-1",
    name: "Ma'am Farida Baig",
    initials: "FB",
    subject: "Physics · Class Teacher 10B",
    qualification: "M.Sc. Physics · Senior Educator",
    room: "Room 14",
    img: "images/apsacs-logo.png"
  },
  {
    id: "tch-2",
    name: "Sir Muhammad Ali",
    initials: "MA",
    subject: "Mathematics & Algebra",
    qualification: "M.Phil. Mathematics",
    room: "Room 08",
    img: ""
  },
  {
    id: "tch-3",
    name: "Ma'am Sadia Khan",
    initials: "SK",
    subject: "English Literature & Debate",
    qualification: "M.A. English · Debate Coach",
    room: "Room 12",
    img: ""
  },
  {
    id: "tch-4",
    name: "Sir Tariq Mehmood",
    initials: "TM",
    subject: "Computer Science & STEM",
    qualification: "BS Computer Science · STEM Lead",
    room: "STEM Lab 02",
    img: "images/apsacs-logo.png"
  },
  {
    id: "tch-5",
    name: "Ma'am Nazia Parveen",
    initials: "NP",
    subject: "Chemistry & Biology",
    qualification: "M.Sc. Organic Chemistry",
    room: "Science Lab 01",
    img: ""
  },
  {
    id: "tch-6",
    name: "Sir Ghulam Hassan",
    initials: "GH",
    subject: "Pakistan Studies & History",
    qualification: "M.A. History",
    room: "Room 05",
    img: ""
  }
];

// Class Superlatives Dataset
const defaultSuperlatives = [
  { id: "sup-1", icon: "🥾", title: "Most Likely to Lead an Expedition", winner: "Imran Karim", reason: "Already scaled a 4,000m ridge over summer break." },
  { id: "sup-2", icon: "😂", title: "Class Clown", winner: "Musa Jaffer", reason: "Can turn any assembly speech into a comedy sketch." },
  { id: "sup-3", icon: "⏰", title: "Fashionably Late, Every Time", winner: "Hamza Wali", reason: "Chess strategy over punctuality, apparently." },
  { id: "sup-4", icon: "🎨", title: "Future Artist to Watch", winner: "Sana Karim", reason: "Already won a regional art competition." },
  { id: "sup-5", icon: "🤖", title: "Most Likely to Build the Next Big Thing", winner: "Zainab Bibi", reason: "Built a solar-powered mini rover before Grade 10 ended." },
  { id: "sup-6", icon: "🗣️", title: "Best Debater", winner: "Rukhsana Fida", reason: "Wins arguments even when she's wrong (rarely happens)." }
];

// Memory Wall Dataset
const defaultMemories = [
  { id: "mem-1", quote: "Sir, the Wi-Fi in the STEM lab has more lag than my chess moves.", author: "Hamza Wali", context: "During Computer Science period" },
  { id: "mem-2", quote: "I didn't fail the quiz, the quiz failed to test my real potential.", author: "Musa Jaffer", context: "After a Chemistry quiz" },
  { id: "mem-3", quote: "Can we reschedule the trek? My legs are still recovering from the LAST trek.", author: "Ali Hassan", context: "Before the Founder's Day hike" },
  { id: "mem-4", quote: "Poetry is just complaining, but make it beautiful.", author: "Sana Karim", context: "Urdu Literature class" },
  { id: "mem-5", quote: "Robots don't complain about homework. I should build one to do mine.", author: "Zainab Bibi", context: "Robotics club" },
  { id: "mem-6", quote: "Undefeated in chess, unbeaten in excuses for skipping PT.", author: "The whole class", context: "About Hamza Wali" }
];

// LocalStorage Helper Functions
function loadStorageData(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveStorageData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("LocalStorage save failed:", e);
  }
}

// Active Datasets loaded from localStorage or defaults
let studentsData = loadStorageData("apsacs_students_data", defaultStudents);
let galleryData = loadStorageData("apsacs_gallery_data", defaultGallery);
let teachersData = loadStorageData("apsacs_teachers_data", defaultTeachers);
let superlativesData = loadStorageData("apsacs_superlatives_data", defaultSuperlatives);
let memoriesData = loadStorageData("apsacs_memories_data", defaultMemories);

let activeCategory = "All";
let searchQuery = "";
let currentStudentId = studentsData[0]?.id || "ali-hassan";

// Color Gradients Array for auto-assigning student avatars
const avatarGradients = [
  "linear-gradient(150deg, #1E6B4C, #0E271A)",
  "linear-gradient(150deg, #D9A441, #A6742A)",
  "linear-gradient(150deg, #153826, #1E6B4C)",
  "linear-gradient(150deg, #A63B32, #7A2A23)",
  "linear-gradient(150deg, #1E6B4C, #153826)",
  "linear-gradient(150deg, #D9A441, #153826)",
  "linear-gradient(150deg, #0E271A, #1E6B4C)",
  "linear-gradient(150deg, #A6742A, #D9A441)"
];

document.addEventListener("DOMContentLoaded", () => {
  const navButtons = document.querySelectorAll(".navlinks button");
  const screens = document.querySelectorAll(".screen");
  const gridContainer = document.querySelector(".grid");
  const searchInput = document.querySelector(".search input");
  const chipButtons = document.querySelectorAll(".chips .chip");
  const studentSelect = document.getElementById("profile-student-select");
  const backToStudentsBtn = document.getElementById("back-to-students-btn");

  const galleryContainer = document.getElementById("gallery-container");
  const teachersContainer = document.getElementById("teachers-container");
  const superlativesContainer = document.getElementById("superlatives-container");
  const memoriesContainer = document.getElementById("memories-container");

  // Modals
  const addStudentModal = document.getElementById("add-student-modal");
  const addPhotoModal = document.getElementById("add-photo-modal");
  const addTeacherModal = document.getElementById("add-teacher-modal");

  const openStudentBtn = document.getElementById("open-add-student-btn");
  const openPhotoBtn = document.getElementById("open-add-photo-btn");
  const openTeacherBtn = document.getElementById("open-add-teacher-btn");

  const closeStudentBtn = document.getElementById("close-student-modal");
  const closePhotoBtn = document.getElementById("close-photo-modal");
  const closeTeacherBtn = document.getElementById("close-teacher-modal");

  const addStudentForm = document.getElementById("add-student-form");

  const addSuperlativeModal = document.getElementById("add-superlative-modal");
  const openSuperlativeBtn = document.getElementById("open-add-superlative-btn");
  const closeSuperlativeBtn = document.getElementById("close-superlative-modal");
  const addSuperlativeForm = document.getElementById("add-superlative-form");

  const addMemoryModal = document.getElementById("add-memory-modal");
  const openMemoryBtn = document.getElementById("open-add-memory-btn");
  const closeMemoryBtn = document.getElementById("close-memory-modal");
  const addMemoryForm = document.getElementById("add-memory-form");
  const addPhotoForm = document.getElementById("add-photo-form");
  const addTeacherForm = document.getElementById("add-teacher-form");

  // Populate Student Dropdown Selector in Profile view
  function updateStudentDropdown() {
    if (!studentSelect) return;
    studentSelect.innerHTML = studentsData.map(s => 
      `<option value="${s.id}">Roll ${s.roll} — ${s.name}</option>`
    ).join("");
    studentSelect.value = currentStudentId;
  }

  if (studentSelect) {
    studentSelect.addEventListener("change", (e) => {
      loadStudentProfile(e.target.value);
    });
  }

  // Back button in Profile view
  if (backToStudentsBtn) {
    backToStudentsBtn.addEventListener("click", () => {
      switchScreen("students");
    });
  }
  
  // Tab Page Switcher
  function switchScreen(screenId) {
    navButtons.forEach(btn => {
      if (btn.dataset.screen === screenId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    screens.forEach(screen => {
      if (screen.id === screenId) {
        screen.classList.add("active");
      } else {
        screen.classList.remove("active");
      }
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Render Student Cards Grid
  function renderCards() {
    if (!gridContainer) return;
    
    const filtered = studentsData.filter(student => {
      const matchesCategory = (activeCategory === "All" || student.category.toLowerCase() === activeCategory.toLowerCase());
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            student.tags.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            student.roll.includes(searchQuery);
      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      gridContainer.innerHTML = `<div class="empty-notice">No students found matching "${searchQuery}".</div>`;
      return;
    }

    gridContainer.innerHTML = filtered.map(student => `
      <div class="card" data-id="${student.id}">
        <div class="card-photo" style="background:${student.gradient};">${student.initials}</div>
        <div class="card-body">
          <div class="cname">${student.name}</div>
          <div class="ctag">${student.tags}</div>
          <span class="ribbon mono">ROLL ${student.roll}</span>
        </div>
      </div>
    `).join("");
  }

  // Render Campus Photo Gallery
  function renderGallery() {
    if (!galleryContainer) return;
    galleryContainer.innerHTML = galleryData.map(item => `
      <div class="gallery-card">
        <div class="gallery-img-container">
          <img src="${item.url}" alt="${item.caption}" class="gallery-img" onerror="this.onerror=null; this.src='images/apsacs-logo.png';">
        </div>
        <div class="gallery-caption">${item.caption}</div>
      </div>
    `).join("");
  }

  // Render Teachers & Faculty Grid
  function renderTeachers() {
    if (!teachersContainer) return;
    teachersContainer.innerHTML = teachersData.map(tch => `
      <div class="teacher-card">
        <div class="teacher-photo-box">
          ${tch.img ? `<img src="${tch.img}" alt="${tch.name}" class="teacher-photo-img" onerror="this.remove()">` : ''}
          ${tch.initials}
        </div>
        <div class="teacher-name">${tch.name}</div>
        <span class="teacher-subject">${tch.subject}</span>
        <div class="teacher-details">
          <div>${tch.qualification}</div>
          <div style="font-family:'IBM Plex Mono',monospace; margin-top:4px; opacity:0.85;">📍 ${tch.room}</div>
        </div>
      </div>
    `).join("");
  }

  // Render Class Superlatives
  function renderSuperlatives() {
    if (!superlativesContainer) return;
    superlativesContainer.innerHTML = superlativesData.map(sup => `
      <div class="superlative-card">
        <div class="superlative-icon">${sup.icon}</div>
        <div class="superlative-title">${sup.title}</div>
        <div class="superlative-winner">${sup.winner}</div>
        ${sup.reason ? `<div class="superlative-reason">${sup.reason}</div>` : ""}
      </div>
    `).join("");
  }

  // Render Memory Wall
  function renderMemories() {
    if (!memoriesContainer) return;
    memoriesContainer.innerHTML = memoriesData.map(mem => `
      <div class="memory-card">
        <div class="memory-quote">${mem.quote}</div>
        <div class="memory-meta">
          <span class="memory-author">${mem.author}</span>
          ${mem.context ? `<span class="memory-context">${mem.context}</span>` : ""}
        </div>
      </div>
    `).join("");
  }

  // Event Delegation for clicking on any Student Card
  if (gridContainer) {
    gridContainer.addEventListener("click", (e) => {
      const card = e.target.closest(".card");
      if (card) {
        const studentId = card.dataset.id;
        loadStudentProfile(studentId);
        switchScreen("profile");
      }
    });
  }

  // Populate Profile View
  function loadStudentProfile(studentId) {
    const student = studentsData.find(s => s.id === studentId) || studentsData[0];
    if (!student) return;
    currentStudentId = student.id;

    if (studentSelect) {
      studentSelect.value = student.id;
    }
    
    const profileTag = document.getElementById("profile-roll-tag");
    const profilePhoto = document.querySelector("#profile .profile-photo");
    const pname = document.querySelector("#profile .pname");
    const prole = document.querySelector("#profile .prole");
    const pbio = document.querySelector("#profile .pbio");
    const fieldGrid = document.querySelector("#profile .field-grid");

    if (profileTag) profileTag.textContent = `ROLL ${student.roll}`;
    if (profilePhoto) {
      profilePhoto.style.background = student.gradient;
      profilePhoto.innerHTML = `
        ${student.initials}
        <div class="peak-tag">Photo — ${student.name}</div>
      `;
    }
    if (pname) pname.textContent = student.name;
    if (prole) prole.textContent = student.role;
    if (pbio) pbio.textContent = student.bio;

    if (fieldGrid) {
      fieldGrid.innerHTML = `
        <div class="field"><div class="flabel">Favourite subject</div><div class="fval">${student.favSubject}</div></div>
        <div class="field"><div class="flabel">Hobbies</div><div class="fval">${student.hobbies}</div></div>
        <div class="field"><div class="flabel">Favourite quote</div><div class="fval">${student.favQuote}</div></div>
        <div class="field"><div class="flabel">Birthday</div><div class="fval">${student.birthday}</div></div>
        <div class="field"><div class="flabel">Fun fact</div><div class="fval">${student.funFact}</div></div>
        <div class="field"><div class="flabel">Contact</div><div class="fval">${student.contact}</div></div>
      `;
    }
  }

  // Setup Event Listeners for Nav Bar Buttons
  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const screenId = btn.dataset.screen;
      if (screenId === "profile") {
        loadStudentProfile(currentStudentId);
      }
      switchScreen(screenId);
    });
  });

  // Hero CTAs
  const browseBtn = document.querySelector(".hero-ctas .btn-primary");
  if (browseBtn) {
    browseBtn.addEventListener("click", () => switchScreen("students"));
  }

  const aboutBtn = document.querySelector(".hero-ctas .btn-ghost");
  if (aboutBtn) {
    aboutBtn.addEventListener("click", () => switchScreen("school"));
  }

  // Search Input Event Listener
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderCards();
    });
  }

  // Category Chip Event Listeners
  chipButtons.forEach(chip => {
    chip.addEventListener("click", () => {
      chipButtons.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeCategory = chip.textContent.trim();
      renderCards();
    });
  });

  // Modals Open/Close Handlers
  if (openStudentBtn) openStudentBtn.addEventListener("click", () => addStudentModal.classList.add("active"));
  if (closeStudentBtn) closeStudentBtn.addEventListener("click", () => addStudentModal.classList.remove("active"));

  if (openSuperlativeBtn) openSuperlativeBtn.addEventListener("click", () => addSuperlativeModal.classList.add("active"));
  if (closeSuperlativeBtn) closeSuperlativeBtn.addEventListener("click", () => addSuperlativeModal.classList.remove("active"));

  if (openMemoryBtn) openMemoryBtn.addEventListener("click", () => addMemoryModal.classList.add("active"));
  if (closeMemoryBtn) closeMemoryBtn.addEventListener("click", () => addMemoryModal.classList.remove("active"));

  if (openPhotoBtn) openPhotoBtn.addEventListener("click", () => addPhotoModal.classList.add("active"));
  if (closePhotoBtn) closePhotoBtn.addEventListener("click", () => addPhotoModal.classList.remove("active"));
  
  if (openTeacherBtn) openTeacherBtn.addEventListener("click", () => addTeacherModal.classList.add("active"));
  if (closeTeacherBtn) closeTeacherBtn.addEventListener("click", () => addTeacherModal.classList.remove("active"));

  // Form Submission: Add Student Profile
  if (addStudentForm) {
    addStudentForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("student-name").value;
      const roll = document.getElementById("student-roll").value;
      const category = document.getElementById("student-category").value;
      const tags = document.getElementById("student-tags").value;
      const bio = document.getElementById("student-bio").value;
      const favSubject = document.getElementById("student-subject").value;
      const birthday = document.getElementById("student-birthday").value;
      const favQuote = document.getElementById("student-quote").value;
      const funFact = document.getElementById("student-fact").value;
      const contact = document.getElementById("student-contact").value;

      // Extract initials & random gradient
      const initials = name.trim().split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || "ST";
      const gradient = avatarGradients[Math.floor(Math.random() * avatarGradients.length)];
      const id = `std-${Date.now()}`;

      const newStudent = {
        id,
        name,
        initials,
        roll,
        role: `GRADE 10 · SECTION B · ROLL NO. ${roll}`,
        category,
        tags,
        gradient,
        bio,
        favSubject,
        hobbies: tags,
        favQuote: favQuote.startsWith('"') ? favQuote : `"${favQuote}"`,
        birthday,
        funFact,
        contact
      };

      studentsData.unshift(newStudent);
      saveStorageData("apsacs_students_data", studentsData);

      updateStudentDropdown();
      renderCards();
      loadStudentProfile(id);
      
      addStudentForm.reset();
      addStudentModal.classList.remove("active");
      switchScreen("profile");
    });
  }

  // Form Submission: Add Campus Picture
  if (addPhotoForm) {
    addPhotoForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = document.getElementById("photo-title").value;
      const url = document.getElementById("photo-url").value || "images/apsacs-logo.png";
      
      galleryData.unshift({
        id: `gal-${Date.now()}`,
        caption: title,
        url: url
      });
      saveStorageData("apsacs_gallery_data", galleryData);

      renderGallery();
      addPhotoForm.reset();
      addPhotoModal.classList.remove("active");
    });
  }

  // Form Submission: Add Faculty Teacher
  if (addTeacherForm) {
    addTeacherForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("teacher-name").value;
      const subject = document.getElementById("teacher-subject").value;
      const room = document.getElementById("teacher-room").value;
      const qual = document.getElementById("teacher-qual").value;
      const img = document.getElementById("teacher-img").value;

      const nameParts = name.replace(/(Sir|Ma'am|Mr|Mrs|Ms|Dr)\s+/i, '').trim().split(' ');
      const initials = nameParts.map(p => p[0]).join('').toUpperCase().slice(0, 2);

      teachersData.unshift({
        id: `tch-${Date.now()}`,
        name,
        initials: initials || "TR",
        subject,
        qualification: qual,
        room,
        img
      });
      saveStorageData("apsacs_teachers_data", teachersData);

      renderTeachers();
      addTeacherForm.reset();
      addTeacherModal.classList.remove("active");
    });
  }

  // Form Submission: Add Superlative
  if (addSuperlativeForm) {
    addSuperlativeForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const icon = document.getElementById("superlative-icon").value || "🏆";
      const title = document.getElementById("superlative-title").value;
      const winner = document.getElementById("superlative-winner").value;
      const reason = document.getElementById("superlative-reason").value;

      superlativesData.unshift({
        id: `sup-${Date.now()}`,
        icon,
        title,
        winner,
        reason
      });

      saveStorageData("apsacs_superlatives_data", superlativesData);
      renderSuperlatives();
      addSuperlativeForm.reset();
      addSuperlativeModal.classList.remove("active");
    });
  }

  // Form Submission: Add Memory
  if (addMemoryForm) {
    addMemoryForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const quote = document.getElementById("memory-quote").value;
      const author = document.getElementById("memory-author").value;
      const context = document.getElementById("memory-context").value;

      memoriesData.unshift({
        id: `mem-${Date.now()}`,
        quote,
        author,
        context
      });

      saveStorageData("apsacs_memories_data", memoriesData);
      renderMemories();
      addMemoryForm.reset();
      addMemoryModal.classList.remove("active");
    });
  }

  // Initial Renders
  updateStudentDropdown();
  renderCards();
  renderGallery();
  renderTeachers();
  renderSuperlatives();
  renderMemories();
  loadStudentProfile(currentStudentId);
  switchScreen("home");
});
