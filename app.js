// State Management
let state = {
    totalBalanceMinutes: 0,
    projects: ['Main Project', 'Admin', 'Meeting'],
    currentActivity: null, // { type: 'Project' | 'Break', name: string, start: timestamp }
    dailyLogs: [], // Array of completed segments { type, name, start, end }
    lastLogDate: null
};

// DOM Elements
const elements = {
    totalBalance: document.getElementById('total-balance'),
    dailyLog: document.getElementById('daily-log'),
    dayLabel: document.getElementById('current-day-label'),
    actionSheet: document.getElementById('action-sheet'),
    btnShowActions: document.getElementById('btn-show-actions'),
    btnActionProject: document.getElementById('btn-action-project'),
    btnActionBreak: document.getElementById('btn-action-break'),
    btnActionCancel: document.getElementById('btn-action-cancel'),
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
    const savedState = localStorage.getItem('timeio_state_v2');
    if (savedState) {
        state = { ...state, ...JSON.parse(savedState) };
    }

    // Check if it's a new day
    const currentDateStr = new Date().toDateString();
    if (state.lastLogDate !== currentDateStr) {
        // Automatically finish previous day if it exists
        if (state.dailyLogs.length > 0 || state.currentActivity) {
            finishWorkDay();
        }
        state.dailyLogs = [];
        state.lastLogDate = currentDateStr;
        saveState();
    }

    elements.dayLabel.textContent = `DAY : ${new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}`;

    renderAll();
    startRealtimeUpdate();
}

// Rendering
function renderAll() {
    renderLogs();
    renderProjects();
    updateTotalDisplay();
    elements.manualBalanceInput.value = state.totalBalanceMinutes;
}

function renderLogs() {
    elements.dailyLog.innerHTML = '';

    // Combine finished logs + current active activity
    const allLogs = [...state.dailyLogs];
    if (state.currentActivity) {
        allLogs.push({ ...state.currentActivity, end: Date.now(), isActive: true });
    }

    allLogs.forEach(log => {
        const div = document.createElement('div');
        div.className = `log-entry glass ${log.type === 'Break' ? 'break' : 'project'} ${log.isActive ? 'pulsing' : ''}`;

        const startTime = new Date(log.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endTime = log.isActive ? '...' : new Date(log.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        div.innerHTML = `
            <div class="entry-type">${log.type}: ${log.name}</div>
            <div class="entry-time">Start : ${startTime}</div>
            <div class="entry-time">End : ${endTime}</div>
        `;
        elements.dailyLog.appendChild(div);
    });
}

function updateTotalDisplay() {
    const hours = Math.floor(Math.abs(state.totalBalanceMinutes) / 60);
    const mins = Math.abs(state.totalBalanceMinutes) % 60;
    const sign = state.totalBalanceMinutes >= 0 ? '+' : '-';

    elements.totalBalance.textContent = `${sign}${hours}:${mins.toString().padStart(2, '0')}`;
    elements.totalBalance.className = 'balance-value ' + (state.totalBalanceMinutes >= 0 ? 'over' : 'under');
}

// Logic
function startActivity(type, name) {
    if (state.currentActivity) {
        stopCurrentActivity();
    }

    state.currentActivity = {
        type: type,
        name: name,
        start: Date.now()
    };

    elements.actionSheet.classList.add('hidden');
    saveState();
    renderAll();
}

function stopCurrentActivity() {
    if (!state.currentActivity) return;

    const finishedLog = {
        ...state.currentActivity,
        end: Date.now()
    };

    state.dailyLogs.push(finishedLog);
    state.currentActivity = null;
    saveState();
}

function finishWorkDay() {
    stopCurrentActivity();

    let totalWorkedMins = 0;
    let totalBreakMins = 0;

    state.dailyLogs.forEach(log => {
        const duration = (log.end - log.start) / 60000;
        if (log.type === 'Project') totalWorkedMins += duration;
        else totalBreakMins += duration;
    });

    const day = new Date().getDay();
    let targetMins = (day >= 1 && day <= 4) ? 480 : (day === 5 ? 360 : 0);

    // Logic: User must take at least 30 mins break. 
    // If they took less, the difference is subtracted from their work time.
    const breakShortfall = Math.max(0, 30 - totalBreakMins);
    const netWorked = totalWorkedMins - breakShortfall;
    const diff = netWorked - targetMins;

    state.totalBalanceMinutes += Math.round(diff);
    saveState();
}

// Event Listeners
elements.btnShowActions.onclick = () => elements.actionSheet.classList.remove('hidden');
elements.btnActionCancel.onclick = () => elements.actionSheet.classList.add('hidden');

elements.btnActionProject.onclick = () => {
    // Navigate to projects view to choose a project
    elements.navItems[1].click(); // Switch to Projects view
    elements.actionSheet.classList.add('hidden');
};

elements.btnActionBreak.onclick = () => {
    startActivity('Break', 'Coffee / Lunch');
};

function renderProjects() {
    elements.projectsList.innerHTML = '';
    state.projects.forEach(project => {
        const div = document.createElement('div');
        div.className = `project-item glass`;
        div.innerHTML = `
            <span>${project}</span>
            <button class="btn-secondary" onclick="startActivity('Project', '${project}')">Start</button>
        `;
        elements.projectsList.appendChild(div);
    });
}

function saveState() {
    localStorage.setItem('timeio_state_v2', JSON.stringify(state));
}

function startRealtimeUpdate() {
    setInterval(() => {
        if (state.currentActivity) renderLogs();
    }, 60000); // Update every minute
}

// Expose globally
window.startActivity = startActivity;

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

// Settings Handlers
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

init();
