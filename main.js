import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  increment, 
  arrayUnion,
  getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage, googleProvider } from './firebase.js';
import { cn, formatBytes, handleFirestoreError, OperationType } from './utils.js';

// --- State ---
let currentUser = null;
let userProfile = null;
let currentView = 'files';
let activeChat = null;

// --- DOM Elements ---
const app = document.getElementById('app');

// --- Initialization ---
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      userProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`,
        storageUsed: 0,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', user.uid), userProfile);
    } else {
      userProfile = userDoc.data();
    }
    renderDashboard();
  } else {
    userProfile = null;
    renderAuth();
  }
});

// --- View Rendering ---

function renderAuth() {
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 relative overflow-hidden">
      <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]"></div>
      </div>
      <div class="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-500/5 border border-zinc-100 dark:border-zinc-800 relative z-10">
        <div class="text-center mb-10">
          <div class="inline-block mb-6">
            <div class="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg class="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/></svg>
            </div>
          </div>
          <h1 class="text-4xl font-bold text-zinc-900 dark:text-white tracking-tight mb-2">Geedrop</h1>
          <p class="text-zinc-500 text-sm">Share files and connect with friends</p>
        </div>
        <form id="auth-form" class="space-y-6">
          <div class="space-y-2">
            <label class="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
            <input type="email" id="email" placeholder="name@example.com" required class="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border-transparent rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none">
          </div>
          <div class="space-y-2">
            <label class="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Password</label>
            <input type="password" id="password" placeholder="••••••••" required class="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border-transparent rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none">
          </div>
          <div id="auth-error" class="hidden bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl p-3">
            <p class="text-red-600 dark:text-red-400 text-xs font-medium text-center"></p>
          </div>
          <button type="submit" id="submit-btn" class="w-full py-5 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all">Sign In</button>
        </form>
        <div class="mt-8 flex items-center gap-4">
          <div class="h-[1px] flex-1 bg-zinc-100 dark:bg-zinc-800"></div>
          <span class="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Or continue with</span>
          <div class="h-[1px] flex-1 bg-zinc-100 dark:bg-zinc-800"></div>
        </div>
        <button id="google-btn" class="w-full mt-6 py-5 border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl transition-all flex items-center justify-center gap-3">
          <svg class="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.9 3.34-2.1 4.5-1.3 1.3-3.3 2.74-6.74 2.74-5.48 0-9.74-4.44-9.74-9.92s4.26-9.92 9.74-9.92c3.14 0 5.38 1.24 7.08 2.86l2.32-2.32c-2.1-2.1-5.14-3.54-9.4-3.54-7.58 0-14 6.14-14 13.92s6.42 13.92 14 13.92c4.14 0 7.3-1.36 9.74-3.92 2.54-2.54 3.34-6.1 3.34-8.94 0-.58-.04-1.14-.14-1.66h-12.94z"/></svg>
          <span class="text-xs font-bold text-zinc-700 dark:text-zinc-300">Google</span>
        </button>
        <div class="mt-10 text-center">
          <button id="toggle-auth" class="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-semibold">Don't have an account? Sign up</button>
        </div>
      </div>
    </div>
  `;

  let isLogin = true;
  const form = document.getElementById('auth-form');
  const toggleBtn = document.getElementById('toggle-auth');
  const submitBtn = document.getElementById('submit-btn');
  const errorDiv = document.getElementById('auth-error');
  const googleBtn = document.getElementById('google-btn');

  toggleBtn.onclick = () => {
    isLogin = !isLogin;
    submitBtn.textContent = isLogin ? 'Sign In' : 'Create Account';
    toggleBtn.textContent = isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in";
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    errorDiv.classList.add('hidden');
    submitBtn.disabled = true;

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      errorDiv.classList.remove('hidden');
      errorDiv.querySelector('p').textContent = err.message;
      submitBtn.disabled = false;
    }
  };

  googleBtn.onclick = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
    }
  };
}

function renderDashboard() {
  app.innerHTML = `
    <div class="min-h-screen flex bg-zinc-50 dark:bg-zinc-950">
      <!-- Sidebar -->
      <aside class="w-80 bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 flex flex-col p-8 fixed h-full">
        <div class="flex items-center gap-3 mb-12">
          <div class="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/></svg>
          </div>
          <h2 class="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Geedrop</h2>
        </div>

        <nav class="flex-1 space-y-2">
          <button data-view="files" class="nav-item w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${currentView === 'files' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
            <span class="font-semibold text-sm">My Files</span>
          </button>
          <button data-view="groups" class="nav-item w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${currentView === 'groups' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span class="font-semibold text-sm">Communities</span>
          </button>
          <button data-view="messages" class="nav-item w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${currentView === 'messages' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span class="font-semibold text-sm">Messages</span>
          </button>
          <button data-view="nearby" class="nav-item w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${currentView === 'nearby' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'}">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
            <span class="font-semibold text-sm">Nearby Share</span>
          </button>
        </nav>

        <div class="mt-auto pt-8 border-t border-zinc-100 dark:border-zinc-800">
          <div class="flex items-center gap-4 mb-6">
            <img src="${userProfile?.photoURL}" class="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-zinc-800 shadow-sm">
            <div class="min-w-0">
              <p class="font-bold text-zinc-900 dark:text-white truncate text-sm">${userProfile?.displayName}</p>
              <p class="text-xs text-zinc-500 truncate">${userProfile?.email}</p>
            </div>
          </div>
          <button id="logout-btn" class="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span class="font-bold text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 ml-80 p-12 min-h-screen">
        <div id="view-container"></div>
      </main>
    </div>
  `;

  document.getElementById('logout-btn').onclick = () => signOut(auth);

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => {
      currentView = btn.getAttribute('data-view');
      renderDashboard(); // Re-render to update sidebar active state
    };
  });

  renderCurrentView();
}

function renderCurrentView() {
  const container = document.getElementById('view-container');
  switch (currentView) {
    case 'files': renderFiles(container); break;
    case 'groups': renderGroups(container); break;
    case 'messages': renderMessages(container); break;
    case 'nearby': renderNearby(container); break;
  }
}

// --- Sub-View Implementations ---

function renderFiles(container) {
  container.innerHTML = `
    <div class="space-y-10">
      <div class="flex items-center justify-between">
        <div class="space-y-1">
          <h3 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">All Files</h3>
          <p class="text-sm text-zinc-500">Manage and share your uploaded content</p>
        </div>
        <button id="upload-btn" class="social-button bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 flex items-center gap-2">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Upload File
        </button>
        <input type="file" id="file-input" class="hidden">
      </div>

      <div id="drop-zone" class="relative border-2 border-dashed rounded-3xl p-12 transition-all duration-300 flex flex-col items-center justify-center gap-4 text-center cursor-pointer group bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-indigo-400">
        <div class="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <svg class="w-8 h-8 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </div>
        <div class="space-y-1">
          <p class="text-lg font-semibold text-zinc-900 dark:text-white">Drag and drop files here</p>
          <p class="text-zinc-500 text-sm">or click to browse your computer</p>
        </div>
      </div>

      <div id="file-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <!-- Files will be loaded here -->
      </div>
    </div>
  `;

  const fileInput = document.getElementById('file-input');
  const uploadBtn = document.getElementById('upload-btn');
  const dropZone = document.getElementById('drop-zone');
  const fileGrid = document.getElementById('file-grid');

  uploadBtn.onclick = () => fileInput.click();
  dropZone.onclick = () => fileInput.click();

  fileInput.onchange = async () => {
    if (fileInput.files?.length) {
      const file = fileInput.files[0];
      await uploadFile(file);
    }
  };

  // Real-time files
  const q = query(
    collection(db, 'files'),
    where('ownerId', '==', currentUser.uid),
    orderBy('createdAt', 'desc')
  );

  onSnapshot(q, (snapshot) => {
    fileGrid.innerHTML = snapshot.docs.map(doc => {
      const file = { id: doc.id, ...doc.data() };
      return `
        <div class="group bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-5 card-hover relative">
          <div class="flex items-start justify-between mb-4">
            <div class="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center">
              <svg class="w-6 h-6 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button onclick="shareFile('${file.id}', '${file.downloadUrl}', '${file.name}', '${file.mimeType}')" class="p-2 text-zinc-400 hover:text-indigo-600 rounded-xl" title="Share"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg></button>
              <a href="${file.downloadUrl}" target="_blank" class="p-2 text-zinc-400 hover:text-indigo-600 rounded-xl" title="Download"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></a>
              <button onclick="deleteFile('${file.id}', '${file.downloadUrl}', ${file.size})" class="p-2 text-zinc-400 hover:text-red-500 rounded-xl" title="Delete"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </div>
          </div>
          <div class="space-y-1">
            <h4 class="font-semibold truncate text-zinc-900 dark:text-zinc-100 text-sm">${file.name}</h4>
            <div class="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
              <span>${formatBytes(file.size)}</span>
              <span>${new Date(file.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  });
}

async function uploadFile(file) {
  if (!userProfile) return;
  try {
    const storageRef = ref(storage, `files/${currentUser.uid}/${Date.now()}_${file.name}`);
    const uploadResult = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(uploadResult.ref);

    const fileData = {
      name: file.name,
      size: file.size,
      mimeType: file.type,
      ownerId: currentUser.uid,
      ownerName: userProfile.displayName,
      sharedWith: [],
      downloadUrl,
      createdAt: new Date().toISOString(),
    };

    await addDoc(collection(db, 'files'), fileData);
    await updateDoc(doc(db, 'users', currentUser.uid), {
      storageUsed: increment(file.size)
    });
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

window.deleteFile = async (id, url, size) => {
  if (!confirm('Delete this file?')) return;
  try {
    await deleteObject(ref(storage, url));
    await deleteDoc(doc(db, 'files', id));
    await updateDoc(doc(db, 'users', currentUser.uid), {
      storageUsed: increment(-size)
    });
  } catch (error) {
    console.error('Delete failed:', error);
  }
};

window.shareFile = (id, url, name, mimeType) => {
  const modal = document.createElement('div');
  modal.className = "fixed inset-0 z-[100] flex items-center justify-center p-6";
  const isMedia = mimeType.startsWith('image/') || mimeType.startsWith('video/');
  
  modal.innerHTML = `
    <div class="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"></div>
    <div class="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 relative z-10 shadow-2xl border border-zinc-100 dark:border-zinc-800">
      <div class="flex items-center justify-between mb-8">
        <div class="space-y-1">
          <h3 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Share File</h3>
          <p class="text-sm text-zinc-500 truncate max-w-[250px]">${name}</p>
        </div>
        <button id="close-share-modal" class="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"><svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      
      <div class="space-y-6">
        <div class="space-y-2">
          <label class="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Sharing Link</label>
          <div class="flex gap-2">
            <input type="text" readonly value="${url}" class="flex-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border-transparent rounded-xl text-xs outline-none text-zinc-500">
            <button onclick="copyToClipboard('${url}', this)" class="px-4 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all">Copy</button>
          </div>
        </div>

        ${isMedia ? `
        <div class="space-y-2">
          <label class="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Direct URL (Forever Hosting)</label>
          <div class="flex gap-2">
            <input type="text" readonly value="${url}" class="flex-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border-transparent rounded-xl text-xs outline-none text-zinc-500">
            <button onclick="copyToClipboard('${url}', this)" class="px-4 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all">Copy</button>
          </div>
          <p class="text-[10px] text-zinc-400 ml-1 italic">Use this link for embedding in websites or forums.</p>
        </div>
        ` : ''}

        <div class="pt-4 flex flex-col gap-3">
          <p class="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Quick Share</p>
          <div class="flex gap-3">
            <button onclick="window.open('https://twitter.com/intent/tweet?text=Check out this file: ${url}', '_blank')" class="flex-1 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center hover:bg-zinc-100 transition-all">
              <svg class="w-5 h-5 text-zinc-600 dark:text-zinc-300" viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
            </button>
            <button onclick="window.open('https://www.facebook.com/sharer/sharer.php?u=${url}', '_blank')" class="flex-1 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center hover:bg-zinc-100 transition-all">
              <svg class="w-5 h-5 text-zinc-600 dark:text-zinc-300" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => document.body.removeChild(modal);
  document.getElementById('close-share-modal').onclick = close;
  modal.querySelector('.absolute').onclick = close;
};

window.copyToClipboard = (text, btn) => {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.classList.replace('bg-indigo-600', 'bg-emerald-600');
    btn.classList.replace('bg-emerald-600', 'bg-emerald-600'); // Ensure it stays green if emerald
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.replace('bg-emerald-600', 'bg-indigo-600');
    }, 2000);
  });
};

function renderGroups(container) {
  container.innerHTML = `
    <div class="space-y-10">
      <div class="flex items-center justify-between">
        <div class="space-y-1">
          <h3 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Communities</h3>
          <p class="text-sm text-zinc-500">Connect and share with your groups</p>
        </div>
        <button id="create-group-btn" class="social-button bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 flex items-center gap-2">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Group
        </button>
      </div>

      <div id="invites-container" class="space-y-4 hidden">
        <h4 class="text-sm font-bold text-zinc-900 dark:text-white px-1">Invitations</h4>
        <div id="invites-list" class="grid gap-4"></div>
      </div>

      <div id="groups-grid" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"></div>
    </div>
  `;

  const groupsGrid = document.getElementById('groups-grid');
  const invitesContainer = document.getElementById('invites-container');
  const invitesList = document.getElementById('invites-list');

  // Real-time groups
  const qGroups = query(
    collection(db, 'groups'),
    where('members', 'array-contains', currentUser.uid)
  );

  onSnapshot(qGroups, (snapshot) => {
    groupsGrid.innerHTML = snapshot.docs.map(doc => {
      const group = { id: doc.id, ...doc.data() };
      return `
        <div class="group bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 card-hover relative">
          <div class="flex items-start justify-between mb-6">
            <div class="w-14 h-14 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10">
              <svg class="w-7 h-7 text-zinc-400 group-hover:text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            ${group.ownerId === currentUser.uid ? '<span class="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg">Owner</span>' : ''}
          </div>
          <div class="space-y-4">
            <div>
              <h4 class="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">${group.name}</h4>
              <p class="text-zinc-500 text-sm mt-1 line-clamp-2 leading-relaxed">${group.description || 'No description.'}</p>
            </div>
            <div class="flex items-center justify-between pt-4 border-t border-zinc-50 dark:border-zinc-800">
              <div class="flex -space-x-2">
                ${group.members.slice(0, 3).map(() => '<div class="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 flex items-center justify-center"><svg class="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>').join('')}
              </div>
              <button class="social-button text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-xs font-bold flex items-center gap-2">
                Open Chat
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  });

  // Real-time invites
  const qInvites = query(
    collection(db, 'invites'),
    where('receiverId', '==', currentUser.uid),
    where('status', '==', 'pending')
  );

  onSnapshot(qInvites, (snapshot) => {
    if (snapshot.empty) {
      invitesContainer.classList.add('hidden');
    } else {
      invitesContainer.classList.remove('hidden');
      invitesList.innerHTML = snapshot.docs.map(doc => {
        const invite = { id: doc.id, ...doc.data() };
        return `
          <div class="bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-indigo-500/20 rounded-3xl p-6 flex items-center justify-between shadow-sm">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                <svg class="w-6 h-6 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-zinc-900 dark:text-white">Join <span class="text-indigo-600">${invite.groupName}</span></p>
                <p class="text-xs text-zinc-500 mt-0.5">Invited by ${invite.senderName}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="acceptInvite('${invite.id}', '${invite.groupId}')" class="social-button bg-indigo-600 text-white hover:bg-indigo-700 text-xs">Accept</button>
              <button onclick="rejectInvite('${invite.id}')" class="social-button text-zinc-500 hover:text-red-500 text-xs">Decline</button>
            </div>
          </div>
        `;
      }).join('');
    }
  });

  document.getElementById('create-group-btn').onclick = () => renderCreateGroupModal();
}

window.acceptInvite = async (id, groupId) => {
  await updateDoc(doc(db, 'groups', groupId), { members: arrayUnion(currentUser.uid) });
  await updateDoc(doc(db, 'invites', id), { status: 'accepted' });
};

window.rejectInvite = async (id) => {
  await updateDoc(doc(db, 'invites', id), { status: 'rejected' });
};

async function renderCreateGroupModal() {
  const modal = document.createElement('div');
  modal.className = "fixed inset-0 z-[100] flex items-center justify-center p-6";
  modal.innerHTML = `
    <div class="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"></div>
    <div class="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 relative z-10 shadow-2xl border border-zinc-100 dark:border-zinc-800">
      <div class="flex items-center justify-between mb-8">
        <div class="space-y-1">
          <h3 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">New Community</h3>
          <p class="text-sm text-zinc-500">Create a space for your group to connect</p>
        </div>
        <button id="close-modal" class="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"><svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      <form id="create-group-form" class="space-y-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="space-y-6">
            <div class="space-y-2">
              <label class="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Group Name</label>
              <input type="text" id="group-name" placeholder="e.g. Design Team" required class="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border-transparent rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none">
            </div>
            <div class="space-y-2">
              <label class="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Description</label>
              <textarea id="group-desc" placeholder="What is this group about?" class="w-full bg-zinc-50 dark:bg-zinc-950 border border-transparent rounded-2xl px-4 py-4 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[120px] resize-none text-sm"></textarea>
            </div>
          </div>
          <div class="space-y-4 flex flex-col h-full">
            <label class="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Invite Members</label>
            <div id="users-list" class="flex-1 bg-zinc-50 dark:bg-zinc-950 rounded-2xl overflow-y-auto max-h-[280px] border border-zinc-100 dark:border-zinc-800"></div>
          </div>
        </div>
        <div class="flex justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
          <button type="button" id="cancel-modal" class="social-button px-8 text-zinc-500">Cancel</button>
          <button type="submit" class="social-button bg-indigo-600 text-white hover:bg-indigo-700 px-10 shadow-lg shadow-indigo-500/20">Create</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const usersList = document.getElementById('users-list');
  const snapshot = await getDocs(collection(db, 'users'));
  const users = snapshot.docs.map(doc => doc.data()).filter(u => u.uid !== currentUser.uid);

  usersList.innerHTML = users.map(user => `
    <label class="flex items-center gap-4 p-4 hover:bg-white dark:hover:bg-zinc-900 cursor-pointer transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0 group">
      <input type="checkbox" name="invited-users" value="${user.uid}" class="w-5 h-5 rounded-lg text-indigo-600">
      <img src="${user.photoURL}" class="w-10 h-10 rounded-xl object-cover">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-zinc-900 dark:text-white truncate">${user.displayName}</p>
        <p class="text-[10px] text-zinc-500 truncate">${user.email}</p>
      </div>
    </label>
  `).join('');

  const close = () => document.body.removeChild(modal);
  document.getElementById('close-modal').onclick = close;
  document.getElementById('cancel-modal').onclick = close;

  const form = document.getElementById('create-group-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('group-name').value;
    const desc = document.getElementById('group-desc').value;
    const selectedUsers = Array.from(document.querySelectorAll('input[name="invited-users"]:checked')).map(el => el.value);

    const groupRef = await addDoc(collection(db, 'groups'), {
      name,
      description: desc,
      ownerId: currentUser.uid,
      members: [currentUser.uid],
      createdAt: new Date().toISOString(),
    });

    for (const userId of selectedUsers) {
      await addDoc(collection(db, 'invites'), {
        groupId: groupRef.id,
        groupName: name,
        senderId: currentUser.uid,
        senderName: userProfile.displayName,
        receiverId: userId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    }
    close();
  };
}

function renderMessages(container) {
  if (activeChat) {
    renderChatWindow(container);
    return;
  }

  container.innerHTML = `
    <div class="h-full flex flex-col space-y-10">
      <div class="space-y-1">
        <h3 class="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Messages</h3>
        <p class="text-sm text-zinc-500">Stay connected with your friends and groups</p>
      </div>
      <div class="flex-1 overflow-y-auto space-y-10 pr-4 custom-scrollbar">
        <section class="space-y-4">
          <h4 class="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">Groups</h4>
          <div id="chat-groups" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"></div>
        </section>
        <section class="space-y-4">
          <h4 class="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">Direct Messages</h4>
          <div id="chat-users" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"></div>
        </section>
      </div>
    </div>
  `;

  const chatGroups = document.getElementById('chat-groups');
  const chatUsers = document.getElementById('chat-users');

  onSnapshot(query(collection(db, 'groups'), where('members', 'array-contains', currentUser.uid)), (snapshot) => {
    chatGroups.innerHTML = snapshot.docs.map(doc => {
      const group = { id: doc.id, ...doc.data() };
      return `
        <button onclick="openChat('${group.id}', '${group.name}', 'group')" class="flex items-center gap-4 p-5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] card-hover text-left group">
          <div class="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center">
            <svg class="w-6 h-6 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-bold text-zinc-900 dark:text-white truncate">${group.name}</p>
            <p class="text-xs text-zinc-500 mt-0.5">${group.members.length} members</p>
          </div>
        </button>
      `;
    }).join('');
  });

  onSnapshot(collection(db, 'users'), (snapshot) => {
    const users = snapshot.docs.map(doc => doc.data()).filter(u => u.uid !== currentUser.uid);
    chatUsers.innerHTML = users.map(user => {
      const chatId = [currentUser.uid, user.uid].sort().join('_');
      return `
        <button onclick="openChat('${chatId}', '${user.displayName}', 'direct')" class="flex items-center gap-4 p-5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] card-hover text-left group">
          <div class="relative">
            <img src="${user.photoURL}" class="w-14 h-14 rounded-2xl object-cover">
            <div class="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full shadow-sm"></div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-bold text-zinc-900 dark:text-white truncate">${user.displayName}</p>
            <p class="text-xs text-zinc-500 mt-0.5 truncate">${user.email}</p>
          </div>
        </button>
      `;
    }).join('');
  });
}

window.openChat = (id, name, type) => {
  activeChat = { id, name, type };
  renderCurrentView();
};

function renderChatWindow(container) {
  if (!activeChat) return;
  container.innerHTML = `
    <div class="h-full flex flex-col bg-white dark:bg-zinc-900/50 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">
      <header class="h-20 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between px-8 bg-white dark:bg-zinc-900">
        <div class="flex items-center gap-4">
          <button id="back-btn" class="p-2.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-2xl transition-all"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center">
              <svg class="w-6 h-6 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div>
              <h4 class="font-bold text-zinc-900 dark:text-white">${activeChat.name}</h4>
              <div class="flex items-center gap-1.5 mt-0.5"><div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div><p class="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Online</p></div>
            </div>
          </div>
        </div>
      </header>
      <div id="messages-list" class="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar"></div>
      <form id="chat-form" class="p-6 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-4">
        <input type="text" id="msg-input" placeholder="Type a message..." class="flex-1 bg-zinc-50 dark:bg-zinc-950 border-transparent rounded-2xl py-4 px-5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20">
        <button type="submit" class="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
      </form>
    </div>
  `;

  document.getElementById('back-btn').onclick = () => {
    activeChat = null;
    renderCurrentView();
  };

  const messagesList = document.getElementById('messages-list');
  const q = query(collection(db, 'chats', activeChat.id, 'messages'), orderBy('createdAt', 'asc'));

  onSnapshot(q, (snapshot) => {
    messagesList.innerHTML = snapshot.docs.map(doc => {
      const msg = { id: doc.id, ...doc.data() };
      const isMe = msg.senderId === currentUser.uid;
      return `
        <div class="flex flex-col max-w-[75%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}">
          ${!isMe ? `<span class="text-[10px] font-bold text-zinc-400 mb-1.5 ml-1 uppercase tracking-wider">${msg.senderName}</span>` : ''}
          <div class="px-5 py-3 rounded-[1.5rem] text-sm leading-relaxed shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none'}">
            ${msg.text}
          </div>
          <span class="text-[9px] font-bold text-zinc-400 mt-1.5 uppercase tracking-widest">${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      `;
    }).join('');
    messagesList.scrollTop = messagesList.scrollHeight;
  });

  const form = document.getElementById('chat-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if (!text || !activeChat) return;

    await addDoc(collection(db, 'chats', activeChat.id, 'messages'), {
      chatId: activeChat.id,
      senderId: currentUser.uid,
      senderName: userProfile.displayName,
      text,
      createdAt: new Date().toISOString(),
    });
    input.value = '';
  };
}

function renderNearby(container) {
  container.innerHTML = `
    <div class="h-full flex flex-col items-center justify-center max-w-5xl mx-auto space-y-12">
      <div class="text-center space-y-8 relative">
        <div id="scan-indicator" class="w-32 h-32 rounded-[2.5rem] flex items-center justify-center border-2 border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 mx-auto transition-all duration-700">
          <svg class="w-12 h-12 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
        </div>
        <div class="space-y-3">
          <h3 class="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">Nearby Share</h3>
          <p class="text-zinc-500 max-w-md mx-auto text-base">Share files instantly with people around you. Start scanning to find nearby devices.</p>
        </div>
        <button id="scan-btn" class="social-button px-12 py-6 text-sm font-bold shadow-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20">Start Scanning</button>
      </div>

      <div class="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-8 space-y-6 shadow-sm">
          <h4 class="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Devices Nearby</h4>
          <div id="nearby-devices" class="space-y-3">
            <div class="text-center py-16 space-y-4">
              <svg class="w-12 h-12 text-zinc-100 dark:text-zinc-800 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <p class="text-zinc-400 text-sm">Scanning is currently off</p>
            </div>
          </div>
        </div>
        <div class="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-8 space-y-6 shadow-sm">
          <h4 class="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-widest">Incoming Files</h4>
          <div id="nearby-requests" class="space-y-3">
            <div class="text-center py-16 space-y-4">
              <svg class="w-12 h-12 text-zinc-100 dark:text-zinc-800 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <p class="text-zinc-400 text-sm">No incoming transfers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  let scanning = false;
  const scanBtn = document.getElementById('scan-btn');
  const indicator = document.getElementById('scan-indicator');
  const devicesList = document.getElementById('nearby-devices');

  scanBtn.onclick = () => {
    scanning = !scanning;
    scanBtn.textContent = scanning ? 'Stop Scanning' : 'Start Scanning';
    scanBtn.className = scanning ? "social-button px-12 py-6 text-sm font-bold shadow-xl bg-red-500 hover:bg-red-600 text-white shadow-red-500/20" : "social-button px-12 py-6 text-sm font-bold shadow-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20";
    indicator.className = scanning ? "w-32 h-32 rounded-[2.5rem] flex items-center justify-center border-2 border-indigo-500 bg-indigo-500/10 shadow-[0_0_50px_rgba(99,102,241,0.2)] mx-auto transition-all duration-700" : "w-32 h-32 rounded-[2.5rem] flex items-center justify-center border-2 border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 mx-auto transition-all duration-700";
    
    if (scanning) {
      devicesList.innerHTML = `
        <div class="text-center py-16 space-y-4">
          <div class="w-2 h-2 bg-indigo-500 rounded-full mx-auto animate-ping"></div>
          <p class="text-zinc-500 text-sm">Looking for devices...</p>
        </div>
      `;
    } else {
      devicesList.innerHTML = `
        <div class="text-center py-16 space-y-4">
          <svg class="w-12 h-12 text-zinc-100 dark:text-zinc-800 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <p class="text-zinc-400 text-sm">Scanning is currently off</p>
        </div>
      `;
    }
  };
}
