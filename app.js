const firebaseConfig = {
    apiKey: "AIzaSyBOortFFNCG3aA8YLO-bO26Qaip8BWpIB0",
    authDomain: "absensi-kolam-freelance-usc.firebaseapp.com",
    projectId: "absensi-kolam-freelance-usc",
    storageBucket: "absensi-kolam-freelance-usc.firebasestorage.app",
    messagingSenderId: "860865396472",
    appId: "1:860865396472:web:138d570793360172a5850d",
    measurementId: "G-ZDBRD7NRKZ"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const DB = {
    async getStaff() {
        const snap = await db.collection('staff').orderBy('created_at', 'desc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async saveStaff(staff) {
        const batch = db.batch();
        const ref = db.collection('staff').doc(staff.id);
        batch.update(ref, { nama: staff.nama, status: staff.status });
        await batch.commit();
    },

    async addStaff(nama) {
        const docRef = await db.collection('staff').add({
            nama,
            status: 'aktif',
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        return docRef.id;
    },

    async toggleStaff(id, currentStatus) {
        const newStatus = currentStatus === 'aktif' ? 'nonaktif' : 'aktif';
        await db.collection('staff').doc(id).update({ status: newStatus });
    },

    async updateStaff(id, nama, status) {
        await db.collection('staff').doc(id).update({ nama, status });
    },

    async getLocations() {
        const snap = await db.collection('locations').orderBy('created_at', 'desc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async saveLocation(loc) {
        await db.collection('locations').doc(loc.id).update({
            nama_lokasi: loc.nama_lokasi,
            latitude: loc.latitude,
            longitude: loc.longitude,
            radius: loc.radius,
            is_active: loc.is_active
        });
    },

    async addLocation(nama, lat, lng, radius) {
        const docRef = await db.collection('locations').add({
            nama_lokasi: nama,
            latitude: lat,
            longitude: lng,
            radius,
            is_active: 1,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        return docRef.id;
    },

    async getAttendance() {
        const snap = await db.collection('attendance').orderBy('tanggal', 'desc').limit(500).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async getAttendanceToday(staffId) {
        const t = today();
        const snap = await db.collection('attendance')
            .where('staff_id', '==', staffId)
            .where('tanggal', '==', t)
            .limit(1)
            .get();
        if (snap.empty) return null;
        const doc = snap.docs[0];
        return { id: doc.id, ...doc.data() };
    },

    async addAttendance(att) {
        const docRef = await db.collection('attendance').add({
            ...att,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        return docRef.id;
    },

    async updateCheckout(docId, jamCheckout) {
        await db.collection('attendance').doc(docId).update({ jam_checkout: jamCheckout });
    },

    async getAdmin() {
        const snap = await db.collection('admin').doc('config').get();
        return snap.exists ? snap.data() : { password: 'admin123' };
    },

    async init() {
        const staffSnap = await db.collection('staff').limit(1).get();
        if (staffSnap.empty) {
            const batch = db.batch();
            const names = ['Ahmad Fauzi', 'Budi Santoso', 'Citra Dewi', 'Dian Permata'];
            names.forEach((nama, i) => {
                const ref = db.collection('staff').doc();
                batch.set(ref, {
                    nama,
                    status: i < 3 ? 'aktif' : 'nonaktif',
                    created_at: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            await batch.commit();
        }

        const locSnap = await db.collection('locations').limit(1).get();
        if (locSnap.empty) {
            await db.collection('locations').add({
                nama_lokasi: 'Kolam UNESA Science Center',
                latitude: -7.2891,
                longitude: 112.7891,
                radius: 150,
                is_active: 1,
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        const adminSnap = await db.collection('admin').doc('config').get();
        if (!adminSnap.exists) {
            await db.collection('admin').doc('config').set({ password: 'admin123' });
        }
    }
};

function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getHari(tgl) {
    return ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date(tgl + 'T00:00:00').getDay()];
}

function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function nowTime() {
    const d = new Date();
    return d.toTimeString().split(' ')[0];
}

function exportCSV(data) {
    let csv = '\uFEFFNama;Tanggal;Hari;Jam Masuk;Jam Pulang;Lokasi Lat;Lokasi Lng;Status\n';
    data.forEach(r => {
        csv += `${r.nama};${r.tanggal};${r.hari};${r.jam_checkin};${r.jam_checkout || '-'};${r.lokasi_lat};${r.lokasi_lng};${r.status}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rekap_absensi_${today()}.csv`;
    a.click();
}
