document.addEventListener('DOMContentLoaded', () => {

    // --- UI Elements ---

    const authOverlay = document.getElementById('auth-overlay');
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginFormContainer = document.getElementById('login-form-container');
    const registerFormContainer = document.getElementById('register-form-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginMessage = document.getElementById('login-message');
    const registerMessage = document.getElementById('register-message');

    const sidebarIcons = document.querySelectorAll('.server-icon');
    const channelLinks = document.querySelectorAll('.channel');
    const viewSections = document.querySelectorAll('.view-section');
    const currentViewTitle = document.getElementById('current-view-title');
    const currentUsernameDisplay = document.getElementById('current-username');
    const dashboardUsernameDisplay = document.getElementById('dashboard-username');
    const accountBalanceDisplay = document.getElementById('account-balance');
    const dashboardTransactionsList = document.getElementById('dashboard-transactions-list');
    const fullTransactionsList = document.getElementById('full-transactions-list');
    const noTransactionsMessage = document.getElementById('no-transactions-message');
    const settingUsernameDisplay = document.getElementById('setting-username');
    const settingAccountNumberDisplay = document.getElementById('setting-account-number');
    const logoutButton = document.getElementById('logout-button');
    const quickActionButtons = document.querySelectorAll('.quick-actions .action-button');

    // เพิ่ม Elements สำหรับรูปโปรไฟล์และปุ่มตั้งค่า
    const userPanelAvatar = document.getElementById('user-panel-avatar');
    const profilePictureUpload = document.getElementById('profile-picture-upload');
    const profileUploadMessage = document.getElementById('profile-upload-message');
    const resetPasswordButton = document.getElementById('reset-password-button');
    const manageDevicesButton = document.getElementById('manage-devices-button');
    const settingsActionMessage = document.getElementById('settings-action-message');

    // --- Bank Operation Forms ---
    const transferForm = document.getElementById('transfer-form');
    const transferMessage = document.getElementById('transfer-message');
    const depositForm = document.getElementById('deposit-form');
    const depositMessage = document.getElementById('deposit-message');
    const withdrawForm = document.getElementById('withdraw-form');
    const withdrawMessage = document.getElementById('withdraw-message');

    // NEW: Chart variables
    const transactionChartCanvas = document.getElementById('transactionChart');
    let transactionChart = null; // To store the Chart.js instance

    // --- Mock Database (for demonstration only, not persistent) ---
    let users = JSON.parse(localStorage.getItem('bankUsers')) || {}; // Store users in localStorage
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

    // Helper to generate a simple account number (for demonstration)
    let lastAccountNumber = parseInt(localStorage.getItem('lastAccountNumber') || '1000000000', 10);
    const generateAccountNumber = () => {
        lastAccountNumber++;
        localStorage.setItem('lastAccountNumber', lastAccountNumber);
        return lastAccountNumber.toString();
    };

    // --- UI Functions ---

    // Function to show a specific view section
    const showView = (viewId) => {
        viewSections.forEach(section => {
            section.classList.remove('active');
        });
        const targetView = document.getElementById(`${viewId}-view`);
        if (targetView) {
            targetView.classList.add('active');
            // Check if h3 exists before trying to access textContent
            currentViewTitle.textContent = targetView.querySelector('h3') ? targetView.querySelector('h3').textContent : viewId.charAt(0).toUpperCase() + viewId.slice(1);
        }

        // Update active state for sidebar icons and channel links
        sidebarIcons.forEach(icon => icon.classList.remove('active'));
        channelLinks.forEach(link => link.classList.remove('active'));

        const activeSidebarIcon = document.querySelector(`.server-icon[data-view="${viewId}"]`);
        if (activeSidebarIcon) activeSidebarIcon.classList.add('active');

        const activeChannelLink = document.querySelector(`.channel[data-view="${viewId}"]`);
        if (activeChannelLink) activeChannelLink.classList.add('active');

        // Special handling for transactions view
        if (viewId === 'transactions') {
            renderFullTransactions();
            renderTransactionChart(); // NEW: เรียกใช้เมื่อเข้าสู่หน้าประวัติการทำธุรกรรม
        } else if (viewId === 'settings') { // เรียก renderSettings เมื่อเข้าสู่หน้าตั้งค่า
            renderSettings();
        }
    };

    // Function to show a message in the UI for a short duration
    const showMessage = (element, message, isSuccess) => {
        if (!element) return; // Prevent error if element doesn't exist
        element.textContent = message;
        element.classList.remove('success', 'error');
        element.classList.add(isSuccess ? 'success' : 'error');
        element.style.display = 'block';
        setTimeout(() => {
            if (element) element.style.display = 'none';
            if (element) element.textContent = '';
        }, 3000);
    };

    // Function to update user details in UI
    const updateUserDetailsUI = () => {
        if (currentUser) {
            currentUsernameDisplay.textContent = currentUser.username;
            dashboardUsernameDisplay.textContent = currentUser.username;
            accountBalanceDisplay.textContent = `฿ ${currentUser.balance.toFixed(2)}`;
            settingUsernameDisplay.textContent = currentUser.username;
            settingAccountNumberDisplay.textContent = currentUser.accountNumber;
            renderDashboardTransactions(); // Update dashboard transactions on balance change
            authOverlay.classList.remove('active'); // Hide login/register
            // showView('dashboard'); // Moved to initial load logic

            // Update user panel avatar
            if (userPanelAvatar) {
                if (currentUser.profilePicture) {
                    userPanelAvatar.src = currentUser.profilePicture;
                } else {
                    userPanelAvatar.src = "https://via.placeholder.com/32/5865f2/ffffff?text=U"; // Default placeholder
                }
            }

        } else {
            currentUsernameDisplay.textContent = 'Guest';
            dashboardUsernameDisplay.textContent = 'Guest';
            accountBalanceDisplay.textContent = '฿ 0.00';
            settingUsernameDisplay.textContent = 'N/A';
            settingAccountNumberDisplay.textContent = 'N/A';
            dashboardTransactionsList.innerHTML = '';
            fullTransactionsList.innerHTML = '';
            authOverlay.classList.add('active'); // Show login/register
            // Hide all views if logged out
            viewSections.forEach(section => section.classList.remove('active'));

            // Reset user panel avatar to default
            if (userPanelAvatar) {
                userPanelAvatar.src = "https://via.placeholder.com/32/5865f2/ffffff?text=U";
            }
        }
    };

    // Render transactions for dashboard (latest 5)
    const renderDashboardTransactions = () => {
        if (!dashboardTransactionsList) return; // Add check
        dashboardTransactionsList.innerHTML = '';
        if (currentUser && currentUser.transactions && currentUser.transactions.length > 0) {
            if (noTransactionsMessage) noTransactionsMessage.style.display = 'none'; // Ensure this doesn't affect dashboard list
            const latestTransactions = currentUser.transactions.slice(-5).reverse(); // Get latest 5
            latestTransactions.forEach(transaction => {
                const li = document.createElement('li');
                li.classList.add('transaction-item');
                const amountClass = (transaction.type === 'deposit' || transaction.type === 'transfer_in') ? 'credit' : 'debit';
                const typeText = {
                    'deposit': 'ฝากเงิน',
                    'withdraw': 'ถอนเงิน',
                    'transfer_out': `โอนเงินไป ${transaction.toAccount || 'N/A'}`,
                    'transfer_in': `รับโอนจาก ${transaction.fromAccount || 'N/A'}`
                }[transaction.type];
                const sign = (transaction.type === 'withdraw' || transaction.type === 'transfer_out') ? '-' : '+';
                li.innerHTML = `
                    <div class="transaction-info">
                        <span class="transaction-type">${typeText}</span>
                        <span class="transaction-date">${new Date(transaction.date).toLocaleString('th-TH')}</span>
                    </div>
                    <span class="transaction-amount ${amountClass}">${sign}฿ ${transaction.amount.toFixed(2)}</span>
                `;
                dashboardTransactionsList.appendChild(li);
            });
        } else {
            dashboardTransactionsList.innerHTML = '<li style="text-align: center; color: #aaa;">ยังไม่มีประวัติการทำธุรกรรมล่าสุด</li>';
        }
    };

    // Render all transactions for the full history view
    const renderFullTransactions = () => {
        if (!fullTransactionsList || !noTransactionsMessage) return; // Add checks
        fullTransactionsList.innerHTML = '';
        if (currentUser && currentUser.transactions && currentUser.transactions.length > 0) {
            noTransactionsMessage.style.display = 'none';
            // Sort by date descending
            const sortedTransactions = [...currentUser.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
            sortedTransactions.forEach(transaction => {
                const li = document.createElement('li');
                li.classList.add('transaction-item');
                const amountClass = (transaction.type === 'deposit' || transaction.type === 'transfer_in') ? 'credit' : 'debit';
                const typeText = {
                    'deposit': 'ฝากเงิน',
                    'withdraw': 'ถอนเงิน',
                    'transfer_out': `โอนเงินไป ${transaction.toAccount || 'N/A'}`,
                    'transfer_in': `รับโอนจาก ${transaction.fromAccount || 'N/A'}`
                }[transaction.type];
                const sign = (transaction.type === 'withdraw' || transaction.type === 'transfer_out') ? '-' : '+';

                li.innerHTML = `
                    <div class="transaction-info">
                        <span class="transaction-type">${typeText}</span>
                        <span class="transaction-date">${new Date(transaction.date).toLocaleString('th-TH')}</span>
                    </div>
                    <span class="transaction-amount ${amountClass}">${sign}฿ ${(transaction.amount || 0).toFixed(2)}</span>
                `;
                fullTransactionsList.appendChild(li);
            });
        } else {
            noTransactionsMessage.style.display = 'block';
        }
    };

    // NEW: Render Transaction Chart
    const renderTransactionChart = () => {
        if (!transactionChartCanvas) return;

        // ทำลายกราฟเดิมถ้ามี เพื่อป้องกันกราฟซ้อนกัน
        if (transactionChart) {
            transactionChart.destroy();
        }

        if (!currentUser || !currentUser.transactions || currentUser.transactions.length === 0) {
            // ซ่อน canvas ถ้าไม่มีธุรกรรม และทำลายกราฟ
            transactionChartCanvas.style.display = 'none';
            return;
        }

        transactionChartCanvas.style.display = 'block'; // ตรวจสอบให้แน่ใจว่า canvas แสดงผลอยู่

        // จัดเรียงธุรกรรมตามวันที่จากน้อยไปมากสำหรับแสดงผลในกราฟ
        const sortedTransactions = [...currentUser.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

        // เตรียมข้อมูลสำหรับกราฟ
        const labels = sortedTransactions.map(t => new Date(t.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }));
        const dataPoints = [];
        // คำนวณยอดคงเหลือ ณ แต่ละจุดของธุรกรรม
        // เริ่มต้นด้วยยอดเงินปัจจุบันของ user
        let currentBalanceForChart = currentUser.balance; 

        // หากต้องการแสดงประวัติยอดคงเหลือแบบสะสมตั้งแต่แรก
        // จะต้องคำนวณย้อนกลับจาก balance ปัจจุบัน หรือเริ่มต้นจาก 0
        // วิธีที่ง่ายกว่าคือแสดงแนวโน้มการเปลี่ยนแปลงตามลำดับธุรกรรม
        // ดังนั้น เราจะใช้ logic ที่คำนวณยอดเงินสะสมจาก 0 (หรือ initialBalance)
        // เพื่อให้กราฟแสดงแนวโน้มที่สอดคล้องกันจากจุดเริ่มต้นของประวัติ

        // เพื่อให้กราฟแสดงยอดเงินคงเหลือ 'ที่แท้จริง' ในแต่ละจุดเวลา
        // เราจำเป็นต้องมีข้อมูลยอดเงิน 'ก่อน' ธุรกรรมแรก หรือคำนวณย้อนหลัง
        // สำหรับวัตถุประสงค์ของการแสดง "กราฟขึ้นลง" อย่างง่าย
        // เราจะคำนวณยอดเงินสะสมตามลำดับธุรกรรม โดยให้ยอดเงินเริ่มต้นเป็น 0
        // (หรือจะสมมติยอดเงินเริ่มต้นของบัญชีเป็น 0 ตอนสมัคร)
        // หรือให้เริ่มต้นด้วยยอดเงินของ currentUser.balance ก่อนธุรกรรมทั้งหมด
        // วิธีที่เข้าใจง่ายคือสร้างยอดเงินสะสมจาก 0
        let cumulativeBalance = 0;
        sortedTransactions.forEach(transaction => {
            if (transaction.type === 'deposit' || transaction.type === 'transfer_in') {
                cumulativeBalance += transaction.amount;
            } else if (transaction.type === 'withdraw' || transaction.type === 'transfer_out') {
                cumulativeBalance -= transaction.amount;
            }
            dataPoints.push(cumulativeBalance);
        });
        
        // หากต้องการให้กราฟเริ่มต้นจากยอดเงินปัจจุบันจริงๆ และย้อนหลังไป
        // ต้องหาจุดเริ่มต้นของกราฟจาก transactions array
        // ถ้าต้องการกราฟที่แสดงยอดเงิน ณ แต่ละช่วงเวลาจริง ๆ ควรเก็บ balance_after_transaction
        // หรือคำนวณย้อนกลับ
        // สำหรับตัวอย่างนี้ จะแสดงแนวโน้มโดยเริ่มต้นจาก 0 และบวก/ลบไปเรื่อยๆ

        const ctx = transactionChartCanvas.getContext('2d');
        transactionChart = new Chart(ctx, {
            type: 'line', // กราฟเส้นสำหรับแสดงแนวโน้ม
            data: {
                labels: labels,
                datasets: [{
                    label: 'ยอดเงินคงเหลือ (แนวโน้ม)',
                    data: dataPoints,
                    borderColor: '#5865f2', // สี Discord blue สำหรับเส้น
                    backgroundColor: 'rgba(88, 101, 242, 0.2)', // พื้นหลังอ่อนๆ ใต้เส้น
                    fill: true, // เติมพื้นที่ใต้เส้น
                    tension: 0.3, // ความโค้งของเส้น
                    pointBackgroundColor: '#5865f2',
                    pointBorderColor: '#fff',
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#5865f2',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // อนุญาตให้กำหนด height:40vh ได้
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#dcddde' // สีข้อความใน Legend
                        }
                    },
                    title: {
                        display: true,
                        text: 'แนวโน้มยอดเงินคงเหลือตามลำดับธุรกรรม',
                        color: '#fff', // สีข้อความ Title
                        font: {
                            size: 16
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `ยอด: ฿ ${context.raw.toFixed(2)}`;
                            },
                            title: function(context) {
                                // แสดงวันที่เต็มใน Tooltip
                                const transactionDate = new Date(sortedTransactions[context.dataIndex].date);
                                return transactionDate.toLocaleString('th-TH', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                            }
                        },
                        backgroundColor: '#202225', // พื้นหลัง Tooltip
                        titleColor: '#dcddde', // สีข้อความ Title ใน Tooltip
                        bodyColor: '#dcddde', // สีข้อความ Body ใน Tooltip
                        borderColor: '#40444b',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: '#40444b' // สีเส้น Grid
                        },
                        ticks: {
                            color: '#8e9297' // สีข้อความบนแกน X
                        }
                    },
                    y: {
                        grid: {
                            color: '#40444b'
                        },
                        ticks: {
                            color: '#8e9297',
                            callback: function(value) {
                                return '฿ ' + value.toFixed(2); // จัดรูปแบบข้อความบนแกน Y
                            }
                        }
                    }
                }
            }
        });
    };


    // Render settings view (username, account number, and profile picture upload)
    const renderSettings = () => {
        if (currentUser) {
            if (settingUsernameDisplay) settingUsernameDisplay.textContent = currentUser.username;
            if (settingAccountNumberDisplay) settingAccountNumberDisplay.textContent = currentUser.accountNumber;
            // The profile picture in the user panel is updated by updateUserDetailsUI,
            // but for the settings view, we only need to ensure the upload field is ready.
        }
    };


    // --- Authentication Logic ---

    // Login function
    const login = (username, password) => {
        const user = users[username];
        if (user && user.password === password) {
            currentUser = { ...user
            }; // Copy user data
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUserDetailsUI();
            showMessage(loginMessage, 'เข้าสู่ระบบสำเร็จ!', true); // Use common showMessage
            setTimeout(() => {
                if (authOverlay) authOverlay.classList.remove('active');
            }, 500); // Shorter delay for UI to feel snappier
            return true;
        } else {
            showMessage(loginMessage, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', false); // Use common showMessage
            return false;
        }
    };

    // Register function
    const register = (username, password) => {
        if (users[username]) {
            showMessage(registerMessage, 'ชื่อผู้ใช้นี้มีอยู่แล้ว', false); // Use common showMessage
            return false;
        }

        const newAccountNumber = generateAccountNumber();
        users[username] = {
            username: username,
            password: password,
            accountNumber: newAccountNumber,
            balance: 0,
            transactions: [],
            profilePicture: null // เพิ่ม property สำหรับเก็บรูปโปรไฟล์
        };
        localStorage.setItem('bankUsers', JSON.stringify(users));
        showMessage(registerMessage, `สมัครสมาชิกสำเร็จ! เลขบัญชีของคุณ: ${newAccountNumber}`, true); // Use common showMessage
        // Switch to login tab after successful registration
        setTimeout(() => {
            if (loginTab) loginTab.click(); // Programmatically click login tab
            const loginUsernameInput = document.getElementById('login-username');
            if (loginUsernameInput) loginUsernameInput.value = username; // Pre-fill username
        }, 1000);
        return true;
    };

    // Logout function
    const logout = () => {
        currentUser = null;
        localStorage.removeItem('currentUser');
        updateUserDetailsUI();
        // Clear all form inputs on logout
        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();
        if (transferForm) transferForm.reset();
        if (depositForm) depositForm.reset();
        if (withdrawForm) withdrawForm.reset();
        // Clear all messages
        document.querySelectorAll('.form-message').forEach(msg => {
            msg.style.display = 'none';
            msg.textContent = '';
        });
        if (authOverlay) authOverlay.classList.add('active'); // Show login/register screen
        if (loginTab) loginTab.click(); // Default to login tab
        // NEW: ทำลายกราฟเมื่อ Logout
        if (transactionChart) {
            transactionChart.destroy();
            transactionChart = null;
        }
    };

    // --- Bank Operations Logic ---

    // Deposit
    const handleDeposit = (amount) => {
        if (!currentUser) {
            showMessage(depositMessage, 'กรุณาเข้าสู่ระบบก่อนทำรายการ', false);
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            showMessage(depositMessage, 'จำนวนเงินต้องมากกว่า 0', false);
            return;
        }

        currentUser.balance += amount;
        currentUser.transactions.push({
            type: 'deposit',
            amount: amount,
            date: new Date().toISOString()
        });
        users[currentUser.username] = { ...currentUser
        }; // Update user in mock DB
        localStorage.setItem('bankUsers', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(currentUser)); // Update current user in localStorage

        updateUserDetailsUI();
        showMessage(depositMessage, `ฝากเงิน ${amount.toFixed(2)} บาท สำเร็จ!`, true);
        if (depositForm) depositForm.reset();
        renderTransactionChart(); // NEW: อัปเดตกราฟหลังทำธุรกรรม
    };

    // Withdraw
    const handleWithdraw = (amount) => {
        if (!currentUser) {
            showMessage(withdrawMessage, 'กรุณาเข้าสู่ระบบก่อนทำรายการ', false);
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            showMessage(withdrawMessage, 'จำนวนเงินต้องมากกว่า 0', false);
            return;
        }
        if (currentUser.balance < amount) {
            showMessage(withdrawMessage, 'ยอดเงินในบัญชีไม่พอ', false);
            return;
        }

        currentUser.balance -= amount;
        currentUser.transactions.push({
            type: 'withdraw',
            amount: amount,
            date: new Date().toISOString()
        });
        users[currentUser.username] = { ...currentUser
        };
        localStorage.setItem('bankUsers', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        updateUserDetailsUI();
        showMessage(withdrawMessage, `ถอนเงิน ${amount.toFixed(2)} บาท สำเร็จ!`, true);
        if (withdrawForm) withdrawForm.reset();
        renderTransactionChart(); // NEW: อัปเดตกราฟหลังทำธุรกรรม
    };

    // Transfer
    const handleTransfer = (toAccountNumber, amount) => {
        if (!currentUser) {
            showMessage(transferMessage, 'กรุณาเข้าสู่ระบบก่อนทำรายการ', false);
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            showMessage(transferMessage, 'จำนวนเงินต้องมากกว่า 0', false);
            return;
        }
        if (currentUser.balance < amount) {
            showMessage(transferMessage, 'ยอดเงินในบัญชีไม่พอ', false);
            return;
        }


        // Find recipient by account number
        const recipientUsername = Object.keys(users).find(key => users[key].accountNumber === toAccountNumber);
        const recipient = users[recipientUsername];

        if (!recipient) {
            showMessage(transferMessage, 'ไม่พบเลขบัญชีปลายทาง', false);
            return;
        }
        if (recipient.accountNumber === currentUser.accountNumber) {
            showMessage(transferMessage, 'ไม่สามารถโอนเงินเข้าบัญชีตัวเองได้', false);
            return;
        }

        // Perform transfer
        currentUser.balance -= amount;
        recipient.balance += amount;

        // Add transactions to both sender and receiver
        const now = new Date().toISOString();
        currentUser.transactions.push({
            type: 'transfer_out',
            amount: amount,
            toAccount: toAccountNumber,
            date: now
        });
        recipient.transactions.push({
            type: 'transfer_in',
            amount: amount,
            fromAccount: currentUser.accountNumber,
            date: now
        });

        users[currentUser.username] = { ...currentUser
        };
        users[recipient.username] = { ...recipient
        }; // Update recipient in mock DB
        localStorage.setItem('bankUsers', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(currentUser)); // Update current user in localStorage

        updateUserDetailsUI();
        showMessage(transferMessage, `โอนเงิน ${amount.toFixed(2)} บาท ไปยัง ${toAccountNumber} สำเร็จ!`, true);
        if (transferForm) transferForm.reset();
        renderTransactionChart(); // NEW: อัปเดตกราฟหลังทำธุรกรรม
    };


    // --- Event Listeners ---

    // Auth tab switching
    if (loginTab) {
        loginTab.addEventListener('click', () => {
            loginTab.classList.add('active');
            if (registerTab) registerTab.classList.remove('active');
            if (loginFormContainer) loginFormContainer.classList.add('active');
            if (registerFormContainer) registerFormContainer.classList.remove('active');
            if (loginMessage) loginMessage.style.display = 'none';
            if (registerMessage) registerMessage.style.display = 'none';
        });
    }

    if (registerTab) {
        registerTab.addEventListener('click', () => {
            registerTab.classList.add('active');
            if (loginTab) loginTab.classList.remove('active');
            if (registerFormContainer) registerFormContainer.classList.add('active');
            if (loginFormContainer) loginFormContainer.classList.remove('active');
            if (loginMessage) loginMessage.style.display = 'none';
            if (registerMessage) registerMessage.style.display = 'none';
        });
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            login(username, password);
        });
    }

    // Register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('register-username').value;
            const password = document.getElementById('register-password').value;
            register(username, password);
        });
    }

    // Navigation (Sidebar Icons and Channel Links)
    [...sidebarIcons, ...channelLinks].forEach(element => {
        if (element) {
            element.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default link behavior
                if (currentUser) { // Only allow navigation if logged in
                    const viewId = element.dataset.view;
                    if (viewId) {
                        showView(viewId);
                    }
                } else {
                    alert('กรุณาเข้าสู่ระบบก่อนใช้งาน');
                    if (authOverlay) authOverlay.classList.add('active'); // Show login if not logged in
                }
            });
        }
    });

    // Quick action buttons on dashboard
    quickActionButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', () => {
                const targetView = button.dataset.targetView;
                if (targetView && currentUser) {
                    showView(targetView);
                } else if (!currentUser) {
                    alert('กรุณาเข้าสู่ระบบก่อนทำรายการ');
                    if (authOverlay) authOverlay.classList.add('active');
                }
            });
        }
    });


    // Logout button
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
                logout();
            }
        });
    }

    // Bank Operation Form Submissions
    if (depositForm) {
        depositForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('deposit-amount').value);
            handleDeposit(amount);
        });
    }

    if (withdrawForm) {
        withdrawForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('withdraw-amount').value);
            handleWithdraw(amount);
        });
    }

    if (transferForm) {
        transferForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const toAccount = document.getElementById('to-account-number').value;
            const amount = parseFloat(document.getElementById('transfer-amount').value);
            handleTransfer(toAccount, amount);
        });
    }

    // --- เพิ่ม Event Listeners ใหม่สำหรับรูปโปรไฟล์และปุ่มตั้งค่า ---

    // Event Listener สำหรับการอัปโหลดรูปโปรไฟล์
    if (profilePictureUpload) {
        profilePictureUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // ตรวจสอบชนิดไฟล์ (อนุญาตเฉพาะรูปภาพ)
                if (!file.type.startsWith('image/')) {
                    showMessage(profileUploadMessage, 'กรุณาเลือกไฟล์รูปภาพเท่านั้น', false);
                    e.target.value = ''; // Clear the input
                    return;
                }

                // จำกัดขนาดไฟล์ไม่เกิน 2MB (2 * 1024 * 1024 bytes)
                if (file.size > 2 * 1024 * 1024) {
                    showMessage(profileUploadMessage, 'ขนาดรูปใหญ่เกินไป (สูงสุด 2MB)', false);
                    e.target.value = ''; // Clear the input
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    const imageDataUrl = event.target.result;
                    if (currentUser) {
                        currentUser.profilePicture = imageDataUrl; // บันทึกรูปในรูปแบบ Data URL
                        users[currentUser.username] = { ...currentUser
                        }; // Update user in mock DB
                        localStorage.setItem('bankUsers', JSON.stringify(users));
                        localStorage.setItem('currentUser', JSON.stringify(currentUser)); // Update current user in localStorage

                        updateUserDetailsUI(); // อัปเดต UI ทันที
                        showMessage(profileUploadMessage, 'อัปโหลดรูปโปรไฟล์สำเร็จ!', true);
                    }
                };
                reader.onerror = () => {
                    showMessage(profileUploadMessage, 'เกิดข้อผิดพลาดในการอ่านไฟล์', false);
                };
                reader.readAsDataURL(file); // อ่านไฟล์เป็น Data URL
            }
        });
    }

    // Event Listener สำหรับปุ่ม "รีเซ็ตรหัสผ่าน"
    if (resetPasswordButton) {
        resetPasswordButton.addEventListener('click', () => {
            if (currentUser) {
                showMessage(settingsActionMessage, 'ระบบได้ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว (จำลอง)', true);
            } else {
                showMessage(settingsActionMessage, 'กรุณาเข้าสู่ระบบก่อน', false);
            }
        });
    }

    // Event Listener สำหรับปุ่ม "จัดการอุปกรณ์"
    if (manageDevicesButton) {
        manageDevicesButton.addEventListener('click', () => {
            if (currentUser) {
                showMessage(settingsActionMessage, 'หน้านี้จะแสดงอุปกรณ์ที่คุณเข้าสู่ระบบอยู่และสามารถยกเลิกได้ (จำลอง)', true);
            } else {
                showMessage(settingsActionMessage, 'กรุณาเข้าสู่ระบบก่อน', false);
            }
        });
    }


    // --- Initial Load ---
    updateUserDetailsUI(); // Update UI based on current user state
    if (!currentUser) {
        if (authOverlay) authOverlay.classList.add('active'); // Show login/register if no current user
        if (loginTab) loginTab.click(); // Default to login tab
    } else {
        showView('dashboard'); // If logged in, show dashboard
    }
});