// State Management
let state = {
    totalBalanceMinutes: 0, // In minutes
    projects: ['Main Project', 'Admin', 'Meeting'],
    currentProject: 'Main Project',
    isTracking: false,
    sessionStartTime: null,
    elapsedSinceStart: 0, // milliseconds
    todayWorkedMinutes: 0,
    history: []
};

// DOM Elements
const elements = {
    totalBalance: document.getElementById('total-balance'),
    timerDisplay: document.getElementById('timer-display'),
    currentProjectDisplay: document.getElementById('current-project-display'),
    btnStart: document.getElementById('btn-start'),
    btnStop: document.getElementById('btn-stop'),
    btnFinish: document.getElementById('btn-finish'),
    projectsList: document.getElementById('projects-list'),
    newProjectInput: document.getElementById('new-project-name'),
    btnAddProject: document.getElementById('btn-add-project'),
    manualBalanceInput: document.getElementById('manual-balance'),
    btnSaveSettings: document.getElementById('btn-save-settings'),
    navItems: document.querySelectorAll('.nav-item'),
    views: document.querySelectorAll('.view')
};

// Initialization
function init() {
    const savedState = localStorage.getItem('timeio_state');
    if (savedState) {
        state = { ...state, ...JSON.parse(savedState) };
    }

    // Resume tracking if it was active
    if (state.isTracking && state.sessionStartTime) {
        // Adjust for background time if needed
    }

    renderAll();
    startUIUpdates();
}

// Rendering
function renderAll() {
    updateBalanceDisplay();
    renderProjects();
    elements.currentProjectDisplay.textContent = state.currentProject || 'Select a Project';
    elements.manualBalanceInput.value = state.totalBalanceMinutes;
}

function updateBalanceDisplay() {
    const hours = Math.floor(Math.abs(state.totalBalanceMinutes) / 60);
    const mins = Math.abs(state.totalBalanceMinutes) % 60;
    const sign = state.totalBalanceMinutes >= 0 ? '+' : '-';

    elements.totalBalance.textContent = `${sign}${hours}:${mins.toString().padStart(2, '0')}`;
    elements.totalBalance.className = 'balance-value ' + (state.totalBalanceMinutes >= 0 ? 'over' : 'under');
}

function renderProjects() {
    elements.projectsList.innerHTML = '';
    state.projects.forEach(project => {
        const div = document.createElement('div');
        div.className = `project-item glass ${state.currentProject === project ? 'active' : ''}`;
        div.innerHTML = `
            <span>${project}</span>
            <button class="btn-secondary" onclick="selectProject('${project}')">${state.currentProject === project ? 'Active' : 'Switch'}</button>
        `;
        elements.projectsList.appendChild(div);
    });
}

// Logic Functions
function startTracking() {
    state.isTracking = true;
    state.sessionStartTime = Date.now();
    elements.btnStart.classList.add('hidden');
    elements.btnStop.classList.remove('hidden');
    saveState();
}

function stopTracking() {
    if (!state.isTracking) return;

    const now = Date.now();
    const sessionMins = (now - state.sessionStartTime) / 60000;
    state.todayWorkedMinutes += sessionMins;

    state.isTracking = false;
    state.sessionStartTime = null;
    elements.btnStart.classList.remove('hidden');
    elements.btnStop.classList.add('hidden');
    saveState();
    renderAll();
}

function selectProject(project) {
    if (state.isTracking) {
        stopTracking();
        state.currentProject = project;
        startTracking();
    } else {
        state.currentProject = project;
    }
    renderAll();
    saveState();
}

function finishDay() {
    if (state.isTracking) stopTracking();

    const day = new Date().getDay(); // 0-6 (Sun-Sat)
    let targetMins = 0;

    if (day >= 1 && day <= 4) targetMins = 480; // Mon-Thu: 8h
    else if (day === 5) targetMins = 360;       // Fri: 6h
    else targetMins = 0;                        // Sat-Sun (optional)

    // Apply Break (30 mins)
    const netWorked = Math.max(0, state.todayWorkedMinutes - 30);
    const diff = netWorked - targetMins;

    state.totalBalanceMinutes += Math.round(diff);
    state.todayWorkedMinutes = 0; // Reset for next day

    alert(`Day Finished!\nWorked: ${Math.round(netWorked)} mins\nTarget: ${targetMins} mins\nBalance Change: ${Math.round(diff)} mins`);

    saveState();
    renderAll();
}

// Utility
function saveState() {
    localStorage.setItem('timeio_state', JSON.stringify(state));
}

function startUIUpdates() {
    setInterval(() => {
        if (state.isTracking) {
            const now = Date.now();
            const sessionMs = now - state.sessionStartTime;
            const totalMs = (state.todayWorkedMinutes * 60000) + sessionMs;

            const seconds = Math.floor((totalMs / 1000) % 60);
            const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
            const hours = Math.floor(totalMs / (1000 * 60 * 60));

            elements.timerDisplay.textContent =
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            const totalMs = state.todayWorkedMinutes * 60000;
            const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
            const hours = Math.floor(totalMs / (1000 * 60 * 60));
            elements.timerDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
        }
    }, 1000);
}

// Event Listeners
elements.btnStart.onclick = startTracking;
elements.btnStop.onclick = stopTracking;
elements.btnFinish.onclick = finishDay;

elements.btnAddProject.onclick = () => {
    const name = elements.newProjectInput.value.trim();
    if (name && !state.projects.includes(name)) {
        state.projects.push(name);
        elements.newProjectInput.value = '';
        renderProjects();
        saveState();
    }
};

elements.btnSaveSettings.onclick = () => {
    const val = parseInt(elements.manualBalanceInput.value);
    if (!isNaN(val)) {
        state.totalBalanceMinutes = val;
        renderAll();
        saveState();
        alert('Balance updated!');
    }
};

// Navigation
elements.navItems.forEach(item => {
    item.onclick = (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-view');

        elements.navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        elements.views.forEach(v => {
            if (v.id === `view-${targetView}`) v.classList.remove('hidden');
            else v.classList.add('hidden');
        });
    };
});

// Expose switch project globally for simple onclick in HTML template
window.selectProject = selectProject;

init();
