const form = document.getElementById('habitForm');
const habitList = document.getElementById('habitList');
const emptyState = document.getElementById('emptyState');
const noSearchResults = document.getElementById('noSearchResults');
const template = document.getElementById('habitTemplate');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const clearAll = document.getElementById('clearAll');
const exportData = document.getElementById('exportData');
const cancelEdit = document.getElementById('cancelEdit');
const habitId = document.getElementById('habitId');
const habitName = document.getElementById('habitName');
const habitGoal = document.getElementById('habitGoal');
const habitColor = document.getElementById('habitColor');
const formTitle = document.getElementById('formTitle');
const totalHabits = document.getElementById('totalHabits');
const completedToday = document.getElementById('completedToday');
const bestStreak = document.getElementById('bestStreak');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');
const progressFill = document.getElementById('progressFill');
const progressBar = document.querySelector('.progress-bar');
const progressTextCircle = document.getElementById('progressTextCircle');
const progressPercentCircle = document.getElementById('progressPercentCircle');
const weeklyChart = document.getElementById('weeklyChart');
const avgStreak = document.getElementById('avgStreak');
const totalCompletions = document.getElementById('totalCompletions');
const activeToday = document.getElementById('activeToday');
const completionRate = document.getElementById('completionRate');
const streakList = document.getElementById('streakList');
const searchInput = document.getElementById('searchInput');
const filterAll = document.getElementById('filterAll');
const filterCompleted = document.getElementById('filterCompleted');
const filterPending = document.getElementById('filterPending');
const toastContainer = document.getElementById('toastContainer');

const LS_KEY = 'smart-habit-tracker-v1';
const THEME_KEY = 'smart-habit-theme-v1';

let habits = loadHabits();
let theme = localStorage.getItem(THEME_KEY) || 'light';
let searchQuery = '';
let filterStatus = 'all';

applyTheme(theme);
updateFilterButtons();
render();

themeToggle.addEventListener('click', () => {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
});

searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    render();
});

filterAll.addEventListener('click', () => {
    filterStatus = 'all';
    updateFilterButtons();
    render();
});

filterCompleted.addEventListener('click', () => {
    filterStatus = 'completed';
    updateFilterButtons();
    render();
});

filterPending.addEventListener('click', () => {
    filterStatus = 'pending';
    updateFilterButtons();
    render();
});

exportData.addEventListener('click', () => {
    const dataStr = JSON.stringify(habits, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'habit-tracker-data.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Export completed', 'info');
});

form.addEventListener('submit', e => {
    e.preventDefault();
    const name = habitName.value.trim();
    if (!name) return;

    const goal = Number(habitGoal.value);
    const color = habitColor.value;

    if (habitId.value) {
        habits = habits.map(h => h.id === habitId.value ? { ...h, name, goal, color } : h);
        showToast('Habit updated successfully', 'success');
    } else {
        habits.unshift({
            id: crypto.randomUUID(),
            name,
            goal,
            color,
            streak: 0,
            bestStreak: 0,
            totalCompletions: 0,
            doneDates: [],
            createdAt: Date.now()
        });
        showToast('Habit added successfully', 'success');
    }

    save();
    resetForm();
    render();
});

cancelEdit.addEventListener('click', resetForm);

clearAll.addEventListener('click', () => {
    if (confirm('Delete all habits?')) {
        habits = [];
        save();
        render();
        resetForm();
        showToast('All habits cleared', 'info');
    }
});

function toggleDone(id) {
    const today = new Date().toISOString().slice(0, 10);

    habits = habits.map(h => {
        if (h.id !== id) return h;

        const doneDates = [...new Set(h.doneDates || [])];
        const already = doneDates.includes(today);

        let streak = h.streak || 0;
        let best = h.bestStreak || 0;
        let total = h.totalCompletions || 0;

        if (already) {
            doneDates.splice(doneDates.indexOf(today), 1);
            streak = Math.max(0, streak - 1);
            showToast('Habit marked as pending', 'info');
        } else {
            doneDates.push(today);
            streak = updateStreak(h, today);
            best = Math.max(best, streak);
            total += 1;
            showToast('Habit completed', 'success');
        }

        return { ...h, doneDates, streak, bestStreak: best, totalCompletions: total };
    });

    save();
    render();
}

function updateStreak(h, today) {
    const dates = [...(h.doneDates || []), today].sort();
    let streak = 0;
    let current = new Date(today);

    for (let i = dates.length - 1; i >= 0; i--) {
        const d = dates[i];
        const ds = current.toISOString().slice(0, 10);
        if (d === ds) {
            streak++;
            current.setDate(current.getDate() - 1);
        } else if (d < ds) {
            break;
        }
    }
    return streak;
}

function render() {
    habitList.innerHTML = '';

    const today = new Date().toISOString().slice(0, 10);

    const filteredHabits = habits.filter(h => {
        const matchesSearch = h.name.toLowerCase().includes(searchQuery);
        const completed = (h.doneDates || []).includes(today);
        const matchesFilter =
            filterStatus === 'all' ||
            (filterStatus === 'completed' && completed) ||
            (filterStatus === 'pending' && !completed);

        return matchesSearch && matchesFilter;
    });

    emptyState.style.display = habits.length === 0 ? 'block' : 'none';
    noSearchResults.style.display = habits.length > 0 && filteredHabits.length === 0 ? 'block' : 'none';

    const total = habits.length;
    const done = habits.filter(h => (h.doneDates || []).includes(today)).length;
    const best = Math.max(0, ...habits.map(h => h.bestStreak || 0));

    totalHabits.textContent = total;
    completedToday.textContent = done;
    bestStreak.textContent = best;

    const percent = total ? Math.round((done / total) * 100) : 0;
    progressText.textContent = `${done} of ${total} completed`;
    progressPercent.textContent = `${percent}%`;
    progressTextCircle.textContent = `${done}/${total}`;
    progressPercentCircle.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
    progressBar.setAttribute('aria-valuenow', percent);

    renderAnalytics(today);
    renderWeeklyChart(today);
    renderStreakList();

    filteredHabits.forEach((h, index) => {
        const node = template.content.cloneNode(true);
        const item = node.querySelector('.habit-item');
        item.style.animationDelay = `${index * 0.05}s`;

        const badge = node.querySelector('.habit-badge');
        const name = node.querySelector('.habit-name');
        const meta = node.querySelector('.habit-meta');
        const status = node.querySelector('.habit-status');
        const miniFill = node.querySelector('.mini-bar span');

        const doneDates = h.doneDates || [];
        const completed = doneDates.includes(today);

        badge.style.background = h.color;
        name.textContent = h.name;
        meta.textContent = `Goal: ${h.goal}x daily • Streak: ${h.streak || 0} • Best: ${h.bestStreak || 0}`;
        status.textContent = completed ? `Completed today • ${doneDates.length}/${h.goal}` : `Pending • ${doneDates.length}/${h.goal}`;
        miniFill.style.width = `${Math.min(100, (doneDates.length / h.goal) * 100)}%`;

        const checkBtn = item.querySelector('.check-btn');
        checkBtn.textContent = completed ? 'Undo' : 'Done';
        checkBtn.addEventListener('click', () => toggleDone(h.id));
        item.querySelector('.edit-btn').addEventListener('click', () => startEdit(h));
        item.querySelector('.delete-btn').addEventListener('click', () => deleteHabit(h.id));

        habitList.appendChild(node);
    });
}

function renderAnalytics(today) {
    if (!habits.length) {
        avgStreak.textContent = '0';
        totalCompletions.textContent = '0';
        activeToday.textContent = '0';
        completionRate.textContent = '0%';
        return;
    }

    const totalStreak = habits.reduce((sum, h) => sum + (h.streak || 0), 0);
    const avg = Math.round(totalStreak / habits.length);
    const completions = habits.reduce((sum, h) => sum + (h.totalCompletions || 0), 0);
    const active = habits.filter(h => (h.doneDates || []).includes(today)).length;
    const rate = Math.round((active / habits.length) * 100);

    avgStreak.textContent = avg;
    totalCompletions.textContent = completions;
    activeToday.textContent = active;
    completionRate.textContent = `${rate}%`;
}

function renderStreakList() {
    const sorted = [...habits].sort((a, b) => (b.bestStreak || 0) - (a.bestStreak || 0)).slice(0, 5);
    streakList.innerHTML = '';

    if (!sorted.length) {
        streakList.innerHTML = '<div class="streak-row"><span>No streak data yet</span></div>';
        return;
    }

    sorted.forEach(h => {
        const row = document.createElement('div');
        row.className = 'streak-row';
        row.innerHTML = `<strong>${escapeHtml(h.name)}</strong><span>${h.bestStreak || 0}</span>`;
        streakList.appendChild(row);
    });
}

function renderWeeklyChart(today) {
    if (typeof Plotly === 'undefined') return;

    const dates = [];
    const values = [];
    const habitsCount = habits.length || 1;

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString(undefined, { weekday: 'short' });
        dates.push(label);
        values.push(habits.filter(h => (h.doneDates || []).includes(key)).length);
    }

    const dark = document.body.classList.contains('dark');
    const textColor = dark ? '#e5e7eb' : '#0f172a';
    const gridColor = dark ? 'rgba(148,163,184,0.14)' : 'rgba(148,163,184,0.22)';

    const trace = {
        x: dates,
        y: values,
        type: 'bar',
        marker: {
            color: '#7c3aed',
            line: { color: '#6d28d9', width: 1 }
        },
        hovertemplate: '%{x}: %{y} completed<extra></extra>'
    };

    const layout = {
        margin: { l: 28, r: 16, t: 10, b: 36 },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: textColor, family: 'Inter, sans-serif' },
        xaxis: {
            tickfont: { color: textColor },
            gridcolor: 'transparent',
            zeroline: false
        },
        yaxis: {
            tickfont: { color: textColor },
            gridcolor: gridColor,
            zeroline: false,
            rangemode: 'tozero',
            dtick: 1
        },
        showlegend: false
    };

    Plotly.newPlot('weeklyChart', [trace], layout, { responsive: true, displayModeBar: false });
}

function startEdit(h) {
    habitId.value = h.id;
    habitName.value = h.name;
    habitGoal.value = String(h.goal);
    habitColor.value = h.color;
    formTitle.textContent = 'Edit habit';
    cancelEdit.classList.remove('hidden');
    habitName.focus();
}

function resetForm() {
    habitId.value = '';
    form.reset();
    habitColor.value = '#7c3aed';
    formTitle.textContent = 'Add new habit';
    cancelEdit.classList.add('hidden');
}

function deleteHabit(id) {
    if (confirm('Delete this habit?')) {
        habits = habits.filter(h => h.id !== id);
        save();
        render();
        resetForm();
        showToast('Habit deleted', 'info');
    }
}

function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(habits));
}

function loadHabits() {
    try {
        return JSON.parse(localStorage.getItem(LS_KEY)) || [];
    } catch {
        return [];
    }
}

function applyTheme(mode) {
    document.body.classList.toggle('dark', mode === 'dark');
    themeIcon.textContent = mode === 'dark' ? '☀️' : '🌙';
    localStorage.setItem(THEME_KEY, mode);
    setTimeout(render, 0);
}

function updateFilterButtons() {
    filterAll.classList.toggle('active', filterStatus === 'all');
    filterCompleted.classList.toggle('active', filterStatus === 'completed');
    filterPending.classList.toggle('active', filterStatus === 'pending');
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.25s ease forwards';
        setTimeout(() => toast.remove(), 250);
    }, 2200);
}

function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}