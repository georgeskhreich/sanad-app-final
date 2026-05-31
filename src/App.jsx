import React, { useState, useEffect, useRef } from 'react';
// استيراد مكتبات Firebase اللازمة للعمل أونلاين بالكامل
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot 
} from 'firebase/firestore';

// ==========================================
// إعدادات وتكوين نظام Firebase السحابي
// ==========================================
// ⚠️ ضع مفاتيح مشروعك هنا ⚠️
const firebaseConfig = {
  apiKey: "AIzaSyB2E40ctcxOEtKbURfxDlvUluNfnZuukRo",
  authDomain: "ain-ebel-sanad.firebaseapp.com",
  projectId: "ain-ebel-sanad",
  storageBucket: "ain-ebel-sanad.firebasestorage.app",
  messagingSenderId: "1033988646153",
  appId: "1:1033988646153:web:7c606c945917c4aa3b9fd8",
  measurementId: "G-EY6T4E6SKJ"
};

// تهيئة خدمات Firebase الأساسية
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase config error", error);
}

const appId = 'ain-ebel-sanad-v4'; // معرّف التطبيق الفريد لبلدية عين إبل

// ==========================================
// البيانات النموذجية الأولية 
// ==========================================
const SEED_SURVEYS = [
  {
    ownerName: "خالد محمود عبد الله",
    ownerPhone: "0798765432",
    ownerId: "1002938475",
    propertyType: "منزل مستقل",
    gps: { lat: 33.1102, lng: 35.4025, address: "عين إبل، حارة البيادر - بجانب كنيسة السيدة", locationUrl: "https://maps.app.goo.gl/K8f9X4zY7w2R1Q8p7" },
    timestamp: "2026-05-28 10:15",
    engineerName: "م. أحمد الشامي",
    structural: { columns: "تصدعات عميقة", beams: "ترخيم ملحوظ (Deflection)", foundations: "سليم" },
    nonStructural: { walls: "تشققات مائلة (X-Cracks)", windows_alu_small: 2, windows_alu_large: 3, windows_steel: 1, windows_facade: 1, doors_wood: 4, doors_iron: 1 },
    bathrooms: { status: "تدمير كلي وتفجر التمديدات الصحية", count: 2 },
    external: { fences: "انهيار جزئي", gates: "متضررة جزئياً", annexes_detailed: { garage: { selected: true, area: 35, damage: "تصدع وشروخ عميقة" }, workroom: { selected: true, area: 15, damage: "انهيار جزئي" }, attic: { selected: false, area: 0, damage: "سليم" }, canopy: { selected: true, area: 20, damage: "تفتت بالكامل وتفحم القرميد" } } },
    contents: { furniture_bedroom_count: 1, furniture_bedroom_damage: "تحطم كلي وانضغاط تحت الأنقاض", furniture_beds_count: 2, furniture_beds_damage: "شروخ وتكسر جزئي بالخشب/الزجاج", furniture_wardrobes_count: 1, furniture_wardrobes_damage: "تحطم كلي وانضغاط تحت الأنقاض", furniture_sofa_count: 1, furniture_sofa_damage: "اختراق شظايا وثقوب عصف", furniture_dining_count: 6, furniture_dining_damage: "شروخ وتكسر جزئي بالخشب/الزجاج", furniture_carpet_count: 4, furniture_carpet_damage: "تلوث شديد وتلف الأنسجة (غبار/رماد/رطوبة)", appliances_fridge: 1, appliances_tv: 2, appliances_cooker: 1, appliances_heater: 3, appliances_ac: 2, appliances_washing: 1 },
    notes: "المبنى تعرض لموجة ضغط انفجار عنيفة قريبة جداً مما أدى لدمار كامل للأثاث الداخلي وتفجر الشبكة المائية.",
    severity: "جسيم / خطر",
    status: "بانتظار الاعتماد",
    signature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    photos: ["https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&q=80&w=600"]
  }
];

const SEED_USERS = [
  { name: "المدير العام (Admin)", username: "admin", password: "123", role: "Admin", createdAt: "2026-05-28" },
  { name: "لجنة البلدية (المشرف العام)", username: "supervisor", password: "123", role: "Supervisor", createdAt: "2026-05-28" },
  { name: "م. أحمد الشامي", username: "engineer", password: "123", role: "Field_Engineer", createdAt: "2026-05-28" }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null); 
  const [authError, setAuthError] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [currentTab, setCurrentTab] = useState("field-new"); 
  const [surveys, setSurveys] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [usersList, setUsersList] = useState([]);

  const [newEngineerForm, setNewEngineerForm] = useState({
    name: "", username: "", password: "", role: "Field_Engineer"
  });
  
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [editingUser, setEditingUser] = useState(null);

  const [wizardStep, setWizardStep] = useState(1);
  const initialFormData = {
    ownerName: "", ownerPhone: "", ownerId: "", propertyType: "منزل مستقل",
    gps: { lat: 33.1102, lng: 35.4025, address: "عين إبل، جاري تحديد الموقع الميداني..." },
    locationUrl: "",
    structural_columns: "سليم", structural_beams: "سليم", structural_foundations: "سليم",
    nonStructural_walls: "سليم", nonStructural_windows_alu_small: 0, nonStructural_windows_alu_large: 0, nonStructural_windows_steel: 0, nonStructural_windows_facade: 0, nonStructural_doors_wood: 0, nonStructural_doors_iron: 0,
    bathroom_status: "سليم", bathroom_count: 0,
    external_fences: "سليمة", external_gates: "سليمة",
    external_annex_garage_selected: false, external_annex_garage_area: 0, external_annex_garage_damage: "سليم",
    external_annex_workroom_selected: false, external_annex_workroom_area: 0, external_annex_workroom_damage: "سليم",
    external_annex_attic_selected: false, external_annex_attic_area: 0, external_annex_attic_damage: "سليم",
    external_annex_canopy_selected: false, external_annex_canopy_area: 0, external_annex_canopy_damage: "سليم",
    furniture_bedroom_count: 0, furniture_bedroom_damage: "سليم", furniture_beds_count: 0, furniture_beds_damage: "سليم", furniture_wardrobes_count: 0, furniture_wardrobes_damage: "سليم", furniture_sofa_count: 0, furniture_sofa_damage: "سليم", furniture_dining_count: 0, furniture_dining_damage: "سليم", furniture_carpet_count: 0, furniture_carpet_damage: "سليم",
    appliances_fridge: 0, appliances_tv: 0, appliances_cooker: 0, appliances_heater: 0, appliances_ac: 0, appliances_washing: 0,
    notes: "", audioNote: null, photos: []
  };
  const [formData, setFormData] = useState(initialFormData);

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);

  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("الكل");
  const [toastMessage, setToastMessage] = useState("");

  const DAMAGE_TYPES = [
    "سليم", "شروخ وتكسر جزئي بالخشب/الزجاج", "اختراق شظايا وثقوب عصف", 
    "تلوث شديد وتلف الأنسجة (غبار/رماد/رطوبة)", "حروق وتفحم جزئي/كلي", "تحطم كلي وانضغاط تحت الأنقاض"
  ];

  const ANNEX_TYPES = [
    { id: "garage", label: "كراج سيارات خارجي مستقل", icon: "🚗" },
    { id: "workroom", label: "غرفة صيانة أو حراسة خارجية", icon: "🛠️" },
    { id: "attic", label: "سقيفة أو مخزن خارجي", icon: "📦" },
    { id: "canopy", label: "مظلة قرميد خارجية", icon: "🏡" }
  ];

  useEffect(() => {
    if(!auth) return;
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (err) { console.error("Auth error", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => setFirebaseUser(user));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser || !db) return;
    const surveysRef = collection(db, 'artifacts', appId, 'public', 'surveys');
    const unsubSurveys = onSnapshot(surveysRef, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setSurveys(list);
    });

    const usersRef = collection(db, 'artifacts', appId, 'public', 'users');
    const unsubUsers = onSnapshot(usersRef, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setUsersList(list);
    });

    return () => { unsubSurveys(); unsubUsers(); };
  }, [firebaseUser]);

  useEffect(() => {
    if (navigator.geolocation && wizardStep === 1) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData(prev => ({
            ...prev, gps: { lat: parseFloat(pos.coords.latitude.toFixed(6)), lng: parseFloat(pos.coords.longitude.toFixed(6)), address: `إحداثيات حية: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` }
          }));
        }, () => {} 
      );
    }
  }, [wizardStep]);

  const showToast = (msg) => { setToastMessage(msg); setTimeout(() => setToastMessage(""), 4000); };

  const handleSeedDatabase = async () => {
    if (!firebaseUser || !db) return;
    try {
      showToast("جاري تهيئة البيانات النموذجية...");
      for (const item of SEED_SURVEYS) {
        await setDoc(doc(collection(db, 'artifacts', appId, 'public', 'surveys')), item);
      }
      for (const user of SEED_USERS) {
        if (!usersList.some(u => u.username === user.username)) {
           await setDoc(doc(collection(db, 'artifacts', appId, 'public', 'users')), user);
        }
      }
      showToast("تم الرفع بنجاح.");
    } catch (e) { showToast("تعذر الرفع. تأكد من الاتصال."); }
  };

  const calculateSeverity = (data) => {
    const isRed = 
      data.structural_columns === "تصدعات عميقة" || data.structural_columns === "انقشاع الخرسانة (Spalling)" || data.structural_columns === "انبعاج حديد التسليح (Buckling)" || data.structural_columns === "فشل كلي/انهيار" ||
      data.structural_beams === "ترخيم ملحوظ (Deflection)" || data.structural_beams === "انفصال الغطاء الخرساني" || data.structural_beams === "اختراق كامل (Punching)" || data.structural_beams === "انهيار جزئي/كلي لبلاد السقف" ||
      data.structural_foundations === "هبوط تفاضلي (Settlement)" || data.bathroom_status === "تدمير كلي وتفجر التمديدات الصحية" ||
      data.furniture_bedroom_damage === "تحطم كلي وانضغاط تحت الأنقاض" || data.furniture_sofa_damage === "تحطم كلي وانضغاط تحت الأنقاض" ||
      (data.external_annex_garage_selected && (data.external_annex_garage_damage === "انهيار كلي" || data.external_annex_garage_damage === "انهيار جزئي")) ||
      (data.external_annex_workroom_selected && (data.external_annex_workroom_damage === "انهيار كلي" || data.external_annex_workroom_damage === "انهيار جزئي")) ||
      (data.external_annex_attic_selected && (data.external_annex_attic_damage === "انهيار كلي" || data.external_annex_attic_damage === "انهيار جزئي")) ||
      (data.external_annex_canopy_selected && (data.external_annex_canopy_damage === "انهيار كلي" || data.external_annex_canopy_damage === "انهيار جزئي"));

    const isOrange = 
      data.structural_columns === "تشققات شعرية سطحيّة" || data.structural_beams === "تشققات عرضية/طولية" || data.structural_foundations === "تصدع في الأساسات" ||
      data.nonStructural_walls === "تشققات مائلة (X-Cracks)" || data.nonStructural_walls === "انهيار جزئي" || data.external_fences === "تصدع وشروخ خطيرة" || data.external_fences === "انهيار جزئي" ||
      data.bathroom_status === "تدمير جزئي (أطقم صحية/مغاسل)" || data.furniture_bedroom_damage === "اختراق شظايا وثقوب عصف" || data.furniture_sofa_damage === "اختراق شظايا وثقوب عصف" ||
      (data.external_annex_garage_selected && data.external_annex_garage_damage === "تصدع وشروخ عميقة") ||
      (data.external_annex_workroom_selected && data.external_annex_workroom_damage === "تصدع وشروخ عميقة") ||
      (data.external_annex_attic_selected && data.external_annex_attic_damage === "تصدع وشروخ عميقة") ||
      (data.external_annex_canopy_selected && data.external_annex_canopy_damage === "تصدع وشروخ عميقة");

    if (isRed) return "جسيم / خطر";
    if (isOrange) return "متوسط";
    return "خفيف";
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y); setIsDrawing(true);
  };
  const draw = (e) => {
    if (!isDrawing) return; const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect(); const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left; const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.lineTo(x, y); ctx.stroke(); setHasSignature(true);
  };
  const stopDrawing = () => setIsDrawing(false);
  const clearCanvas = () => { const canvas = canvasRef.current; if (!canvas) return; canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); setHasSignature(false); };

  const handleCapturePhoto = () => { if (fileInputRef.current) fileInputRef.current.click(); };
  const handleRealPhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => { setFormData(prev => ({ ...prev, photos: [...prev.photos, event.target.result] })); };
      reader.readAsDataURL(file);
    });
    showToast("تم التقاط وإرفاق الصورة بنجاح.");
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorderRef.current.onstop = () => {
        const reader = new FileReader();
        reader.readAsDataURL(new Blob(chunks, { type: 'audio/webm' }));
        reader.onloadend = () => { setFormData(prev => ({ ...prev, audioNote: reader.result })); showToast("تم حفظ التسجيل الصوتي."); };
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) { showToast("تعذر الوصول للمايكروفون."); }
  };
  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); } };
  const deleteAudioNote = () => { setFormData(prev => ({ ...prev, audioNote: null })); showToast("تم حذف التسجيل."); };

  const handleLogin = (e) => {
    e.preventDefault();
    const { username, password } = loginForm;
    const matchingUser = usersList.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password);
    
    if (matchingUser) {
      setCurrentUser({ username: matchingUser.username, role: matchingUser.role, name: matchingUser.name });
      setCurrentTab(matchingUser.role === "Field_Engineer" ? "field-new" : "supervisor-dashboard");
      setAuthError(""); showToast(`مرحباً بك ${matchingUser.name}.`);
    } else if (username === "admin" && password === "123") {
      setCurrentUser({ username: "admin", role: "Admin", name: "المدير العام (Admin)" });
      setCurrentTab("supervisor-dashboard"); setAuthError(""); showToast("مرحباً بك، سيادة المدير.");
    } else if (username === "supervisor" && password === "123") {
      setCurrentUser({ username: "supervisor", role: "Supervisor", name: "لجنة البلدية (المشرف العام)" });
      setCurrentTab("supervisor-dashboard"); setAuthError(""); showToast("مرحباً سيادة المشرف.");
    } else if (username === "engineer" && password === "123") {
      setCurrentUser({ username: "engineer", role: "Field_Engineer", name: "م. أحمد الشامي" });
      setCurrentTab("field-new"); setAuthError(""); showToast("مرحباً بك.");
    } else {
      setAuthError("البيانات غير صحيحة.");
    }
  };
  const handleLogout = () => { setCurrentUser(null); setLoginForm({ username: "", password: "" }); };

  const handleCreateNewUser = async (e) => {
    e.preventDefault();
    if (!db) { showToast("قاعدة البيانات غير متصلة"); return; }
    const { name, username, password, role } = newEngineerForm;
    if (!name.trim() || !username.trim() || !password.trim()) { showToast("الرجاء تعبئة الحقول."); return; }
    if (usersList.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) { showToast("اسم المستخدم محجوز!"); return; }
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'users'), { name: name.trim(), username: username.trim().toLowerCase(), password: password.trim(), role: role, createdAt: new Date().toISOString().substring(0, 10) });
      showToast(`تم إنشاء الحساب بنجاح!`);
      setNewEngineerForm({ name: "", username: "", password: "", role: "Field_Engineer" });
    } catch (err) { showToast("حدث خطأ."); }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!editingUser || !editingUser.newPassword.trim() || !db) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'users', editingUser.id), { password: editingUser.newPassword.trim() });
      showToast("تم تغيير كلمة المرور بنجاح."); setEditingUser(null);
    } catch (err) { showToast("فشل التحديث."); }
  };

  const handleDeleteUser = async (id, role) => {
    if (!db || currentUser?.role !== "Admin") return;
    if (role === "Admin" && usersList.filter(u => u.role === "Admin").length <= 1) {
        showToast("لا يمكنك حذف حساب الإدارة الوحيد في النظام!"); return;
    }
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'users', id));
      showToast("تم حذف الحساب نهائياً.");
    } catch (e) { showToast("فشل حذف المستخدم."); }
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFormSubmit = async () => {
    let signatureImg = "";
    if (canvasRef.current && hasSignature) signatureImg = canvasRef.current.toDataURL();

    const calculatedSev = calculateSeverity(formData);
    const newSurveyPayload = {
      engineerName: currentUser.name, ownerName: formData.ownerName || "غير محدد", ownerPhone: formData.ownerPhone || "غير معروف", ownerId: formData.ownerId || "غير مدخل", propertyType: formData.propertyType,
      gps: { lat: formData.gps.lat, lng: formData.gps.lng, address: formData.gps.address, locationUrl: formData.locationUrl || "" },
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      structural: { columns: formData.structural_columns, beams: formData.structural_beams, foundations: formData.structural_foundations },
      nonStructural: { walls: formData.nonStructural_walls, windows_alu_small: parseInt(formData.nonStructural_windows_alu_small)||0, windows_alu_large: parseInt(formData.nonStructural_windows_alu_large)||0, windows_steel: parseInt(formData.nonStructural_windows_steel)||0, windows_facade: parseInt(formData.nonStructural_windows_facade)||0, doors_wood: parseInt(formData.nonStructural_doors_wood)||0, doors_iron: parseInt(formData.nonStructural_doors_iron)||0 },
      bathrooms: { status: formData.bathroom_status, count: parseInt(formData.bathroom_count)||0 },
      external: { fences: formData.external_fences, gates: formData.external_gates, annexes_detailed: { garage: { selected: formData.external_annex_garage_selected, area: parseInt(formData.external_annex_garage_area)||0, damage: formData.external_annex_garage_damage }, workroom: { selected: formData.external_annex_workroom_selected, area: parseInt(formData.external_annex_workroom_area)||0, damage: formData.external_annex_workroom_damage }, attic: { selected: formData.external_annex_attic_selected, area: parseInt(formData.external_annex_attic_area)||0, damage: formData.external_annex_attic_damage }, canopy: { selected: formData.external_annex_canopy_selected, area: parseInt(formData.external_annex_canopy_area)||0, damage: formData.external_annex_canopy_damage } } },
      contents: { furniture_bedroom_count: parseInt(formData.furniture_bedroom_count)||0, furniture_bedroom_damage: formData.furniture_bedroom_damage, furniture_beds_count: parseInt(formData.furniture_beds_count)||0, furniture_beds_damage: formData.furniture_beds_damage, furniture_wardrobes_count: parseInt(formData.furniture_wardrobes_count)||0, furniture_wardrobes_damage: formData.furniture_wardrobes_damage, furniture_sofa_count: parseInt(formData.furniture_sofa_count)||0, furniture_sofa_damage: formData.furniture_sofa_damage, furniture_dining_count: parseInt(formData.furniture_dining_count)||0, furniture_dining_damage: formData.furniture_dining_damage, furniture_carpet_count: parseInt(formData.furniture_carpet_count)||0, furniture_carpet_damage: formData.furniture_carpet_damage, appliances_fridge: parseInt(formData.appliances_fridge)||0, appliances_tv: parseInt(formData.appliances_tv)||0, appliances_cooker: parseInt(formData.appliances_cooker)||0, appliances_heater: parseInt(formData.appliances_heater)||0, appliances_ac: parseInt(formData.appliances_ac)||0, appliances_washing: parseInt(formData.appliances_washing)||0 },
      notes: formData.notes, audioNote: formData.audioNote, severity: calculatedSev, status: isOnline && db ? "بانتظار الاعتماد" : "مسودة (أوفلاين)",
      signature: signatureImg || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      photos: formData.photos.length > 0 ? formData.photos : ["https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&q=80&w=600"]
    };

    try {
      if (isOnline && db) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'surveys'), newSurveyPayload);
        showToast("تم رفع الاستمارة أونلاين بنجاح! يمكنك البدء بملف جديد.");
      } else {
        setDrafts([{ id: `DRAFT-${Date.now()}`, ...newSurveyPayload }, ...drafts]);
        showToast("تم الحفظ كمسودة. يمكنك البدء بملف جديد الآن.");
      }
    } catch (e) { showToast("خطأ بالاتصال."); return; }

    setWizardStep(1);
    setFormData(initialFormData);
    setHasSignature(false);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const handleSyncDrafts = async () => {
    if (drafts.length === 0 || !db) return;
    try {
      for (const draft of drafts) { const { id, ...payload } = draft; payload.status = "بانتظار الاعتماد"; await addDoc(collection(db, 'artifacts', appId, 'public', 'surveys'), payload); }
      setDrafts([]); showToast("تمت مزامنة كافة المسودات بنجاح!");
    } catch (e) { showToast("فشلت المزامنة."); }
  };

  const handleApproveReport = async (id) => {
    if (!db) return; try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'surveys', id), { status: "معتمد" }); setSelectedSurvey(prev => ({...prev, status:"معتمد"})); showToast("تم اعتماد التقرير."); } catch (e) { showToast("فشل التحديث."); }
  };
  const handleRejectReport = async (id) => {
    if (!db) return; try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'surveys', id), { status: "مرفوض - يتطلب إعادة مسح" }); setSelectedSurvey(prev => ({...prev, status:"مرفوض - يتطلب إعادة مسح"})); showToast("تم رفض التقرير."); } catch (e) { showToast("فشل التحديث."); }
  };
  const handleDeleteReport = async (id) => {
    if (!db || currentUser?.role !== "Admin") return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'surveys', id));
      if (selectedSurvey?.id === id) setSelectedSurvey(null);
      showToast("تم حذف التقرير نهائياً من النظام.");
    } catch (e) { showToast("فشل حذف التقرير."); }
  };

  const filteredSurveys = surveys.filter(s => {
    const matchesSearch = s.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase()) || (s.engineerName && s.engineerName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSeverity = severityFilter === "الكل" || s.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {toastMessage && (
        <div className="fixed top-5 left-5 z-50 bg-teal-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center space-x-3 space-x-reverse border border-teal-400">
          <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-semibold text-sm">{toastMessage}</span>
        </div>
      )}

      <header className="bg-teal-900 text-teal-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="bg-white text-teal-900 p-2 rounded-lg font-black tracking-wider flex items-center shadow-inner">
              <svg className="w-6 h-6 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              <span>عين إبل</span>
            </div>
            <div>
              <h1 className="text-sm md:text-base font-bold text-white">نظام مسح وحصر الأضرار - بلدية عين إبل</h1>
              <p className="text-xs text-teal-200">النسخة السحابية الرسمية للجان الفنية</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 space-x-reverse flex-wrap gap-2 text-xs md:text-sm">
            <button onClick={() => { setIsOnline(!isOnline); showToast(isOnline ? "وضع أوفلاين (يتم الحفظ بالهاتف)." : "متصل! جاري جلب البيانات."); }} className={`px-3 py-1.5 rounded-full font-bold flex items-center transition-colors ${isOnline ? "bg-teal-950 text-teal-300 border border-teal-500" : "bg-red-900 text-red-200 border border-red-500"}`}>
              <span className={`w-2.5 h-2.5 rounded-full ml-2 ${isOnline ? "bg-teal-400 animate-pulse" : "bg-red-500"}`}></span>{isOnline ? "أونلاين" : "أوفلاين"}
            </button>
            {drafts.length > 0 && <button onClick={handleSyncDrafts} disabled={!isOnline} className={`px-3 py-1.5 rounded-full font-bold flex items-center transition-all ${isOnline ? "bg-amber-500 text-slate-900 hover:bg-amber-400" : "bg-slate-700 text-slate-400"}`}>مزامنة ({drafts.length})</button>}
            {currentUser && (
              <div className="bg-teal-800 px-3 py-1.5 rounded-lg border border-teal-700 text-teal-100 flex items-center">
                <span className="font-semibold text-white ml-1.5">{currentUser.name}</span>
                <span className="text-[10px] bg-teal-700 text-teal-100 px-1.5 py-0.5 rounded mr-1.5">{currentUser.role === "Admin" ? "مدير نظام" : currentUser.role === "Supervisor" ? "مشرف" : "ميداني"}</span>
                <button onClick={handleLogout} className="mr-3 text-red-300 hover:text-white font-bold text-xs">خروج</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col justify-center">
        {!currentUser ? (
          <div className="max-w-md w-full mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-12">
            <div className="bg-gradient-to-r from-teal-800 to-teal-900 p-6 text-center text-white">
              <div className="bg-white text-teal-900 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center font-black text-2xl shadow-md mb-3">ع</div>
              <h2 className="text-xl font-bold">بوابة بلدية عين إبل السحابية</h2>
              <p className="text-xs text-teal-200 mt-1">تسجيل الدخول للمهندسين والمشرفين والإدارة</p>
            </div>
            <form onSubmit={handleLogin} className="p-6 space-y-4">
              {authError && <div className="bg-red-50 border-r-4 border-red-500 text-red-800 p-3 rounded-lg text-xs">{authError}</div>}
              <div className="space-y-1"><label className="text-xs font-bold text-slate-600">اسم المستخدم</label><input type="text" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm outline-none" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} required/></div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-600">كلمة المرور</label><input type="password" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm outline-none" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required/></div>
              <button type="submit" className="w-full bg-teal-700 hover:bg-teal-600 text-white py-3 rounded-xl font-bold shadow-lg text-sm mt-2">دخول آمن</button>
            </form>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6">
            
            <aside className="lg:col-span-3 bg-white p-5 rounded-2xl shadow-md border border-slate-200 flex flex-col space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] uppercase font-bold text-slate-400">الصفحة النشطة</span>
                <h3 className="font-bold text-slate-800 text-sm">{currentUser.name}</h3>
                <p className="text-xs text-slate-500">{currentUser.role === "Admin" ? "إدارة النظام كاملة" : currentUser.role === "Supervisor" ? "إدارة التقارير والتعويضات" : "مسح ميداني - عين إبل"}</p>
              </div>
              <nav className="space-y-1">
                {currentUser.role === "Field_Engineer" && (
                  <>
                    <button onClick={() => setCurrentTab("field-new")} className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl font-bold text-xs ${currentTab === "field-new" ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"}`}><span>استمارة مسح جديدة</span></button>
                    <button onClick={() => setCurrentTab("field-drafts")} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs ${currentTab === "field-drafts" ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"}`}>
                      <div className="flex items-center space-x-3 space-x-reverse"><span>المسودات محلياً</span></div>
                      {drafts.length > 0 && <span className="bg-amber-500 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full">{drafts.length}</span>}
                    </button>
                  </>
                )}
                {(currentUser.role === "Supervisor" || currentUser.role === "Admin") && (
                  <button onClick={() => setCurrentTab("supervisor-dashboard")} className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl font-bold text-xs ${currentTab === "supervisor-dashboard" ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"}`}><span>لوحة تحكم التقارير</span></button>
                )}
                {currentUser.role === "Admin" && (
                  <button onClick={() => setCurrentTab("supervisor-users")} className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl font-bold text-xs ${currentTab === "supervisor-users" ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"}`}><span>👤 إدارة حسابات النظام والمستخدمين</span></button>
                )}
              </nav>
              {currentUser.role === "Admin" && (
                <div className="pt-2 border-t border-slate-100">
                  <button onClick={handleSeedDatabase} className="w-full py-2 bg-teal-900 text-white font-bold rounded-xl text-xs hover:bg-teal-800">تهيئة استمارات عين إبل أونلاين</button>
                </div>
              )}
            </aside>

            <section className="lg:col-span-9 bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
              
              {/* شاشة المهندس: استمارة جديدة */}
              {currentUser.role === "Field_Engineer" && currentTab === "field-new" && (
                <div className="flex-1 flex flex-col">
                  <div className="bg-gradient-to-r from-teal-700 to-teal-900 text-white p-5">
                    <h2 className="text-lg font-bold">نموذج التقييم الفني - بلدية عين إبل</h2>
                    <div className="grid grid-cols-6 gap-2 mt-5 text-center text-[10px] md:text-xs">
                      {[{ s: 1, l: "عام" }, { s: 2, l: "إنشائي" }, { s: 3, l: "معماري" }, { s: 4, l: "حمامات وملاحق" }, { s: 5, l: "أثاث وأجهزة" }, { s: 6, l: "توثيق وصور" }].map((item) => (
                        <div key={item.s} className={`pb-2 border-b-4 transition-all ${wizardStep >= item.s ? "border-teal-300 text-white font-bold" : "border-teal-900 text-teal-400"}`}>
                          <span className="hidden md:inline">{item.l}</span><span className="md:hidden">خ.{item.s}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 flex-1 space-y-6">
                    {wizardStep === 1 && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1"><label className="text-xs font-bold text-slate-700 block">صاحب العقار</label><input type="text" className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm" value={formData.ownerName} onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} /></div>
                          <div className="space-y-1"><label className="text-xs font-bold text-slate-700 block">رقم الهاتف</label><input type="tel" className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm text-left" value={formData.ownerPhone} onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })} /></div>
                          <div className="space-y-1"><label className="text-xs font-bold text-slate-700 block">رقم السجل / القيد</label><input type="text" className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm text-left" value={formData.ownerId} onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })} /></div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 block">نوع العقار</label>
                            <select className="w-full p-2.5 bg-slate-50 border rounded-xl text-sm" value={formData.propertyType} onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}>
                              <option>منزل مستقل</option><option>شقة سكنية</option><option>مبنى تجاري</option><option>مؤسسة عامة / حكومية</option>
                            </select>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border mt-4">
                          <h4 className="text-xs font-bold text-slate-700 mb-2">التوقيع الجغرافي (GPS) - عين إبل</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white p-3 rounded-lg border"><div><strong>خط العرض:</strong> {formData.gps.lat}</div><div><strong>خط الطول:</strong> {formData.gps.lng}</div></div>
                          <div className="mt-4 space-y-1">
                            <label className="text-xs font-bold text-slate-700 block">رابط خرائط جوجل (Google Maps Link)</label>
                            <input type="url" className="w-full p-2.5 bg-white border rounded-xl text-xs text-left" value={formData.locationUrl} onChange={(e) => setFormData({ ...formData, locationUrl: e.target.value })} placeholder="https://maps.app.goo.gl/..." />
                          </div>
                        </div>
                      </div>
                    )}

                    {wizardStep === 2 && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700 block">أ. الأعمدة والجدران</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {["سليم", "تشققات شعرية سطحيّة", "تصدعات عميقة", "انقشاع الخرسانة (Spalling)", "انبعاج حديد التسليح (Buckling)", "فشل كلي/انهيار"].map(opt => (
                              <label key={opt} className={`p-3 rounded-xl border flex items-start space-x-3 space-x-reverse cursor-pointer ${formData.structural_columns === opt ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`}>
                                <input type="radio" name="col" className="mt-1" checked={formData.structural_columns === opt} onChange={() => setFormData({ ...formData, structural_columns: opt })} />
                                <span className="text-xs font-bold">{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700 block">ب. الجسور والأسقف</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {["سليم", "تشققات عرضية/طولية", "ترخيم ملحوظ (Deflection)", "انفصال الغطاء الخرساني", "اختراق كامل (Punching)", "انهيار جزئي/كلي لبلاد السقف"].map(opt => (
                              <label key={opt} className={`p-3 rounded-xl border flex items-start space-x-3 space-x-reverse cursor-pointer ${formData.structural_beams === opt ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`}>
                                <input type="radio" name="beam" className="mt-1" checked={formData.structural_beams === opt} onChange={() => setFormData({ ...formData, structural_beams: opt })} />
                                <span className="text-xs font-bold">{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700 block">ج. الأساسات</label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {["سليم", "تصدع في الأساسات", "هبوط تفاضلي (Settlement)"].map(opt => (
                              <label key={opt} className={`p-3 rounded-xl border flex items-start space-x-2 space-x-reverse cursor-pointer ${formData.structural_foundations === opt ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`}>
                                <input type="radio" name="found" className="mt-1" checked={formData.structural_foundations === opt} onChange={() => setFormData({ ...formData, structural_foundations: opt })} />
                                <span className="text-xs font-bold">{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {wizardStep === 3 && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700 block">أ. جدران الطوب (غير الحاملة)</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {["سليم", "تشققات عند الفواصل", "تشققات مائلة (X-Cracks)", "انهيار جزئي", "انهيار كامل للجدار"].map(opt => (
                              <label key={opt} className={`p-3 rounded-xl border flex items-start space-x-3 space-x-reverse cursor-pointer ${formData.nonStructural_walls === opt ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`}>
                                <input type="radio" name="wall" className="mt-1" checked={formData.nonStructural_walls === opt} onChange={() => setFormData({ ...formData, nonStructural_walls: opt })} />
                                <span className="text-xs font-bold">{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <h4 className="text-xs font-bold mb-3">ب. الشبابيك (العدد)</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[{k:"nonStructural_windows_alu_small", l:"ألمنيوم صغير"}, {k:"nonStructural_windows_alu_large", l:"ألمنيوم كبير"}, {k:"nonStructural_windows_steel", l:"حديد وحماية"}, {k:"nonStructural_windows_facade", l:"واجهة زجاجية"}].map(item => (
                              <div key={item.k} className="flex justify-between items-center p-2.5 bg-white border rounded-xl"><span className="text-xs font-bold">{item.l}</span><div className="flex items-center space-x-2 space-x-reverse"><button onClick={()=>setFormData(p=>({...p, [item.k]:Math.max(0, p[item.k]-1)}))} className="w-8 h-8 bg-slate-100 rounded">-</button><span className="w-8 text-center text-xs font-bold">{formData[item.k]}</span><button onClick={()=>setFormData(p=>({...p, [item.k]:p[item.k]+1)}))} className="w-8 h-8 bg-slate-100 rounded">+</button></div></div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <h4 className="text-xs font-bold mb-3">ج. الأبواب (العدد)</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[{k:"nonStructural_doors_wood", l:"خشبية داخلية"}, {k:"nonStructural_doors_iron", l:"حديد خارجية"}].map(item => (
                              <div key={item.k} className="flex justify-between items-center p-2.5 bg-white border rounded-xl"><span className="text-xs font-bold">{item.l}</span><div className="flex items-center space-x-2 space-x-reverse"><button onClick={()=>setFormData(p=>({...p, [item.k]:Math.max(0, p[item.k]-1)}))} className="w-8 h-8 bg-slate-100 rounded">-</button><span className="w-8 text-center text-xs font-bold">{formData[item.k]}</span><button onClick={()=>setFormData(p=>({...p, [item.k]:p[item.k]+1)}))} className="w-8 h-8 bg-slate-100 rounded">+</button></div></div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {wizardStep === 4 && (
                      <div className="space-y-6">
                        <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-300">
                          <h4 className="text-xs font-bold text-teal-800 mb-3">تقييم الحمامات</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1 bg-white p-3 rounded-xl border"><label className="text-xs font-bold">عدد الحمامات المتضررة</label><div className="flex items-center space-x-2 space-x-reverse"><button onClick={()=>setFormData(p=>({...p, bathroom_count:Math.max(0, p.bathroom_count-1)}))} className="w-8 h-8 bg-slate-100 rounded font-bold">-</button><span className="w-10 text-center font-bold text-xs">{formData.bathroom_count}</span><button onClick={()=>setFormData(p=>({...p, bathroom_count:p.bathroom_count+1}))} className="w-8 h-8 bg-slate-100 rounded font-bold">+</button></div></div>
                            <div className="space-y-1 bg-white p-3 rounded-xl border"><label className="text-xs font-bold">مستوى الضرر</label><select className="w-full p-2 bg-slate-50 border rounded-lg text-xs" value={formData.bathroom_status} onChange={(e)=>setFormData({...formData, bathroom_status: e.target.value})}><option>سليم</option><option>تضرر سطحي (سيراميك/إكسسوارات)</option><option>تدمير جزئي (أطقم صحية/مغاسل)</option><option>تدمير كلي وتفجر التمديدات الصحية</option></select></div>
                          </div>
                        </div>
                        <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <label className="text-xs font-bold block mb-2">الملاحق الخارجية (حدد المساحة والخراب)</label>
                          <div className="grid gap-3">
                            {ANNEX_TYPES.map(item => {
                              const isSel = formData[`external_annex_${item.id}_selected`];
                              return (
                                <div key={item.id} className={`p-3 rounded-xl border ${isSel ? "border-teal-500 bg-white" : "border-slate-200 bg-white"}`}>
                                  <label className="flex items-center cursor-pointer font-bold text-xs"><input type="checkbox" className="ml-2" checked={isSel} onChange={e=>setFormData({...formData, [`external_annex_${item.id}_selected`]:e.target.checked})} /><span>{item.icon} {item.label}</span></label>
                                  {isSel && (
                                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t">
                                      <div><label className="text-[10px] font-bold block">المساحة (م²)</label><input type="number" className="w-full p-2 bg-slate-50 border rounded text-xs" value={formData[`external_annex_${item.id}_area`]||""} onChange={e=>setFormData({...formData, [`external_annex_${item.id}_area`]:parseInt(e.target.value)||0})} /></div>
                                      <div><label className="text-[10px] font-bold block">نوع الضرر</label><select className="w-full p-2 bg-slate-50 border rounded text-xs" value={formData[`external_annex_${item.id}_damage`]} onChange={e=>setFormData({...formData, [`external_annex_${item.id}_damage`]:e.target.value})}><option>سليم</option><option>تشققات شعرية سطحيّة</option><option>تصدع وشروخ عميقة</option><option>انهيار جزئي</option><option>انهيار كلي</option></select></div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700 block">الأسوار الخارجية للمبنى</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {["سليمة", "أضرار سطحية", "تصدع وشروخ خطيرة", "انهيار جزئي", "انهيار كلي"].map(opt => (
                              <label key={opt} className={`p-3 rounded-xl border flex items-start space-x-3 space-x-reverse cursor-pointer ${formData.external_fences === opt ? "border-teal-500 bg-teal-50" : "border-slate-200"}`}>
                                <input type="radio" className="mt-1" checked={formData.external_fences === opt} onChange={() => setFormData({ ...formData, external_fences: opt })} />
                                <span className="text-xs font-bold">{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {wizardStep === 5 && (
                      <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                          <h4 className="text-xs font-bold">أ. حصر أضرار العفش والأثاث</h4>
                          {[{ k: "bedroom", l: "غرف نوم" }, { k: "beds", l: "أسرة منفردة" }, { k: "wardrobes", l: "خزائن" }, { k: "sofa", l: "أطقم كنب" }, { k: "dining", l: "طاولات سفرة" }, { k: "carpet", l: "سجاد وموكيت" }].map(item => (
                            <div key={item.k} className="p-3 bg-white rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <span className="text-xs font-bold md:w-1/3">{item.l}</span>
                              <div className="flex items-center space-x-2 space-x-reverse"><button onClick={()=>setFormData(p=>({...p, [`furniture_${item.k}_count`]:Math.max(0, p[`furniture_${item.k}_count`]-1)}))} className="w-8 h-8 bg-slate-100 rounded">-</button><span className="w-8 text-center text-xs font-bold">{formData[`furniture_${item.k}_count`]}</span><button onClick={()=>setFormData(p=>({...p, [`furniture_${item.k}_count`]:p[`furniture_${item.k}_count`]+1}))} className="w-8 h-8 bg-slate-100 rounded">+</button></div>
                              <select className="flex-1 p-2 bg-slate-50 border rounded-lg text-xs outline-none" value={formData[`furniture_${item.k}_damage`]} onChange={(e)=>setFormData({...formData, [`furniture_${item.k}_damage`]: e.target.value})}>{DAMAGE_TYPES.map(dmg=><option key={dmg}>{dmg}</option>)}</select>
                            </div>
                          ))}
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <h4 className="text-xs font-bold mb-3">ب. الأجهزة الكهربائية (العدد)</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {[{k:"appliances_fridge", l:"ثلاجة"},{k:"appliances_tv", l:"تلفزيون"},{k:"appliances_cooker", l:"فرن/غاز"},{k:"appliances_heater", l:"مدفأة"},{k:"appliances_ac", l:"مكيف"},{k:"appliances_washing", l:"غسالة"}].map(item => (
                              <div key={item.k} className="flex flex-col p-2 bg-white rounded border"><span className="text-[11px] font-bold mb-1">{item.l}</span><div className="flex justify-between items-center"><button onClick={()=>setFormData(p=>({...p, [item.k]:Math.max(0, p[item.k]-1)}))} className="w-6 h-6 bg-slate-100 rounded">-</button><span className="text-xs font-bold">{formData[item.k]}</span><button onClick={()=>setFormData(p=>({...p, [item.k]:p[item.k]+1}))} className="w-6 h-6 bg-slate-100 rounded">+</button></div></div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {wizardStep === 6 && (
                      <div className="space-y-6">
                        <div>
                          <label className="text-xs font-bold block mb-2">التوثيق البصري المباشر (كاميرا الهاتف)</label>
                          <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleRealPhotoUpload} className="hidden" />
                          <button type="button" onClick={handleCapturePhoto} className="bg-teal-900 text-white px-5 py-3 rounded-xl font-bold text-xs shadow-lg">📷 فتح الكاميرا والتقاط صورة</button>
                          {formData.photos.length > 0 && (
                            <div className="grid grid-cols-2 gap-4 mt-4">
                              {formData.photos.map((ph, idx) => (
                                <div key={idx} className="relative rounded-xl overflow-hidden border aspect-video">
                                  <img src={ph} className="w-full h-full object-cover" alt="" />
                                  <button onClick={() => setFormData(p => ({ ...p, photos: p.photos.filter((_, i) => i !== idx) }))} className="absolute top-2 right-2 bg-red-600 text-white rounded p-1 text-[10px]">حذف</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                          <label className="text-xs font-bold">ملاحظات هندسية وتوصيات (نصية وصوتية)</label>
                          <textarea rows="2" className="w-full p-2 bg-white border rounded text-sm outline-none" value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} placeholder="أضف ملاحظات..." />
                          <div className="flex items-center pt-2 border-t">
                            {!formData.audioNote ? (
                              <button type="button" onClick={isRecording ? stopRecording : startRecording} className={`px-4 py-2 rounded text-xs font-bold ${isRecording ? "bg-red-100 text-red-700 animate-pulse" : "bg-teal-100 text-teal-700"}`}>{isRecording ? "جاري التسجيل... للإيقاف" : "🎙️ تسجيل ملاحظة صوتية"}</button>
                            ) : (
                              <div className="flex items-center w-full gap-2"><audio src={formData.audioNote} controls className="h-8 flex-1" /><button onClick={deleteAudioNote} className="text-xs text-red-600 bg-red-50 p-2 rounded font-bold">حذف</button></div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1"><label className="text-xs font-bold">توقيع المهندس الفاحص رقمياً</label><button onClick={clearCanvas} className="text-[10px] text-red-600 font-bold">إعادة</button></div>
                          <canvas ref={canvasRef} width={400} height={150} className="w-full h-32 bg-slate-50 border-2 rounded-xl touch-none" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                        </div>
                      </div>
                    )}

                  </div>

                  <div className="bg-slate-50 px-6 py-4 border-t flex justify-between items-center">
                    <button type="button" disabled={wizardStep === 1} onClick={() => setWizardStep(prev => prev - 1)} className={`px-4 py-2 rounded font-bold text-xs ${wizardStep === 1 ? "text-slate-300" : "bg-slate-200 text-slate-700"}`}>السابق</button>
                    <div className="text-xs font-bold text-slate-500">خطوة {wizardStep} من 6</div>
                    {wizardStep < 6 ? (
                      <button type="button" onClick={() => setWizardStep(prev => prev + 1)} className="bg-teal-900 text-white px-5 py-2 rounded font-bold text-xs">التالي</button>
                    ) : (
                      <button type="button" onClick={handleFormSubmit} className="bg-teal-600 text-white px-6 py-2.5 rounded font-bold text-xs shadow-lg">{isOnline ? "حفظ واعتماد وفتح ملف جديد" : "حفظ مسودة وفتح ملف جديد"}</button>
                    )}
                  </div>
                </div>
              )}

              {/* شاشة لوحة المشرف */}
              {(currentUser.role === "Supervisor" || currentUser.role === "Admin") && currentTab === "supervisor-dashboard" && (
                <div className="flex-1 flex flex-col p-6">
                  <h2 className="text-lg font-bold mb-4">لوحة إدارة التراخيص والتعويضات السحابية</h2>
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1">
                    <div className="xl:col-span-5 space-y-4">
                      <input type="text" placeholder="ابحث باسم المالك أو المهندس..." className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                        {filteredSurveys.map(s => (
                          <div key={s.id} onClick={() => setSelectedSurvey(s)} className={`p-3 rounded-xl border cursor-pointer ${selectedSurvey?.id === s.id ? "border-teal-500 bg-teal-50" : "border-slate-200"}`}>
                            <div className="flex justify-between items-start"><span className="text-[10px] text-slate-400 font-mono">{s.id.substring(0,8)}</span><span className={`text-[9px] px-2 py-0.5 rounded font-bold ${s.severity === "جسيم / خطر" ? "bg-red-100 text-red-700" : s.severity === "متوسط" ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700"}`}>{s.severity}</span></div>
                            <h4 className="text-xs font-bold mt-1">{s.ownerName}</h4>
                            <div className="flex justify-between mt-2 pt-2 border-t text-[10px] text-slate-500"><span>{s.engineerName}</span><span className="font-bold">{s.status}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="xl:col-span-7 bg-slate-50 rounded-2xl p-5 border">
                      {selectedSurvey ? (
                        <div className="space-y-4">
                          <div className="flex justify-between bg-white p-3 rounded-xl border items-center">
                            <span className="text-xs font-bold">{selectedSurvey.status}</span>
                            <div className="flex space-x-2 space-x-reverse">
                              <button onClick={()=>handleApproveReport(selectedSurvey.id)} className="bg-teal-600 text-white px-3 py-1.5 rounded text-[10px] font-bold">اعتماد</button>
                              <button onClick={()=>handleRejectReport(selectedSurvey.id)} className="bg-red-100 text-red-700 px-3 py-1.5 rounded text-[10px] font-bold">رفض</button>
                              {currentUser.role === "Admin" && (
                                <button onClick={()=>handleDeleteReport(selectedSurvey.id)} className="bg-slate-800 text-white px-3 py-1.5 rounded text-[10px] font-bold mr-4">حذف التقرير 🗑️</button>
                              )}
                            </div>
                          </div>
                          
                          <div id="printable-report" className="bg-white p-6 rounded-2xl shadow border space-y-4 text-xs font-sans">
                            <div className="flex justify-between border-b-2 border-slate-800 pb-3">
                              <div><h3 className="font-extrabold text-sm">بلدية عين إبل</h3><p className="text-[9px] text-slate-500">لجنة التقييم وحصر الأضرار</p></div>
                              <div className="text-left"><h4 className="font-black text-sm">تقرير هندسي معتمد</h4><p className="text-[9px] font-mono text-slate-400">{selectedSurvey.id}</p></div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border text-[11px]">
                              <div><strong>المالك:</strong> {selectedSurvey.ownerName}</div><div><strong>الهاتف:</strong> {selectedSurvey.ownerPhone}</div>
                              <div><strong>رقم السجل:</strong> {selectedSurvey.ownerId}</div><div><strong>نوع العقار:</strong> {selectedSurvey.propertyType}</div>
                              <div className="col-span-2 flex justify-between border-t pt-2 mt-1"><span><strong>GPS:</strong> {selectedSurvey.gps.lat}, {selectedSurvey.gps.lng}</span> {selectedSurvey.gps.locationUrl && <a href={selectedSurvey.gps.locationUrl} target="_blank" rel="noreferrer" className="text-teal-700 underline font-bold">🌐 عرض الخريطة</a>}</div>
                            </div>

                            <div className="space-y-2"><h4 className="font-bold border-r-2 border-teal-500 pr-1.5">1. الإنشائي</h4><div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded text-[10px]"><div>أعمدة: {selectedSurvey.structural.columns}</div><div>أسقف: {selectedSurvey.structural.beams}</div><div>أساسات: {selectedSurvey.structural.foundations}</div></div></div>
                            <div className="space-y-2"><h4 className="font-bold border-r-2 border-teal-500 pr-1.5">2. المعماري</h4><div className="bg-slate-50 p-2 rounded text-[10px]"><div>جدران: {selectedSurvey.nonStructural.walls} | شبابيك: {selectedSurvey.nonStructural.windows_alu_small + selectedSurvey.nonStructural.windows_alu_large + selectedSurvey.nonStructural.windows_steel + selectedSurvey.nonStructural.windows_facade} | أبواب: {selectedSurvey.nonStructural.doors_wood + selectedSurvey.nonStructural.doors_iron}</div></div></div>
                            <div className="space-y-2"><h4 className="font-bold border-r-2 border-teal-500 pr-1.5">3. حمامات وملاحق</h4><div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded text-[10px]"><div>حمامات: {selectedSurvey.bathrooms?.count} ({selectedSurvey.bathrooms?.status})</div><div>ملاحق: {selectedSurvey.external.annexes_detailed ? Object.entries(selectedSurvey.external.annexes_detailed).filter(([_,v])=>v.selected).map(([k,v])=>`${k}:${v.damage}`).join(", ") : "-"}</div></div></div>
                            
                            <div className="space-y-1 bg-slate-50 p-2 rounded border"><strong className="text-[10px] block">توصيات:</strong><p className="text-[10.5px]">{selectedSurvey.notes || "-"}</p>{selectedSurvey.audioNote && <div className="mt-2 pt-2 border-t flex items-center gap-2"><strong className="text-teal-700 text-[10px]">🎙️ صوتي:</strong><audio src={selectedSurvey.audioNote} controls className="h-6 w-[200px]" /></div>}</div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-4 text-center items-end">
                              <div><img src={selectedSurvey.signature} className="h-10 mx-auto" alt="" /><span className="text-[10px] font-bold block">{selectedSurvey.engineerName}</span></div>
                              <div>{selectedSurvey.status === "معتمد" ? <div className="border border-teal-500 text-teal-700 font-bold text-[10px] py-2 bg-teal-50 rounded mx-auto">معتمد رسمياً للتعويض</div> : <div className="border border-amber-300 text-amber-700 font-bold text-[10px] py-2 bg-amber-50 rounded mx-auto">قيد المراجعة</div>}</div>
                            </div>
                          </div>
                          <button onClick={()=>window.print()} className="bg-slate-900 text-white px-5 py-2.5 rounded text-xs font-bold">طباعة / تصدير PDF</button>
                        </div>
                      ) : <div className="text-center py-24 text-slate-400 text-xs">اختر استمارة للعرض</div>}
                    </div>
                  </div>
                </div>
              )}

              {/* شاشة إدارة الحسابات للمدير */}
              {currentUser.role === "Admin" && currentTab === "supervisor-users" && (
                <div className="p-6 flex-1 flex flex-col space-y-6">
                  <div className="border-b border-slate-200 pb-4"><h2 className="text-lg font-bold">إدارة حسابات النظام والمستخدمين السحابية</h2></div>
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 items-start">
                    
                    <div className="xl:col-span-5 bg-slate-50 p-5 rounded-2xl border space-y-4">
                      <h3 className="text-sm font-extrabold flex items-center"><span className="ml-2">➕</span>إنشاء حساب جديد</h3>
                      <form onSubmit={handleCreateNewUser} className="space-y-4">
                        <div className="space-y-1"><label className="text-xs font-bold">الاسم الكامل</label><input type="text" className="w-full p-2.5 border rounded-xl text-xs" value={newEngineerForm.name} onChange={e=>setNewEngineerForm({...newEngineerForm, name:e.target.value})} required/></div>
                        <div className="space-y-1"><label className="text-xs font-bold">اسم المستخدم (Username)</label><input type="text" className="w-full p-2.5 border rounded-xl text-xs text-left" value={newEngineerForm.username} onChange={e=>setNewEngineerForm({...newEngineerForm, username:e.target.value})} required/></div>
                        <div className="space-y-1"><label className="text-xs font-bold">كلمة المرور الابتدائية</label><input type="text" className="w-full p-2.5 border rounded-xl text-xs text-left" value={newEngineerForm.password} onChange={e=>setNewEngineerForm({...newEngineerForm, password:e.target.value})} required/></div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold">نوع الحساب والصلاحية</label>
                          <select className="w-full p-2.5 border rounded-xl text-xs" value={newEngineerForm.role} onChange={e=>setNewEngineerForm({...newEngineerForm, role:e.target.value})}>
                            <option value="Field_Engineer">مهندس ميداني (للمسح والحصر)</option>
                            <option value="Supervisor">مشرف تقارير (لإدارة واعتماد التقارير فقط)</option>
                            <option value="Admin">مدير نظام (صلاحيات كاملة وحذف)</option>
                          </select>
                        </div>
                        <button type="submit" className="w-full bg-teal-600 text-white font-bold py-2.5 rounded-xl text-xs">تثبيت وحفظ الحساب</button>
                      </form>
                    </div>

                    <div className="xl:col-span-7 space-y-4">
                      <h3 className="text-sm font-extrabold">قائمة المستخدمين النشطين سحابياً ({usersList.length})</h3>
                      <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                        {usersList.map(user => (
                          <div key={user.id} className="p-3 bg-white border rounded-xl flex flex-wrap justify-between items-center gap-3">
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold">{user.name}</h4>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                                <span>مستخدم: <strong className="text-slate-700 font-mono">{user.username}</strong></span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  السر: <strong className="text-slate-700 font-mono bg-slate-100 px-1 rounded">{visiblePasswords[user.id] ? user.password : "••••••"}</strong>
                                  <button onClick={()=>togglePasswordVisibility(user.id)} className="text-teal-600 hover:underline font-bold mr-1">
                                    {visiblePasswords[user.id] ? "إخفاء" : "إظهار"}
                                  </button>
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded ${user.role === "Admin" ? "bg-red-100 text-red-700" : user.role === "Supervisor" ? "bg-purple-100 text-purple-700" : "bg-teal-100 text-teal-700"}`}>
                                {user.role === "Admin" ? "مدير نظام" : user.role === "Supervisor" ? "مشرف" : "مهندس"}
                              </span>
                              <button onClick={()=>setEditingUser({id: user.id, name: user.name, username: user.username, newPassword: ""})} className="bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-[10px] border">تغيير السر</button>
                              <button onClick={()=>handleDeleteUser(user.id, user.role)} className="bg-red-50 text-red-600 font-bold px-3 py-1.5 rounded-lg text-[10px] border border-red-200">حذف 🗑️</button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {editingUser && (
                        <form onSubmit={handleUpdatePassword} className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col md:flex-row gap-3 items-end">
                          <div className="flex-1 w-full space-y-1">
                            <div className="flex justify-between items-center mb-1"><label className="text-[10px] font-bold">تغيير السر لـ {editingUser.name}</label><button type="button" onClick={()=>setEditingUser(null)} className="text-[10px] text-red-600 font-bold">إلغاء</button></div>
                            <input type="text" placeholder="السر الجديد..." className="w-full p-2 border rounded-xl text-xs text-left" value={editingUser.newPassword} onChange={e=>setEditingUser({...editingUser, newPassword:e.target.value})} required/>
                          </div>
                          <button type="submit" className="bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-xs">تحديث</button>
                        </form>
                      )}
                    </div>

                  </div>
                </div>
              )}

            </section>
          </div>
        )}
      </main>

      <footer className="bg-teal-900 text-teal-200 text-center py-6 border-t border-teal-800 text-xs font-bold">
        <p>© 2026 جميع الحقوق محفوظة لبلدية عين إبل - نظام سَنَد السحابي.</p>
      </footer>
    </div>
  );
}
