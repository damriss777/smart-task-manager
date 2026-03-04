// smart-task-manager/js/script.js

// --- 1. DATA & STATE ---
const STORAGE_KEY = 'cozyspace_v12';
let appData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    cgpa: "3.85",
    tasks: [] 
};

let currentView = 'list'; 
let editingTaskId = null;
let tempSubtasks = []; 

// --- 2. DOM ELEMENTS ---
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const els = {
    menuItems: $$('.menu-item'),
    viewList: $('#view-list'),
    viewBoard: $('#view-board'),
    
    listUI: $('#task-list-ui'),
    boardTodo: $('#board-todo'),
    boardDoing: $('#board-doing'),
    boardDone: $('#board-done'),
    
    cntTodo: $('#count-todo'),
    cntDoing: $('#count-doing'),
    cntDone: $('#count-done'),
    emptyList: $('#empty-state-list'),
    
    searchTask: $('#search-task'),
    filterCat: $('#filter-category'),
    
    clock: $('#live-clock'),
    date: $('#live-date'),
    cgpaDisplay: $('#cgpa-display'),
    cgpaEdit: $('#edit-cgpa'),
    
    modal: $('#task-modal'),
    openModalBtn: $('#open-task-modal'),
    closeBtns: $$('.close-modal'),
    saveBtn: $('#btn-save-task'),
    
    inpTitle: $('#inp-title'),
    inpDatetime: $('#inp-datetime'),
    inpCat: $('#inp-category'),
    inpSubtask: $('#inp-subtask'),
    addSubtaskBtn: $('#btn-add-subtask'),
    subtaskListModal: $('#modal-subtask-list'),
    
    btnRain: $('#btn-rain'),
    btnCafe: $('#btn-cafe'),
    volRain: $('#vol-rain'),
    volCafe: $('#vol-cafe'),
    audioRain: $('#audio-rain'),
    audioCafe: $('#audio-cafe')
};

// --- 3. INITIALIZATION ---
function init() {
    startClock();
    els.cgpaDisplay.innerText = appData.cgpa;
    setupDragAndDrop();
    renderAll();
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

// --- 4. CLOCK ---
function startClock() {
    const update = () => {
        const now = new Date();
        els.clock.innerText = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        els.date.innerText = now.toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long' });
    };
    setInterval(update, 1000);
    update();
}

// --- 5. VIEW SWITCHER ---
els.menuItems.forEach(item => {
    item.addEventListener('click', () => {
        els.menuItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        currentView = item.dataset.view;
        
        if(currentView === 'list') {
            els.viewList.classList.remove('hidden');
            els.viewList.classList.add('active');
            els.viewBoard.classList.remove('active');
            els.viewBoard.classList.add('hidden');
        } else {
            els.viewBoard.classList.remove('hidden');
            els.viewBoard.classList.add('active');
            els.viewList.classList.remove('active');
            els.viewList.classList.add('hidden');
        }
        renderAll();
    });
});

// --- 6. MODAL & FORM LOGIC ---
els.openModalBtn.addEventListener('click', () => openModal(false));
els.closeBtns.forEach(b => b.addEventListener('click', () => els.modal.classList.add('hidden')));

function openModal(isEdit, taskId = null) {
    editingTaskId = taskId;
    tempSubtasks = [];
    
    if(isEdit) {
        $('#modal-title').innerText = "Kemaskini Coretan";
        const task = appData.tasks.find(t => t.id === taskId);
        els.inpTitle.value = task.title;
        els.inpDatetime.value = task.datetime || '';
        els.inpCat.value = task.category;
        document.querySelector(`input[name="priority"][value="${task.priority}"]`).checked = true;
        tempSubtasks = JSON.parse(JSON.stringify(task.subtasks || []));
    } else {
        $('#modal-title').innerText = "Coretan Baru";
        els.inpTitle.value = '';
        els.inpDatetime.value = '';
        els.inpCat.value = 'Assignment';
        document.querySelector('input[name="priority"][value="High"]').checked = true;
    }
    
    renderModalSubtasks();
    els.modal.classList.remove('hidden');
}

// Subtasks Logic inside Modal
els.addSubtaskBtn.addEventListener('click', () => {
    const text = els.inpSubtask.value.trim();
    if(text) {
        tempSubtasks.push({ id: Date.now(), text: text, done: false });
        els.inpSubtask.value = '';
        renderModalSubtasks();
    }
});
els.inpSubtask.addEventListener('keypress', e => e.key === 'Enter' && els.addSubtaskBtn.click());

function renderModalSubtasks() {
    els.subtaskListModal.innerHTML = '';
    tempSubtasks.forEach(sub => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${sub.text}</span>
            <button type="button" onclick="removeTempSubtask(${sub.id})"><i class="ri-close-circle-fill"></i></button>
        `;
        els.subtaskListModal.appendChild(li);
    });
}

window.removeTempSubtask = (id) => {
    tempSubtasks = tempSubtasks.filter(s => s.id !== id);
    renderModalSubtasks();
};

// Save Full Task
els.saveBtn.addEventListener('click', () => {
    const title = els.inpTitle.value.trim();
    if(!title) return alert("Sila letak tajuk tugasan.");
    
    const priority = document.querySelector('input[name="priority"]:checked').value;
    
    if(editingTaskId) {
        const task = appData.tasks.find(t => t.id === editingTaskId);
        task.title = title;
        task.datetime = els.inpDatetime.value;
        task.category = els.inpCat.value;
        task.priority = priority;
        task.subtasks = tempSubtasks;
    } else {
        appData.tasks.push({
            id: Date.now(),
            title: title,
            datetime: els.inpDatetime.value,
            category: els.inpCat.value,
            priority: priority,
            status: 'todo',
            subtasks: tempSubtasks,
            createdAt: Date.now()
        });
    }
    
    saveData();
    renderAll();
    els.modal.classList.add('hidden');
});

window.deleteTask = (id) => {
    if(confirm('Pasti ingin padam memori tugasan ini?')) {
        appData.tasks = appData.tasks.filter(t => t.id !== id);
        saveData();
        renderAll();
    }
};

// --- 7. RENDERING ENGINE ---
function renderAll() {
    if(currentView === 'list') renderList();
    else renderBoard();
}

function renderList() {
    els.listUI.innerHTML = '';
    const searchQ = els.searchTask.value.toLowerCase();
    const catFilt = els.filterCat.value;
    
    let filtered = [...appData.tasks].sort((a,b) => {
        const pMap = { High: 3, Medium: 2, Low: 1 };
        if(pMap[b.priority] !== pMap[a.priority]) return pMap[b.priority] - pMap[a.priority];
        if(!a.datetime) return 1;
        if(!b.datetime) return -1;
        return new Date(a.datetime) - new Date(b.datetime);
    });

    filtered = filtered.filter(t => {
        const matchSearch = t.title.toLowerCase().includes(searchQ);
        const matchCat = catFilt === 'All' ? true : t.category === catFilt;
        return matchSearch && matchCat;
    });

    if(filtered.length === 0) els.emptyList.classList.remove('hidden');
    else els.emptyList.classList.add('hidden');

    filtered.forEach(task => {
        const li = document.createElement('li');
        li.className = `list-card p-${task.priority}`;
        const timeHTML = formatTimeUrgency(task.datetime);
        const progHTML = generateProgressBar(task);

        li.innerHTML = `
            <div class="lc-main" onclick="openModal(true, ${task.id})">
                <span class="lc-title">${task.title}</span>
                <div class="lc-meta">
                    <span class="badge">${task.category}</span>
                    <span class="badge italic-text">Status: ${task.status.toUpperCase()}</span>
                    ${timeHTML}
                </div>
                ${progHTML}
            </div>
            <div class="lc-actions">
                <button class="btn-icon" onclick="openModal(true, ${task.id})"><i class="ri-edit-2-line"></i></button>
                <button class="btn-icon" onclick="deleteTask(${task.id})"><i class="ri-delete-bin-4-line"></i></button>
            </div>
        `;
        els.listUI.appendChild(li);
    });
}

function renderBoard() {
    els.boardTodo.innerHTML = '';
    els.boardDoing.innerHTML = '';
    els.boardDone.innerHTML = '';
    let count = { todo: 0, doing: 0, done: 0 };

    const sortedTasks = [...appData.tasks].sort((a,b) => {
        const pMap = { High: 3, Medium: 2, Low: 1 };
        return pMap[b.priority] - pMap[a.priority];
    });

    sortedTasks.forEach(task => {
        const div = document.createElement('div');
        div.className = `k-card p-${task.priority}`;
        div.dataset.id = task.id;
        count[task.status]++;
        
        let subHTML = '';
        if(task.subtasks && task.subtasks.length > 0) {
            subHTML = `<div class="k-subtasks">`;
            task.subtasks.forEach(sub => {
                subHTML += `
                    <label class="sub-item ${sub.done ? 'done' : ''}">
                        <input type="checkbox" ${sub.done ? 'checked' : ''} onchange="toggleSubtask(${task.id}, ${sub.id})">
                        <span>${sub.text}</span>
                    </label>
                `;
            });
            subHTML += `</div>`;
        }

        const progHTML = generateProgressBar(task);
        const timeHTML = formatTimeUrgency(task.datetime);

        div.innerHTML = `
            <h4 class="serif-text">${task.title}</h4>
            <div class="k-meta">
                <span class="badge">${task.category}</span>
                ${timeHTML}
            </div>
            ${progHTML}
            ${subHTML}
            <div style="text-align:right; margin-top:10px;">
                <i class="ri-delete-bin-line" style="cursor:pointer; color:var(--text-muted); padding:5px; border-radius:5px; transition:0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--text-muted)'" onclick="deleteTask(${task.id})"></i>
            </div>
        `;

        if(task.status === 'todo') els.boardTodo.appendChild(div);
        else if(task.status === 'doing') els.boardDoing.appendChild(div);
        else els.boardDone.appendChild(div);
    });

    els.cntTodo.innerText = count.todo;
    els.cntDoing.innerText = count.doing;
    els.cntDone.innerText = count.done;
}

window.toggleSubtask = (taskId, subId) => {
    const task = appData.tasks.find(t => t.id === taskId);
    const sub = task.subtasks.find(s => s.id === subId);
    if(sub) sub.done = !sub.done;
    saveData();
    renderAll();
};

// --- 8. DRAG & DROP ---
function setupDragAndDrop() {
    const options = {
        group: 'kanban',
        animation: 200,
        ghostClass: 'sortable-ghost',
        onEnd: function (evt) {
            const taskId = parseInt(evt.item.dataset.id);
            const newStatus = evt.to.dataset.status;
            const task = appData.tasks.find(t => t.id === taskId);
            
            if(task && task.status !== newStatus) {
                task.status = newStatus;
                if(newStatus === 'done' && task.subtasks) {
                    task.subtasks.forEach(s => s.done = true);
                }
                saveData();
                renderBoard();
            }
        }
    };
    new Sortable(els.boardTodo, options);
    new Sortable(els.boardDoing, options);
    new Sortable(els.boardDone, options);
}

// --- 9. HELPERS ---
function formatTimeUrgency(datetimeStr) {
    if(!datetimeStr) return '';
    const due = new Date(datetimeStr);
    const now = new Date();
    const diffHours = (due - now) / (1000 * 60 * 60);
    const timeStr = due.toLocaleString('ms-MY', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'});
    
    if(diffHours < 0) return `<span class="time-danger">Tamat Tempoh</span>`;
    if(diffHours < 24) return `<span class="time-danger">🔥 Lagi ${Math.floor(diffHours)}j</span>`;
    return `<span class="italic-text"><i class="ri-time-line"></i> ${timeStr}</span>`;
}

function generateProgressBar(task) {
    if(!task.subtasks || task.subtasks.length === 0) return '';
    const total = task.subtasks.length;
    const done = task.subtasks.filter(s => s.done).length;
    const pct = Math.round((done / total) * 100);
    return `
        <div style="display:flex; align-items:center; margin-top:8px;">
            <div class="mini-progress"><div class="mini-fill" style="width:${pct}%"></div></div>
            <span class="sub-text">${pct}% Siap</span>
        </div>
    `;
}

// Events
els.searchTask.addEventListener('input', renderList);
els.filterCat.addEventListener('change', renderList);

els.cgpaEdit.addEventListener('click', () => {
    const val = prompt("Masukkan Target CGPA Idaman (cth: 4.00):", appData.cgpa);
    if(val) {
        appData.cgpa = val;
        els.cgpaDisplay.innerText = val;
        saveData();
    }
});

function toggleAudio(btn, audio) {
    if(audio.paused) {
        audio.play();
        btn.classList.add('playing');
    } else {
        audio.pause();
        btn.classList.remove('playing');
    }
}
els.btnRain.addEventListener('click', () => toggleAudio(els.btnRain, els.audioRain));
els.btnCafe.addEventListener('click', () => toggleAudio(els.btnCafe, els.audioCafe));
els.volRain.addEventListener('input', e => els.audioRain.volume = e.target.value);
els.volCafe.addEventListener('input', e => els.audioCafe.volume = e.target.value);

init();