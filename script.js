document.addEventListener('DOMContentLoaded', function() {

    // --- DATA SIMULATION (REPLACES A DATABASE) ---
    const RATING_SCALE = [
        { text: 'E-- (Unsatisfactory)', value: 0 },
        { text: 'E- (Below Expectations)', value: 1 },
        { text: 'E (Meets Expectations)', value: 3 },
        { text: 'E+ (Exceeds Expectations)', value: 4 },
        { text: 'E++ (Outstanding)', value: 5 }
    ];

    const DEPARTMENT_OBJECTIVES = {
        'engineering': ['Increase product stability to 99.9% uptime', 'Launch the new "Analytics" module'],
        'sales': ['Grow new customer base by 25%', 'Increase sales from existing clients by 15%'],
        'operations': ['Reduce operational costs by 10%', 'Optimize the supply chain process']
    };

    const CORE_COMPETENCIES = ['Communication', 'Teamwork', 'Problem Solving', 'Leadership', 'Adaptability'];

    const EMPLOYEES = [
        { id: 1, name: 'John Smith', position: 'Senior Developer', manager: 'Jane Doe', department: 'engineering', jobRole: 'individual_contributor' },
        { id: 2, name: 'Alice Johnson', position: 'Sales Director', manager: 'Michael Brown', department: 'sales', jobRole: 'leadership' },
        { id: 3, name: 'Bob Williams', position: 'Operations Lead', manager: 'Jane Doe', department: 'operations', jobRole: 'operations' }
    ];

    let employeeDataStore = {};
    let adminSettings = {
        minObjectives: 3,
        maxObjectives: 5,
        weights: {
            leadership: { objectives: 60, competencies: 40 },
            individual_contributor: { objectives: 80, competencies: 20 },
            operations: { objectives: 70, competencies: 30 }
        }
    };

    // --- APPLICATION INITIALIZATION ---
    function initialize() {
        populateEmployeeDropdown();
        initializeAdminPanel();
        setupEventListeners();
        document.querySelector('.tab-button').click();
    }

    function setupEventListeners() {
        document.getElementById('employee-select').addEventListener('change', handleEmployeeSelection);
        document.getElementById('add-objective-btn').addEventListener('click', addNewObjective);
        document.getElementById('performance-form').addEventListener('input', handleFormInput);
        document.getElementById('objective-weight-input').addEventListener('input', syncCompetencyWeight);
        document.getElementById('job-role-select').addEventListener('change', loadJobRoleWeights);
    }
    
    // --- UI AND DOM MANIPULATION ---
    window.openTab = (event, tabId) => {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        event.currentTarget.classList.add('active');
        if (tabId === 'dashboard') updateDashboard();
    };

    function populateEmployeeDropdown() {
        const select = document.getElementById('employee-select');
        EMPLOYEES.forEach(emp => {
            select.innerHTML += `<option value="${emp.id}">${emp.name}</option>`;
        });
    }

    function handleEmployeeSelection() {
        const employeeId = document.getElementById('employee-select').value;
        if (!employeeId) {
            clearForm();
            return;
        }
        const employee = EMPLOYEES.find(e => e.id == employeeId);
        initializeEmployeeData(employeeId);
        loadEmployeeData(employee);
    }

    function initializeEmployeeData(employeeId) {
        if (!employeeDataStore[employeeId]) {
            employeeDataStore[employeeId] = {
                objectives: [],
                competencies: CORE_COMPETENCIES.map(c => ({ name: c, rating: 'Not Rated' })),
                reviews: {
                    midYearEmployee: '',
                    midYearManager: '',
                    endYearEmployee: '',
                    endYearManager: '',
                    developmentPlan: ''
                }
            };
        }
    }

    function loadEmployeeData(employee) {
        document.getElementById('manager-name').textContent = employee.manager;
        document.getElementById('employee-position').textContent = employee.position;
        document.getElementById('employee-department').textContent = employee.department.charAt(0).toUpperCase() + employee.department.slice(1);
        
        const employeeData = employeeDataStore[employee.id];
        document.getElementById('mid-year-employee-comments').value = employeeData.reviews.midYearEmployee;
        document.getElementById('mid-year-manager-comments').value = employeeData.reviews.midYearManager;
        document.getElementById('end-year-employee-comments').value = employeeData.reviews.endYearEmployee;
        document.getElementById('end-year-manager-comments').value = employeeData.reviews.endYearManager;
        document.getElementById('development-plan').value = employeeData.reviews.developmentPlan;

        renderObjectives(employee.id);
        renderCompetencies(employee.id);
        checkObjectiveButtonState(employee.id);
        calculateAll(employee.id);
    }

    function renderObjectives(employeeId) {
        const tbody = document.querySelector('#objectives-table tbody');
        tbody.innerHTML = '';
        const employeeData = employeeDataStore[employeeId];
        const department = EMPLOYEES.find(e => e.id == employeeId).department;

        employeeData.objectives.forEach((obj, index) => {
            const row = tbody.insertRow();
            row.dataset.index = index;
            row.innerHTML = `
                <td><input type="text" class="objective-title" value="${obj.title}" placeholder="Objective Title"></td>
                <td><textarea class="objective-desc" placeholder="Describe the objective in detail...">${obj.description}</textarea></td>
                <td>${createDepartmentObjectiveDropdown(department, obj.linkedDeptObjective)}</td>
                <td><input type="number" class="objective-weight" min="0" max="100" value="${obj.weight}"></td>
                <td>${createRatingDropdown(obj.rating)}</td>
                <td class="col-score">0.00</td>
                <td class="col-actions"><button class="delete-btn" onclick="deleteObjective(event)">✕</button></td>
            `;
        });
        document.getElementById('objective-count-rules').textContent = `(Min: ${adminSettings.minObjectives}, Max: ${adminSettings.maxObjectives})`;
    }

    function renderCompetencies(employeeId) {
        const tbody = document.querySelector('#competencies-table tbody');
        tbody.innerHTML = '';
        employeeDataStore[employeeId].competencies.forEach((comp, index) => {
            const row = tbody.insertRow();
            row.dataset.index = index;
            row.innerHTML = `
                <td class="col-comp">${comp.name}</td>
                <td class="col-rating">${createRatingDropdown(comp.rating)}</td>
                <td class="col-score">0.00</td>
            `;
        });
    }

    function clearForm() {
        document.getElementById('performance-form').reset();
        ['manager-name', 'employee-position', 'employee-department'].forEach(id => document.getElementById(id).textContent = '');
        document.querySelector('#objectives-table tbody').innerHTML = '';
        document.querySelector('#competencies-table tbody').innerHTML = '';
        document.getElementById('add-objective-btn').disabled = true;
        calculateAll(null);
    }

    // --- CALCULATIONS & LOGIC ---
    function handleFormInput(event) {
        const employeeId = document.getElementById('employee-select').value;
        if (!employeeId) return;

        const data = employeeDataStore[employeeId];
        const target = event.target;

        const objRow = target.closest('#objectives-table tr');
        if (objRow) {
            const index = objRow.dataset.index;
            const obj = data.objectives[index];
            if (target.classList.contains('objective-title')) obj.title = target.value;
            if (target.classList.contains('objective-desc')) obj.description = target.value;
            if (target.classList.contains('objective-weight')) obj.weight = parseInt(target.value) || 0;
            if (target.classList.contains('rating-dropdown')) obj.rating = target.value;
            if (target.classList.contains('dept-objective-link')) obj.linkedDeptObjective = target.value;
        }

        const compRow = target.closest('#competencies-table tr');
        if (compRow) {
            const index = compRow.dataset.index;
            if (target.classList.contains('rating-dropdown')) data.competencies[index].rating = target.value;
        }
        
        const reviewKeys = {
            'mid-year-employee-comments': 'midYearEmployee', 'mid-year-manager-comments': 'midYearManager',
            'end-year-employee-comments': 'endYearEmployee', 'end-year-manager-comments': 'endYearManager',
            'development-plan': 'developmentPlan'
        };
        if(reviewKeys[target.id]) {
            data.reviews[reviewKeys[target.id]] = target.value;
        }

        calculateAll(employeeId);
    }

    function calculateAll(employeeId) {
        if (!employeeId) {
            ['final-objective-score', 'final-competency-score', 'overall-final-score'].forEach(id => document.getElementById(id).textContent = '0.00');
            document.getElementById('overall-final-grade').textContent = 'Not Rated';
            document.getElementById('total-weight-span').textContent = '0';
            return;
        }

        const data = employeeDataStore[employeeId];
        const employee = EMPLOYEES.find(e => e.id == employeeId);
        const roleWeights = adminSettings.weights[employee.jobRole];

        let totalWeight = 0, totalObjectiveScore = 0;
        document.querySelectorAll('#objectives-table tbody tr').forEach((row, index) => {
            const obj = data.objectives[index];
            const ratingValue = (RATING_SCALE.find(r => r.text === obj.rating) || {}).value || 0;
            const score = (obj.weight / 100) * ratingValue;
            row.querySelector('.col-score').textContent = score.toFixed(2);
            totalWeight += obj.weight;
            totalObjectiveScore += score;
        });
        updateTotalWeightUI(totalWeight);
        document.getElementById('final-objective-score').textContent = totalObjectiveScore.toFixed(2);

        const competencyWeight = 100 / data.competencies.length;
        let totalCompetencyScore = 0;
        document.querySelectorAll('#competencies-table tbody tr').forEach((row, index) => {
            const comp = data.competencies[index];
            const ratingValue = (RATING_SCALE.find(r => r.text === comp.rating) || {}).value || 0;
            const score = (competencyWeight / 100) * ratingValue;
            row.querySelector('.competency-score').textContent = score.toFixed(2);
            totalCompetencyScore += score;
        });
        document.getElementById('final-competency-score').textContent = totalCompetencyScore.toFixed(2);

        const overallScore = (totalObjectiveScore * (roleWeights.objectives / 100)) + (totalCompetencyScore * (roleWeights.competencies / 100));
        document.getElementById('overall-final-score').textContent = overallScore.toFixed(2);
        document.getElementById('overall-final-grade').textContent = getFinalRatingText(overallScore);
        
        updateDashboard();
    }
    
    function getFinalRatingText(score) {
        const rating = RATING_SCALE.slice().reverse().find(r => score >= r.value);
        return rating ? rating.text : 'Not Rated';
    }

    function updateTotalWeightUI(totalWeight) {
        const span = document.getElementById('total-weight-span');
        span.textContent = totalWeight;
        span.parentElement.style.color = totalWeight !== 100 ? 'var(--danger-color)' : 'var(--text-secondary)';
    }

    // --- ACTIONS ---
    function addNewObjective() {
        const employeeId = document.getElementById('employee-select').value;
        const objectives = employeeDataStore[employeeId].objectives;
        if (objectives.length >= adminSettings.maxObjectives) {
            alert(`Maximum number of objectives (${adminSettings.maxObjectives}) has been reached.`);
            return;
        }
        objectives.push({ title: '', description: '', weight: 0, rating: 'Not Rated', linkedDeptObjective: '' });
        renderObjectives(employeeId);
        checkObjectiveButtonState(employeeId);
    }
    
    window.deleteObjective = (event) => {
        const employeeId = document.getElementById('employee-select').value;
        const index = event.target.closest('tr').dataset.index;
        employeeDataStore[employeeId].objectives.splice(index, 1);
        renderObjectives(employeeId);
        calculateAll(employeeId);
    }

    function checkObjectiveButtonState(employeeId) {
        const btn = document.getElementById('add-objective-btn');
        const canAdd = employeeId && (employeeDataStore[employeeId]?.objectives.length < adminSettings.maxObjectives);
        btn.disabled = !canAdd;
    }
    
    // --- ADMIN PANEL ---
    function initializeAdminPanel() {
        document.getElementById('min-objectives').value = adminSettings.minObjectives;
        document.getElementById('max-objectives').value = adminSettings.maxObjectives;
        loadJobRoleWeights();
    }
    
    window.saveAdminSettings = () => {
        adminSettings.minObjectives = parseInt(document.getElementById('min-objectives').value);
        adminSettings.maxObjectives = parseInt(document.getElementById('max-objectives').value);
        
        const selectedRole = document.getElementById('job-role-select').value;
        adminSettings.weights[selectedRole].objectives = parseInt(document.getElementById('objective-weight-input').value);
        adminSettings.weights[selectedRole].competencies = 100 - adminSettings.weights[selectedRole].objectives;

        const message = document.getElementById('admin-save-message');
        message.textContent = 'Settings saved successfully!';
        setTimeout(() => { message.textContent = ''; }, 3000);
        
        if(document.getElementById('employee-select').value) {
            handleEmployeeSelection();
        }
    }

    function loadJobRoleWeights() {
        const weights = adminSettings.weights[document.getElementById('job-role-select').value];
        document.getElementById('objective-weight-input').value = weights.objectives;
        document.getElementById('competency-weight-input').value = weights.competencies;
    }
    
    function syncCompetencyWeight(event) {
        document.getElementById('competency-weight-input').value = 100 - (parseInt(event.target.value) || 0);
    }
    
    // --- DASHBOARD ---
    function updateDashboard() {
        const totalEmployees = EMPLOYEES.length;
        const allData = Object.values(employeeDataStore);

        let objectivesSetCount = allData.filter(d => d.objectives.length >= adminSettings.minObjectives).length;
        let midYearCount = allData.filter(d => d.reviews.midYearManager.trim() !== '').length;
        let endYearCount = allData.filter(d => {
            const objectivesTotalWeight = d.objectives.reduce((sum, obj) => sum + obj.weight, 0);
            return objectivesTotalWeight === 100 && d.reviews.endYearManager.trim() !== '';
        }).length;
        
        document.getElementById('dashboard-objective-set').textContent = `${objectivesSetCount} / ${totalEmployees}`;
        document.getElementById('progress-objective-set').style.width = `${(objectivesSetCount / totalEmployees) * 100}%`;
        document.getElementById('dashboard-mid-year').textContent = `${midYearCount} / ${totalEmployees}`;
        document.getElementById('progress-mid-year').style.width = `${(midYearCount / totalEmployees) * 100}%`;
        document.getElementById('dashboard-end-year').textContent = `${endYearCount} / ${totalEmployees}`;
        document.getElementById('progress-end-year').style.width = `${(endYearCount / totalEmployees) * 100}%`;
    }

    // --- HELPER FUNCTIONS ---
    function createRatingDropdown(selectedValue) {
        let options = `<option value="Not Rated">-- Select Rating --</option>`;
        RATING_SCALE.forEach(item => {
            options += `<option value="${item.text}" ${item.text === selectedValue ? 'selected' : ''}>${item.text}</option>`;
        });
        return `<select class="rating-dropdown">${options}</select>`;
    }

    function createDepartmentObjectiveDropdown(department, selectedValue) {
        const objectives = DEPARTMENT_OBJECTIVES[department] || [];
        let options = `<option value="">-- Link to Objective --</option>`;
        objectives.forEach(obj => {
            options += `<option value="${obj}" ${obj === selectedValue ? 'selected' : ''}>${obj}</option>`;
        });
        return `<select class="dept-objective-link">${options}</select>`;
    }
    
    // --- START THE APP ---
    initialize();
});
