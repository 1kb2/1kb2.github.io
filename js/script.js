document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // TITLE BAR BLINKER
    // ==========================================
    const titleBase = "┌──(1kb2㉿onekbtwo)-[~]";
    const cursor = "  █";
    let isCursorVisible = true;

    setInterval(() => {
        document.title = isCursorVisible ? `${titleBase} ${cursor}` : `${titleBase}`;
        isCursorVisible = !isCursorVisible;
    }, 800);

    // ==========================================
    // GLOBAL VARIABLES
    // ==========================================
    const mainBuffer = document.querySelector('.main-buffer');
    const bufferContent = document.getElementById('buffer-content');
    const gutter = document.getElementById('gutter');
    const activeFileLabel = document.getElementById('active-file');
    const navItems = document.querySelectorAll('.nav-item');
    const vimCmd = document.getElementById('vim-cmd');
    
    let countdownInterval = null;

    // ==========================================
    // 0. AUTO-RESIZE GUTTER
    // ==========================================
    const updateGutter = () => {
        // MOBILE OPTIMIZATION: Stop calculation if gutter is hidden via CSS
        if (getComputedStyle(gutter).display === 'none') return;

        const h = bufferContent.scrollHeight;
        const lines = Math.ceil(h / 24); 
        let html = '';
        const totalLines = Math.max(lines, 50);
        for(let i=1; i<=totalLines; i++) html += `<div>${i}</div>`;
        for(let j=0; j<5; j++) html += `<div>~</div>`;
        gutter.innerHTML = html;
    };

    const resizeObserver = new ResizeObserver(() => {
        updateGutter();
    });
    resizeObserver.observe(bufferContent);

    // ==========================================
    // 1. ROUTER
    // ==========================================
    window.navigate = async function(target, param = null) {
        if (countdownInterval) clearInterval(countdownInterval);

        navItems.forEach(el => el.classList.remove('active'));
        
        // Handle active state
        let selector = `[data-target="${target}"]`;
        if (target === 'post-detail') selector = `[data-target="blog"]`; 
        if (target === 'note-detail') selector = `[data-target="notes"]`;

        const activeNav = document.querySelector(selector);
        if (activeNav) activeNav.classList.add('active');

        bufferContent.innerHTML = '';
        vimCmd.value = ''; 
        vimCmd.blur();     
        mainBuffer.scrollTop = 0;

        switch(target) {
            case 'about':
                loadNeofetch();
                activeFileLabel.innerText = '~/about/index';
                break;
            case 'projects':
                loadProjects();
                activeFileLabel.innerText = '~/projects/';
                break;
            case 'certifications':
                loadAllCertifications();
                activeFileLabel.innerText = '~/certifications/';
                break;
                
            // --- UPDATED BLOG LOGIC ---
            case 'blog':
                loadBlogList();
                activeFileLabel.innerText = '~/blog/';
                break;
            case 'post-detail':
                // Pass 'blog' as second argument so Back button knows where to go
                loadBlogPost(param, 'blog'); 
                activeFileLabel.innerText = `~/blog/${param}`;
                break;
            
            // --- UPDATED NOTES LOGIC ---
            case 'notes':
                loadNotesList();
                activeFileLabel.innerText = '~/notes/';
                break;
            case 'note-detail':
                // Pass 'notes' as second argument
                loadBlogPost(param, 'notes'); 
                activeFileLabel.innerText = `~/notes/${param}`;
                break;
                
            default:
                loadNeofetch();
        }
        
        setTimeout(updateGutter, 100);
    }

    // ==========================================
    // 2. ABOUT PAGE
    // ==========================================
    function loadNeofetch() {
        const art = `
                                                                                             
                                                                                             
                                                                                             
                                                                                             
                      ++++++ ++++++          ++++++             ++++++++++                      
                    ++++++++ ++++++          ++++++           ++++++++++++++                    
                   +++++++++ ++++++          ++++++           ++++++++++++++                    
                   +++++++++ ++++++          ++++++           ++++++  ++++++                    
                      ++++++ ++++++          ++++++           +++++   ++++++                    
                      ++++++ ++++++          ++++++           +++++   ++++++                    
                      ++++++ ++++++   +++++++++++++  +++++    +++++   ++++++                    
                      ++++++ ++++++   ++++++ ++++++++++++++           ++++++                    
                      ++++++ ++++++  +++++++ +++++++++++++++          ++++++                    
                      ++++++ ++++++  ++++++  ++++++   ++++++          ++++++                    
                      ++++++ ++++++ ++++++   ++++++   ++++++         +++++++                    
                      ++++++ ++++++ ++++++   ++++++   ++++++        +++++++                     
                      ++++++ ++++++++++++    ++++++ ++++++++      +++++++                       
                      ++++++ ++++++++++++    +++++++++++++++    ++++++++                        
                      ++++++ ++++++++++++    +++++++++++++++   +++++++                          
                      ++++++ +++++++++++++   +++++++++++++++  +++++++                           
                      ++++++ +++++++++++++   ++++++   ++++++  ++++++                            
                      ++++++ +++++++ +++++   ++++++   ++++++ +++++++                            
                      ++++++ ++++++  ++++++  ++++++   ++++++ +++++++                            
                      ++++++ ++++++  ++++++  ++++++   ++++++ +++++++                            
                      ++++++ ++++++   ++++++ ++++++   ++++++ +++++++++++++++                    
                      ++++++ ++++++   ++++++ +++++++++++++++ +++++++++++++++                    
                      ++++++ ++++++   ++++++ +++++  +++++++  +++++++++++++++                    
                                                      +++`;

        bufferContent.innerHTML = `
            <h1># ~/about/index </h1>
            <div class="neofetch-container" style="align-items: flex-start;">
                <pre class="ascii-art" style="font-size: 6px; line-height: 8px;">${art}</pre>
                <div class="info-block" style="margin-top: 10px;">
                    <div><span class="label">User:</span><span class="val">1kb2</span></div>
                    <div><span class="label">Host:</span><span class="val">127.0.0.1</span></div>
                    <div><span class="label">OS:</span><span class="val">Linux, MacOS, Solaris</span></div>
                    <div><span class="label">Kernel:</span><span class="val">x86_64</span></div>
                    <div><span class="label">Shell:</span><span class="val">FOC</span></div>
                    <div><span class="label">Focus:</span><span class="val">tty1</span></div>
                    <br>
                    <div style="display:flex; gap:5px;">
                        <span style="background:white; width:20px; height:20px;"></span>
                        <span style="background:#888; width:20px; height:20px;"></span>
                        <span style="background:#666; width:20px; height:20px;"></span>
                        <span style="background:#444; width:20px; height:20px;"></span>
                        <span style="background:#222; width:20px; height:20px;"></span>
                        <span style="background:#111; width:20px; height:20px;"></span>
                    </div>
                </div>
            </div>
            <div style="margin-top: 40px; max-width: 800px; color: #ccc;">
                <p>This website is a cybersecurity portfolio focused on practical learning, security research, and hands-on technical projects.</p>
                <p>The content presented here documents real-world experiments, labs, and projects related to offensive security.</p>
                <p>This portfolio reflects an approach centered on continuous learning, problem solving, and security mindset development.</p>
                <p>The goal of this website is to showcase technical skills, demonstrate practical experience, and provide insight into a structured cybersecurity learning path.</p>
            </div>
            <div class="cert-separator"></div>
            <p style="color: #666;">// <strong>USAGE:</strong> Navigate using the sidebar or type commands below.</p>
            <p style="color: #666;">// <strong>COMMANDS:</strong> :projects, :certifications, :blog, :notes, :about</p>
        `;
    }

    // ==========================================
    // 3. PROJECTS
    // ==========================================
    async function loadProjects() {
        try {
            const res = await fetch('data/projects.json');
            const projects = await res.json();
            let html = `<h1># Directory: ~/projects</h1>
                        <table><thead><tr><th>NAME</th><th>STACK</th><th>DESCRIPTION</th><th>LINK</th></tr></thead><tbody>`;
            projects.forEach(p => {
                const link = p.github ? `<a href="${p.github}" target="_blank" style="color:white; text-decoration:underline;">[ GITHUB ]</a>` : '<span style="color:#666;">--</span>';
                html += `<tr><td style="font-weight:bold">${p.name}</td><td>${p.stack}</td><td style="opacity:0.7">${p.description}</td><td>${link}</td></tr>`;
            });
            html += `</tbody></table>`;
            bufferContent.innerHTML = html;
        } catch (e) { renderError(e); }
    }

    // ==========================================
    // 4. CERTIFICATIONS
    // ==========================================
    async function loadAllCertifications() {
        try {
            const res = await fetch('data/certificates.json');
            const data = await res.json();
            window.certData = data; 
            
            const grouped = {};
            data.forEach(cert => {
                const issuer = cert.issuer || 'Other';
                if (!grouped[issuer]) grouped[issuer] = [];
                grouped[issuer].push(cert);
            });

            let html = `<h1># Directory: ~/certifications</h1>`;

            for (const issuer in grouped) {
                html += `
                <div class="issuer-section">
                    <div class="issuer-title">// ${issuer}</div>
                    <div class="cert-grid">
                `;
                grouped[issuer].forEach(cert => {
                    let badgeHtml = '';
                    if (cert.badge_image) {
                        badgeHtml = `<img src="${cert.badge_image}" alt="Badge" class="cert-badge-img" onload="document.dispatchEvent(new Event('resize'))">`;
                    } else if (cert.badge_ascii) {
                        badgeHtml = `<pre class="ascii-art" style="font-size:0.5rem;">${cert.badge_ascii.join('\n')}</pre>`;
                    }

                    const isPlanned = cert.status === 'planned';
                    let footerHtml = '';
                    if (isPlanned) {
                        const dateDisplay = cert.exam_date === '-' ? 'TBD' : cert.exam_date.split('T')[0];
                        footerHtml = `
                            <div style="border-top: 1px dashed #333; margin-top:15px; padding-top:5px; color:#ffaa00; font-size:0.75rem;">
                                 <span>[ TARGET EXAM: ${dateDisplay} ]</span>
                            </div>`;
                    } else {
                        footerHtml = `
                            <p style="font-size:0.7rem; opacity:0.7;">EXPIRY PROGRESS:</p>
                            <div class="progress-container">
                                <div id="fill-${cert.id}" class="progress-fill" style="width: 0%;"></div>
                            </div>
                            <div style="display:flex; justify-content:space-between; gap: 10px; margin-top: 10px; font-size:0.7rem; color:#888; border-top: 1px dashed #333; padding-top: 5px;">
                                <span>[ ${cert.date_earned.split('T')[0]} ]</span>
                                <span>[ ${cert.expiry_date.split('T')[0]} ]</span>
                            </div>`;
                    }

                    html += `
                    <div class="cert-card">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div style="flex:1; padding-right:20px;">
                                <h2 style="margin-top:0; font-size:1.1rem; line-height:1.3;">${cert.name}</h2>
                                <p style="font-size:0.8rem; color:#aaa; margin-bottom:10px;">${cert.description}</p>
                            </div>
                            ${badgeHtml}
                        </div>
                        <div style="margin-top: auto;">
                            <p style="font-size:0.7rem; margin-bottom:0;">STATUS: <span id="badge-${cert.id}">...</span></p>
                            <h2 id="timer-${cert.id}" style="font-family: 'Fira Code', monospace; font-size: 1.2rem; margin: 10px 0; color: #fff; min-height:1.2em;">...</h2>
                            ${footerHtml}
                        </div>
                    </div>`;
                });
                html += `</div></div>`;
            }

            html += `<p style="text-align:center; color:#555; margin-top:50px;">-- END OF BUFFER --</p>`;
            bufferContent.innerHTML = html;
            
            const updateTimers = () => {
                const now = new Date().getTime();
                data.forEach(cert => {
                    const elBadge = document.getElementById(`badge-${cert.id}`);
                    const elTimer = document.getElementById(`timer-${cert.id}`);
                    const elFill = document.getElementById(`fill-${cert.id}`);

                    if (!elTimer) return;

                    const isPlanned = cert.status === 'planned';
                    if (isPlanned && cert.exam_date === '-') {
                        elBadge.innerHTML = `<span class="planned-badge" style="border-color:#555; color:#555;">TBD</span>`;
                        elTimer.innerText = "DATE NOT SET";
                        return; 
                    }

                    let targetTime, startTime;
                    if (isPlanned) {
                        targetTime = new Date(cert.exam_date).getTime();
                    } else {
                        targetTime = new Date(cert.expiry_date).getTime();
                        startTime = new Date(cert.date_earned).getTime();
                    }

                    const distance = targetTime - now;

                    if (isPlanned) {
                         if (distance < 0) elBadge.innerHTML = `<span class="expired-badge">[OVERDUE]</span>`;
                         else elBadge.innerHTML = `<span class="planned-badge">PLANNED</span>`;
                    } else {
                        if (distance < 0) elBadge.innerHTML = `<span class="expired-badge">[EXPIRED]</span>`;
                        else elBadge.innerHTML = `<span class="active-badge">ACTIVE</span>`;
                    }

                    if (distance < 0) {
                        elTimer.innerText = "00d 00h 00m 00s 000ms";
                        if (elFill) elFill.style.width = "100%";
                    } else {
                        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                        const milliseconds = Math.floor(distance % 1000);
                        
                        elTimer.innerText = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s ${pad(milliseconds, 3)}ms`;

                        if (!isPlanned && elFill) {
                            const totalDuration = targetTime - startTime;
                            const timeUsed = now - startTime;
                            let percentage = (timeUsed / totalDuration) * 100;
                            elFill.style.width = `${Math.min(Math.max(percentage, 0), 100)}%`;
                        }
                    }
                });
            };

            updateTimers();
            countdownInterval = setInterval(updateTimers, 30); 
            
        } catch (e) { renderError(e); }
    }

    // ==========================================
    // 5. BLOG FUNCTIONS
    // ==========================================
    async function loadBlogList() {
        try {
            const res = await fetch('data/blog.json');
            const posts = await res.json();
            
            let html = `<h1># Directory: ~/blog</h1>
                        <p style="color:#666; margin-bottom:20px;">// Click a title to read the article.</p>
                        <table>
                            <thead><tr><th>DATE</th><th>TITLE</th><th>DESCRIPTION</th></tr></thead>
                            <tbody>`;
            
            posts.forEach(post => {
                html += `
                <tr class="blog-row" onclick="window.navigate('post-detail', '${post.filename}')" style="cursor: pointer;">
                    <td style="white-space:nowrap; color:#888;">${post.date}</td>
                    <td style="font-weight:bold; color:white; text-decoration:underline;">${post.title}</td>
                    <td style="opacity:0.7;">${post.description}</td>
                </tr>`;
            });
            html += `</tbody></table>`;
            bufferContent.innerHTML = html;
        } catch (e) { renderError("Could not load blog index."); console.error(e); }
    }

    // ==========================================
    // 6. NOTES FUNCTIONS
    // ==========================================
    async function loadNotesList() {
        try {
            const res = await fetch('data/notes.json');
            const notes = await res.json();
            
            let html = `<h1># Directory: ~/notes</h1>
                        <p style="color:#666; margin-bottom:20px;">// Collection of raw notes, cheatsheets, and external resources.</p>
                        <table>
                            <thead><tr><th>DATE</th><th>TITLE</th><th>TYPE</th><th>DESCRIPTION</th></tr></thead>
                            <tbody>`;
            
            notes.forEach(note => {
                let typeIcon = '';
                let clickAction = '';
                
                if (note.type === 'link') {
                    typeIcon = `<span style="color:#3399ff">Click Here</span>`;
                    clickAction = `window.open('${note.target}', '_blank')`;
                } else {
                    typeIcon = `<span style="color:#ffaa00">[MD 📄]</span>`;
                    clickAction = `window.navigate('note-detail', '${note.target}')`;
                }

                html += `
                <tr class="blog-row" onclick="${clickAction}" style="cursor: pointer;">
                    <td style="white-space:nowrap; color:#888;">${note.date}</td>
                    <td style="font-weight:bold; color:white;">${note.title}</td>
                    <td>${typeIcon}</td>
                    <td style="opacity:0.7;">${note.description}</td>
                </tr>`;
            });
            html += `</tbody></table>`;
            bufferContent.innerHTML = html;
        } catch (e) { renderError("Could not load notes data. Ensure data/notes.json exists."); }
    }

    // ==========================================
    // 7. MARKDOWN READER (Shared)
    // ==========================================
    async function loadBlogPost(filename, returnTarget = 'blog') {
        try {
            const res = await fetch(`data/posts/${filename}`);
            if (!res.ok) throw new Error("File not found");
            const text = await res.text();
            
            // Parse Markdown
            const htmlContent = marked.parse(text);
            
            bufferContent.innerHTML = `
                <button onclick="window.navigate('${returnTarget}')" style="background:transparent; border:1px solid #333; color:#888; padding:5px 10px; margin-bottom:20px; cursor:pointer; font-family:inherit;">../ (BACK)</button>
                
                <div class="markdown-body">
                    ${htmlContent}
                </div>
                <div class="cert-separator"></div>
                <p style="color:#444; text-align:center;">[ END OF FILE ]</p>
            `;
        } catch (e) { renderError(`Error loading file: ${filename}`); }
    }

    // ==========================================
    // 8. COMMANDS
    // ==========================================
    document.addEventListener('keydown', (e) => {
        if (e.key === ':' && document.activeElement !== vimCmd) {
            e.preventDefault();
            vimCmd.focus();
        }
    });

    vimCmd.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleCommand(vimCmd.value.trim().toLowerCase());
        if (e.key === 'Escape') vimCmd.blur();
    });

    function handleCommand(cmd) {
        const cleanCmd = cmd.replace(/^w\s+/, '').replace(/^e\s+/, '');
        if (cleanCmd === 'projects') window.navigate('projects');
        else if (cleanCmd === 'about') window.navigate('about');
        else if (cleanCmd === 'certifications') window.navigate('certifications');
        else if (cleanCmd === 'blog') window.navigate('blog');
        else if (cleanCmd === 'notes') window.navigate('notes');
        else if (cleanCmd === 'help') alert('Commands: \n :about \n :projects \n :certifications \n :blog \n :notes');
        else alert(`E492: Not an editor command: ${cmd}`);
        vimCmd.value = '';
        vimCmd.blur();
    }
    
    function pad(num, size = 2) {
        return num.toString().padStart(size, '0');
    }
    
    function renderError(e) { bufferContent.innerHTML = `<h2 style="color:red">Error</h2><p>${e}</p>`; }
    
    // Init
    navItems.forEach(item => item.addEventListener('click', (e) => window.navigate(e.currentTarget.getAttribute('data-target'))));
    window.navigate('about');
});
