// server.js

const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// --- MULTER CONFIGURATION ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname.includes('filePath')) {
            cb(null, 'public/downloads/');
        } else {
            cb(null, 'public/uploads/');
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        if (file.fieldname.includes('filePath')) {
            cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
        } else {
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    }
});
const upload = multer({ storage: storage });

// --- DATA MANAGEMENT ---
const contentFilePath = path.join(__dirname, 'content.json');

// *** UPDATED: Default structure now includes conservancy-specific sections ***
const defaultSiteContent = {
  home: { heroImage: "", initiatives: [], partners: [], testimonials: [], aboutImages: [] },
  about: { teamMembers: [] },
  george_mukoya: { teamMembers: [], projects: [], galleryImages: [] }, // Added George Mukoya
  muduva_nyangana: { teamMembers: [], projects: [], galleryImages: [] }, // Added Muduva Nyangana
  gallery: { images: [] },
  news: { articles: [] },
  projects: { projectCards: [] }, 
  natural_resources: { products: [] },
  hunting: {},
  youth_forum: { projects: [], opportunities: [], successStories: [], events: [] },
  jobs: { vacancies: [], tenders: [] },
  downloads: { reports: [], minutes: [], documents: [] },
  contact: {}
};

let siteContent = {};

function loadContent() {
    try {
        if (fs.existsSync(contentFilePath)) {
            const data = fs.readFileSync(contentFilePath, 'utf8');
            siteContent = { ...defaultSiteContent, ...JSON.parse(data) };
        } else {
            siteContent = defaultSiteContent;
            saveContent();
        }
        console.log('Content loaded successfully.');
    } catch (error) {
        console.error('CRITICAL ERROR loading content.json:', error);
        siteContent = defaultSiteContent;
    }
}

function saveContent() {
    try {
        fs.writeFileSync(contentFilePath, JSON.stringify(siteContent, null, 2), 'utf8');
        console.log('Content saved successfully.');
        loadContent();
    } catch (error) { console.error('Error saving content.json:', error); }
}
loadContent();

// --- MIDDLEWARE SETUP --- 
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'khaudum-secret-key-for-sessions', resave: false, saveUninitialized: true }));

app.use((req, res, next) => {
    res.locals.session = req.session;
    res.locals.siteContent = siteContent;
    next();
});

function isAuthenticated(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/login');
}

// --- CORE & PUBLIC ROUTES ---
app.get('/', (req, res) => res.render('index', { title: 'Home' }));
app.get('/about', (req, res) => res.render('about', { title: 'About Us' }));
app.get('/conservancies', (req, res) => res.render('conservancies', { title: 'Our Conservancies' }));
app.get('/projects', (req, res) => res.render('projects', { title: 'Projects & Programs' }));
app.get('/news', (req, res) => res.render('news', { title: 'News & Updates' }));
app.get('/gallery', (req, res) => res.render('gallery', { title: 'Gallery' }));
app.get('/donate', (req, res) => res.render('donate', { title: 'Donate & Support' }));
app.get('/contact', (req, res) => res.render('contact', { title: 'Contact Us' }));
app.get('/tour', (req, res) => res.render('tour', { title: 'Website Tour' }));
app.get('/feedback', (req, res) => res.render('feedback', { title: 'Comments & Suggestions' }));
app.get('/natural-resources', (req, res) => res.render('natural_resources', { title: 'Natural Resources' }));
app.get('/hunting', (req, res) => res.render('hunting', { title: 'Wildlife & Trophy Hunting' }));
app.get('/youth-forum', (req, res) => res.render('youth_forum', { title: 'Youth Forum' }));
app.get('/jobs', (req, res) => res.render('jobs', { title: 'Jobs & Opportunities' }));
app.get('/downloads', (req, res) => res.render('downloads', { title: 'Download Center' }));


// FORM SUBMISSION HANDLERS
app.post('/contact-submit', (req, res) => { console.log('Contact Form:', req.body); res.redirect('/contact?submitted=true'); });
app.post('/feedback-submit', (req, res) => { console.log('Feedback Form:', req.body); res.redirect('/feedback?submitted=true'); });
app.post('/natural-resources-submit', (req, res) => { console.log('Natural Resources Inquiry:', req.body); res.redirect('/natural-resources?submitted=true'); });
app.post('/hunting-inquiry', (req, res) => { console.log('Hunting Inquiry:', req.body); res.redirect('/hunting?submitted=true'); });
app.post('/youth-idea-submit', (req, res) => { console.log('Youth Idea Submission:', req.body); res.redirect('/youth-forum?submitted=true'); });
app.post('/apply-job', upload.single('cv'), (req, res) => {
    console.log('Job Application Received:');
    console.log('Body:', req.body);
    console.log('File:', req.file);
    res.redirect('/jobs?applied=true');
});


// --- ADMIN & CMS ROUTES ---
app.get('/login', (req, res) => { if (req.session.user) return res.redirect('/admin/dashboard'); res.render('admin/login', { title: 'Admin Login', error: null }); });
app.post('/login', (req, res) => { const { username, password } = req.body; if (username === 'admin' && password === 'password123') { req.session.user = { username: 'admin' }; res.redirect('/admin/dashboard'); } else { res.render('admin/login', { title: 'Admin Login', error: 'Invalid username or password.' }); } });
app.get('/logout', (req, res) => { req.session.destroy(() => res.redirect('/login')); });

app.get('/admin/dashboard', isAuthenticated, (req, res) => res.render('admin/dashboard', { title: 'Admin Dashboard' }));

app.get('/admin/edit/:page', isAuthenticated, (req, res) => {
    const page = req.params.page;
    if (siteContent[page]) {
        res.render('admin/edit_page', { title: `Edit ${page.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Page`, pageKey: page, pageContent: siteContent[page] });
    } else {
        res.status(404).send(`Page content not found for key: "${page}".`);
    }
});

app.post('/admin/update/:page', isAuthenticated, upload.any(), (req, res) => {
    const page = req.params.page;
    if (!siteContent[page]) { return res.status(404).send('Page not found'); }

    const fileMap = {};
    req.files.forEach(file => {
        const directory = file.fieldname.includes('filePath') ? 'downloads' : 'uploads';
        fileMap[file.fieldname] = `/${directory}/${file.filename}`;
    });
    
    const originalPageData = siteContent[page];
    const formData = req.body;

    for (const key in originalPageData) {
        if (typeof originalPageData[key] === 'string') {
            const newFileKey = `new_${key}`;
            if (fileMap[newFileKey]) { originalPageData[key] = fileMap[newFileKey]; } 
            else if (formData[key] !== undefined) { originalPageData[key] = formData[key]; }
        } else if (Array.isArray(originalPageData[key])) {
            const sectionName = key;
            if (formData[sectionName]) {
                const fieldsData = formData[sectionName];
                const newArray = [];
                if (Object.keys(fieldsData).length > 0) {
                    const itemCount = fieldsData[Object.keys(fieldsData)[0]]?.length || 0;

                    for (let i = 0; i < itemCount; i++) {
                        const newItem = {};
                        for (const field in fieldsData) {
                            const fileInputName = `${sectionName}_${field}_${i}`;
                            const fieldValue = fieldsData[field] && Array.isArray(fieldsData[field]) ? fieldsData[field][i] : undefined;
                            newItem[field] = fileMap[fileInputName] ? fileMap[fileInputName] : fieldValue;
                        }
                        newArray.push(newItem);
                    }
                }
                originalPageData[sectionName] = newArray;
            } else if (key !== 'articles') {
                originalPageData[sectionName] = [];
            }
        }
    }
    
    saveContent();
    res.redirect(`/admin/edit/${page}?saved=true`);
});

// News Article Management
app.get('/admin/news', isAuthenticated, (req, res) => { const articles = (siteContent.news.articles || []).sort((a, b) => new Date(b.date) - new Date(a.date)); res.render('admin/news_list', { title: 'Manage News', articles }); });
app.get('/admin/news/add', isAuthenticated, (req, res) => res.render('admin/news_edit', { title: 'Add New Article', article: null }));
app.post('/admin/news/add', isAuthenticated, upload.single('image'), (req, res) => { const { title, date, tag, content } = req.body; const newArticle = { id: Date.now(), title, date, tag, content, image: req.file ? `/uploads/${req.file.filename}` : 'https://via.placeholder.com/400x200' }; siteContent.news.articles.unshift(newArticle); saveContent(); res.redirect('/admin/news'); });
app.get('/admin/news/edit/:id', isAuthenticated, (req, res) => { const articleId = parseInt(req.params.id, 10); const article = siteContent.news.articles.find(a => a.id === articleId); if (article) { res.render('admin/news_edit', { title: 'Edit Article', article }); } else { res.status(404).send('Article not found'); } });
app.post('/admin/news/edit/:id', isAuthenticated, upload.single('image'), (req, res) => { const articleId = parseInt(req.params.id, 10); const articleIndex = siteContent.news.articles.findIndex(a => a.id === articleId); if (articleIndex > -1) { const { title, date, tag, content, currentImage } = req.body; const updatedArticle = { id: articleId, title, date, tag, content, image: req.file ? `/uploads/${req.file.filename}` : currentImage }; siteContent.news.articles[articleIndex] = updatedArticle; saveContent(); } res.redirect('/admin/news'); });
app.post('/admin/news/delete/:id', isAuthenticated, (req, res) => { const articleId = parseInt(req.params.id, 10); siteContent.news.articles = siteContent.news.articles.filter(a => a.id !== articleId); saveContent(); res.redirect('/admin/news'); });

// Start Server
app.listen(PORT, () => console.log(`Server is running at http://localhost:${PORT}`));